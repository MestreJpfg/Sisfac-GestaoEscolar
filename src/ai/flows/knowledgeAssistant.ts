/**
 * @fileoverview Defines a Genkit flow for a general-purpose knowledge assistant.
 *
 * This file sets up a conversational AI that can answer questions on a wide
 * range of topics like daily life, news, jokes, and games.
 *
 * It exports:
 * - `knowledgeAssistant`: The main server function to be called from the client.
 * - `KnowledgeAssistantInput`: The Zod schema for the flow's input.
 * - `KnowledgeAssistantOutput`: The Zod schema for the flow's output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the schema for the history of the conversation.
const HistoryItemSchema = z.object({
  role: z.enum(['user', 'bot']),
  content: z.array(z.object({ text: z.string() })),
});

// Define the Zod schema for the flow's input.
export const KnowledgeAssistantInput = z.object({
  history: z.array(HistoryItemSchema).optional(),
  prompt: z.string(),
});
export type KnowledgeAssistantInput = z.infer<typeof KnowledgeAssistantInput>;

// Define the Zod schema for the flow's output.
export const KnowledgeAssistantOutput = z.object({
  reply: z.string(),
});
export type KnowledgeAssistantOutput = z.infer<typeof KnowledgeAssistantOutput>;

// Define the main prompt for the AI assistant.
const knowledgeAssistantPrompt = ai.definePrompt(
  {
    name: 'knowledgeAssistantPrompt',
    // Instructions for the model on how to behave.
    system:
      'Você é um assistente de IA amigável e prestativo. Sua tarefa é conversar com o usuário sobre uma variedade de tópicos, como cotidiano, notícias, piadas, jogos e muito mais. Responda de forma concisa e envolvente. Você deve ser capaz de manter uma conversa fluida e natural.',
    output: {
      schema: KnowledgeAssistantOutput,
    },
  },
  async (input: KnowledgeAssistantInput) => {
    // Dynamically build the prompt history.
    const history = (input.history ?? []).map(item => ({
      role: item.role,
      content: item.content,
    }));

    return {
      history,
      prompt: input.prompt,
    };
  }
);


// Define the main Genkit flow.
const knowledgeAssistantFlow = ai.defineFlow(
  {
    name: 'knowledgeAssistantFlow',
    inputSchema: KnowledgeAssistantInput,
    outputSchema: KnowledgeAssistantOutput,
  },
  async (input) => {
    // Call the prompt with the validated input.
    const { output } = await knowledgeAssistantPrompt(input);

    // If the model returns a null or undefined output, return a default error message.
    if (output === null || output === undefined) {
      return {
        reply: 'Desculpe, não consegui processar sua pergunta. Tente novamente.',
      };
    }
    return output;
  }
);

/**
 * Server-side function that wraps the Genkit flow.
 * This is the function that the client-side code will call.
 * @param input The user's prompt and conversation history.
 * @returns The AI's response.
 */
export async function knowledgeAssistant(input: KnowledgeAssistantInput): Promise<KnowledgeAssistantOutput> {
  return await knowledgeAssistantFlow(input);
}
