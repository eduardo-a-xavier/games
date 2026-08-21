window.EN = window.EN || {};

/*
 * Missões. Cada missão é uma lista de objetivos resolvidos EM ORDEM — o
 * jogador vê sempre um único passo por vez no rastreador do HUD, que é o
 * que cabe numa tela de celular sem virar lista de tarefas.
 *
 * O resto do jogo nunca chama a missão pelo nome: emite um evento
 * ("matei um rato", "falei com o Osvaldo", "cheguei na mina") e quem
 * estiver esperando aquilo avança sozinho. É isso que permite escrever
 * história nova em story.js sem tocar em combate, mundo ou HUD.
 *
 * Tipos de objetivo:
 *   talk   { npc }              conversar com um NPC
 *   kill   { defId, count }     abater N criaturas de um tipo
 *   reach  { area }             entrar numa área
 *   flag   { flag }             qualquer marco disparado por story.js
 *   item   { item, count }      juntar N de alguma coisa
 */
EN.Quests = (function () {
  var defs = {};
  var order = [];
  var listeners = [];

  function define(list) {
    list.forEach(function (q) {
      defs[q.id] = q;
      order.push(q.id);
    });
  }

  function store() {
    var pr = EN.State.data.progress;
    if (!pr.quests) pr.quests = {};
    return pr.quests;
  }

  function stateOf(id) {
    var st = store();
    if (!st[id]) st[id] = { started: false, step: 0, count: 0, done: false };
    return st[id];
  }

  function start(id) {
    var q = defs[id];
    if (!q) return false;
    var st = stateOf(id);
    if (st.started || st.done) return false;
    st.started = true;
    st.step = 0;
    st.count = 0;
    EN.State.persist();
    emit("started", q, null);
    return true;
  }

  function isDone(id) {
    return !!stateOf(id).done;
  }

  function isActive(id) {
    var st = stateOf(id);
    return st.started && !st.done;
  }

  // missão mostrada no HUD: a primeira iniciada e não concluída, na ordem
  // em que foram definidas (as principais são definidas primeiro)
  function active() {
    for (var i = 0; i < order.length; i++) {
      var st = stateOf(order[i]);
      if (st.started && !st.done) {
        var q = defs[order[i]];
        return { quest: q, state: st, objective: q.objectives[st.step] };
      }
    }
    return null;
  }

  function matches(obj, type, data) {
    if (obj.type !== type) return false;
    if (type === "talk") return obj.npc === data.npc;
    if (type === "kill") return !obj.defId || obj.defId === data.defId;
    if (type === "reach") return obj.area === data.area;
    if (type === "flag") return obj.flag === data.flag;
    if (type === "item") return obj.item === data.item;
    return false;
  }

  /*
   * Avança QUALQUER missão ativa cujo objetivo atual case com o evento.
   * Uma mesma ação pode fechar objetivo de duas missões diferentes — o
   * jogador não deveria ter que fazer a mesma coisa duas vezes.
   */
  function report(type, data) {
    data = data || {};
    var advancedAny = false;
    for (var i = 0; i < order.length; i++) {
      var id = order[i];
      var st = stateOf(id);
      if (!st.started || st.done) continue;
      var q = defs[id];
      var obj = q.objectives[st.step];
      if (!obj || !matches(obj, type, data)) continue;

      var need = obj.count || 1;
      st.count++;
      if (st.count < need) {
        emit("progress", q, obj);
        advancedAny = true;
        continue;
      }
      st.count = 0;
      st.step++;
      advancedAny = true;
      if (st.step >= q.objectives.length) {
        st.done = true;
        emit("completed", q, obj);
        if (q.onComplete) q.onComplete();
        if (q.next) start(q.next);
      } else {
        emit("progress", q, q.objectives[st.step]);
      }
    }
    if (advancedAny) EN.State.persist();
    return advancedAny;
  }

  function onEvent(fn) {
    listeners.push(fn);
  }

  function emit(kind, quest, objective) {
    listeners.forEach(function (fn) {
      fn(kind, quest, objective);
    });
  }

  function get(id) {
    return defs[id];
  }

  function allDefs() {
    return order.map(function (id) {
      return { def: defs[id], state: stateOf(id) };
    });
  }

  return {
    define: define,
    start: start,
    report: report,
    active: active,
    isDone: isDone,
    isActive: isActive,
    onEvent: onEvent,
    get: get,
    allDefs: allDefs,
  };
})();
