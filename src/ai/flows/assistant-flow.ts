'use server';
/**
 * @fileOverview Defines the server-side logic for the AI assistant,
 * including its core Genkit flow.
 */

import { ai, configureGenkitOnce } from '@/ai/genkit';
import { getFirestoreServer } from '@/firebase/server-init';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { Student } from '@/docs/backend-schema';
import { AssistantInputSchema, AssistantOutputSchema, type AssistantInput } from './assistant-schema';
import { Message } from 'genkit';

// Ensure Genkit is configured once before defining flows.
configureGenkitOnce();

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

    const systemPrompt = `
        Você é um assistente virtual para uma aplicação de gestão de alunos.
        Sua tarefa é responder a perguntas e ajudar os utilizadores a gerir os dados dos alunos.
        Seja conciso, amigável e útil.

        Aqui está uma amostra de nomes de alunos na base de dados para seu contexto:
        ${studentSample}
      `;

    // Add the system prompt to the beginning of the history
    const historyWithSystemPrompt: Message[] = [
        { role: 'system', content: [{ text: systemPrompt }] },
        ...history,
        { role: 'user', content: [{ text: query }] }
    ];

    const result = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: [], // prompt is now part of history
      history: historyWithSystemPrompt,
      config: {
        temperature: 0.5, // Adjust for more creative or factual responses
      },
    });

    const response = result.text;

    return { response };
  }
);
