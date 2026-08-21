window.EN = window.EN || {};

/*
 * Arena de teste de classe: sessão totalmente isolada. Usa o mesmo
 * canvas/HUD/controles do jogo principal (via EN.Main.setSession), mas com
 * um Player e inimigos "descartáveis" — nunca escreve em EN.State, nunca
 * concede XP/itens, e devolve o registro de Interactable do mundo
 * principal intacto ao sair (nada foi coletado/alterado por estar lá).
 */
EN.Arena = (function () {
  var ARENA_W = 900,
    ARENA_H = 640;
  var savedInteractables = null;

  function rand(seed) {
    var x = Math.sin(seed * 999) * 10000;
    return x - Math.floor(x);
  }

  function bakeGround() {
    var c = document.createElement("canvas");
    c.width = ARENA_W;
    c.height = ARENA_H;
    var g = c.getContext("2d");
    g.fillStyle = "#3a3226";
    g.fillRect(0, 0, ARENA_W, ARENA_H);
    for (var i = 0; i < 600; i++) {
      var x = rand(i * 3.1) * ARENA_W,
        y = rand(i * 7.7) * ARENA_H;
      g.fillStyle = rand(i * 1.7) > 0.5 ? "#453b2c" : "#332b20";
      g.fillRect(x | 0, y | 0, 3, 3);
    }
    g.strokeStyle = "#6b5a3f";
    g.lineWidth = 10;
    g.strokeRect(14, 14, ARENA_W - 28, ARENA_H - 28);
    for (var p = 0; p < 14; p++) {
      var ang = (p / 14) * Math.PI * 2;
      var px = ARENA_W / 2 + Math.cos(ang) * (ARENA_W / 2 - 20);
      var py = ARENA_H / 2 + Math.sin(ang) * (ARENA_H / 2 - 20);
      g.fillStyle = "#7a6a45";
      g.fillRect(px - 3, py - 14, 6, 20);
    }
    return c;
  }

  function open(appearance, classId, onBackToClassSelect) {
    savedInteractables = EN.Interactable.snapshot();
    EN.Interactable.unregisterAll();

    var player = EN.Player.create(appearance, classId, ARENA_W / 2, ARENA_H / 2 + 140);

    var enemies = [
      EN.Enemy.spawn("rato_mato_corrompido", ARENA_W / 2 - 140, ARENA_H / 2 - 80),
      EN.Enemy.spawn("rato_mato_corrompido", ARENA_W / 2 + 140, ARENA_H / 2 - 60),
      EN.Enemy.spawn("cipo_vivo", ARENA_W / 2, ARENA_H / 2 - 180),
    ];

    var session = {
      isArena: true,
      classId: classId,
      player: player,
      enemies: enemies,
      coins: [],
      projectiles: [],
      fx: [],
      worldCanvas: bakeGround(),
      worldW: ARENA_W,
      worldH: ARENA_H,
      camera: EN.Camera.create(player.x, player.y),
      meta: { vintem: 0, day: 0, dayT: 13, level: null, showClock: false },
      respawnEnemies: function () {
        enemies.length = 0;
        enemies.push(
          EN.Enemy.spawn("rato_mato_corrompido", ARENA_W / 2 - 140, ARENA_H / 2 - 80),
          EN.Enemy.spawn("rato_mato_corrompido", ARENA_W / 2 + 140, ARENA_H / 2 - 60),
          EN.Enemy.spawn("cipo_vivo", ARENA_W / 2, ARENA_H / 2 - 180)
        );
      },
    };

    document.getElementById("screen-classselect").classList.remove("active");
    document.getElementById("screen-game").classList.add("active");
    document.getElementById("arena-banner").classList.add("visible");
    document.getElementById("arena-banner-class").textContent = EN.Classes.getById(classId).name;
    EN.Main.setSession(session);

    var backBtn = document.getElementById("arena-back");
    var chooseBtn = document.getElementById("arena-choose");
    backBtn.onclick = function () {
      close();
      EN.Main.restoreMainSession();
      document.getElementById("screen-game").classList.remove("active");
      document.getElementById("screen-classselect").classList.add("active");
      onBackToClassSelect();
    };
    chooseBtn.onclick = function () {
      close();
      EN.Main.confirmClassFromArena(classId, appearance);
    };
  }

  function close() {
    document.getElementById("arena-banner").classList.remove("visible");
    if (savedInteractables) EN.Interactable.restore(savedInteractables);
  }

  return { open: open };
})();
