
'use server';
/**
 * @fileOverview Defines the server-side logic for the AI assistant,
 * including its core Genkit flow. This file exports an async function
 * `assistantFlow` which is a wrapper around the actual Genkit flow.
 */

import { ai } from '@/ai/genkit';
import { getFirestoreServer } from '@/firebase/server-init';
import { collection, getDocs } from 'firebase/firestore';
import { type Student } from '@/docs/backend-schema';
import { AssistantInputSchema, AssistantOutputSchema, type AssistantInput, ToolResponseSchema } from './assistant-schema';
import { z } from 'genkit';

const findStudentTool = ai.defineTool(
  {
    name: 'findStudent',
    description: 'Encontra um aluno pelo nome na base de dados.',
    inputSchema: z.object({ name: z.string().describe('O nome ou parte do nome do aluno a ser procurado.') }),
    outputSchema: z.array(z.object({ id: z.string(), name: z.string() })),
  },
  async ({ name }) => {
    try {
      const db = getFirestoreServer();
      const studentsRef = collection(db, 'students');
      
      const querySnapshot = await getDocs(studentsRef);
      if (querySnapshot.empty) {
          console.log("No students found in the database.");
          return [];
      }
      
      const students = querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() as Student }));
      
      // Filter in memory
      const searchResults = students
        .filter(student => student.data.mainItem && student.data.mainItem.toLowerCase().includes(name.toLowerCase()))
        .map(student => ({ id: student.id, name: student.data.mainItem }));
        
      console.log(`Found ${searchResults.length} students for query "${name}"`);
      return searchResults;
    } catch (error) {
      console.error("Error in findStudent tool:", error);
      // Return an empty array on error to prevent the flow from crashing
      return [];
    }
  }
);


const requestEditStudentTool = ai.defineTool(
    {
        name: 'requestEditStudent',
        description: 'Pede à interface para abrir o formulário de edição para um aluno específico.',
        inputSchema: z.object({ studentId: z.string().describe('O ID do aluno a ser editado.') }),
        outputSchema: ToolResponseSchema,
    },
    async ({ studentId }) => ({ studentId })
);

const requestGenerateDeclarationTool = ai.defineTool(
    {
        name: 'requestGenerateDeclaration',
        description: 'Pede à interface para abrir o gerador de declaração para um aluno específico.',
        inputSchema: z.object({ studentId: z.string().describe('O ID do aluno para o qual gerar a declaração.') }),
        outputSchema: ToolResponseSchema,
    },
    async ({ studentId }) => ({ studentId })
);

const requestCreateListTool = ai.defineTool(
    {
        name: 'requestCreateList',
        description: 'Pede à interface para abrir o gerador de listas de alunos.',
        inputSchema: z.object({}),
        outputSchema: ToolResponseSchema,
    },
    async () => ({})
);


const assistantSystemPrompt = `
    Você é a FernandIA, uma assistente virtual para uma aplicação de gestão de alunos.
    Sua tarefa é ajudar os utilizadores a interagir com a aplicação através de uma conversa.
    Seja concisa, amigável e útil.

    Sempre se apresente como "FernandIA" na sua primeira mensagem.
    
    Para executar uma ação que requer encontrar um aluno (como editar ou gerar declaração), siga estes passos:
    1.  Use a ferramenta "findStudent" para procurar o aluno pelo nome fornecido pelo utilizador.
    2.  Analise o resultado da ferramenta:
        - Se encontrar UM aluno, confirme com o utilizador ("Encontrei [nome do aluno]. Devo prosseguir com a ação?"). Se o utilizador confirmar, use a ferramenta apropriada ("requestEditStudent" or "requestGenerateDeclaration") com o ID do aluno.
        - Se encontrar VÁRIOS alunos, liste os nomes encontrados e peça ao utilizador para especificar qual deles é o correto.
        - Se NÃO encontrar nenhum aluno, informe ao utilizador que não encontrou ninguém com aquele nome.
    3. Para criar uma lista de alunos, use a ferramenta "requestCreateList" diretamente se o utilizador pedir.

    NÃO invente informações. Baseie-se apenas nos resultados das ferramentas.
`;

const internalAssistantFlow = ai.defineFlow(
    {
      name: 'assistantFlow',
      inputSchema: AssistantInputSchema,
      outputSchema: AssistantOutputSchema,
      system: assistantSystemPrompt,
      tools: [findStudentTool, requestEditStudentTool, requestGenerateDeclarationTool, requestCreateListTool]
    },
    async (input) => {
        
        const result = await ai.generate({
            history: input.history,
            config: { temperature: 0.3 },
        });
        
        return result.output();
    }
);


export async function assistantFlow(input: AssistantInput): Promise<any> {
    return internalAssistantFlow(input);
}
