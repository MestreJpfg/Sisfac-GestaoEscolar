'use server';
/**
 * @fileOverview A general-purpose AI assistant.
 *
 * - studentDataAssistant - A function that handles the AI's response.
 * - StudentDataAssistantInput - The input type for the studentDataAssistant function.
 * - StudentDataAssistantOutput - The return type for the studentDataAssistant function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const StudentDataAssistantInputSchema = z.object({
  query: z.string().describe("The user's query."),
});
export type StudentDataAssistantInput = z.infer<typeof StudentDataAssistantInputSchema>;

const StudentDataAssistantOutputSchema = z.string().describe("The AI's answer to the user's query.");
export type StudentDataAssistantOutput = z.infer<typeof StudentDataAssistantOutputSchema>;

export async function studentDataAssistant(input: StudentDataAssistantInput): Promise<StudentDataAssistantOutput> {
  return studentDataAssistantFlow(input);
}

const studentDataAssistantPrompt = ai.definePrompt(
  {
    name: 'studentDataAssistantPrompt',
    input: { schema: StudentDataAssistantInputSchema },
    output: { schema: StudentDataAssistantOutputSchema },
    prompt: `You are a helpful general purpose AI assistant. Your goal is to provide accurate and helpful answers to the user's query.

User query:
{{{query}}}

Answer:
`,
  },
);

const studentDataAssistantFlow = ai.defineFlow(
  {
    name: 'studentDataAssistantFlow',
    inputSchema: StudentDataAssistantInputSchema,
    outputSchema: StudentDataAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await studentDataAssistantPrompt(input);
    
    if (output === null || output === undefined) {
        return "Desculpe, não consegui encontrar uma resposta para sua pergunta.";
    }
    return output;
  }
);
