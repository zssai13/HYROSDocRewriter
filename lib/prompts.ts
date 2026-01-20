/**
 * Prompt Building System
 *
 * Constructs the system prompts and user messages for Claude
 * using the reference documentation from the slots.
 */

import type { ReferenceSlots } from './storage';

/**
 * Build the system prompt with all reference documentation
 */
export function buildSystemPrompt(refs: ReferenceSlots): string {
  let prompt = `You are a documentation converter for HYROS installation guides. Your task is to rewrite legacy documentation files into the new Rules System format.

IMPORTANT INSTRUCTIONS:
- Output ONLY the rewritten document content
- Do NOT include any preamble, explanation, or commentary
- Do NOT wrap the output in markdown code fences
- Do NOT say "Here is the rewritten document" or similar phrases
- Preserve the spirit and information of the original while applying the new format
- Follow the exact structure and marker system defined in the reference documents

`;

  // Add Rules System reference (required - Slot 1)
  if (refs.rulesSystem) {
    prompt += `═══════════════════════════════════════════════════════════════════════════════
RULES SYSTEM REFERENCE (Primary formatting guide)
═══════════════════════════════════════════════════════════════════════════════

<rules_system>
${refs.rulesSystem.content}
</rules_system>

`;
  }

  // Add Rewriting Guide reference (Slot 2)
  if (refs.rewriteGuide) {
    prompt += `═══════════════════════════════════════════════════════════════════════════════
DOCUMENT REWRITING GUIDE (Conversion instructions)
═══════════════════════════════════════════════════════════════════════════════

<rewriting_guide>
${refs.rewriteGuide.content}
</rewriting_guide>

`;
  }

  // Add Staff Documentation reference (Slot 3)
  if (refs.staffDocs) {
    prompt += `═══════════════════════════════════════════════════════════════════════════════
ADDITIONAL STAFF DOCUMENTATION (Extra context)
═══════════════════════════════════════════════════════════════════════════════

<staff_docs>
${refs.staffDocs.content}
</staff_docs>

`;
  }

  prompt += `═══════════════════════════════════════════════════════════════════════════════
OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

1. Apply the Rules System markers appropriately:
   - [?] for checkpoints/questions
   - [...] for wait states
   - [IF] for conditionals
   - [DONE] for successful completion
   - [FAIL] for failure states
   - [TEST?] for verification steps

2. Structure the document according to the rewriting guide

3. Maintain all essential information from the source document

4. Output ONLY the final rewritten document with no additional text
`;

  return prompt;
}

/**
 * Build the user message for a specific file
 */
export function buildUserMessage(filename: string, content: string): string {
  return `Rewrite this documentation file following the rules and guide provided.

Filename: ${filename}

<source_document>
${content}
</source_document>`;
}

/**
 * Estimate token count for a string (rough approximation)
 * Claude uses ~4 characters per token on average
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if the combined prompts fit within context limits
 */
export function checkContextLimit(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 180000 // Claude's context window
): { fits: boolean; estimatedTokens: number } {
  const systemTokens = estimateTokens(systemPrompt);
  const userTokens = estimateTokens(userMessage);
  const outputBuffer = 8192; // Reserved for output

  const totalEstimated = systemTokens + userTokens + outputBuffer;

  return {
    fits: totalEstimated < maxTokens,
    estimatedTokens: totalEstimated,
  };
}
