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
      "status-effects",
      "xp-fill",
      "minimap",
      "minimap-area",
      "minimap-box",
    ].forEach(function (id) {
      els[id] = document.getElementById(id);
    });
  }

  var STATUS_DEFS = {
    sangramento: { icon: "🩸", label: "Sangr." },
    queimando:   { icon: "🔥", label: "Fogo"   },
    enraizado:   { icon: "🌿", label: "Raiz"   },
    atordoado:   { icon: "💫", label: "Ato."   },
  };
  var statusMaxT = {};

  function updateStatusEffects(p) {
    var el = els["status-effects"];
    if (!el) return;
    if (!p.status) { el.innerHTML = ""; return; }
    var html = "";
    for (var k in p.status) {
      var st = p.status[k];
      if (!st || st.t <= 0) continue;
      if (!statusMaxT[k] || statusMaxT[k] < st.t) statusMaxT[k] = st.t;
      var pct = Math.max(0, Math.min(100, (st.t / statusMaxT[k]) * 100)).toFixed(0);
      var def = STATUS_DEFS[k] || { icon: "⚠", label: k };
      html += '<div class="sfx-pill ' + k + '">' +
        '<div class="sfx-pill-bar" style="width:' + pct + '%"></div>' +
        '<span class="sfx-icon">' + def.icon + '</span>' +
        '<span class="sfx-name">' + def.label + '</span>' +
        '</div>';
    }
    el.innerHTML = html;
  }

  // barrinha de XP embaixo do nome: progresso de nível sempre visível,
  // sem ocupar uma linha inteira do painel
  function updateXP() {
    var el = els["xp-fill"];
    if (!el) return;
    var pr = EN.State.data.progress;
    var need = 18 + ((pr.level || 1) - 1) * 10;
    el.style.width = Math.min(100, (Math.max(0, pr.xp || 0) / need) * 100) + "%";
  }

  /*
   * Minimapa. Escondido na arena (é uma caixa de teste sem geografia) e
   * enquanto o menu está aberto, que já mostra tudo em tela cheia.
   */
  function updateMinimap(world) {
    var box = els["minimap-box"];
    if (!box) return;
    var s = EN.Main.getSession();
    if (!s || s.isArena) {
      box.classList.remove("visible");
      return;
    }
    box.classList.add("visible");
    els["minimap-area"].textContent = s.areaName || "";
    EN.Guide.drawMinimap(els["minimap"], s);
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

    var pr = EN.State.data.progress;
    els["hud-name"].textContent = appearance.name || "Viajante";
    var className = p.classDef ? p.classDef.name : "Sem classe";
    els["hud-classline"].textContent = "Nv. " + (pr.level || 1) + " • " + className;
    drawPortrait(appearance, p.classId);
    updateStatusEffects(p);
    updateXP();
    EN.Menu.refreshBadge();
    updateMinimap(world);

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
