'use server';
/**
 * @fileOverview Defines the server-side logic for the AI assistant,
 * including its core Genkit flow. This file exports an async function
 * `assistantFlow` which is a wrapper around the actual Genkit flow.
 */

import { ai } from '@/ai/genkit';
import { getFirestoreServer } from '@/firebase/server-init';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
      
      // Firestore does not support partial text search natively.
      // This is a workaround for a small dataset. For larger datasets,
      // a dedicated search service like Algolia or Elasticsearch would be better.
      const querySnapshot = await getDocs(studentsRef);
      if (querySnapshot.empty) return [];
      
      const students = querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() as Student }));
      
      const searchResults = students
        .filter(student => student.data.mainItem.toLowerCase().includes(name.toLowerCase()))
        .map(student => ({ id: student.id, name: student.data.mainItem }));
        
      return searchResults;
    } catch (error) {
      console.error("Error in findStudent tool:", error);
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
    Na sua primeira mensagem, liste as ações que você pode realizar:
    - Editar dados de um aluno
    - Gerar uma declaração de matrícula
    - Criar uma lista de alunos por série

    Para executar uma ação, você DEVE usar as ferramentas disponíveis.
    
    COMO USAR AS FERRAMENTAS:
    1.  Se o utilizador pedir para editar ou gerar uma declaração para um aluno, PRIMEIRO use a ferramenta "findStudent" para encontrar o aluno.
    2.  Se encontrar UM aluno, confirme com o utilizador e, após a confirmação, use a ferramenta "requestEditStudent" ou "requestGenerateDeclaration" com o ID do aluno.
    3.  Se encontrar VÁRIOS alunos, peça ao utilizador para especificar qual deles é o correto.
    4.  Se NÃO encontrar nenhum aluno, informe o utilizador.
    5.  Se o utilizador pedir para criar uma lista, use a ferramenta "requestCreateList" diretamente.

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
    async ({ history }) => {
        
        const result = await ai.generate({
            history,
            config: { temperature: 0.3 },
        });
        
        return result.output();
    }
);


export async function assistantFlow(input: AssistantInput): Promise<any> {
    return internalAssistantFlow(input);
}
