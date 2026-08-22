window.EN = window.EN || {};

/*
 * Primeiros minutos — as dicas que aparecem uma vez e nunca mais.
 *
 * O jogo tinha zero onboarding: o jogador caía no sítio sem saber que
 * existe esquiva, que dá pra segurar o ataque, que o botão redondo do
 * canto é interação. A lista de teclas estava enterrada em Opções, que é
 * o último lugar onde alguém procura antes de desistir.
 *
 * Três regras que separam dica útil de tutorial chato:
 *
 *  1. SÓ APARECE QUANDO É RELEVANTE. "Segure para o golpe pesado" surge
 *     quando aparece o primeiro inimigo, não na tela de título.
 *  2. SOME QUANDO O JOGADOR FAZ. A dica de esquiva desaparece na
 *     primeira esquiva — quem já sabe nunca lê nada.
 *  3. NUNCA REPETE. Uma vez cumprida, fica cumprida no save. Ninguém
 *     é ensinado duas vezes a andar.
 *
 * É por isso que isto não pausa e não tem botão de "ok": uma caixa que
 * exige confirmação é uma parede, e parede no primeiro minuto é o que
 * mais faz gente fechar o jogo.
 */
EN.Hints = (function () {
  /*
   * `when` decide se a dica cabe agora; `done` decide se ela já foi
   * cumprida. Separar os dois é o que permite mostrar "aperte para
   * atacar" só com inimigo perto E sumir assim que o golpe sair.
   */
  var HINTS = [
    {
      id: "mover",
      text: mobile() ? "Arraste o círculo da esquerda para andar" : "WASD para andar · o mouse aponta para onde você ataca",
      when: function () { return true; },
      done: function (s) { return s.player.moving || s._andou; },
      hold: 4,
    },
    {
      id: "interagir",
      text: mobile() ? "O botão redondo aparece quando há algo por perto" : "E para conversar e interagir",
      when: function (s) { return !!EN.Interactable.findNearest(s.player.x, s.player.y); },
      done: function () { return EN.Hints._flag.interagiu; },
      hold: 5,
    },
    {
      id: "atacar",
      text: mobile() ? "👊 toca para golpe · SEGURE para o golpe pesado" : "Clique para golpear · SEGURE o clique para o golpe pesado",
      when: nearEnemy(200),
      done: function () { return EN.Hints._flag.atacou; },
      hold: 6,
    },
    {
      id: "esquivar",
      text: mobile() ? "💨 rola e te deixa invulnerável — role no aviso vermelho" : "Espaço rola e te deixa invulnerável — role no aviso vermelho",
      when: function (s) {
        // só quando um inimigo está de fato avisando o golpe
        return (s.enemies || []).some(function (e) {
          return !e.dead && e.state === "telegraph" && Math.hypot(e.x - s.player.x, e.y - s.player.y) < 220;
        });
      },
      done: function () { return EN.Hints._flag.esquivou; },
      hold: 7,
    },
    {
      id: "curar",
      text: mobile() ? "🧪 usa um preparo de ervas" : "H usa um preparo de ervas",
      when: function (s) { return s.player.hp / s.player.hpMax < 0.45 && s.player.healCharges > 0; },
      done: function () { return EN.Hints._flag.curou; },
      hold: 6,
    },
    {
      id: "menu",
      text: mobile() ? "☰ abre status, missões e bestiário" : "Tab abre status, missões e bestiário",
      when: function () { return (EN.State.data.progress.attrPoints || 0) > 0; },
      done: function () { return EN.Hints._flag.abriuMenu; },
      hold: 7,
    },
  ];

  function mobile() {
    return window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  }

  function nearEnemy(range) {
    return function (s) {
      return (s.enemies || []).some(function (e) {
        return !e.dead && e.state !== "disguised" && Math.hypot(e.x - s.player.x, e.y - s.player.y) < range;
      });
    };
  }

  function seen() {
    var pr = EN.State.data.progress;
    if (!pr.hints || typeof pr.hints !== "object" || Array.isArray(pr.hints)) pr.hints = {};
    return pr.hints;
  }

  var current = null,
    t = 0,
    el = null;

  function init() {
    el = document.getElementById("hint-bar");
  }

  // marca uma ação do jogador. Chamado dos lugares onde a ação acontece
  // de verdade, não de onde ela é oferecida.
  function did(what) {
    EN.Hints._flag[what] = true;
  }

  function update(session, dt) {
    if (!el || !session || session.isArena) return;
    var s = seen();

    if (current) {
      t -= dt;
      // some ao ser cumprida, mesmo antes do tempo acabar
      if (current.done(session) || t <= 0) {
        if (current.done(session)) s[current.id] = true;
        el.classList.remove("show");
        current = null;
        EN.State.persist();
      }
      return;
    }

    for (var i = 0; i < HINTS.length; i++) {
      var h = HINTS[i];
      if (s[h.id]) continue;
      if (h.done(session)) {
        // o jogador já sabia fazer antes da dica aparecer: dá por
        // aprendido em silêncio, sem nunca mostrar nada
        s[h.id] = true;
        continue;
      }
      if (!h.when(session)) continue;
      current = h;
      t = h.hold;
      el.textContent = h.text;
      el.classList.add("show");
      return;
    }
  }

  return { init: init, update: update, did: did, _flag: {} };
})();
