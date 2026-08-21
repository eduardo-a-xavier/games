window.EN = window.EN || {};

/*
 * Orquestrador: telas (criação de personagem, mundo, Despertar, seleção de
 * classe, arena) e o loop de jogo genérico que roda tanto a sessão do mundo
 * principal quanto a sessão da arena — ambas têm o mesmo formato (ver
 * arena.js), então update()/render() não sabem qual das duas é a ativa.
 */
EN.Main = (function () {
  var canvas, ctx, dpr, vw, vh;
  var currentSession = null;
  var mainSession = null; // referência estável ao mundo principal — a arena nunca a sobrescreve
  var paused = true;
  var last = performance.now();

  function boot() {
    canvas = document.getElementById("world-canvas");
    ctx = canvas.getContext("2d");
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    resize();
    window.addEventListener("resize", resize);

    EN.Controls.init();
    wireToast();
    wireDespertarScreen();

    if (EN.State.hasProfile()) {
      startMainWorld();
    } else {
      EN.CharCreation.open(function (appearance) {
        startMainWorld();
      });
    }

    requestAnimationFrame(loop);
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
    var player = EN.Player.create(appearance, save.progress.classId, save.world.x, save.world.y);
    player.healCharges = save.world.inventory.curas;

    var session = {
      isArena: false,
      player: player,
      enemies: EN.World.spawnInitialEnemies(),
      coins: [],
      projectiles: [],
      fx: [],
      worldCanvas: EN.World.bake(),
      worldW: EN.World.WORLD_W,
      worldH: EN.World.WORLD_H,
      camera: EN.Camera.create(player.x, player.y),
      meta: save.world,
    };

    EN.World.populate(handleDespertarTrigger, handleNpcSay, handleOpenChest, handlePickupItem, handleCropInteract);
    mainSession = session;
    setSession(session);

    // se o Despertar já aconteceu mas por algum motivo nenhuma classe foi
    // confirmada (estado inconsistente improvável, mas tratado com
    // segurança), reabre a seleção direto, sem repetir a narrativa
    if (save.progress.despertarSeen && !save.progress.classId) {
      openClassSelect();
    }
  }

  function handleDespertarTrigger() {
    var save = EN.State.data;
    if (save.progress.despertarSeen) {
      toast("As raízes negras continuam ali, silenciosas.");
      return;
    }
    playDespertarSequence();
  }

  function handleNpcSay(id) {
    var lines = {
      zé: "Zé acena: “Bom dia! Tudo calmo por aqui, graças a Deus.”",
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
    EN.Player.applyClass(mainSession.player, classId, true);
    toast("Você agora é " + EN.Classes.getById(classId).name + "!");
    setSession(mainSession);
  }

  // chamado pela arena quando o jogador toca "ESCOLHER ESTA CLASSE"
  function confirmClassFromArena(classId, appearance) {
    confirmClass(classId, appearance);
  }

  // troca a sessão ativa de volta para o mundo principal sem mexer em
  // classe/telas — usado quando a arena é encerrada por "VOLTAR"
  function restoreMainSession() {
    setSession(mainSession);
  }

  // ---------- sessão ativa (mundo OU arena) ----------
  function setSession(session) {
    currentSession = session;
    paused = false;
    document.getElementById("status-panel").style.display = session.meta.showClock === false ? "none" : "";
    EN.Controls.bind({
      player: session.player,
      enemies: session.enemies,
      dealDamage: function (enemy, dmg) {
        EN.Enemy.damage(enemy, dmg, function (killed) {
          if (!session.isArena) {
            session.coins.push({ x: killed.x, y: killed.y, t: 0, taken: false });
          }
        });
      },
      spawnProjectile: function (desc) {
        desc.life = 1.1;
        session.projectiles.push(desc);
      },
    });
  }

  // ---------- loop genérico ----------
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused && currentSession) {
      update(currentSession, dt);
      render(currentSession, dt);
      EN.HUD.update(currentSession.player, currentSession.meta, currentSession.player.appearance);
      EN.Controls.refreshVisuals(currentSession.player);
    }
    requestAnimationFrame(loop);
  }

  function update(s, dt) {
    var p = s.player;
    var move = EN.Controls.getMoveVector();
    EN.Player.update(p, dt, move);
    p.x = Math.max(20, Math.min(s.worldW - 20, p.x));
    p.y = Math.max(20, Math.min(s.worldH - 20, p.y));
    EN.Camera.update(s.camera, p.x, p.y, dt);

    s.enemies.forEach(function (e) {
      EN.Enemy.update(e, dt, p, function (dmg) {
        EN.Player.takeDamage(p, dmg);
      });
    });
    s.enemies = s.enemies.filter(function (e) {
      if (e.dead) {
        e.deadT += dt;
        return e.deadT < 0.5;
      }
      return true;
    });

    s.projectiles.forEach(function (proj) {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.life -= dt;
      s.enemies.forEach(function (e) {
        if (e.dead || proj.hit) return;
        if (Math.hypot(e.x - proj.x, e.y - proj.y) < e.r + proj.r) {
          EN.Enemy.damage(e, proj.dmg, function (killed) {
            if (!s.isArena) s.coins.push({ x: killed.x, y: killed.y, t: 0, taken: false });
          });
          proj.hit = true;
        }
      });
    });
    s.projectiles = s.projectiles.filter(function (pr) {
      return pr.life > 0 && !pr.hit;
    });

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

    if (!s.isArena) {
      s.meta.dayT = (s.meta.dayT + dt * (24 / 240)) % 24;
      if (s.meta.dayT < 0.02) s.meta.day++;
      s.meta.x = p.x;
      s.meta.y = p.y;
      s.meta.inventory.curas = p.healCharges;
      persistThrottled();
      if (s.enemies.length < 2 && Math.random() > 0.997) {
        s.enemies.push(EN.Enemy.spawn("rato_mato_corrompido", 300 + Math.random() * 900, 300 + Math.random() * 500));
      }
    } else if (s.enemies.filter(function (e) { return !e.dead; }).length === 0 && !s._respawning) {
      s._respawning = true;
      setTimeout(function () {
        s.respawnEnemies();
        s._respawning = false;
      }, 1200);
    }
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

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.drawImage(s.worldCanvas, origin.x, origin.y, origin.viewW, origin.viewH, 0, 0, origin.viewW, origin.viewH);

    s.coins.forEach(function (c) {
      drawCoin(ctx, c, origin.x, origin.y);
    });
    s.enemies.forEach(function (e) {
      EN.Enemy.draw(ctx, e, origin.x, origin.y);
    });
    EN.Player.draw(ctx, s.player, origin.x, origin.y);
    s.projectiles.forEach(function (pr) {
      ctx.fillStyle = pr.magic ? "#c9a8f2" : "#7fe0c9";
      ctx.beginPath();
      ctx.arc(pr.x - origin.x, pr.y - origin.y, pr.r, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!s.isArena) {
      EN.World.drawAtmosphere(ctx, s.meta.dayT, origin.x, origin.y, origin.viewW, origin.viewH, dt);
    }
    ctx.restore();
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
    }, 2200);
  }

  return {
    boot: boot,
    setSession: setSession,
    restoreMainSession: restoreMainSession,
    confirmClassFromArena: confirmClassFromArena,
    toast: toast,
    getSession: function () {
      return currentSession;
    },
  };
})();

window.addEventListener("DOMContentLoaded", EN.Main.boot);
