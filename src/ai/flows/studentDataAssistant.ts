'use server';
/**
 * @fileOverview An AI assistant for answering questions.
 *
 * - studentDataAssistant - A function that handles answering questions.
 * - StudentDataAssistantInput - The input type for the studentDataAssistant function.
 * - StudentDataAssistantOutput - The return type for the studentDataAssistant function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the schema for the input, which only includes the user's query.
const StudentDataAssistantInputSchema = z.object({
  query: z.string().describe("The user's question."),
});
export type StudentDataAssistantInput = z.infer<typeof StudentDataAssistantInputSchema>;

const StudentDataAssistantOutputSchema = z.string().describe("The AI's answer to the user's query.");
export type StudentDataAssistantOutput = z.infer<typeof StudentDataAssistantOutputSchema>;


export async function studentDataAssistant(input: StudentDataAssistantInput): Promise<StudentDataAssistantOutput> {
  return studentDataAssistantFlow(input);
}

// This prompt now takes a simple string.
const studentDataAssistantPrompt = ai.definePrompt({
  name: 'studentDataAssistantPrompt',
  prompt: `You are a helpful general-purpose assistant.
  The current date is ${new Date().toLocaleDateString('pt-BR')}.

  User's Question:
  "{{{query}}}"

  Provide a clear and concise answer using your general knowledge.
  `,
});

const studentDataAssistantFlow = ai.defineFlow(
  {
    name: 'studentDataAssistantFlow',
    inputSchema: StudentDataAssistantInputSchema,
    outputSchema: StudentDataAssistantOutputSchema,
  },
  async (input) => {
    // We pass the query as a simple string to the prompt.
    const { output } = await studentDataAssistantPrompt(input);
    
    // Handle cases where the model might return a null or undefined output
    if (output === null || output === undefined) {
        return "Desculpe, não consegui encontrar uma resposta para sua pergunta.";
    }
    return output as string;
  }
);
