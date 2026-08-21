window.EN = window.EN || {};

/*
 * Brejo das Lanternas — terceira área jogável (Ato 3). Mesmo contrato de
 * sessão da Mina: reaproveita o Player do mundo (vida, nível e XP são os
 * de verdade), salva só a posição na entrada e devolve na saída.
 *
 * O que muda em relação à Mina, de propósito:
 *  - Água. Faixas de água cortam o mapa e SÃO O TERRENO SEGURO da luta
 *    contra o Boitatá: fogo caído em cima delas apaga muito mais rápido.
 *    O mapa ensina a resposta antes de exigir ela.
 *  - Habitantes noturnos (Corpo-Seco, vagalumes, cipós) em vez dos bichos
 *    de galeria fechada da Mina.
 *  - Iara das Águas fica na beira do poço: é conversa, não combate, e é
 *    ela quem explica o que o Boitatá é antes de você descer até ele.
 */
EN.Brejo = (function () {
  var BREJO_W = 1400,
    BREJO_H = 1600;
  var POCO_Y = 420; // acima disso é o poço fundo — arena do Boitatá
  var ENTRANCE = { x: BREJO_W / 2, y: BREJO_H - 100 };

  var savedInteractables = null;
  var savedPos = null;
  var session = null;
  var bossSpawned = false;

  function rand(seed) {
    var x = Math.sin(seed * 997) * 10000;
    return x - Math.floor(x);
  }

  /*
   * Faixas de água, guardadas como dados (não só pintadas) porque a luta
   * consulta elas: ver isWater(), usada pra apagar fogo mais rápido.
   */
  var WATER = [
    { x: 120, y: 560, w: 380, h: 150 },
    { x: 700, y: 760, w: 460, h: 170 },
    { x: 240, y: 1020, w: 520, h: 160 },
    { x: 820, y: 1240, w: 400, h: 150 },
    { x: 380, y: 200, w: 620, h: 190 },
  ];

  function isWater(x, y) {
    for (var i = 0; i < WATER.length; i++) {
      var w = WATER[i];
      if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) return true;
    }
    return false;
  }

  function bakeGround() {
    var c = document.createElement("canvas");
    c.width = BREJO_W;
    c.height = BREJO_H;
    var g = c.getContext("2d");

    // lama escura de brejo, mais azulada que o verde do sítio
    g.fillStyle = "#14201c";
    g.fillRect(0, 0, BREJO_W, BREJO_H);

    for (var i = 0; i < 3400; i++) {
      var x = rand(i * 3.1) * BREJO_W,
        y = rand(i * 7.7) * BREJO_H;
      var v = rand(i * 1.7);
      g.fillStyle = v > 0.78 ? "#2c4038" : v > 0.45 ? "#1d2c26" : "#18241f";
      g.fillRect(x | 0, y | 0, 3, 3);
    }

    drawWater(g);
    drawReeds(g);
    drawPoco(g);
    return c;
  }

  function drawWater(g) {
    WATER.forEach(function (w, wi) {
      var grad = g.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
      grad.addColorStop(0, "#243f4a");
      grad.addColorStop(0.5, "#1b3540");
      grad.addColorStop(1, "#152b34");
      g.fillStyle = grad;
      // bordas irregulares: retângulo puro leria como piscina
      g.beginPath();
      g.moveTo(w.x, w.y + 16);
      for (var s = 0; s <= 10; s++) {
        var t = s / 10;
        g.lineTo(w.x + t * w.w, w.y + Math.sin(t * 6 + wi) * 14);
      }
      g.lineTo(w.x + w.w, w.y + w.h - 10);
      for (var s2 = 10; s2 >= 0; s2--) {
        var t2 = s2 / 10;
        g.lineTo(w.x + t2 * w.w, w.y + w.h + Math.cos(t2 * 5 + wi) * 12);
      }
      g.closePath();
      g.fill();

      // reflexos
      g.strokeStyle = "rgba(150,200,215,.16)";
      g.lineWidth = 1.5;
      for (var r = 0; r < 12; r++) {
        var ry = w.y + 18 + rand(wi * 9 + r) * (w.h - 36);
        var rx = w.x + 20 + rand(wi * 5 + r * 3) * (w.w - 70);
        g.beginPath();
        g.moveTo(rx, ry);
        g.lineTo(rx + 26 + rand(r) * 24, ry);
        g.stroke();
      }
    });
  }

  function drawReeds(g) {
    for (var i = 0; i < 420; i++) {
      var x = rand(i * 4.3) * BREJO_W,
        y = 120 + rand(i * 8.1) * (BREJO_H - 160);
      if (y < POCO_Y + 120) continue; // o poço fica limpo
      var h = 14 + rand(i) * 20;
      g.strokeStyle = rand(i * 2.2) > 0.6 ? "#3d5a3a" : "#2e4630";
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (rand(i * 3) - 0.5) * 10, y - h * 0.6, x + (rand(i * 6) - 0.5) * 14, y - h);
      g.stroke();
    }

    // troncos caídos e tocos
    for (var t = 0; t < 26; t++) {
      var tx = 80 + rand(t * 6.6) * (BREJO_W - 160),
        ty = POCO_Y + 160 + rand(t * 9.2) * (BREJO_H - POCO_Y - 260);
      g.save();
      g.translate(tx, ty);
      g.rotate(rand(t) * Math.PI);
      g.fillStyle = "#3a2e24";
      g.fillRect(-26, -6, 52, 12);
      g.fillStyle = "#4a3c2c";
      g.fillRect(-26, -6, 52, 4);
      g.restore();
    }
  }

  function drawPoco(g) {
    // Poço Fundo: clareira de pedra molhada, sem juncos — o espaço aberto
    // avisa "aqui cabe uma luta grande" antes de qualquer texto
    var cx = BREJO_W / 2,
      cy = POCO_Y - 70;
    var grad = g.createRadialGradient(cx, cy, 30, cx, cy, 400);
    grad.addColorStop(0, "#22383c");
    grad.addColorStop(0.6, "#1a2b2a");
    grad.addColorStop(1, "#14201c");
    g.fillStyle = grad;
    g.fillRect(40, 0, BREJO_W - 80, POCO_Y + 110);

    // anéis de pedra
    g.strokeStyle = "rgba(140,190,200,.22)";
    g.lineWidth = 3;
    [150, 220, 290].forEach(function (r) {
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.stroke();
    });

    // marca de queimado no centro: o Boitatá já esteve aqui muitas vezes
    var burn = g.createRadialGradient(cx, cy, 10, cx, cy, 120);
    burn.addColorStop(0, "rgba(60,26,10,.75)");
    burn.addColorStop(1, "rgba(60,26,10,0)");
    g.fillStyle = burn;
    g.beginPath();
    g.arc(cx, cy, 120, 0, Math.PI * 2);
    g.fill();

    // limiar do poço
    g.strokeStyle = "rgba(120,200,190,.45)";
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(70, POCO_Y + 100);
    g.lineTo(BREJO_W - 70, POCO_Y + 100);
    g.stroke();
  }

  function spawnBrejoEnemies() {
    return [
      EN.Enemy.spawn("vagalume_de_defunto", 420, BREJO_H - 320),
      EN.Enemy.spawn("corpo_seco", 900, BREJO_H - 400),
      EN.Enemy.spawn("cipo_vivo", 300, BREJO_H - 520),
      EN.Enemy.spawn("vagalume_de_defunto", 1050, BREJO_H - 620),
      EN.Enemy.spawn("corpo_seco", 560, BREJO_H - 760),
      EN.Enemy.spawn("espantalho_possuido", 1000, BREJO_H - 880),
      EN.Enemy.spawn("cipo_vivo", 780, BREJO_H - 980),
      EN.Enemy.spawn("corpo_seco", 340, BREJO_H - 1080),
      EN.Enemy.spawn("vagalume_de_defunto", 1080, POCO_Y + 320),
      EN.Enemy.spawn("sombra_do_cafezal", 620, POCO_Y + 240),
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
      label: "Sair do brejo",
      type: "brejo_exit",
      onInteract: function () {
        exit();
        if (hooks.onExit) hooks.onExit();
      },
    });

    // Iara fica ANTES do limiar do poço: dá pra ouvir o que ela tem a
    // dizer sem ser obrigado, mas ela está no caminho de quem vai passar
    EN.Interactable.register({
      x: BREJO_W / 2 - 180,
      y: POCO_Y + 200,
      range: 62,
      icon: "🌊",
      label: "Ouvir",
      type: "iara",
      onInteract: function () {
        if (hooks.onIara) hooks.onIara();
      },
    });

    session = {
      isArena: false,
      isBrejo: true,
      player: player,
      enemies: spawnBrejoEnemies(),
      coins: [],
      projectiles: [],
      enemyProjectiles: [],
      fx: [],
      worldCanvas: bakeGround(),
      worldW: BREJO_W,
      worldH: BREJO_H,
      camera: EN.Camera.create(player.x, player.y),
      meta: EN.State.data.world,
      areaName: "Brejo das Lanternas",
      isWater: isWater,
      onBossDefeated: hooks.onBossDefeated || null,
      onBossPhase: hooks.onBossPhase || null,
    };

    session.tick = function (s, dt) {
      if (bossSpawned) return;
      if (s.player.y < POCO_Y + 90) {
        bossSpawned = true;
        var boss = EN.Enemy.spawn("boitata", BREJO_W / 2, POCO_Y - 190);
        s.enemies.push(boss);
        s.boss = boss;
        EN.Combat.shakeCamera(11, 1.0);
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

  return {
    enter: enter,
    exit: exit,
    current: current,
    isWater: isWater,
    WATER: WATER,
    ENTRANCE: ENTRANCE,
    POCO_Y: POCO_Y,
  };
})();
