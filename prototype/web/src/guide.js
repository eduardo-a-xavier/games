window.EN = window.EN || {};

/*
 * Orientação espacial: minimapa + trilha guia.
 *
 * O problema que isso resolve é concreto — o Sítio tem 1700×1100 e a
 * câmera mostra ~800×450. O jogador enxerga menos de um quinto do mapa e
 * a missão diz "fale com Dona Micaela" sem dizer onde ela está. Quem não
 * decorou o mapa fica andando em círculo, e andar em círculo é o jeito
 * mais rápido de largar um jogo.
 *
 * Duas camadas, de propósito:
 *
 *  - MINIMAPA (canto da tela): a planta do lugar. Responde "onde eu
 *    estou e o que existe por perto".
 *  - TRILHA GUIA (no chão): pontinhos tênues saindo dos pés do jogador na
 *    direção do objetivo atual. Responde "pra onde eu vou agora" sem
 *    tirar o olho do jogo. É tênue de propósito: guia quem está perdido e
 *    desaparece pra quem já sabe o caminho.
 *
 * A trilha é uma LINHA RETA até o alvo, não um caminho calculado. O mapa
 * é aberto, sem paredes que forcem desvio, então uma seta honesta vale
 * mais que um pathfinding que ninguém pediu.
 */
EN.Guide = (function () {
  /*
   * Onde fica cada objetivo. Resolvido no momento do desenho a partir da
   * missão ativa — nada aqui é guardado, então mudar a história em
   * story.js nunca deixa o guia apontando pro lugar errado.
   */
  function currentTarget(session) {
    var cur = EN.Quests.active();
    if (!cur || !cur.objective) return null;
    var obj = cur.objective;

    if (obj.type === "talk") {
      var spot = null;
      EN.World.NPC_SPOTS.forEach(function (s) {
        if (s.id === obj.npc) spot = s;
      });
      if (spot) return { x: spot.x, y: spot.y, label: EN.Story.npcName(obj.npc), icon: "💬", world: true };
      // a Iara mora dentro do Brejo: no mundo aberto, aponta pra entrada
      if (obj.npc === "iara") return areaTarget(session, "brejo");
      return null;
    }

    if (obj.type === "reach") return areaTarget(session, obj.area);

    if (obj.type === "flag") {
      if (obj.flag === "raiz_tocada") return { x: 330, y: 480, label: "Luz estranha", icon: "🔍", world: true };
      if (obj.flag === "boss_morto") return areaTarget(session, "camara");
      if (obj.flag === "boitata_apaziguado") return areaTarget(session, "poco");
      return null;
    }

    if (obj.type === "kill") {
      // aponta pro inimigo vivo mais próximo que conta pro objetivo
      var best = null,
        bestD = Infinity;
      (session.enemies || []).forEach(function (e) {
        if (e.dead) return;
        if (obj.defId && e.defId !== obj.defId) return;
        var d = Math.hypot(e.x - session.player.x, e.y - session.player.y);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      });
      if (best) return { x: best.x, y: best.y, label: best.def.name, icon: "⚔️", world: false };
      return null;
    }
    return null;
  }

  // pontos de entrada de área, por sessão em que o jogador está
  function areaTarget(session, area) {
    if (area === "mina") {
      if (session.isMine) return null; // já chegou
      return { x: 1440, y: 166, label: "Mina Santa Luzia", icon: "⛰️", world: true };
    }
    if (area === "camara") {
      if (!session.isMine) return { x: 1440, y: 166, label: "Mina Santa Luzia", icon: "⛰️", world: true };
      return { x: session.worldW / 2, y: EN.Mine.CHAMBER_Y - 40, label: "Câmara Funda", icon: "🕯️", world: false };
    }
    if (area === "brejo") {
      if (session.isBrejo) return null;
      var b = EN.World.BREJO_ENTRANCE;
      return { x: b.x, y: b.y, label: "Brejo das Lanternas", icon: "🏮", world: true };
    }
    if (area === "poco") {
      if (!session.isBrejo) {
        var e = EN.World.BREJO_ENTRANCE;
        return { x: e.x, y: e.y, label: "Brejo das Lanternas", icon: "🏮", world: true };
      }
      return { x: session.worldW / 2, y: EN.Brejo.POCO_Y - 40, label: "Poço Fundo", icon: "🌊", world: false };
    }
    return null;
  }

  /*
   * Trilha guia no chão. Pontinhos que "andam" na direção do alvo, com a
   * opacidade caindo conforme se afastam do jogador — o olho segue o
   * movimento sem que a linha dispute atenção com o combate.
   *
   * Some sozinha quando o alvo está perto (você já chegou) e durante uma
   * luta (ninguém precisa de GPS levando porrada).
   */
  function drawTrail(ctx, session, camX, camY, time) {
    var target = target_(session);
    if (!target) return;
    var p = session.player;
    var dx = target.x - p.x,
      dy = target.y - p.y;
    var dist = Math.hypot(dx, dy);
    if (dist < 130) return; // perto o bastante: a seta viraria estorvo

    // em combate a trilha se apaga: o jogador tem coisa mais urgente
    var inCombat = (session.enemies || []).some(function (e) {
      return !e.dead && e.state !== "patrol" && e.state !== "dormant" && e.state !== "disguised" &&
        Math.hypot(e.x - p.x, e.y - p.y) < 240;
    });
    if (inCombat) return;

    var ang = Math.atan2(dy, dx);
    var reach = Math.min(dist - 40, 150);
    ctx.save();
    for (var i = 0; i < 7; i++) {
      // o "+ time" faz os pontos correrem na direção do alvo
      var f = ((i / 7) + (time * 0.4) % (1 / 7)) % 1;
      var d = 42 + f * reach;
      var x = p.x - camX + Math.cos(ang) * d;
      var y = p.y - camY + Math.sin(ang) * d + 6;
      var fade = Math.sin(f * Math.PI); // nasce e morre suave nas pontas
      ctx.globalAlpha = fade * 0.34;
      ctx.fillStyle = "#f2b705";
      ctx.beginPath();
      ctx.ellipse(x, y, 3.4 - f * 1.2, 2 - f * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /*
   * Dentro de um interior (casa, mina, brejo), um alvo que fica no mundo
   * aberto é inseguível: a trilha apontaria pra dentro de uma parede. O
   * próximo passo real ali é a PORTA, então é pra ela que o guia aponta —
   * e só depois de sair o alvo verdadeiro volta a valer.
   */
  function redirectIfIndoors(session, target) {
    if (!target || !target.world) return target;
    var indoors = session.isHouse || session.isMine || session.isBrejo;
    if (!indoors) return target;
    var exit = EN.Interactable.snapshot().filter(function (o) {
      return o.type === "house_exit" || o.type === "mine_exit" || o.type === "brejo_exit";
    })[0];
    if (!exit) return null;
    return { x: exit.x, y: exit.y, label: "Saída · " + target.label, icon: "🚪", world: false };
  }

  // cache de um quadro: currentTarget varre inimigos, e o guia é chamado
  // três vezes por quadro (trilha + minimapa + texto do rastreador)
  var cached = null,
    cachedAt = -1;
  function target_(session) {
    var now = performance.now();
    if (cachedAt === now) return cached;
    cachedAt = now;
    cached = redirectIfIndoors(session, currentTarget(session));
    return cached;
  }

  /*
   * MINIMAPA. Desenhado num canvas próprio do HUD (não no mundo), então
   * não sofre zoom nem tremor de câmera.
   */
  function drawMinimap(canvas, session) {
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var W = canvas.width,
      H = canvas.height;
    var p = session.player;
    var sx = W / session.worldW,
      sy = H / session.worldH;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = session.isMine ? "#1d1720" : session.isBrejo ? "#14201c" : "#1b3025";
    ctx.fillRect(0, 0, W, H);

    // água do brejo: a única feição de terreno que muda a decisão do
    // jogador (fogo apaga nela), então é a única que o minimapa mostra
    if (session.isBrejo && EN.Brejo.WATER) {
      ctx.fillStyle = "rgba(70,130,150,.55)";
      EN.Brejo.WATER.forEach(function (w) {
        ctx.fillRect(w.x * sx, w.y * sy, w.w * sx, w.h * sy);
      });
    }

    if (session.showNpcs) {
      ctx.fillStyle = "#7fd0a0";
      EN.World.NPC_SPOTS.forEach(function (s) {
        dot(ctx, s.x * sx, s.y * sy, 2);
      });
    }

    (session.enemies || []).forEach(function (e) {
      if (e.dead || e.state === "disguised") return;
      var boss = EN.Enemy.isBoss(e) || EN.Enemy.isMiniBoss(e);
      ctx.fillStyle = boss ? "#ff7a3a" : "#d0544a";
      dot(ctx, e.x * sx, e.y * sy, boss ? 3 : 1.8);
    });

    var t = target_(session);
    if (t) {
      // alvo pulsa pra ser achado num relance
      var pulse = 3 + Math.abs(Math.sin(performance.now() / 320)) * 2;
      ctx.strokeStyle = "#f2b705";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(t.x * sx, t.y * sy, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // jogador por último, com um triângulo na direção que encara
    var px = p.x * sx,
      py = p.y * sy;
    var ang = Math.atan2(p.facing.y, p.facing.x);
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(ang) * 5, py + Math.sin(ang) * 5);
    ctx.lineTo(px + Math.cos(ang + 2.5) * 4, py + Math.sin(ang + 2.5) * 4);
    ctx.lineTo(px + Math.cos(ang - 2.5) * 4, py + Math.sin(ang - 2.5) * 4);
    ctx.closePath();
    ctx.fill();
  }

  function dot(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // texto do rastreador de missão: "▸ Dona Micaela · 240m a nordeste"
  function targetHint(session) {
    var t = target_(session);
    if (!t) return "";
    var p = session.player;
    var dx = t.x - p.x,
      dy = t.y - p.y;
    var d = Math.round(Math.hypot(dx, dy));
    if (d < 130) return t.icon + " " + t.label + " · aqui perto";
    var dirs = ["leste", "sudeste", "sul", "sudoeste", "oeste", "noroeste", "norte", "nordeste"];
    var idx = Math.round((Math.atan2(dy, dx) + Math.PI * 2) / (Math.PI / 4)) % 8;
    return t.icon + " " + t.label + " · " + d + "m a " + dirs[idx];
  }

  return {
    drawTrail: drawTrail,
    drawMinimap: drawMinimap,
    targetHint: targetHint,
    currentTarget: target_,
  };
})();
