window.EN = window.EN || {};

/*
 * Entidades de inimigo — IA e desenho dirigidos pelo ARQUÉTIPO do
 * EnemyDefinition (bestiary.js), não pelo id. Cada arquétipo é uma forma
 * diferente de pressionar o jogador, pra que lutar contra dois inimigos
 * distintos exija respostas distintas:
 *
 *  - 'charger'   (Rato-do-Mato, Cão da Estrada): fecha distância, avisa e
 *                  investe em linha reta. Ensina a esquivar pro lado.
 *  - 'zoner'     (Cipó Vivo): fixo no lugar; agarra e ENRAÍZA quem fica
 *                  perto tempo demais. Ensina a não parar no lugar errado.
 *  - 'flyer'     (Morcego da Mina): voo errático e rápido, vida baixa,
 *                  mergulha sem aviso longo. Ensina a acertar alvo móvel.
 *  - 'ranged'    (Vagalume de Defunto): mantém distância e atira. Força o
 *                  jogador a avançar em vez de esperar.
 *  - 'brute'     (Sapo de Pedra): lento, aviso longo, golpe em área, muita
 *                  resistência a recuo. Ensina a ler e sair do círculo.
 *  - 'boss'      (Carcará de Ferro): 3 fases, ver GDD Seção 28.
 *
 * Todo inimigo tem POSTURA (poise): dano acumulado quebra a postura e
 * interrompe o que ele estava fazendo. É o que permite ao jogador
 * "cancelar" um golpe inimigo atacando na hora certa, em vez de só fugir.
 */
EN.Enemy = (function () {
  function rand(seed) {
    var x = Math.sin(seed * 999) * 10000;
    return x - Math.floor(x);
  }

  var ARCHETYPE = {
    rato_mato_corrompido: "charger",
    cao_da_estrada: "charger",
    cipo_vivo: "zoner",
    morcego_da_mina: "flyer",
    vagalume_de_defunto: "ranged",
    sapo_de_pedra: "brute",
    carcara_de_ferro: "boss",
  };

  var STATS = {
    rato_mato_corrompido: { hp: 34, r: 11, detect: 150, forget: 230, speed: 72, telegraph: 0.55, lungeSpeed: 210, dmg: 9, poise: 22, kbResist: 0 },
    cao_da_estrada: { hp: 58, r: 13, detect: 220, forget: 320, speed: 108, telegraph: 0.45, lungeSpeed: 300, dmg: 14, poise: 34, kbResist: 0.15, circles: true },
    cipo_vivo: { hp: 46, r: 13, territory: 78, grip: 40, grace: 1.0, dmg: 7, tickEvery: 0.7, poise: 40, kbResist: 1 },
    morcego_da_mina: { hp: 22, r: 9, detect: 200, forget: 300, speed: 128, telegraph: 0.3, lungeSpeed: 330, dmg: 7, poise: 12, kbResist: 0 },
    vagalume_de_defunto: { hp: 26, r: 9, detect: 260, forget: 340, speed: 62, keepAway: 130, telegraph: 0.6, dmg: 8, poise: 14, kbResist: 0, shotSpeed: 190 },
    sapo_de_pedra: { hp: 96, r: 17, detect: 170, forget: 240, speed: 42, telegraph: 0.8, dmg: 18, slamRadius: 62, poise: 70, kbResist: 0.75 },
    carcara_de_ferro: { hp: 620, r: 26, detect: 900, forget: 9999, speed: 86, telegraph: 0.7, dmg: 20, poise: 120, kbResist: 0.9 },
  };

  function archetypeOf(defId) {
    return ARCHETYPE[defId] || "charger";
  }

  function spawn(defId, x, y) {
    var def = EN.Bestiary.getById(defId);
    var s = STATS[defId];
    var arch = archetypeOf(defId);
    var e = {
      defId: defId,
      def: def,
      arch: arch,
      x: x,
      y: y,
      home: { x: x, y: y },
      r: s.r,
      hp: s.hp,
      hpMax: s.hp,
      state: arch === "zoner" ? "dormant" : "patrol",
      stateT: rand(x + y) * 2,
      target: null,
      telegraph: 0,
      telegraphMax: s.telegraph || 0.5,
      hitFlash: 0,
      dead: false,
      deadT: 0,
      walkT: rand(x * y + 1) * 10,
      nearT: 0,
      tickT: 0,
      vineReach: 0,
      poise: s.poise,
      poiseMax: s.poise,
      staggerT: 0,
      kbResist: s.kbResist || 0,
      kbx: 0,
      kby: 0,
      status: {},
      phase: 1,
      attackCd: 0,
      bob: rand(x + 7) * 6,
      facing: { x: 0, y: 1 },
    };
    return e;
  }

  function isBoss(e) {
    return e.arch === "boss";
  }

  function update(e, dt, player, api) {
    if (e.dead) return;
    var s = STATS[e.defId];
    e.walkT += dt;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.attackCd > 0) e.attackCd -= dt;

    EN.Combat.updateKnockback(e, dt);
    EN.Combat.updateStatus(e, dt, function (power, kind) {
      e.hp -= power;
      // número flutuante pro tick de sangramento/queimando — sem ele o
      // jogador não sabe se o efeito ainda está ativo depois de sair de perto
      api.spawnFx("dmgnum", { x: e.x, y: e.y - 14, value: Math.ceil(power), bleed: kind === "sangramento", burn: kind === "queimando" });
      if (e.hp <= 0) kill(e, api);
    });
    if (e.dead) return;

    // postura quebrada: o inimigo perde o turno inteiro. É a janela de
    // punição que o jogador conquistou batendo na hora certa.
    if (e.staggerT > 0) {
      e.staggerT -= dt;
      e.state = "stagger";
      if (e.staggerT <= 0) {
        e.state = e.arch === "zoner" ? "alert" : "chase";
        e.poise = e.poiseMax;
      }
      return;
    }
    if (e.poise < e.poiseMax) e.poise = Math.min(e.poiseMax, e.poise + dt * 8);

    var dx = player.x - e.x,
      dy = player.y - e.y;
    var dToPlayer = Math.hypot(dx, dy) || 1;
    e.facing.x = dx / dToPlayer;
    e.facing.y = dy / dToPlayer;

    if (e.arch === "zoner") return updateZoner(e, s, dt, player, dToPlayer, api);
    if (e.arch === "ranged") return updateRanged(e, s, dt, player, dToPlayer, api);
    if (e.arch === "flyer") return updateFlyer(e, s, dt, player, dToPlayer, api);
    if (e.arch === "brute") return updateBrute(e, s, dt, player, dToPlayer, api);
    if (e.arch === "boss") return updateBoss(e, s, dt, player, dToPlayer, api);
    return updateCharger(e, s, dt, player, dToPlayer, api);
  }

  function wander(e, dt, speed) {
    e.stateT -= dt;
    if (e.stateT <= 0 || !e.target) {
      e.target = { x: e.home.x + (rand(e.walkT) - 0.5) * 90, y: e.home.y + (rand(e.walkT + 2) - 0.5) * 90 };
      e.stateT = 1.5 + rand(e.walkT) * 2;
    }
    var tdx = e.target.x - e.x,
      tdy = e.target.y - e.y,
      td = Math.hypot(tdx, tdy);
    if (td > 4) {
      e.x += (tdx / td) * speed * dt;
      e.y += (tdy / td) * speed * dt;
    }
  }

  function startTelegraph(e, s, dur) {
    e.state = "telegraph";
    e.telegraphMax = dur || s.telegraph;
    e.telegraph = e.telegraphMax;
  }

  function beginLunge(e, player, duration) {
    e.state = "lunge";
    e.lungeT = duration;
    var lx = player.x - e.x,
      ly = player.y - e.y;
    var ld = Math.hypot(lx, ly) || 1;
    e.lx = lx / ld;
    e.ly = ly / ld;
  }

  function updateCharger(e, s, dt, player, d, api) {
    if (e.state === "patrol") {
      if (d < s.detect) e.state = "chase";
      else wander(e, dt, 30);
    } else if (e.state === "chase") {
      if (d > s.forget) {
        e.state = "patrol";
        e.stateT = 1;
        return;
      }
      // o Cão da Estrada circula antes de investir em vez de vir reto:
      // dois "chargers" que se movem igual seriam o mesmo inimigo
      if (s.circles && d < 120 && e.attackCd > 0) {
        var perp = Math.atan2(e.facing.y, e.facing.x) + Math.PI / 2;
        e.x += Math.cos(perp) * s.speed * 0.7 * dt;
        e.y += Math.sin(perp) * s.speed * 0.7 * dt;
        return;
      }
      if (d < e.r + 26) {
        startTelegraph(e, s);
        return;
      }
      e.x += e.facing.x * s.speed * dt;
      e.y += e.facing.y * s.speed * dt;
    } else if (e.state === "telegraph") {
      e.telegraph -= dt;
      if (e.telegraph <= 0) beginLunge(e, player, 0.24);
    } else if (e.state === "lunge") {
      e.lungeT -= dt;
      e.x += e.lx * s.lungeSpeed * dt;
      e.y += e.ly * s.lungeSpeed * dt;
      if (Math.hypot(player.x - e.x, player.y - e.y) < e.r + player.r + 4) {
        api.damagePlayer(s.dmg, e.x, e.y, e);
        e.state = "chase";
        e.attackCd = 1.1;
      }
      if (e.lungeT <= 0) {
        e.state = "chase";
        e.attackCd = 0.9;
      }
    }
  }

  function updateFlyer(e, s, dt, player, d, api) {
    // voo errático: mesmo perseguindo, oscila — obriga o jogador a mirar
    e.bob += dt * 6;
    var wobble = Math.sin(e.bob) * 40;
    if (e.state === "patrol") {
      if (d < s.detect) e.state = "chase";
      else wander(e, dt, 44);
    } else if (e.state === "chase") {
      if (d > s.forget) {
        e.state = "patrol";
        return;
      }
      if (d < e.r + 34 && e.attackCd <= 0) {
        startTelegraph(e, s, 0.3);
        return;
      }
      var ang = Math.atan2(e.facing.y, e.facing.x) + (wobble * Math.PI) / 180;
      e.x += Math.cos(ang) * s.speed * dt;
      e.y += Math.sin(ang) * s.speed * dt;
    } else if (e.state === "telegraph") {
      e.telegraph -= dt;
      if (e.telegraph <= 0) beginLunge(e, player, 0.2);
    } else if (e.state === "lunge") {
      e.lungeT -= dt;
      e.x += e.lx * s.lungeSpeed * dt;
      e.y += e.ly * s.lungeSpeed * dt;
      if (Math.hypot(player.x - e.x, player.y - e.y) < e.r + player.r + 3) {
        api.damagePlayer(s.dmg, e.x, e.y, e);
        e.state = "chase";
        e.attackCd = 1.4;
      }
      if (e.lungeT <= 0) {
        e.state = "chase";
        e.attackCd = 1.2;
      }
    }
  }

  function updateRanged(e, s, dt, player, d, api) {
    if (e.state === "patrol") {
      if (d < s.detect) e.state = "chase";
      else wander(e, dt, 26);
      return;
    }
    if (d > s.forget) {
      e.state = "patrol";
      return;
    }
    if (e.state === "chase") {
      // recua se o jogador chegar perto, avança se ficar longe demais:
      // punir quem tenta resolver a luta parado de longe
      if (d < s.keepAway - 25) {
        e.x -= e.facing.x * s.speed * dt;
        e.y -= e.facing.y * s.speed * dt;
      } else if (d > s.keepAway + 40) {
        e.x += e.facing.x * s.speed * 0.8 * dt;
        e.y += e.facing.y * s.speed * 0.8 * dt;
      }
      if (e.attackCd <= 0) startTelegraph(e, s);
    } else if (e.state === "telegraph") {
      e.telegraph -= dt;
      if (e.telegraph <= 0) {
        api.spawnEnemyProjectile({
          x: e.x,
          y: e.y - 6,
          vx: e.facing.x * s.shotSpeed,
          vy: e.facing.y * s.shotSpeed,
          r: 6,
          dmg: s.dmg,
          kind: "luz",
          life: 2.2,
        });
        EN.Audio.play("enemyShot");
        e.state = "chase";
        e.attackCd = 2.0;
      }
    }
  }

  function updateBrute(e, s, dt, player, d, api) {
    if (e.state === "patrol") {
      if (d < s.detect) e.state = "chase";
      else wander(e, dt, 18);
    } else if (e.state === "chase") {
      if (d > s.forget) {
        e.state = "patrol";
        return;
      }
      if (d < s.slamRadius - 8 && e.attackCd <= 0) {
        startTelegraph(e, s);
        return;
      }
      e.x += e.facing.x * s.speed * dt;
      e.y += e.facing.y * s.speed * dt;
    } else if (e.state === "telegraph") {
      e.telegraph -= dt;
      if (e.telegraph <= 0) {
        e.state = "slam";
        e.slamT = 0.18;
      }
    } else if (e.state === "slam") {
      e.slamT -= dt;
      if (e.slamT <= 0) {
        // golpe em ÁREA ao redor dele: esquivar pro lado não basta, tem
        // que sair do círculo — é o contraponto ao charger
        if (Math.hypot(player.x - e.x, player.y - e.y) < s.slamRadius + player.r) {
          api.damagePlayer(s.dmg, e.x, e.y, e);
        }
        api.spawnFx("shock", { x: e.x, y: e.y, radius: s.slamRadius });
        EN.Audio.play("slam");
        EN.Combat.shakeCamera(6, 0.3);
        e.state = "chase";
        e.attackCd = 2.2;
      }
    }
  }

  function updateZoner(e, s, dt, player, d, api) {
    if (d <= s.grip) {
      e.nearT += dt;
      if (e.state === "dormant") e.state = "alert";
      if (e.nearT >= s.grace && e.state !== "gripping") {
        e.state = "gripping";
        e.tickT = 0;
      }
    } else {
      e.nearT = Math.max(0, e.nearT - dt * 1.5);
      if (e.nearT <= 0 && e.state !== "dormant") e.state = d <= s.territory ? "alert" : "dormant";
    }

    if (e.state === "gripping") {
      e.vineReach = Math.min(1, e.vineReach + dt * 4);
      e.tickT -= dt;
      if (d > s.grip + 14) {
        e.state = "alert";
        e.vineReach = 0;
      } else if (e.tickT <= 0) {
        e.tickT = s.tickEvery;
        api.damagePlayer(s.dmg, e.x, e.y, e);
        EN.Combat.applyStatus(player, "enraizado", 0.7);
      }
    } else {
      e.vineReach = Math.max(0, e.vineReach - dt * 3);
    }
  }

  /*
   * Carcará de Ferro (GDD Seção 28). Três fases por faixa de vida; cada
   * fase acrescenta um ataque em vez de trocar o repertório, pra luta
   * ficar mais densa sem o jogador ter que reaprender tudo do zero.
   *   Fase 1: Bicada (investida curta)
   *   Fase 2: + Rajada de Penas (leque de projéteis)
   *   Fase 3: + Grito do Carcará (onda em área que enraíza)
   */
  var BOSS_MOVES = {
    1: ["bicada"],
    2: ["bicada", "rajada"],
    3: ["bicada", "rajada", "grito"],
  };

  function updateBoss(e, s, dt, player, d, api) {
    var pct = e.hp / e.hpMax;
    var newPhase = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
    if (newPhase !== e.phase) {
      e.phase = newPhase;
      e.state = "roar";
      e.stateT = 1.1;
      e.attackCd = 1.2;
      EN.Combat.shakeCamera(9, 0.7);
      EN.Audio.play("roar");
      api.spawnFx("shock", { x: e.x, y: e.y, radius: 90 });
      if (api.onBossPhase) api.onBossPhase(newPhase);
      return;
    }

    if (e.state === "roar") {
      e.stateT -= dt;
      if (e.stateT <= 0) e.state = "chase";
      return;
    }

    if (e.state === "patrol" || e.state === "chase") {
      if (e.attackCd <= 0 && d < 260) {
        var moves = BOSS_MOVES[e.phase];
        e.move = moves[Math.floor(Math.random() * moves.length)];
        startTelegraph(e, s, e.move === "grito" ? 0.85 : e.move === "rajada" ? 0.6 : 0.5);
        return;
      }
      if (d > 60) {
        e.x += e.facing.x * s.speed * dt;
        e.y += e.facing.y * s.speed * dt;
      }
    } else if (e.state === "telegraph") {
      e.telegraph -= dt;
      if (e.telegraph <= 0) executeBossMove(e, s, player, api);
    } else if (e.state === "lunge") {
      e.lungeT -= dt;
      e.x += e.lx * 340 * dt;
      e.y += e.ly * 340 * dt;
      if (Math.hypot(player.x - e.x, player.y - e.y) < e.r + player.r + 6) {
        api.damagePlayer(s.dmg, e.x, e.y, e);
        e.state = "chase";
        e.attackCd = 1.6;
      }
      if (e.lungeT <= 0) {
        e.state = "chase";
        e.attackCd = 1.5;
      }
    }
  }

  function executeBossMove(e, s, player, api) {
    if (e.move === "bicada") {
      beginLunge(e, player, 0.3);
      return;
    }
    if (e.move === "rajada") {
      var base = Math.atan2(e.facing.y, e.facing.x);
      for (var i = -2; i <= 2; i++) {
        var a = base + i * 0.22;
        api.spawnEnemyProjectile({
          x: e.x,
          y: e.y - 8,
          vx: Math.cos(a) * 210,
          vy: Math.sin(a) * 210,
          r: 5,
          dmg: 12,
          kind: "pena",
          life: 2.4,
        });
      }
      EN.Audio.play("shot");
      e.state = "chase";
      e.attackCd = 2.1;
      return;
    }
    if (e.move === "grito") {
      var reach = 150;
      if (Math.hypot(player.x - e.x, player.y - e.y) < reach) {
        api.damagePlayer(16, e.x, e.y, e);
        EN.Combat.applyStatus(player, "enraizado", 1.1);
      }
      api.spawnFx("shock", { x: e.x, y: e.y, radius: reach });
      EN.Audio.play("roar");
      EN.Combat.shakeCamera(10, 0.5);
      e.state = "chase";
      e.attackCd = 2.6;
      return;
    }
    e.state = "chase";
    e.attackCd = 1.4;
  }

  function kill(e, api) {
    if (e.dead) return;
    e.dead = true;
    e.deadT = 0;
    if (api && api.onKilled) api.onKilled(e);
  }

  function damage(e, dmg, onKilled) {
    if (e.dead) return;
    e.hp -= dmg;
    e.hitFlash = 0.18;
    e.poise -= dmg;
    // quebrar a postura interrompe telegraph/investida em andamento —
    // atacar na hora certa é defesa, não só dano
    if (e.poise <= 0 && e.state !== "stagger") {
      e.staggerT = isBoss(e) ? 0.55 : 0.42;
      EN.Audio.play("stagger");
      e.poise = 0;
      e.state = "stagger";
      e.vineReach = 0;
    }
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      e.deadT = 0;
      if (onKilled) onKilled(e);
    }
  }

  // ---------------- desenho ----------------

  var OUTLINE = "rgba(20,14,10,.55)";

  function shadeHex(hex, amt) {
    var num = parseInt(hex.replace("#", ""), 16);
    var r = Math.min(255, Math.max(0, (num >> 16) + amt));
    var g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
    var b = Math.min(255, Math.max(0, (num & 0xff) + amt));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function shadow(ctx, x, y, rx, ry) {
    var g = ctx.createRadialGradient(x, y, 1, x, y, rx);
    g.addColorStop(0, "rgba(0,0,0,.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  var DRAWERS = {
    rato_mato_corrompido: drawRato,
    cao_da_estrada: drawCao,
    cipo_vivo: drawCipoVivo,
    morcego_da_mina: drawMorcego,
    vagalume_de_defunto: drawVagalume,
    sapo_de_pedra: drawSapo,
    carcara_de_ferro: drawCarcara,
  };

  function draw(ctx, e, camX, camY) {
    var x = e.x - camX,
      y = e.y - camY;
    ctx.save();
    if (e.dead) ctx.globalAlpha = Math.max(0, 1 - e.deadT / 0.5);
    if (e.staggerT > 0) {
      // cambaleio visível da postura quebrada
      ctx.translate(x, y);
      ctx.rotate(Math.sin(e.staggerT * 40) * 0.12);
      ctx.translate(-x, -y);
    }

    (DRAWERS[e.defId] || drawRato)(ctx, e, x, y);

    if (!e.dead) {
      drawHealthBar(ctx, e, x, y);
      drawTelegraph(ctx, e, x, y);
      if (EN.Combat.hasStatus(e, "sangramento")) {
        ctx.fillStyle = "rgba(201,75,63,.9)";
        for (var i = 0; i < 3; i++) {
          var a = e.walkT * 3 + i * 2.1;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * e.r, y + ((e.walkT * 20 + i * 9) % 16) - 4, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function drawHealthBar(ctx, e, x, y) {
    var boss = isBoss(e);
    if (boss) return; // chefe usa a barra dedicada no HUD
    var w = 28,
      top = -e.r - 15;
    var pct = Math.max(0, e.hp / e.hpMax);
    ctx.fillStyle = "#000a";
    ctx.fillRect(x - w / 2, y + top, w, 4);
    ctx.fillStyle = "#c94b3f";
    ctx.fillRect(x - w / 2, y + top, w * pct, 4);
    if (e.poise < e.poiseMax) {
      ctx.fillStyle = "rgba(242,183,5,.85)";
      ctx.fillRect(x - w / 2, y + top + 4, w * Math.max(0, e.poise / e.poiseMax), 1.6);
    }
  }

  /*
   * Telegraph legível: anel que FECHA em direção ao inimigo (o jogador lê
   * "quanto falta" pelo tamanho) + brilho crescente. Antes era um anel
   * que só crescia e sumia, difícil de interpretar como contagem.
   */
  function drawTelegraph(ctx, e, x, y) {
    if (e.state === "telegraph") {
      var k = 1 - e.telegraph / e.telegraphMax;
      var s = STATS[e.defId];
      var areaR = e.arch === "brute" ? s.slamRadius : e.move === "grito" ? 150 : 0;
      if (areaR) {
        ctx.fillStyle = "rgba(224,72,58," + (0.1 + k * 0.16) + ")";
        ctx.beginPath();
        ctx.arc(x, y, areaR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(224,72,58,.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, areaR * (0.3 + k * 0.7), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(224,72,58,.95)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, e.r + 26 - k * 18, 0, Math.PI * 2);
        ctx.stroke();
        // seta curta na direção do bote
        ctx.beginPath();
        ctx.moveTo(x + e.facing.x * (e.r + 4), y + e.facing.y * (e.r + 4));
        ctx.lineTo(x + e.facing.x * (e.r + 16 + k * 10), y + e.facing.y * (e.r + 16 + k * 10));
        ctx.stroke();
      }
    } else if (e.state === "stagger") {
      ctx.fillStyle = "#f2b705";
      ctx.font = "bold 10px 'Silkscreen', monospace";
      ctx.textAlign = "center";
      ctx.fillText("!", x, y - e.r - 18);
    }
  }

  function bodyColor(e, hex) {
    return e.hitFlash > 0 ? "#f2b0a8" : hex;
  }

  function drawRato(ctx, e, x, y) {
    shadow(ctx, x, y + 9, 10, 4);
    var bodyHex = bodyColor(e, "#7a6a52");
    var bodyG = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 11);
    bodyG.addColorStop(0, shadeHex(bodyHex, 26));
    bodyG.addColorStop(1, shadeHex(bodyHex, -18));
    ctx.beginPath();
    ctx.ellipse(x, y, 11, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyG;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 9, y - 6);
    ctx.lineTo(x - 13, y - 13);
    ctx.lineTo(x - 5, y - 8);
    ctx.closePath();
    ctx.moveTo(x + 9, y - 6);
    ctx.lineTo(x + 13, y - 13);
    ctx.lineTo(x + 5, y - 8);
    ctx.closePath();
    ctx.fillStyle = shadeHex(bodyHex, -12);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#1c1420";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 3, y + 4);
    ctx.lineTo(x + 1, y - 1);
    ctx.stroke();
    ctx.fillStyle = e.state === "chase" || e.state === "telegraph" || e.state === "lunge" ? "#e0483a" : "#e07a2a";
    ctx.beginPath();
    ctx.arc(x - 3, y - 1, 1.6, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 1, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCao(ctx, e, x, y) {
    shadow(ctx, x, y + 11, 14, 5);
    var hex = bodyColor(e, "#4a3a30");
    var g = ctx.createLinearGradient(x, y - 12, x, y + 10);
    g.addColorStop(0, shadeHex(hex, 24));
    g.addColorStop(1, shadeHex(hex, -20));
    var step = Math.sin(e.walkT * 9) * 3;
    ctx.strokeStyle = shadeHex(hex, -28);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    [-7, 7].forEach(function (ox, i) {
      ctx.beginPath();
      ctx.moveTo(x + ox, y + 3);
      ctx.lineTo(x + ox + (i ? step : -step), y + 11);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.ellipse(x, y, 14, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 12, y - 5, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = shadeHex(hex, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 10);
    ctx.lineTo(x + 10, y - 17);
    ctx.lineTo(x + 14, y - 10);
    ctx.closePath();
    ctx.fillStyle = shadeHex(hex, -14);
    ctx.fill();
    ctx.fillStyle = "#e0483a";
    ctx.beginPath();
    ctx.arc(x + 14, y - 6, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMorcego(ctx, e, x, y) {
    var fly = Math.sin(e.bob) * 4;
    shadow(ctx, x, y + 14, 8, 3);
    var hex = bodyColor(e, "#3a2b3f");
    var wing = Math.abs(Math.sin(e.walkT * 16));
    ctx.fillStyle = shadeHex(hex, -10);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1;
    [-1, 1].forEach(function (sgn) {
      ctx.beginPath();
      ctx.moveTo(x, y + fly);
      ctx.quadraticCurveTo(x + sgn * 14, y + fly - 10 - wing * 6, x + sgn * 19, y + fly + 2 - wing * 3);
      ctx.quadraticCurveTo(x + sgn * 12, y + fly + 4, x, y + fly + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.ellipse(x, y + fly, 6, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = shadeHex(hex, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f2b705";
    ctx.beginPath();
    ctx.arc(x - 2, y + fly - 2, 1.3, 0, Math.PI * 2);
    ctx.arc(x + 2, y + fly - 2, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawVagalume(ctx, e, x, y) {
    var fly = Math.sin(e.walkT * 3) * 5;
    var hostile = e.state === "telegraph";
    var glow = hostile ? "#e0483a" : "#f2e05a";
    var g = ctx.createRadialGradient(x, y + fly, 1, x, y + fly, 22);
    g.addColorStop(0, hostile ? "rgba(224,72,58,.55)" : "rgba(242,224,90,.45)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y + fly, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bodyColor(e, "#2b2a1e");
    ctx.beginPath();
    ctx.ellipse(x, y + fly, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x - 4, y + fly + 1, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSapo(ctx, e, x, y) {
    var crouch = e.state === "telegraph" ? 1 - e.telegraph / e.telegraphMax : 0;
    shadow(ctx, x, y + 14, 19, 6);
    var hex = bodyColor(e, "#5a5f4a");
    var g = ctx.createRadialGradient(x - 5, y - 8, 2, x, y, 20);
    g.addColorStop(0, shadeHex(hex, 26));
    g.addColorStop(1, shadeHex(hex, -22));
    ctx.beginPath();
    ctx.ellipse(x, y + crouch * 3, 18, 13 - crouch * 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = shadeHex(hex, -30);
    [
      [-9, -4, 3],
      [6, -6, 2.4],
      [2, 4, 2.8],
      [-4, 6, 2],
      [11, 2, 2.2],
    ].forEach(function (b) {
      ctx.beginPath();
      ctx.arc(x + b[0], y + b[1], b[2], 0, Math.PI * 2);
      ctx.fill();
    });
    [-8, 8].forEach(function (ox) {
      ctx.beginPath();
      ctx.arc(x + ox, y - 11, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = shadeHex(hex, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e0a02a";
      ctx.beginPath();
      ctx.arc(x + ox, y - 11, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawCipoVivo(ctx, e, x, y) {
    ctx.strokeStyle = "#3a5a2c";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y + 12);
    ctx.quadraticCurveTo(x - 6, y - 2, x, y - 14);
    ctx.stroke();
    ctx.strokeStyle = "rgba(90,140,70,.6)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + 1, y + 10);
    ctx.quadraticCurveTo(x - 4, y - 2, x + 1, y - 13);
    ctx.stroke();

    var budHex = e.hitFlash > 0 ? "#c9a8a0" : e.state === "gripping" ? "#4a2530" : "#2f5a2e";
    var budG = ctx.createRadialGradient(x - 3, y - 19, 1, x, y - 16, 9);
    budG.addColorStop(0, shadeHex(budHex, 24));
    budG.addColorStop(1, shadeHex(budHex, -16));
    ctx.beginPath();
    ctx.arc(x, y - 16, 9, 0, Math.PI * 2);
    ctx.fillStyle = budG;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.strokeStyle = "#1c1420";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x - 2, y - 17, 3, 0, Math.PI);
    ctx.stroke();
    if (e.vineReach > 0) {
      ctx.strokeStyle = "rgba(58,90,44,.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + e.vineReach * 26, y - 4);
      ctx.stroke();
    }
  }

  function drawCarcara(ctx, e, x, y) {
    var flap = Math.sin(e.walkT * 5) * 6;
    var rage = e.phase >= 3;
    shadow(ctx, x, y + 22, 30, 9);
    var hex = bodyColor(e, rage ? "#5a3a30" : "#4a4a52");
    var g = ctx.createLinearGradient(x, y - 30, x, y + 20);
    g.addColorStop(0, shadeHex(hex, 30));
    g.addColorStop(1, shadeHex(hex, -26));

    ctx.fillStyle = shadeHex(hex, -18);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    [-1, 1].forEach(function (sgn) {
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.quadraticCurveTo(x + sgn * 34, y - 26 - flap, x + sgn * 44, y + 2 - flap);
      ctx.quadraticCurveTo(x + sgn * 26, y + 8, x, y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.ellipse(x, y, 17, 21, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y - 22, 11, 0, Math.PI * 2);
    ctx.fillStyle = shadeHex(hex, 12);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 8, y - 24);
    ctx.lineTo(x + 22, y - 19);
    ctx.lineTo(x + 8, y - 15);
    ctx.closePath();
    ctx.fillStyle = "#c9a227";
    ctx.fill();
    ctx.stroke();

    // raízes negras da corrupção (ver bestiary: é vítima, não vilão)
    ctx.strokeStyle = "rgba(24,14,26,.9)";
    ctx.lineWidth = 2.2;
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2 + e.walkT * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * 14, y + Math.sin(a) * 12, x + Math.cos(a) * 22, y + Math.sin(a) * 20);
      ctx.stroke();
    }

    ctx.fillStyle = rage ? "#ff5a3a" : "#e0a02a";
    ctx.beginPath();
    ctx.arc(x - 4, y - 24, 2.6, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 24, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    spawn: spawn,
    update: update,
    damage: damage,
    draw: draw,
    isBoss: isBoss,
    archetypeOf: archetypeOf,
    STATS: STATS,
  };
})();
