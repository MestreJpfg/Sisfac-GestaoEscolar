
export interface Choice {
    text: string;
    to: number | string;
}

export interface StoryNode {
    text: string;
    choices?: Choice[];
}

export interface Gamebook {
    title: string;
    description: string;
    nodes: Record<string | number, StoryNode>;
}

export const gamebooks: Record<string, Gamebook> = {
    cidadelaDoCaos: {
        title: "A Cidadela do Caos",
        description: "Aventure-se na perigosa cidadela para derrotar o feiticeiro Balthus Dire.",
        nodes: {
            "start": {
                text: "Você é um aprendiz de feiticeiro, enviado pelo Grande Mago de Yore. A sua missão: infiltrar-se na Cidadela do Caos e assassinar o terrível feiticeiro Balthus Dire antes que ele possa lançar o seu exército sobre o vale. A cidadela ergue-se sinistra à sua frente.\n\nComo seu mestre o instruiu, a melhor forma de entrar não é pelos portões. Você encontra uma saliência rochosa que o leva ao telhado.",
                choices: [
                    { text: "Subir ao telhado e procurar uma entrada.", to: 1 }
                ]
            },
            1: {
                text: "No telhado, você encontra duas possíveis entradas: a chaminé da cozinha, de onde sai uma fumaça com cheiro de comida, e uma claraboia de vidro escuro que parece levar a um aposento mais silencioso.",
                choices: [
                    { text: "Descer pela chaminé da cozinha.", to: 2 },
                    { text: "Tentar abrir a claraboia de vidro.", to: 3 }
                ]
            },
            2: {
                text: "Você desce pela chaminé e aterrissa, coberto de fuligem, numa enorme lareira. A cozinha está movimentada. Um cozinheiro anão e vários goblins correm de um lado para o outro. Ninguém parece tê-lo notado ainda.",
                choices: [
                    { text: "Esconder-se nas sombras e esperar por uma oportunidade.", to: 4 },
                    { text: "Tentar sair sorrateiramente pela porta dos fundos da cozinha.", to: 5 }
                ]
            },
            3: {
                text: "A claraboia está trancada. Ao tentar forçá-la, o vidro estala e parte-se com um barulho enorme. Alarmados, guardas Goblins sobem ao telhado e cercam-no. A sua missão termina antes de começar. FIM.",
            },
            4: {
                text: "Das sombras, você observa o caos da cozinha. O cozinheiro anão grita com os goblins, que se atrapalham com as panelas. Você vê uma porta que parece levar para uma despensa e outra, maior, que provavelmente leva ao interior da cidadela.",
                choices: [
                    { text: "Aproveitar a distração e correr para a porta maior.", to: 6 },
                    { text: "Investigar a despensa primeiro.", to: 7 }
                ]
            },
            5: {
                text: "A sua tentativa de ser sorrateiro falha. Um dos goblins vê-o e dá o alarme. O cozinheiro anão, furioso, atira-lhe um caldeirão de sopa a ferver. FIM.",
            },
            6: {
                text: "Você sai da cozinha e entra num corredor que leva a um pátio interior. Uma ponte estreita atravessa o pátio, ligando a sua localização a uma torre imponente. A ponte é guardada por duas estranhas criaturas verdes com um único olho, os Ganjees.",
                choices: [
                    { text: "Tentar atravessar a ponte, enfrentando os Ganjees.", to: 8 },
                    { text: "Procurar outro caminho pelo pátio.", to: 9 }
                ]
            },
            7: {
                text: "Na despensa, você encontra prateleiras com ingredientes exóticos. Entre eles, uma pequena garrafa com um líquido brilhante rotulada 'Poção da Invisibilidade'. Você pega-a.",
                choices: [
                    { text: "Beber a poção agora e seguir pela porta maior.", to: 10 }
                ]
            },
            8: {
                text: "Os Ganjees fixam o seu olhar em si. Você sente a sua mente a ser invadida, uma força psíquica que o paralisa. Incapaz de se mover, você é uma presa fácil para os guardas que se aproximam. FIM.",
            },
            9: {
                text: "Ao explorar o pátio, você encontra uma entrada para o sistema de esgotos. O cheiro é horrível, mas parece ser um caminho não vigiado.",
                choices: [
                    { text: "Entrar nos esgotos.", to: 11 }
                ]
            },
            10: {
                text: "Você bebe a poção e fica invisível. Você passa pela cozinha e atravessa a ponte, passando diretamente pelos Ganjees sem que eles o notem. Você chega à porta da torre e entra. A invisibilidade dissipa-se.",
                choices: [
                    { text: "Subir a escadaria da torre.", to: 12 }
                ]
            },
            11: {
                text: "Os esgotos são um labirinto escuro. Após o que parecem horas, você encontra uma escada que sobe. Ao subir, você sai por uma grade no chão... diretamente para o aposento de Balthus Dire.",
                choices: [
                    { text: "Enfrentar o feiticeiro de imediato.", to: 13 }
                ]
            },
            12: {
                text: "No topo da torre, você encontra os aposentos de Balthus Dire. Ele está de costas para si, a observar uma bola de cristal. 'Eu estava à sua espera, pequeno aprendiz', diz ele sem se virar. Ele vira-se, e os seus olhos brilham com poder arcano.",
                choices: [
                    { text: "Lançar um feitiço de ataque que o seu mestre lhe ensinou.", to: 13 },
                    { text: "Atacar com a sua adaga.", to: 14 }
                ]
            },
            13: {
                text: "Você prepara-se para atacar, mas lembra-se do aviso do seu mestre: a maior força de Balthus Dire é também a sua maior fraqueza. O feiticeiro deleita-se com a sua própria magia. A sala está cheia de espelhos e superfícies polidas.",
                choices: [
                    { text: "Lançar um feitiço diretamente contra ele.", to: 15 },
                    { text: "Lançar o feitiço contra um grande espelho ao lado dele.", to: 16 }
                ]
            },
            14: {
                text: "A sua adaga é inútil. Com um simples gesto, Balthus Dire congela-o no lugar e ri-se enquanto a sua energia vital é drenada. FIM.",
            },
            15: {
                text: "Balthus Dire absorve o seu feitiço com um sorriso, tornando-se ainda mais poderoso. 'Obrigado pelo presente', ele gargalha, antes de o desintegrar com um raio de energia negra. FIM.",
            },
            16: {
                text: "O feitiço atinge o espelho. O reflexo da magia amplificada volta-se contra Balthus Dire, que não estava preparado. Ele grita enquanto é consumido pela sua própria energia. Você conseguiu! A Cidadela do Caos está livre. VITÓRIA!",
            }
        }
    },
    navePerdida: {
        title: "A Nave Perdida",
        description: "Explore uma nave espacial abandonada à deriva no espaço profundo.",
        nodes: {
            "start": {
                text: "A sua pequena nave de exploração acopla-se à 'Astra', uma nave colonial desaparecida há uma década. O silêncio a bordo é total. As luzes de emergência piscam intermitentemente. A sua missão é descobrir o que aconteceu. Você está no hangar de acoplagem. Há uma porta para a ponte de comando e outra para os alojamentos da tripulação.",
                choices: [
                    { text: "Ir para a ponte de comando.", to: 1 },
                    { text: "Ir para os alojamentos.", to: 2 }
                ]
            },
            1: {
                text: "A ponte está escura, exceto pelos monitores quebrados. No centro, o assento do capitão está virado de costas. Um terminal de computador ainda tem energia. De um duto de ventilação, você ouve um leve som metálico.",
                choices: [
                    { text: "Verificar o terminal do computador.", to: 3 },
                    { text: "Aproximar-se do assento do capitão.", to: 4 },
                    { text: "Investigar o barulho na ventilação.", to: 8 }
                ]
            },
            2: {
                text: "Os alojamentos estão em desordem. Parece que a tripulação saiu à pressa. Num dos beliches, você encontra um tablet com uma entrada de diário aberta.",
                choices: [
                    { text: "Ler o diário.", to: 5 },
                    { text: "Ignorar e seguir para a enfermaria, que fica ao lado.", to: 6 }
                ]
            },
            3: {
                text: "O último registo da caixa-preta diz: '...criatura a bordo... sistema de suporte de vida a falhar... quarentena...'. O sistema de quarentena da nave foi ativado, trancando todas as portas. Você está preso na ponte. FIM.",
            },
            4: {
                text: "Você vira a cadeira do capitão e encontra apenas um uniforme vazio e um monte de pó. Um arrepio percorre a sua espinha. De repente, uma criatura insectoide desce do teto! FIM.",
            },
            5: {
                text: "O diário descreve uma criatura parasita que se esconde nos sistemas de ventilação e ataca alvos solitários. A última entrada diz: 'Vou para a baía de carga. A única fraqueza parece ser o frio extremo... A Dra. Evans na enfermaria estava a trabalhar num repelente.'",
                choices: [
                    { text: "Ir para a baía de carga.", to: 7 },
                    { text: "Ir para a enfermaria procurar o repelente.", to: 6 }
                ]
            },
            6: {
                text: "A enfermaria está coberta de uma substância alienígena pegajosa. Num armário, você encontra um spray com o rótulo 'Repelente X-01'. Ao pegá-lo, você ouve um barulho vindo da ventilação acima de si.",
                choices: [
                    { text: "Esperar e usar o spray.", to: 9 },
                    { text: "Sair rapidamente e ir para a baía de carga.", to: 7 }
                ]
            },
            7: {
                text: "Na baía de carga, você encontra a criatura a devorar os mantimentos. Ela nota a sua presença e avança.",
                choices: [
                    { text: "Abrir o portal externo para o vácuo.", to: 10 },
                    { text: "Lutar com as suas ferramentas.", to: 11 }
                ]
            },
            8: {
                text: "Você aponta a sua lanterna para o duto de ventilação. Um pequeno robô de manutenção cai de lá, com uma das suas garras avariada. Ele emite um som amigável e parece querer segui-lo.",
                choices: [
                    { text: "Deixar o robô segui-lo.", to: 12 },
                    { text: "Chutar o robô para longe e continuar sozinho.", to: 1 }
                ]
            },
            9: {
                text: "A criatura salta da ventilação! Você usa o spray, e o monstro recua com um guincho, fugindo de volta para os dutos. Você está seguro por agora, e tem uma arma.",
                choices: [
                    { text: "Ir para a ponte, agora mais confiante.", to: 1 },
                    { text: "Caçar a criatura na baía de carga.", to: 7 }
                ]
            },
            10: {
                text: "Você corre para o controle e abre o portal. O vácuo suga tudo para fora, incluindo a criatura, que congela e se estilhaça. Você consegue segurar-se e fechar a porta. Você sobreviveu e resolveu o mistério! FIM."
            },
            11: {
                text: "As suas ferramentas são inúteis contra a carapaça da criatura. Ela domina-o facilmente. FIM."
            },
            12: {
                text: "Você vai para a ponte, com o robô a segui-lo. Ao se aproximar do assento do capitão, a criatura desce do teto! Antes que ela o ataque, o pequeno robô emite uma descarga elétrica na criatura, atordoando-a por um momento.",
                choices: [
                    { text: "Aproveitar a chance para correr e verificar o terminal.", to: 3 },
                    { text: "Fugir da ponte e ir para a baía de carga.", to: 7 }
                ]
            }
        }
    },
    detetiveNoir: {
        title: "O Detetive de Nova York",
        description: "Investigue um assassinato misterioso na chuvosa Nova York dos anos 40.",
        nodes: {
            "start": {
                text: "Numa noite chuvosa de 1947, você está no seu escritório poeirento quando o telefone toca. É sobre o assassinato de um milionário, Miles Davenport. A polícia está sem pistas. Você pega na sua gabardina e no seu chapéu. Onde vai primeiro?",
                choices: [
                    { text: "Ir à mansão da vítima, a cena do crime.", to: 1 },
                    { text: "Ir ao 'Blue Note', o clube de jazz que Davenport frequentava.", to: 2 }
                ]
            },
            1: {
                text: "A mansão está silenciosa, exceto pelo tique-taque de um relógio. O corpo já foi removido. Você encontra um cofre escondido atrás de um quadro, mas está trancado. Uma empregada assustada menciona que a viúva, Eleanor, parecia estranhamente calma.",
                choices: [
                    { text: "Interrogar a viúva, Eleanor.", to: 3 },
                    { text: "Tentar encontrar a combinação do cofre.", to: 4 },
                    { text: "Subornar a empregada por mais informações.", to: 9 }
                ]
            },
            2: {
                text: "No 'Blue Note', o fumo dos cigarros paira no ar. O barman diz-lhe que Davenport tinha uma dívida de jogo com um gangster local, 'Lefty' Malone. Ele também menciona que Davenport era visto frequentemente a discutir com uma cantora de femme fatale, Lola.",
                choices: [
                    { text: "Procurar por 'Lefty' Malone nos bastidores.", to: 5 },
                    { text: "Falar com a cantora, Lola.", to: 6 }
                ]
            },
            3: {
                text: "Eleanor Davenport é fria como gelo. Ela alega que não sabe de nada e que estava no teatro na noite do crime. O álibi dela parece sólido, mas os seus olhos escondem algo.",
                choices: [
                    { text: "Pressioná-la sobre o cofre.", to: 7 },
                    { text: "Agradecer e sair para seguir outra pista.", to: 2 }
                ]
            },
            4: {
                text: "Você procura por pistas e encontra a data de aniversário de casamento do casal marcada num calendário. Você tenta a combinação e o cofre abre! Dentro, encontra cartas de amor trocadas entre Eleanor e o rival de negócios de Davenport.",
                choices: [
                    { text: "Confrontar Eleanor com as cartas.", to: 8 }
                ]
            },
            5: {
                text: "'Lefty' Malone não gosta de perguntas. Ele e os seus capangas dão-lhe uma tareia e atiram-no para um beco. Você perde a noite e a pista. FIM.",
            },
            6: {
                text: "Lola está nervosa. Ela admite que Davenport lhe prometeu uma vida melhor, mas nunca cumpriu. Ela diz que a última vez que o viu, ele estava a discutir ao telefone sobre 'cartas comprometedoras'. Ela menciona um encontro que ele teria num beco perto do clube.",
                choices: [
                    { text: "Perguntar onde poderiam estar essas cartas (ir à mansão).", to: 1 },
                    { text: "Investigar o beco perto do clube.", to: 10 }
                ]
            },
            7: {
                text: "Ao ser pressionada, Eleanor entra em pânico e confessa que o seu amante matou Davenport para ficarem com o dinheiro. O caso está resolvido, mas a chuva lá fora parece mais fria do que nunca. FIM.",
            },
            8: {
                 text: "Confrontada com as provas, Eleanor confessa tudo. O seu amante, o rival de negócios, cometeu o crime para que pudessem ficar juntos e com a fortuna. Você resolveu o caso. FIM."
            },
            9: {
                text: "Por alguns dólares, a empregada revela que viu o Sr. Davenport a esconder uma pequena chave de latão debaixo do tapete do escritório pouco antes de morrer. Você pega na chave.",
                choices: [
                    { text: "Procurar o que a chave abre.", to: 11 },
                    { text: "Ignorar a chave e interrogar a viúva.", to: 3 }
                ]
            },
            10: {
                text: "No beco escuro, você encontra uma carteira de fósforos do 'Blue Note' com um número de telefone anotado. Antes que possa pensar, uma figura ataca-o das sombras. Você apaga. FIM.",
            },
            11: {
                text: "A chave abre uma pequena gaveta na secretária de Davenport. Dentro, está uma apólice de seguro de vida em nome de Eleanor, mas com um beneficiário secreto: o seu amante. Você tem a prova de que precisava.",
                choices: [
                    { text: "Levar as provas à polícia.", to: 8 }
                ]
            }
        }
    }
};

    