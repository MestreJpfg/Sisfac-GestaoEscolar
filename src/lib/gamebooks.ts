
export interface Choice {
    text: string;
    to: number | string;
    type?: 'action' | 'spell'; // Para diferenciar ações normais de feitiços
    requires?: { item?: string; spell?: string }; // Requerimentos para a escolha aparecer
    test?: 'luck'; // Para testes de sorte
    success: { to: number | string, text?: string };
    failure: { to: number | string, text?: string };
}

export interface Combat {
    enemy: string;
    skill: number;
    stamina: number;
    success: { to: number | string };
    failure: { to: number | string };
}


export interface StoryNode {
    text: string;
    choices?: Choice[];
    event?: 'test_luck' | 'combat' | 'auto';
    combat?: Combat;
    getItems?: string[]; // Itens que o jogador obtém nesta secção
    loseItems?: string[]; // Itens que o jogador perde
    staminaChange?: number; // Mudança na ENERGIA
    luckChange?: number; // Mudança na SORTE
    autoNavigate?: { to: number | string }; // Para transições automáticas
}

export interface Spell {
    name: string;
    description: string;
}

export interface Gamebook {
    title: string;
    description: string;
    player_stats: {
        initial_skill: number;
        initial_stamina: number;
        initial_luck: number;
    },
    inventory: string[],
    spells: Spell[],
    nodes: Record<string | number, StoryNode>;
}

export const gamebooks: Record<string, Gamebook> = {
    cidadelaDoCaos: {
        title: "A Cidadela do Caos",
        description: "Aventure-se na perigosa cidadela para derrotar o feiticeiro Balthus Dire.",
        player_stats: {
            initial_skill: 9,
            initial_stamina: 18,
            initial_luck: 9,
        },
        inventory: ["Mochila", "Espada"],
        spells: [
            { name: "Cópia", description: "Cria uma duplicata de um objeto pequeno." },
            { name: "Ilusão", description: "Cria uma ilusão visual e sonora." },
            { name: "Levitação", description: "Permite que você flutue no ar por um curto período." },
            { name: "Escudo", description: "Cria um escudo mágico que o protege de um ataque." },
            { name: "Fraqueza", description: "Reduz a Habilidade de uma criatura." },
            { name: "Bola de Fogo", description: "Lança uma bola de fogo explosiva." },
        ],
        nodes: {
            "start": {
                text: "Você é um valente aventureiro, um discípulo do Grande Mago de Yore. A sua missão, caso decida aceitá-la, é atravessar o Vale dos Salgueiros, infiltrar-se na temida Cidadela do Caos e assassinar o nefasto feiticeiro, Balthus Dire, que ameaça mergulhar a terra na escuridão. \n\nApós uma longa jornada, você chega aos portões da cidadela. A ponte levadiça está erguida. O seu mestre o instruiu que a entrada principal seria suicídio. Seguindo os seus conselhos, você encontra uma saliência rochosa que o leva ao telhado irregular da fortaleza.",
                choices: [
                    { text: "Subir ao telhado e procurar uma entrada.", to: 1, success: { to: 1 }, failure: { to: 1 } }
                ]
            },
            1: {
                text: "Você está no telhado poeirento. O vento uiva ao seu redor. À sua frente, há duas possíveis entradas: uma grande chaminé de onde sai uma fumaça com cheiro de comida estragada, e uma claraboia de vidro escuro que parece levar a um aposento mais silencioso.",
                choices: [
                    { text: "Descer pela chaminé.", to: 2, success: { to: 2 }, failure: { to: 2 } },
                    { text: "Tentar abrir a claraboia.", to: 3, success: { to: 3 }, failure: { to: 3 } }
                ]
            },
            2: {
                text: "Você desce pela chaminé escorregadia e aterrissa, coberto de fuligem, numa enorme lareira apagada. A cozinha está um caos. Um COZINHEIRO ANÃO, gordo e suado, grita com vários GOBLINS que correm desajeitados. Aparentemente, ninguém notou a sua chegada.",
                choices: [
                    { text: "Esconder-se nas sombras e observar.", to: 4, success: { to: 4 }, failure: { to: 4 } },
                    { text: "Tentar sair sorrateiramente pela porta dos fundos.", to: 5, success: { to: 5 }, failure: { to: 5 } }
                ]
            },
            3: {
                text: "A claraboia está trancada. Você tenta usar sua espada para forçar a fechadura. \n\nTESTE A SUA SORTE. Se for sortudo, você consegue abrir sem fazer barulho. Se for azarado, o vidro se estilhaça.",
                event: "test_luck",
                choices: [
                    {
                        text: "Testar Sorte",
                        to: 0, // Placeholder
                        success: { to: 17, text: "Com um clique suave, a fechadura cede. Você desliza para dentro de uma biblioteca silenciosa e empoeirada." },
                        failure: { to: 18, text: "CRASH! O vidro parte-se com um barulho ensurdecedor. Alarmes soam!" }
                    }
                ]
            },
            4: {
                text: "Das sombras, você observa a cena. O Cozinheiro Anão está a preparar uma sopa horrível num caldeirão. Ele parece distraído. Você vê uma porta que parece levar para uma despensa e outra, maior, que provavelmente leva ao interior da cidadela.",
                choices: [
                    { text: "Aproveitar a distração e correr para a porta maior.", to: 6, success: { to: 6 }, failure: { to: 6 } },
                    { text: "Investigar a despensa primeiro.", to: 7, success: { to: 7 }, failure: { to: 7 } },
                ]
            },
            5: {
                text: "A sua tentativa de ser sorrateiro falha. Um dos goblins vê-o e dá o alarme, gritando em sua língua estridente. O Cozinheiro Anão, furioso por ter um intruso na sua cozinha, atira-lhe um cutelo. A sua missão termina aqui de forma inglória. \n\nFIM.",
            },
            6: {
                text: "Você sai da cozinha e entra num corredor que leva a um pátio interior. Uma ponte estreita de pedra atravessa o pátio, ligando a sua localização a uma torre imponente no centro da cidadela. A ponte é guardada por duas estranhas criaturas humanoides verdes com um único olho no meio da testa. São os GANJEES, conhecidos pelos seus poderes mentais.",
                choices: [
                    { text: "Tentar atravessar a ponte, enfrentando os Ganjees.", to: 8, success: { to: 8 }, failure: { to: 8 } },
                    { text: "Procurar outro caminho pelo pátio.", to: 9, success: { to: 9 }, failure: { to: 9 } }
                ]
            },
            7: {
                text: "Na despensa, você encontra prateleiras com ingredientes exóticos: olhos de tritão, pó de asa de morcego e... uma pequena garrafa com um líquido prateado brilhante, rotulada 'Poção da Sorte'. Você guarda a poção. Ao sair, você volta a estar no mesmo ponto da cozinha.",
                getItems: ["Poção da Sorte"],
                choices: [
                    { text: "Agora, ir para a porta maior.", to: 6, success: { to: 6 }, failure: { to: 6 } }
                ]
            },
            8: {
                text: "Assim que você pisa na ponte, os Ganjees fixam o seu olhar em si. Você sente a sua mente a ser invadida, uma força psíquica que o paralisa. Incapaz de se mover, você é uma presa fácil para os guardas que se aproximam e o capturam. A sua missão falhou. \n\nFIM.",
            },
            9: {
                text: "Ao explorar as bordas do pátio, você encontra uma pesada grade de ferro no chão. Um cheiro horrível emana dela. Parece ser a entrada para o sistema de esgotos da cidadela. Pode ser um caminho, mas certamente não será agradável.",
                choices: [
                    { text: "Levantar a grade e entrar nos esgotos.", to: 11, success: { to: 11 }, failure: { to: 11 } },
                    { text: "Voltar e tentar usar um feitiço nos Ganjees.", to: 19, success: { to: 19 }, failure: { to: 19 } }
                ]
            },
            11: {
                text: "Os esgotos são um labirinto escuro e fedorento. A água imunda bate nos seus joelhos. Após o que parecem horas, você encontra uma escada de ferro que sobe. Ao subir, você sai por uma grade no chão de uma sala escura... você está nos aposentos de Balthus Dire, mas ele não está aqui. Há uma grande cama, uma secretária e uma porta ornamentada.",
                choices: [
                    { text: "Examinar a secretária.", to: 20, success: { to: 20 }, failure: { to: 20 } },
                    { text: "Tentar abrir a porta ornamentada.", to: 21, success: { to: 21 }, failure: { to: 21 } }
                ]
            },
            12: {
                text: "No topo da torre, você encontra os aposentos de Balthus Dire. Ele está de costas para si, a observar uma bola de cristal. 'Eu estava à sua espera, pequeno aprendiz', diz ele sem se virar. Ele vira-se, e os seus olhos brilham com poder arcano.",
                choices: [
                    { text: "Lançar o feitiço Bola de Fogo.", to: 13, success: { to: 13 }, failure: { to: 13 }, type: 'spell' },
                    { text: "Atacar com a sua espada.", to: 14, success: { to: 14 }, failure: { to: 14 } },
                    { text: "Lançar o feitiço Fraqueza.", to: 22, success: { to: 22 }, failure: { to: 22 }, type: 'spell' }
                ]
            },
            13: {
                text: "Você lembra-se do aviso do seu mestre: a maior força de Balthus Dire é também a sua maior fraqueza. O feiticeiro deleita-se com a sua própria magia. A sala está cheia de espelhos e superfícies polidas. Onde você vai mirar?",
                choices: [
                    { text: "Lançar a Bola de Fogo diretamente contra ele.", to: 15, success: { to: 15 }, failure: { to: 15 } },
                    { text: "Lançar a Bola de Fogo contra um grande espelho ao lado dele.", to: 16, success: { to: 16 }, failure: { to: 16 } }
                ]
            },
            14: {
                text: "A sua espada é inútil. Com um simples gesto, Balthus Dire congela-o no lugar e ri-se enquanto a sua energia vital é drenada lentamente. \n\nFIM.",
            },
            15: {
                text: "Balthus Dire absorve a sua Bola de Fogo com um sorriso, tornando-se ainda mais poderoso. 'Obrigado pelo presente', ele gargalha, antes de o desintegrar com um raio de energia negra. \n\nFIM.",
            },
            16: {
                text: "A sua Bola de Fogo atinge o espelho. A magia refletida e amplificada volta-se contra Balthus Dire, que não estava preparado. Ele grita enquanto é consumido pela sua própria energia. Você conseguiu! A Cidadela do Caos está livre do seu tirano. \n\nVITÓRIA!",
            },
            17: {
                text: "Você entra na biblioteca. Prateleiras altas e empoeiradas vão do chão ao teto. Há uma porta do outro lado da sala e uma lareira com uma pintura estranha por cima.",
                choices: [
                    { text: "Ir direto para a porta.", to: 23, success: { to: 23 }, failure: { to: 23 } },
                    { text: "Examinar a pintura sobre a lareira.", to: 24, success: { to: 24 }, failure: { to: 24 } }
                ]
            },
            18: {
                text: "O barulho atrai a atenção. Dois guardas GOBLINS armados entram na biblioteca e atacam-no!",
                event: 'combat',
                combat: {
                    enemy: "Dois Goblins",
                    skill: 5,
                    stamina: 8,
                    success: { to: 25 },
                    failure: { to: 26 }
                }
            },
            19: {
                text: "Você decide usar a sua magia contra os Ganjees. Qual feitiço você vai usar?",
                choices: [
                    { text: "Lançar Ilusão para criar uma distração.", to: 27, success: { to: 27 }, failure: { to: 27 }, type: 'spell' },
                    { text: "Lançar Levitação para flutuar sobre eles.", to: 28, success: { to: 28 }, failure: { to: 28 }, type: 'spell' },
                    { text: "Lançar Bola de Fogo contra a ponte.", to: 29, success: { to: 29 }, failure: { to: 29 }, type: 'spell' }
                ]
            },
            20: {
                text: "A secretária está coberta de mapas e pergaminhos. Numa gaveta trancada, você encontra um diário. Você força a fechadura e lê a última entrada de Balthus Dire: 'O meu poder está quase no auge. Apenas a reflexão da minha própria magia pode me ferir. Irei ao topo da Torre de Observação para iniciar o ritual final.'",
                choices: [
                    { text: "Sair pela porta ornamentada para encontrar a Torre de Observação.", to: 21, success: { to: 21 }, failure: { to: 21 } }
                ]
            },
            21: {
                text: "A porta leva-o a um corredor que termina numa escadaria em espiral. Você sobe e chega ao topo da torre. Balthus Dire está lá.",
                autoNavigate: { to: 12 }
            },
            22: {
                text: "Você lança o feitiço Fraqueza. Balthus Dire ri. 'Um feitiço tão patético!'. Ele contra-ataca com uma força avassaladora. \n\nFIM.",
            },
            23: {
                text: "A porta está trancada. Você não consegue abri-la. Você deve encontrar outro caminho.",
                choices: [
                    { text: "Voltar e examinar a pintura.", to: 24, success: { to: 24 }, failure: { to: 24 } }
                ]
            },
            24: {
                text: "A pintura retrata um demónio a apontar para uma estante específica. Você vai até a estante e encontra um livro que se projeta ligeiramente. Ao puxá-lo, a estante inteira gira, revelando uma passagem secreta.",
                choices: [
                    { text: "Entrar na passagem secreta.", to: 30, success: { to: 30 }, failure: { to: 30 } }
                ]
            },
            25: {
                text: "Você derrota os Goblins. Ferido, mas vivo, você está sozinho na biblioteca. O alarme para de tocar. Parece que ninguém mais ouviu.",
                staminaChange: -3,
                choices: [
                    { text: "Continuar a explorar a biblioteca.", to: 17, success: { to: 17 }, failure: { to: 17 } }
                ]
            },
            26: {
                text: "Os Goblins são mais fortes do que parecem. Eles o dominam com os seus números e armas brutas. A sua jornada termina aqui. \n\nFIM.",
            },
            27: {
                text: "Você cria a ilusão de um grande dragão a sobrevoar a cidadela. Os Ganjees olham para cima, distraídos. Você aproveita a oportunidade para correr pela ponte e entrar na torre. O feitiço dissipa-se assim que você entra.",
                choices: [
                    { text: "Subir a escadaria da torre.", to: 12, success: { to: 12 }, failure: { to: 12 } }
                ]
            },
            28: {
                text: "Você começa a levitar sobre a ponte. Os Ganjees, não o conseguindo alcançar fisicamente, focam o seu poder mental. O esforço para resistir ao ataque psíquico enquanto mantém a levitação é demasiado. A sua concentração quebra-se, e você cai no pátio, para a sua morte. \n\nFIM.",
            },
            29: {
                text: "A Bola de Fogo explode na ponte de pedra, destruindo-a e fazendo com que os Ganjees caiam. O barulho da explosão, no entanto, atrai todos os guardas da cidadela. Você está cercado. \n\nFIM.",
            },
            30: {
                text: "A passagem secreta leva-o a um corredor escuro. No final, você encontra uma pequena porta de madeira. Ao abri-la, você entra... nos aposentos de Balthus Dire. Ele não está lá.",
                autoNavigate: { to: 11 }
            }
        }
    },
    navePerdida: {
        title: "A Nave Perdida",
        description: "Explore uma nave espacial abandonada à deriva no espaço profundo.",
         player_stats: {
            initial_skill: 8,
            initial_stamina: 20,
            initial_luck: 8,
        },
        inventory: ["Pistola Laser", "Kit de Ferramentas"],
        spells: [],
        nodes: {
            "start": {
                text: "A sua pequena nave de exploração acopla-se à 'Astra', uma nave colonial desaparecida há uma década. O silêncio a bordo é total. As luzes de emergência piscam intermitentemente. A sua missão é descobrir o que aconteceu. Você está no hangar de acoplagem. Há uma porta para a ponte de comando e outra para os alojamentos da tripulação.",
                choices: [
                    { text: "Ir para a ponte de comando.", to: 1, success: { to: 1 }, failure: { to: 1 } },
                    { text: "Ir para os alojamentos da tripulação.", to: 2, success: { to: 2 }, failure: { to: 2 } },
                    { text: "Verificar o seu equipamento.", to: 13, success: { to: 13 }, failure: { to: 13 } }
                ]
            },
            1: {
                text: "A ponte está escura, exceto pelos monitores quebrados que lançam uma luz fantasmagórica. No centro, o assento do capitão está virado de costas. Um terminal de computador ainda tem energia. De um duto de ventilação, você ouve um leve som metálico arrastado.",
                choices: [
                    { text: "Verificar o terminal do computador.", to: 3, success: { to: 3 }, failure: { to: 3 } },
                    { text: "Aproximar-se do assento do capitão.", to: 4, success: { to: 4 }, failure: { to: 4 } },
                    { text: "Investigar o barulho na ventilação.", to: 8, success: { to: 8 }, failure: { to: 8 } }
                ]
            },
            2: {
                text: "Os alojamentos da tripulação estão numa desordem caótica, com pertences pessoais espalhados. Parece que todos saíram à pressa. Num dos beliches, você encontra um tablet pessoal com uma entrada de diário aberta.",
                choices: [
                    { text: "Ler o diário.", to: 5, success: { to: 5 }, failure: { to: 5 } },
                    { text: "Ignorar o tablet e seguir para a enfermaria, que fica ao lado.", to: 6, success: { to: 6 }, failure: { to: 6 } },
                    { text: "Procurar nos cacifos por algo útil.", to: 14, success: { to: 14 }, failure: { to: 14 } }
                ]
            },
            3: {
                text: "O último registo da caixa-preta diz: '...criatura a bordo... sistema de suporte de vida a falhar... protocolo de quarentena iniciado...'. Antes que você possa reagir, portas de titânio fecham-se ruidosamente. Você está preso na ponte. Sem comida nem água, o seu destino está selado. FIM.",
            },
            4: {
                text: "Você aproxima-se cautelosamente e vira a cadeira do capitão. Sobre ela, há apenas um uniforme vazio e uma fina camada de pó cinzento. Um arrepio percorre a sua espinha. De repente, uma criatura insectoide, rápida e mortal, desce do teto! É o fim para si. FIM.",
            },
            5: {
                text: "O diário é da Engenheira Chefe. Descreve uma criatura parasita que se esconde nos sistemas de ventilação e ataca alvos solitários. A última entrada diz: 'Vou para a baía de carga. A única fraqueza parece ser o frio extremo... A Dra. Evans na enfermaria estava a trabalhar num repelente sónico.'",
                choices: [
                    { text: "Ir para a baía de carga.", to: 7, success: { to: 7 }, failure: { to: 7 } },
                    { text: "Ir para a enfermaria procurar o repelente.", to: 6, success: { to: 6 }, failure: { to: 6 } }
                ]
            },
            6: {
                text: "A enfermaria está coberta de uma substância alienígena pegajosa e translúcida. Num armário, você encontra um dispositivo com o rótulo 'Repelente Sónico X-01'. Ao pegá-lo, você ouve um barulho vindo da ventilação acima de si.",
                getItems: ["Repelente Sónico"],
                choices: [
                    { text: "Esperar e usar o repelente.", to: 9, success: { to: 9 }, failure: { to: 9 }, requires: { item: 'Repelente Sónico' } },
                    { text: "Sair rapidamente e ir para a baía de carga.", to: 7, success: { to: 7 }, failure: { to: 7 } }
                ]
            },
            7: {
                text: "Na baía de carga, a temperatura é visivelmente mais baixa. Você encontra a criatura a devorar os mantimentos congelados. Ela nota a sua presença, solta um guincho agudo e avança na sua direção, com as suas garras a estalar.",
                choices: [
                    { text: "Ativar o sistema de supressão de incêndios de CO2.", to: 10, success: { to: 10 }, failure: { to: 10 } },
                    { text: "Lutar com a sua Pistola Laser.", to: 11, success: { to: 11 }, failure: { to: 11 } },
                    { text: "Usar o Repelente Sónico (se o tiver).", to: 15, success: { to: 15 }, failure: { to: 15 }, requires: { item: "Repelente Sónico" } }
                ]
            },
            8: {
                text: "Você aponta a sua lanterna para o duto de ventilação. Um pequeno robô de manutenção cai de lá, com uma das suas garras avariada e a faiscar. Ele emite um som amigável, uma série de bipes, e parece querer segui-lo.",
                choices: [
                    { text: "Usar o seu Kit de Ferramentas para tentar consertar o robô.", to: 12, success: { to: 12 }, failure: { to: 12 }, requires: { item: "Kit de Ferramentas" } },
                    { text: "Ignorar o robô e continuar a explorar a ponte.", to: 1, success: { to: 1 }, failure: { to: 1 } }
                ]
            },
            9: {
                text: "A criatura salta da ventilação! Você ativa o repelente sónico. O som de alta frequência atordoa o monstro, que recua com um guincho, fugindo de volta para os dutos. Você está seguro por agora, e tem uma arma eficaz.",
                choices: [
                    { text: "Ir para a ponte, agora mais confiante.", to: 1, success: { to: 1 }, failure: { to: 1 } },
                    { text: "Caçar a criatura na baía de carga.", to: 7, success: { to: 7 }, failure: { to: 7 } }
                ]
            },
            10: {
                text: "Você corre para o controle e ativa o sistema de supressão de incêndios. Jatos de CO2 gelado enchem a sala. A criatura guincha, a sua carapaça estala e congela. Com um último espasmo, ela despedaça-se. Você sobreviveu e resolveu o mistério! FIM.",
            },
            11: {
                text: "A sua Pistola Laser parece não fazer efeito na carapaça da criatura. Ela domina-o facilmente. FIM.",
                event: "combat",
                combat: {
                    enemy: "Criatura Alienígena",
                    skill: 10,
                    stamina: 15,
                    success: { to: 16 },
                    failure: { to: 17 }
                }
            },
            12: {
                text: "Você usa o seu Kit de Ferramentas. TESTE A SUA SORTE. Se for sortudo, você conserta a garra do robô. Se for azarado, você só piora as coisas.",
                event: "test_luck",
                choices: [
                    { 
                        text: "Testar a Sorte",
                        to: 0,
                        success: { to: 18, text: "A garra volta a funcionar! O robô bipa alegremente e entrega-lhe um cartão de acesso que tinha guardado." },
                        failure: { to: 19, text: "Um curto-circuito frita os circuitos do robô. Ele cai inerte no chão." }
                    }
                ]
            },
            13: {
                text: "Você verifica o seu equipamento. Tem a sua Pistola Laser fiel, um Kit de Ferramentas multiusos e o seu fato de exploração. Está pronto para o que der e vier.",
                choices: [
                    { text: "Ir para a ponte de comando.", to: 1, success: { to: 1 }, failure: { to: 1 } },
                    { text: "Ir para os alojamentos.", to: 2, success: { to: 2 }, failure: { to: 2 } }
                ]
            },
            14: {
                text: "Você vasculha os cacifos. A maioria está vazia, mas num deles você encontra uma barra de proteína de alta energia. Pode ser útil.",
                staminaChange: 2,
                getItems: ["Barra de Proteína"],
                choices: [
                    { text: "Agora, ler o diário no beliche.", to: 5, success: { to: 5 }, failure: { to: 5 } },
                    { text: "Ir para a enfermaria.", to: 6, success: { to: 6 }, failure: { to: 6 } }
                ]
            },
            15: {
                text: "Você ativa o repelente sónico. A criatura, já enfraquecida pelo frio, fica completamente paralisada pelo som. Ela cai no chão, convulsionando. Você pode acabar com ela facilmente.",
                choices: [
                    { text: "Acabar com a criatura e garantir a segurança da nave.", to: 10, success: { to: 10 }, failure: { to: 10 } }
                ]
            },
            16: {
                text: "Apesar da sua ferocidade, a sua habilidade prevalece. O último tiro da sua pistola laser encontra uma fresta na carapaça da criatura, e ela cai sem vida. Você está ferido, mas vivo. VITÓRIA!",
            },
            17: {
                text: "A criatura é demasiado rápida e forte. As suas garras rasgam o seu fato e a sua missão termina no chão frio da baía de carga. FIM.",
            },
            18: {
                text: "O robô, agora com a sua garra funcional, entrega-lhe um cartão de acesso vermelho com o nível de segurança 'CAPITÃO'. Ele continua a segui-lo. O que faz agora?",
                getItems: ["Cartão de Acesso Vermelho"],
                choices: [
                    { text: "Voltar para o terminal do computador na ponte.", to: 20, success: { to: 20 }, failure: { to: 20 } },
                    { text: "Ir para os alojamentos.", to: 2, success: { to: 2 }, failure: { to: 2 } }
                ]
            },
            19: {
                text: "O robô está arruinado. Você perdeu tempo e uma potencial ajuda. Você continua a explorar a ponte.",
                choices: [
                    { text: "Verificar o terminal do computador.", to: 3, success: { to: 3 }, failure: { to: 3 } },
                    { text: "Aproximar-se do assento do capitão.", to: 4, success: { to: 4 }, failure: { to: 4 } }
                ]
            },
            20: {
                text: "Com o Cartão de Acesso Vermelho, você acede a um nível mais profundo do terminal. Encontra os registos do Capitão. Ele descreve a purga da nave para conter a criatura, redirecionando o suporte de vida para a baía de carga, criando uma 'zona fria'. Ele sacrificou-se para dar a qualquer futuro explorador uma chance. Você encontra os controlos para reativar o sinal de socorro da nave. Com o mistério resolvido, a sua missão é um sucesso. FIM.",
            }
        }
    },
    detetiveNoir: {
        title: "O Detetive de Nova York",
        description: "Investigue um assassinato misterioso na chuvosa Nova York dos anos 40.",
        player_stats: {
            initial_skill: 7,
            initial_stamina: 16,
            initial_luck: 10,
        },
        inventory: ["Maço de Cigarros", "Isqueiro", "Revólver .38"],
        spells: [],
        nodes: {
            "start": {
                text: "Numa noite chuvosa de 1947, o néon do seu escritório pisca sobre as poças da rua. Você é Jake Falcon, detetive particular. O telefone toca. É sobre o assassinato de um magnata, Miles Davenport. A polícia está a andar em círculos. Você pega na sua gabardina e no seu chapéu. Onde vai primeiro?",
                choices: [
                    { text: "Ir à mansão Davenport, a cena do crime.", to: 1, success: { to: 1 }, failure: { to: 1 } },
                    { text: "Ir ao 'The Blue Dahlia', o clube de jazz que Davenport frequentava.", to: 2, success: { to: 2 }, failure: { to: 2 } },
                    { text: "Passar no seu informador, 'Slim', o vendedor de jornais.", to: 12, success: { to: 12 }, failure: { to: 12 } }
                ]
            },
            1: {
                text: "A mansão está silenciosa, exceto pelo tique-taque de um relógio de pêndulo. O corpo já foi removido. Você encontra um cofre escondido atrás de um quadro, mas está trancado. Uma empregada assustada, a limpar uma nódoa de vinho tinto, menciona que a viúva, a bela Eleanor, parecia estranhamente calma.",
                choices: [
                    { text: "Interrogar a viúva, Eleanor Davenport.", to: 3, success: { to: 3 }, failure: { to: 3 } },
                    { text: "Tentar encontrar a combinação do cofre.", to: 4, success: { to: 4 }, failure: { to: 4 } },
                    { text: "Subornar a empregada por mais informações.", to: 9, success: { to: 9 }, failure: { to: 9 } }
                ]
            },
            2: {
                text: "No 'The Blue Dahlia', o fumo dos cigarros dança com as notas melancólicas de um saxofone. O barman diz-lhe que Davenport tinha uma dívida de jogo pesada com um gangster local, 'Lefty' Malone. Ele também menciona que Davenport era visto frequentemente a discutir com a cantora femme fatale do clube, Lola Monroe.",
                choices: [
                    { text: "Procurar por 'Lefty' Malone nos bastidores.", to: 5, success: { to: 5 }, failure: { to: 5 } },
                    { text: "Falar com a cantora, Lola Monroe.", to: 6, success: { to: 6 }, failure: { to: 6 } }
                ]
            },
            3: {
                text: "Eleanor Davenport, vestida de preto de seda, é fria como gelo. Ela alega que não sabe de nada e que estava numa gala de caridade na noite do crime. O álibi dela parece sólido, mas os seus olhos escondem algo.",
                choices: [
                    { text: "Pressioná-la sobre o cofre.", to: 7, success: { to: 7 }, failure: { to: 7 } },
                    { text: "Agradecer e sair para seguir outra pista.", to: 2, success: { to: 2 }, failure: { to: 2 } }
                ]
            },
            4: {
                text: "Você procura por pistas e encontra, numa pequena agenda sobre a secretária, a data de aniversário de casamento do casal marcada com um coração. Você tenta a combinação '10-05-42' e o cofre abre! Dentro, encontra cartas de amor trocadas entre Eleanor e o rival de negócios de Davenport, Sterling.",
                getItems: ["Cartas de Amor"],
                choices: [
                    { text: "Confrontar Eleanor com as cartas.", to: 8, success: { to: 8 }, failure: { to: 8 } }
                ]
            },
            5: {
                text: "'Lefty' Malone não gosta de perguntas. Ele e os seus capangas dão-lhe uma tareia e atiram-no para um beco. Você perde a noite, um dente e a pista. Você acorda com a chuva a lavar-lhe o rosto. FIM.",
                staminaChange: -5
            },
            6: {
                text: "Lola Monroe está nervosa, ajeitando a sua luva de seda. Ela admite que Davenport lhe prometeu uma carreira em Hollywood, mas nunca cumpriu. 'A última vez que o vi', diz ela, 'ele estava a discutir ao telefone sobre umas 'cartas comprometedoras'. Mencionou um encontro num beco perto do clube para resolver o assunto.'",
                choices: [
                    { text: "Perguntar onde poderiam estar essas cartas (ir à mansão).", to: 1, success: { to: 1 }, failure: { to: 1 } },
                    { text: "Investigar o beco perto do clube.", to: 10, success: { to: 10 }, failure: { to: 10 } }
                ]
            },
            7: {
                text: "Ao ser pressionada sobre o cofre sem provas, Eleanor fica indignada e chama a segurança. Eles acompanham-no educadamente até à saída. Você perdeu a sua chance com ela. FIM.",
            },
            8: {
                 text: "Confrontada com as cartas, o rosto de Eleanor desfaz-se. Ela confessa que o seu amante, Sterling, assassinou Davenport para que pudessem ficar juntos e com a fortuna. Você acende um cigarro. Caso resolvido. FIM."
            },
            9: {
                text: "Por alguns dólares, a empregada revela que viu o Sr. Davenport a esconder uma pequena chave de latão debaixo do tapete do escritório pouco antes de morrer. 'Ele parecia preocupado', ela sussurra. Você pega na chave.",
                getItems: ["Chave de Latão"],
                choices: [
                    { text: "Procurar o que a chave abre.", to: 11, success: { to: 11 }, failure: { to: 11 } },
                    { text: "Ignorar a chave e interrogar a viúva.", to: 3, success: { to: 3 }, failure: { to: 3 } }
                ]
            },
            10: {
                text: "No beco escuro e húmido, você encontra uma carteira de fósforos do 'The Blue Dahlia' com um número de telefone anotado. Antes que possa pensar no que significa, uma figura ataca-o das sombras. TESTE A SUA SORTE.",
                event: 'test_luck',
                choices: [
                    {
                        text: 'Tentar a sua Sorte!',
                        to: 0,
                        success: { to: 15, text: 'Você desvia-se no último segundo. O seu atacante era um dos capangas de Lefty Malone! Ele está surpreendido.' },
                        failure: { to: 16, text: 'Um golpe na cabeça, e tudo fica preto. Você acorda sem a sua carteira e sem pistas. FIM.' }
                    }
                ]
            },
            11: {
                text: "A chave abre uma pequena gaveta na secretária de Davenport. Dentro, está uma apólice de seguro de vida em nome de Eleanor, mas com um beneficiário secreto: o seu rival de negócios, Sterling. É o motivo de que precisava.",
                getItems: ["Apólice de Seguro"],
                choices: [
                    { text: "Levar as provas à polícia.", to: 8, success: { to: 8 }, failure: { to: 8 }, requires: { item: "Apólice de Seguro" } }
                ]
            },
            12: {
                text: "'Slim' diz-lhe que Davenport andava a vender informações da sua própria empresa ao seu rival, Sterling. 'Coisa suja', diz Slim, 'Davenport estava a ser chantageado. Ouvi dizer que as provas estão num cofre na mansão.'",
                choices: [
                    { text: "Ir à mansão investigar o cofre.", to: 1, success: { to: 1 }, failure: { to: 1 } },
                    { text: "Ir ao clube de jazz, talvez alguém lá saiba mais.", to: 2, success: { to: 2 }, failure: { to: 2 } }
                ]
            },
            15: {
                text: "Você desvia-se e contra-ataca. O capanga não esperava uma luta. Você pode tentar subjugá-lo para obter informações ou fugir.",
                event: 'combat',
                combat: {
                    enemy: "Capanga de Lefty",
                    skill: 6,
                    stamina: 8,
                    success: { to: 17 },
                    failure: { to: 5 }
                }
            },
            16: {
                text: "O golpe atinge-o em cheio. Você acorda horas depois, encharcado e sem a sua carteira. A pista esfriou. FIM.",
                staminaChange: -4,
            },
            17: {
                text: "Após uma breve luta, você subjuga o capanga. Ele confessa que Lefty Malone mandou-o recuperar 'provas' que Davenport tinha contra ele, que estavam guardadas num cofre na sua mansão. O assassinato foi um acidente, uma luta que correu mal.",
                choices: [
                    { text: "Levar a confissão à polícia. Caso resolvido.", to: 18, success: { to: 18 }, failure: { to: 18 } }
                ]
            },
            18: {
                text: "Com a confissão do capanga, a polícia prende Lefty Malone. Não era um crime passional, mas um caso de chantagem que correu terrivelmente mal. Você acende um cigarro e observa a chuva a cair. Mais um caso encerrado. FIM.",
            }
        }
    }
};

    