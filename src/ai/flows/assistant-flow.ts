'use server';
/**
 * @fileOverview Defines the server-side logic for the AI assistant,
 * including its core Genkit flow, prompts, and data schemas.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit/zod';
import { geminiPro } from '@genkit-ai/google-genai';
import { getFirestoreServer } from '@/firebase/server-init';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { Student } from '@/docs/backend-schema';

// Define the schema for a single message in the conversation history
const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(z.object({ text: z.string() })),
});

// Define the input schema for the assistant flow
export const AssistantInputSchema = z.object({
  history: z.array(HistoryMessageSchema).describe('The conversation history.'),
  query: z.string().describe('The latest user query.'),
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;

// Define the output schema for the assistant flow
export const AssistantOutputSchema = z.object({
  response: z.string().describe('The AI model\'s response.'),
});
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

/**
 * Fetches a sample of student names from Firestore.
 * This data is used to provide context to the AI model.
 * @returns A string containing a comma-separated list of student names.
 */
async function getStudentSample(): Promise<string> {
  try {
    const db = getFirestoreServer();
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, limit(10));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return 'Nenhum aluno encontrado.';
    }

    const studentNames = querySnapshot.docs.map(doc => (doc.data() as Student).mainItem);
    return studentNames.join(', ');

  } catch (error) {
    console.error("Error fetching student data for AI context:", error);
    return "Não foi possível aceder aos dados dos alunos.";
  }
}

// Define the main Genkit flow for the assistant
export const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async ({ history, query }) => {
    
    const studentSample = await getStudentSample();

    const result = await ai.generate({
      model: geminiPro,
      history: history,
      prompt: `
        Você é um assistente virtual para uma aplicação de gestão de alunos.
        Sua tarefa é responder a perguntas e ajudar os utilizadores a gerir os dados dos alunos.
        Seja conciso, amigável e útil.

        Aqui está uma amostra de nomes de alunos na base de dados para seu contexto:
        ${studentSample}

        Pergunta do utilizador: ${query}
      `,
      config: {
        temperature: 0.5, // Adjust for more creative or factual responses
      },
    });

    const response = result.text();

    return { response };
  }
);
