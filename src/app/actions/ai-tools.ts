'use server';

import { ai } from '@/lib/ai';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';

/**
 * Generate a Mermaid diagram from a natural language prompt
 */
export async function generateDiagram(prompt: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Your session has expired. Please sign in again.' };

  try {
    const response = await ai.generate({
      prompt: `
        You are a diagram expert. Convert the following description into a Mermaid.js diagram code.
        Only return the Mermaid code block starting with 'graph', 'sequenceDiagram', etc.
        Do not include markdown code fences (like \`\`\`mermaid).
        
        DESCRIPTION:
        ${prompt}
      `,
    });

    return { success: true, code: response.text };
  } catch (error) {
    console.error('Diagram Generation Error:', error);
    return { success: false, error: 'Failed to generate diagram' };
  }
}

/**
 * Structure raw notes into action items and summaries
 */
export async function formatNotes(rawNotes: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Your session has expired. Please sign in again.' };

  try {
    const response = await ai.generate({
      prompt: `
        Analyze the following raw event notes and structure them into a professional format.
        Include a 'Summary' section and an 'Action Items' list.
        
        NOTES:
        ${rawNotes}
        
        Return the result as a JSON object with 'summary' (string) and 'actionItems' (array of strings).
      `,
      output: { format: 'json' }
    });

    const parsed = response.output as any;
    return { success: true, data: parsed };
  } catch (error) {
    console.error('Notes Formatting Error:', error);
    return { success: false, error: 'Failed to format notes' };
  }
}

/**
 * Moderate user content for community safety
 */
export async function moderateContent(content: string) {
  try {
    const response = await ai.generate({
      prompt: `
        Analyze this content for community violations (hate speech, spam, extreme violence).
        Content: "${content}"
        Return JSON with isFlagged (boolean) and reason.
      `,
      output: { format: 'json' }
    });
    
    return response.output as { isFlagged: boolean, reason?: string };
  } catch (error) {
    return { isFlagged: false };
  }
}
