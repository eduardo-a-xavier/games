window.EN = window.EN || {};

/*
 * Conteúdo narrativo: quem fala o quê, em que ordem, e como as missões se
 * encadeiam. Cobre os Atos 0 a 2 do GDD (Seção 4) — da chegada ao sítio
 * até o Carcará de Ferro e o gancho do Ato 3.
 *
 * Este arquivo é só TEXTO E REGRA DE HISTÓRIA. Ele nunca desenha nada,
 * nunca mexe em combate e nunca toca no DOM: pede diálogo pra
 * EN.Dialogue, marca progresso em EN.Quests e avisa o jogo por callbacks.
 * Escrever um ato novo aqui não deveria exigir tocar em nenhum outro
 * arquivo.
 *
 * Fala dos NPCs é sempre função do estado atual das missões — o mesmo
 * NPC responde diferente antes e depois de cada marco, que é o mínimo pra
 * a vila não parecer um cenário congelado.
 */
EN.Story = (function () {
  var api = {};

  var NPCS = {
    ze: { name: "Zé", icon: "🧑‍🌾" },
    osvaldo: { name: "Seu Osvaldo", icon: "⛏️" },
    micaela: { name: "Dona Micaela", icon: "🕯️" },
    batista: { name: "Batista", icon: "🪓" },
    flavio: { name: "Flávio", icon: "🎣" },
    iara: { name: "Iara das Águas", icon: "🌊" },
    narrador: { name: "", icon: "✦" },
  };

  function line(who, text) {
    var n = NPCS[who] || NPCS.narrador;
    return { who: n.name, icon: n.icon, text: text };
  }

  // ---------------------------------------------------------------
  // Missões — Atos 0 a 2
  // ---------------------------------------------------------------
  function defineQuests() {
    EN.Quests.define([
      {
        id: "chegada",
        title: "Chegada ao Sítio",
        objectives: [
          { type: "talk", npc: "ze", text: "Falar com o Zé, seu vizinho" },
          { type: "kill", defId: "rato_mato_corrompido", count: 2, text: "Limpar o quintal (2 ratos)" },
        ],
        next: "rumores",
      },
      {
        id: "rumores",
        title: "Rumores da Mina",
        objectives: [
          { type: "talk", npc: "osvaldo", text: "Procurar Seu Osvaldo" },
          { type: "flag", flag: "raiz_tocada", text: "Investigar a luz estranha perto do sítio" },
        ],
        next: "despertar",
      },
      {
        id: "despertar",
        title: "O Despertar",
        objectives: [{ type: "flag", flag: "classe_escolhida", text: "Aceitar o que você viu — escolher seu caminho" }],
        next: "investigacao",
      },
      {
        id: "investigacao",
        title: "Investigação das Raízes",
        objectives: [
          { type: "talk", npc: "micaela", text: "Contar a Dona Micaela sobre a visão" },
          { type: "kill", count: 4, text: "Conter as criaturas corrompidas (4)" },
          { type: "reach", area: "mina", text: "Entrar na Mina Santa Luzia" },
        ],
        next: "camara",
      },
      {
        id: "camara",
        title: "A Câmara Funda",
        objectives: [{ type: "reach", area: "camara", text: "Atravessar os túneis até a Câmara Funda" }],
        next: "carcara",
      },
      {
        id: "carcara",
        title: "O Carcará de Ferro",
        objectives: [{ type: "flag", flag: "boss_morto", text: "Enfrentar o guardião corrompido" }],
        next: "fragmento",
      },
      {
        id: "fragmento",
        title: "O Fragmento",
        objectives: [{ type: "talk", npc: "micaela", text: "Levar o Fragmento a Dona Micaela" }],
        next: "trilha",
        onComplete: function () {
          playAto2Close();
        },
      },

      // ------------------------- ATO 3 -------------------------
      // O Ato 2 fecha com "tem outro Veio". O Ato 3 é ir até ele. A
      // estrutura repete de propósito a do Ato 2 (rumor → caminho →
      // guardião), mas com a lição invertida: o Carcará precisava ser
      // vencido, o Boitatá precisa ser APAGADO. Mesma gramática, outra
      // resposta — é o que faz o segundo ato não parecer o primeiro.
      {
        id: "trilha",
        title: "A Trilha Encoberta",
        objectives: [
          { type: "talk", npc: "flavio", text: "Perguntar ao Flávio sobre o caminho do sul" },
          { type: "kill", defId: "onca_de_bruma", count: 1, text: "Abrir a trilha do sudoeste (Onça de Bruma)" },
        ],
        next: "lanternas",
      },
      {
        id: "lanternas",
        title: "As Lanternas do Brejo",
        objectives: [
          { type: "talk", npc: "micaela", text: "Contar a Dona Micaela sobre a fumaça no sul" },
          { type: "reach", area: "brejo", text: "Entrar no Brejo das Lanternas" },
        ],
        next: "aguas",
      },
      {
        id: "aguas",
        title: "A Voz nas Águas",
        objectives: [
          { type: "talk", npc: "iara", text: "Ouvir a Iara das Águas na beira do poço" },
          { type: "reach", area: "poco", text: "Descer até o Poço Fundo" },
        ],
        next: "boitata",
      },
      {
        id: "boitata",
        title: "O Fogo que Não Apaga",
        objectives: [{ type: "flag", flag: "boitata_apaziguado", text: "Apagar o fogo do Boitatá" }],
        next: "nome",
      },
      {
        id: "nome",
        title: "O Nome do Lugar",
        objectives: [{ type: "talk", npc: "micaela", text: "Levar a segunda lasca a Dona Micaela" }],
        onComplete: function () {
          playAto3Close();
        },
      },
    ]);
  }

  // ---------------------------------------------------------------
  // Diálogos por NPC, sempre em função do estado das missões
  // ---------------------------------------------------------------
  var TALKS = {
    ze: function () {
      if (EN.Quests.isActive("chegada")) {
        return [
          line("ze", "Ô de casa! Você é o novo do sítio velho, né? Zé, seu vizinho de cerca."),
          line("ze", "Olha, vou ser sincero: essa terra é boa. Mas anda esquisita faz umas semanas."),
          line("ze", "Apareceu rato aqui no quintal que não é rato normal, não. Tem uma casca preta no pelo, os olhos meio... alaranjados."),
          line("ze", "Se der de cara com um, não deixa ele chegar perto. Bate e sai de lado — eles vêm reto que nem bala."),
        ];
      }
      if (EN.Quests.isActive("rumores")) {
        return [
          line("ze", "Limpou o quintal? Rapaz, você é mais valente que eu."),
          line("ze", "Se quer saber de onde vem essa praga, fala com o Seu Osvaldo. Ele vive na mina, sabe daquele morro todo."),
          line("ze", "Ele é ranzinza, mas é homem bom. Só não fala mal de café perto dele."),
        ];
      }
      if (EN.Quests.isDone("carcara")) {
        return [
          line("ze", "Sabe que hoje de manhã os passarinho voltaram a cantar aqui atrás?"),
          line("ze", "Não sei o que você fez lá naquela mina. Mas obrigado, viu."),
        ];
      }
      return [line("ze", "Tá pegando firme, hein. Qualquer coisa é só chamar.")];
    },

    osvaldo: function () {
      if (EN.Quests.isActive("rumores")) {
        return [
          line("osvaldo", "Hmpf. Forasteiro. Já ouvi falar de você."),
          line("osvaldo", "Quer saber dos bicho estranho? Eu trabalho na Santa Luzia faz quarenta anos. Conheço aquele buraco melhor que a minha casa."),
          line("osvaldo", "Tem umas raiz preta crescendo lá no fundo. Não é raiz de árvore nenhuma. É fria. E pulsa, moço. Pulsa que nem coração."),
          line("osvaldo", "Os bicho que bebe água de perto delas fica assim, doido. Foi o que aconteceu com o teu quintal."),
          line("osvaldo", "Tem uma dessas raiz brotando aqui perto do teu sítio também. Aquela luz esquisita à noite? É ela."),
          line("osvaldo", "Vai lá ver com teus próprios olho. Mas te previno: não encosta. Não encosta mesmo."),
        ];
      }
      if (EN.Quests.isActive("despertar")) {
        return [line("osvaldo", "Eu falei pra não encostar. Falei ou não falei?"), line("osvaldo", "...e aí? O que foi que você viu?")];
      }
      if (EN.Quests.isActive("investigacao") || EN.Quests.isActive("camara")) {
        return [
          line("osvaldo", "Então é isso que tu é agora. Sei."),
          line("osvaldo", "A boca da mina fica subindo a trilha de pedra, ali no norte. Deixei destrancado pra ti."),
          line("osvaldo", "Meu irmão entrou lá faz dezoito ano. Não saiu."),
          line("osvaldo", "Se tu achar alguma coisa dele lá dentro... me traz. Só isso que eu peço."),
        ];
      }
      if (EN.Quests.isDone("carcara")) {
        return [
          line("osvaldo", "Ouvi o grito daquele bicho lá de cima. A serra inteira ouviu."),
          line("osvaldo", "Depois teve um silêncio. Um silêncio bom, sabe? Desses que faz tempo não tinha."),
          line("osvaldo", "Obrigado, moço. De verdade."),
        ];
      }
      return [line("osvaldo", "Tô ocupado. Fala com a Micaela, ela gosta de conversa.")];
    },

    micaela: function () {
      if (EN.Quests.isActive("investigacao")) {
        return [
          line("micaela", "Senta, menino. Você tá com cara de quem viu o outro lado."),
          line("micaela", "Não precisa contar. Tá escrito em você."),
          line("micaela", "Escuta o que essa velha tem pra dizer: o que você chama de mundo é só o lado de cá. Tem o lado de lá — o Encantado."),
          line("micaela", "Não é céu nem inferno. É mato. E mato não é bom nem ruim, é mato: protege quem respeita e engole quem não respeita."),
          line("micaela", "Tem lugar onde os dois lados se encostam. A gente chama de Veio. A Santa Luzia é um deles."),
          line("micaela", "Alguma coisa envenenou aquele Veio. As raiz preta é o veneno subindo."),
          line("micaela", "E ó: o bicho que tiver lá no fundo, guardando aquilo... ele não é o culpado. Ele é a primeira vítima."),
          line("micaela", "Lembra disso na hora. Faz diferença."),
        ];
      }
      if (EN.Quests.isActive("fragmento")) {
        return [
          line("micaela", "Me deixa ver isso."),
          line("micaela", "..."),
          line("micaela", "Essas marca aqui. Eu já vi. Uma vez só, quando eu tinha catorze ano."),
          line("micaela", "Meu pai me pôs debaixo da mesa e mandou não olhar. Eu olhei."),
        ];
      }
      if (EN.Quests.isActive("trilha")) {
        return [
          line("micaela", "Tá com pressa de novo, menino. Isso não é defeito, mas cansa."),
          line("micaela", "Se quer chegar no sul, não adianta querer passar por cima da mata. Pergunta pro Flávio — ele pesca lá embaixo desde criança."),
        ];
      }
      if (EN.Quests.isActive("lanternas")) {
        return [
          line("micaela", "Fumaça no sul, você disse. De que cor?"),
          line("narrador", "Você conta. Ela fecha os olhos antes de você terminar."),
          line("micaela", "Branca no meio e alaranjada na beira. É ele."),
          line("micaela", "Boitatá. Cobra de fogo. A história que contam é que ele come os olho de quem toca fogo no mato à toa."),
          line("micaela", "Só que a história tá contada errada, menino. Ele nunca foi castigo. Ele era o AVISO — o fogo que aparece pra você ver que tem coisa errada e correr."),
          line("micaela", "Se agora ele tá queimando o brejo inteiro, é porque não tem mais ninguém pra quem avisar. Ele tá com dor, igualzinho ao bicho da mina."),
          line("micaela", "E ó: fogo você não vence, menino. Fogo você APAGA. Lembra disso lá dentro."),
          line("micaela", "Tem água no brejo. Muita. Não é por acaso não."),
        ];
      }
      if (EN.Quests.isActive("aguas") || EN.Quests.isActive("boitata")) {
        return [line("micaela", "Já falei o que tinha pra falar. Agora é você e a água.")];
      }
      if (EN.Quests.isActive("nome")) {
        return [
          line("micaela", "Duas lasca. Duas."),
          line("micaela", "Me dá aqui, deixa eu botar uma do lado da outra."),
        ];
      }
      if (EN.Quests.isDone("nome")) {
        return [
          line("micaela", "Tem mais, menino. Tem muito mais."),
          line("micaela", "Mas hoje você dorme. Amanhã a gente vê o mapa direito."),
        ];
      }
      if (EN.Quests.isDone("fragmento")) {
        return [line("micaela", "Descansa enquanto dá, menino. Isso aqui foi só o começo.")];
      }
      if (EN.Quests.isActive("chegada") || EN.Quests.isActive("rumores")) {
        return [
          line("micaela", "Bem-vindo, menino. Sua mãe tinha o mesmo jeito de andar."),
          line("micaela", "Não pergunta agora. Quando chegar a hora, você volta aqui e a gente conversa direito."),
        ];
      }
      return [line("micaela", "Vai com Deus. E com cuidado.")];
    },

    batista: function () {
      if (EN.Quests.isActive("investigacao") || EN.Quests.isActive("camara")) {
        return [
          line("batista", "Você é o que subiu a trilha ontem. Eu vi."),
          line("batista", "Fui eu que lacrei a parte funda da mina, faz oito ano. Sozinho, de madrugada, sem contar pra ninguém."),
          line("batista", "Não foi por medo. Foi porque o que tá lá embaixo tava com dor, e eu não sabia fazer parar."),
          line("batista", "Se você for lá... termina o serviço direito. Não deixa aquilo sofrendo mais."),
        ];
      }
      if (EN.Quests.isDone("carcara")) {
        return [line("batista", "Você fez o que eu não consegui. Não vou esquecer disso.")];
      }
      return [
        line("batista", "Forasteiro. Anda no claro e não mexe no que não é teu, que a gente se dá bem."),
        line("batista", "A Estrada Velha é minha responsabilidade. Tem cachorro bravo por lá — e não é cachorro."),
      ];
    },

    /*
     * Flávio — o pescador. Existe pra três coisas: abrir o caminho do
     * Ato 3, ser a única pessoa da vila que fala do brejo sem medo (ele
     * cresceu lá), e dar o aviso prático sobre a Onça sem que isso vire
     * uma caixa de tutorial.
     */
    flavio: function () {
      if (EN.Quests.isActive("trilha")) {
        return [
          line("flavio", "Opa! Você é o do sítio velho. Meu pai falava do teu povo."),
          line("flavio", "Caminho do sul? Rapaz, eu pescava lá quase todo dia até uns dois mês atrás."),
          line("flavio", "Aí o brejo começou a soltar fumaça de noite. Fumaça de água, entende? Isso não existe."),
          line("flavio", "E tem outra coisa. A trilha de sudoeste tá fechada, mas não é de mato."),
          line("flavio", "Tem uma onça ali. Só que não é onça de mata, não. Ela some."),
          line("flavio", "Você olha, ela tá. Você pisca, ela não tá mais — e daqui a pouco ela tá do teu lado."),
          line("flavio", "Se for enfrentar: não fica olhando pra onde ela sumiu. Olha pro chão. A poeira que ela levanta chega antes dela."),
          line("flavio", "Passando dela, o brejo é logo ali embaixo. Boa sorte, viu."),
        ];
      }
      if (EN.Quests.isActive("lanternas") || EN.Quests.isActive("aguas")) {
        return [
          line("flavio", "Você matou aquilo? Sério mesmo?"),
          line("flavio", "Então tá aberto. Mas escuta — no brejo, anda pela água."),
          line("flavio", "Toda vez que eu me perdi lá, foi porque saí do raso pro seco. No seco você não vê o que vem."),
        ];
      }
      if (EN.Quests.isDone("boitata")) {
        return [
          line("flavio", "A fumaça parou. Minha mãe chorou quando viu."),
          line("flavio", "Amanhã eu volto a pescar lá. Faz dois mês."),
          line("flavio", "Se quiser vir junto, tem peixe pra dois."),
        ];
      }
      if (EN.Quests.isDone("carcara")) {
        return [line("flavio", "Ouvi dizer que você desceu na Santa Luzia e voltou. Poucos voltam.")];
      }
      return [
        line("flavio", "Boa tarde! Flávio, pescador. Se um dia quiser peixe fresco, é comigo."),
        line("flavio", "Só não me peça pra ir no brejo agora. Tá esquisito lá."),
      ];
    },

    /*
     * Iara das Águas — não é NPC de vila, é a última voz antes do chefe.
     * Ela dá a chave mecânica da luta (a água apaga o fogo) dentro da
     * própria fala, sem sair de personagem: o brejo é o corpo dela.
     */
    iara: function () {
      if (EN.Quests.isDone("boitata")) {
        return [
          line("iara", "Tá quieto. Faz tempo que não tava quieto."),
          line("iara", "Ele dormiu. Não morreu — dormiu. Tem diferença, e a diferença é sua."),
          line("narrador", "A água do poço está fria pela primeira vez em semanas."),
        ];
      }
      if (EN.Quests.isActive("boitata")) {
        return [line("iara", "Volta pra água quando o chão pegar fogo. É só isso. É só isso que eu sei.")];
      }
      return [
        line("iara", "Para. Não desce ainda."),
        line("narrador", "A voz vem de dentro do poço, mas a água não se mexe."),
        line("iara", "Eu vi ele nascer. Eu vi ele guardar esse brejo por mais tempo do que sua vila tem nome."),
        line("iara", "E eu vi a raiz preta chegar por baixo, devagar, e eu não pude fazer nada além de assistir."),
        line("iara", "O que tá lá embaixo não é raiva. É queimadura. Ele tá queimando por dentro faz dois meses e não consegue parar."),
        line("narrador", "Alguma coisa se move no fundo escuro. Você não olha."),
        line("iara", "Você não vai conseguir vencer o fogo batendo nele. Ninguém consegue."),
        line("iara", "Mas eu sou água. Todo esse brejo é eu."),
        line("iara", "Quando o chão pegar fogo — e vai pegar — volta pra mim. Pisa no raso. O fogo que cai em cima de mim morre depressa."),
        line("iara", "É a única ajuda que eu tenho pra dar. Usa ela."),
      ];
    },
  };

  // ---------------------------------------------------------------
  // Cenas fixas
  // ---------------------------------------------------------------
  function playDespertarVision(onDone) {
    EN.Dialogue.play(
      [
        line("narrador", "Sua mão encosta na raiz antes que você decida encostar."),
        line("narrador", "Ela é fria. Fria como água de poço fundo."),
        line("narrador", "E então o sítio some."),
        line("narrador", "Você está debaixo d'água sem se afogar. Há uma árvore enorme com raízes que sobem em vez de descer, e cada raiz é uma estrada, e em cada estrada anda gente que você nunca viu mas reconhece."),
        line("narrador", "Uma delas está preta. Apodrecendo de dentro pra fora."),
        line("narrador", "Alguma coisa muito grande, muito longe, grita de dor."),
        line("narrador", "Você acorda de joelhos no mato, com o coração batendo errado — e sabendo, sem saber como, que agora você enxerga o que os outros não enxergam."),
      ],
      { onEnd: onDone }
    );
  }

  function playBossIntro(onDone) {
    EN.Dialogue.play(
      [
        line("narrador", "A câmara é maior do que a mina inteira deveria permitir."),
        line("narrador", "No centro, entre raízes negras que respiram, há uma ave do tamanho de um boi."),
        line("narrador", "Penas de ferro. Olhos de gente."),
        line("narrador", "Ela olha pra você e não ataca. Ela espera."),
        line("micaela", "“Ele não é o culpado. Ele é a primeira vítima.”"),
        line("narrador", "As raízes se apertam. A ave grita — e o grito não é de raiva."),
      ],
      { onEnd: onDone }
    );
  }

  function playBossDefeat(onDone) {
    EN.Dialogue.play(
      [
        line("narrador", "O Carcará cai de lado, e as raízes negras soltam dele como quem larga um osso."),
        line("narrador", "Por um instante, antes de fechar os olhos, a ave parece simplesmente cansada."),
        line("narrador", "Ela encosta o bico no chão, ao seu lado, e se desfaz em poeira de minério."),
        line("narrador", "No lugar onde estava o coração, resta uma lasca de pedra morna, cheia de marcas que você não sabe ler."),
        line("narrador", "Fragmento do Encantado obtido."),
      ],
      { onEnd: onDone }
    );
  }

  function playBoitataIntro(onDone) {
    EN.Dialogue.play(
      [
        line("narrador", "O poço não tem fundo. Tem brasa."),
        line("narrador", "O que sobe dele não é uma cobra: é uma linha de fogo com trinta metros de comprimento, enrolada em si mesma, respirando."),
        line("narrador", "Onde ela encosta, a pedra molhada estala e seca."),
        line("iara", "“Ele tá queimando por dentro faz dois meses e não consegue parar.”"),
        line("narrador", "A cabeça se vira pra você. Os olhos são brancos de tão quentes — e por baixo do branco tem alguma coisa parecida com pedido."),
        line("narrador", "Ela abre a boca. O ar no seu rosto vira forno."),
        line("narrador", "O chão ao redor pega fogo em anel."),
      ],
      { onEnd: onDone }
    );
  }

  function playBoitataDefeat(onDone) {
    EN.Dialogue.play(
      [
        line("narrador", "O último anel de fogo não fecha. Ele afunda."),
        line("narrador", "A serpente desaba na água rasa e a água não ferve — ela apenas sobe pelo corpo dela, devagar, como quem cobre alguém com um lençol."),
        line("narrador", "O laranja vira vermelho. O vermelho vira brasa. A brasa apaga."),
        line("iara", "Pronto. Pronto, menino velho. Dorme."),
        line("narrador", "Onde estava a cabeça, resta uma lasca morna de pedra — igual à da mina, com marcas diferentes."),
        line("narrador", "Segunda lasca do Encantado obtida."),
        line("narrador", "Pela primeira vez em dois meses, o brejo cheira a brejo."),
      ],
      { onEnd: onDone }
    );
  }

  function playAto2Close() {
    EN.Dialogue.play(
      [
        line("micaela", "Eu tinha catorze ano e vi um Veio se abrir. Meu pai disse que era trovoada. Não era."),
        line("micaela", "Essas marca aqui não são escrita de gente, menino. É nome. É o nome de um lugar."),
        line("micaela", "E não é o nome da Santa Luzia."),
        line("narrador", "Ela vira o fragmento na palma da mão, devagar."),
        line("micaela", "Quer dizer que tem outro. E se tem outro, tem muitos."),
        line("micaela", "Alguma coisa tá envenenando os Veio um por um, de uma ponta a outra desse país."),
        line("micaela", "Você limpou um. Um."),
        line("narrador", "Lá fora, pela primeira vez em semanas, os grilos voltam a cantar no escuro."),
        line("narrador", "Mas ao sul, baixo no horizonte, tem uma fumaça que não devia estar ali."),
        line("micaela", "...menino. Você viu aquilo também, né?"),
        line("narrador", "— fim do segundo ato —"),
      ],
      {
        onEnd: function () {
          if (api.toast) api.toast("📜 Ato 3: alguma coisa queima ao sul da vila.");
        },
      }
    );
  }

  function playAto3Close() {
    EN.Dialogue.play(
      [
        line("narrador", "Dona Micaela põe as duas lascas lado a lado na mesa de madeira."),
        line("narrador", "Elas não se encaixam. Mas as marcas de uma continuam na outra, como se as duas fossem pedaços de uma frase muito maior."),
        line("micaela", "Santa Luzia. Brejo das Lanternas."),
        line("micaela", "Dois nome, menino. Duas boca do mesmo bicho."),
        line("narrador", "Ela passa o dedo pela borda quebrada da segunda lasca."),
        line("micaela", "Sabe o que me assusta? Não é ter dois. É que os dois quebraram do MESMO jeito."),
        line("micaela", "Alguém tá partindo os Veio. Alguém com mão, menino. Isso não é doença — isso é serviço feito."),
        line("narrador", "O fogo do lampião estala."),
        line("micaela", "E quem faz serviço, faz de novo. Sempre faz de novo."),
        line("micaela", "Descansa hoje. Amanhã a gente abre o mapa e vê quantos Veio esse país tem."),
        line("narrador", "Do lado de fora, o vento vem do norte pela primeira vez na semana — e traz cheiro de terra queimada de muito longe."),
        line("narrador", "— fim do terceiro ato de Encantaria —"),
      ],
      {
        onEnd: function () {
          if (api.toast) api.toast("✦ Você concluiu a história do protótipo. O mundo continua aberto.");
        },
      }
    );
  }

  // ---------------------------------------------------------------
  // API usada pelo resto do jogo
  // ---------------------------------------------------------------
  function init(hooks) {
    api = hooks || {};
    defineQuests();

    EN.Quests.onEvent(function (kind, quest, objective) {
      if (kind === "started" && api.toast) {
        api.toast("📜 Nova missão: " + quest.title);
        EN.Audio.play("quest");
      }
      if (kind === "completed" && api.toast) {
        api.toast("✓ Missão concluída: " + quest.title);
        EN.Audio.play("quest");
      }
      if (api.refreshTracker) api.refreshTracker();
    });

    // primeira partida começa no Ato 0
    if (!EN.Quests.isDone("chegada")) EN.Quests.start("chegada");
  }

  function talkTo(npcId) {
    var build = TALKS[npcId];
    if (!build) return false;
    var lines = build();
    EN.Dialogue.play(lines, {
      onEnd: function () {
        EN.Quests.report("talk", { npc: npcId });
      },
    });
    return true;
  }

  function npcName(id) {
    return (NPCS[id] || {}).name || "";
  }

  function flag(name) {
    EN.Quests.report("flag", { flag: name });
  }

  function enemyKilled(defId) {
    EN.Quests.report("kill", { defId: defId });
  }

  function reachArea(area) {
    EN.Quests.report("reach", { area: area });
  }

  // a Iara não é um NPC do mapa da vila (ela mora dentro do brejo), mas
  // reporta "talk" igual aos outros pra missão avançar do mesmo jeito
  function talkToIara() {
    return talkTo("iara");
  }

  return {
    init: init,
    talkTo: talkTo,
    talkToIara: talkToIara,
    npcName: npcName,
    flag: flag,
    enemyKilled: enemyKilled,
    reachArea: reachArea,
    playDespertarVision: playDespertarVision,
    playBossIntro: playBossIntro,
    playBossDefeat: playBossDefeat,
    playBoitataIntro: playBoitataIntro,
    playBoitataDefeat: playBoitataDefeat,
    NPCS: NPCS,
  };
})();
