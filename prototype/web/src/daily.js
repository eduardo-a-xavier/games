window.EN = window.EN || {};

/*
 * Visita diária — a única parte do jogo que mede tempo REAL.
 *
 * A roça dá motivo pra dormir e voltar dentro da sessão. Isto aqui dá
 * motivo pra abrir o jogo amanhã: uma sequência de dias que cresce
 * enquanto você aparece e zera quando some.
 *
 * Três decisões que mantêm isso honesto em vez de manipulador:
 *
 *  1. A recompensa é CONVENIÊNCIA, nunca poder. Vintém e preparo de
 *     ervas — coisas que o jogo já dá jogando. Quem nunca voltar não
 *     fica mais fraco, só anda um pouco mais devagar.
 *  2. Tem TETO. A partir do sétimo dia o prêmio para de crescer. Uma
 *     escada infinita transforma "quero jogar" em "não posso faltar", e
 *     isso é o começo de um jogo que as pessoas passam a odiar.
 *  3. Perder a sequência não apaga nada. Zera o contador e pronto — sem
 *     "você perdeu 30 dias", sem oferta pra recuperar.
 *
 * A data é a LOCAL do aparelho (YYYY-MM-DD), não UTC: virar o dia às 21h
 * porque o servidor está em outro fuso é o tipo de coisa que parece bug
 * mesmo quando está documentada.
 */
EN.Daily = (function () {
  var MAX_STREAK_BONUS = 7;

  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function yesterday() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function store() {
    var pr = EN.State.data.progress;
    if (!pr.daily || typeof pr.daily !== "object" || Array.isArray(pr.daily)) {
      pr.daily = { streak: 0, last: null, best: 0 };
    }
    return pr.daily;
  }

  /*
   * Recompensa do dia N da sequência. Cresce devagar e trava no teto; a
   * cura só vem de três em três dias pra não inflacionar o recurso que
   * mais importa numa luta difícil.
   */
  function rewardFor(streak) {
    var n = Math.min(streak, MAX_STREAK_BONUS);
    return {
      vintem: 8 + (n - 1) * 6,
      curas: n % 3 === 0 ? 1 : 0,
      capped: streak > MAX_STREAK_BONUS,
    };
  }

  /*
   * Chamado uma vez na abertura do jogo. Devolve null quando o jogador já
   * apareceu hoje — assim recarregar a página não vira uma máquina de
   * Vintém.
   */
  function claim(player) {
    var d = store();
    var hoje = today();
    if (d.last === hoje) return null;

    d.streak = d.last === yesterday() ? d.streak + 1 : 1;
    d.last = hoje;
    d.best = Math.max(d.best || 0, d.streak);

    var r = rewardFor(d.streak);
    EN.State.data.world.vintem += r.vintem;
    if (r.curas && player) {
      player.healCharges += r.curas;
      EN.State.data.world.inventory.curas = player.healCharges;
    }
    EN.State.persist();
    return { streak: d.streak, best: d.best, vintem: r.vintem, curas: r.curas, capped: r.capped };
  }

  function current() {
    var d = store();
    // a sequência exibida só vale se foi mantida: quem não abre há dois
    // dias vê 0, não o número velho
    if (d.last !== today() && d.last !== yesterday()) return { streak: 0, best: d.best || 0, last: d.last };
    return { streak: d.streak || 0, best: d.best || 0, last: d.last };
  }

  return { claim: claim, current: current, rewardFor: rewardFor, today: today, MAX: MAX_STREAK_BONUS };
})();
