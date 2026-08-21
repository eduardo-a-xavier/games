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
  var joy = { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0, mag: 0, maxR: 32 };
  var ctx = null; // { player, enemies, dealDamage, spawnProjectile, isArena }
  var chargeHoldTimer = null;
  var holdStartT = 0;
  var els = {};

  // teclado: vetor de movimento independente do joystick
  var keys = { up: false, down: false, left: false, right: false };
  var mouseAtkDown = false;
  var mouseHoldTimer = null;
  var mouseHoldStartT = 0;

  /*
   * MIRA PELO CURSOR. `aim` guarda o ponto mirado em coordenadas de MUNDO
   * (não de tela) — assim a mira continua correta enquanto a câmera anda,
   * mesmo sem o mouse se mexer.
   *
   * `aimActive` liga no primeiro movimento de mouse e DESLIGA em qualquer
   * toque: num celular não existe cursor, e deixar uma mira fantasma
   * travaria a direção do personagem no último ponto tocado.
   */
  var aim = { x: 0, y: 0, sx: 0, sy: 0 };
  var aimActive = false;
  /*
   * Navegadores de celular EMULAM mousemove/mouseenter logo depois de um
   * toque. Sem essa trava, tocar na tela ligaria a mira e travaria a
   * direção do personagem no ponto tocado — exatamente o oposto do que o
   * jogador quis. Qualquer toque bloqueia a mira por um instante, o que
   * cobre a rajada de eventos emulados sem atrapalhar um mouse de verdade
   * (que nunca dispara touchstart).
   */
  var lastTouchT = -1e9;
  var TOUCH_BLOCK_MS = 900;

  function bind(newCtx) {
    ctx = newCtx;
  }

  // A lista de inimigos é RECRIADA a cada quadro em main.js (filter dos
  // mortos), então guardar a referência recebida no bind() daria uma
  // lista velha — auto-mira e esquiva perfeita passariam a olhar pra
  // inimigos que já sumiram. Sempre lê a lista atual da sessão.
  function liveEnemies() {
    if (!ctx) return [];
    return (ctx.session && ctx.session.enemies) || ctx.enemies || [];
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
      "cd-skill2",
      "charge-ring",
      "icon-skill1",
      "icon-skill2",
      "icon-context",
      "btn-heal",
      "heal-count",
      "combo-meter",
      "combo-text",
    ].forEach(function (id) {
      els[id] = document.getElementById(id);
    });
  }

  function init() {
    cacheEls();
    wireJoystick();
    wireButtons();
    wireKeyboard();
    wireMouse();
  }

  /*
   * Joystick FIXO. A base mora sempre no mesmo canto e o centro dela é a
   * referência da direção — antes a base nascia onde o dedo encostasse, o
   * que obriga a olhar pro canto da tela antes de andar. Fixa, o polegar
   * decora o lugar.
   *
   * Continua analógico apesar das setas: a direção vem do vetor entre o
   * centro da base e o dedo, então encostar direto numa seta já anda
   * naquele sentido, e arrastar dá as diagonais e a diferença entre andar
   * e correr — coisas que um D-pad de quatro botões não daria.
   *
   * O joystick escuta pointermove/pointerup no `document`, não na zona
   * pequena onde o toque começou. `setPointerCapture` deveria bastar
   * sozinho, mas alguns WebViews embutidos (ex.: visualizador de artefato
   * dentro de um app) não repassam o capture de forma confiável, e o dedo
   * "sai" da zona muito fácil — o resultado percebido é o joystick
   * "travando" no meio do arrasto. Rastrear por `pointerId` no documento
   * inteiro é o padrão robusto e não depende de capture funcionar.
   */
  function wireJoystick() {
    var zone = els["joy-zone"];

    function baseCenter() {
      var r = els["joy-base"].getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    zone.addEventListener(
      "pointerdown",
      function (e) {
        if (joy.active) return;
        e.preventDefault();
        joy.active = true;
        joy.id = e.pointerId;
        joy.lastMoveT = performance.now();
        var c = baseCenter();
        joy.cx = c.x;
        joy.cy = c.y;
        els["joy-base"].classList.add("active");
        applyVector(e.clientX, e.clientY);
        document.addEventListener("pointermove", onJoyMove, { passive: false });
        document.addEventListener("pointerup", forceEnd);
        document.addEventListener("pointercancel", forceEnd);
        window.addEventListener("blur", forceEnd);
        document.addEventListener("visibilitychange", forceEnd);
        document.addEventListener("lostpointercapture", forceEnd);
      },
      { passive: false }
    );

    function applyVector(clientX, clientY) {
      var dx = clientX - joy.cx,
        dy = clientY - joy.cy;
      var d = Math.hypot(dx, dy);
      var m = Math.min(d, joy.maxR);
      var ang = Math.atan2(dy, dx);
      els["joy-knob"].style.transform = "translate(" + Math.cos(ang) * m + "px," + Math.sin(ang) * m + "px)";
      joy.dx = d > 0 ? dx / d : 0;
      joy.dy = d > 0 ? dy / d : 0;
      // uma zona morta pequena evita que encostar no centro da base já
      // faça o personagem sair andando de leve pra algum lado
      joy.mag = d < 8 ? 0 : m / joy.maxR;
      litArrows();
    }

    function litArrows() {
      var lit = { up: false, down: false, left: false, right: false };
      if (joy.mag > 0.2) {
        if (Math.abs(joy.dx) > 0.38) lit[joy.dx < 0 ? "left" : "right"] = true;
        if (Math.abs(joy.dy) > 0.38) lit[joy.dy < 0 ? "up" : "down"] = true;
      }
      arrowEls.forEach(function (el) {
        el.classList.toggle("lit", !!lit[el.dataset.dir]);
      });
    }

    var arrowEls = [];
    ["up", "down", "left", "right"].forEach(function (dir) {
      var el = els["joy-base"].querySelector(".joy-arrow." + dir);
      if (el) {
        el.dataset.dir = dir;
        arrowEls.push(el);
      }
    });

    function onJoyMove(e) {
      if (!joy.active || e.pointerId !== joy.id) return;
      e.preventDefault();
      joy.lastMoveT = performance.now();
      applyVector(e.clientX, e.clientY);
    }

    /*
     * Não exigimos o mesmo pointerId pra ENCERRAR o toque (só pra movê-lo):
     * só existe um joystick ativo por vez, e um WebView que troca o id do
     * dedo no meio do gesto não pode deixar o personagem andando sozinho
     * pra sempre. Era esse o bug do "joystick andando sozinho", e é essa
     * aceitação de qualquer sinal de soltura que o corrige.
     *
     * Existia também um watchdog que soltava o joystick após meio segundo
     * sem movimento. Ele foi removido junto com a mudança pra base fixa:
     * com joystick flutuante ninguém segura o dedo imóvel, mas com base
     * fixa segurar parado numa seta é o uso NORMAL — o timer cortaria a
     * caminhada a cada meio segundo. O papel dele fica com os eventos de
     * soltura acima, incluindo lostpointercapture.
     */
    function forceEnd() {
      if (!joy.active) return;
      joy.active = false;
      joy.id = null;
      joy.dx = 0;
      joy.dy = 0;
      joy.mag = 0;
      els["joy-base"].classList.remove("active");
      els["joy-knob"].style.transform = "translate(0,0)";
      arrowEls.forEach(function (el) {
        el.classList.remove("lit");
      });
      document.removeEventListener("pointermove", onJoyMove);
      document.removeEventListener("pointerup", forceEnd);
      document.removeEventListener("pointercancel", forceEnd);
      window.removeEventListener("blur", forceEnd);
      document.removeEventListener("visibilitychange", forceEnd);
      document.removeEventListener("lostpointercapture", forceEnd);
    }
  }

  // ── TECLADO ──────────────────────────────────────────────────────────────
  function wireKeyboard() {
    var MAP = {
      KeyW: "up", ArrowUp: "up",
      KeyS: "down", ArrowDown: "down",
      KeyA: "left", ArrowLeft: "left",
      KeyD: "right", ArrowRight: "right",
    };

    document.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (MAP[e.code]) { keys[MAP[e.code]] = true; e.preventDefault(); return; }

      if (!ctx) return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          var res = EN.Player.dodge(ctx.player, liveEnemies());
          if (res) {
            EN.Audio.play(res.perfect ? "perfect" : "dodge");
            if (res.perfect && ctx.spawnFx) ctx.spawnFx("perfect", { x: ctx.player.x, y: ctx.player.y });
          }
          pressFx(els["btn-dodge"]);
          break;
        case "KeyE": case "KeyF":
          e.preventDefault();
          var target = EN.Interactable.findNearest(ctx.player.x, ctx.player.y);
          if (target) target.onInteract(target);
          pressFx(els["btn-context"]);
          break;
        case "KeyQ":
          e.preventDefault();
          var r1 = EN.Player.useSkill1(ctx.player, liveEnemies(), ctx.dealDamage);
          if (r1 && r1.projectile) ctx.spawnProjectile(r1.projectile);
          if (r1 && (r1.type === "melee" || r1.type === "melee_heavy")) spawnSlashKb(ctx.player, r1.type === "melee_heavy");
          if (r1) EN.Audio.play(r1.type === "projectile_magic" ? "magic" : r1.type === "projectile" ? "shot" : "swingHeavy");
          pressFx(els["btn-skill1"]);
          break;
        case "KeyR":
          e.preventDefault();
          var r2 = EN.Player.useSkill2(ctx.player, liveEnemies(), ctx.dealDamage);
          if (r2) {
            if (r2.projectile) ctx.spawnProjectile(r2.projectile);
            if (r2.projectiles) r2.projectiles.forEach(ctx.spawnProjectile);
            if (r2.type === "melee_heavy" || r2.type === "melee") spawnSlashKb(ctx.player, true, false);
            if (r2.type === "trap" && ctx.spawnFx) ctx.spawnFx("shock", { x: ctx.player.x, y: ctx.player.y, radius: r2.radius, friendly: true });
            EN.Audio.play(r2.type === "parry" ? "ui" : r2.type === "shield" ? "magic" : r2.type === "trap" ? "dodge" : r2.type === "projectile_magic" ? "magic" : r2.type === "projectile_multi" ? "shot" : "swingHeavy");
          }
          pressFx(els["btn-skill2"]);
          break;
        case "KeyH":
          e.preventDefault();
          if (EN.Player.useHeal(ctx.player)) {
            EN.Audio.play("heal");
            if (ctx.spawnFx) ctx.spawnFx("hit", { x: ctx.player.x, y: ctx.player.y });
            if (ctx.toast) ctx.toast("Você bebeu um preparo de ervas.");
          } else if (ctx.toast && ctx.player.healCharges <= 0) {
            ctx.toast("Sem preparos de cura.");
          }
          pressFx(els["btn-heal"]);
          break;
      }
    });

    document.addEventListener("keyup", function (e) {
      if (MAP[e.code]) { keys[MAP[e.code]] = false; e.preventDefault(); }
    });

    // solta tudo se janela perde foco
    window.addEventListener("blur", function () {
      keys.up = keys.down = keys.left = keys.right = false;
    });
  }

  function spawnSlashKb(player, heavy, finisher) {
    if (!ctx || !ctx.spawnFx) return;
    ctx.spawnFx("slash", { x: player.x, y: player.y, fx: player.facing.x, fy: player.facing.y, heavy: !!heavy, finisher: !!finisher });
  }

  // ── MOUSE (mira pelo cursor + ataque no clique esquerdo) ─────────────────
  function wireMouse() {
    var canvas = document.getElementById("world-canvas");
    if (!canvas) return;

    // o cursor vira ponto de mira em coordenadas de mundo. A conversão
    // depende da câmera, então quem sabe fazê-la é o main (que tem o
    // viewport e o zoom) — aqui só guardamos o resultado.
    function trackAim(e) {
      if (performance.now() - lastTouchT < TOUCH_BLOCK_MS) return;
      aim.sx = e.clientX;
      aim.sy = e.clientY;
      var w = EN.Main.screenToWorld(e.clientX, e.clientY);
      if (!w) return;
      aim.x = w.x;
      aim.y = w.y;
      aimActive = true;
    }
    canvas.addEventListener("mousemove", trackAim);
    canvas.addEventListener("mouseenter", trackAim);
    canvas.addEventListener("mouseleave", function () { aimActive = false; });
    // dedo na tela = sem cursor: a mira sai de cena e a direção volta a
    // vir do movimento + auto-mira
    document.addEventListener(
      "touchstart",
      function () {
        lastTouchT = performance.now();
        aimActive = false;
      },
      { passive: true }
    );

    canvas.addEventListener("mousedown", function (e) {
      trackAim(e);
      if (e.button !== 0) return;
      if (mouseAtkDown) return;
      mouseAtkDown = true;
      mouseHoldStartT = performance.now();
      clearTimeout(mouseHoldTimer);
      mouseHoldTimer = setTimeout(function () {
        if (!ctx) return;
        EN.Player.startCharge(ctx.player);
        els["btn-attack"].classList.add("charging");
      }, 150);
      document.addEventListener("mouseup", onMouseAtkEnd);
      window.addEventListener("blur", onMouseAtkEnd);
    });

    function onMouseAtkEnd() {
      if (!mouseAtkDown) return;
      mouseAtkDown = false;
      document.removeEventListener("mouseup", onMouseAtkEnd);
      window.removeEventListener("blur", onMouseAtkEnd);
      clearTimeout(mouseHoldTimer);
      if (!ctx) return;
      var held = performance.now() - mouseHoldStartT;
      els["btn-attack"].classList.remove("charging");
      var res;
      if (ctx.player.charging) {
        res = EN.Player.releaseCharge(ctx.player, liveEnemies(), ctx.dealDamage);
        if (res) { spawnSlashKb(ctx.player, true, false); EN.Audio.play("swingHeavy"); }
      } else if (held < 500) {
        res = EN.Player.tapAttack(ctx.player, liveEnemies(), ctx.dealDamage);
        if (res) { spawnSlashKb(ctx.player, false, res.finisher); EN.Audio.play(res.finisher ? "swingHeavy" : "swing"); }
      }
      pressFx(els["btn-attack"]);
    }

    // botão direito do mouse = esquiva
    canvas.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      if (!ctx) return;
      var res = EN.Player.dodge(ctx.player, liveEnemies());
      if (res) {
        EN.Audio.play(res.perfect ? "perfect" : "dodge");
        if (res.perfect && ctx.spawnFx) ctx.spawnFx("perfect", { x: ctx.player.x, y: ctx.player.y });
      }
      pressFx(els["btn-dodge"]);
    });
  }

  /*
   * Ponto de mira atual em coordenadas de mundo, ou null quando não há
   * cursor (celular). Reconverte a partir da posição de TELA guardada a
   * cada chamada porque a câmera se move sozinha: com o mouse parado, o
   * mesmo pixel da tela é um ponto do mundo diferente a cada quadro.
   */
  function getAim() {
    if (!aimActive) return null;
    var w = EN.Main.screenToWorld(aim.sx, aim.sy);
    if (w) {
      aim.x = w.x;
      aim.y = w.y;
    }
    return { x: aim.x, y: aim.y };
  }

  function getMoveVector() {
    // teclado tem prioridade quando alguma tecla está pressionada
    var kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    var ky = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (kx !== 0 || ky !== 0) {
      var kd = Math.hypot(kx, ky);
      return { x: kx / kd, y: ky / kd };
    }
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
        res = EN.Player.releaseCharge(ctx.player, liveEnemies(), ctx.dealDamage);
        if (res) {
          spawnSlash(ctx.player, true, false);
          EN.Audio.play("swingHeavy");
        }
      } else if (held < 500) {
        res = EN.Player.tapAttack(ctx.player, liveEnemies(), ctx.dealDamage);
        if (res) {
          spawnSlash(ctx.player, false, res.finisher);
          EN.Audio.play(res.finisher ? "swingHeavy" : "swing");
        }
      }
      pressFx(atk);
    }

    // arco de espada visível todo golpe -- acertando ou não -- pra sempre
    // ficar claro que o toque de ataque realmente executou
    function spawnSlash(player, heavy, finisher) {
      if (!ctx.spawnFx) return;
      ctx.spawnFx("slash", {
        x: player.x,
        y: player.y,
        fx: player.facing.x,
        fy: player.facing.y,
        heavy: heavy,
        finisher: !!finisher,
      });
    }

    els["btn-dodge"].addEventListener(
      "pointerdown",
      function (e) {
        e.preventDefault();
        if (!ctx) return;
        var res = EN.Player.dodge(ctx.player, liveEnemies());
        if (res) {
          EN.Audio.play(res.perfect ? "perfect" : "dodge");
          if (res.perfect && ctx.spawnFx) ctx.spawnFx("perfect", { x: ctx.player.x, y: ctx.player.y });
        }
        pressFx(els["btn-dodge"]);
      },
      { passive: false }
    );

    els["btn-heal"].addEventListener(
      "pointerdown",
      function (e) {
        e.preventDefault();
        if (!ctx) return;
        if (EN.Player.useHeal(ctx.player)) {
          EN.Audio.play("heal");
          if (ctx.spawnFx) ctx.spawnFx("hit", { x: ctx.player.x, y: ctx.player.y });
          if (ctx.toast) ctx.toast("Você bebeu um preparo de ervas.");
        } else if (ctx.toast && ctx.player.healCharges <= 0) {
          ctx.toast("Sem preparos de cura.");
        }
        pressFx(els["btn-heal"]);
      },
      { passive: false }
    );

    els["btn-skill1"].addEventListener(
      "pointerdown",
      function (e) {
        e.preventDefault();
        if (!ctx) return;
        var res = EN.Player.useSkill1(ctx.player, liveEnemies(), ctx.dealDamage);
        if (res && res.projectile) ctx.spawnProjectile(res.projectile);
        if (res && (res.type === "melee" || res.type === "melee_heavy")) spawnSlash(ctx.player, res.type === "melee_heavy");
        if (res) EN.Audio.play(res.type === "projectile_magic" ? "magic" : res.type === "projectile" ? "shot" : "swingHeavy");
        pressFx(els["btn-skill1"]);
      },
      { passive: false }
    );

    els["btn-skill2"].addEventListener(
      "pointerdown",
      function (e) {
        e.preventDefault();
        if (!ctx) return;
        var res = EN.Player.useSkill2(ctx.player, liveEnemies(), ctx.dealDamage);
        if (res) {
          if (res.projectile) ctx.spawnProjectile(res.projectile);
          if (res.projectiles) res.projectiles.forEach(ctx.spawnProjectile);
          if (res.type === "melee_heavy" || res.type === "melee") spawnSlash(ctx.player, true, false);
          if (res.type === "trap" && ctx.spawnFx) {
            ctx.spawnFx("shock", { x: ctx.player.x, y: ctx.player.y, radius: res.radius, friendly: true });
          }
          EN.Audio.play(
            res.type === "parry" ? "ui" : res.type === "shield" ? "magic" : res.type === "trap" ? "dodge" : res.type === "projectile_magic" ? "magic" : res.type === "projectile_multi" ? "shot" : "swingHeavy"
          );
        }
        pressFx(els["btn-skill2"]);
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
    // habilidade 2 = talento escolhido no nível 5 (GDD Seção 11)
    var ab2 = p.skill2Def;
    if (ab2) {
      els["btn-skill2"].classList.remove("locked");
      els["btn-skill2"].classList.add("has-accent");
      els["btn-skill2"].style.setProperty("--accent", CLASS_ACCENT[p.classId] || "var(--ipe-dim)");
      els["icon-skill2"].textContent = ab2.icon;
      setCooldownRing("cd-skill2", p.cd.skill2 / ab2.cooldown);
    } else {
      els["btn-skill2"].classList.add("locked");
      els["btn-skill2"].classList.remove("has-accent");
      els["icon-skill2"].textContent = "🔒";
    }

    if (p.charging) {
      els["charge-ring"].style.setProperty("--charge", p.chargeT * 100 + "%");
      els["btn-attack"].classList.add("charging");
    } else {
      els["btn-attack"].classList.remove("charging");
    }

    if (els["heal-count"]) els["heal-count"].textContent = p.healCharges;
    if (els["btn-heal"]) els["btn-heal"].classList.toggle("empty", p.healCharges <= 0);

    // medidor da sequência de golpes: mostra em que passo o jogador está
    // e some sozinho quando a janela fecha, ensinando o ritmo sem tutorial
    var meter = els["combo-meter"];
    if (meter) {
      if (p.comboT > 0 && p.combo > 0) {
        meter.classList.add("visible");
        els["combo-text"].textContent = "GOLPE " + (p.combo + 1) + "/" + EN.Player.COMBO_LEN;
        meter.classList.toggle("ready", p.combo === EN.Player.COMBO_LEN - 1);
      } else {
        meter.classList.remove("visible");
      }
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

  return { init: init, bind: bind, getMoveVector: getMoveVector, getAim: getAim, refreshVisuals: refreshVisuals };
})();
