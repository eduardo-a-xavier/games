window.EN = window.EN || {};

/*
 * Entidades de inimigo — IA e desenho dirigidos pela categoria do
 * EnemyDefinition (bestiary.js). Duas categorias implementadas nesta etapa:
 *
 *  - 'hostile'     (Rato-do-Mato Corrompido): patrulha -> persegue ->
 *                    avisa (telegraph) -> investe.
 *  - 'territorial' (Cipó Vivo): fica fixo; só reage se o jogador permanecer
 *                    perto por tempo demais; agarra e imobiliza brevemente.
 *
 * Novas categorias reaproveitam esta mesma máquina de estados adicionando
 * um novo `case` em update()/draw() — não é preciso criar um arquivo por
 * criatura.
 */
EN.Enemy = (function () {
  function rand(seed) {
    var x = Math.sin(seed * 999) * 10000;
    return x - Math.floor(x);
  }

  var STATS_BY_DEF = {
    rato_mato_corrompido: { hp: 34, r: 11, detect: 150, forget: 230, speed: 72, telegraph: 0.55, lungeSpeed: 210, lungeDmg: 9 },
    cipo_vivo: { hp: 46, r: 13, territory: 78, grip: 40, grace: 1.0, dmg: 7, tickEvery: 0.7 },
  };

  function spawn(defId, x, y) {
    var def = EN.Bestiary.getById(defId);
    var s = STATS_BY_DEF[defId];
    var e = {
      defId: defId,
      def: def,
      x: x,
      y: y,
      home: { x: x, y: y },
      r: s.r,
      hp: s.hp,
      hpMax: s.hp,
      state: def.category === "territorial" ? "dormant" : "patrol",
      stateT: rand(x + y) * 2,
      target: null,
      telegraph: 0,
      hitFlash: 0,
      dead: false,
      deadT: 0,
      walkT: rand(x * y + 1) * 10,
      nearT: 0,
      tickT: 0,
      vineReach: 0,
    };
    return e;
  }

  function update(e, dt, player, dealDamageToPlayer) {
    if (e.dead) return;
    var s = STATS_BY_DEF[e.defId];
    e.walkT += dt;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    var dToPlayer = Math.hypot(player.x - e.x, player.y - e.y);

    if (e.def.category === "hostile") {
      if (e.state === "patrol") {
        e.stateT -= dt;
        if (dToPlayer < s.detect) {
          e.state = "chase";
        } else if (e.stateT <= 0) {
          e.target = { x: e.home.x + (rand(e.walkT) - 0.5) * 80, y: e.home.y + (rand(e.walkT + 2) - 0.5) * 80 };
          e.stateT = 1.5 + rand(e.walkT) * 2;
        }
        if (e.target) {
          var tdx = e.target.x - e.x,
            tdy = e.target.y - e.y,
            td = Math.hypot(tdx, tdy);
          if (td > 4) {
            e.x += (tdx / td) * 30 * dt;
            e.y += (tdy / td) * 30 * dt;
          }
        }
      } else if (e.state === "chase") {
        if (dToPlayer > s.forget) {
          e.state = "patrol";
          e.stateT = 1;
          return;
        }
        if (dToPlayer < e.r + 24) {
          e.state = "telegraph";
          e.telegraph = s.telegraph;
          return;
        }
        var dx = player.x - e.x,
          dy = player.y - e.y,
          d = dToPlayer;
        e.x += (dx / d) * s.speed * dt;
        e.y += (dy / d) * s.speed * dt;
      } else if (e.state === "telegraph") {
        e.telegraph -= dt;
        if (e.telegraph <= 0) {
          e.state = "lunge";
          e.lungeT = 0.22;
          e.lx = player.x - e.x;
          e.ly = player.y - e.y;
          var ld = Math.hypot(e.lx, e.ly) || 1;
          e.lx /= ld;
          e.ly /= ld;
        }
      } else if (e.state === "lunge") {
        e.lungeT -= dt;
        e.x += e.lx * s.lungeSpeed * dt;
        e.y += e.ly * s.lungeSpeed * dt;
        if (Math.hypot(player.x - e.x, player.y - e.y) < e.r + player.r + 4) {
          dealDamageToPlayer(s.lungeDmg);
          e.state = "chase";
        }
        if (e.lungeT <= 0) e.state = "chase";
      }
    } else if (e.def.category === "territorial") {
      // nunca se move do lugar — território fixo
      if (dToPlayer <= s.grip) {
        e.nearT += dt;
        if (e.state === "dormant") e.state = "alert";
        if (e.nearT >= s.grace && e.state !== "gripping") {
          e.state = "gripping";
          e.tickT = 0;
        }
      } else {
        e.nearT = Math.max(0, e.nearT - dt * 1.5);
        if (e.nearT <= 0 && e.state !== "dormant") e.state = dToPlayer <= s.territory ? "alert" : "dormant";
      }

      if (e.state === "gripping") {
        e.vineReach = Math.min(1, e.vineReach + dt * 4);
        e.tickT -= dt;
        if (dToPlayer > s.grip + 14) {
          e.state = "alert";
          e.vineReach = 0;
        } else if (e.tickT <= 0) {
          e.tickT = s.tickEvery;
          dealDamageToPlayer(s.dmg);
        }
      } else {
        e.vineReach = Math.max(0, e.vineReach - dt * 3);
      }
    }
  }

  function damage(e, dmg, onKilled) {
    e.hp -= dmg;
    e.hitFlash = 0.18;
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      e.deadT = 0;
      if (onKilled) onKilled(e);
    }
  }

  function draw(ctx, e, camX, camY) {
    var x = e.x - camX,
      y = e.y - camY;
    ctx.save();
    if (e.dead) ctx.globalAlpha = Math.max(0, 1 - e.deadT / 0.5);

    if (e.def.category === "territorial") {
      drawCipoVivo(ctx, e, x, y);
    } else {
      drawRato(ctx, e, x, y);
    }

    if (!e.dead) {
      var pct = Math.max(0, e.hp / e.hpMax);
      ctx.fillStyle = "#000a";
      ctx.fillRect(x - 14, y - 26, 28, 4);
      ctx.fillStyle = "#c94b3f";
      ctx.fillRect(x - 14, y - 26, 28 * pct, 4);
    }
    if (e.state === "telegraph") {
      var pulse = 1 - e.telegraph / STATS_BY_DEF[e.defId].telegraph;
      ctx.strokeStyle = "rgba(224,72,58," + (0.9 - pulse * 0.5) + ")";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, 10 + pulse * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  var OUTLINE = "rgba(20,14,10,.55)";

  function shadeHex(hex, amt) {
    var num = parseInt(hex.replace("#", ""), 16);
    var r = Math.min(255, Math.max(0, (num >> 16) + amt));
    var g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
    var b = Math.min(255, Math.max(0, (num & 0xff) + amt));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function drawRato(ctx, e, x, y) {
    var shadowG = ctx.createRadialGradient(x, y + 9, 1, x, y + 9, 10);
    shadowG.addColorStop(0, "rgba(0,0,0,.35)");
    shadowG.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadowG;
    ctx.beginPath();
    ctx.ellipse(x, y + 9, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    var bodyHex = e.hitFlash > 0 ? "#f2b0a8" : "#7a6a52";
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

    // marca de corrupção
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

  return { spawn: spawn, update: update, damage: damage, draw: draw };
})();
