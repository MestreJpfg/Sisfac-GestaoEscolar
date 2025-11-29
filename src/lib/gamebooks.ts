
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
        description: "Aventure-se numa perigosa cidadela para derrotar um feiticeiro maligno.",
        nodes: {
            "start": {
                text: "Você está diante dos portões imponentes da Cidadela do Caos, envolta por uma névoa sinistra. O seu objetivo: encontrar e derrotar o feiticeiro Balthazar. O portão principal está à sua frente, e um caminho estreito e escuro segue pela muralha à sua direita.",
                choices: [
                    { text: "Tentar forçar o portão principal.", to: 1 },
                    { text: "Seguir pelo caminho estreito à direita.", to: 2 }
                ]
            },
            1: {
                text: "Você tenta forçar o pesado portão de ferro, mas ele não se move. O barulho atrai dois guardas orcs armados com machados que correm na sua direção!",
                choices: [
                    { text: "Lutar contra os orcs.", to: 3 },
                    { text: "Tentar fugir pelo caminho estreito.", to: 2 }
                ]
            },
            2: {
                text: "O caminho estreito leva-o a uma pequena porta de madeira nos fundos da cidadela. Parece não estar trancada.",
                choices: [
                    { text: "Abrir a porta cuidadosamente e entrar.", to: 4 },
                    { text: "Procurar por outra entrada, talvez uma passagem subterrânea.", to: 11 }
                ]
            },
            3: {
                text: "Você luta bravamente, mas os dois orcs são demasiado fortes. A sua aventura termina aqui. FIM.",
            },
            4: {
                text: "Você entra na cozinha da cidadela. O lugar está vazio, mas uma grande panela borbulha sobre o fogo. Um cheiro delicioso enche o ar. Há uma porta à sua frente e uma escada que desce para uma adega.",
                choices: [
                    { text: "Provar o ensopado na panela.", to: 5 },
                    { text: "Ignorar a comida e seguir pela porta.", to: 6 },
                    { text: "Descer para a adega.", to: 7 }
                ]
            },
            5: {
                text: "O ensopado é revigorante! Você recupera as suas forças. No entanto, o barulho de passos aproxima-se. Você esconde-se a tempo de ver o cozinheiro ogre entrar na cozinha. Ele não o vê.",
                choices: [
                    { text: "Atacar o ogre de surpresa.", to: 8 },
                    { text: "Esperar que ele saia e seguir pela porta.", to: 6 }
                ]
            },
            6: {
                text: "Você entra num grande salão de banquetes. No trono, ao fundo, está sentado o feiticeiro Balthazar, que se levanta ao vê-lo. 'Tolo! Vieste morrer!', ele grita, enquanto bolas de fogo se formam nas suas mãos.",
                choices: [
                    { text: "Correr em direção a ele com a sua espada.", to: 9 },
                    { text: "Procurar abrigo atrás de uma das mesas.", to: 10 }
                ]
            },
            7: {
                text: "Você desce à adega escura e húmida. Entre os barris de vinho, encontra uma espada antiga e brilhante. Parece mágica! Com a nova arma em mãos, você sente-se mais confiante.",
                choices: [
                    { text: "Voltar para a cozinha e seguir para o salão.", to: 6 }
                ]
            },
            8: {
                text: "O ataque surpresa não é suficiente. O ogre vira-se furiosamente e, com um único golpe do seu rolo de massa gigante, esmaga-o. FIM."
            },
            9: {
                text: "Você é rápido, mas o feiticeiro é mais. Uma bola de fogo atinge-o em cheio antes que consiga alcançá-lo. FIM."
            },
            10: {
                text: "Você desvia-se das bolas de fogo, usando uma mesa como escudo. Balthazar ri, mas a sua distração permite que você o flanqueie e o ataque. Após uma batalha feroz, você derrota o feiticeiro. Vitória! FIM."
            },
            11: {
                text: "Procurando ao longo da muralha, você encontra uma grade de esgoto solta. O cheiro é horrível, mas parece uma entrada segura. Você entra.",
                choices: [
                    { text: "Seguir pelo túnel escuro.", to: 12 }
                ]
            },
            12: {
                text: "O túnel leva ao calabouço da cidadela. As celas estão vazias, exceto por uma que contém um velho prisioneiro. Ele parece fraco, mas os seus olhos são lúcidos.",
                choices: [
                    { text: "Falar com o prisioneiro.", to: 13 },
                    { text: "Ignorá-lo e procurar uma saída.", to: 14 }
                ]
            },
            13: {
                text: "O velho agradece por ter companhia. 'Balthazar teme apenas uma coisa', ele sussurra, 'o reflexo da sua própria magia. Use isso contra ele.' Ele aponta para um escudo espelhado pendurado na parede da sala dos guardas.",
                choices: [
                    { text: "Agradecer e pegar no escudo.", to: 15 },
                    { text: "Achar que é um disparate e sair.", to: 14 }
                ]
            },
            14: {
                text: "Você encontra uma escada de pedra que sobe. Ao chegar ao topo, você sai diretamente para o grande salão de banquetes, bem em frente a Balthazar.",
                choices: [
                    { text: "Enfrentar o feiticeiro.", to: 6 }
                ]
            },
            15: {
                text: "Com o escudo espelhado em mãos, você sobe as escadas e entra no salão. Balthazar lança uma bola de fogo, mas você ergue o escudo. A magia ricocheteia e atinge o feiticeiro, que grita de dor e se desintegra. Você venceu! FIM."
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
                text: "A ponte está escura, exceto pelos monitores quebrados. No centro, o assento do capitão está virado de costas. Um terminal de computador ainda tem energia.",
                choices: [
                    { text: "Verificar o terminal do computador.", to: 3 },
                    { text: "Verificar o assento do capitão.", to: 4 },
                    { text: "Procurar por um interruptor de luz principal.", to: 8 }
                ]
            },
            2: {
                text: "Os alojamentos estão em desordem. Parece que a tripulação saiu à pressa. Num dos beliches, você encontra um tablet com uma entrada de diário aberta.",
                choices: [
                    { text: "Ler o diário.", to: 5 },
                    { text: "Ignorar e seguir para a enfermaria.", to: 6 }
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
                text: "A enfermaria está coberta de uma substância alienígena pegajosa. Num armário, você encontra um spray com o rótulo 'Repelente X-01'. Ao pegá-lo, você ouve um barulho vindo da ventilação.",
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
                text: "Você encontra o painel de energia e restaura a iluminação principal. As luzes revelam uma enorme criatura adormecida num canto da ponte. Você acorda-a sem querer. FIM."
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
