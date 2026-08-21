window.EN = window.EN || {};

/*
 * Mina Santa Luzia — segunda área jogável (GDD Seção 29). Usa o mesmo
 * formato de sessão do mundo principal, mas com mapa, inimigos e regras
 * próprias:
 *
 *  - REAPROVEITA o objeto Player do mundo (não é uma cópia descartável
 *    como a arena): vida, vigor, nível e XP ganhos aqui são os de verdade.
 *    Só a posição é salva na entrada e devolvida na saída.
 *  - Túneis embaixo (morcegos, vagalumes, sapos), Câmara Funda em cima.
 *  - O Carcará de Ferro só acorda quando o jogador entra na câmara — a
 *    luta não começa "por acidente" enquanto ele ainda está explorando.
 */
EN.Mine = (function () {
  var MINE_W = 1280,
    MINE_H = 1500;
  var CHAMBER_Y = 380; // tudo acima disso é a Câmara Funda
  var ENTRANCE = { x: MINE_W / 2, y: MINE_H - 90 };

  var savedInteractables = null;
  var savedPos = null;
  var session = null;
  var bossSpawned = false;

  function rand(seed) {
    var x = Math.sin(seed * 999) * 10000;
    return x - Math.floor(x);
  }

  function bakeGround() {
    var c = document.createElement("canvas");
    c.width = MINE_W;
    c.height = MINE_H;
    var g = c.getContext("2d");

    g.fillStyle = "#191419";
    g.fillRect(0, 0, MINE_W, MINE_H);

    // piso de terra batida em faixa central; as bordas ficam escuras e
    // funcionam como parede visual sem precisar de colisão desenhada
    var floor = g.createLinearGradient(0, 0, MINE_W, 0);
    floor.addColorStop(0, "#1d1720");
    floor.addColorStop(0.5, "#3a2f2a");
    floor.addColorStop(1, "#1d1720");
    g.fillStyle = floor;
    g.fillRect(90, 0, MINE_W - 180, MINE_H);

    for (var i = 0; i < 2600; i++) {
      var x = 90 + rand(i * 3.1) * (MINE_W - 180),
        y = rand(i * 7.7) * MINE_H;
      var v = rand(i * 1.7);
      g.fillStyle = v > 0.72 ? "#463a30" : v > 0.4 ? "#2e2620" : "#241d1c";
      g.fillRect(x | 0, y | 0, 3, 3);
    }

    // vigas de escoramento
    for (var b = 0; b < 14; b++) {
      var by = 120 + b * 100;
      g.fillStyle = "#4a3a26";
      g.fillRect(96, by, 26, 78);
      g.fillRect(MINE_W - 122, by, 26, 78);
      g.fillStyle = "#5a4830";
      g.fillRect(96, by, 26, 8);
      g.fillRect(MINE_W - 122, by, 26, 8);
    }

    // veios de minério
    for (var m = 0; m < 60; m++) {
      var mx = 130 + rand(m * 5.3) * (MINE_W - 260),
        my = rand(m * 9.1) * MINE_H;
      g.fillStyle = "rgba(201,162,39,.5)";
      g.beginPath();
      g.ellipse(mx, my, 5, 3, rand(m) * 3, 0, Math.PI * 2);
      g.fill();
    }

    drawChamber(g);
    drawRoots(g);
    return c;
  }

  function drawChamber(g) {
    // Câmara Funda: piso mais claro e um círculo ritual, pra ficar óbvio
    // que aquele espaço é diferente do túnel
    var cx = MINE_W / 2,
      cy = CHAMBER_Y - 60;
    var grad = g.createRadialGradient(cx, cy, 20, cx, cy, 340);
    grad.addColorStop(0, "#4a3a34");
    grad.addColorStop(1, "#241d1c");
    g.fillStyle = grad;
    g.fillRect(60, 0, MINE_W - 120, CHAMBER_Y + 90);

    g.strokeStyle = "rgba(201,162,39,.35)";
    g.lineWidth = 3;
    [140, 200, 260].forEach(function (r) {
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.stroke();
    });

    g.strokeStyle = "rgba(230,120,60,.5)";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(90, CHAMBER_Y + 80);
    g.lineTo(MINE_W - 90, CHAMBER_Y + 80);
    g.stroke();
  }

  function drawRoots(g) {
    // raízes negras: a "corrupção" descrita no bestiário, cada vez mais
    // densa conforme se desce (ou melhor, se sobe no mapa) até a câmara
    for (var i = 0; i < 130; i++) {
      var t = rand(i * 2.3);
      var y = CHAMBER_Y + 60 + t * (MINE_H - CHAMBER_Y - 120);
      var density = 1 - (y - CHAMBER_Y) / (MINE_H - CHAMBER_Y);
      if (rand(i * 4.4) > density * 1.15) continue;
      var x = 110 + rand(i * 6.1) * (MINE_W - 220);
      g.strokeStyle = "rgba(20,10,22,.85)";
      g.lineWidth = 2 + rand(i) * 3;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (rand(i * 3) - 0.5) * 60, y - 30, x + (rand(i * 5) - 0.5) * 90, y - 70);
      g.stroke();
    }
  }

  function spawnTunnelEnemies() {
    return [
      EN.Enemy.spawn("morcego_da_mina", 340, MINE_H - 330),
      EN.Enemy.spawn("morcego_da_mina", 900, MINE_H - 420),
      EN.Enemy.spawn("vagalume_de_defunto", 620, MINE_H - 560),
      EN.Enemy.spawn("sapo_de_pedra", 400, MINE_H - 760),
      EN.Enemy.spawn("morcego_da_mina", 950, MINE_H - 820),
      EN.Enemy.spawn("vagalume_de_defunto", 300, MINE_H - 960),
      EN.Enemy.spawn("sapo_de_pedra", 880, MINE_H - 1010),
      EN.Enemy.spawn("morcego_da_mina", 620, CHAMBER_Y + 260),
    ];
  }

  function enter(mainSession, hooks) {
    hooks = hooks || {};
    savedInteractables = EN.Interactable.snapshot();
    EN.Interactable.unregisterAll();

    var player = mainSession.player;
    savedPos = { x: player.x, y: player.y };
    player.x = ENTRANCE.x;
    player.y = ENTRANCE.y;
    player.facing = { x: 0, y: -1 };
    EN.Combat.clearStatus(player);
    bossSpawned = false;

    EN.Interactable.register({
      x: ENTRANCE.x,
      y: ENTRANCE.y + 40,
      range: 52,
      icon: "🚪",
      label: "Sair da mina",
      type: "mine_exit",
      onInteract: function () {
        exit();
        if (hooks.onExit) hooks.onExit();
      },
    });

    session = {
      isArena: false,
      isMine: true,
      player: player,
      enemies: spawnTunnelEnemies(),
      coins: [],
      projectiles: [],
      enemyProjectiles: [],
      fx: [],
      worldCanvas: bakeGround(),
      worldW: MINE_W,
      worldH: MINE_H,
      camera: EN.Camera.create(player.x, player.y),
      meta: EN.State.data.world,
      areaName: "Mina Santa Luzia",
      onBossDefeated: hooks.onBossDefeated || null,
      onBossPhase: hooks.onBossPhase || null,
    };

    // o chefe só nasce quando o jogador cruza a boca da câmara
    session.tick = function (s, dt) {
      if (bossSpawned) return;
      if (s.player.y < CHAMBER_Y + 70) {
        bossSpawned = true;
        var boss = EN.Enemy.spawn("carcara_de_ferro", MINE_W / 2, CHAMBER_Y - 150);
        s.enemies.push(boss);
        s.boss = boss;
        EN.Combat.shakeCamera(10, 0.9);
        if (hooks.onBossStart) hooks.onBossStart();
      }
    };

    EN.Main.setSession(session);
    return session;
  }

  function exit() {
    if (!session) return;
    var player = session.player;
    if (savedPos) {
      player.x = savedPos.x;
      player.y = savedPos.y;
    }
    EN.Combat.clearStatus(player);
    if (savedInteractables) EN.Interactable.restore(savedInteractables);
    session = null;
    EN.Main.restoreMainSession();
  }

  function current() {
    return session;
  }

  return { enter: enter, exit: exit, current: current, ENTRANCE: ENTRANCE, CHAMBER_Y: CHAMBER_Y };
})();
