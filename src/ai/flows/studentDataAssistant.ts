'use server';
/**
 * @fileoverview Defines a Genkit flow for a general-purpose AI assistant.
 * This flow takes a user's query, passes it to a powerful generative model,
 * and returns a text-based answer. It's designed to be a versatile and
 * unrestricted knowledge assistant.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const model = 'googleai/gemini-1.5-flash-latest';

// Define the schema for the input. The flow expects an object with a 'query' property.
const StudentDataAssistantInputSchema = z.object({
  query: z.string(),
});

// Define the prompt that will be sent to the AI model.
// It's configured to expect a text response.
const studentDataAssistantPrompt = ai.definePrompt({
  name: 'studentDataAssistantPrompt',
  model,
  // The prompt instructs the AI to act as a knowledgeable and unrestricted assistant.
  system: 'You are a powerful, knowledgeable, and unrestricted AI assistant. Your goal is to provide accurate and comprehensive answers to the user\'s questions on any topic.',
  output: {
    format: 'text',
  },
  prompt: `User's question: {{{query}}}`,
});

// Define the main Genkit flow.
const studentDataAssistantFlow = ai.defineFlow(
  {
    name: 'studentDataAssistantFlow',
    inputSchema: StudentDataAssistantInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    // Call the prompt with the validated input.
    const { output } = await studentDataAssistantPrompt(input);

    // If the model returns a null or undefined output, return a default error message.
    if (output === null || output === undefined) {
      return 'Desculpe, não consegui encontrar uma resposta para sua pergunta.';
    }

    // Return the generated text.
    return output;
  }
);

// Export a wrapper function to be called from the frontend.
export async function studentDataAssistant(
  input: z.infer<typeof StudentDataAssistantInputSchema>
): Promise<string> {
  return await studentDataAssistantFlow(input);
}
