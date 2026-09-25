window.EN = window.EN || {};

/*
 * Partículas — um pool fixo, sem alocação por frame.
 *
 * Por que pool: no Android intermediário o que derruba o FPS em efeito de
 * partícula não é desenhar, é o coletor de lixo parando o jogo para
 * recolher milhares de objetos criados e descartados por segundo. Aqui
 * todos os objetos nascem no carregamento e são reciclados.
 *
 * Estilo: cada partícula é um quadrado alinhado à grade de pixel de arte
 * (3 px de mundo = 1 pixel das planilhas, ver palette_encantaria.json),
 * nunca um círculo suavizado — senão o efeito vira "outra arte" por cima
 * da pixel art. O brilho ("glow") usa um sprite pré-renderizado por cor,
 * então nenhum gradiente é criado por partícula.
 *
 * O tempo que chega aqui é o tempo do JOGO (depois do hitstop): faíscas
 * congelam junto com o impacto, que é o que dá peso ao golpe.
 */
EN.Particles = (function () {
  var PX = 3; // pixel de arte em px de mundo
  var CAPS = { high: 700, low: 220, off: 0 };
  var quality = "high";
  var pool = [];
  var live = 0;
  var glowCache = {};
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // cores da paleta canônica (palette_encantaria.json)
  var C = {
    faisca: ["#fff1b0", "#ffd95a", "#f2b705"],
    critico: ["#ffffff", "#fff1b0", "#ffd95a", "#e0483a"],
    sangue: ["#a8282a", "#6e1a1e"],
    poeira: ["#b38a58", "#94693f", "#d1ae7c"],
    encanto: ["#d6c4ff", "#a884ec", "#7c4fd1"],
    fogo: ["#fff1b0", "#ffd95a", "#cf7a4f", "#ad5535"],
    cura: ["#c8ffd0", "#6fdc8c", "#2f8f5a"],
    esquiva: ["#d0eef4", "#86c6dc", "#4a96bc"],
    corrupcao: ["#4a2c86", "#2e1a52", "#3f3d45"],
    folha: ["#80b05a", "#5a9447", "#d39a14"],
    polen: ["#fff1b0", "#b0cf73"],
    agua: ["#d0eef4", "#86c6dc"],
  };

  function makeParticle() {
    return { on: false, x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0, life: 0, max: 1, size: 1, color: "#fff", glow: false, layer: 1, sway: 0, t: 0 };
  }

  function ensurePool() {
    var cap = CAPS[quality];
    while (pool.length < cap) pool.push(makeParticle());
  }

  function setQuality(q) {
    if (!(q in CAPS)) return;
    quality = q;
    if (pool.length > CAPS[q]) {
      pool.length = CAPS[q];
      live = 0;
      for (var i = 0; i < pool.length; i++) if (pool[i].on) live++;
    }
    ensurePool();
  }

  function scaleCount(n) {
    if (quality === "off") return 0;
    var k = quality === "low" ? 0.4 : 1;
    if (reduceMotion) k *= 0.5;
    return Math.max(1, Math.round(n * k));
  }

  // pega uma partícula livre; se o pool está cheio, recicla a mais velha
  // (a que tem menos vida sobrando) em vez de simplesmente não emitir
  function obtain() {
    var cap = pool.length;
    if (!cap) return null;
    var oldest = null,
      best = Infinity;
    for (var i = 0; i < cap; i++) {
      var p = pool[i];
      if (!p.on) {
        live++;
        return p;
      }
      if (p.life < best) {
        best = p.life;
        oldest = p;
      }
    }
    return oldest;
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function emit(o) {
    var p = obtain();
    if (!p) return null;
    p.on = true;
    p.x = o.x;
    p.y = o.y;
    p.vx = o.vx || 0;
    p.vy = o.vy || 0;
    p.g = o.g || 0;
    p.drag = o.drag || 0;
    p.life = p.max = o.life || 0.5;
    p.size = o.size || 1;
    p.color = o.color || "#fff";
    p.glow = !!o.glow;
    p.layer = o.layer === 0 ? 0 : 1;
    p.sway = o.sway || 0;
    p.t = Math.random() * 6;
    return p;
  }

  function burst(x, y, n, o) {
    n = scaleCount(n);
    for (var i = 0; i < n; i++) {
      var a = o.angle !== undefined ? o.angle + (Math.random() - 0.5) * (o.spread || Math.PI * 2) : Math.random() * Math.PI * 2;
      var sp = (o.speed || 80) * (0.45 + Math.random() * 0.75);
      emit({
        x: x + (Math.random() - 0.5) * (o.jitter || 4),
        y: y + (Math.random() - 0.5) * (o.jitter || 4),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp + (o.lift || 0),
        g: o.g,
        drag: o.drag === undefined ? 3 : o.drag,
        life: (o.life || 0.4) * (0.6 + Math.random() * 0.6),
        size: o.sizes ? pick(o.sizes) : o.size || 1,
        color: pick(o.colors),
        glow: o.glow,
        layer: o.layer,
        sway: o.sway,
      });
    }
  }

  function update(dt) {
    if (!dt) return;
    for (var i = 0; i < pool.length; i++) {
      var p = pool[i];
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.on = false;
        live--;
        continue;
      }
      p.t += dt;
      var d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy = p.vy * d + p.g * dt;
      p.x += (p.vx + (p.sway ? Math.sin(p.t * 3) * p.sway : 0)) * dt;
      p.y += p.vy * dt;
    }
  }

  function glowSprite(color) {
    var g = glowCache[color];
    if (g) return g;
    g = document.createElement("canvas");
    g.width = g.height = 32;
    var c = g.getContext("2d");
    var grad = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    c.globalAlpha = 0.55;
    c.fillStyle = grad;
    c.fillRect(0, 0, 32, 32);
    glowCache[color] = g;
    return g;
  }

  // layer 0 = rente ao chão (poeira), desenhada antes das entidades;
  // layer 1 = no ar (faíscas, magia), desenhada por cima
  function draw(ctx, camX, camY, layer) {
    if (!live) return;
    var i, p, x, y, s, k;
    for (i = 0; i < pool.length; i++) {
      p = pool[i];
      if (!p.on || p.layer !== layer || !p.glow) continue;
      k = p.life / p.max;
      s = (p.size * PX * 3) | 0;
      ctx.globalAlpha = Math.min(1, k * 1.6) * 0.8;
      ctx.drawImage(glowSprite(p.color), p.x - camX - s, p.y - camY - s, s * 2, s * 2);
    }
    for (i = 0; i < pool.length; i++) {
      p = pool[i];
      if (!p.on || p.layer !== layer) continue;
      k = p.life / p.max;
      // encolhe no fim da vida em degraus de pixel, em vez de sumir por
      // transparência (transparência parcial "lava" a pixel art)
      s = Math.max(1, Math.ceil(p.size * Math.min(1, k * 2))) * PX;
      x = Math.round((p.x - camX) / PX) * PX;
      y = Math.round((p.y - camY) / PX) * PX;
      ctx.globalAlpha = k < 0.25 ? 0.6 : 1;
      ctx.fillStyle = p.color;
      ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s);
    }
    ctx.globalAlpha = 1;
  }

  function clear() {
    for (var i = 0; i < pool.length; i++) pool[i].on = false;
    live = 0;
  }

  // ---------- efeitos prontos (a única API que o jogo chama) ----------
  var fx = {
    // impacto de golpe: faíscas na direção do golpe
    hit: function (x, y, dirX, dirY, heavy) {
      var a = Math.atan2(dirY || 0, dirX || 1);
      burst(x, y - 8, heavy ? 12 : 7, { angle: a, spread: 1.6, speed: heavy ? 190 : 140, life: 0.3, colors: C.faisca, sizes: [1, 1, 2], drag: 6 });
    },
    crit: function (x, y, dirX, dirY) {
      var a = Math.atan2(dirY || 0, dirX || 1);
      burst(x, y - 8, 16, { angle: a, spread: 2.2, speed: 230, life: 0.42, colors: C.critico, sizes: [1, 2, 2], drag: 5, glow: true });
      burst(x, y - 8, 6, { speed: 60, life: 0.5, colors: C.critico, size: 1, drag: 2, lift: -30 });
    },
    // morte de criatura: a corrupção se desfaz em fumaça e sobra um brilho dourado
    death: function (x, y) {
      burst(x, y - 6, 18, { speed: 70, life: 0.7, colors: C.corrupcao, sizes: [1, 2, 3], drag: 2.5, lift: -40, jitter: 14 });
      burst(x, y - 6, 8, { speed: 40, life: 0.9, colors: C.faisca, size: 1, drag: 1.5, lift: -50, glow: true, sway: 20 });
    },
    // poeira nos pés (corrida, rolamento, pouso)
    dust: function (x, y, n) {
      burst(x, y, n || 3, { speed: 26, life: 0.45, colors: C.poeira, sizes: [1, 1, 2], drag: 4, lift: -14, jitter: 8, layer: 0 });
    },
    dodge: function (x, y, perfect) {
      burst(x, y, 6, { speed: 60, life: 0.4, colors: C.poeira, sizes: [1, 2], drag: 5, lift: -10, jitter: 10, layer: 0 });
      if (perfect) burst(x, y - 16, 14, { speed: 120, life: 0.5, colors: C.esquiva, sizes: [1, 2], drag: 4, glow: true });
    },
    heal: function (x, y) {
      for (var i = 0; i < scaleCount(14); i++) {
        emit({ x: x + (Math.random() - 0.5) * 26, y: y - Math.random() * 20, vy: -30 - Math.random() * 30, life: 0.8 + Math.random() * 0.5, size: Math.random() > 0.7 ? 2 : 1, color: pick(C.cura), glow: i % 3 === 0, sway: 14 });
      }
    },
    // rastro de projétil (chamado a cada frame pelo dono do projétil)
    trail: function (x, y, kind) {
      if (Math.random() > (quality === "low" ? 0.35 : 0.8)) return;
      var cols = kind === "fire" ? C.fogo : kind === "magic" ? C.encanto : C.faisca;
      emit({ x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 4, vy: kind === "fire" ? -20 : 0, drag: 3, life: 0.25 + Math.random() * 0.2, size: 1, color: pick(cols), glow: kind !== "shot" && Math.random() > 0.6 });
    },
    magicBurst: function (x, y, fire) {
      burst(x, y - 6, 12, { speed: 110, life: 0.4, colors: fire ? C.fogo : C.encanto, sizes: [1, 2], drag: 5, glow: true });
    },
    slash: function (x, y, dirX, dirY, heavy) {
      var a = Math.atan2(dirY || 0, dirX || 1);
      burst(x + Math.cos(a) * 18, y - 10 + Math.sin(a) * 18, heavy ? 6 : 3, { angle: a, spread: 1.2, speed: 70, life: 0.22, colors: ["#ffffff", "#fff1b0"], size: 1, drag: 8 });
    },
    // onda de choque de ataque em área: detritos saltando do chão
    shock: function (x, y, radius, friendly) {
      var n = Math.min(24, 6 + ((radius || 40) / 6) | 0);
      for (var i = 0; i < scaleCount(n); i++) {
        var a = Math.random() * Math.PI * 2;
        var r = (radius || 40) * (0.6 + Math.random() * 0.4);
        emit({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.62, vx: Math.cos(a) * 30, vy: -60 - Math.random() * 60, g: 260, drag: 1, life: 0.45, size: Math.random() > 0.6 ? 2 : 1, color: pick(friendly ? C.esquiva : C.poeira), layer: 0 });
      }
    },
    ember: function (x, y) {
      if (Math.random() > (quality === "low" ? 0.08 : 0.25)) return;
      emit({ x: x + (Math.random() - 0.5) * 20, y: y, vy: -40 - Math.random() * 30, drag: 1, life: 0.6, size: 1, color: pick(C.fogo), glow: true, sway: 18 });
    },
    coin: function (x, y) {
      burst(x, y - 8, 8, { speed: 70, life: 0.45, colors: C.faisca, size: 1, drag: 4, lift: -40, glow: true });
    },
    splash: function (x, y) {
      burst(x, y, 6, { speed: 50, life: 0.35, colors: C.agua, size: 1, g: 240, lift: -70, layer: 0 });
    },
  };

  /*
   * Ambiente: poucas partículas perto da câmera, recicladas. De dia pólen
   * e folhas caindo (vida do sítio); no Brejo e na Mina, pó e névoa.
   * `mood` vem do chamador: "day" | "night" | "mine" | "brejo".
   */
  var ambientT = 0;
  function ambient(dt, camX, camY, viewW, viewH, mood) {
    if (quality === "off" || !dt) return;
    ambientT += dt;
    var every = quality === "low" ? 0.5 : 0.18;
    if (reduceMotion) every *= 2;
    if (ambientT < every) return;
    ambientT = 0;
    var x = camX + Math.random() * viewW,
      y = camY + Math.random() * viewH;
    if (mood === "day") {
      if (Math.random() > 0.5) emit({ x: x, y: camY - 6, vx: 12, vy: 18 + Math.random() * 10, life: viewH / 22, size: 1, color: pick(C.folha), sway: 22 });
      else emit({ x: x, y: y, vx: 8, vy: -4, life: 3, size: 1, color: pick(C.polen), sway: 10 });
    } else if (mood === "mine") {
      emit({ x: x, y: y, vy: 6, life: 2.5, size: 1, color: "#7a7880", sway: 4 });
    } else if (mood === "brejo") {
      emit({ x: x, y: y, vx: 6, vy: -3, life: 3, size: 1, color: pick(C.agua), glow: true, sway: 8 });
    }
  }

  ensurePool();

  return {
    fx: fx,
    update: update,
    draw: draw,
    clear: clear,
    ambient: ambient,
    emit: emit,
    setQuality: setQuality,
    getQuality: function () {
      return quality;
    },
    liveCount: function () {
      return live;
    },
    PX: PX,
  };
})();
