'use server';

/**
 * @fileoverview Define a Genkit flow for a general-purpose knowledge assistant.
 * This file contains the server-side logic for the AI assistant.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  KnowledgeAssistantInput,
  KnowledgeAssistantOutput,
  KnowledgeAssistantInputSchema,
  KnowledgeAssistantOutputSchema
} from './studentDataAssistant';

// Define the main prompt for the AI assistant.
const knowledgeAssistantPrompt = ai.definePrompt(
  {
    name: 'knowledgeAssistantPrompt',
    // Instructions for the model on how to behave.
    system:
      'Você é um assistente de IA amigável e prestativo. Sua tarefa é conversar com o usuário sobre uma variedade de tópicos, como cotidiano, notícias, piadas, jogos e mais. Responda de forma concisa e envolvente. Você deve ser capaz de manter uma conversa fluida e natural.',
    input: {
      schema: z.object({ prompt: z.string() }),
    },
    output: {
      schema: KnowledgeAssistantOutputSchema,
    },
  },
  async (input) => `{{{prompt}}}`
);

// Define the main Genkit flow.
const knowledgeAssistantFlow = ai.defineFlow(
  {
    name: 'knowledgeAssistantFlow',
    inputSchema: KnowledgeAssistantInputSchema,
    outputSchema: KnowledgeAssistantOutputSchema,
  },
  async (input) => {
    // Dynamically build the prompt history.
    const history = (input.history ?? []).map(item => ({
      role: item.role,
      content: item.content,
    }));

    // Call the prompt with the validated input and history.
    const result = await knowledgeAssistantPrompt(
      { prompt: input.prompt },
      { history }
    );

    // If the model returns a null or undefined output, return a default error message.
    if (!result || !result.reply) {
      return {
        reply: 'Desculpe, não consegui processar sua pergunta. Tente novamente.',
      };
    }
    return result;
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
