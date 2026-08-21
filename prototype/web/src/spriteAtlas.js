window.EN = window.EN || {};

/*
 * Carregador de spritesheets reais (substitui o desenho procedural quando
 * disponível). Cobre hoje: idle, walk, run, hurt (universais, 4 direções),
 * attack (uma variante por classe — guerreiro/mateiro/encantado, arte
 * combina com a arma de cada um), heavy (golpe carregado com facão),
 * dodge (rolamento) e defeat (sequência única, sem direção).
 * Fonte: assets/characters/player/base/ (cópia local em
 * prototype/web/assets/player/ pro jogo carregar sem depender da raiz do
 * repositório) — ver assets/art_direction/CHARACTER_STYLE_GUIDE.md.
 *
 * Este é o "molde": qualquer novo conjunto de sprites só precisa de uma
 * chamada a loadDirectional()/loadSingle() aqui — appearance.js nunca
 * precisa saber onde/como o arquivo é carregado.
 */
EN.SpriteAtlas = (function () {
  var DIRS = ["down", "left", "right", "up"];
  var BASE_PATH = "assets/player/";
  var directional = {};
  var single = {};

  // flat spritesheet (player_sheet.png) — one image, all animations as rows.
  // SHEET_IDLE_H is the idle row height: used as the scale reference so the
  // robot renders at ~52px regardless of each row's actual pixel height.
  var sheet = null;
  // Dados verificados pixel a pixel (ver análise PIL acima).
  // Cada linha: { y, h, frames, x0, fw, stride }
  var SHEET_ROWS = {
    idle:   { y: 15,  h: 21, frames: 6,  x0: 10, fw: 21, stride: 36 },
    walk:   { y: 51,  h: 21, frames: 6,  x0: 10, fw: 21, stride: 36 },
    run:    { y: 88,  h: 20, frames: 3,  x0: 10, fw: 21, stride: 35 },
    attack: { y: 120, h: 24, frames: 8,  x0: 9,  fw: 22, stride: 36 },
    heavy:  { y: 159, h: 21, frames: 5,  x0: 10, fw: 20, stride: 36 },
    hurt:   { y: 196, h: 20, frames: 3,  x0: 10, fw: 21, stride: 36 },
    defeat: { y: 235, h: 53, frames: 10, x0: 10, fw: 23, stride: 30 },
  };
  // altura do frame idle — referência de escala para todas as animações
  var SHEET_IDLE_H = 21;

  function resolveSrc(name) {
    // build_bundle.py injeta window.__SPRITE_DATA_URIS__ no HTML
    // autocontido (Artifact); servido normalmente, usa o caminho relativo
    return (window.__SPRITE_DATA_URIS__ && window.__SPRITE_DATA_URIS__[name]) || BASE_PATH + name + ".png";
  }

  function loadDirectional(key, frameCounts) {
    var entry = {};
    DIRS.forEach(function (d) {
      var n = typeof frameCounts === "number" ? frameCounts : frameCounts[d];
      var img = new Image();
      var e = { img: img, loaded: false, failed: false, frames: n, frameW: 0, frameH: 0 };
      img.onload = function () {
        e.loaded = true;
        e.frameW = img.naturalWidth / n;
        e.frameH = img.naturalHeight;
      };
      img.onerror = function () {
        e.failed = true;
      };
      img.src = resolveSrc(key + "_" + d);
      entry[d] = e;
    });
    directional[key] = entry;
  }

  function loadSingle(key, frames) {
    var img = new Image();
    var e = { img: img, loaded: false, failed: false, frames: frames, frameW: 0, frameH: 0 };
    img.onload = function () {
      e.loaded = true;
      e.frameW = img.naturalWidth / frames;
      e.frameH = img.naturalHeight;
    };
    img.onerror = function () {
      e.failed = true;
    };
    img.src = resolveSrc(key);
    single[key] = e;
  }

  loadDirectional("idle", 4);
  loadDirectional("walk", 5);
  loadDirectional("run", 6);
  loadDirectional("hurt", 3);
  loadDirectional("attack_guerreiro", 8);
  loadDirectional("attack_mateiro", 8);
  loadDirectional("attack_encantado", { down: 6, left: 6, right: 6, up: 4 });
  // golpe carregado: contagem irregular porque a planilha-fonte tinha
  // número de poses diferente por direção (ver extract_pose_sheet.py)
  loadDirectional("heavy", { down: 8, left: 9, right: 9, up: 12 });
  // rolamento: só as poses de rolagem da planilha (as figuras em pé das
  // pontas atravessavam as duas fileiras e saíam cortadas)
  loadDirectional("dodge", { down: 4, left: 3, right: 4, up: 4 });
  loadSingle("defeat", 4);

  function loadPlayerSheet() {
    var img = new Image();
    sheet = { img: img, loaded: false, failed: false };
    img.onload = function () { sheet.loaded = true; };
    img.onerror = function () { sheet.failed = true; };
    img.src = resolveSrc("player_sheet");
  }

  function sheetReady() {
    return sheet !== null && sheet.loaded;
  }

  // draws one frame from the flat spritesheet, anchored at feet (cx, cy).
  // mirrors horizontally for the left direction so the sprite faces the right way.
  function drawSheetAnim(ctx, rowKey, cx, cy, cyclePhase, facing, drawHeight) {
    var r = SHEET_ROWS[rowKey];
    if (!r || !sheet || !sheet.loaded) return false;
    var frac = cyclePhase - Math.floor(cyclePhase);
    var frameIndex = Math.min(r.frames - 1, Math.floor(frac * r.frames));
    var scale = drawHeight / SHEET_IDLE_H;
    var dw = r.fw * scale;
    var dh = r.h * scale;
    var sx = r.x0 + frameIndex * r.stride;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (pickDirection(facing) === "left") ctx.scale(-1, 1);
    ctx.drawImage(sheet.img, sx, r.y, r.fw, r.h, cx - dw / 2, cy - dh, dw, dh);
    ctx.restore();
    return true;
  }

  loadPlayerSheet();

  function ready(key) {
    if (single[key]) return single[key].loaded;
    var s = directional[key];
    if (!s) return false;
    return DIRS.every(function (d) {
      return s[d].loaded;
    });
  }

  function pickDirection(facing) {
    if (Math.abs(facing.x) > Math.abs(facing.y)) {
      return facing.x < 0 ? "left" : "right";
    }
    return facing.y < 0 ? "up" : "down";
  }

  // desenha um frame de um conjunto direcional, ancorado nos pés em (cx, cy).
  // `cyclePhase` é contínuo (só a fração importa, dá pra somar livremente
  // ao longo do tempo sem se preocupar com overflow)
  function drawDirectional(ctx, key, cx, cy, facing, cyclePhase, drawHeight) {
    var s = directional[key];
    if (!s) return false;
    var e = s[pickDirection(facing)];
    if (!e.loaded) return false;
    var frac = cyclePhase - Math.floor(cyclePhase);
    var frameIndex = Math.min(e.frames - 1, Math.floor(frac * e.frames));
    return blit(ctx, e, frameIndex, cx, cy, drawHeight);
  }

  // desenha um frame de um conjunto sem direção (ex.: derrota/morte).
  // `progress01` vai de 0 a 1 e trava no último frame ao passar de 1 (a
  // pose final "morto" fica sustentada, não reinicia o loop)
  function drawSingle(ctx, key, cx, cy, progress01, drawHeight) {
    var e = single[key];
    if (!e || !e.loaded) return false;
    var frameIndex = Math.min(e.frames - 1, Math.floor(Math.max(0, progress01) * e.frames));
    return blit(ctx, e, frameIndex, cx, cy, drawHeight);
  }

  // IDLE_REF_H: idle sprite frame height used as the universal scale reference.
  // All animations are scaled as if their frame were this tall, so the character
  // renders at the same real size regardless of how much empty space each
  // spritesheet has above/below the character.
  var IDLE_REF_H = 306;

  function blit(ctx, e, frameIndex, cx, cy, drawHeight) {
    var scale = drawHeight / IDLE_REF_H;
    var w = e.frameW * scale,
      h = e.frameH * scale;
    ctx.drawImage(e.img, frameIndex * e.frameW, 0, e.frameW, e.frameH, cx - w / 2, cy - h, w, h);
    return true;
  }

  return {
    ready: ready,
    pickDirection: pickDirection,
    drawDirectional: drawDirectional,
    drawSingle: drawSingle,
    sheetReady: sheetReady,
    drawSheetAnim: drawSheetAnim,
  };
})();
