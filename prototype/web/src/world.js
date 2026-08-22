window.EN = window.EN || {};

/*
 * Cenário do Sítio: fundo pré-renderizado (baked) em canvas offscreen,
 * povoamento de objetos interativos (NPC/item/baú/plantação/porta) via
 * Interactable, spawns de inimigos do bestiário, e atmosfera dia/noite
 * (tingimento + partículas leves). Nada aqui é dono do jogador nem do HUD —
 * só do espaço e do que existe nele.
 */
EN.World = (function () {
  var WORLD_W = 1700,
    WORLD_H = 1100;
  var INVESTIGATE_POINT = { x: 330, y: 480 };

  function rand(seed) {
    var x = Math.sin(seed * 999) * 10000;
    return x - Math.floor(x);
  }

  function bake() {
    var world = document.createElement("canvas");
    world.width = WORLD_W;
    world.height = WORLD_H;
    var c = world.getContext("2d");
    c.imageSmoothingEnabled = false;

    c.fillStyle = "#274a35";
    c.fillRect(0, 0, WORLD_W, WORLD_H);

    // manchas grandes e suaves (variação de cor em escala de "canteiro",
    // não de pixel) -- é isso que tira a cara de ruído estático e dá
    // sensação de grama pintada em vez de TV sem sinal
    for (var b = 0; b < 70; b++) {
      var bx = rand(b * 12.7) * WORLD_W,
        by = rand(b * 5.3) * WORLD_H;
      var br = 60 + rand(b * 2.1) * 90;
      var lighter = rand(b * 8.8) > 0.5;
      var bg = c.createRadialGradient(bx, by, 0, bx, by, br);
      bg.addColorStop(0, lighter ? "rgba(64,110,79,.16)" : "rgba(20,40,28,.16)");
      bg.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = bg;
      c.beginPath();
      c.arc(bx, by, br, 0, Math.PI * 2);
      c.fill();
    }

    // micro-textura fina por cima, bem mais discreta que antes
    for (var i = 0; i < 3200; i++) {
      var x = rand(i * 3.1) * WORLD_W,
        y = rand(i * 7.7) * WORLD_H;
      var g = rand(i * 1.3);
      c.fillStyle = g > 0.6 ? "rgba(60,110,80,.5)" : g > 0.3 ? "rgba(20,50,32,.5)" : "rgba(14,28,20,.5)";
      c.fillRect(x | 0, y | 0, 2, 2);
    }

    // tufos finos de grama espalhados por toda a base (não só na
    // decoração perto do caminho) -- ver drawTuft mais abaixo
    for (var tf = 0; tf < 140; tf++) {
      drawTuft(c, rand(tf * 6.6 + 3) * WORLD_W, rand(tf * 9.9 + 3) * WORLD_H);
    }

    drawPath(c);
    drawHouse(c, 160, 120);
    drawField(c, 700, 760, 300, 180);
    drawMineEntrance(c, 1440, 120);

    var treeSpots = [
      [560, 140],
      [900, 220],
      [1150, 420],
      [1350, 700],
      [300, 620],
      [80, 820],
      [1500, 900],
      [1250, 140],
      [650, 940],
    ];
    for (var t = 0; t < treeSpots.length; t++) drawTree(c, treeSpots[t][0], treeSpots[t][1]);

    for (var r = 0; r < 10; r++) {
      var rx = 1420 + rand(r * 5.5) * 220,
        ry = 60 + rand(r * 9.2) * 980;
      drawRock(c, rx, ry, 14 + rand(r) * 10);
    }

    // decoração leve: tufos de grama, flores e pedrinhas espalhadas
    for (var d = 0; d < 90; d++) {
      var dx = rand(d * 4.4 + 50) * WORLD_W,
        dy = rand(d * 8.8 + 50) * WORLD_H;
      var kind = rand(d * 2.2);
      if (kind < 0.4) drawTuft(c, dx, dy);
      else if (kind < 0.75) drawFlower(c, dx, dy, rand(d * 5) > 0.5 ? "#e8c9e0" : "#f2e08a");
      else drawRock(c, dx, dy, 4 + rand(d) * 5);
    }

    return world;
  }

  function drawPath(c) {
    // borda irregular: várias passadas com leve jitter em vez de uma curva perfeitamente lisa
    var pts = [
      [220, 180],
      [340, 320],
      [480, 500],
      [500, 700],
      [470, 860],
      [620, 950],
      [900, 980],
    ];
    for (var pass = 0; pass < 3; pass++) {
      c.strokeStyle = pass === 0 ? "#7a5c3c" : pass === 1 ? "#8a6a45" : "#9c7c53";
      c.lineWidth = 48 - pass * 9;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var jx = (rand(i * 3.3 + pass * 7) - 0.5) * 10;
        var jy = (rand(i * 5.1 + pass * 11) - 0.5) * 10;
        var px = pts[i][0] + jx,
          py = pts[i][1] + jy;
        if (i === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.stroke();
    }
    // tufos de grama invadindo a borda do caminho
    for (var g = 0; g < 26; g++) {
      var seg = pts[Math.floor(rand(g * 1.7) * (pts.length - 1))];
      var ox = seg[0] + (rand(g * 9.1) - 0.5) * 60;
      var oy = seg[1] + (rand(g * 4.4) - 0.5) * 60;
      drawTuft(c, ox, oy);
    }
  }

  function drawHouse(c, x, y) {
    // sombra projetada no chão, pra casa não flutuar sobre a grama
    var sh = c.createRadialGradient(x + 75, y + 135, 10, x + 75, y + 135, 110);
    sh.addColorStop(0, "rgba(0,0,0,.28)");
    sh.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = sh;
    c.beginPath();
    c.ellipse(x + 75, y + 135, 110, 30, 0, 0, Math.PI * 2);
    c.fill();

    // paredes com leve gradiente (luz vindo da esquerda)
    var wallG = c.createLinearGradient(x, 0, x + 150, 0);
    wallG.addColorStop(0, shadeHex("#c9a15f", 14));
    wallG.addColorStop(1, shadeHex("#c9a15f", -18));
    c.fillStyle = wallG;
    c.fillRect(x, y + 40, 150, 90);
    c.strokeStyle = "rgba(20,14,8,.4)";
    c.lineWidth = 1.5;
    c.strokeRect(x, y + 40, 150, 90);

    c.fillStyle = "#8a6a45";
    c.fillRect(x, y + 40, 150, 10);

    // telhado com gradiente + contorno
    var roofG = c.createLinearGradient(x - 16, y - 30, x + 166, y + 42);
    roofG.addColorStop(0, shadeHex("#a5432f", 18));
    roofG.addColorStop(1, shadeHex("#a5432f", -22));
    c.beginPath();
    c.moveTo(x - 16, y + 42);
    c.lineTo(x + 75, y - 30);
    c.lineTo(x + 166, y + 42);
    c.closePath();
    c.fillStyle = roofG;
    c.fill();
    c.strokeStyle = "rgba(20,14,8,.45)";
    c.lineWidth = 2;
    c.stroke();
    // ripas do telhado, só pra quebrar a chapa de cor
    c.strokeStyle = "rgba(0,0,0,.14)";
    c.lineWidth = 1;
    for (var s = 1; s < 5; s++) {
      c.beginPath();
      c.moveTo(x - 16 + (91 * s) / 5, y + 42 - (72 * s) / 5);
      c.lineTo(x + 75 + (91 * s) / 5, y - 30 + (72 * s) / 5);
      c.stroke();
    }

    c.fillStyle = "#4a2e18";
    c.fillRect(x + 62, y + 80, 30, 50);
    c.strokeStyle = "rgba(20,14,8,.4)";
    c.lineWidth = 1.2;
    c.strokeRect(x + 62, y + 80, 30, 50);

    var winG = c.createLinearGradient(0, y + 60, 0, y + 84);
    winG.addColorStop(0, "#f5e8bc");
    winG.addColorStop(1, "#d9c48a");
    c.fillStyle = winG;
    c.fillRect(x + 20, y + 60, 24, 24);
    c.fillRect(x + 108, y + 60, 24, 24);
    c.strokeStyle = "#5a3a22";
    c.lineWidth = 2;
    c.strokeRect(x + 20, y + 60, 24, 24);
    c.strokeRect(x + 108, y + 60, 24, 24);
    c.beginPath();
    c.moveTo(x + 32, y + 60);
    c.lineTo(x + 32, y + 84);
    c.moveTo(x + 120, y + 60);
    c.lineTo(x + 120, y + 84);
    c.lineWidth = 1.5;
    c.stroke();
  }

  /*
   * Boca da Mina Santa Luzia. Fica no alto do mapa, encostada no
   * paredão de pedra — visível de longe pelo contraste escuro, pra o
   * jogador saber que existe um "lá dentro" antes de a missão mandar.
   */
  function drawMineEntrance(c, x, y) {
    c.fillStyle = "#5a5148";
    c.beginPath();
    c.ellipse(x, y + 20, 130, 78, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#6b6157";
    c.beginPath();
    c.ellipse(x - 20, y + 6, 96, 58, 0, 0, Math.PI * 2);
    c.fill();

    var mouth = c.createRadialGradient(x, y + 34, 4, x, y + 34, 54);
    mouth.addColorStop(0, "#080608");
    mouth.addColorStop(1, "#241d1c");
    c.fillStyle = mouth;
    c.beginPath();
    c.moveTo(x - 46, y + 62);
    c.quadraticCurveTo(x - 46, y - 6, x, y - 6);
    c.quadraticCurveTo(x + 46, y - 6, x + 46, y + 62);
    c.closePath();
    c.fill();

    c.fillStyle = "#4a3a26";
    c.fillRect(x - 56, y - 4, 12, 68);
    c.fillRect(x + 44, y - 4, 12, 68);
    c.fillRect(x - 60, y - 14, 120, 14);
    c.fillStyle = "#5a4830";
    c.fillRect(x - 60, y - 14, 120, 5);

    for (var i = 0; i < 5; i++) {
      drawRock(c, x - 90 + i * 46, y + 78 + rand(i * 3.3) * 16, 7 + rand(i) * 7);
    }

    // raízes negras já escapando pra fora: pista visual de que a
    // corrupção da mina não está contida
    c.strokeStyle = "rgba(20,10,22,.8)";
    for (var r = 0; r < 7; r++) {
      c.lineWidth = 2 + rand(r * 2.2) * 2;
      var sx = x - 30 + rand(r * 4.1) * 60;
      c.beginPath();
      c.moveTo(sx, y + 60);
      c.quadraticCurveTo(sx + (rand(r * 5) - 0.5) * 40, y + 92, sx + (rand(r * 7) - 0.5) * 70, y + 120);
      c.stroke();
    }
  }

  /*
   * Moradores desenhados em runtime (não no fundo assado) porque
   * respiram e viram pro jogador. São figuras simples e distintas por
   * cor — o suficiente pra ler "tem gente ali" numa tela de celular.
   */
  function drawNpcs(ctx, camX, camY, t) {
    var SA = EN.SpriteAtlas;
    var flavioReady = SA.npcSheetReady("flavio");
    NPC_SPOTS.forEach(function (spot, i) {
      var x = spot.x - camX,
        y = spot.y - camY;

      var sh = ctx.createRadialGradient(x, y + 10, 1, x, y + 10, 13);
      sh.addColorStop(0, "rgba(0,0,0,.34)");
      sh.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.ellipse(x, y + 10, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Não reutiliza o Flávio como se fosse todos os moradores. Só ele já
      // tem arte própria; os demais continuam placeholders identificáveis
      // até receberem seus sprites individuais (ASSET_REQUIRED).
      if (spot.id === "flavio" && flavioReady) {
        var facing = { x: 0, y: 1 };
        SA.drawNpcAnim(ctx, "flavio", "idle", x, y, t * 0.6 + i * 0.3, facing, 52);
      } else {
        var bob = Math.sin(t * 1.6 + i * 1.7) * 1.6;
        ctx.strokeStyle = "rgba(20,14,10,.5)";
        ctx.lineWidth = 1;

        ctx.fillStyle = "#3a3a44";
        ctx.fillRect(x - 6, y - 2 + bob, 5, 12);
        ctx.fillRect(x + 1, y - 2 + bob, 5, 12);

        ctx.fillStyle = spot.shirt;
        roundRectPath(ctx, x - 8, y - 16 + bob, 16, 17, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = spot.skin;
        ctx.beginPath();
        ctx.arc(x, y - 22 + bob, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#2a1c14";
        ctx.beginPath();
        ctx.arc(x - 2.5, y - 23 + bob, 1.1, 0, Math.PI * 2);
        ctx.arc(x + 2.5, y - 23 + bob, 1.1, 0, Math.PI * 2);
        ctx.fill();

        if (spot.hat) {
          ctx.fillStyle = spot.hat;
          ctx.beginPath();
          ctx.ellipse(x, y - 27 + bob, 12, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = "#d8d2cc";
          ctx.beginPath();
          ctx.arc(x, y - 25 + bob, 7, Math.PI, Math.PI * 2);
          ctx.fill();
        }
      }

      // marcador flutuante de conversa
      var pulse = Math.sin(t * 3 + i) * 2;
      ctx.globalAlpha = 0.75;
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("💬", x, y - 34 + pulse);
      ctx.globalAlpha = 1;
    });
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawField(c, x, y, w, h) {
    c.strokeStyle = "#7a5a3a";
    c.lineWidth = 6;
    c.strokeRect(x, y, w, h);
    c.fillStyle = "#3d2c1c";
    c.fillRect(x + 6, y + 6, w - 12, h - 12);
    for (var row = 0; row < 5; row++) {
      var ry = y + 18 + row * 32;
      for (var col = 0; col < 8; col++) {
        var cx = x + 20 + col * 34;
        c.fillStyle = "#4f7a3a";
        c.beginPath();
        c.arc(cx, ry, 7, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#6ea34a";
        c.beginPath();
        c.arc(cx - 2, ry - 2, 3, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function lobe(c, x, y, r, hex) {
    var g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.15, x, y, r);
    g.addColorStop(0, shadeHex(hex, 26));
    g.addColorStop(0.65, hex);
    g.addColorStop(1, shadeHex(hex, -20));
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = "rgba(12,22,15,.4)";
    c.lineWidth = 1.4;
    c.stroke();
  }

  function shadeHex(hex, amt) {
    var num = parseInt(hex.replace("#", ""), 16);
    var r = Math.min(255, Math.max(0, (num >> 16) + amt));
    var g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
    var b = Math.min(255, Math.max(0, (num & 0xff) + amt));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function drawTree(c, x, y) {
    var trunkG = c.createLinearGradient(x - 6, y, x + 6, y);
    trunkG.addColorStop(0, "#3a2818");
    trunkG.addColorStop(1, "#5a4028");
    c.fillStyle = trunkG;
    c.fillRect(x - 5, y, 10, 34);
    c.strokeStyle = "rgba(12,22,15,.4)";
    c.lineWidth = 1.2;
    c.strokeRect(x - 5, y, 10, 34);

    lobe(c, x, y - 10, 32, "#1f4a30");
    lobe(c, x - 12, y - 20, 22, "#2f6a42");
    lobe(c, x + 15, y - 15, 20, "#2a6039");
    lobe(c, x, y - 30, 17, "#3a7a4c");
  }

  function drawRock(c, x, y, r) {
    var g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, "#838072");
    g.addColorStop(0.6, "#5a5850");
    g.addColorStop(1, "#3f3d37");
    c.beginPath();
    c.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2);
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = "rgba(12,22,15,.4)";
    c.lineWidth = 1.2;
    c.stroke();
  }

  function drawTuft(c, x, y) {
    c.strokeStyle = "#3f6a45";
    c.lineWidth = 1.6;
    for (var i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo(x + i * 2, y);
      c.quadraticCurveTo(x + i * 2 + i, y - 8, x + i * 3, y - 12);
      c.stroke();
    }
  }

  function drawFlower(c, x, y, hex) {
    c.fillStyle = "#3f6a45";
    c.fillRect(x - 0.5, y - 5, 1, 6);
    c.fillStyle = hex;
    for (var a = 0; a < 4; a++) {
      var ang = (a / 4) * Math.PI * 2;
      c.beginPath();
      c.arc(x + Math.cos(ang) * 2.6, y - 6 + Math.sin(ang) * 2.6, 2, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "#f2b705";
    c.beginPath();
    c.arc(x, y - 6, 1.4, 0, Math.PI * 2);
    c.fill();
  }

  /*
   * Moradores da Vila do Ipê presentes no protótipo (GDD Seção 24). Cada
   * um fica num canto distinto do mapa de propósito: conversar com todos
   * obriga o jogador a atravessar o sítio e conhecer o terreno antes de
   * a história pedir isso dele.
   */
  var NPC_SPOTS = [
    { id: "ze",      x: 420,  y: 210, shirt: "#4a7a52", hat: "#c9a227", skin: "#b07a4e" },
    { id: "osvaldo", x: 1180, y: 640, shirt: "#6b5240", hat: "#3a3a3f", skin: "#8a5c3a" },
    { id: "micaela", x: 690,  y: 900, shirt: "#7a5a82", hat: null,      skin: "#7a5236" },
    { id: "batista", x: 1420, y: 260, shirt: "#4a4a3a", hat: "#5a4a2a", skin: "#9a6a44" },
    { id: "flavio",  x: 560,  y: 380, shirt: "#3a5a8a", hat: null,      skin: "#c09070" },
  ];

  var MINE_ENTRANCE = { x: 1440, y: 120 };
  var BREJO_ENTRANCE = { x: 180, y: 1000 };

  // ---------- povoamento de interativos + inimigos ----------
  function populate(handlers) {
    EN.Interactable.unregisterAll();

    NPC_SPOTS.forEach(function (spot) {
      EN.Interactable.register({
        x: spot.x,
        y: spot.y,
        range: 52,
        icon: "💬",
        label: "Conversar",
        type: "npc",
        npcId: spot.id,
        onInteract: function () {
          handlers.onTalkNpc(spot.id);
        },
      });
    });

    EN.Interactable.register({
      x: MINE_ENTRANCE.x,
      y: MINE_ENTRANCE.y + 46,
      range: 56,
      icon: "⛰️",
      label: "Entrar na mina",
      type: "mine",
      onInteract: function () {
        handlers.onEnterMine();
      },
    });

    // Brejo das Lanternas: fica no canto oposto à mina, no ponto mais
    // baixo e mais úmido do mapa — o caminho até lá já é a transição de
    // clima entre os dois atos
    EN.Interactable.register({
      x: BREJO_ENTRANCE.x,
      y: BREJO_ENTRANCE.y,
      range: 58,
      icon: "🏮",
      label: "Seguir pro brejo",
      type: "brejo",
      onInteract: function () {
        handlers.onEnterBrejo();
      },
    });

    EN.Interactable.register({
      x: 560,
      y: 470,
      range: 40,
      icon: "✋",
      label: "Pegar",
      type: "item",
      once: true,
      used: false,
      onInteract: function (obj) {
        obj.used = true;
        handlers.onPickupItem();
      },
    });

    EN.Interactable.register({
      x: 1020,
      y: 300,
      range: 44,
      icon: "🎁",
      label: "Abrir",
      type: "chest",
      once: true,
      used: false,
      onInteract: function (obj) {
        obj.used = true;
        handlers.onOpenChest();
      },
    });

    EN.Interactable.register({
      x: 780,
      y: 820,
      range: 50,
      icon: "🧺",
      label: "Colher",
      type: "crop",
      onInteract: function () {
        handlers.onCropInteract();
      },
    });

    // porta da casa do jogador — leva pro interior (baú + cama), ver house.js
    EN.Interactable.register({
      x: 237,
      y: 262,
      range: 48,
      icon: "🚪",
      label: "Entrar em casa",
      type: "door",
      onInteract: function () {
        handlers.onEnterHouse();
      },
    });

    EN.Interactable.register({
      x: 900,
      y: 220,
      range: 46,
      icon: "🌀",
      label: "Observar",
      type: "saci",
      onInteract: function () {
        handlers.onSay("saci");
      },
    });

    // ponto de investigação que dispara O Despertar (ver GDD Seção 4/7).
    // Fica perto do sítio de propósito (não era assim antes -- ficava a
    // ~1000px de distância sem nenhuma pista, então praticamente ninguém
    // achava) e ganha um brilho visível de longe, ver drawDespertarBeacon.
    EN.Interactable.register({
      x: INVESTIGATE_POINT.x,
      y: INVESTIGATE_POINT.y,
      range: 50,
      icon: "🔍",
      label: "Investigar",
      type: "investigate",
      once: true,
      used: false,
      onInteract: function (obj) {
        obj.used = true;
        handlers.onDespertar();
      },
    });
  }

  /*
   * Povoamento do sítio em CAMADAS de dificuldade por distância da casa:
   * perto do começo só ratos (o inimigo que ensina esquiva), e quanto
   * mais longe você vai mais o bestiário abre. A Onça de Bruma fica no
   * canto mais distante de todos, na trilha do brejo — é opcional, e
   * encontrar ela é a recompensa de explorar.
   */
  function spawnInitialEnemies() {
    var enemies = [];
    // quintal: os dois ratos da primeira missão
    enemies.push(EN.Enemy.spawn("rato_mato_corrompido", 560, 340));
    enemies.push(EN.Enemy.spawn("rato_mato_corrompido", 820, 540));
    enemies.push(EN.Enemy.spawn("cipo_vivo", 520, 760));

    // mata rasa: territoriais e emboscada
    enemies.push(EN.Enemy.spawn("cipo_vivo", 1080, 830));
    enemies.push(EN.Enemy.spawn("espantalho_possuido", 900, 700));
    enemies.push(EN.Enemy.spawn("rato_mato_corrompido", 1240, 420));

    // pedreira, subindo pra mina: tatus (exigem golpe pesado)
    enemies.push(EN.Enemy.spawn("tatu_de_pedra", 1300, 250));
    enemies.push(EN.Enemy.spawn("tatu_de_pedra", 1180, 150));

    // estrada velha, ao norte: o cão que circula e finta
    enemies.push(EN.Enemy.spawn("cao_da_estrada", 1500, 500));

    // trilha do brejo, sudoeste: o território da Onça
    enemies.push(EN.Enemy.spawn("corpo_seco", 380, 890));
    enemies.push(EN.Enemy.spawn("onca_de_bruma", 240, 720));
    return enemies;
  }

  // ---------- atmosfera dia/noite ----------
  var phases = [
    { name: "Madrugada", from: 0, to: 6, glyph: "✧", tint: [10, 14, 28, 0.55] },
    { name: "Manhã", from: 6, to: 12, glyph: "☀", tint: [255, 214, 140, 0.06] },
    { name: "Tarde", from: 12, to: 18, glyph: "☀", tint: [255, 170, 90, 0.1] },
    { name: "Noite", from: 18, to: 24, glyph: "☾", tint: [14, 18, 40, 0.42] },
  ];
  function currentPhase(hour) {
    for (var i = 0; i < phases.length; i++) if (hour >= phases[i].from && hour < phases[i].to) return phases[i];
    return phases[0];
  }

  var fireflies = null;
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ensureFireflies() {
    if (fireflies) return fireflies;
    fireflies = [];
    var n = reduceMotion ? 6 : 16;
    for (var i = 0; i < n; i++) {
      fireflies.push({
        x: rand(i * 3.3) * WORLD_W,
        y: rand(i * 7.1) * WORLD_H,
        baseX: 0,
        baseY: 0,
        t: rand(i) * 10,
        speed: 0.4 + rand(i * 2) * 0.5,
      });
    }
    fireflies.forEach(function (f) {
      f.baseX = f.x;
      f.baseY = f.y;
    });
    return fireflies;
  }

  function drawAtmosphere(ctx, dayT, camX, camY, viewW, viewH, dt) {
    var ph = currentPhase(dayT);
    var night = ph.name === "Noite" || ph.name === "Madrugada";

    if (night) {
      var flies = ensureFireflies();
      ctx.save();
      flies.forEach(function (f) {
        f.t += dt * f.speed;
        var fx = f.baseX + Math.sin(f.t) * 30;
        var fy = f.baseY + Math.cos(f.t * 0.7) * 20;
        var sx = fx - camX,
          sy = fy - camY;
        if (sx < -20 || sy < -20 || sx > viewW + 20 || sy > viewH + 20) return;
        var glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 7);
        glow.addColorStop(0, "rgba(255,236,150,.85)");
        glow.addColorStop(1, "rgba(255,236,150,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(sx - 7, sy - 7, 14, 14);
      });
      ctx.restore();
    }

    ctx.fillStyle = "rgba(" + ph.tint[0] + "," + ph.tint[1] + "," + ph.tint[2] + "," + ph.tint[3] + ")";
    ctx.fillRect(0, 0, viewW, viewH);

    if (night) {
      var g = ctx.createRadialGradient(215 - camX, 190 - camY, 10, 215 - camX, 190 - camY, 190);
      g.addColorStop(0, "rgba(255,220,150,.28)");
      g.addColorStop(1, "rgba(255,220,150,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, viewW, viewH);
    }
  }

  // brilho pulsante e visível de longe sobre o ponto do Despertar --
  // enquanto ele não foi usado, o jogador precisa CONSEGUIR ver pra onde
  // ir, não só topar com ele por acaso andando no escuro
  function drawDespertarBeacon(ctx, camX, camY, t) {
    var x = INVESTIGATE_POINT.x - camX,
      y = INVESTIGATE_POINT.y - camY;
    var pulse = 0.6 + Math.sin(t * 2.4) * 0.4;
    var g = ctx.createRadialGradient(x, y, 2, x, y, 46 + pulse * 10);
    g.addColorStop(0, "rgba(180,140,255," + (0.55 * pulse + 0.15) + ")");
    g.addColorStop(0.5, "rgba(120,90,220," + (0.25 * pulse) + ")");
    g.addColorStop(1, "rgba(120,90,220,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 46 + pulse * 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(230,210,255," + (0.5 + pulse * 0.5) + ")";
    ctx.beginPath();
    ctx.arc(x, y - 6, 3 + pulse * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    WORLD_W: WORLD_W,
    WORLD_H: WORLD_H,
    BREJO_ENTRANCE: BREJO_ENTRANCE,
    INVESTIGATE_POINT: INVESTIGATE_POINT,
    MINE_ENTRANCE: MINE_ENTRANCE,
    NPC_SPOTS: NPC_SPOTS,
    drawNpcs: drawNpcs,
    bake: bake,
    populate: populate,
    spawnInitialEnemies: spawnInitialEnemies,
    currentPhase: currentPhase,
    drawAtmosphere: drawAtmosphere,
    drawDespertarBeacon: drawDespertarBeacon,
  };
})();
