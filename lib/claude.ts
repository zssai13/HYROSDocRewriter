/**
 * Claude API Integration
 *
 * Wrapper for the Anthropic Claude API for document rewriting.
 * Includes automatic retry with exponential backoff for transient errors.
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model configuration
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 16384;

// Retry configuration
const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 2000; // 2 seconds
const MAX_DELAY_MS = 60000; // 60 seconds

export interface RewriteResult {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable (transient)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // 529 overloaded, 503 service unavailable, rate limits, timeouts
    return (
      message.includes('overloaded') ||
      message.includes('529') ||
      message.includes('503') ||
      message.includes('rate_limit') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('socket hang up')
    );
  }
  return false;
}

/**
 * Rewrite a document using Claude with automatic retry
 */
export async function rewriteDocument(
  systemPrompt: string,
  userMessage: string,
  model?: string
): Promise<RewriteResult> {
  const selectedModel = model || DEFAULT_MODEL;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: selectedModel,
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
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if this is a retryable error
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        // Calculate delay with exponential backoff + jitter
        const baseDelay = Math.min(INITIAL_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS);
        const jitter = Math.random() * 1000; // Add up to 1 second of jitter
        const delay = baseDelay + jitter;

        console.log(
          `Claude API error (attempt ${attempt}/${MAX_RETRIES}): ${errorMessage}. Retrying in ${(delay / 1000).toFixed(1)}s...`
        );

        await sleep(delay);
        continue;
      }

      // Non-retryable error or max retries reached
      break;
    }
  }

  // All retries exhausted or non-retryable error
  const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error occurred';

  // Check for specific API errors
  if (errorMessage.includes('invalid_api_key')) {
    return {
      success: false,
      error: 'Invalid API key. Please check your ANTHROPIC_API_KEY in .env.local',
    };
  }

  return {
    success: false,
    error: `Claude API error after ${MAX_RETRIES} attempts: ${errorMessage}`,
  };
}

/**
 * Check if the API key is configured
 */
export function isApiKeyConfigured(): boolean {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return !!apiKey && apiKey !== 'sk-ant-YOUR_API_KEY_HERE' && apiKey.startsWith('sk-ant-');
}
