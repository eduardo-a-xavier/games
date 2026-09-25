window.EN = window.EN || {};

/*
 * Iluminação noturna por lightmap.
 *
 * Antes a noite era um véu azul de 28% por cima de tudo: escurecia pouco
 * e não tinha luz nenhuma, então dia e noite eram quase o mesmo jogo.
 *
 * Agora: um canvas de escuridão em BAIXA resolução (1 px = 3 px de mundo,
 * a grade de pixel de arte) é pintado com a cor da noite e cada fonte de
 * luz "fura" essa escuridão com um carimbo de luz em degraus. Ampliado sem
 * interpolação, a borda da luz sai em anéis de pixel — iluminação de pixel
 * art, não um gradiente de vetor. Por cima, um brilho quente aditivo
 * colore o que está perto de fogo.
 *
 * Custo: um canvas de ~300x140 px e um drawImage por luz. Na qualidade
 * baixa nada disso roda (world.js volta ao véu simples).
 */
EN.Lighting = (function () {
  var S = 3;
  var lm = null,
    lctx = null;
  var stamp = null;
  var glowCache = {};

  // carimbo de luz: alfa em 4 degraus com dithering Bayer entre eles
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function makeStamp() {
    var n = 48;
    var c = document.createElement("canvas");
    c.width = c.height = n;
    var g = c.getContext("2d");
    var img = g.createImageData(n, n);
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        var d = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2);
        if (d >= 1) continue;
        var v = (1 - d) * 4 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.9;
        var step = Math.max(0, Math.min(4, Math.floor(v + 0.6)));
        var a = [0, 0.3, 0.6, 0.85, 1][step];
        img.data[(y * n + x) * 4 + 3] = Math.round(a * 255);
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function glow(color) {
    var g = glowCache[color];
    if (g) return g;
    g = document.createElement("canvas");
    g.width = g.height = 64;
    var c = g.getContext("2d");
    var grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = grad;
    c.fillRect(0, 0, 64, 64);
    glowCache[color] = g;
    return g;
  }

  /*
   * Quanto escuro está, de 0 (dia pleno) a 1 (meia-noite), com
   * crepúsculo e aurora graduais em vez de virar a chave às 18h.
   */
  function darknessAt(hour) {
    if (hour >= 7 && hour < 17) return 0;
    if (hour >= 17 && hour < 20) return (hour - 17) / 3;
    if (hour >= 5 && hour < 7) return 1 - (hour - 5) / 2;
    return 1;
  }

  // cor do céu: laranja no crepúsculo, azul-noite no escuro
  function tintAt(hour) {
    if (hour >= 17 && hour < 19) return [74, 38, 40];
    if (hour >= 5 && hour < 7) return [60, 44, 70];
    return [10, 13, 26];
  }

  /*
   * o: { darkness 0..1, maxAlpha, rgb:[r,g,b], lights:[{x,y,r,color?,flicker?,i?}],
   *      camX, camY, viewW, viewH, t }
   */
  function render(ctx, o) {
    if (o.darkness <= 0.01) return;
    if (!stamp) stamp = makeStamp();
    var w = Math.ceil(o.viewW / S) + 2,
      h = Math.ceil(o.viewH / S) + 2;
    if (!lm || lm.width !== w || lm.height !== h) {
      lm = document.createElement("canvas");
      lm.width = w;
      lm.height = h;
      lctx = lm.getContext("2d");
    }
    lctx.imageSmoothingEnabled = false;
    lctx.globalCompositeOperation = "source-over";
    lctx.clearRect(0, 0, w, h);
    var rgb = o.rgb || [10, 13, 26];
    lctx.fillStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (o.darkness * (o.maxAlpha || 0.66)).toFixed(3) + ")";
    lctx.fillRect(0, 0, w, h);

    lctx.globalCompositeOperation = "destination-out";
    var t = o.t || 0;
    for (var i = 0; i < o.lights.length; i++) {
      var L = o.lights[i];
      var fl = L.flicker ? 1 + Math.sin(t * 13 + L.x) * 0.04 + Math.sin(t * 29 + L.y) * 0.03 : 1;
      var r = (L.r * fl) / S;
      var lx = (L.x - o.camX) / S,
        ly = (L.y - o.camY) / S;
      if (lx < -r || ly < -r || lx > w + r || ly > h + r) continue;
      lctx.globalAlpha = L.i === undefined ? 1 : L.i;
      // posição arredondada ao pixel da grade: luz não "nada" meio pixel
      lctx.drawImage(stamp, Math.round(lx - r), Math.round(ly - r), Math.round(r * 2), Math.round(r * 2));
    }
    lctx.globalAlpha = 1;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lm, 0, 0, w, h, 0, 0, w * S, h * S);

    // brilho quente (aditivo) só das luzes com cor — fogo e janelas
    ctx.globalCompositeOperation = "lighter";
    for (var k = 0; k < o.lights.length; k++) {
      var G = o.lights[k];
      if (!G.color) continue;
      var gr = G.r * 0.75;
      var gx = G.x - o.camX,
        gy = G.y - o.camY;
      if (gx < -gr || gy < -gr || gx > o.viewW + gr || gy > o.viewH + gr) continue;
      ctx.globalAlpha = 0.22 * o.darkness * (G.flicker ? 0.9 + Math.sin(t * 17 + G.x) * 0.1 : 1);
      ctx.drawImage(glow(G.color), gx - gr, gy - gr, gr * 2, gr * 2);
    }
    ctx.restore();
  }

  return { render: render, darknessAt: darknessAt, tintAt: tintAt };
})();
