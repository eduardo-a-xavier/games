window.EN = window.EN || {};

/*
 * Controles mobile: joystick virtual + botões baseados em ícone (sem texto
 * permanente). Ataque: toque = normal, segurar = carrega e solta um golpe
 * pesado (visual de carregamento no próprio botão + na animação do
 * personagem). Cooldowns são mostrados por escurecimento radial
 * (conic-gradient), nunca por números fixos sobre o botão.
 *
 * `EN.Controls.bind(ctx)` troca o "alvo" das ações (mundo principal vs.
 * arena de teste) sem duplicar a lógica de input — ver arena.js.
 */
EN.Controls = (function () {
  var joy = { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0, mag: 0, maxR: 44 };
  var ctx = null; // { player, enemies, dealDamage, spawnProjectile, isArena }
  var chargeHoldTimer = null;
  var holdStartT = 0;
  var els = {};

  function bind(newCtx) {
    ctx = newCtx;
  }

  function cacheEls() {
    [
      "joy-zone",
      "joy-base",
      "joy-knob",
      "btn-attack",
      "btn-dodge",
      "btn-skill1",
      "btn-skill2",
      "btn-context",
      "cd-attack",
      "cd-dodge",
      "cd-skill1",
      "charge-ring",
      "icon-skill1",
      "icon-skill2",
      "icon-context",
    ].forEach(function (id) {
      els[id] = document.getElementById(id);
    });
  }

  function init() {
    cacheEls();
    wireJoystick();
    wireButtons();
  }

  // O joystick escuta pointermove/pointerup no `document`, não na zona
  // pequena onde o toque começou. `setPointerCapture` deveria bastar
  // sozinho, mas alguns WebViews embutidos (ex.: visualizador de artefato
  // dentro de um app) não repassam o capture de forma confiável, e o dedo
  // "sai" da zona de 200px muito fácil — o resultado percebido é o
  // joystick "travando"/parando de responder no meio do arrasto. Rastrear
  // por `pointerId` no documento inteiro é o padrão robusto usado por
  // joysticks virtuais em geral e não depende de capture funcionar.
  function wireJoystick() {
    var zone = els["joy-zone"];
    var watchdog = null;

    zone.addEventListener(
      "pointerdown",
      function (e) {
        if (joy.active) return;
        e.preventDefault();
        joy.active = true;
        joy.id = e.pointerId;
        joy.lastMoveT = performance.now();
        var rect = zone.getBoundingClientRect();
        joy.cx = e.clientX;
        joy.cy = e.clientY;
        els["joy-base"].style.left = e.clientX - rect.left - 50 + "px";
        els["joy-base"].style.bottom = rect.bottom - e.clientY - 50 + "px";
        els["joy-base"].classList.add("active");
        document.addEventListener("pointermove", onJoyMove, { passive: false });
        document.addEventListener("pointerup", forceEnd);
        document.addEventListener("pointercancel", forceEnd);
        window.addEventListener("blur", forceEnd);
        document.addEventListener("visibilitychange", forceEnd);
        // watchdog: se por algum motivo nenhum evento de soltar chegar
        // (alguns WebViews embutidos trocam/perdem o pointerId no meio do
        // gesto), o joystick nunca pode ficar "preso andando sozinho" —
        // sem movimento novo por meio segundo, soltamos sozinhos.
        watchdog = setInterval(function () {
          if (joy.active && performance.now() - joy.lastMoveT > 500) forceEnd();
        }, 200);
      },
      { passive: false }
    );

    function onJoyMove(e) {
      if (!joy.active || e.pointerId !== joy.id) return;
      e.preventDefault();
      joy.lastMoveT = performance.now();
      var dx = e.clientX - joy.cx,
        dy = e.clientY - joy.cy;
      var d = Math.hypot(dx, dy);
      var m = Math.min(d, joy.maxR);
      var ang = Math.atan2(dy, dx);
      var kx = Math.cos(ang) * m,
        ky = Math.sin(ang) * m;
      els["joy-knob"].style.transform = "translate(" + (kx - 22) + "px," + (ky - 22) + "px)";
      joy.dx = d > 0 ? dx / d : 0;
      joy.dy = d > 0 ? dy / d : 0;
      joy.mag = m / joy.maxR;
    }

    // Não exigimos mais o mesmo pointerId pra ENCERRAR o toque (só pra
    // movê-lo) — só existe um joystick ativo por vez de qualquer forma, e
    // um WebView que troca o id do dedo no meio do gesto não pode deixar
    // o personagem andando sozinho pra sempre. Preferimos soltar cedo
    // demais (raríssimo) a nunca soltar (péssimo).
    function forceEnd() {
      if (!joy.active) return;
      joy.active = false;
      joy.id = null;
      joy.dx = 0;
      joy.dy = 0;
      joy.mag = 0;
      els["joy-base"].classList.remove("active");
      els["joy-knob"].style.transform = "translate(-50%,-50%)";
      clearInterval(watchdog);
      document.removeEventListener("pointermove", onJoyMove);
      document.removeEventListener("pointerup", forceEnd);
      document.removeEventListener("pointercancel", forceEnd);
      window.removeEventListener("blur", forceEnd);
      document.removeEventListener("visibilitychange", forceEnd);
    }
  }

  function getMoveVector() {
    return { x: joy.dx * joy.mag, y: joy.dy * joy.mag };
  }

  function pressFx(btn) {
    btn.classList.add("pressed");
    setTimeout(function () {
      btn.classList.remove("pressed");
    }, 140);
  }

  // mesmo raciocínio do joystick: o fim do toque (pointerup/cancel) é
  // ouvido no `document`, nunca só no botão, porque o dedo pode deslizar
  // um pouco durante o "segurar para carregar" e não podemos arriscar um
  // ataque carregado que nunca solta por falta do evento de soltar.
  function wireButtons() {
    var atk = els["btn-attack"];
    var atkDown = false;
    atk.addEventListener(
      "pointerdown",
      function (e) {
        e.preventDefault();
        if (atkDown) return;
        atkDown = true;
        holdStartT = performance.now();
        clearTimeout(chargeHoldTimer);
        chargeHoldTimer = setTimeout(function () {
          if (!ctx) return;
          EN.Player.startCharge(ctx.player);
          atk.classList.add("charging");
        }, 150);
        document.addEventListener("pointerup", onAtkEnd);
        document.addEventListener("pointercancel", onAtkEnd);
        window.addEventListener("blur", onAtkEnd);
        document.addEventListener("visibilitychange", onAtkEnd);
      },
      { passive: false }
    );
    // igual ao joystick: qualquer sinal de "soltou" encerra, sem exigir o
    // mesmo pointerId -- um ataque carregado que trava pra sempre é o pior
    // resultado possível aqui
    function onAtkEnd() {
      if (!atkDown) return;
      atkDown = false;
      document.removeEventListener("pointerup", onAtkEnd);
      document.removeEventListener("pointercancel", onAtkEnd);
      window.removeEventListener("blur", onAtkEnd);
      document.removeEventListener("visibilitychange", onAtkEnd);
      clearTimeout(chargeHoldTimer);
      if (!ctx) return;
      var held = performance.now() - holdStartT;
      atk.classList.remove("charging");
      var res;
      if (ctx.player.charging) {
        res = EN.Player.releaseCharge(ctx.player, ctx.enemies, ctx.dealDamage);
        if (res) spawnSlash(ctx.player, true);
      } else if (held < 500) {
        res = EN.Player.tapAttack(ctx.player, ctx.enemies, ctx.dealDamage);
        if (res) spawnSlash(ctx.player, false);
      }
      pressFx(atk);
    }

    // arco de espada visível todo golpe -- acertando ou não -- pra sempre
    // ficar claro que o toque de ataque realmente executou
    function spawnSlash(player, heavy) {
      if (!ctx.spawnFx) return;
      ctx.spawnFx("slash", { x: player.x, y: player.y, fx: player.facing.x, fy: player.facing.y, heavy: heavy });
    }

    els["btn-dodge"].addEventListener(
      "pointerdown",
      function (e) {
        e.preventDefault();
        if (!ctx) return;
        EN.Player.dodge(ctx.player);
        pressFx(els["btn-dodge"]);
      },
      { passive: false }
    );

    els["btn-skill1"].addEventListener(
      "pointerdown",
      function (e) {
        e.preventDefault();
        if (!ctx) return;
        var res = EN.Player.useSkill1(ctx.player, ctx.enemies, ctx.dealDamage);
        if (res && res.projectile) ctx.spawnProjectile(res.projectile);
        if (res && (res.type === "melee" || res.type === "melee_heavy")) spawnSlash(ctx.player, res.type === "melee_heavy");
        pressFx(els["btn-skill1"]);
      },
      { passive: false }
    );

    els["btn-context"].addEventListener(
      "pointerdown",
      function (e) {
        e.preventDefault();
        if (!ctx) return;
        var target = EN.Interactable.findNearest(ctx.player.x, ctx.player.y);
        if (target) target.onInteract(target);
        pressFx(els["btn-context"]);
      },
      { passive: false }
    );
  }

  // cor de destaque por classe, só para dar identidade visual ao botão de
  // habilidade 1 (inspirado no padrão de "ícone colorido por elemento" de
  // ARPGs mobile em geral, sem copiar a paleta de nenhum jogo específico)
  var CLASS_ACCENT = {
    guerreiro: "#e0633a",
    mateiro: "#5bb26a",
    encantado: "#a97bf2",
  };

  function refreshVisuals(p) {
    if (!p) return;
    setCooldownRing("cd-attack", p.charging ? 0 : p.cd.basic / EN.Classes.universalAttack.basic.cooldown);
    setCooldownRing("cd-dodge", p.cd.dodge / EN.Player.CD_MAX.dodge);
    var ab1 = p.classDef && p.classDef.abilities[0];
    if (ab1) {
      els["btn-skill1"].classList.remove("locked");
      els["btn-skill1"].classList.add("has-accent");
      els["btn-skill1"].style.setProperty("--accent", CLASS_ACCENT[p.classId] || "var(--ipe-dim)");
      els["icon-skill1"].textContent = ab1.icon;
      setCooldownRing("cd-skill1", p.cd.skill1 / ab1.cooldown);
    } else {
      els["btn-skill1"].classList.add("locked");
      els["btn-skill1"].classList.remove("has-accent");
      els["icon-skill1"].textContent = "🔒";
    }
    // habilidade 2 reservada para futuras especializações (ver GDD Seção 11/12)
    els["btn-skill2"].classList.add("locked");
    els["icon-skill2"].textContent = "🔒";

    if (p.charging) {
      els["charge-ring"].style.setProperty("--charge", p.chargeT * 100 + "%");
      els["btn-attack"].classList.add("charging");
    } else {
      els["btn-attack"].classList.remove("charging");
    }

    var target = EN.Interactable.findNearest(p.x, p.y);
    var cbtn = els["btn-context"];
    if (target) {
      cbtn.classList.add("visible");
      els["icon-context"].textContent = target.icon;
    } else {
      cbtn.classList.remove("visible");
    }
  }

  function setCooldownRing(id, pct) {
    var el = els[id];
    if (!el) return;
    el.style.setProperty("--pct", Math.max(0, Math.min(1, pct)) * 100 + "%");
  }

  return { init: init, bind: bind, getMoveVector: getMoveVector, refreshVisuals: refreshVisuals };
})();
