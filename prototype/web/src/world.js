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
    for (var i = 0; i < 2600; i++) {
      var x = rand(i * 3.1) * WORLD_W,
        y = rand(i * 7.7) * WORLD_H;
      var g = rand(i * 1.3);
      c.fillStyle = g > 0.6 ? "#2f5a40" : g > 0.3 ? "#23432f" : "#1c3527";
      c.fillRect(x | 0, y | 0, 3, 3);
    }

    drawPath(c);
    drawHouse(c, 160, 120);
    drawField(c, 700, 760, 300, 180);

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
    c.fillStyle = "#c9a15f";
    c.fillRect(x, y + 40, 150, 90);
    c.fillStyle = "#8a6a45";
    c.fillRect(x, y + 40, 150, 10);
    c.fillStyle = "#a5432f";
    c.beginPath();
    c.moveTo(x - 16, y + 42);
    c.lineTo(x + 75, y - 30);
    c.lineTo(x + 166, y + 42);
    c.closePath();
    c.fill();
    c.fillStyle = "#5a3a22";
    c.fillRect(x + 62, y + 80, 30, 50);
    c.fillStyle = "#e8d9a8";
    c.fillRect(x + 20, y + 60, 24, 24);
    c.fillRect(x + 108, y + 60, 24, 24);
    c.strokeStyle = "#5a3a22";
    c.lineWidth = 2;
    c.strokeRect(x + 20, y + 60, 24, 24);
    c.strokeRect(x + 108, y + 60, 24, 24);
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

  function drawTree(c, x, y) {
    c.fillStyle = "#4a3320";
    c.fillRect(x - 6, y, 12, 34);
    c.fillStyle = "#1f4a30";
    c.beginPath();
    c.arc(x, y - 10, 32, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#2f6a42";
    c.beginPath();
    c.arc(x - 10, y - 18, 22, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(x + 14, y - 14, 20, 0, Math.PI * 2);
    c.fill();
  }

  function drawRock(c, x, y, r) {
    c.fillStyle = "#5a5850";
    c.beginPath();
    c.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#6f6c62";
    c.beginPath();
    c.ellipse(x - r * 0.25, y - r * 0.25, r * 0.4, r * 0.28, 0, 0, Math.PI * 2);
    c.fill();
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

  // ---------- povoamento de interativos + inimigos ----------
  function populate(onDespertar, onSayNpc, onOpenChest, onPickupItem, onCropInteract) {
    EN.Interactable.unregisterAll();

    EN.Interactable.register({
      x: 420,
      y: 210,
      range: 50,
      icon: "💬",
      label: "Conversar",
      type: "npc",
      onInteract: function () {
        onSayNpc("zé");
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
        onPickupItem();
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
        onOpenChest();
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
        onCropInteract();
      },
    });

    EN.Interactable.register({
      x: 237,
      y: 178,
      range: 44,
      icon: "🚪",
      label: "Entrar",
      type: "door",
      onInteract: function () {
        onSayNpc("porta");
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
        onSayNpc("saci");
      },
    });

    // ponto de investigação que dispara O Despertar (ver GDD Seção 4/7)
    EN.Interactable.register({
      x: 1300,
      y: 700,
      range: 50,
      icon: "🔍",
      label: "Investigar",
      type: "investigate",
      once: true,
      used: false,
      onInteract: function (obj) {
        obj.used = true;
        onDespertar();
      },
    });
  }

  function spawnInitialEnemies() {
    var enemies = [];
    enemies.push(EN.Enemy.spawn("rato_mato_corrompido", 560, 340));
    enemies.push(EN.Enemy.spawn("rato_mato_corrompido", 820, 540));
    enemies.push(EN.Enemy.spawn("cipo_vivo", 520, 760));
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

  return {
    WORLD_W: WORLD_W,
    WORLD_H: WORLD_H,
    bake: bake,
    populate: populate,
    spawnInitialEnemies: spawnInitialEnemies,
    currentPhase: currentPhase,
    drawAtmosphere: drawAtmosphere,
  };
})();
