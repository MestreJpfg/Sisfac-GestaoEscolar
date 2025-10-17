'use server';

/**
 * @fileoverview Defines a Genkit flow that acts as a student data specialist.
 * It uses tools to fetch student information from Firestore and answers questions about it.
 */

import { ai } from '@/ai/genkit';
import { getStudentData } from '@/services/student-service';
import {
  KnowledgeAssistantInputSchema,
  KnowledgeAssistantOutputSchema,
  type KnowledgeAssistantInput,
  type KnowledgeAssistantOutput,
} from './schemas';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/google-genai';

const getStudentDataTool = ai.defineTool(
  {
    name: 'getStudentData',
    description: 'Retrieves all student data from the database.',
    inputSchema: z.undefined(),
    outputSchema: z.any(),
  },
  async () => {
    return await getStudentData();
  }
);

const studentDataPrompt = ai.definePrompt({
  name: 'studentDataPrompt',
  model: googleAI.model('gemini-pro'),
  system: `You are an expert assistant for a school management system.
Your role is to answer questions about student data based on the information provided by the 'getStudentData' tool.
Analyze the user's question and use the data retrieved by the tool to provide a clear and accurate answer.
Always respond in Portuguese.

Example questions you can answer:
- "Qual o total de alunos no turno da manhã?"
- "Quantos alunos estão na série 9º ANO?"
- "Liste os nomes dos alunos da turma B."
- "Qual o nome completo do aluno com o RA 12345?"

When you provide a list of names, format it clearly.
If the data is not available to answer the question, inform the user politely.`,

  tools: [getStudentDataTool],
  input: { schema: z.object({ prompt: z.string() }) },
  output: { schema: KnowledgeAssistantOutputSchema },
});

export const studentDataAssistantFlow = ai.defineFlow(
  {
    name: 'studentDataAssistantFlow',
    inputSchema: KnowledgeAssistantInputSchema,
    outputSchema: KnowledgeAssistantOutputSchema,
  },
  async (input: KnowledgeAssistantInput): Promise<KnowledgeAssistantOutput> => {
    const history = (input.history ?? []).map((item) => ({
      role: item.role === 'bot' ? 'model' : 'user',
      content: item.content,
    }));

    const llmResponse = await studentDataPrompt(
      { prompt: input.prompt },
      { history }
    );

    if (!llmResponse || !llmResponse.reply) {
      return {
        reply:
          'Não foi possível obter uma resposta do assistente de dados do aluno.',
      };
    }

    return llmResponse;
  }
);
