/**
 * Claude API Integration
 *
 * Wrapper for the Anthropic Claude API for document rewriting.
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model configuration
const MODEL = 'claude-opus-4-5-20251101';
const MAX_TOKENS = 16384;

export interface RewriteResult {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Rewrite a document using Claude
 */
export async function rewriteDocument(
  systemPrompt: string,
  userMessage: string
): Promise<RewriteResult> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Extract text content from the response
    const textContent = response.content.find((block) => block.type === 'text');

    if (!textContent || textContent.type !== 'text') {
      return {
        success: false,
        error: 'No text content in Claude response',
      };
    }

    return {
      success: true,
      content: textContent.text,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Check for specific API errors
    if (errorMessage.includes('rate_limit')) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment and try again.',
      };
    }

    if (errorMessage.includes('invalid_api_key')) {
      return {
        success: false,
        error: 'Invalid API key. Please check your ANTHROPIC_API_KEY in .env.local',
      };
    }

    return {
      success: false,
      error: `Claude API error: ${errorMessage}`,
    };
  }
}

/**
 * Check if the API key is configured
 */
export function isApiKeyConfigured(): boolean {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return !!apiKey && apiKey !== 'sk-ant-YOUR_API_KEY_HERE' && apiKey.startsWith('sk-ant-');
}
