window.EN = window.EN || {};

/*
 * Interior da casa do jogador — o primeiro lugar do jogo que não é
 * hostil.
 *
 * Por que uma casa existe num jogo de combate: porque um lugar SEU é o
 * que transforma "estou jogando uma fase" em "estou morando aqui". O
 * baú guarda o que você achou, a cama passa a noite e cura, e as duas
 * coisas juntas dão motivo pra voltar — que é o que faz alguém abrir o
 * jogo amanhã de novo.
 *
 * Tecnicamente é a mesma sessão da Mina e do Brejo (mesmo contrato), só
 * que sem inimigos: reaproveita o Player do mundo, salva a posição na
 * entrada e devolve na saída.
 */
EN.House = (function () {
  var W = 460,
    H = 320;
  var DOOR = { x: W / 2, y: H - 40 };

  var savedInteractables = null;
  var savedPos = null;
  var session = null;

  /*
   * O que pode ser guardado. `curas` sai do inventário ativo, o resto é
   * loot que hoje só tem valor de Vintém — guardar é o começo do sistema
   * de recursos, não o fim dele.
   */
  var STORABLE = [
    { id: "curas", name: "Preparo de ervas", icon: "🧪" },
    { id: "vintem", name: "Vintém", icon: "🪙" },
  ];

  function bakeGround() {
    var c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    var g = c.getContext("2d");

    // chão de tábua corrida
    g.fillStyle = "#5a4029";
    g.fillRect(0, 0, W, H);
    for (var y = 0; y < H; y += 22) {
      g.fillStyle = y % 44 === 0 ? "#63472e" : "#553d27";
      g.fillRect(0, y, W, 22);
      g.strokeStyle = "rgba(30,18,10,.45)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }

    // paredes de taipa nas bordas
    g.fillStyle = "#8a6a45";
    g.fillRect(0, 0, W, 46);
    g.fillRect(0, 0, 26, H);
    g.fillRect(W - 26, 0, 26, H);
    g.fillRect(0, H - 20, W, 20);
    g.fillStyle = "rgba(0,0,0,.22)";
    g.fillRect(0, 42, W, 6);

    // janelas com luz entrando
    [110, W - 110].forEach(function (wx) {
      g.fillStyle = "#f5e8bc";
      g.fillRect(wx - 22, 10, 44, 30);
      g.strokeStyle = "#5a3a22";
      g.lineWidth = 3;
      g.strokeRect(wx - 22, 10, 44, 30);
      var beam = g.createLinearGradient(wx, 40, wx, 150);
      beam.addColorStop(0, "rgba(255,240,190,.24)");
      beam.addColorStop(1, "rgba(255,240,190,0)");
      g.fillStyle = beam;
      g.beginPath();
      g.moveTo(wx - 22, 40);
      g.lineTo(wx + 22, 40);
      g.lineTo(wx + 46, 150);
      g.lineTo(wx - 46, 150);
      g.closePath();
      g.fill();
    });

    drawBed(g, 78, 110);
    drawChest(g, W - 96, 120);
    drawTable(g, W / 2, 190);

    // porta de saída
    g.fillStyle = "#4a2e18";
    g.fillRect(DOOR.x - 20, H - 22, 40, 22);
    g.fillStyle = "#c9a227";
    g.beginPath();
    g.arc(DOOR.x + 12, H - 11, 2.5, 0, Math.PI * 2);
    g.fill();

    return c;
  }

  function drawBed(g, x, y) {
    g.fillStyle = "#6b4a2a";
    g.fillRect(x - 26, y - 34, 52, 78);
    g.fillStyle = "#8a6540";
    g.fillRect(x - 26, y - 34, 52, 6);
    g.fillStyle = "#c9d8dd";
    g.fillRect(x - 22, y - 28, 44, 30);
    g.fillStyle = "#a8425a";
    g.fillRect(x - 22, y + 2, 44, 38);
    g.strokeStyle = "rgba(30,18,10,.4)";
    g.lineWidth = 1.5;
    g.strokeRect(x - 26, y - 34, 52, 78);
  }

  function drawChest(g, x, y) {
    g.fillStyle = "#5a3a1e";
    g.fillRect(x - 24, y - 8, 48, 30);
    var lid = g.createLinearGradient(x, y - 26, x, y - 6);
    lid.addColorStop(0, "#7a5228");
    lid.addColorStop(1, "#5a3a1e");
    g.fillStyle = lid;
    g.beginPath();
    g.moveTo(x - 24, y - 6);
    g.lineTo(x - 24, y - 16);
    g.quadraticCurveTo(x, y - 30, x + 24, y - 16);
    g.lineTo(x + 24, y - 6);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(30,18,10,.5)";
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = "#c9a227";
    g.fillRect(x - 4, y - 12, 8, 14);
    g.fillStyle = "#3a2a14";
    g.beginPath();
    g.arc(x, y - 2, 2, 0, Math.PI * 2);
    g.fill();
  }

  function drawTable(g, x, y) {
    g.fillStyle = "#6b4a2a";
    g.fillRect(x - 40, y - 16, 80, 32);
    g.fillStyle = "#7d5832";
    g.fillRect(x - 40, y - 16, 80, 5);
    g.strokeStyle = "rgba(30,18,10,.4)";
    g.lineWidth = 1.5;
    g.strokeRect(x - 40, y - 16, 80, 32);
    // lampião
    g.fillStyle = "#c9a227";
    g.fillRect(x - 5, y - 30, 10, 14);
    var glow = g.createRadialGradient(x, y - 24, 2, x, y - 24, 34);
    glow.addColorStop(0, "rgba(255,220,130,.5)");
    glow.addColorStop(1, "rgba(255,220,130,0)");
    g.fillStyle = glow;
    g.beginPath();
    g.arc(x, y - 24, 34, 0, Math.PI * 2);
    g.fill();
  }

  // ---------------------------------------------------------------
  // baú: transferir entre inventário e armazenamento
  // ---------------------------------------------------------------
  function storage() {
    var w = EN.State.data.world;
    if (!w.storage || typeof w.storage !== "object") w.storage = {};
    return w.storage;
  }

  function heldOf(id, player) {
    if (id === "curas") return player.healCharges;
    if (id === "vintem") return EN.State.data.world.vintem;
    return 0;
  }

  function setHeld(id, player, value) {
    if (id === "curas") {
      player.healCharges = value;
      EN.State.data.world.inventory.curas = value;
    } else if (id === "vintem") {
      EN.State.data.world.vintem = value;
    }
  }

  /*
   * `amount` positivo guarda, negativo retira. Devolve quanto realmente
   * moveu — nunca deixa nenhum dos dois lados negativo, então clicar
   * rápido demais não cria nem some com item.
   */
  function move(id, amount, player) {
    var store = storage();
    var held = heldOf(id, player);
    var stored = store[id] || 0;
    var moved = amount > 0 ? Math.min(amount, held) : -Math.min(-amount, stored);
    if (!moved) return 0;
    setHeld(id, player, held - moved);
    store[id] = stored + moved;
    EN.State.persist();
    return moved;
  }

  // ---------------------------------------------------------------
  // dormir
  // ---------------------------------------------------------------
  /*
   * Dormir avança para as 6h do dia seguinte e cura tudo. É o único jeito
   * de recuperar vida sem gastar preparo, e custa o dia — quem dorme
   * perde as criaturas que só aparecem de noite.
   */
  function sleep(player, toast) {
    var w = EN.State.data.world;
    if (player.hp >= player.hpMax && w.dayT > 5 && w.dayT < 12) {
      toast("Você não está com sono nem cansaço.");
      return false;
    }
    w.day += 1;
    w.dayT = 6;
    player.hp = player.hpMax;
    player.st = player.stMax;
    player.mp = player.mpMax;
    EN.Combat.clearStatus(player);
    EN.State.persist();
    toast("Você dormiu até o amanhecer. Dia " + w.day + ".");
    EN.Audio.play("levelup");
    return true;
  }

  // ---------------------------------------------------------------
  // entrar / sair
  // ---------------------------------------------------------------
  function enter(mainSession, hooks) {
    hooks = hooks || {};
    savedInteractables = EN.Interactable.snapshot();
    EN.Interactable.unregisterAll();

    var player = mainSession.player;
    savedPos = { x: player.x, y: player.y };
    player.x = DOOR.x;
    player.y = DOOR.y - 20;
    player.facing = { x: 0, y: -1 };

    EN.Interactable.register({
      x: DOOR.x,
      y: DOOR.y + 6,
      range: 44,
      icon: "🚪",
      label: "Sair",
      type: "house_exit",
      onInteract: function () {
        exit();
        if (hooks.onExit) hooks.onExit();
      },
    });

    EN.Interactable.register({
      x: W - 96,
      y: 128,
      range: 48,
      icon: "🧰",
      label: "Abrir o baú",
      type: "chest",
      onInteract: function () {
        if (hooks.onChest) hooks.onChest();
      },
    });

    EN.Interactable.register({
      x: 78,
      y: 118,
      range: 50,
      icon: "🛏️",
      label: "Dormir",
      type: "bed",
      onInteract: function () {
        if (hooks.onSleep) hooks.onSleep();
      },
    });

    session = {
      isArena: false,
      isHouse: true,
      player: player,
      enemies: [],
      coins: [],
      projectiles: [],
      enemyProjectiles: [],
      fx: [],
      worldCanvas: bakeGround(),
      worldW: W,
      worldH: H,
      camera: EN.Camera.create(player.x, player.y),
      meta: EN.State.data.world,
      areaName: "Sua casa",
    };

    EN.Main.setSession(session);
    return session;
  }

  function exit() {
    if (!session) return;
    var player = session.player;
    if (savedPos) {
      player.x = savedPos.x;
      player.y = savedPos.y;
    }
    if (savedInteractables) EN.Interactable.restore(savedInteractables);
    session = null;
    EN.Main.restoreMainSession();
  }

  return {
    enter: enter,
    exit: exit,
    sleep: sleep,
    move: move,
    storage: storage,
    heldOf: heldOf,
    STORABLE: STORABLE,
    current: function () {
      return session;
    },
  };
})();
