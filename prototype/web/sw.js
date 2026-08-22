/*
 * Service worker: é o que faz Encantaria funcionar OFFLINE e poder ser
 * instalado na tela inicial do celular como um app.
 *
 * Estratégia: cache-first para tudo que está na lista de pré-cache (o jogo
 * é totalmente estático, então o conteúdo só muda quando a versão muda) e
 * rede-com-cache-de-reserva para o resto. Trocar CACHE abaixo invalida
 * tudo de uma vez — é o "número da versão" do app instalado.
 *
 * Fontes do Google ficam de fora de propósito: são o único recurso externo
 * do jogo e ele já tem pilha de fontes de reserva, então tentar cacheá-las
 * só faria a instalação falhar quando a rede estiver ruim.
 */
var CACHE = "encantaria-v9";

var PRECACHE = [
  "./",
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "src/appearance.js",
  "src/arena.js",
  "src/audio.js",
  "src/bestiary.js",
  "src/camera.js",
  "src/charCreation.js",
  "src/classSelect.js",
  "src/classes.js",
  "src/combat.js",
  "src/controls.js",
  "src/dialogue.js",
  "src/enemy.js",
  "src/daily.js",
  "src/farm.js",
  "src/guide.js",
  "src/house.js",
  "src/hud.js",
  "src/interactable.js",
  "src/main.js",
  "src/menu.js",
  "src/mine.js",
  "src/pet.js",
  "src/player.js",
  "src/quests.js",
  "src/spriteAtlas.js",
  "src/state.js",
  "src/story.js",
  "src/world.js",
  "assets/player/player_sheet.png",
  "assets/player/guerreiro_sheet.png",
  "assets/player/mateiro_sheet.png",
  "assets/player/encantado_sheet.png",
  "assets/player/attack_encantado_down.png",
  "assets/player/attack_encantado_left.png",
  "assets/player/attack_encantado_right.png",
  "assets/player/attack_encantado_up.png",
  "assets/player/attack_guerreiro_down.png",
  "assets/player/attack_guerreiro_left.png",
  "assets/player/attack_guerreiro_right.png",
  "assets/player/attack_guerreiro_up.png",
  "assets/player/attack_mateiro_down.png",
  "assets/player/attack_mateiro_left.png",
  "assets/player/attack_mateiro_right.png",
  "assets/player/attack_mateiro_up.png",
  "assets/player/defeat.png",
  "assets/player/dodge_down.png",
  "assets/player/dodge_left.png",
  "assets/player/dodge_right.png",
  "assets/player/dodge_up.png",
  "assets/player/heavy_down.png",
  "assets/player/heavy_left.png",
  "assets/player/heavy_right.png",
  "assets/player/heavy_up.png",
  "assets/player/hurt_down.png",
  "assets/player/hurt_left.png",
  "assets/player/hurt_right.png",
  "assets/player/hurt_up.png",
  "assets/player/idle_down.png",
  "assets/player/idle_left.png",
  "assets/player/idle_right.png",
  "assets/player/idle_up.png",
  "assets/player/run_down.png",
  "assets/player/run_left.png",
  "assets/player/run_right.png",
  "assets/player/run_up.png",
  "assets/player/walk_down.png",
  "assets/player/walk_left.png",
  "assets/player/walk_right.png",
  "assets/player/walk_up.png",
  "assets/npcs/flavio_sheet.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // addAll() falha inteiro se UM arquivo falhar; aqui cada um é
      // independente pra uma imagem que não baixou não impedir a instalação
      return Promise.all(
        PRECACHE.map(function (url) {
          return c.add(url).catch(function () {});
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req)
        .then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) {
              c.put(req, copy);
            });
          }
          return res;
        })
        .catch(function () {
          // navegação offline sem cache do recurso: devolve a tela do jogo
          return req.mode === "navigate" ? caches.match("index.html") : Response.error();
        });
    })
  );
});
