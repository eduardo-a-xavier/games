window.EN = window.EN || {};

/*
 * Menu do jogo — a tela que qualquer RPG tem atrás de um botão só: status
 * do personagem, missões, bestiário e opções.
 *
 * Duas regras que valem pra tudo aqui:
 *
 * 1. ABRIR PAUSA. Distribuir ponto de atributo ou ler o bestiário com
 *    um Corpo-Seco correndo atrás não é escolha, é acidente. O menu
 *    congela a sessão via EN.Main.setPaused e devolve no fechar.
 *
 * 2. NADA DE ESTADO PRÓPRIO. Todo conteúdo é RENDERIZADO na abertura a
 *    partir de EN.State / EN.Quests / EN.Bestiary. Assim não existe a
 *    classe de bug "o menu mostra um número velho" — se o dado mudou no
 *    jogo, ele já muda aqui na próxima abertura.
 */
EN.Menu = (function () {
  var root = null,
    els = {},
    open = false,
    portraitRAF = null;

  /*
   * Os cinco atributos. `stat` é a propriedade do player que o ponto
   * engorda, e é ela que a coluna "atual" lê — o jogador vê o efeito
   * real do ponto, não a promessa da fórmula.
   */
  var ATTRS = [
    { key: "forca",      icon: "⚔️", name: "Força",      sub: "+2 Ataque",     stat: "atk"   },
    { key: "vitalidade", icon: "❤️", name: "Vitalidade", sub: "+5 Vida máx",   stat: "hpMax" },
    { key: "vigor",      icon: "⚡", name: "Vigor",      sub: "+4 Vigor máx",  stat: "stMax" },
    { key: "magia",      icon: "✦",  name: "Magia",      sub: "+3 Magia máx",  stat: "mpMax" },
    { key: "defesa",     icon: "🛡️", name: "Defesa",     sub: "+1 Defesa",     stat: "def"   },
  ];

  function init() {
    root = document.getElementById("screen-menu");
    if (!root) return;
    ["menu-close", "attr-pts", "attr-rows", "derived-rows", "quest-list", "bestiary-list",
     "menu-portrait", "menu-name", "menu-class", "menu-level", "menu-xp-fill", "menu-xp-text",
     "btn-menu", "menu-dot", "opt-mute", "opt-fullscreen", "opt-reset"].forEach(function (id) {
      els[id] = document.getElementById(id);
    });

    buildAttrRows();
    wireTabs();

    tap(els["btn-menu"], toggle);
    tap(els["menu-close"], close);
    // clicar no fundo escuro fecha: gesto que todo mundo já espera
    root.addEventListener("pointerdown", function (e) {
      if (e.target === root) close();
    });

    document.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Tab" || e.code === "Escape" || e.code === "KeyI") {
        // Esc fecha um diálogo antes de abrir o menu — senão o menu
        // abriria por cima de uma cena de história
        if (EN.Dialogue && EN.Dialogue.isOpen && EN.Dialogue.isOpen()) return;
        e.preventDefault();
        toggle();
      }
    });

    wireOptions();
  }

  function tap(el, fn) {
    if (!el) return;
    el.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      fn();
    });
  }

  function wireTabs() {
    var tabs = root.querySelectorAll(".menu-tab");
    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        Array.prototype.forEach.call(tabs, function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        var name = tab.dataset.tab;
        Array.prototype.forEach.call(root.querySelectorAll(".menu-page"), function (pg) {
          pg.classList.toggle("active", pg.dataset.page === name);
        });
        if (name === "quests") renderQuests();
        if (name === "bestiary") renderBestiary();
      });
    });
  }

  // ---------------------------------------------------------------
  // abrir / fechar
  // ---------------------------------------------------------------
  function toggle() {
    if (open) close();
    else openMenu();
  }

  function openMenu() {
    if (open || !root) return;
    open = true;
    root.classList.add("open");
    EN.Main.setPaused(true);
    EN.Audio.play("ui");
    renderStatus();
    renderQuests();
    startPortrait();
  }

  function close() {
    if (!open || !root) return;
    open = false;
    root.classList.remove("open");
    EN.Main.setPaused(false);
    stopPortrait();
  }

  function isOpen() {
    return open;
  }

  // ---------------------------------------------------------------
  // aba STATUS
  // ---------------------------------------------------------------
  function buildAttrRows() {
    var host = els["attr-rows"];
    if (!host) return;
    host.innerHTML = ATTRS.map(function (a) {
      return (
        '<div class="attr-row" data-attr="' + a.key + '">' +
        '<span class="attr-icon">' + a.icon + "</span>" +
        '<span class="attr-name">' + a.name + '<span class="attr-sub">' + a.sub + " por ponto</span></span>" +
        '<span class="attr-bonus">—</span>' +
        '<span class="attr-val">—</span>' +
        '<button class="attr-add" aria-label="Investir ponto em ' + a.name + '">+</button>' +
        "</div>"
      );
    }).join("");

    ATTRS.forEach(function (a) {
      var btn = host.querySelector("[data-attr='" + a.key + "'] .attr-add");
      btn.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        spend(a.key);
      });
    });
  }

  function spend(key) {
    var pr = EN.State.data.progress;
    if (!pr.attrPoints || pr.attrPoints <= 0) return;
    pr.attrs = pr.attrs || {};
    pr.attrPoints--;
    pr.attrs[key] = (pr.attrs[key] || 0) + 1;

    /*
     * Reaplicar a classe recalcula os máximos a partir do zero (base +
     * nível + atributos). A vida ATUAL é preservada em proporção: subir
     * Vitalidade não pode virar uma cura de graça no meio de uma luta
     * pausada, e também não pode te deixar com menos vida do que tinha.
     */
    var main = EN.Main.getMainSession();
    if (main) {
      var p = main.player;
      var pct = p.hp / p.hpMax;
      EN.Player.applyClass(p, p.classId, false, pr.level);
      p.hp = Math.min(p.hpMax, Math.max(p.hp, Math.round(p.hpMax * pct)));
    }
    EN.State.persist();
    EN.Audio.play("levelup");
    renderStatus();
  }

  function xpForLevel(level) {
    return 18 + (level - 1) * 10; // mesma curva de main.js#xpForLevel
  }

  function renderStatus() {
    var pr = EN.State.data.progress;
    pr.attrs = pr.attrs || {};
    var main = EN.Main.getMainSession();
    var p = main && main.player;
    var pts = pr.attrPoints || 0;

    els["menu-name"].textContent = (EN.State.data.profile.appearance || {}).name || "Viajante";
    els["menu-class"].textContent = p && p.classDef ? p.classDef.name : "Sem classe";
    els["menu-level"].textContent = "Nível " + (pr.level || 1);

    var need = xpForLevel(pr.level || 1);
    var cur = Math.max(0, pr.xp || 0);
    els["menu-xp-fill"].style.width = Math.min(100, (cur / need) * 100) + "%";
    els["menu-xp-text"].textContent = cur + " / " + need + " XP";

    els["attr-pts"].textContent = pts > 0 ? pts + " pt" + (pts > 1 ? "s" : "") + " a gastar" : "sem pontos";
    els["attr-pts"].classList.toggle("hot", pts > 0);

    ATTRS.forEach(function (a) {
      var row = els["attr-rows"].querySelector("[data-attr='" + a.key + "']");
      var spent = pr.attrs[a.key] || 0;
      row.querySelector(".attr-bonus").textContent = spent > 0 ? "+" + spent : "—";
      row.querySelector(".attr-val").textContent = p ? Math.round(p[a.stat]) : "—";
      row.querySelector(".attr-add").disabled = pts <= 0;
    });

    var streak = EN.Daily.current();
    var pronto = EN.Farm.readyCount();

    // números derivados: o que o jogador realmente sente na luta,
    // seguido do que está esperando por ele fora dela
    var rows = p
      ? [
          ["Vida", Math.ceil(p.hp) + " / " + p.hpMax],
          ["Vigor", Math.ceil(p.st) + " / " + p.stMax],
          ["Magia", Math.ceil(p.mp) + " / " + p.mpMax],
          ["Ataque", Math.round(p.atk)],
          ["Defesa", p.def.toFixed(1)],
          ["Velocidade", Math.round(p.speed)],
          ["Arma", p.classDef ? p.classDef.startingEquipment.name : "As próprias mãos"],
          ["Talento", p.skill2Def ? p.skill2Def.name : "—"],
          ["Curas", p.healCharges],
          ["Vintém", EN.State.data.world.vintem],
          ["Dias seguidos", streak.streak + (streak.best > streak.streak ? " (recorde " + streak.best + ")" : "")],
          ["Roça", pronto > 0 ? pronto + " pronto" + (pronto > 1 ? "s" : "") + " pra colher" : EN.Farm.emptyCount() + " canteiros livres"],
        ]
      : [];
    els["derived-rows"].innerHTML = rows
      .map(function (r) {
        return '<div class="derived-row"><span>' + r[0] + "</span><b>" + r[1] + "</b></div>";
      })
      .join("");
  }

  // retrato animado: o personagem respira no menu, igual no HUD
  function startPortrait() {
    var canvas = els["menu-portrait"];
    if (!canvas) return;
    var g = canvas.getContext("2d");
    var main = EN.Main.getMainSession();
    var app = EN.State.data.profile.appearance;
    var classId = main && main.player ? main.player.classId : null;
    // o personagem é desenhado com ~52px de altura; ampliar preenche o
    // quadro do retrato em vez de deixar a figura perdida no meio dele
    var S = 2.1;
    function frame() {
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.imageSmoothingEnabled = false;
      g.save();
      g.scale(S, S);
      EN.Appearance.draw(g, canvas.width / 2 / S, (canvas.height - 10) / S, app, {
        state: "idle",
        t: performance.now() / 600,
        facing: { x: 0, y: 1 },
        classId: classId,
      });
      g.restore();
      portraitRAF = requestAnimationFrame(frame);
    }
    frame();
  }

  function stopPortrait() {
    if (portraitRAF) cancelAnimationFrame(portraitRAF);
    portraitRAF = null;
  }

  // ---------------------------------------------------------------
  // aba MISSÕES
  // ---------------------------------------------------------------
  function renderQuests() {
    var host = els["quest-list"];
    if (!host) return;
    var all = EN.Quests.allDefs().map(function (e) {
      return {
        title: e.def.title,
        objectives: e.def.objectives,
        started: e.state.started,
        done: e.state.done,
        step: e.state.step,
        count: e.state.count,
      };
    });
    var html = "";

    var active = all.filter(function (q) { return q.started && !q.done; });
    var done = all.filter(function (q) { return q.done; });

    if (!active.length && !done.length) {
      host.innerHTML = '<div class="menu-empty">Sua história ainda não começou.</div>';
      return;
    }

    if (active.length) {
      html += '<div class="menu-section-title">EM ANDAMENTO</div>';
      active.forEach(function (q) {
        html += '<div class="quest-card active"><div class="quest-card-title">' + q.title + "</div>";
        q.objectives.forEach(function (o, i) {
          var state = i < q.step ? "done" : i === q.step ? "now" : "todo";
          var mark = state === "done" ? "✓" : state === "now" ? "▸" : "·";
          var count = i === q.step && o.count > 1 ? " (" + q.count + "/" + o.count + ")" : "";
          // objetivo futuro fica escondido: contar o passo 3 antes de
          // fazer o passo 1 entrega a história de graça
          var text = state === "todo" ? "???" : o.text + count;
          html += '<div class="quest-obj ' + state + '"><span>' + mark + "</span>" + text + "</div>";
        });
        html += "</div>";
      });
    }

    if (done.length) {
      html += '<div class="menu-section-title">CONCLUÍDAS</div>';
      done.forEach(function (q) {
        html += '<div class="quest-card done"><div class="quest-card-title">✓ ' + q.title + "</div></div>";
      });
    }
    host.innerHTML = html;
  }

  // ---------------------------------------------------------------
  // aba BESTIÁRIO
  // ---------------------------------------------------------------
  /*
   * Só aparece o que o jogador já ENCONTROU. Um bestiário completo desde
   * o começo estraga duas coisas ao mesmo tempo: a surpresa de achar um
   * bicho novo, e a utilidade da própria tela (ninguém procura numa
   * lista de 20 o único que importa).
   */
  function renderBestiary() {
    var host = els["bestiary-list"];
    if (!host) return;
    var seen = EN.State.data.progress.seen || {};
    var list = EN.Bestiary.list.filter(function (d) { return seen[d.id]; });

    if (!list.length) {
      host.innerHTML = '<div class="menu-empty">Você ainda não encontrou nenhuma criatura.<br>Elas entram aqui sozinhas.</div>';
      return;
    }

    host.innerHTML = list
      .map(function (d) {
        var kills = seen[d.id].kills || 0;
        var tags = []
          .concat((d.weaknesses || []).map(function (w) { return '<span class="tag weak">▲ ' + w + "</span>"; }))
          .concat((d.resistances || []).map(function (r) { return '<span class="tag res">▼ ' + r + "</span>"; }))
          .join("");
        return (
          '<div class="beast-card ' + d.category + '">' +
          '<div class="beast-head"><b>' + d.name + "</b>" +
          '<span class="beast-cat">' + (EN.Bestiary.CATEGORY_LABEL[d.category] || d.category) + "</span></div>" +
          '<div class="beast-meta">' + d.habitat + " · abatidos: " + kills + "</div>" +
          '<div class="beast-lore">' + d.lore + "</div>" +
          (tags ? '<div class="beast-tags">' + tags + "</div>" : "") +
          "</div>"
        );
      })
      .join("");
  }

  /*
   * Registro de encontro. Chamado pelo jogo quando um inimigo aparece na
   * tela ou morre — é isso que enche o bestiário sem o jogador precisar
   * fazer nada. O ponto vermelho no botão do menu avisa que tem coisa
   * nova pra ler.
   */
  function recordSeen(defId, killed) {
    var pr = EN.State.data.progress;
    pr.seen = pr.seen || {};
    var isNew = !pr.seen[defId];
    if (isNew) pr.seen[defId] = { kills: 0 };
    if (killed) pr.seen[defId].kills++;
    if (isNew) {
      pr.menuNew = true;
      if (els["menu-dot"]) els["menu-dot"].classList.add("on");
    }
    return isNew;
  }

  function refreshBadge() {
    var pr = EN.State.data.progress;
    var dot = els["menu-dot"];
    if (!dot) return;
    // o ponto some quando o menu é aberto: ele é um "tem coisa nova",
    // não um contador permanente
    if (open) pr.menuNew = false;
    dot.classList.toggle("on", !!pr.menuNew || (pr.attrPoints || 0) > 0);
  }

  // ---------------------------------------------------------------
  // aba OPÇÕES
  // ---------------------------------------------------------------
  function wireOptions() {
    function syncMute() {
      els["opt-mute"].textContent = EN.Audio.isMuted() ? "Desligado" : "Ligado";
      els["opt-mute"].classList.toggle("off", EN.Audio.isMuted());
    }
    syncMute();
    tap(els["opt-mute"], function () {
      EN.Audio.unlock();
      var m = EN.Audio.setMuted(!EN.Audio.isMuted());
      EN.State.data.settings.muted = m;
      EN.State.persist();
      var hudBtn = document.getElementById("btn-mute");
      if (hudBtn) hudBtn.textContent = m ? "🔇" : "🔊";
      syncMute();
    });

    tap(els["opt-fullscreen"], function () {
      var el = document.documentElement;
      if (document.fullscreenElement) {
        document.exitFullscreen && document.exitFullscreen();
        els["opt-fullscreen"].textContent = "Ativar";
      } else if (el.requestFullscreen) {
        el.requestFullscreen().catch(function () {});
        els["opt-fullscreen"].textContent = "Desativar";
      }
    });

    // apagar progresso pede confirmação no próprio botão: um "Apagar"
    // de um toque só, num menu, é acidente esperando pra acontecer
    var armed = false,
      armTimer = null;
    tap(els["opt-reset"], function () {
      if (!armed) {
        armed = true;
        els["opt-reset"].textContent = "Tem certeza?";
        clearTimeout(armTimer);
        armTimer = setTimeout(function () {
          armed = false;
          els["opt-reset"].textContent = "Apagar";
        }, 3500);
        return;
      }
      EN.State.resetAll();
      location.reload();
    });
  }

  return {
    init: init,
    open: openMenu,
    close: close,
    toggle: toggle,
    isOpen: isOpen,
    recordSeen: recordSeen,
    refreshBadge: refreshBadge,
  };
})();
