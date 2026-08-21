window.EN = window.EN || {};

/*
 * Câmera com zoom fixo e seguimento suave (lerp) — sem solavancos, sem
 * atraso perceptível. ZOOM = 1.4 (~40% mais perto que o protótipo anterior),
 * valor escolhido testando legibilidade de cabelo/roupa/arma em tela mobile
 * pequena sem cortar demais o campo de visão de combate.
 */
EN.Camera = (function () {
  var ZOOM = 1.4;
  var LERP_SPEED = 5.2;

  function create(x, y) {
    return { x: x, y: y, zoom: ZOOM };
  }

  function update(cam, targetX, targetY, dt) {
    var f = Math.min(1, dt * LERP_SPEED);
    cam.x += (targetX - cam.x) * f;
    cam.y += (targetY - cam.y) * f;
  }

  // devolve o canto superior-esquerdo (em espaço de mundo) visível na tela,
  // já considerando o zoom e limitado às bordas do mundo
  function getViewOrigin(cam, screenW, screenH, worldW, worldH) {
    var viewW = screenW / cam.zoom;
    var viewH = screenH / cam.zoom;
    var camX = cam.x - viewW / 2;
    var camY = cam.y - viewH / 2;
    camX = Math.max(0, Math.min(worldW - viewW, camX));
    camY = Math.max(0, Math.min(worldH - viewH, camY));
    if (worldW < viewW) camX = -(viewW - worldW) / 2;
    if (worldH < viewH) camY = -(viewH - worldH) / 2;
    return { x: camX, y: camY, viewW: viewW, viewH: viewH };
  }

  return { create: create, update: update, getViewOrigin: getViewOrigin, ZOOM: ZOOM };
})();
