
'use server';

/**
 * @fileoverview This file defines the main Genkit flow that acts as a router.
 * It determines the user's intent and delegates the request to the appropriate
 * specialist flow.
 */

import { ai } from '@/ai/genkit';
import { studentDataAssistantFlow } from './studentDataAssistant';
import { z } from 'zod';
import {
  KnowledgeAssistantInputSchema,
  KnowledgeAssistantOutputSchema,
  type KnowledgeAssistantInput,
  type KnowledgeAssistantOutput,
} from './schemas';
import { generalKnowledgeFlow } from './knowledgeAssistant';


const routerPrompt = ai.definePrompt({
  name: 'routerPrompt',
  model: 'googleai/gemini-1.5-flash',
  system: `You are a router. Your job is to determine the user's intent and route them to the appropriate specialist.
  - If the user is asking a question about student data, school information, enrollment, classes, or anything related to student management, respond with the 'student_data' tool.
  - For any other topic, like general conversation, news, jokes, games, etc., respond with the 'knowledge' tool.
  `,
  input: { schema: z.object({ prompt: z.string() }) },
  output: {
    schema: z.object({
      route: z.enum(['student_data', 'knowledge']),
    }),
  },
  prompt: `User question: {{{prompt}}}`,
});

const routerFlow = ai.defineFlow(
  {
    name: 'routerFlow',
    inputSchema: KnowledgeAssistantInputSchema,
    outputSchema: KnowledgeAssistantOutputSchema,
  },
  async (input) => {
    // Dynamically build the prompt history.
    const history = (input.history ?? []).map((item) => ({
      role: item.role === 'bot' ? 'model' : 'user',
      content: item.content,
    }));

    // Route the user's prompt
    const routeResult = await routerPrompt({ prompt: input.prompt });

    if (routeResult.output?.route === 'student_data') {
      return await studentDataAssistantFlow({ prompt: input.prompt, history });
    }

    // Default to the general knowledge flow
    return await generalKnowledgeFlow({ prompt: input.prompt, history });
  }
);

/**
 * Server-side function that wraps the main router flow.
 * This is the primary function that the client-side code will call.
 * @param input The user's prompt and conversation history.
 * @returns The AI's response from the appropriate specialist.
 */
export async function knowledgeAssistant(
  input: KnowledgeAssistantInput
): Promise<KnowledgeAssistantOutput> {
  return await routerFlow(input);
}
