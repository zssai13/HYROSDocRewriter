import { NextRequest } from 'next/server';
import { rewriteDocument, isApiKeyConfigured } from '@/lib/claude';
import { buildSystemPrompt, buildUserMessage } from '@/lib/prompts';
import { validateFiles, type ProcessedFile } from '@/lib/validation';
import { createZipBase64 } from '@/lib/zip';
import type { ReferenceSlots } from '@/lib/storage';

export const maxDuration = 300; // 5 minutes for Vercel Pro

interface RewriteRequest {
  files: ProcessedFile[];
  references: ReferenceSlots;
}

export async function POST(request: NextRequest) {
  // Create a readable stream for SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send SSE events
      const sendEvent = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Check API key
        if (!isApiKeyConfigured()) {
          sendEvent('error', {
            message: 'Anthropic API key is not configured. Please add your API key to .env.local',
          });
          controller.close();
          return;
        }

        // Parse request body
        const body: RewriteRequest = await request.json();
        const { files, references } = body;

        // Validate references
        if (!references.rulesSystem) {
          sendEvent('error', {
            message: 'Rules System reference is required. Please upload it to Slot 1.',
          });
          controller.close();
          return;
        }

        // Validate files
        const validation = validateFiles(files);
        if (!validation.valid) {
          sendEvent('error', {
            message: validation.error,
          });
          controller.close();
          return;
        }

        const validFiles = validation.files;
        const total = validFiles.length;

        // Build system prompt
        const systemPrompt = buildSystemPrompt(references);

        // Process each file
        const rewrittenFiles: ProcessedFile[] = [];

        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i];
          const current = i + 1;

          // Send progress event
          sendEvent('progress', {
            current,
            total,
            filename: file.name,
          });

          // Build user message
          const userMessage = buildUserMessage(file.name, file.content);

          // Call Claude
          const result = await rewriteDocument(systemPrompt, userMessage);

          if (!result.success) {
            sendEvent('error', {
              message: result.error || 'Unknown error during rewriting',
              failedAt: current,
              filename: file.name,
            });
            controller.close();
            return;
          }

          // Store the rewritten content
          rewrittenFiles.push({
            name: file.name,
            content: result.content || '',
          });
        }

        // Create ZIP from rewritten files
        const zipBase64 = await createZipBase64(rewrittenFiles);

        // Send complete event
        sendEvent('complete', {
          zipBase64,
          totalProcessed: rewrittenFiles.length,
        });

        controller.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const sendEvent = (event: string, data: unknown) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        sendEvent('error', {
          message: `Server error: ${errorMessage}`,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
