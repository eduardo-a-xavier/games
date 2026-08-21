window.EN = window.EN || {};

/*
 * Carregador de spritesheets reais (substitui o desenho procedural quando
 * disponível). Primeira arte definitiva: ciclo de caminhada em 4 direções
 * (assets/characters/player/base/walk_{down,left,right,up}.png, cópia
 * local em prototype/web/assets/player/ pro jogo poder carregar sem
 * depender da raiz do repositório — ver assets/art_direction/CHARACTER_STYLE_GUIDE.md).
 *
 * Isto é o "molde" pedido: qualquer sprite futuro só precisa seguir a
 * mesma convenção (spritesheet horizontal, uma direção por arquivo) e
 * ganhar sua própria entrada aqui — appearance.js não precisa saber como
 * o arquivo é carregado, só chama EN.SpriteAtlas.drawWalk().
 */
EN.SpriteAtlas = (function () {
  var FRAMES = 5;
  var DIRS = ["down", "left", "right", "up"];
  var BASE_PATH = "assets/player/";
  var sheets = {};

  DIRS.forEach(function (d) {
    var img = new Image();
    var entry = { img: img, loaded: false, frameW: 0, frameH: 0 };
    img.onload = function () {
      entry.loaded = true;
      entry.frameW = img.naturalWidth / FRAMES;
      entry.frameH = img.naturalHeight;
    };
    img.onerror = function () {
      entry.failed = true; // sem arte -- appearance.js cai pro desenho procedural
    };
    // build_bundle.py injeta window.__SPRITE_DATA_URIS__ no HTML
    // autocontido (Artifact); servido normalmente, usa o caminho relativo
    img.src = (window.__SPRITE_DATA_URIS__ && window.__SPRITE_DATA_URIS__[d]) || BASE_PATH + "walk_" + d + ".png";
    sheets[d] = entry;
  });

  function ready() {
    return DIRS.every(function (d) {
      return sheets[d].loaded;
    });
  }

  // resolve a direção 4-way mais próxima do vetor de direção do personagem
  function pickDirection(facing) {
    if (Math.abs(facing.x) > Math.abs(facing.y)) {
      return facing.x < 0 ? "left" : "right";
    }
    return facing.y < 0 ? "up" : "down";
  }

  // desenha um frame do ciclo de caminhada ancorado nos pés em (cx, cy);
  // `cyclePhase` é contínuo (não precisa estar em 0..1), só a fração
  // importa. Devolve false se a arte ainda não carregou (chamador decide
  // o fallback).
  function drawWalk(ctx, cx, cy, facing, cyclePhase, drawHeight) {
    var dir = pickDirection(facing);
    var s = sheets[dir];
    if (!s.loaded) return false;
    var frac = cyclePhase - Math.floor(cyclePhase);
    var frameIndex = Math.min(FRAMES - 1, Math.floor(frac * FRAMES));
    var scale = drawHeight / s.frameH;
    var w = s.frameW * scale,
      h = s.frameH * scale;
    ctx.drawImage(s.img, frameIndex * s.frameW, 0, s.frameW, s.frameH, cx - w / 2, cy - h, w, h);
    return true;
  }

  return { ready: ready, drawWalk: drawWalk, pickDirection: pickDirection };
})();
