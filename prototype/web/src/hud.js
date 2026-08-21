window.EN = window.EN || {};

/*
 * HUD compacto: barras horizontais com ícone, retrato+nível+classe,
 * relógio/dia/moeda. Só atualiza texto/estilo de elementos já existentes no
 * DOM (ver index.html) — nenhum layout é gerado aqui.
 */
EN.HUD = (function () {
  var els = {};
  function cache() {
    [
      "fill-hp",
      "fill-st",
      "fill-mp",
      "num-hp",
      "num-st",
      "num-mp",
      "hud-name",
      "hud-classline",
      "hud-portrait",
      "coin-count",
      "clock-time",
      "clock-day",
      "day-glyph",
    ].forEach(function (id) {
      els[id] = document.getElementById(id);
    });
  }

  function setBar(key, v, max) {
    els["fill-" + key].style.transform = "scaleX(" + Math.max(0, v / max) + ")";
    els["num-" + key].textContent = Math.ceil(v) + "/" + max;
  }

  function fmtClock(dayT) {
    var h = Math.floor(dayT);
    var m = Math.floor((dayT - h) * 60);
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  function update(p, world, appearance) {
    if (!els["fill-hp"]) cache();
    setBar("hp", p.hp, p.hpMax);
    setBar("st", p.st, p.stMax);
    setBar("mp", p.mp, p.mpMax);

    els["hud-name"].textContent = appearance.name || "Viajante";
    var className = p.classDef ? p.classDef.name : "Sem classe";
    els["hud-classline"].textContent = (world.level ? "Nv. " + world.level + " • " : "") + className;
    drawPortrait(appearance, p.classId);

    if (world.showClock !== false) {
      els["coin-count"].textContent = world.vintem;
      els["clock-time"].textContent = fmtClock(world.dayT);
      els["clock-day"].textContent = "Dia " + world.day;
      var ph = EN.World.currentPhase(world.dayT);
      els["day-glyph"].textContent = ph.glyph;
    }
  }

  function drawPortrait(appearance, classId) {
    var canvas = els["hud-portrait"];
    if (!canvas || canvas.tagName !== "CANVAS") return;
    var ctx = canvas.getContext("2d");
    var cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = false;
    // scale down so the full character (sprite height ~52px) fits inside the
    // small portrait canvas; anchor so feet sit near the bottom with a 2px gap
    var s = 0.72;
    var canvasCy = ch - 2 - 15 * s;
    ctx.save();
    ctx.scale(s, s);
    EN.Appearance.draw(ctx, (cw / 2) / s, canvasCy / s, appearance, {
      state: "idle",
      t: performance.now() / 600,
      facing: { x: 0, y: 1 },
      classId: classId,
    });
    ctx.restore();
  }

  return { update: update };
})();
