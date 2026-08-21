window.EN = window.EN || {};

/*
 * Orquestrador: telas (criação de personagem, mundo, Despertar, seleção de
 * classe, arena, mina) e o loop de jogo genérico que roda qualquer sessão —
 * mundo principal, mina ou arena têm todas o mesmo formato, então
 * update()/render() não sabem qual delas está ativa.
 *
 * Também é aqui que o tempo do jogo passa por EN.Combat.consumeFrame(): o
 * hitstop e a câmera lenta da esquiva perfeita afetam o mundo inteiro, e
 * concentrar isso num ponto só evita que algum sistema continue rodando em
 * velocidade normal durante o congelamento.
 */
EN.Main = (function () {
  var canvas, ctx, dpr, vw, vh;
  var currentSession = null;
  var mainSession = null; // referência estável ao mundo principal — arena/mina nunca a sobrescrevem
  var paused = true;
  var last = performance.now();
  var deathT = -1;

  function boot() {
    canvas = document.getElementById("world-canvas");
    ctx = canvas.getContext("2d");
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    resize();
    wireResize();

    EN.Controls.init();
    wireToast();
    wireDespertarScreen();
    wireDeathScreen();
    wireLandscapeLock();

    EN.Story.init({
      toast: toast,
      refreshTracker: refreshQuestTracker,
    });

    if (EN.State.hasProfile()) {
      startMainWorld();
    } else {
      EN.CharCreation.open(function () {
        startMainWorld();
      });
    }

    requestAnimationFrame(loop);
  }

  // Encantaria é desenhado para paisagem (ver docs/GDD.md "UX MOBILE"). Em
  // navegadores/contextos que permitem, o primeiro toque tenta fullscreen +
  // travar a orientação; onde isso não é permitido (ex.: dentro de um
  // iframe sem permissão), o CSS de #rotate-prompt garante que o jogo só
  // aparece quando o aparelho já está em paisagem — nunca deixa o jogador
  // preso num layout espremido.
  function wireLandscapeLock() {
    document.addEventListener(
      "pointerdown",
      function () {
        try {
          var el = document.documentElement;
          var req = el.requestFullscreen || el.webkitRequestFullscreen;
          var fsPromise = req ? req.call(el) : Promise.resolve();
          Promise.resolve(fsPromise)
            .then(function () {
              return screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape");
            })
            .catch(function () {});
        } catch (e) {}
      },
      { once: true }
    );
  }

  // Alguns navegadores/WebViews não disparam 'resize' de forma confiável
  // ao girar o aparelho (ou disparam com as dimensões ainda desatualizadas
  // por um instante) -- era isso que deixava o jogo "preso num
  // quadradinho" depois de virar pra paisagem. Escutamos todo evento
  // plausível, com uma segunda checagem atrasada depois de girar, e ainda
  // mantemos um relógio de segurança comparando o tamanho real da janela
  // contra o que o canvas acha que é, corrigindo sozinho se ficarem
  // diferentes por qualquer motivo.
  function wireResize() {
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", function () {
      resize();
      setTimeout(resize, 120);
      setTimeout(resize, 400);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", resize);
    }
    if (screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener("change", function () {
        setTimeout(resize, 60);
      });
    }
    setInterval(function () {
      if (canvas.width !== Math.round(window.innerWidth * dpr) || canvas.height !== Math.round(window.innerHeight * dpr)) {
        resize();
      }
    }, 500);
  }

  function resize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;
    canvas.style.width = vw + "px";
    canvas.style.height = vh + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  // ---------- sessão do mundo principal ----------
  function startMainWorld() {
    document.getElementById("screen-game").classList.add("active");
    var save = EN.State.data;
    var appearance = save.profile.appearance;
    var player = EN.Player.create(appearance, save.progress.classId, save.world.x, save.world.y, save.progress.level);
    player.healCharges = save.world.inventory.curas;

    var session = {
      isArena: false,
      isMine: false,
      player: player,
      enemies: EN.World.spawnInitialEnemies(),
      coins: [],
      projectiles: [],
      enemyProjectiles: [],
      fx: [],
      worldCanvas: EN.World.bake(),
      worldW: EN.World.WORLD_W,
      worldH: EN.World.WORLD_H,
      camera: EN.Camera.create(player.x, player.y),
      meta: save.world,
      areaName: "Sítio",
      showNpcs: true,
    };

    EN.World.populate({
      onDespertar: handleDespertarTrigger,
      onTalkNpc: handleTalkNpc,
      onSay: handleSay,
      onOpenChest: handleOpenChest,
      onPickupItem: handlePickupItem,
      onCropInteract: handleCropInteract,
      onEnterMine: handleEnterMine,
    });
    mainSession = session;
    setSession(session);
    refreshQuestTracker();

    // se o Despertar já aconteceu mas por algum motivo nenhuma classe foi
    // confirmada (estado inconsistente improvável, mas tratado com
    // segurança), reabre a seleção direto, sem repetir a narrativa
    if (save.progress.despertarSeen && !save.progress.classId) {
      openClassSelect();
    }
  }

  function handleTalkNpc(npcId) {
    EN.Story.talkTo(npcId);
  }

  function handleDespertarTrigger() {
    var save = EN.State.data;
    if (save.progress.despertarSeen) {
      toast("As raízes negras continuam ali, silenciosas.");
      return;
    }
    EN.Story.flag("raiz_tocada");
    EN.Story.playDespertarVision(function () {
      playDespertarSequence();
    });
  }

  function handleSay(id) {
    var lines = {
      porta: "A porta está fechada por enquanto — ninguém em casa.",
      saci: "Um redemoinho de folhas passa por você, rindo. Não parece querer briga.",
    };
    toast(lines[id] || "...");
  }

  function handleOpenChest() {
    EN.State.data.world.vintem += 12;
    EN.State.persist();
    toast("Baú aberto: +12 Vintém");
  }

  function handlePickupItem() {
    EN.State.data.world.vintem += 3;
    EN.State.persist();
    toast("Você pegou uma Erva Selvagem (+3 Vintém em feira futura)");
  }

  function handleCropInteract() {
    toast("Ainda não há ferramenta de plantio — Agricultura chega em breve.");
  }

  // ---------- Mina Santa Luzia ----------
  function handleEnterMine() {
    if (!EN.State.data.progress.classId) {
      toast("Você não entraria aí do jeito que está. Ainda não.");
      return;
    }
    var s = EN.Mine.enter(mainSession, {
      onExit: function () {
        toast("Você volta pra luz do sol.");
        refreshQuestTracker();
      },
      onBossStart: function () {
        EN.Story.reachArea("camara");
        EN.Story.playBossIntro(function () {});
      },
      onBossPhase: function (phase) {
        toast("O Carcará muda de postura — fase " + phase);
      },
      onBossDefeated: function () {
        EN.Story.flag("boss_morto");
        EN.Story.playBossDefeat(function () {});
      },
    });
    EN.Story.reachArea("mina");
    refreshQuestTracker();
    return s;
  }

  // ---------- O Despertar ----------
  function wireDespertarScreen() {
    document.getElementById("desp-continue").addEventListener("click", function () {
      document.getElementById("screen-despertar").classList.remove("active");
      openClassSelect();
    });
  }

  function playDespertarSequence() {
    paused = true;
    document.getElementById("screen-despertar").classList.add("active");
  }

  function openClassSelect() {
    document.getElementById("screen-game").classList.remove("active");
    var appearance = EN.State.data.profile.appearance;
    EN.ClassSelect.open(appearance, function (classId) {
      confirmClass(classId, appearance);
    });
  }

  // SEMPRE aplica a classe em `mainSession` — nunca na sessão ativa no
  // momento, porque se o jogador confirmou a partir da arena, a sessão
  // ativa é a temporária da arena (ver arena.js), e escolher a classe ali
  // não pode virar progresso permanente no lugar errado.
  function confirmClass(classId, appearance) {
    EN.State.data.progress.despertarSeen = true;
    EN.State.data.progress.classId = classId;
    EN.State.persist();
    document.getElementById("screen-classselect").classList.remove("active");
    document.getElementById("screen-game").classList.add("active");
    EN.Player.applyClass(mainSession.player, classId, true, EN.State.data.progress.level);
    toast("Você agora é " + EN.Classes.getById(classId).name + "!");
    setSession(mainSession);
    EN.Story.flag("classe_escolhida");
    refreshQuestTracker();
  }

  // chamado pela arena quando o jogador toca "ESCOLHER ESTA CLASSE"
  function confirmClassFromArena(classId, appearance) {
    confirmClass(classId, appearance);
  }

  // troca a sessão ativa de volta para o mundo principal sem mexer em
  // classe/telas — usado quando a arena/mina é encerrada
  function restoreMainSession() {
    setSession(mainSession);
  }

  // ---------- morte ----------
  function wireDeathScreen() {
    document.getElementById("death-continue").addEventListener("click", function () {
      document.getElementById("screen-death").classList.remove("active");
      respawn();
    });
  }

  function respawn() {
    if (EN.Mine.current()) EN.Mine.exit();
    var p = mainSession.player;
    p.hp = p.hpMax;
    p.st = p.stMax;
    p.mp = p.mpMax;
    p.state = "idle";
    p.stateT = 0;
    p.invuln = 1.2;
    p.combo = 0;
    p.comboT = 0;
    p.attackLock = 0;
    p.dodgeT = 0;
    p.kbx = 0;
    p.kby = 0;
    EN.Combat.clearStatus(p);
    p.x = 300;
    p.y = 300;
    // perder parte do Vintém é a única punição — o protótipo não tira
    // progresso de missão nem nível, pra morrer não desfazer história
    var lost = Math.floor(EN.State.data.world.vintem * 0.25);
    EN.State.data.world.vintem -= lost;
    EN.State.persist();
    deathT = -1;
    setSession(mainSession);
    if (lost > 0) toast("Você perdeu " + lost + " Vintém no caminho de volta.");
  }

  // Único funil de dano a inimigo: aplica o dano E o feedback visual
  // (número flutuante + estouro de impacto) no mesmo lugar, pra nenhum
  // caminho de dano (corpo-a-corpo, projétil, especial) esquecer o
  // feedback -- essa era exatamente a reclamação de "não sei se acertei".
  function applyDamage(session, enemy, dmg, heavy, crit) {
    var wasDead = enemy.dead;
    EN.Enemy.damage(enemy, dmg, function (killed) {
      if (session.isArena) return;
      session.coins.push({ x: killed.x, y: killed.y, t: 0, taken: false });
      grantXP(EN.Enemy.isBoss(killed) ? 220 : killed.def && killed.def.category === "territorial" ? 12 : 9);
      EN.Story.enemyKilled(killed.defId);
      if (EN.Enemy.isBoss(killed) && session.onBossDefeated) {
        session.boss = null;
        session.onBossDefeated();
      }
    });
    session.fx.push({ kind: "dmgnum", x: enemy.x, y: enemy.y - 14, t: 0, value: dmg, heavy: !!heavy, crit: !!crit });
    if (!wasDead) session.fx.push({ kind: "hit", x: enemy.x, y: enemy.y, t: 0 });
  }

  var XP_PER_LEVEL_BASE = 18,
    XP_PER_LEVEL_STEP = 10;
  function xpForLevel(level) {
    return XP_PER_LEVEL_BASE + (level - 1) * XP_PER_LEVEL_STEP;
  }
  function grantXP(amount) {
    var pr = EN.State.data.progress;
    if (pr.level >= 30) return;
    pr.xp += amount;
    var leveled = false;
    while (pr.level < 30 && pr.xp >= xpForLevel(pr.level)) {
      pr.xp -= xpForLevel(pr.level);
      pr.level++;
      leveled = true;
    }
    if (leveled) {
      // preserva a vida atual proporcionalmente em vez de curar tudo: subir
      // de nível no meio da luta não pode ser uma cura grátis
      var p = mainSession.player;
      var hpPct = p.hp / p.hpMax;
      EN.Player.applyClass(p, p.classId, false, pr.level);
      p.hp = Math.max(p.hp, Math.round(p.hpMax * hpPct));
      toast("✦ Subiu para o nível " + pr.level + "!");
    }
    EN.State.persist();
  }

  // ---------- sessão ativa ----------
  function setSession(session) {
    currentSession = session;
    paused = false;
    document.getElementById("status-panel").style.display = session.meta.showClock === false ? "none" : "";
    EN.Controls.bind({
      player: session.player,
      enemies: session.enemies,
      session: session,
      dealDamage: function (enemy, dmg, heavy, crit) {
        applyDamage(session, enemy, dmg, heavy, crit);
      },
      spawnProjectile: function (desc) {
        desc.life = desc.life || 1.4;
        session.projectiles.push(desc);
      },
      spawnFx: function (kind, data) {
        data.kind = kind;
        data.t = 0;
        session.fx.push(data);
      },
      toast: toast,
    });
  }

  // ---------- loop genérico ----------
  function loop(now) {
    var dtReal = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (currentSession) {
      var blocked = paused || EN.Dialogue.isOpen();
      var dt = blocked ? 0 : EN.Combat.consumeFrame(dtReal);
      if (!blocked) update(currentSession, dt);
      render(currentSession, dt);
      EN.HUD.update(currentSession.player, currentSession.meta, currentSession.player.appearance);
      EN.Controls.refreshVisuals(currentSession.player);
      updateBossBar(currentSession);
    }
    requestAnimationFrame(loop);
  }

  function update(s, dt) {
    var p = s.player;
    var move = EN.Controls.getMoveVector();
    p.pendingMove = move;
    EN.Player.update(p, dt, move, s.enemies);
    EN.Combat.updateKnockback(p, dt);
    p.x = Math.max(20, Math.min(s.worldW - 20, p.x));
    p.y = Math.max(20, Math.min(s.worldH - 20, p.y));
    EN.Camera.update(s.camera, p.x, p.y, dt);

    if (p.hp <= 0) {
      deathT = deathT < 0 ? 0 : deathT + dt;
      if (deathT > 1.3) {
        paused = true;
        document.getElementById("screen-death").classList.add("active");
      }
    }

    var api = {
      damagePlayer: function (dmg, sx, sy) {
        EN.Player.takeDamage(p, dmg, sx, sy);
      },
      spawnEnemyProjectile: function (desc) {
        s.enemyProjectiles.push(desc);
      },
      spawnFx: function (kind, data) {
        data.kind = kind;
        data.t = 0;
        s.fx.push(data);
      },
      onBossPhase: s.onBossPhase,
    };

    s.enemies.forEach(function (e) {
      EN.Enemy.update(e, dt, p, api);
    });
    s.enemies = s.enemies.filter(function (e) {
      if (e.dead) {
        e.deadT += dt;
        return e.deadT < 0.5;
      }
      return true;
    });

    updateProjectiles(s, dt);
    updateEnemyProjectiles(s, dt, p);

    s.coins.forEach(function (c) {
      c.t += dt;
      if (!c.taken && Math.hypot(c.x - p.x, c.y - p.y) < 24) {
        c.taken = true;
        s.meta.vintem += 2 + Math.floor(Math.random() * 4);
      }
    });
    s.coins = s.coins.filter(function (c) {
      return !c.taken;
    });

    s.fx.forEach(function (f) {
      f.t += dt;
    });
    s.fx = s.fx.filter(function (f) {
      return f.t < 1.1;
    });

    if (s.tick) s.tick(s, dt);

    if (!s.isArena && !s.isMine) {
      s.meta.dayT = (s.meta.dayT + dt * (24 / 240)) % 24;
      if (s.meta.dayT < 0.02) s.meta.day++;
      s.meta.x = p.x;
      s.meta.y = p.y;
      s.meta.level = EN.State.data.progress.level; // espelho só pra exibição no HUD
      s.meta.inventory.curas = p.healCharges;
      persistThrottled();
      if (s.enemies.length < 2 && Math.random() > 0.997) {
        s.enemies.push(EN.Enemy.spawn("rato_mato_corrompido", 300 + Math.random() * 900, 300 + Math.random() * 500));
      }
    } else if (s.isArena && s.enemies.filter(function (e) { return !e.dead; }).length === 0 && !s._respawning) {
      s._respawning = true;
      setTimeout(function () {
        s.respawnEnemies();
        s._respawning = false;
      }, 1200);
    }
  }

  function updateProjectiles(s, dt) {
    s.projectiles.forEach(function (proj) {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.life -= dt;
      s.enemies.forEach(function (e) {
        if (e.dead || proj.hit) return;
        if (Math.hypot(e.x - proj.x, e.y - proj.y) < e.r + proj.r) {
          var roll = EN.Combat.rollDamage(proj.dmg);
          applyDamage(s, e, roll.value, false, roll.crit);
          EN.Combat.knockback(e, proj.x, proj.y, 160);
          EN.Combat.hitstop(0.035);
          proj.hit = true;
        }
      });
    });
    s.projectiles = s.projectiles.filter(function (pr) {
      return pr.life > 0 && !pr.hit;
    });
  }

  function updateEnemyProjectiles(s, dt, p) {
    s.enemyProjectiles = s.enemyProjectiles || [];
    s.enemyProjectiles.forEach(function (proj) {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.life -= dt;
      if (proj.hit) return;
      if (Math.hypot(p.x - proj.x, p.y - proj.y) < p.r + proj.r) {
        EN.Player.takeDamage(p, proj.dmg, proj.x, proj.y);
        proj.hit = true;
      }
    });
    s.enemyProjectiles = s.enemyProjectiles.filter(function (pr) {
      return pr.life > 0 && !pr.hit;
    });
  }

  var persistTimer = null;
  function persistThrottled() {
    if (persistTimer) return;
    persistTimer = setTimeout(function () {
      persistTimer = null;
      EN.State.persist();
    }, 1000);
  }

  function render(s, dt) {
    ctx.clearRect(0, 0, vw, vh);
    var origin = EN.Camera.getViewOrigin(s.camera, vw, vh, s.worldW, s.worldH);
    var zoom = s.camera.zoom;
    var shake = EN.Combat.shakeOffset();

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(shake.x, shake.y);
    ctx.drawImage(s.worldCanvas, origin.x, origin.y, origin.viewW, origin.viewH, 0, 0, origin.viewW, origin.viewH);

    s.coins.forEach(function (c) {
      drawCoin(ctx, c, origin.x, origin.y);
    });
    if (s.showNpcs) EN.World.drawNpcs(ctx, origin.x, origin.y, performance.now() / 1000);
    s.enemies.forEach(function (e) {
      EN.Enemy.draw(ctx, e, origin.x, origin.y);
    });
    EN.Player.draw(ctx, s.player, origin.x, origin.y);

    s.projectiles.forEach(function (pr) {
      drawProjectile(pr, origin.x, origin.y, pr.magic ? "#c9a8f2" : "#7fe0c9", pr.magic ? "#7c4fd1" : "#2f8f75");
    });
    (s.enemyProjectiles || []).forEach(function (pr) {
      var isFeather = pr.kind === "pena";
      drawProjectile(pr, origin.x, origin.y, isFeather ? "#c9a227" : "#f2e05a", isFeather ? "#6b5220" : "#a08a1a");
    });

    s.fx.forEach(function (f) {
      drawFx(f, origin.x, origin.y);
    });

    if (!s.isArena && !s.isMine) {
      if (!EN.State.data.progress.despertarSeen) {
        EN.World.drawDespertarBeacon(ctx, origin.x, origin.y, performance.now() / 1000);
      }
      EN.World.drawAtmosphere(ctx, s.meta.dayT, origin.x, origin.y, origin.viewW, origin.viewH, dt);
    } else if (s.isMine) {
      drawMineDarkness(ctx, s, origin);
    }
    ctx.restore();
  }

  function drawProjectile(pr, camX, camY, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(pr.x - camX, pr.y - camY, pr.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // escuridão da mina: vinheta que segue o jogador, o suficiente pra
  // mudar o clima sem esconder inimigo a ponto de virar injustiça
  function drawMineDarkness(ctx, s, origin) {
    var px = s.player.x - origin.x,
      py = s.player.y - origin.y;
    var g = ctx.createRadialGradient(px, py, 60, px, py, 300);
    g.addColorStop(0, "rgba(8,6,10,0)");
    g.addColorStop(1, "rgba(8,6,10,.82)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, origin.viewW, origin.viewH);
  }

  function drawCoin(ctx, c, camX, camY) {
    var x = c.x - camX,
      y = c.y - camY - 6;
    var sq = Math.abs(Math.sin(c.t * 4));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.4 + sq * 0.6, 1);
    ctx.fillStyle = "#f2b705";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.arc(-2, -2, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Feedback de combate: número de dano flutuante (confirma "eu acertei"),
  // estouro de impacto no alvo, arco de golpe (confirma "eu ataquei",
  // acertando ou não) e onda de choque dos golpes em área dos inimigos.
  function drawFx(f, camX, camY) {
    var x = f.x - camX,
      y = f.y - camY;
    if (f.kind === "dmgnum") {
      var t = Math.min(1, f.t / 0.7);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t * 1.1);
      var size = f.crit ? 16 : f.heavy ? 13 : 11;
      ctx.font = "bold " + size + "px 'Silkscreen', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = f.crit ? "#ff8a3a" : f.heavy ? "#f2b705" : "#fff3e0";
      ctx.strokeStyle = "#1c1210";
      ctx.lineWidth = 3;
      var ny = y - 16 - t * 18;
      var label = String(f.value) + (f.crit ? "!" : "");
      ctx.strokeText(label, x, ny);
      ctx.fillText(label, x, ny);
      ctx.restore();
    } else if (f.kind === "hit") {
      var ht = f.t / 0.22;
      if (ht > 1) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - ht);
      ctx.strokeStyle = "#fff3e0";
      ctx.lineWidth = 2;
      for (var i = 0; i < 4; i++) {
        var ang = (i / 4) * Math.PI * 2 + 0.4;
        var r0 = 4 + ht * 4,
          r1 = 8 + ht * 12;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0);
        ctx.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1);
        ctx.stroke();
      }
      ctx.restore();
    } else if (f.kind === "slash") {
      var st = f.t / 0.22;
      if (st > 1) return;
      var fa = Math.atan2(f.fy, f.fx);
      var range = f.heavy ? 44 : f.finisher ? 40 : 30;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - st) * 0.95;
      ctx.strokeStyle = f.heavy || f.finisher ? "#f2b705" : "#eef7f0";
      ctx.lineWidth = f.heavy ? 4 : f.finisher ? 3.6 : 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(x, y - 8, range * (0.5 + st * 0.6), fa - (f.heavy ? 1.1 : 0.75), fa + (f.heavy ? 1.1 : 0.75));
      ctx.stroke();
      ctx.restore();
    } else if (f.kind === "shock") {
      var kt = f.t / 0.45;
      if (kt > 1) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - kt) * 0.8;
      ctx.strokeStyle = "#e0483a";
      ctx.lineWidth = 4 - kt * 2.5;
      ctx.beginPath();
      ctx.arc(x, y, (f.radius || 60) * (0.2 + kt * 0.95), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (f.kind === "perfect") {
      var pt = f.t / 0.7;
      if (pt > 1) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - pt);
      ctx.font = "bold 13px 'Silkscreen', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd66b";
      ctx.strokeStyle = "#1c1210";
      ctx.lineWidth = 3;
      ctx.strokeText("ESQUIVA PERFEITA", x, y - 30 - pt * 14);
      ctx.fillText("ESQUIVA PERFEITA", x, y - 30 - pt * 14);
      ctx.restore();
    }
  }

  // ---------- HUD de missão e chefe ----------
  var trackerEls = null;
  function refreshQuestTracker() {
    if (!trackerEls) {
      trackerEls = {
        box: document.getElementById("quest-tracker"),
        title: document.getElementById("quest-title"),
        obj: document.getElementById("quest-objective"),
      };
    }
    if (!trackerEls.box) return;
    var cur = EN.Quests.active();
    if (!cur || !cur.objective) {
      trackerEls.box.classList.remove("visible");
      return;
    }
    trackerEls.box.classList.add("visible");
    trackerEls.title.textContent = cur.quest.title;
    var need = cur.objective.count || 1;
    var suffix = need > 1 ? " (" + cur.state.count + "/" + need + ")" : "";
    trackerEls.obj.textContent = cur.objective.text + suffix;
  }

  var bossEls = null;
  function updateBossBar(s) {
    if (!bossEls) {
      bossEls = {
        box: document.getElementById("boss-bar"),
        name: document.getElementById("boss-name"),
        fill: document.getElementById("boss-fill"),
        phase: document.getElementById("boss-phase"),
      };
    }
    if (!bossEls.box) return;
    var boss = s.boss;
    if (!boss || boss.dead) {
      bossEls.box.classList.remove("visible");
      return;
    }
    bossEls.box.classList.add("visible");
    bossEls.name.textContent = boss.def.name;
    bossEls.fill.style.transform = "scaleX(" + Math.max(0, boss.hp / boss.hpMax) + ")";
    bossEls.phase.textContent = "Fase " + boss.phase;
  }

  // ---------- toast ----------
  var toastEl, toastTimer;
  function wireToast() {
    toastEl = document.getElementById("toast");
  }
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2400);
  }

  return {
    boot: boot,
    setSession: setSession,
    restoreMainSession: restoreMainSession,
    confirmClassFromArena: confirmClassFromArena,
    toast: toast,
    refreshQuestTracker: refreshQuestTracker,
    getSession: function () {
      return currentSession;
    },
    getMainSession: function () {
      return mainSession;
    },
  };
})();

window.addEventListener("DOMContentLoaded", EN.Main.boot);
