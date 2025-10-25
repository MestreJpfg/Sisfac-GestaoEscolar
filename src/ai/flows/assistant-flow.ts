
'use server';
/**
 * @fileOverview Defines the server-side logic for the AI assistant,
 * including its core Genkit flow. This file exports an async function
 * `assistantFlow` which is a wrapper around the actual Genkit flow.
 */

import { ai } from '@/ai/genkit';
import { getFirestoreServer } from '@/firebase/server-init';
import { collection, getDocs, query } from 'firebase/firestore';
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
      
      // Filter in memory for robustness
      const searchResults = students
        .filter(student => student.data.mainItem && student.data.mainItem.toLowerCase().includes(name.toLowerCase()))
        .map(student => ({ id: student.id, name: student.data.mainItem }));
        
      console.log(`[findStudentTool] Found ${searchResults.length} students for query "${name}"`);
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
    Você é a FernandIA, uma assistente de IA para uma aplicação de gestão de alunos.
    Sua tarefa é ajudar os utilizadores a interagir com a aplicação através de uma conversa.
    Seja concisa, amigável e útil.

    Você receberá uma consulta do usuário que especifica uma ação (editar, gerar declaração, criar lista) e, às vezes, um nome de aluno.
    
    SIGA RIGOROSAMENTE ESTES PASSOS:
    1.  Primeiro, use SEMPRE a ferramenta "findStudent" para procurar o aluno pelo nome fornecido na consulta do usuário. Se a consulta for apenas para 'criar lista', a ferramenta "findStudent" não é necessária.
    2.  Analise o resultado da ferramenta "findStudent":
        - Se encontrar UM aluno correspondente, você DEVE usar a ferramenta de AÇÃO apropriada ("requestEditStudent" ou "requestGenerateDeclaration") com o ID do aluno encontrado para solicitar a ação na interface. NÃO precisa confirmar com o usuário. Apenas execute a ação.
        - Se encontrar VÁRIOS alunos, você DEVE listar os nomes encontrados e perguntar ao usuário para especificar qual deles é o correto. Ex: "Encontrei alguns alunos com esse nome: [Nome1], [Nome2]. Qual deles você gostaria de selecionar?"
        - Se NÃO encontrar nenhum aluno, você DEVE informar ao usuário que ninguém foi encontrado com aquele nome. Ex: "Não encontrei nenhum aluno com o nome [nome pesquisado]."
    3.  Se a consulta do usuário for para "criar lista", use a ferramenta "requestCreateList" imediatamente.
    4.  Nunca invente informações. Baseie-se apenas nos resultados das ferramentas.
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
        // The input now contains the full history, with the user's latest query at the end.
        const llmResponse = await ai.generate({
            history: input.history,
            config: { temperature: 0.1 },
        });
        
        return llmResponse.output();
    }
);

/**
 * Wrapper function for the Genkit flow.
 * It takes the conversation history and passes it to the flow.
 */
export async function assistantFlow(input: AssistantInput): Promise<any> {
    return internalAssistantFlow(input);
}
