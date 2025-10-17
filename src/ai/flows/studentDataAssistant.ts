'use server';
/**
 * @fileOverview An AI assistant for answering questions about student data.
 *
 * - studentDataAssistant - A function that handles answering questions about student data.
 * - StudentDataAssistantInput - The input type for the studentDataAssistant function.
 * - StudentDataAssistantOutput - The return type for the studentDataAssistant function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the schema for the input, which includes the user's query and the raw student data.
const StudentDataAssistantInputSchema = z.object({
  query: z.string().describe('The user\'s question.'),
  studentData: z.array(z.record(z.any())).describe('The list of all student data as an array of objects. This is the primary source of information.'),
});
export type StudentDataAssistantInput = z.infer<typeof StudentDataAssistantInputSchema>;

const StudentDataAssistantOutputSchema = z.string().describe("The AI's answer to the user's query.");
export type StudentDataAssistantOutput = z.infer<typeof StudentDataAssistantOutputSchema>;


export async function studentDataAssistant(input: StudentDataAssistantInput): Promise<StudentDataAssistantOutput> {
  return studentDataAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'studentDataAssistantPrompt',
  input: { schema: StudentDataAssistantInputSchema },
  prompt: `You are a helpful assistant. Your primary task is to answer questions based on the provided student data, but you can also answer general questions.
  The current date is ${new Date().toLocaleDateString('pt-BR')}.

  If the question is about the students, analyze the student data provided in the JSON format below to answer.

  Student Data:
  {{{json studentData}}}

  User's Question:
  "{{{query}}}"

  Provide a clear and concise answer. If the data is insufficient to answer a student-related question, state that. For general questions, use your own knowledge.
  `,
});

const studentDataAssistantFlow = ai.defineFlow(
  {
    name: 'studentDataAssistantFlow',
    inputSchema: StudentDataAssistantInputSchema,
    outputSchema: StudentDataAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    
    // Handle cases where the model might return a null or undefined output
    if (output === null || output === undefined) {
        return "Desculpe, não consegui encontrar uma resposta para sua pergunta.";
    }
    return output as string;
  }
);
