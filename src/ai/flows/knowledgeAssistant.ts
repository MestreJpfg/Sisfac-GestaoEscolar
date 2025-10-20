
'use server';

/**
 * @fileoverview Define a Genkit flow for a general-purpose knowledge assistant.
 * This flow is responsible for handling general conversation and non-specialized tasks.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';
import {
  KnowledgeAssistantOutputSchema,
} from './schemas';

// Define the main prompt for the AI assistant.
const knowledgeAssistantPrompt = ai.definePrompt({
  name: 'knowledgeAssistantPrompt',
  model: googleAI.model('gemini-1.5-flash'),
  // Instructions for the model on how to behave.
  system:
    'Você é um assistente de IA amigável e prestativo. Sua tarefa é conversar com o usuário sobre uma variedade de tópicos, como cotidiano, notícias, piadas, jogos e mais. Responda de forma concisa e envolvente. Você deve ser capaz de manter uma conversa fluida e natural.',
  input: {
    schema: z.object({ prompt: z.string() }),
  },
  output: {
    schema: KnowledgeAssistantOutputSchema,
  },
  prompt: `{{{prompt}}}`,
});

// Define the main Genkit flow for general knowledge.
export const generalKnowledgeFlow = ai.defineFlow(
  {
    name: 'generalKnowledgeFlow',
    inputSchema: z.object({
        prompt: z.string(),
        history: z.array(z.any()).optional(),
    }),
    outputSchema: KnowledgeAssistantOutputSchema,
  },
  async (input) => {
    // Call the prompt with the validated input and history.
    const result = await knowledgeAssistantPrompt(
      { prompt: input.prompt },
      { history: input.history }
    );
    
    // If the model returns a null or undefined output, return a default error message.
    if (!result.output?.reply) {
      return {
        reply: 'Desculpe, não consegui processar sua pergunta. Tente novamente.',
      };
    }
    return result.output;
  }
);
