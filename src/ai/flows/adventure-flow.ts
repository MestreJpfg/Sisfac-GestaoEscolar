
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/google-genai';

// Zod Schema para as opções de escolha do jogador
const OpcaoSchema = z.object({
  texto: z.string().describe("O texto conciso que aparece no botão de escolha (ex: 'Investigar a luz')."),
  tipo: z.enum(['acao', 'combate', 'fuga', 'dialogo']).describe("O tipo de ação. Ajuda o sistema a manter a lógica."),
  resultado_esperado: z.string().describe("Uma frase curta (para a IA) sobre o resultado desta escolha no próximo turno."),
});

// Zod Schema para as atualizações de status do jogador
const StatusUpdateSchema = z.object({
  dano_recebido: z.number().describe("O número de pontos de Energia que o jogador perdeu (positivo). Se ganhou vida, use número negativo."),
  item_adicionado: z.string().nullable().describe("O nome exato do item adicionado ao inventário (ou null)."),
  item_removido: z.string().nullable().describe("O nome exato do item removido do inventário (ou null)."),
});

// Zod Schema principal que define a estrutura de cada "página" da aventura
const AdventureStepSchema = z.object({
  narrativa: z.string().describe("O bloco principal de texto da história, imersivo e descritivo."),
  status_update: StatusUpdateSchema.describe("As mudanças de Energia e Inventário resultantes da ação do jogador."),
  opcoes: z.array(OpcaoSchema).describe("Um array de 2 a 4 opções claras para o jogador."),
  game_over: z.boolean().describe("Definido como TRUE apenas se a Energia do jogador chegou a zero (ou se o final foi alcançado)."),
});

// Zod Schema para o estado do jogador
const PlayerStateSchema = z.object({
  skill: z.number().describe("A Habilidade do jogador."),
  stamina: z.number().describe("A Energia (ou vida) atual do jogador."),
  luck: z.number().describe("A Sorte do jogador."),
  inventory: z.array(z.string()).describe("Os itens que o jogador possui."),
  storyContext: z.string().describe("O resumo do que aconteceu na última cena.")
});

// Zod Schema para o input do fluxo
const AdventureFlowInputSchema = z.object({
  playerState: PlayerStateSchema,
  playerAction: z.string().describe("A ação que o jogador acabou de escolher."),
  systemPrompt: z.string().describe("A premissa original da aventura, para manter a consistência do tema."),
});


export type AdventureStep = z.infer<typeof AdventureStepSchema>;
export type PlayerState = z.infer<typeof PlayerStateSchema>;
export type AdventureFlowInput = z.infer<typeof AdventureFlowInputSchema>;


const storyPrompt = ai.definePrompt({
  name: 'generateAdventureStory',
  input: { schema: AdventureFlowInputSchema },
  output: { schema: AdventureStepSchema },
  
  prompt: `
    VOCÊ É: O Mestre de Jogo de uma aventura interativa estilo "livro-jogo".

    SEU OBJETIVO: Criar uma narrativa imersiva, gerenciar o estado do jogador e oferecer escolhas estratégicas, com base na premissa fornecida.

    PREMISSA DA AVENTURA: {{{systemPrompt}}}

    REGRAS DE NARRATIVA:
    1. Use a segunda pessoa ("Você entra na sala...", "Você sente o cheiro...").
    2. Mantenha descrições evocativas mas concisas.
    3. Adapte o gênero com base na premissa.
    4. Termine sempre a narrativa preparando o terreno para as escolhas.

    REGRAS DE LÓGICA DE JOGO:
    1. Você deve rastrear a ENERGIA (Stamina) e o INVENTÁRIO.
    2. Se o jogador sofrer dano na narrativa, deduza da Energia. Se chegar a 0, é Game Over.
    3. Se o jogador encontrar um item, adicione ao inventário.
    4. Se uma escolha exigir um item, verifique se o jogador possui o item no contexto fornecido. Se não, não mostre a opção.

    FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
    Responda APENAS com um objeto JSON válido que siga o schema definido.

    CONTEXTO ATUAL DO JOGADOR:
    - Energia: {{{playerState.stamina}}}
    - Habilidade: {{{playerState.skill}}}
    - Sorte: {{{playerState.luck}}}
    - Inventário: {{{playerState.inventory}}}
    - Último Acontecimento: {{{playerState.storyContext}}}

    AÇÃO DO JOGADOR: {{{playerAction}}}

    Gere a próxima cena em JSON.
  `,
});

const generateAdventureStepFlow = ai.defineFlow(
  {
    name: 'generateAdventureStepFlow',
    inputSchema: AdventureFlowInputSchema,
    outputSchema: AdventureStepSchema,
  },
  async (input) => {
    const { output } = await storyPrompt(input, { model: googleAI.model('gemini-2.5-flash') });
    return output!;
  }
);

export async function generateAdventureStep(input: AdventureFlowInput): Promise<AdventureStep> {
  return generateAdventureStepFlow(input);
}
