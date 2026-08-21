window.EN = window.EN || {};

/*
 * Camada de sensação do combate: tudo que dá peso a um golpe sem mudar as
 * regras de dano. Fica separada de player.js/enemy.js porque hitstop,
 * tremor de câmera e câmera lenta são efeitos do QUADRO INTEIRO — quem
 * causa dano só pede o efeito, nunca sabe como ele é aplicado.
 *
 * O tempo do jogo passa todo por consumeFrame(): o hitstop congela o
 * quadro por alguns milissegundos no impacto (é o que faz o golpe
 * "morder" em vez de atravessar o inimigo), e a câmera lenta entra
 * depois de uma esquiva perfeita.
 */
EN.Combat = (function () {
  var hitstopT = 0;
  var slow = { t: 0, scale: 1 };
  var shake = { t: 0, dur: 1, mag: 0 };

  // teto baixo de propósito: hitstop longo demais lê como travamento do
  // jogo, não como impacto
  var MAX_HITSTOP = 0.1;

  function hitstop(seconds) {
    hitstopT = Math.min(MAX_HITSTOP, Math.max(hitstopT, seconds));
  }

  function slowmo(scale, duration) {
    slow.scale = scale;
    slow.t = duration;
  }

  function shakeCamera(mag, duration) {
    if (shake.t > 0 && mag <= shake.mag) return;
    shake.mag = mag;
    shake.dur = duration;
    shake.t = duration;
  }

  // devolve o dt que o resto do jogo deve usar neste quadro
  function consumeFrame(dtReal) {
    if (shake.t > 0) shake.t -= dtReal;
    if (hitstopT > 0) {
      hitstopT -= dtReal;
      return 0;
    }
    if (slow.t > 0) {
      slow.t -= dtReal;
      return dtReal * slow.scale;
    }
    return dtReal;
  }

  function shakeOffset() {
    if (shake.t <= 0) return { x: 0, y: 0 };
    var k = shake.t / shake.dur;
    var m = shake.mag * k * k;
    return { x: (Math.random() * 2 - 1) * m, y: (Math.random() * 2 - 1) * m };
  }

  function isSlowmo() {
    return slow.t > 0;
  }

  function angleDiff(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
  }

  /*
   * Auto-mira leve (GDD Seção 14). Corrige a direção do golpe só quando já
   * existe um alvo razoavelmente à frente — nunca gira o personagem pras
   * costas. Sem esse limite o jogador perde o controle de posicionamento,
   * que é exatamente o que o combate tático exige dele.
   */
  function autoAim(x, y, facing, enemies, range, maxAngle) {
    var fa = Math.atan2(facing.y, facing.x);
    var best = null,
      bestScore = Infinity;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead) continue;
      var dx = e.x - x,
        dy = e.y - y;
      var d = Math.hypot(dx, dy);
      if (d > range) continue;
      var diff = Math.abs(angleDiff(Math.atan2(dy, dx), fa));
      if (diff > maxAngle) continue;
      var score = diff * 70 + d;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    if (!best) return facing;
    var nx = best.x - x,
      ny = best.y - y,
      nd = Math.hypot(nx, ny) || 1;
    return { x: nx / nd, y: ny / nd };
  }

  // Recuo: empurrão curto que decai sozinho. Guardado na própria entidade
  // pra funcionar igual em inimigo comum e em chefe.
  function knockback(entity, fromX, fromY, force) {
    var dx = entity.x - fromX,
      dy = entity.y - fromY;
    var d = Math.hypot(dx, dy) || 1;
    var resist = entity.kbResist || 0;
    var f = force * (1 - Math.min(0.95, resist));
    entity.kbx = (dx / d) * f;
    entity.kby = (dy / d) * f;
  }

  function updateKnockback(entity, dt) {
    if (!entity.kbx && !entity.kby) return;
    entity.x += entity.kbx * dt;
    entity.y += entity.kby * dt;
    var decay = Math.pow(0.0025, dt);
    entity.kbx *= decay;
    entity.kby *= decay;
    if (Math.abs(entity.kbx) < 1) entity.kbx = 0;
    if (Math.abs(entity.kby) < 1) entity.kby = 0;
  }

  /*
   * Efeitos de estado. Mantidos minúsculos de propósito: cada um é só um
   * contador que outra parte do jogo lê. `sangramento` tira vida em
   * pulsos, `enraizado` impede andar, `atordoado` impede agir.
   */
  function applyStatus(entity, kind, duration, power) {
    entity.status = entity.status || {};
    var cur = entity.status[kind];
    if (cur && cur.t > duration) return;
    entity.status[kind] = { t: duration, power: power || 1, tick: 0 };
  }

  function hasStatus(entity, kind) {
    return !!(entity.status && entity.status[kind] && entity.status[kind].t > 0);
  }

  function updateStatus(entity, dt, onBleedTick) {
    if (!entity.status) return;
    for (var k in entity.status) {
      var st = entity.status[k];
      if (st.t <= 0) continue;
      st.t -= dt;
      if (k === "sangramento" || k === "queimando") {
        // queimando pulsa mais rápido que o sangramento — dano por segundo
        // parecido mas mais agressivo visualmente (fogo não espera)
        var interval = k === "queimando" ? 0.3 : 0.6;
        st.tick -= dt;
        if (st.tick <= 0) {
          st.tick = interval;
          if (onBleedTick) onBleedTick(st.power, k);
        }
      }
    }
  }

  function clearStatus(entity) {
    entity.status = {};
  }

  /*
   * Dano crítico: chance fixa baixa, multiplicador alto. Serve pra que
   * duas lutas contra o mesmo inimigo nunca sejam idênticas, sem
   * transformar o combate em sorte pura.
   */
  var CRIT_CHANCE = 0.12,
    CRIT_MULT = 1.8;
  function rollDamage(base) {
    if (Math.random() < CRIT_CHANCE) {
      return { value: Math.round(base * CRIT_MULT), crit: true };
    }
    return { value: Math.round(base), crit: false };
  }

  return {
    hitstop: hitstop,
    slowmo: slowmo,
    isSlowmo: isSlowmo,
    shakeCamera: shakeCamera,
    consumeFrame: consumeFrame,
    shakeOffset: shakeOffset,
    autoAim: autoAim,
    knockback: knockback,
    updateKnockback: updateKnockback,
    applyStatus: applyStatus,
    hasStatus: hasStatus,
    updateStatus: updateStatus,
    clearStatus: clearStatus,
    rollDamage: rollDamage,
  };
})();
