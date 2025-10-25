
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
import { AssistantInputSchema, AssistantOutputSchema, ToolResponseSchema } from './assistant-schema';
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
          console.log("[findStudentTool] A coleção 'students' está vazia.");
          return [];
      }
      
      const students = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student & { id: string }));
      
      const searchResults = students
        .filter(student => student.mainItem && student.mainItem.toLowerCase().includes(name.toLowerCase()))
        .map(student => ({ id: student.id, name: student.mainItem }));
        
      console.log(`[findStudentTool] Encontrados ${searchResults.length} alunos para a consulta "${name}"`);
      return searchResults;

    } catch (error) {
      console.error("[findStudentTool] Erro ao aceder ao Firestore:", error);
      // Retorna um array vazio em caso de erro para não quebrar o fluxo.
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
        inputSchema: z.object({}), // Não precisa de input
        outputSchema: ToolResponseSchema,
    },
    async () => ({}) // Retorna um objeto vazio, conforme o schema
);


const assistantSystemPrompt = `
    Você é a FernandIA, uma assistente de IA para uma aplicação de gestão de alunos.
    Sua tarefa é ajudar os utilizadores a interagir com a aplicação através de uma conversa.
    Seja concisa, amigável e útil.

    Você receberá uma consulta do usuário que já especifica uma ação (ex: "Encontrar aluno para editar: João"). 
    Siga estes passos rigorosamente:

    1.  **Use a ferramenta 'findStudent'**: Sempre que a consulta do usuário incluir um nome, use a ferramenta 'findStudent' para procurar o aluno.
    2.  **Analise o resultado da pesquisa**:
        - Se encontrar **um** aluno, use a ferramenta de ação apropriada ('requestEditStudent' ou 'requestGenerateDeclaration') com o ID do aluno encontrado. Responda com uma confirmação simples como "Ok, a abrir a janela para [Nome do Aluno]".
        - Se encontrar **vários** alunos, liste os nomes e pergunte ao usuário para especificar qual deles é o correto. Ex: "Encontrei alguns alunos com esse nome: [Nome1], [Nome2]. Qual deles você gostaria de selecionar?"
        - Se **não encontrar** nenhum aluno, informe ao usuário. Ex: "Não encontrei nenhum aluno com o nome [nome pesquisado]."
    3.  **Ação Direta**: Se a consulta for para uma ação que não requer um nome de aluno (como "criar lista"), use a ferramenta correspondente ('requestCreateList') imediatamente.
    4.  **Baseie-se apenas nos resultados das ferramentas**. Nunca invente informações.
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
        const llmResponse = await ai.generate({
            // Passa a mensagem mais recente do usuário para o modelo.
            prompt: input.history[input.history.length - 1].content,
            history: input.history.slice(0, -1),
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
