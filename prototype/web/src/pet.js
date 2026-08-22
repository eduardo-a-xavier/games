window.EN = window.EN || {};

/*
 * Companheiro — o Saci.
 *
 * Chamar isso de "pet" seria errado, e não só por delicadeza: o Saci do
 * folclore é uma PESSOA encantada, esperta e debochada, não um bicho de
 * estimação. Então ele não é capturado nem domado. Ele prega uma peça em
 * você, e se você rir em vez de brigar, ele decide te acompanhar porque
 * te achou divertido. É exatamente o que o bestiário já dizia dele:
 * "prefere rir de quem se irrita do que brigar com quem ri junto".
 *
 * O que ele faz, e a regra que separa isso de um companheiro quebrado:
 *
 *   ELE MUDA O QUE VOCÊ SABE, NUNCA QUANTO DANO VOCÊ CAUSA.
 *
 * Todo o combate do jogo é ler telegraph e controlar espaço. Um
 * companheiro que bate faria o inimigo se distrair, interromperia o
 * aviso e tiraria o sentido da esquiva perfeita — daria pra reafinar as
 * 14 IAs em cima disso, mas o jogo ficaria pior. Então ele dá
 * INFORMAÇÃO e POUPA TRABALHO:
 *
 *  - FARO: marca no minimapa o que está maduro na roça.
 *  - AVISO: estufa e aponta quando tem emboscada por perto (Espantalho
 *    disfarçado, Onça sumida na neblina). Esses dois atacam sem aviso de
 *    propósito; o Saci não tira a dificuldade, tira a injustiça.
 *  - COLHEITA: colhe a roça enquanto você dorme.
 *
 * Sobe de nível sendo ALIMENTADO com o que você planta — o que amarra
 * roça, companheiro e exploração num loop só em vez de três sistemas
 * soltos. Nível aumenta alcance de faro e quanto ele colhe dormindo.
 * Nada disso entra na conta de dano.
 */
EN.Pet = (function () {
  var FOLLOW_DIST = 34; // fica atrás, nunca em cima do jogador
  var SPEED = 210;

  // estado vivo (posição, animação). O que PERSISTE fica no save.
  var live = null;

  function data() {
    var pr = EN.State.data.progress;
    if (!pr.pet || typeof pr.pet !== "object" || Array.isArray(pr.pet)) {
      pr.pet = { has: false, name: "Saci", level: 1, fed: 0, met: false };
    }
    return pr.pet;
  }

  function has() {
    return !!data().has;
  }

  /*
   * Alcance do faro por nível. Cresce devagar e para no 5 — um
   * companheiro que enxerga o mapa inteiro apaga a exploração que ele
   * deveria ajudar.
   */
  function senseRange() {
    return 220 + Math.min(data().level, 5) * 60;
  }

  // quantos canteiros ele colhe por noite
  function harvestCap() {
    return Math.min(data().level, 5);
  }

  // comida pra subir de nível: cresce, então nível 5 é uma jornada
  function feedNeeded() {
    return 3 + (data().level - 1) * 2;
  }

  // ---------------------------------------------------------------
  // ganhar o companheiro
  // ---------------------------------------------------------------
  /*
   * O encontro. Ele some com uma coisa sua e devolve na hora — o teste
   * não é de habilidade, é de temperamento, e é a única coisa no jogo
   * que se resolve por bom humor.
   */
  function meet(toast) {
    var d = data();
    if (d.has) {
      EN.Dialogue.play([
        { who: "Saci", icon: "🌀", text: "Ô! Tava aqui te esperando. Vamo?" },
      ]);
      return;
    }

    var line = function (text, choices) {
      var n = { who: "Saci", icon: "🌀", text: text };
      if (choices) n.choices = choices;
      return n;
    };

    EN.Dialogue.play(
      [
        { who: "", icon: "✦", text: "O redemoinho de folhas para na sua frente. Dentro dele tem um menino de uma perna só, gorro vermelho, cachimbo aceso." },
        line("Ó, moço. Cadê teu preparo de ervas?"),
        { who: "", icon: "✦", text: "Você leva a mão ao bolso. Está vazio." },
        line("Tá aqui, ó.", [
          { label: "Rir da situação", value: "riu" },
          { label: "Mandar devolver na hora", value: "brigou" },
        ]),
      ],
      {
        onEnd: function (escolha) {
          if (escolha === "riu") {
            d.has = true;
            d.met = true;
            EN.State.persist();
            EN.Dialogue.play([
              line("Hahaha! Esse aqui é gente boa."),
              line("Vou junto, então. Não pago nada, não como muito, e acho as coisa antes de você."),
              { who: "", icon: "✦", text: "O Saci apagou o cachimbo e sentou no seu ombro do vento. Ele vem com você agora." },
            ], {
              onEnd: function () {
                if (toast) toast("🌀 O Saci resolveu te acompanhar.");
                EN.Audio.play("levelup");
              },
            });
          } else {
            d.met = true;
            EN.State.persist();
            EN.Dialogue.play([
              line("Ô moço sem graça. Toma, tá aqui."),
              { who: "", icon: "✦", text: "Ele devolve tudo e some no redemoinho. Talvez volte, se você aparecer de melhor humor." },
            ]);
          }
        },
      }
    );
  }

  // ---------------------------------------------------------------
  // alimentar
  // ---------------------------------------------------------------
  function feed(cropId) {
    var d = data();
    if (!d.has) return { ok: false, msg: "Você ainda não tem companheiro." };
    var crop = EN.Farm.CROPS[cropId];
    if (!crop) return { ok: false, msg: "Isso não se come." };
    if (d.level >= 5) return { ok: false, msg: "Ele já está no ponto — não cabe mais." };
    d.fed++;
    var msg = crop.icon + " O Saci comeu. (" + d.fed + "/" + feedNeeded() + ")";
    if (d.fed >= feedNeeded()) {
      d.fed = 0;
      d.level++;
      msg = "🌀 O Saci ficou mais esperto — nível " + d.level + ". Fareja mais longe e colhe mais.";
    }
    EN.State.persist();
    return { ok: true, msg: msg, leveled: d.fed === 0 };
  }

  // ---------------------------------------------------------------
  // colheita noturna
  // ---------------------------------------------------------------
  /*
   * Chamado quando o jogador dorme. Colhe até `harvestCap` canteiros
   * maduros — não todos, de propósito: o companheiro ajuda, não
   * substitui. Quem quiser a roça inteira ainda vai lá com a mão.
   */
  function harvestOvernight() {
    if (!has()) return null;
    var farm = EN.Farm.state();
    var cap = harvestCap();
    var got = 0,
      total = 0;
    for (var i = 0; i < farm.length && got < cap; i++) {
      if (EN.Farm.stageOf(farm[i]).stage !== "maduro") continue;
      var r = EN.Farm.harvest(i);
      if (r.ok) {
        got++;
        total += r.pay;
      }
    }
    if (!got) return null;
    return { count: got, vintem: total };
  }

  // ---------------------------------------------------------------
  // faro: o que ele percebe agora
  // ---------------------------------------------------------------
  /*
   * Emboscada por perto. Só conta o que ATACA SEM AVISO — o Espantalho
   * ainda disfarçado e a Onça enquanto invisível. Um charger comum já
   * telegrafa sozinho e não precisa de dedo-duro.
   */
  function ambushNear(session) {
    if (!has() || !session) return null;
    var p = session.player;
    var r = senseRange();
    var best = null,
      bestD = r;
    (session.enemies || []).forEach(function (e) {
      if (e.dead) return;
      var escondido = e.state === "disguised" || (e.arch === "stalker" && e.fade < 0.5);
      if (!escondido) return;
      var d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    });
    return best;
  }

  function ripeNear(session) {
    if (!has() || !session || !session.showNpcs) return [];
    var p = session.player;
    var r = senseRange();
    var out = [];
    EN.Farm.state().forEach(function (plot, i) {
      if (EN.Farm.stageOf(plot).stage !== "maduro") return;
      var pos = EN.Farm.plotPos(i);
      if (Math.hypot(pos.x - p.x, pos.y - p.y) < r) out.push(pos);
    });
    return out;
  }

  // ---------------------------------------------------------------
  // vida (posição e animação)
  // ---------------------------------------------------------------
  function ensure(player) {
    if (!live) live = { x: player.x - 30, y: player.y + 10, t: 0, hop: 0, alert: 0, facing: 1 };
    return live;
  }

  function update(session, dt) {
    if (!has() || !session) {
      live = null;
      return;
    }
    var p = session.player;
    var s = ensure(p);
    s.t += dt;

    // segue com atraso: só corre quando ficou pra trás, senão fica
    // flutuando por perto. É o que faz ele parecer companhia em vez de
    // um segundo cursor colado no jogador.
    var dx = p.x - s.x,
      dy = p.y + 8 - s.y;
    var d = Math.hypot(dx, dy);
    if (d > FOLLOW_DIST) {
      var k = Math.min(1, (d - FOLLOW_DIST) / 60);
      s.x += (dx / d) * SPEED * k * dt;
      s.y += (dy / d) * SPEED * k * dt;
      s.hop += dt * 11;
      if (Math.abs(dx) > 4) s.facing = dx > 0 ? 1 : -1;
    } else {
      s.hop += dt * 3.5;
    }

    // o aviso dura um instante depois que a ameaça some, pra não piscar
    var amb = ambushNear(session);
    if (amb) {
      s.alert = 1.2;
      s.alertX = amb.x;
      s.alertY = amb.y;
      if (!s.alerted) {
        s.alerted = true;
        EN.Audio.play("enemyShot");
      }
    } else {
      s.alerted = false;
      if (s.alert > 0) s.alert -= dt;
    }
  }

  // ---------------------------------------------------------------
  // desenho
  // ---------------------------------------------------------------
  /*
   * O Saci é desenhado pelos sinais que o folclore fixou: gorro
   * vermelho, uma perna só, cachimbo aceso e o redemoinho que o carrega.
   * Ele é um menino encantado, não um bicho — a silhueta é de gente, e
   * é assim que tem que ser.
   */
  function draw(ctx, camX, camY) {
    if (!has() || !live) return;
    var s = live;
    var x = s.x - camX,
      y = s.y - camY;
    var bob = Math.sin(s.hop) * 3;
    var flip = s.facing;

    // redemoinho de folhas na base — é o que o mantém no ar
    ctx.save();
    ctx.strokeStyle = "rgba(190,210,180,.35)";
    ctx.lineWidth = 1.6;
    for (var w = 0; w < 3; w++) {
      var a0 = s.t * 3.2 + w * 2.1;
      ctx.beginPath();
      ctx.ellipse(x, y + 4, 11 - w * 2.5, 4 - w * 0.9, a0 * 0.3, a0, a0 + 2.4);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(150,180,120,.5)";
    for (var lf = 0; lf < 3; lf++) {
      var la = s.t * 4 + lf * 2.4;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(la) * 12, y + 3 + Math.sin(la) * 4, 2, 1.2, la, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(flip, 1);

    // perna única — a marca dele. Desenhada com pé pra ficar claro que é
    // uma perna e não um tronco de vento.
    ctx.strokeStyle = "#4a332a";
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(-0.5, 4);
    ctx.stroke();
    ctx.fillStyle = "#3a2a20";
    ctx.beginPath();
    ctx.ellipse(0.6, 4.6, 2.6, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // tronco (camisa simples)
    ctx.fillStyle = "#c9503a";
    roundish(ctx, -5, -13, 10, 12, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(24,17,12,.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // braços
    ctx.strokeStyle = "#4a332a";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.lineTo(-8, -5 + Math.sin(s.hop * 0.8) * 1.5);
    ctx.moveTo(4, -10);
    ctx.lineTo(8, -6);
    ctx.stroke();

    // cabeça
    ctx.beginPath();
    ctx.arc(0, -18, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#4a332a";
    ctx.fill();
    ctx.strokeStyle = "rgba(24,17,12,.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // gorro vermelho — o sinal mais reconhecível dele. Pontudo e caído
    // pra trás, que é como o barrete aparece em toda ilustração dele.
    ctx.fillStyle = "#d13a2a";
    ctx.beginPath();
    ctx.moveTo(-6.8, -21.5);
    ctx.quadraticCurveTo(-5, -30, 1, -30.5);
    ctx.quadraticCurveTo(6, -30, 5.6, -22.5);
    ctx.quadraticCurveTo(0, -24.5, -6.8, -21.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(60,14,8,.6)";
    ctx.stroke();

    // olhos: pequenos e vivos. Grandes demais puxam pro desenho animado
    // e o Saci é malandro, não fofo.
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.arc(2.2, -19, 1.15, 0, Math.PI * 2);
    ctx.arc(-1.3, -19, 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c1210";
    ctx.beginPath();
    ctx.arc(2.5, -19, 0.62, 0, Math.PI * 2);
    ctx.arc(-1, -19, 0.62, 0, Math.PI * 2);
    ctx.fill();
    // sobrancelha levantada de quem está achando graça
    ctx.strokeStyle = "rgba(20,12,8,.6)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0.8, -21.4);
    ctx.lineTo(3.4, -20.8);
    ctx.stroke();

    // cachimbo aceso
    ctx.strokeStyle = "#6b4a2a";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(5, -17);
    ctx.lineTo(9, -16);
    ctx.stroke();
    ctx.fillStyle = "#ff8a3a";
    ctx.beginPath();
    ctx.arc(9.6, -16.4, 1.3, 0, Math.PI * 2);
    ctx.fill();
    // fumacinha
    ctx.fillStyle = "rgba(220,220,210,.3)";
    for (var sm = 0; sm < 2; sm++) {
      var sy = ((s.t * 14 + sm * 7) % 14);
      ctx.beginPath();
      ctx.arc(10 + Math.sin(s.t * 2 + sm) * 2, -18 - sy, 1.4 - sy / 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // AVISO DE EMBOSCADA: o ponto de exclamação sobe dele e uma linha
    // aponta pra ameaça. Informação, não dano.
    if (s.alert > 0) {
      var k = Math.min(1, s.alert / 1.2);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = "#e0483a";
      ctx.font = "bold 13px 'Silkscreen', monospace";
      ctx.textAlign = "center";
      ctx.fillText("!", x, y - 32 - (1 - k) * 6);
      if (s.alertX !== undefined) {
        var ax = s.alertX - camX,
          ay = s.alertY - camY;
        var ang = Math.atan2(ay - y, ax - x);
        ctx.strokeStyle = "rgba(224,72,58,.7)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * 14, y + Math.sin(ang) * 14);
        ctx.lineTo(x + Math.cos(ang) * 40, y + Math.sin(ang) * 40);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }

  function roundish(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  }

  function teleportTo(x, y) {
    if (live) {
      live.x = x - 30;
      live.y = y + 10;
    }
  }

  return {
    data: data,
    has: has,
    meet: meet,
    feed: feed,
    harvestOvernight: harvestOvernight,
    ripeNear: ripeNear,
    ambushNear: ambushNear,
    senseRange: senseRange,
    harvestCap: harvestCap,
    feedNeeded: feedNeeded,
    update: update,
    draw: draw,
    teleportTo: teleportTo,
    pos: function () {
      return live;
    },
  };
})();
