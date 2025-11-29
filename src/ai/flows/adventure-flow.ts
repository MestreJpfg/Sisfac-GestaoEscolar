
'use server';
/**
 * @fileOverview Um fluxo Genkit para gerar histórias de aventura interativas.
 *
 * - generateAdventureStep - Gera a próxima parte de uma história com base na entrada.
 * - AdventureInput - O tipo de entrada para o fluxo.
 * - AdventureOutput - O tipo de retorno do fluxo.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const AdventureInputSchema = z.object({
  genre: z.string().describe('O género da aventura (por exemplo, Fantasia, Ficção Científica, Mistério).'),
  character: z.string().describe('Uma breve descrição do personagem principal.'),
  previousStory: z.string().optional().describe('A parte anterior da história para manter o contexto.'),
  choice: z.string().optional().describe('A escolha que o jogador fez no passo anterior.'),
});
export type AdventureInput = z.infer<typeof AdventureInputSchema>;

const AdventureOutputSchema = z.object({
  story: z.string().describe('A próxima parte da narrativa da história.'),
  choices: z.array(z.string()).length(3).describe('Exatamente três opções de escolha para o jogador continuar a história.'),
  isEnd: z.boolean().describe('Indica se este é o fim da aventura.'),
});
export type AdventureOutput = z.infer<typeof AdventureOutputSchema>;

export async function generateAdventureStep(input: AdventureInput): Promise<AdventureOutput> {
  return generateAdventureStepFlow(input);
}


const storyPrompt = ai.definePrompt({
    name: "storyPrompt",
    input: { schema: AdventureInputSchema },
    output: { schema: AdventureOutputSchema },
    model: googleAI('gemini-pro'),

    prompt: `
        Você é um mestre de jogo a narrar uma aventura de texto interativa.
        O género é: {{{genre}}}.
        O personagem principal é: {{{character}}}.

        {{#if previousStory}}
        A história até agora é: "{{{previousStory}}}"
        O jogador escolheu: "{{{choice}}}"
        Continue a história com base na escolha do jogador.
        {{else}}
        Esta é a primeira parte da aventura. Crie uma introdução envolvente que coloque o personagem numa situação inicial.
        {{/if}}

        A sua resposta deve ser um parágrafo cativante de 3 a 5 frases.
        Termine a sua resposta com uma pergunta clara para o jogador.
        Forneça exatamente três opções de escolha curtas e distintas (1-5 palavras cada) que sejam ações claras que o jogador pode tomar.
        Se a história tiver chegado a uma conclusão natural (boa ou má), defina 'isEnd' como true.
    `,
});


const generateAdventureStepFlow = ai.defineFlow(
  {
    name: 'generateAdventureStepFlow',
    inputSchema: AdventureInputSchema,
    outputSchema: AdventureOutputSchema,
  },
  async (input) => {
    
    const { output } = await storyPrompt(input);

    return output!;
  }
);
