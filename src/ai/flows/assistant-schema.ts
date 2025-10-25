/**
 * @fileOverview Defines the data schemas (using Zod) and TypeScript types 
 * for the AI assistant flow. This keeps type definitions separate from the
 * server-side logic.
 */

import { z } from 'genkit';

// Define the schema for a single message in the conversation history
const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'model', 'system', 'tool']),
  content: z.array(z.object({ 
      text: z.string().optional(),
      toolRequest: z.any().optional(),
      toolResponse: z.any().optional(),
    })),
});

// Define the input schema for the assistant flow
export const AssistantInputSchema = z.object({
  history: z.array(HistoryMessageSchema).describe('The conversation history.'),
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;

// Define the output schema for the assistant flow
export const AssistantOutputSchema = z.any();


export const ToolResponseSchema = z.object({
  studentId: z.string().optional(),
});
