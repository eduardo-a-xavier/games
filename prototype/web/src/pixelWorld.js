window.EN = window.EN || {};

/*
 * Sítio em pixel art de verdade.
 *
 * O cenário antigo (world.js#bake) desenhava com primitivas suavizadas do
 * canvas — círculos com gradiente, curvas com antialiasing — enquanto o
 * personagem é pixel art de planilha. Eram duas linguagens na mesma tela.
 *
 * Aqui o chão é pintado numa grade de PIXEL DE ARTE: 1 pixel = 3 px de
 * mundo, a mesma escala em que as planilhas do personagem aparecem
 * (52 px de altura para uma figura de 17–19 px). Depois a imagem é
 * ampliada 3x sem interpolação para o tamanho do mundo, então o resto do
 * jogo (câmera, colisão de interação, minimapa) não muda nada.
 *
 * Regras de arte (ver docs/DIRECAO_ARTE.md):
 *  - cor só de EN.Palette (paleta canônica);
 *  - luz vem de cima à esquerda; sombra de objeto cai para baixo/direita;
 *  - contorno de 1 px na cor mais escura da rampa do próprio objeto,
 *    nunca preto puro;
 *  - transição de tons por dithering ordenado (Bayer 4x4), não por
 *    gradiente — gradiente contínuo é o que denuncia "arte de vetor".
 *  - perto da casa o chão é mais claro e florido (área segura); rumo à
 *    Mina (nordeste) e ao Brejo (sudoeste) a grama escurece e morre em
 *    manchas — o jogador lê o perigo antes de ver o inimigo.
 *
 * Tudo é determinístico (mesma semente = mesmo mapa), assado uma vez.
 */
EN.PixelWorld = (function () {
  var S = 3; // px de mundo por pixel de arte
  var P = EN.Palette;
  var W, H, buf, img;

  // ---------------------------------------------------------- base ----
  var colCache = {};
  function col(hex) {
    var c = colCache[hex];
    if (c !== undefined) return c;
    var n = parseInt(hex.slice(1), 16);
    // ImageData em Uint32 é little-endian: 0xAABBGGRR
    c = (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0;
    colCache[hex] = c;
    return c;
  }

  // mapa "um tom abaixo na mesma rampa" — é assim que sombra e contorno
  // escurecem sem sair da paleta
  var darker = {};
  Object.keys(P).forEach(function (k) {
    var r = P[k];
    for (var i = 0; i < r.length; i++) darker[col(r[i])] = col(r[Math.max(0, i - 1)]);
  });

  function set(x, y, c) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    buf[y * W + x] = c;
  }
  function get(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return 0;
    return buf[(y | 0) * W + (x | 0)];
  }
  function shade(x, y, steps) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    var c = buf[y * W + x];
    for (var i = 0; i < (steps || 1); i++) c = darker[c] !== undefined ? darker[c] : c;
    buf[y * W + x] = c;
  }

  function hash(x, y) {
    var h = (x * 374761393 + y * 668265263) | 0;
    h = ((h ^ (h >>> 13)) * 1274126177) | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function rand(seed) {
    var x = Math.sin(seed * 999) * 10000;
    return x - Math.floor(x);
  }
  function smooth(t) {
    return t * t * (3 - 2 * t);
  }
  function vnoise(x, y) {
    var xi = Math.floor(x),
      yi = Math.floor(y);
    var xf = smooth(x - xi),
      yf = smooth(y - yi);
    var a = hash(xi, yi),
      b = hash(xi + 1, yi),
      c = hash(xi, yi + 1),
      d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }
  function fbm(x, y) {
    return vnoise(x, y) * 0.6 + vnoise(x * 2.1 + 7, y * 2.1 + 3) * 0.3 + vnoise(x * 4.3 + 1, y * 4.3 + 9) * 0.1;
  }
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bayer(x, y) {
    return BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47;
  }
  // escolhe um índice de rampa com dithering a partir de um valor contínuo
  function ditherIdx(v, x, y, lo, hi) {
    var i = Math.floor(v + bayer(x, y));
    return i < lo ? lo : i > hi ? hi : i;
  }

  function ellipseFill(cx, cy, rx, ry, fn) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        var dx = (x + 0.5 - cx) / rx,
          dy = (y + 0.5 - cy) / ry;
        var d = dx * dx + dy * dy;
        if (d <= 1) fn(x, y, dx, dy, d);
      }
    }
  }
  function groundShadow(cx, cy, rx, ry) {
    ellipseFill(cx, cy, rx, ry, function (x, y, dx, dy, d) {
      // borda da sombra em dithering: meia sombra, sem gradiente
      if (d > 0.7 && bayer(x, y) > 0) return;
      shade(x, y, 1);
    });
  }
  // contorno de 1 px em volta de tudo que foi pintado numa máscara
  function outlineMask(mask, mw, mh, ox, oy, c) {
    for (var y = 0; y < mh; y++) {
      for (var x = 0; x < mw; x++) {
        if (!mask[y * mw + x]) continue;
        var edge = x === 0 || y === 0 || x === mw - 1 || y === mh - 1 ||
          !mask[y * mw + x - 1] || !mask[y * mw + x + 1] || !mask[(y - 1) * mw + x] || !mask[(y + 1) * mw + x];
        if (edge) set(ox + x, oy + y, c);
      }
    }
  }

  // ---------------------------------------------------- terreno -------
  var PATH = [
    [220, 180], [340, 320], [480, 500], [500, 700], [470, 860], [620, 950], [900, 980],
  ];
  var HOUSE = { x: 160, y: 120 };
  var FIELD = { x: 700, y: 760, w: 300, h: 180 };
  var POND = { x: 1235, y: 975, rx: 20, ry: 11 }; // em px de arte (raio)

  function segDist(px, py, ax, ay, bx, by) {
    var vx = bx - ax,
      vy = by - ay;
    var t = ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var dx = px - (ax + vx * t),
      dy = py - (ay + vy * t);
    return Math.sqrt(dx * dx + dy * dy);
  }
  function pathDist(x, y) {
    var best = 1e9;
    for (var i = 0; i < PATH.length - 1; i++) {
      var d = segDist(x, y, PATH[i][0] / S, PATH[i][1] / S, PATH[i + 1][0] / S, PATH[i + 1][1] / S);
      if (d < best) best = d;
    }
    return best;
  }

  // 0 = seguro (perto de casa), 1 = perigo (boca da mina, entrada do brejo)
  function dangerAt(x, y, mine, brejo) {
    var dm = Math.hypot(x - mine.x / S, (y - mine.y / S) * 1.2);
    var db = Math.hypot(x - brejo.x / S, (y - brejo.y / S) * 1.2);
    var d = Math.max(0, 1 - dm / 85, 1 - db / 70);
    return d;
  }

  function paintGround(mine, brejo) {
    var G = P.grama.map(col);
    var dead = [col(P.terra[1]), col(P.terra[2]), col(P.mata[1])];
    var hx = (HOUSE.x + 75) / S,
      hy = (HOUSE.y + 90) / S;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var n = fbm(x / 38, y / 38) * 0.72 + fbm(x / 7 + 40, y / 7 + 40) * 0.28;
        var danger = dangerAt(x, y, mine, brejo);
        var safe = Math.max(0, 1 - Math.hypot(x - hx, y - hy) / 70);
        var v = 1.4 + n * 3.2 + safe * 0.9 - danger * 1.9;
        var c = G[ditherIdx(v, x, y, 1, 5)];
        // manchas de grama morta na zona de perigo: blocos grandes e
        // coesos, não salpicos
        if (danger > 0.3 && fbm(x / 16 + 11, y / 16 + 5) > 0.66 - danger * 0.16) {
          c = dead[ditherIdx(0.5 + fbm(x / 5, y / 5) * 2, x, y, 0, 2)];
        }
        buf[y * W + x] = c;
      }
    }
  }

  function paintPath() {
    var T = P.terra.map(col);
    var minX = 1e9, minY = 1e9, maxX = 0, maxY = 0;
    PATH.forEach(function (p) {
      minX = Math.min(minX, p[0] / S); maxX = Math.max(maxX, p[0] / S);
      minY = Math.min(minY, p[1] / S); maxY = Math.max(maxY, p[1] / S);
    });
    for (var y = Math.floor(minY - 12); y < maxY + 12; y++) {
      for (var x = Math.floor(minX - 12); x < maxX + 12; x++) {
        var d = pathDist(x, y);
        var edge = 6.2 + (fbm(x / 5, y / 5) - 0.5) * 3.2;
        if (d < edge - 1) {
          var v = 3 + (fbm(x / 4 + 3, y / 4) - 0.5) * 1.6 + (d < 2.4 ? 0.5 : 0) - (d > edge - 2.2 ? 0.8 : 0);
          var c = T[ditherIdx(v, x, y, 2, 4)];
          var h = hash(x, y);
          if (h > 0.985) c = T[5];
          else if (h < 0.012) c = col(P.pedra[3]);
          set(x, y, c);
        } else if (d < edge) {
          set(x, y, T[1]); // borda escura do caminho
        } else if (d < edge + 1 && hash(x + 3, y) > 0.5) {
          shade(x, y, 1); // grama pisoteada colada no caminho
        }
      }
    }
  }

  function scatterDetails(mine, brejo) {
    var G = P.grama.map(col);
    var blocked = function (x, y) {
      if (pathDist(x, y) < 8) return true;
      if (x > HOUSE.x / S - 8 && x < (HOUSE.x + 170) / S && y > (HOUSE.y - 40) / S && y < (HOUSE.y + 150) / S) return true;
      if (x > FIELD.x / S - 3 && x < (FIELD.x + FIELD.w) / S + 3 && y > FIELD.y / S - 3 && y < (FIELD.y + FIELD.h) / S + 3) return true;
      if (Math.hypot(x - POND.x / S, (y - POND.y / S) * 1.8) < POND.rx + 3) return true;
      return false;
    };
    // tufos: base escura + folhas claras em "v"
    for (var i = 0; i < 950; i++) {
      var x = Math.floor(rand(i * 3.7 + 1) * W),
        y = Math.floor(rand(i * 9.1 + 2) * H);
      if (blocked(x, y)) continue;
      var danger = dangerAt(x, y, mine, brejo);
      var hi = danger > 0.5 ? G[3] : G[5];
      set(x, y, G[1]);
      set(x - 1, y - 1, hi);
      set(x + 1, y - 1, hi);
      set(x, y - 2, danger > 0.5 ? G[4] : G[6]);
      set(x, y - 1, G[2]);
    }
    // flores: só onde é seguro — somem conforme o perigo aumenta
    var petals = [P.flor[1], P.flor[2], P.flor[3], P.ipe[4]];
    for (var f = 0; f < 200; f++) {
      var fx = Math.floor(rand(f * 5.3 + 7) * W),
        fy = Math.floor(rand(f * 2.9 + 8) * H);
      if (blocked(fx, fy) || dangerAt(fx, fy, mine, brejo) > 0.15) continue;
      var pc = col(petals[f % petals.length]);
      set(fx - 1, fy, pc);
      set(fx + 1, fy, pc);
      set(fx, fy - 1, pc);
      set(fx, fy + 1, G[2]);
      set(fx, fy, col(P.ipe[3]));
    }
    // pedrinhas
    for (var r = 0; r < 90; r++) {
      var rx = Math.floor(rand(r * 6.1 + 3) * W),
        ry = Math.floor(rand(r * 4.3 + 5) * H);
      if (blocked(rx, ry)) continue;
      set(rx, ry, col(P.pedra[3]));
      set(rx + 1, ry, col(P.pedra[2]));
      set(rx, ry - 1, col(P.pedra[4]));
      shade(rx, ry + 1, 1);
      shade(rx + 1, ry + 1, 1);
    }
  }

  // ----------------------------------------------------- objetos ------
  function tree(wx, wy, kind) {
    var cx = wx / S,
      cy = wy / S;
    var ipe = kind === "ipe";
    // copa comum: rampa da mata com os dois tons claros da grama por cima,
    // senão a árvore vira uma mancha escura sem volume
    var R = ipe ? P.ipe : [P.mata[0], P.mata[1], P.mata[2], P.mata[3], P.grama[4], P.grama[5]];
    var outline = col(ipe ? P.madeira[1] : P.mata[0]);
    groundShadow(cx + 3, cy + 11, 12, 4);
    // tronco
    var M = P.madeira.map(col);
    for (var ty = cy - 2; ty < cy + 11; ty++) {
      for (var tx = -2; tx <= 2; tx++) {
        var c = tx === -2 || tx === 2 ? M[0] : tx === -1 ? M[3] : M[2];
        if (tx === 1 && hash(tx, ty | 0) > 0.6) c = M[1];
        set(cx + tx, ty, c);
      }
    }
    set(cx - 3, cy + 10, M[0]);
    set(cx + 3, cy + 10, M[0]);
    // copa: união de lobos, sombreada pela posição dentro do lobo
    var lobes = ipe
      ? [[0, -4, 11], [-6, -8, 7], [6, -7, 7], [0, -12, 7], [-3, -1, 8], [4, -1, 7]]
      : [[0, -3, 11], [-4, -7, 7.5], [5, -5, 7], [0, -10, 6]];
    var ox = Math.floor(cx - 16),
      oy = Math.floor(cy - 24),
      mw = 33,
      mh = 30;
    var mask = new Uint8Array(mw * mh);
    for (var y = 0; y < mh; y++) {
      for (var x = 0; x < mw; x++) {
        var px = ox + x + 0.5 - cx,
          py = oy + y + 0.5 - cy;
        var lit = null;
        for (var l = 0; l < lobes.length; l++) {
          var L = lobes[l];
          var dx = (px - L[0]) / L[2],
            dy = (py - L[1]) / L[2];
          var wob = (vnoise((ox + x) / 2.2 + wx, (oy + y) / 2.2) - 0.5) * 0.35;
          if (dx * dx + dy * dy <= 1 + wob) lit = -(dx * 0.65 + dy * 0.8);
        }
        if (lit === null) continue;
        mask[y * mw + x] = 1;
        var v = (ipe ? 3 : 2.6) + lit * 1.9 + (vnoise((ox + x) / 1.7, (oy + y) / 1.7 + wy) - 0.5) * 1.4;
        set(ox + x, oy + y, col(R[ditherIdx(v, ox + x, oy + y, ipe ? 2 : 1, R.length - 1)]));
      }
    }
    outlineMask(mask, mw, mh, ox, oy, outline);
    if (ipe) {
      // pétalas caídas: a assinatura dourada do jogo espalhada no chão
      for (var p = 0; p < 26; p++) {
        var a = rand(wx + p * 1.3) * Math.PI * 2,
          d = 6 + rand(wy + p * 2.1) * 12;
        set(cx + Math.cos(a) * d * 1.3, cy + 10 + Math.sin(a) * d * 0.5, col(p % 3 ? P.ipe[4] : P.ipe[3]));
      }
    }
  }

  function rock(wx, wy, wr) {
    var cx = wx / S,
      cy = wy / S,
      r = Math.max(1.6, wr / S);
    var R = P.pedra.map(col);
    groundShadow(cx + 1, cy + r * 0.5, r + 1, r * 0.45);
    var mw = Math.ceil(r * 2 + 3),
      mh = Math.ceil(r * 1.6 + 3),
      ox = Math.floor(cx - r - 1),
      oy = Math.floor(cy - r * 0.8 - 1);
    var mask = new Uint8Array(mw * mh);
    ellipseFill(cx, cy, r, r * 0.72, function (x, y, dx, dy) {
      var v = 2.4 - (dx * 0.7 + dy * 0.9) * 1.4;
      set(x, y, R[ditherIdx(v, x, y, 1, 5)]);
      var mx = x - ox,
        my = y - oy;
      if (mx >= 0 && my >= 0 && mx < mw && my < mh) mask[my * mw + mx] = 1;
    });
    outlineMask(mask, mw, mh, ox, oy, R[0]);
  }

  function house() {
    var x = Math.round(HOUSE.x / S),
      y = Math.round(HOUSE.y / S);
    var T = P.terra.map(col),
      M = P.madeira.map(col),
      R = P.terracota.map(col),
      Pd = P.pedra.map(col),
      I = P.ipe.map(col);
    groundShadow(x + 27, y + 44, 36, 5);
    // paredes de taipa (x..x+50, y+13..y+43)
    for (var wy = y + 13; wy < y + 44; wy++) {
      for (var wx = x; wx < x + 50; wx++) {
        var c = T[ditherIdx(4.4 + (fbm(wx / 3, wy / 3) - 0.5) * 1.4 - (wx > x + 44 ? 0.8 : 0), wx, wy, 3, 5)];
        if (wy >= y + 40) c = (wx + (wy % 2) * 2) % 4 === 0 ? Pd[1] : Pd[wy === y + 40 ? 4 : 3]; // alicerce de pedra
        set(wx, wy, c);
      }
    }
    for (wy = y + 13; wy < y + 44; wy++) {
      set(x, wy, M[1]);
      set(x + 49, wy, M[0]);
    }
    for (wx = x; wx < x + 50; wx++) {
      set(wx, y + 13, M[2]);
      set(wx, y + 14, M[1]);
      set(wx, y + 43, Pd[0]);
    }
    // porta
    for (wy = y + 27; wy < y + 43; wy++) {
      for (wx = x + 21; wx < x + 31; wx++) {
        var dc = wx === x + 21 || wx === x + 30 || wy === y + 27 ? M[0] : (wx - x) % 3 === 0 ? M[1] : M[2];
        set(wx, wy, dc);
      }
    }
    set(x + 28, y + 35, I[3]);
    for (wx = x + 19; wx < x + 33; wx++) set(wx, y + 43, Pd[4]); // degrau
    // janelas acesas (luz quente de dentro)
    [x + 7, x + 36].forEach(function (jx) {
      for (var jy = y + 20; jy < y + 29; jy++) {
        for (var ix = jx; ix < jx + 8; ix++) {
          var frame = ix === jx || ix === jx + 7 || jy === y + 20 || jy === y + 28 || ix === jx + 4 || jy === y + 24;
          set(ix, jy, frame ? M[1] : jy < y + 24 ? I[5] : I[4]);
        }
        set(jx - 1, jy, R[2]); // venezianas
        set(jx + 8, jy, R[1]);
      }
      for (var fb = jx; fb < jx + 8; fb++) {
        set(fb, y + 29, M[2]);
        if (fb % 2) set(fb, y + 28, col(P.flor[1]));
      }
    });
    // telhado de telha colonial: triângulo apex (x+25, y-10), base y+14
    var apexX = x + 25,
      top = y - 10,
      base = y + 14;
    for (var ry = top; ry <= base; ry++) {
      var half = Math.round(((ry - top) / (base - top)) * 31);
      for (var rx = apexX - half; rx <= apexX + half; rx++) {
        var row = (ry - top) % 3;
        var right = rx > apexX;
        var tc = row === 0 ? R[3] : row === 1 ? R[2] : R[1];
        if (row === 2 && (rx + Math.floor((ry - top) / 3) * 2) % 4 === 0) tc = R[0];
        if (right) tc = darker[tc];
        if (rx === apexX - half || rx === apexX + half) tc = R[0];
        set(rx, ry, tc);
      }
    }
    for (var e = apexX - 31; e <= apexX + 31; e++) set(e, base + 1, R[0]); // beiral
    for (var k = 0; k < 11; k++) set(apexX, top + k, R[4]); // cumeeira iluminada
  }

  function field() {
    var x = Math.round(FIELD.x / S),
      y = Math.round(FIELD.y / S),
      w = Math.round(FIELD.w / S),
      h = Math.round(FIELD.h / S);
    var T = P.terra.map(col),
      M = P.madeira.map(col);
    for (var fy = y; fy < y + h; fy++) {
      for (var fx = x; fx < x + w; fx++) {
        var r = (fy - y) % 3;
        set(fx, fy, r === 0 ? T[2] : r === 1 ? T[1] : T[0]);
        if (hash(fx, fy) > 0.93) set(fx, fy, T[2]);
      }
    }
    for (var i = 0; i < EN.Farm.PLOTS; i++) {
      var p = EN.Farm.plotPos(i);
      ellipseFill(p.x / S, p.y / S, 5.4, 3.6, function (px, py, dx, dy, d) {
        var v = 3.2 - (dx * 0.6 + dy * 1.1) * 1.2;
        set(px, py, d > 0.78 ? T[1] : T[ditherIdx(v, px, py, 2, 4)]);
      });
    }
    // cerca: trilhos e mourões
    for (var fx2 = x - 1; fx2 <= x + w; fx2++) {
      set(fx2, y - 2, M[3]);
      set(fx2, y - 1, M[1]);
      set(fx2, y + h, M[3]);
      set(fx2, y + h + 1, M[1]);
    }
    for (var fy2 = y - 2; fy2 <= y + h + 1; fy2++) {
      set(x - 2, fy2, M[3]);
      set(x - 1, fy2, M[1]);
      set(x + w, fy2, M[3]);
      set(x + w + 1, fy2, M[1]);
    }
    for (var post = x - 2; post <= x + w; post += 6) {
      [y - 4, y + h - 2].forEach(function (py) {
        for (var k = 0; k < 5; k++) {
          set(post, py + k, M[4]);
          set(post + 1, py + k, M[2]);
        }
        set(post, py, M[4]);
        shade(post + 2, py + 5, 1);
      });
    }
  }

  function mine(m) {
    var x = Math.round(m.x / S),
      y = Math.round(m.y / S);
    var Pd = P.pedra.map(col),
      M = P.madeira.map(col),
      N = P.noite.map(col),
      E = P.encanto.map(col);
    // paredão de pedra em camadas (estratos horizontais)
    var ox = x - 46,
      oy = y - 22,
      mw = 92,
      mh = 58;
    var mask = new Uint8Array(mw * mh);
    function blob(cx, cy, rx, ry) {
      ellipseFill(cx, cy, rx, ry, function (px, py, dx, dy) {
        var strata = Math.sin(py * 0.9 + fbm(px / 6, py / 6) * 4) * 0.5;
        var v = 2.6 - (dx * 0.5 + dy * 0.9) * 1.3 + strata;
        set(px, py, Pd[ditherIdx(v, px, py, 1, 4)]);
        var mx = px - ox,
          my = py - oy;
        if (mx >= 0 && my >= 0 && mx < mw && my < mh) mask[my * mw + mx] = 1;
      });
    }
    groundShadow(x + 4, y + 33, 44, 6);
    blob(x, y + 7, 43, 26);
    blob(x - 7, y + 2, 32, 19);
    outlineMask(mask, mw, mh, ox, oy, Pd[0]);
    // trilho do carrinho saindo da boca
    for (var ty = y + 21; ty < y + 44; ty++) {
      set(x - 5, ty, Pd[4]);
      set(x + 5, ty, Pd[4]);
      if (ty % 3 === 0) for (var sx = x - 6; sx <= x + 6; sx++) set(sx, ty, sx === x - 5 || sx === x + 5 ? Pd[4] : M[2]);
    }
    // boca: arco escuro com borda em dithering
    for (var my2 = y - 3; my2 < y + 21; my2++) {
      for (var mx2 = x - 15; mx2 <= x + 15; mx2++) {
        var dx2 = (mx2 - x) / 15,
          dy2 = (my2 - (y + 6)) / 9;
        if (my2 < y + 6 && dx2 * dx2 + dy2 * dy2 > 1) continue;
        var depth = Math.hypot(dx2, Math.max(0, (my2 - y) / 21));
        set(mx2, my2, depth > 0.85 && bayer(mx2, my2) > -0.1 ? N[1] : N[0]);
      }
    }
    // escoramento de madeira
    for (var py = y - 5; py < y + 21; py++) {
      for (var k = 0; k < 4; k++) {
        set(x - 19 + k, py, k === 0 ? M[0] : k === 1 ? M[3] : M[2]);
        set(x + 16 + k, py, k === 3 ? M[0] : k === 0 ? M[3] : M[2]);
      }
    }
    for (var lx = x - 20; lx <= x + 20; lx++) {
      for (var k2 = 0; k2 < 4; k2++) set(lx, y - 8 + k2, k2 === 0 ? M[4] : k2 === 3 ? M[0] : M[2]);
    }
    // raízes negras escapando da mina, com brilho roxo fraco: é a
    // corrupção à vista, antes de qualquer diálogo explicar
    for (var r = 0; r < 9; r++) {
      var rx = x - 12 + rand(r * 4.1) * 24,
        ry = y + 20;
      var ang = Math.PI / 2 + (rand(r * 5) - 0.5) * 1.6;
      for (var step = 0; step < 18 + rand(r) * 16; step++) {
        set(rx, ry, E[0]);
        if (step < 6) set(rx + 1, ry, E[0]);
        if (hash(r, step) > 0.9) set(rx + 1, ry - 1, E[2]);
        ang += (rand(r * 7 + step) - 0.5) * 0.7;
        rx += Math.cos(ang);
        ry += Math.sin(ang) * 0.8;
      }
    }
    for (var i = 0; i < 5; i++) rock(m.x - 90 + i * 46, m.y + 80 + rand(i * 3.3) * 16, 7 + rand(i) * 7);
  }

  // entrada do Brejo: lama, poças e taboas — o chão já avisa que ali
  // a terra muda de natureza
  function brejo(b) {
    var cx = b.x / S,
      cy = b.y / S;
    var T = P.terra.map(col),
      A = P.agua.map(col),
      G = P.grama.map(col),
      Md = P.madeira.map(col);
    ellipseFill(cx, cy, 30, 16, function (x, y, dx, dy, d) {
      var n = fbm(x / 5 + 9, y / 5 + 2);
      if (d > 0.75 && n < 0.55) return;
      set(x, y, T[ditherIdx(0.6 + n * 1.6, x, y, 0, 2)]);
    });
    [[-10, -2, 7, 3], [8, 3, 9, 4], [-2, 7, 5, 2.4], [14, -6, 4, 2]].forEach(function (p) {
      ellipseFill(cx + p[0], cy + p[1], p[2], p[3], function (x, y, dx, dy, d) {
        set(x, y, d > 0.7 ? A[1] : dy < -0.3 && dx < 0 ? A[3] : A[2]);
      });
      set(cx + p[0] - p[2] * 0.3, cy + p[1] - p[3] * 0.4, A[5]);
    });
    for (var t = 0; t < 26; t++) {
      var tx = cx + (rand(t * 2.7) - 0.5) * 58,
        ty = cy + (rand(t * 3.9) - 0.5) * 30;
      var hgt = 3 + Math.floor(rand(t) * 4);
      for (var k = 0; k < hgt; k++) set(tx, ty - k, k === hgt - 1 ? Md[1] : k === hgt - 2 ? Md[2] : G[3]);
      set(tx + 1, ty - 1, G[2]);
    }
  }

  // tanque decorativo no leste: água em rampa de profundidade + vitórias-régias
  function pond() {
    var cx = POND.x / S,
      cy = POND.y / S;
    var A = P.agua.map(col),
      T = P.terra.map(col);
    ellipseFill(cx, cy, POND.rx + 2, POND.ry + 1.5, function (x, y) {
      set(x, y, T[ditherIdx(2.5, x, y, 2, 3)]);
    });
    ellipseFill(cx, cy, POND.rx, POND.ry, function (x, y, dx, dy, d) {
      var v = 3.6 - d * 2.4 - dy * 0.6;
      set(x, y, A[ditherIdx(v, x, y, 0, 4)]);
    });
    for (var i = 0; i < 6; i++) {
      var lx = cx + (rand(i * 8.1) - 0.5) * POND.rx * 1.3,
        ly = cy + (rand(i * 3.3) - 0.5) * POND.ry * 1.2;
      ellipseFill(lx, ly, 2.2, 1.4, function (x, y) {
        set(x, y, col(P.grama[4]));
      });
      set(lx + 1, ly, col(P.grama[2]));
      if (i % 2 === 0) set(lx, ly - 1, col(P.flor[2]));
    }
  }

  // marco de pedras do Despertar: pontua o lugar sem roubar o brilho
  // mágico que world.js desenha por cima
  function marker(pt) {
    var cx = pt.x / S,
      cy = pt.y / S;
    for (var i = 0; i < 7; i++) {
      var a = (i / 7) * Math.PI * 2;
      rock((cx + Math.cos(a) * 11) * S, (cy + Math.sin(a) * 6) * S, 5 + (i % 3) * 1.5);
    }
  }

  // ------------------------------------------------------- bake -------
  var TREES = [
    [560, 140], [900, 220], [1150, 420], [1350, 700], [300, 620], [80, 820], [1500, 900], [1250, 140], [650, 940],
  ];
  // dois ipês amarelos: a árvore-símbolo da vila, perto de casa e na roça
  var IPE_TREES = { 0: true, 8: true };

  function bake(worldW, worldH, spots) {
    W = Math.ceil(worldW / S);
    H = Math.ceil(worldH / S);
    var small = document.createElement("canvas");
    small.width = W;
    small.height = H;
    var sc = small.getContext("2d");
    img = sc.createImageData(W, H);
    buf = new Uint32Array(img.data.buffer);

    paintGround(spots.mine, spots.brejo);
    paintPath();
    brejo(spots.brejo);
    pond();
    scatterDetails(spots.mine, spots.brejo);
    marker(spots.investigate);
    field();
    mine(spots.mine);
    for (var r = 0; r < 10; r++) {
      rock(1420 + rand(r * 5.5) * 220, 60 + rand(r * 9.2) * 980, 14 + rand(r) * 10);
    }
    house();
    // árvores de cima para baixo: a de baixo cobre a de cima
    TREES.map(function (t, i) { return [t[0], t[1], i]; })
      .sort(function (a, b) { return a[1] - b[1]; })
      .forEach(function (t) {
        tree(t[0], t[1], IPE_TREES[t[2]] ? "ipe" : "mata");
      });

    sc.putImageData(img, 0, 0);
    var world = document.createElement("canvas");
    world.width = worldW;
    world.height = worldH;
    var c = world.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.drawImage(small, 0, 0, W * S, H * S);
    buf = img = null;
    return world;
  }

  // posições (px de mundo) das janelas acesas, para a iluminação noturna
  function lightSpots() {
    var x = HOUSE.x,
      y = HOUSE.y;
    return [
      { x: x + 34, y: y + 72, r: 70, kind: "janela" },
      { x: x + 121, y: y + 72, r: 70, kind: "janela" },
    ];
  }

  return { bake: bake, lightSpots: lightSpots, POND: POND, S: S };
})();
