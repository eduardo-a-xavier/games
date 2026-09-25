window.EN = window.EN || {};

/*
 * Camada de pixel para o que ainda é desenhado por código.
 *
 * Inimigos, NPCs, companheiro, moedas e projéteis são desenhados com
 * primitivas do canvas (círculos, curvas). Na tela eles apareciam lisos,
 * de vetor, ao lado do cenário e do personagem em pixel art.
 *
 * Em vez de redesenhar cada criatura (enemy.js tem 2 mil linhas de desenho
 * com a leitura de ataque de cada uma), eles passam a ser desenhados numa
 * camada em 1/3 da resolução — 1 pixel = 3 px de mundo, a grade do resto
 * do jogo — e ampliados sem interpolação. A camada é deslocada pelo resto
 * da origem da câmera para que os pixels dela caiam EXATAMENTE sobre os
 * pixels do chão, senão a criatura "escorrega" meio pixel ao andar.
 *
 * Texto (o "!" de alerta, o balão 💬) é interceptado e redesenhado nítido
 * na tela principal: letra a 1/3 da resolução fica ilegível.
 *
 * Silhueta nítida (end com "crisp"): a 1/3 da resolução uma criatura pequena
 * (o rato tem ~8 px) é quase só borda com antialiasing — pixels meio
 * transparentes — e na tela ela aparecia translúcida e borrada. Na passada
 * das criaturas o alfa é binarizado (cada pixel é opaco ou vazio), que é
 * exatamente a regra da pixel art. O canvas fica na CPU
 * (willReadFrequently) para ler e regravar ~20 mil pixels sem ida e volta
 * à GPU. Medido no Chromium headless da nuvem: mediana 0,4 ms, p95 0,5 ms
 * por quadro (tools/capture.js); celular fraco deve pagar mais, por isso a
 * qualidade baixa desliga a camada inteira.
 */
EN.PixelLayer = (function () {
  var S = 3;
  var layer = null,
    lctx = null;
  var ox = 0,
    oy = 0,
    w = 0,
    h = 0;
  var texts = [];

  function enabled() {
    if (/[?&]mundo=antigo/.test(location.search)) return false;
    return !EN.Particles || EN.Particles.getQuality() !== "low";
  }

  function recordText(kind) {
    return function (text, x, y, maxW) {
      texts.push({
        kind: kind,
        text: text,
        x: x,
        y: y,
        maxW: maxW,
        m: this.getTransform(),
        font: this.font,
        fill: this.fillStyle,
        stroke: this.strokeStyle,
        lw: this.lineWidth,
        align: this.textAlign,
        base: this.textBaseline,
        alpha: this.globalAlpha,
      });
    };
  }

  function ensure(viewW, viewH) {
    var nw = Math.ceil(viewW / S) + 2,
      nh = Math.ceil(viewH / S) + 2;
    if (layer && nw === w && nh === h) return;
    w = nw;
    h = nh;
    layer = document.createElement("canvas");
    layer.width = w;
    layer.height = h;
    lctx = layer.getContext("2d", { willReadFrequently: true });
    lctx.fillText = recordText("fill");
    lctx.strokeText = recordText("stroke");
  }

  // devolve o contexto onde desenhar em coordenadas de TELA-MUNDO (as
  // mesmas que o ctx principal usa dentro de render())
  function begin(origin) {
    ensure(origin.viewW, origin.viewH);
    ox = ((origin.x % S) + S) % S;
    oy = ((origin.y % S) + S) % S;
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalAlpha = 1;
    lctx.globalCompositeOperation = "source-over";
    lctx.clearRect(0, 0, w, h);
    lctx.setTransform(1 / S, 0, 0, 1 / S, ox / S, oy / S);
    lctx.imageSmoothingEnabled = false;
    texts.length = 0;
    return lctx;
  }

  // "crisp": corte seco (silhueta). "dither": transparência vira padrão
  // Bayer 4x4 — é assim que uma criatura sumindo na neblina (a Onça de
  // Bruma fica a 8%, visível de propósito) continua sumindo aos poucos
  // em vez de piscar de uma vez.
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function binarizeAlpha(mode) {
    var img = lctx.getImageData(0, 0, w, h);
    var d = img.data;
    var i, a;
    if (mode === "dither") {
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          i = (y * w + x) * 4 + 3;
          a = d[i];
          if (a === 0 || a === 255) continue;
          d[i] = a / 255 > (BAYER[((y + oy) & 3) * 4 + ((x + ox) & 3)] + 0.5) / 16 ? 255 : 0;
        }
      }
    } else {
      for (i = 3; i < d.length; i += 4) {
        a = d[i];
        if (a === 0 || a === 255) continue;
        d[i] = a < 110 ? 0 : 255;
      }
    }
    lctx.putImageData(img, 0, 0);
  }

  var lastCost = 0;
  function end(ctx, mode) {
    if (mode) {
      var t0 = performance.now();
      binarizeAlpha(mode);
      lastCost = performance.now() - t0;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(layer, 0, 0, w, h, -ox, -oy, w * S, h * S);
    ctx.restore();
    if (!texts.length) return;
    // layer px (u,v) -> tela local (u*S - ox, v*S - oy)
    var base = ctx.getTransform().multiply(new DOMMatrix([S, 0, 0, S, -ox, -oy]));
    for (var i = 0; i < texts.length; i++) {
      var t = texts[i];
      ctx.save();
      ctx.setTransform(base.multiply(t.m));
      ctx.font = t.font;
      ctx.textAlign = t.align;
      ctx.textBaseline = t.base;
      ctx.globalAlpha = t.alpha;
      if (t.kind === "fill") {
        ctx.fillStyle = t.fill;
        if (t.maxW !== undefined) ctx.fillText(t.text, t.x, t.y, t.maxW);
        else ctx.fillText(t.text, t.x, t.y);
      } else {
        ctx.strokeStyle = t.stroke;
        ctx.lineWidth = t.lw;
        ctx.strokeText(t.text, t.x, t.y);
      }
      ctx.restore();
    }
    texts.length = 0;
  }

  return {
    enabled: enabled,
    begin: begin,
    end: end,
    lastCost: function () {
      return lastCost;
    },
  };
})();
