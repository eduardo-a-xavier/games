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
 *  - 'roller'    (Tatu de Pedra): blindado enquanto rola; SÓ abre quando
 *                  bate em algo. Ensina que às vezes esperar é o ataque.
 *  - 'ambusher'  (Espantalho Possuído): passa por cenário até você chegar
 *                  perto. Ensina a desconfiar do mapa.
 *  - 'erratic'   (Corpo-Seco): alterna arrasto lento e disparada súbita,
 *                  sem ritmo fixo. Ensina a reagir em vez de decorar.
 *  - 'phaser'    (Assombração da Mina): pisca pelas paredes e reaparece
 *                  nas suas costas. Ensina a não ficar de costas.
 *  - 'stalker'   (Onça de Bruma): mini-chefe. Some na neblina e volta de
 *                  um flanco. Ensina a observar o rastro, não a silhueta.
 *  - 'boss'      (Carcará de Ferro): 3 fases, ver GDD Seção 28.
 *  - 'serpent'   (Boitatá): chefe 2. Fogo que FICA no chão — a arena vai
 *                  encolhendo, então parar de se mexer é a derrota.
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
    tatu_de_pedra: "roller",
    espantalho_possuido: "ambusher",
    corpo_seco: "erratic",
    assombracao_da_mina: "phaser",
    sombra_do_cafezal: "phaser",
    onca_de_bruma: "stalker",
    carcara_de_ferro: "boss",
    boitata: "serpent",
  };

  var STATS = {
    rato_mato_corrompido: { hp: 34, r: 11, detect: 150, forget: 230, speed: 72, telegraph: 0.55, lungeSpeed: 210, dmg: 9, poise: 22, kbResist: 0, frenzy: true },
    cao_da_estrada: { hp: 58, r: 13, detect: 220, forget: 320, speed: 108, telegraph: 0.45, lungeSpeed: 300, dmg: 14, poise: 34, kbResist: 0.15, circles: true, feints: true },
    cipo_vivo: { hp: 46, r: 13, territory: 78, grip: 40, grace: 1.0, dmg: 7, tickEvery: 0.7, poise: 40, kbResist: 1, thornDmg: 6, thornSpeed: 155, thornCd: 2.4 },
    morcego_da_mina: { hp: 22, r: 9, detect: 200, forget: 300, speed: 128, telegraph: 0.3, lungeSpeed: 330, dmg: 7, poise: 12, kbResist: 0 },
    vagalume_de_defunto: { hp: 26, r: 9, detect: 260, forget: 340, speed: 62, keepAway: 130, telegraph: 0.6, dmg: 8, poise: 14, kbResist: 0, shotSpeed: 190, panicSpread: true },
    sapo_de_pedra: { hp: 96, r: 17, detect: 170, forget: 240, speed: 42, telegraph: 0.8, dmg: 18, slamRadius: 62, poise: 70, kbResist: 0.75, tongueRange: 150, tongueDmg: 11 },
    tatu_de_pedra: { hp: 82, r: 15, detect: 200, forget: 300, speed: 38, telegraph: 0.75, rollSpeed: 310, rollDur: 1.7, dmg: 16, poise: 64, kbResist: 0.6, dizzyDur: 1.6 },
    espantalho_possuido: { hp: 66, r: 14, detect: 70, forget: 320, speed: 92, telegraph: 0.26, lungeSpeed: 270, dmg: 17, poise: 30, kbResist: 0.2, flurry: 3 },
    corpo_seco: { hp: 90, r: 14, detect: 250, forget: 380, speed: 32, dashSpeed: 355, telegraph: 0.4, dmg: 16, poise: 46, kbResist: 0.35, bleedPower: 3, bleedDur: 4 },
    assombracao_da_mina: { hp: 56, r: 13, detect: 270, forget: 400, speed: 56, telegraph: 0.5, dmg: 13, poise: 26, kbResist: 0.5, blink: 140, blinkCd: 3.2 },
    sombra_do_cafezal: { hp: 62, r: 13, detect: 260, forget: 380, speed: 66, telegraph: 0.45, dmg: 14, poise: 28, kbResist: 0.4, blink: 120, blinkCd: 2.8 },
    onca_de_bruma: { hp: 280, r: 18, detect: 460, forget: 9999, speed: 118, telegraph: 0.36, lungeSpeed: 430, dmg: 21, poise: 84, kbResist: 0.7 },
    carcara_de_ferro: { hp: 620, r: 26, detect: 900, forget: 9999, speed: 86, telegraph: 0.7, dmg: 20, poise: 120, kbResist: 0.9 },
    boitata: { hp: 820, r: 24, detect: 900, forget: 9999, speed: 96, telegraph: 0.6, dmg: 22, poise: 140, kbResist: 0.92 },
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
      state: arch === "zoner" ? "dormant" : arch === "ambusher" ? "disguised" : "patrol",
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
      // estado dos arquétipos novos
      armored: false,   // roller enrolado: dano normal reduzido
      dizzyT: 0,        // roller aberto depois de bater: janela de punição
      fade: 1,          // stalker/phaser: opacidade de desenho
      blinkCd: 0,
      flurryLeft: 0,
      thornCd: 0,
      rollBounces: 0,
    };
    return e;
  }

  function isBoss(e) {
    return e.arch === "boss" || e.arch === "serpent";
  }

  // mini-chefe: usa a barra grande do HUD como um chefe, mas não vale
  // recompensa nem cena de chefe (ver main.js#applyDamage)
  function isMiniBoss(e) {
    return e.arch === "stalker";
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
    if (e.arch === "roller") return updateRoller(e, s, dt, player, dToPlayer, api);
    if (e.arch === "ambusher") return updateAmbusher(e, s, dt, player, dToPlayer, api);
    if (e.arch === "erratic") return updateErratic(e, s, dt, player, dToPlayer, api);
    if (e.arch === "phaser") return updatePhaser(e, s, dt, player, dToPlayer, api);
    if (e.arch === "stalker") return updateStalker(e, s, dt, player, dToPlayer, api);
    if (e.arch === "boss") return updateBoss(e, s, dt, player, dToPlayer, api);
    if (e.arch === "serpent") return updateSerpent(e, s, dt, player, dToPlayer, api);
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
    // FRENESI (Rato): abaixo de 35% de vida ele fica mais rápido e avisa
    // menos. Um inimigo ferido que fica igual não cria tensão nenhuma —
    // aqui, terminar a luta rápido passa a valer a pena.
    var frenzy = s.frenzy && e.hp / e.hpMax < 0.35;
    var spd = s.speed * (frenzy ? 1.35 : 1);

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
        var perp = Math.atan2(e.facing.y, e.facing.x) + Math.PI / 2 * (e.circleDir || 1);
        e.x += Math.cos(perp) * spd * 0.7 * dt;
        e.y += Math.sin(perp) * spd * 0.7 * dt;
        // troca de lado de vez em quando pra não virar órbita previsível
        if (rand(e.walkT * 3 | 0) > 0.985) e.circleDir = (e.circleDir || 1) * -1;
        return;
      }
      if (d < e.r + 26) {
        // FINTA (Cão): 1 em 3 avisos é mentira — ele recua em vez de
        // investir. Punir quem rola no reflexo, premiar quem rola no aviso.
        e.feint = !!s.feints && Math.random() < 0.33;
        startTelegraph(e, s, frenzy ? s.telegraph * 0.6 : s.telegraph);
        return;
      }
      e.x += e.facing.x * spd * dt;
      e.y += e.facing.y * spd * dt;
    } else if (e.state === "telegraph") {
      e.telegraph -= dt;
      if (e.telegraph <= 0) {
        if (e.feint) {
          e.feint = false;
          e.state = "chase";
          e.attackCd = 0.45;
          // recuo curto: a finta tem que ser LEGÍVEL depois de acontecer
          e.kbx = -e.facing.x * 240;
          e.kby = -e.facing.y * 240;
          return;
        }
        beginLunge(e, player, 0.24);
      }
    } else if (e.state === "lunge") {
      e.lungeT -= dt;
      e.x += e.lx * s.lungeSpeed * dt;
      e.y += e.ly * s.lungeSpeed * dt;
      if (Math.hypot(player.x - e.x, player.y - e.y) < e.r + player.r + 4) {
        api.damagePlayer(s.dmg, e.x, e.y, e);
        e.state = "chase";
        e.attackCd = frenzy ? 0.55 : 1.1;
      }
      if (e.lungeT <= 0) {
        e.state = "chase";
        e.attackCd = frenzy ? 0.4 : 0.9;
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
        // PÂNICO: ferido, o vagalume dispara em leque em vez de um tiro só.
        // Chegar perto e não terminar o serviço passa a custar caro.
        var panic = s.panicSpread && e.hp / e.hpMax < 0.4;
        var base = Math.atan2(e.facing.y, e.facing.x);
        var shots = panic ? [-0.3, 0, 0.3] : [0];
        shots.forEach(function (off) {
          api.spawnEnemyProjectile({
            x: e.x,
            y: e.y - 6,
            vx: Math.cos(base + off) * s.shotSpeed,
            vy: Math.sin(base + off) * s.shotSpeed,
            r: 6,
            dmg: panic ? s.dmg * 0.7 : s.dmg,
            kind: "luz",
            life: 2.2,
          });
        });
        EN.Audio.play("enemyShot");
        e.state = "chase";
        e.attackCd = panic ? 2.6 : 2.0;
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
        e.move = "slam";
        startTelegraph(e, s);
        return;
      }
      // LÍNGUA: puxa o jogador de longe pra dentro do alcance do pisão.
      // Sem isso o Sapo era resolvido inteiro ficando a 100px dele.
      if (s.tongueRange && d < s.tongueRange && d > s.slamRadius && e.attackCd <= 0) {
        e.move = "tongue";
        startTelegraph(e, s, 0.55);
        return;
      }
      e.x += e.facing.x * s.speed * dt;
      e.y += e.facing.y * s.speed * dt;
    } else if (e.state === "telegraph") {
      e.telegraph -= dt;
      if (e.telegraph <= 0) {
        if (e.move === "tongue") {
          e.state = "tongue";
          e.tongueT = 0.3;
          e.tongueHit = false;
          EN.Audio.play("enemyShot");
          return;
        }
        e.state = "slam";
        e.slamT = 0.18;
      }
    } else if (e.state === "tongue") {
      e.tongueT -= dt;
      e.tongueReach = Math.min(1, (0.3 - e.tongueT) / 0.14);
      if (!e.tongueHit && Math.hypot(player.x - e.x, player.y - e.y) < s.tongueRange) {
        e.tongueHit = true;
        api.damagePlayer(s.tongueDmg, e.x, e.y, e);
        // puxão: o dano é pequeno, o problema é ONDE você acaba
        EN.Combat.knockback(player, e.x + (e.x - player.x) * 2, e.y + (e.y - player.y) * 2, 320);
      }
      if (e.tongueT <= 0) {
        e.tongueReach = 0;
        e.state = "chase";
        e.attackCd = 1.6;
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
    // ESPINHOS: o Cipó não alcança quem fica longe, mas agora cospe.
    // Antes bastava matá-lo de fora com projétil, sem risco nenhum.
    if (e.thornCd > 0) e.thornCd -= dt;
    if (s.thornDmg && d > s.grip && d < s.territory * 3 && e.thornCd <= 0 && e.state !== "dormant") {
      e.thornCd = s.thornCd;
      api.spawnEnemyProjectile({
        x: e.x,
        y: e.y - 14,
        vx: e.facing.x * s.thornSpeed,
        vy: e.facing.y * s.thornSpeed,
        r: 4,
        dmg: s.thornDmg,
        kind: "espinho",
        life: 2.0,
      });
    }

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
   * Tatu de Pedra — o inimigo que INVERTE a regra "atacar sempre".
   * Enrolado ele é blindado: dano normal quase não entra e recuo não
   * funciona. Ele só abre quando a investida termina ou quando bate em
   * algo — e aí fica tonto, indefeso, por uma janela generosa. A leitura
   * certa é sair da linha e esperar, não trocar golpe.
   */
  function updateRoller(e, s, dt, player, d, api) {
    if (e.dizzyT > 0) {
      e.dizzyT -= dt;
      e.armored = false;
      e.state = "dizzy";
      if (e.dizzyT <= 0) e.state = "chase";
      return;
    }

    if (e.state === "patrol") {
      e.armored = false;
      if (d < s.detect) e.state = "chase";
      else wander(e, dt, 20);
    } else if (e.state === "chase" || e.state === "dizzy") {
      e.armored = false;
      e.state = "chase";
      if (d > s.forget) {
        e.state = "patrol";
        return;
      }
      if (e.attackCd <= 0 && d < 220) {
        startTelegraph(e, s);
        return;
      }
      e.x += e.facing.x * s.speed * dt;
      e.y += e.facing.y * s.speed * dt;
    } else if (e.state === "telegraph") {
      // enrolar já blinda: quem insiste em bater durante o aviso perde
      e.armored = true;
      e.telegraph -= dt;
      if (e.telegraph <= 0) {
        e.state = "roll";
        e.rollT = s.rollDur;
        e.rollBounces = 0;
        var rx = player.x - e.x,
          ry = player.y - e.y,
          rd = Math.hypot(rx, ry) || 1;
        e.lx = rx / rd;
        e.ly = ry / rd;
        EN.Audio.play("slam");
      }
    } else if (e.state === "roll") {
      e.armored = true;
      e.rollT -= dt;
      e.x += e.lx * s.rollSpeed * dt;
      e.y += e.ly * s.rollSpeed * dt;
      if (Math.hypot(player.x - e.x, player.y - e.y) < e.r + player.r + 3) {
        api.damagePlayer(s.dmg, e.x, e.y, e);
        crashRoller(e, s);
        return;
      }
      // errou e bateu no fim do impulso: mesma punição, é o que ensina a
      // esquivar pro lado em vez de correr em linha reta na frente dele
      if (e.rollT <= 0) crashRoller(e, s);
    }
  }

  function crashRoller(e, s) {
    e.state = "dizzy";
    e.dizzyT = s.dizzyDur;
    e.armored = false;
    e.poise = 0;
    e.attackCd = 1.2;
    EN.Combat.shakeCamera(4, 0.2);
  }

  /*
   * Espantalho Possuído — passa por cenário. Fica imóvel, sem barra de
   * vida e sem aviso até você entrar no raio curto; então explode numa
   * rajada de três golpes rápidos. Depois disso é um charger comum: o
   * susto só funciona uma vez, e é assim que tem que ser.
   */
  function updateAmbusher(e, s, dt, player, d, api) {
    if (e.state === "disguised") {
      if (d < s.detect) {
        e.state = "reveal";
        e.stateT = 0.35;
        e.flurryLeft = s.flurry;
        EN.Combat.shakeCamera(5, 0.3);
        EN.Audio.play("roar");
      }
      return;
    }
    if (e.state === "reveal") {
      e.stateT -= dt;
      if (e.stateT <= 0) startTelegraph(e, s);
      return;
    }
    if (e.state === "chase") {
      if (d > s.forget) {
        e.state = "patrol";
        return;
      }
      if (d < e.r + 30 && e.attackCd <= 0) {
        e.flurryLeft = s.flurry;
        startTelegraph(e, s);
        return;
      }
      e.x += e.facing.x * s.speed * dt;
      e.y += e.facing.y * s.speed * dt;
      return;
    }
    if (e.state === "patrol") {
      if (d < s.detect * 3) e.state = "chase";
      else wander(e, dt, 26);
      return;
    }
    if (e.state === "telegraph") {
      e.telegraph -= dt;
      if (e.telegraph <= 0) beginLunge(e, player, 0.18);
      return;
    }
    if (e.state === "lunge") {
      e.lungeT -= dt;
      e.x += e.lx * s.lungeSpeed * dt;
      e.y += e.ly * s.lungeSpeed * dt;
      var hit = Math.hypot(player.x - e.x, player.y - e.y) < e.r + player.r + 4;
      if (hit) api.damagePlayer(s.dmg, e.x, e.y, e);
      if (hit || e.lungeT <= 0) {
        e.flurryLeft--;
        // rajada: encadeia sem devolver o turno, mas cada golpe da
        // sequência avisa de novo — dá pra sair no meio dela
        if (e.flurryLeft > 0) startTelegraph(e, s, 0.2);
        else {
          e.state = "chase";
          e.attackCd = 1.5;
        }
      }
    }
  }

  /*
   * Corpo-Seco — a lenda é de algo que não tem ritmo, e a IA reflete
   * isso: arrasta devagar por um tempo ALEATÓRIO e então dispara sem
   * padrão fixo. O golpe corta e deixa sangramento, então errar a
   * esquiva cobra por vários segundos depois.
   */
  function updateErratic(e, s, dt, player, d, api) {
    if (e.state === "patrol") {
      if (d < s.detect) {
        e.state = "shamble";
        e.stateT = 0.8 + Math.random() * 1.6;
      } else wander(e, dt, 16);
      return;
    }
    if (d > s.forget) {
      e.state = "patrol";
      return;
    }
    if (e.state === "shamble") {
      e.x += e.facing.x * s.speed * dt;
      e.y += e.facing.y * s.speed * dt;
      e.stateT -= dt;
      if (e.stateT <= 0 || d < 46) startTelegraph(e, s);
      return;
    }
    if (e.state === "telegraph") {
      e.telegraph -= dt;
      if (e.telegraph <= 0) {
        e.state = "surge";
        e.surgeT = 0.42;
        var sx = player.x - e.x,
          sy = player.y - e.y,
          sd = Math.hypot(sx, sy) || 1;
        e.lx = sx / sd;
        e.ly = sy / sd;
        e.surgeHit = false;
      }
      return;
    }
    if (e.state === "surge") {
      e.surgeT -= dt;
      e.x += e.lx * s.dashSpeed * dt;
      e.y += e.ly * s.dashSpeed * dt;
      if (!e.surgeHit && Math.hypot(player.x - e.x, player.y - e.y) < e.r + player.r + 4) {
        e.surgeHit = true;
        api.damagePlayer(s.dmg, e.x, e.y, e);
        EN.Combat.applyStatus(player, "sangramento", s.bleedDur, s.bleedPower);
      }
      if (e.surgeT <= 0) {
        e.state = "shamble";
        e.stateT = 0.7 + Math.random() * 1.8;
        e.attackCd = 0.5;
      }
    }
  }

  /*
   * Assombração da Mina / Sombra do Cafezal — atravessa. Some e reaparece
   * do lado oposto do jogador, o que torna "manter o inimigo na frente"
   * um trabalho ativo em vez de uma posição estática.
   */
  function updatePhaser(e, s, dt, player, d, api) {
    if (e.blinkCd > 0) e.blinkCd -= dt;

    if (e.state === "patrol") {
      e.fade = 1;
      if (d < s.detect) e.state = "chase";
      else wander(e, dt, 22);
      return;
    }
    if (e.state === "blink") {
      e.stateT -= dt;
      // some, reaparece: a opacidade é o único aviso, e ela é generosa
      e.fade = e.stateT > 0.18 ? Math.max(0.08, e.stateT / 0.36) : 1 - e.stateT / 0.18;
      if (e.stateT <= 0) {
        e.fade = 1;
        e.state = "chase";
      }
      return;
    }
    if (e.state === "chase") {
      e.fade = 1;
      if (d > s.forget) {
        e.state = "patrol";
        return;
      }
      if (e.blinkCd <= 0 && d > 60) {
        e.blinkCd = s.blinkCd;
        e.state = "blink";
        e.stateT = 0.36;
        // reaparece ATRÁS do jogador, na direção oposta à que ele encara
        var fa = Math.atan2(player.facing.y, player.facing.x) + Math.PI;
        e.x = player.x + Math.cos(fa) * 52;
        e.y = player.y + Math.sin(fa) * 52;
        EN.Audio.play("enemyShot");
        return;
      }
      if (d < e.r + 26 && e.attackCd <= 0) {
        startTelegraph(e, s);
        return;
      }
      e.x += e.facing.x * s.speed * dt;
      e.y += e.facing.y * s.speed * dt;
      return;
    }
    if (e.state === "telegraph") {
      e.telegraph -= dt;
      if (e.telegraph <= 0) {
        // toque gélido: instantâneo e curto, sem investida — o perigo é
        // ele já estar colado quando o aviso começa
        if (Math.hypot(player.x - e.x, player.y - e.y) < e.r + player.r + 14) {
          api.damagePlayer(s.dmg, e.x, e.y, e);
        }
        api.spawnFx("shock", { x: e.x, y: e.y, radius: 34 });
        e.state = "chase";
        e.attackCd = 1.5;
      }
    }
  }

  /*
   * Onça de Bruma — MINI-CHEFE. Não tem fases de vida como o Carcará:
   * tem um ciclo. Ronda em volta do jogador, some na neblina, reaparece
   * num flanco e dá o bote. Abaixo de metade da vida o bote vira triplo.
   * A leitura não é a silhueta (ela some) — é a poeira que ela levanta.
   */
  function updateStalker(e, s, dt, player, d, api) {
    var enraged = e.hp / e.hpMax < 0.5;

    if (e.state === "patrol") {
      e.fade = 1;
      if (d < s.detect) {
        e.state = "prowl";
        e.stateT = 1.6;
        e.circleDir = Math.random() < 0.5 ? 1 : -1;
      } else wander(e, dt, 34);
      return;
    }

    if (e.state === "prowl") {
      e.fade = 1;
      // circula mantendo distância: dá tempo do jogador se reposicionar
      var perp = Math.atan2(e.facing.y, e.facing.x) + (Math.PI / 2) * e.circleDir;
      e.x += Math.cos(perp) * s.speed * 0.8 * dt;
      e.y += Math.sin(perp) * s.speed * 0.8 * dt;
      if (d > 190) {
        e.x += e.facing.x * s.speed * 0.5 * dt;
        e.y += e.facing.y * s.speed * 0.5 * dt;
      }
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "vanish";
        e.stateT = enraged ? 0.7 : 0.95;
        api.spawnFx("shock", { x: e.x, y: e.y, radius: 46 });
        EN.Audio.play("enemyShot");
      }
      return;
    }

    if (e.state === "vanish") {
      e.stateT -= dt;
      e.fade = Math.max(0.06, e.stateT / 0.95);
      // desliza pro flanco enquanto invisível
      var va = Math.atan2(player.y - e.y, player.x - e.x) + (Math.PI / 2) * e.circleDir;
      e.x += Math.cos(va) * 190 * dt;
      e.y += Math.sin(va) * 190 * dt;
      if (e.stateT <= 0) {
        // reaparece a uma distância de bote, no flanco escolhido
        var pa = Math.atan2(e.y - player.y, e.x - player.x);
        e.x = player.x + Math.cos(pa) * 140;
        e.y = player.y + Math.sin(pa) * 140;
        e.fade = 1;
        e.pounceLeft = enraged ? 3 : 1;
        startTelegraph(e, s);
        EN.Combat.shakeCamera(3, 0.18);
      }
      return;
    }

    if (e.state === "telegraph") {
      e.fade = 1;
      e.telegraph -= dt;
      if (e.telegraph <= 0) beginLunge(e, player, 0.26);
      return;
    }

    if (e.state === "lunge") {
      e.lungeT -= dt;
      e.x += e.lx * s.lungeSpeed * dt;
      e.y += e.ly * s.lungeSpeed * dt;
      var hit = Math.hypot(player.x - e.x, player.y - e.y) < e.r + player.r + 5;
      if (hit) api.damagePlayer(s.dmg, e.x, e.y, e);
      if (hit || e.lungeT <= 0) {
        e.pounceLeft--;
        if (e.pounceLeft > 0) startTelegraph(e, s, 0.24);
        else {
          e.state = "prowl";
          e.stateT = enraged ? 1.1 : 1.8;
          e.circleDir = Math.random() < 0.5 ? 1 : -1;
        }
      }
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

  /*
   * Boitatá — SEGUNDO CHEFE (Brejo das Lanternas). O Carcará ensina a ler
   * telegraph; o Boitatá ensina a ler o CHÃO. Quase todo ataque dele
   * deixa fogo que fica queimando por segundos, então a arena vai
   * encolhendo sozinha ao longo da luta e ficar parado no lugar "seguro"
   * de dez segundos atrás é o que mata.
   *
   * Fase 1: Labareda (jato em cone) + Bote
   * Fase 2: + Rastro (ele corre em arco cuspindo fogo no caminho)
   * Fase 3: + Anel de Fogo (círculo completo, obriga a achar a brecha)
   */
  var SERPENT_MOVES = {
    1: ["labareda", "bote"],
    2: ["labareda", "bote", "rastro"],
    3: ["labareda", "bote", "rastro", "anel"],
  };

  function spitFire(e, api, x, y, life) {
    api.spawnEnemyProjectile({
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      r: 17,
      dmg: 7,
      kind: "fogo",
      lingering: true,
      touchCd: 0,
      life: life || 5.5,
    });
  }

  function updateSerpent(e, s, dt, player, d, api) {
    var pct = e.hp / e.hpMax;
    var newPhase = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
    if (newPhase !== e.phase) {
      e.phase = newPhase;
      e.state = "roar";
      e.stateT = 1.1;
      e.attackCd = 1.3;
      EN.Combat.shakeCamera(9, 0.7);
      EN.Audio.play("roar");
      api.spawnFx("shock", { x: e.x, y: e.y, radius: 100 });
      // ao mudar de fase ele acende um anel largo: marca a virada e já
      // reorganiza o espaço da arena
      for (var k = 0; k < 12; k++) {
        var ka = (k / 12) * Math.PI * 2;
        spitFire(e, api, e.x + Math.cos(ka) * 96, e.y + Math.sin(ka) * 96, 4);
      }
      if (api.onBossPhase) api.onBossPhase(newPhase);
      return;
    }

    if (e.state === "roar") {
      e.stateT -= dt;
      if (e.stateT <= 0) e.state = "chase";
      return;
    }

    if (e.state === "patrol" || e.state === "chase") {
      if (e.attackCd <= 0 && d < 300) {
        var moves = SERPENT_MOVES[e.phase];
        e.move = moves[Math.floor(Math.random() * moves.length)];
        startTelegraph(e, s, e.move === "anel" ? 0.9 : e.move === "rastro" ? 0.5 : 0.6);
        return;
      }
      if (d > 90) {
        e.x += e.facing.x * s.speed * dt;
        e.y += e.facing.y * s.speed * dt;
      }
      return;
    }

    if (e.state === "telegraph") {
      e.telegraph -= dt;
      if (e.telegraph <= 0) executeSerpentMove(e, s, player, api);
      return;
    }

    if (e.state === "lunge") {
      e.lungeT -= dt;
      e.x += e.lx * 360 * dt;
      e.y += e.ly * 360 * dt;
      if (Math.hypot(player.x - e.x, player.y - e.y) < e.r + player.r + 6) {
        api.damagePlayer(s.dmg, e.x, e.y, e);
        EN.Combat.applyStatus(player, "queimando", 2.5, 3);
        e.state = "chase";
        e.attackCd = 1.7;
      }
      if (e.lungeT <= 0) {
        e.state = "chase";
        e.attackCd = 1.6;
      }
      return;
    }

    if (e.state === "rastro") {
      // corre em arco largo deixando fogo — o jogador tem que atravessar
      // a linha ANTES dela fechar, não depois
      e.stateT -= dt;
      e.trailAngle += dt * 2.6 * (e.circleDir || 1);
      e.x = e.trailCx + Math.cos(e.trailAngle) * e.trailR;
      e.y = e.trailCy + Math.sin(e.trailAngle) * e.trailR;
      e.trailDrop -= dt;
      if (e.trailDrop <= 0) {
        e.trailDrop = 0.09;
        spitFire(e, api, e.x, e.y, 5);
      }
      if (Math.hypot(player.x - e.x, player.y - e.y) < e.r + player.r + 4) {
        api.damagePlayer(14, e.x, e.y, e);
        EN.Combat.applyStatus(player, "queimando", 2.5, 3);
      }
      if (e.stateT <= 0) {
        e.state = "chase";
        e.attackCd = 2.0;
      }
    }
  }

  function executeSerpentMove(e, s, player, api) {
    if (e.move === "bote") {
      beginLunge(e, player, 0.32);
      return;
    }

    if (e.move === "labareda") {
      // jato em cone: as chamas voam e depois ficam no chão onde caem
      var base = Math.atan2(e.facing.y, e.facing.x);
      for (var i = -2; i <= 2; i++) {
        var a = base + i * 0.17;
        api.spawnEnemyProjectile({
          x: e.x + Math.cos(a) * 20,
          y: e.y + Math.sin(a) * 20 - 6,
          vx: Math.cos(a) * 240,
          vy: Math.sin(a) * 240,
          r: 8,
          dmg: 13,
          kind: "chama",
          burns: true,
          life: 1.1,
          leavesFire: true,
        });
      }
      EN.Audio.play("shot");
      e.state = "chase";
      e.attackCd = 2.1;
      return;
    }

    if (e.move === "rastro") {
      e.state = "rastro";
      e.stateT = 1.9;
      e.trailDrop = 0;
      e.circleDir = Math.random() < 0.5 ? 1 : -1;
      e.trailR = Math.max(90, Math.hypot(player.x - e.x, player.y - e.y) * 0.7);
      e.trailCx = player.x;
      e.trailCy = player.y;
      e.trailAngle = Math.atan2(e.y - player.y, e.x - player.x);
      EN.Audio.play("roar");
      return;
    }

    if (e.move === "anel") {
      // anel completo COM UMA BRECHA: sem a brecha seria dano garantido,
      // com ela vira um teste de leitura rápida em vez de sorte
      var gap = Math.random() * Math.PI * 2;
      for (var j = 0; j < 18; j++) {
        var ja = (j / 18) * Math.PI * 2;
        if (Math.abs(Math.atan2(Math.sin(ja - gap), Math.cos(ja - gap))) < 0.42) continue;
        api.spawnEnemyProjectile({
          x: e.x + Math.cos(ja) * 26,
          y: e.y + Math.sin(ja) * 26,
          vx: Math.cos(ja) * 165,
          vy: Math.sin(ja) * 165,
          r: 8,
          dmg: 15,
          kind: "chama",
          burns: true,
          life: 1.5,
          leavesFire: true,
        });
      }
      EN.Audio.play("roar");
      EN.Combat.shakeCamera(8, 0.4);
      e.state = "chase";
      e.attackCd = 2.8;
      return;
    }

    e.state = "chase";
    e.attackCd = 1.5;
  }

  function kill(e, api) {
    if (e.dead) return;
    e.dead = true;
    e.deadT = 0;
    if (api && api.onKilled) api.onKilled(e);
  }

  function damage(e, dmg, onKilled, opts) {
    if (e.dead) return;
    opts = opts || {};

    /*
     * BLINDAGEM DO TATU: enrolado, golpe normal quase não entra e a
     * postura nem é tocada. Só o golpe PESADO abre a casca — e quando
     * abre, ele para na hora, tonto. É o único inimigo em que trocar
     * golpe no momento errado é pior do que não atacar.
     */
    if (e.armored) {
      if (opts.heavy) {
        dmg = Math.round(dmg * 1.35);
        crashRoller(e, STATS[e.defId]);
        EN.Audio.play("stagger");
      } else {
        dmg = Math.max(1, Math.round(dmg * 0.25));
        e.hitFlash = 0.18;
        e.hp -= dmg;
        if (e.hp <= 0) {
          e.dead = true;
          e.deadT = 0;
          if (onKilled) onKilled(e);
        }
        return;
      }
    }

    // acertar o espantalho antes que ele salte também o acorda
    if (e.state === "disguised") {
      e.state = "reveal";
      e.stateT = 0.25;
      e.flurryLeft = (STATS[e.defId] || {}).flurry || 1;
    }

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
      e.fade = 1; // tirar da neblina/piscada é parte da recompensa
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
    tatu_de_pedra: drawTatu,
    espantalho_possuido: drawEspantalho,
    corpo_seco: drawCorpoSeco,
    assombracao_da_mina: drawAssombracao,
    sombra_do_cafezal: drawSombra,
    onca_de_bruma: drawOnca,
    carcara_de_ferro: drawCarcara,
    boitata: drawBoitata,
  };

  function draw(ctx, e, camX, camY) {
    var x = e.x - camX,
      y = e.y - camY;
    ctx.save();
    if (e.dead) ctx.globalAlpha = Math.max(0, 1 - e.deadT / 0.5);
    else if (e.fade !== undefined && e.fade < 1) ctx.globalAlpha = e.fade;
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
    if (isBoss(e) || isMiniBoss(e)) return; // usam a barra dedicada no HUD
    // espantalho ainda disfarçado não pode ter barra: a barra o entregaria
    if (e.state === "disguised") return;
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
    if (e.state === "disguised") return; // um espantalho quieto não avisa nada
    if (e.state === "telegraph") {
      var k = 1 - e.telegraph / e.telegraphMax;
      var s = STATS[e.defId];
      var areaR =
        e.arch === "brute" && e.move !== "tongue" ? s.slamRadius
        : e.move === "grito" ? 150
        : e.move === "anel" ? 130
        : 0;
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

    // língua disparada: linha grossa na direção do jogador
    if (e.tongueReach > 0) {
      var reach = e.tongueReach * (STATS[e.defId].tongueRange || 150);
      ctx.strokeStyle = "#c9506a";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y - 2);
      ctx.lineTo(x + e.facing.x * reach, y - 2 + e.facing.y * reach);
      ctx.stroke();
      ctx.fillStyle = "#e0708a";
      ctx.beginPath();
      ctx.arc(x + e.facing.x * reach, y - 2 + e.facing.y * reach, 4, 0, Math.PI * 2);
      ctx.fill();
    }
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

  function drawTatu(ctx, e, x, y) {
    var curled = e.armored || e.state === "roll" || e.state === "telegraph";
    shadow(ctx, x, y + 12, curled ? 15 : 18, 5);
    var hex = bodyColor(e, "#6b5a48");
    var g = ctx.createRadialGradient(x - 4, y - 6, 2, x, y, 18);
    g.addColorStop(0, shadeHex(hex, 28));
    g.addColorStop(1, shadeHex(hex, -24));

    if (curled) {
      // bola blindada: gira visivelmente enquanto rola
      var spin = e.state === "roll" ? e.walkT * 14 : e.walkT * 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // placas: leem como casco e deixam a rotação óbvia
      ctx.strokeStyle = shadeHex(hex, -34);
      ctx.lineWidth = 1.6;
      for (var i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 5 + i * 3, -0.6, 2.4);
        ctx.stroke();
      }
      ctx.restore();
      if (e.state === "roll") {
        ctx.strokeStyle = "rgba(180,150,110,.5)";
        ctx.lineWidth = 2;
        for (var t = 1; t <= 3; t++) {
          ctx.beginPath();
          ctx.arc(x - e.lx * t * 9, y - e.ly * t * 9, 14 - t * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      return;
    }

    // aberto (tonto): corpo alongado, patas de fora — a silhueta muda por
    // completo, que é o sinal de "agora pode bater"
    ctx.beginPath();
    ctx.ellipse(x, y, 17, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.strokeStyle = shadeHex(hex, -34);
    ctx.lineWidth = 1.4;
    for (var b = -2; b <= 2; b++) {
      ctx.beginPath();
      ctx.moveTo(x + b * 5, y - 9);
      ctx.lineTo(x + b * 5, y + 9);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(x + 16, y - 3, 6, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = shadeHex(hex, 14);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    if (e.dizzyT > 0) {
      // estrelinhas de tonteira: o aviso de janela aberta
      ctx.fillStyle = "#f2b705";
      for (var s2 = 0; s2 < 3; s2++) {
        var sa = e.walkT * 6 + (s2 / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(sa) * 13, y - 20 + Math.sin(sa) * 4, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawEspantalho(ctx, e, x, y) {
    var awake = e.state !== "disguised";
    shadow(ctx, x, y + 12, 11, 4);
    // estaca + braços em cruz: lê como espantalho de plantação
    ctx.strokeStyle = "#5a4630";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y + 12);
    ctx.lineTo(x, y - 20);
    ctx.stroke();
    var droop = awake ? Math.sin(e.walkT * 8) * 3 : 0;
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 8 + droop);
    ctx.lineTo(x + 15, y - 8 - droop);
    ctx.stroke();

    var hex = bodyColor(e, awake ? "#8a6a3a" : "#7a6a4a");
    ctx.fillStyle = hex;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    // roupa de saco
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 12);
    ctx.lineTo(x + 10, y - 12);
    ctx.lineTo(x + 7, y + 10);
    ctx.lineTo(x - 7, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // cabeça de saco com costura
    ctx.beginPath();
    ctx.arc(x, y - 20, 8, 0, Math.PI * 2);
    ctx.fillStyle = shadeHex(hex, 16);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = awake ? "rgba(180,110,255,.95)" : "rgba(90,70,50,.9)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (var st = -3; st <= 3; st += 2) {
      ctx.moveTo(x + st, y - 15);
      ctx.lineTo(x + st + 1, y - 13);
    }
    ctx.stroke();

    // olhos: só acendem quando ele acorda — é o susto
    if (awake) {
      ctx.fillStyle = "#c07aff";
      ctx.beginPath();
      ctx.arc(x - 3, y - 22, 2.2, 0, Math.PI * 2);
      ctx.arc(x + 3, y - 22, 2.2, 0, Math.PI * 2);
      ctx.fill();
      var gl = ctx.createRadialGradient(x, y - 21, 1, x, y - 21, 20);
      gl.addColorStop(0, "rgba(170,100,255,.35)");
      gl.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(x, y - 21, 20, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#3a2f22";
      ctx.fillRect(x - 4, y - 23, 2.5, 2.5);
      ctx.fillRect(x + 2, y - 23, 2.5, 2.5);
    }

    // palha saindo das mangas
    ctx.strokeStyle = "#b89a4a";
    ctx.lineWidth = 1;
    [-15, 15].forEach(function (ox) {
      for (var f = -1; f <= 1; f++) {
        ctx.beginPath();
        ctx.moveTo(x + ox, y - 8);
        ctx.lineTo(x + ox + f * 3, y - 2);
        ctx.stroke();
      }
    });
  }

  function drawCorpoSeco(ctx, e, x, y) {
    var surging = e.state === "surge";
    shadow(ctx, x, y + 12, 11, 4);
    var hex = bodyColor(e, "#8a7a63");
    var lean = surging ? 0.35 : Math.sin(e.walkT * 2) * 0.08;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean * (e.facing.x < 0 ? -1 : 1));

    // corpo ressecado: magro, alongado, ombros caídos
    var g = ctx.createLinearGradient(0, -24, 0, 12);
    g.addColorStop(0, shadeHex(hex, 20));
    g.addColorStop(1, shadeHex(hex, -30));
    ctx.beginPath();
    ctx.moveTo(-7, -14);
    ctx.lineTo(7, -14);
    ctx.lineTo(5, 12);
    ctx.lineTo(-5, 12);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // costelas expostas
    ctx.strokeStyle = shadeHex(hex, -40);
    ctx.lineWidth = 1;
    for (var r = 0; r < 4; r++) {
      ctx.beginPath();
      ctx.moveTo(-5, -10 + r * 5);
      ctx.lineTo(5, -10 + r * 5);
      ctx.stroke();
    }

    // braços longos demais — a proporção errada é o desconforto
    ctx.strokeStyle = shadeHex(hex, -14);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    var swing = surging ? 8 : Math.sin(e.walkT * 2.2) * 3;
    [-1, 1].forEach(function (sgn) {
      ctx.beginPath();
      ctx.moveTo(sgn * 6, -11);
      ctx.lineTo(sgn * 11, 2 + swing * sgn);
      ctx.lineTo(sgn * 8, 15 + swing * sgn);
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.ellipse(0, -20, 6.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = shadeHex(hex, 10);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    // órbitas vazias
    ctx.fillStyle = "#140d10";
    ctx.beginPath();
    ctx.ellipse(-2.4, -21, 2, 2.6, 0, 0, Math.PI * 2);
    ctx.ellipse(2.4, -21, 2, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // fumaça escura escapando das fendas (corruptionVisual do bestiário)
    ctx.fillStyle = "rgba(30,20,34,.42)";
    for (var p = 0; p < 4; p++) {
      var pa = e.walkT * 1.6 + p * 1.7;
      var py = ((e.walkT * 16 + p * 11) % 26) - 6;
      ctx.beginPath();
      ctx.arc(x + Math.cos(pa) * 7, y - py, 3 - py / 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWraith(ctx, e, x, y, coreHex, glowRGB) {
    var float = Math.sin(e.walkT * 2.2) * 4;
    var gy = y + float;
    // halo: o corpo é quase todo halo, por isso não tem sombra no chão
    var g = ctx.createRadialGradient(x, gy - 6, 2, x, gy - 6, 26);
    g.addColorStop(0, "rgba(" + glowRGB + ",.42)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, gy - 6, 26, 0, Math.PI * 2);
    ctx.fill();

    // manto que se desfaz na barra de baixo
    ctx.fillStyle = e.hitFlash > 0 ? "#e0c8d8" : coreHex;
    ctx.beginPath();
    ctx.moveTo(x - 10, gy - 6);
    ctx.quadraticCurveTo(x - 12, gy + 8, x - 6, gy + 13);
    ctx.quadraticCurveTo(x, gy + 8, x + 6, gy + 13);
    ctx.quadraticCurveTo(x + 12, gy + 8, x + 10, gy - 6);
    ctx.quadraticCurveTo(x, gy - 22, x - 10, gy - 6);
    ctx.closePath();
    ctx.fill();

    // veios negros por dentro
    ctx.strokeStyle = "rgba(18,10,22,.7)";
    ctx.lineWidth = 1.4;
    for (var v = 0; v < 3; v++) {
      var va = e.walkT * 0.8 + v * 2.1;
      ctx.beginPath();
      ctx.moveTo(x, gy - 12);
      ctx.quadraticCurveTo(x + Math.cos(va) * 7, gy - 4, x + Math.cos(va) * 5, gy + 8);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(" + glowRGB + ",1)";
    ctx.beginPath();
    ctx.arc(x - 3.4, gy - 11, 2.1, 0, Math.PI * 2);
    ctx.arc(x + 3.4, gy - 11, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawAssombracao(ctx, e, x, y) {
    drawWraith(ctx, e, x, y, "rgba(150,190,210,.55)", "120,190,220");
  }

  function drawSombra(ctx, e, x, y) {
    drawWraith(ctx, e, x, y, "rgba(40,30,50,.72)", "90,50,120");
  }

  function drawOnca(ctx, e, x, y) {
    var hunting = e.state === "telegraph" || e.state === "lunge";
    shadow(ctx, x, y + 13, 22, 7);
    var hex = bodyColor(e, "#a89078");
    var g = ctx.createLinearGradient(x, y - 16, x, y + 12);
    g.addColorStop(0, shadeHex(hex, 24));
    g.addColorStop(1, shadeHex(hex, -26));

    // bruma em volta: mesmo visível, ela nunca fica totalmente nítida
    var mist = ctx.createRadialGradient(x, y, 6, x, y, 40);
    mist.addColorStop(0, "rgba(210,225,235,.24)");
    mist.addColorStop(1, "rgba(210,225,235,0)");
    ctx.fillStyle = mist;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();

    var crouch = hunting ? 3 : 0;
    var step = Math.sin(e.walkT * 7) * 4;
    ctx.strokeStyle = shadeHex(hex, -30);
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    [-11, -4, 5, 12].forEach(function (ox, i) {
      ctx.beginPath();
      ctx.moveTo(x + ox, y + 2 + crouch);
      ctx.lineTo(x + ox + (i % 2 ? step : -step), y + 13);
      ctx.stroke();
    });

    // corpo alongado de felino
    ctx.beginPath();
    ctx.ellipse(x, y + crouch, 21, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // rosetas
    ctx.fillStyle = "rgba(50,36,26,.72)";
    [[-12, -3], [-5, 3], [2, -4], [9, 2], [14, -3], [-8, -6]].forEach(function (r) {
      ctx.beginPath();
      ctx.arc(x + r[0], y + r[1] + crouch, 2.4, 0, Math.PI * 2);
      ctx.fill();
    });

    // rabo longo, ondulando
    ctx.strokeStyle = shadeHex(hex, -8);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 1 + crouch);
    ctx.quadraticCurveTo(x - 32, y - 10 + Math.sin(e.walkT * 3) * 6, x - 38, y + 2);
    ctx.stroke();

    // cabeça baixa quando caça: silhueta muda antes do bote
    var hx = x + 18,
      hy = y - 6 + crouch * 2;
    ctx.beginPath();
    ctx.arc(hx, hy, 8, 0, Math.PI * 2);
    ctx.fillStyle = shadeHex(hex, 12);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    [-1, 1].forEach(function (sgn) {
      ctx.beginPath();
      ctx.moveTo(hx - 2 + sgn * 4, hy - 6);
      ctx.lineTo(hx - 1 + sgn * 6, hy - 12);
      ctx.lineTo(hx + 2 + sgn * 3, hy - 5);
      ctx.closePath();
      ctx.fillStyle = shadeHex(hex, -18);
      ctx.fill();
      ctx.stroke();
    });
    ctx.fillStyle = hunting ? "#fff3c4" : "#e0c04a";
    ctx.beginPath();
    ctx.arc(hx + 2, hy - 2, 2.2, 0, Math.PI * 2);
    ctx.arc(hx + 7, hy - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBoitata(ctx, e, x, y) {
    var rage = e.phase >= 3;
    var t = e.walkT;
    shadow(ctx, x, y + 20, 30, 8);

    // aura de calor
    var heat = ctx.createRadialGradient(x, y, 8, x, y, 70);
    heat.addColorStop(0, rage ? "rgba(255,110,20,.4)" : "rgba(255,150,40,.3)");
    heat.addColorStop(1, "rgba(255,90,0,0)");
    ctx.fillStyle = heat;
    ctx.beginPath();
    ctx.arc(x, y, 70, 0, Math.PI * 2);
    ctx.fill();

    /*
     * Corpo em serpente: uma cadeia de segmentos que ondula atrás da
     * cabeça. Cada segmento é menor e mais escuro que o anterior, então a
     * direção que ela encara fica óbvia mesmo com a tela cheia de fogo.
     */
    var ang = Math.atan2(e.facing.y, e.facing.x);
    for (var i = 9; i >= 1; i--) {
      var wave = Math.sin(t * 5 - i * 0.55) * (7 + i * 1.3);
      var back = ang + Math.PI;
      var sx = x + Math.cos(back) * i * 13 + Math.cos(back + Math.PI / 2) * wave;
      var sy = y + Math.sin(back) * i * 13 + Math.sin(back + Math.PI / 2) * wave;
      var k = 1 - i / 11;
      var rr = 6 + k * 12;
      var sg = ctx.createRadialGradient(sx - rr * 0.3, sy - rr * 0.3, 1, sx, sy, rr);
      sg.addColorStop(0, rage ? "#ffd84a" : "#ffb43a");
      sg.addColorStop(0.55, rage ? "#ff6a10" : "#e0631a");
      sg.addColorStop(1, "rgba(120,30,0,.65)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sx, sy, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    // cabeça
    var hg = ctx.createRadialGradient(x - 6, y - 8, 2, x, y, 24);
    hg.addColorStop(0, "#fff3c4");
    hg.addColorStop(0.4, rage ? "#ff8a20" : "#ffb43a");
    hg.addColorStop(1, rage ? "#a02800" : "#8a3a00");
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 17, ang, 0, Math.PI * 2);
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.strokeStyle = "rgba(90,25,0,.8)";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // chifres/crista de brasa
    ctx.strokeStyle = rage ? "#ffe08a" : "#ffc45a";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    for (var c = -1; c <= 1; c++) {
      var ca = ang + Math.PI + c * 0.5;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ca) * 12, y + Math.sin(ca) * 12);
      ctx.lineTo(x + Math.cos(ca) * 24, y + Math.sin(ca) * 24 - 6);
      ctx.stroke();
    }

    // olhos: brancos de tão quentes
    var ex = x + Math.cos(ang) * 11,
      ey = y + Math.sin(ang) * 11;
    var perp = ang + Math.PI / 2;
    ctx.fillStyle = "#fffbe8";
    [-1, 1].forEach(function (sgn) {
      ctx.beginPath();
      ctx.arc(ex + Math.cos(perp) * 5 * sgn, ey + Math.sin(perp) * 5 * sgn, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#2a0d00";
    [-1, 1].forEach(function (sgn) {
      ctx.beginPath();
      ctx.arc(ex + Math.cos(perp) * 5 * sgn + Math.cos(ang) * 1, ey + Math.sin(perp) * 5 * sgn + Math.sin(ang) * 1, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // fagulhas subindo
    ctx.fillStyle = "rgba(255,200,90,.85)";
    for (var f = 0; f < 6; f++) {
      var fa = t * 1.4 + f * 1.05;
      var fy = ((t * 40 + f * 17) % 54);
      ctx.globalAlpha = Math.max(0, 1 - fy / 54) * 0.9;
      ctx.beginPath();
      ctx.arc(x + Math.cos(fa) * 22, y - fy + 10, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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
    isMiniBoss: isMiniBoss,
    archetypeOf: archetypeOf,
    STATS: STATS,
  };
})();
