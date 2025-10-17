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

// Define the schema for a single student, mirroring the DataItem type
const StudentSchema = z.object({
  id: z.string(),
  mainItem: z.string().describe("The student's full name."),
  subItems: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    })
  ).describe("Other details about the student, like grade, date of birth, etc."),
});


const StudentDataAssistantInputSchema = z.object({
  query: z.string().describe('The user\'s question about the student data.'),
  studentData: z.array(StudentSchema).describe('The list of all student data.'),
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
  // REMOVED: output: { schema: StudentDataAssistantOutputSchema },
  prompt: `You are an expert school data assistant. Your task is to answer questions based on the provided student data.
  The current date is ${new Date().toLocaleDateString('pt-BR')}.

  Analyze the student data provided in the JSON format below and answer the user's query.

  Student Data:
  {{{json studentData}}}

  User's Question:
  "{{{query}}}"

  Provide a clear and concise answer based only on the data given. If the data is insufficient to answer the question, state that.
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
