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
        onComplete: function () {
          playEpilogue();
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

  function playEpilogue() {
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
        line("narrador", "— fim do primeiro ato de Encantaria —"),
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
      if (kind === "started" && api.toast) api.toast("📜 Nova missão: " + quest.title);
      if (kind === "completed" && api.toast) api.toast("✓ Missão concluída: " + quest.title);
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

  return {
    init: init,
    talkTo: talkTo,
    npcName: npcName,
    flag: flag,
    enemyKilled: enemyKilled,
    reachArea: reachArea,
    playDespertarVision: playDespertarVision,
    playBossIntro: playBossIntro,
    playBossDefeat: playBossDefeat,
    NPCS: NPCS,
  };
})();
