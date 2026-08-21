window.EN = window.EN || {};

/*
 * Carregador de spritesheets reais (substitui o desenho procedural quando
 * disponível). Cobre hoje: idle, walk, run, hurt (universais, 4 direções),
 * attack (uma variante por classe — guerreiro/mateiro/encantado, arte
 * combina com a arma de cada um), heavy (golpe carregado com facão) e
 * defeat (sequência única, sem direção).
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
  loadDirectional("attack_guerreiro", 6);
  loadDirectional("attack_mateiro", 8);
  loadDirectional("attack_encantado", { down: 6, left: 6, right: 6, up: 4 });
  // golpe carregado: contagem irregular porque a planilha-fonte tinha
  // número de poses diferente por direção (ver extract_pose_sheet.py)
  loadDirectional("heavy", { down: 8, left: 9, right: 9, up: 12 });
  loadSingle("defeat", 4);

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

  function blit(ctx, e, frameIndex, cx, cy, drawHeight) {
    var scale = drawHeight / e.frameH;
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
  };
})();
