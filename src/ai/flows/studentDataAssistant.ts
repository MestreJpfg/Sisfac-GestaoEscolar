/**
 * @fileoverview Defines the data structures (schemas and types) for the knowledge assistant.
 * This file exports Zod schemas and TypeScript types for input and output,
 * allowing for type-safe data handling across the client and server.
 */

import { z } from 'zod';

// Define the schema for the history of the conversation.
const HistoryItemSchema = z.object({
  role: z.enum(['user', 'bot']),
  content: z.array(z.object({ text: z.string() })),
});

// Define the Zod schema for the flow's input.
export const KnowledgeAssistantInputSchema = z.object({
  history: z.array(HistoryItemSchema).optional(),
  prompt: z.string(),
});
export type KnowledgeAssistantInput = z.infer<typeof KnowledgeAssistantInputSchema>;

// Define the Zod schema for the flow's output.
export const KnowledgeAssistantOutputSchema = z.object({
  reply: z.string(),
});
export type KnowledgeAssistantOutput = z.infer<typeof KnowledgeAssistantOutputSchema>;
