window.EN = window.EN || {};

/*
 * Componente/registro reutilizável de interação contextual.
 *
 * Qualquer objeto do mundo (NPC, item, baú, plantação, porta, ponto de
 * investigação...) só precisa se registrar aqui com {x, y, range, icon,
 * label, onInteract}. O botão contextual (controls.js) nunca sabe o que é
 * cada objeto — só pergunta "qual é o mais próximo?" e chama onInteract().
 * Isso evita `if (tipo === 'npc') ... else if (tipo === 'baú') ...`
 * espalhado pelo código.
 */
EN.Interactable = (function () {
  var registry = [];

  function register(obj) {
    obj.range = obj.range || 46;
    registry.push(obj);
    return obj;
  }

  function unregisterAll() {
    registry = [];
  }

  function findNearest(px, py) {
    var best = null,
      bestD = Infinity;
    for (var i = 0; i < registry.length; i++) {
      var o = registry[i];
      if (o.used && o.once) continue;
      if (o.available === false) continue;
      var d = Math.hypot(o.x - px, o.y - py);
      if (d <= o.range && d < bestD) {
        best = o;
        bestD = d;
      }
    }
    return best;
  }

  function all() {
    return registry;
  }

  // usados para isolar a arena de teste: guarda o registro do mundo
  // principal de lado e devolve depois, sem recriar objetos (o que
  // reapareceria itens já coletados / baús já abertos)
  function snapshot() {
    return registry;
  }
  function restore(saved) {
    registry = saved;
  }

  return {
    register: register,
    unregisterAll: unregisterAll,
    findNearest: findNearest,
    all: all,
    snapshot: snapshot,
    restore: restore,
  };
})();
