/**
 * @fileOverview Defines the data schemas (using Zod) and TypeScript types 
 * for the AI assistant flow. This keeps type definitions separate from the
 * server-side logic.
 */

import { z } from 'genkit';

// Define the schema for a single message in the conversation history
const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(z.object({ text: z.string() })),
});

// Define the input schema for the assistant flow
export const AssistantInputSchema = z.object({
  history: z.array(HistoryMessageSchema).describe('The conversation history.'),
  query: z.string().describe('The latest user query.'),
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;

// Define the output schema for the assistant flow
export const AssistantOutputSchema = z.object({
  response: z.string().describe('The AI model\'s response.'),
});
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;
