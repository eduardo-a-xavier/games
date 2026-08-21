window.EN = window.EN || {};

/*
 * Entidade do jogador: movimento, máquina de estados de animação, uso de
 * habilidades e recursos (HP/ST/MP). Não conhece o mundo (inimigos,
 * projéteis) diretamente — ataques corpo-a-corpo recebem uma lista de alvos
 * e um callback `dealDamage`; habilidades à distância devolvem um
 * "descritor" de projétil para quem chamou (world.js/arena.js) instanciar.
 * Isso mantém Player.js independente da cena em que está rodando (mundo
 * principal ou arena de teste).
 */
EN.Player = (function () {
  function create(appearance, classId, x, y) {
    var p = {
      appearance: appearance,
      x: x || 300,
      y: y || 300,
      r: 13,
      facing: { x: 0, y: 1 },
      speed: 160,
      moving: false,
      walkT: 0,
      state: "idle",
      stateT: 0,
      invuln: 0,
      chargeT: 0,
      charging: false,
      healCharges: 3,
      cd: { basic: 0, heavy: 0, skill1: 0, dodge: 0 },
      classId: null,
      classDef: null,
    };
    applyClass(p, classId, true);
    return p;
  }

  function applyClass(p, classId, fullHeal) {
    var stats;
    if (classId) {
      p.classDef = EN.Classes.getById(classId);
      stats = p.classDef.baseStats;
    } else {
      p.classDef = null;
      stats = EN.Classes.classlessDefaults.baseStats;
    }
    p.classId = classId;
    p.hpMax = stats.hpMax;
    p.stMax = stats.stMax;
    p.mpMax = stats.mpMax;
    p.atk = stats.atk;
    p.def = stats.def;
    p.speed = stats.speed;
    if (fullHeal || p.hp === undefined) {
      p.hp = p.hpMax;
      p.st = p.stMax;
      p.mp = p.mpMax;
    } else {
      p.hp = Math.min(p.hp, p.hpMax);
      p.st = Math.min(p.st, p.stMax);
      p.mp = Math.min(p.mp, p.mpMax);
    }
  }

  var CD_MAX = { dodge: 0.9 };
  var COOLDOWN_TICK_KEYS = ["basic", "heavy", "skill1", "dodge"];

  function update(p, dt, moveVec) {
    COOLDOWN_TICK_KEYS.forEach(function (k) {
      if (p.cd[k] > 0) p.cd[k] = Math.max(0, p.cd[k] - dt);
    });
    if (p.invuln > 0) p.invuln -= dt;
    p.stateT += dt;

    p.st = Math.min(p.stMax, p.st + dt * 9);
    p.mp = Math.min(p.mpMax, p.mp + dt * 4.5);

    var mag = Math.hypot(moveVec.x, moveVec.y);
    p.moving = mag > 0.08 && p.state !== "attack" && p.state !== "dodge" && p.state !== "hurt" && p.state !== "death";
    if (p.moving) {
      p.facing.x = moveVec.x / mag;
      p.facing.y = moveVec.y / mag;
      var running = mag > 0.85;
      var spd = p.speed * (p.state === "dodge" ? 2.6 : 1);
      p.x += moveVec.x * spd * dt;
      p.y += moveVec.y * spd * dt;
      p.walkT += dt * (running ? 13 : 8);
      if (p.state !== "attack" && p.state !== "chargeAttack" && p.state !== "dodge" && p.state !== "hurt")
        p.state = running ? "run" : "walk";
    } else if (p.state === "walk" || p.state === "run") {
      p.state = "idle";
    }

    if (p.charging) {
      p.chargeT = Math.min(1, p.chargeT + dt / 0.55);
      p.state = "chargeAttack";
    }

    if ((p.state === "attack" || p.state === "dodge" || p.state === "hurt" || p.state === "tool") && p.stateT > 0.32) {
      p.state = p.moving ? (mag > 0.85 ? "run" : "walk") : "idle";
    }
  }

  function setState(p, state) {
    p.state = state;
    p.stateT = 0;
  }

  function tapAttack(p, enemies, dealDamage) {
    if (p.cd.basic > 0 || p.hp <= 0 || p.charging) return false;
    var ab = EN.Classes.universalAttack.basic;
    p.cd.basic = ab.cooldown;
    setState(p, "attack");
    var hits = EN.Classes.meleeHitTest(p.x, p.y, p.facing, ab.range, Math.PI / 2.1, enemies);
    hits.forEach(function (e) {
      dealDamage(e, ab.damage);
    });
    return { type: "melee", hitCount: hits.length };
  }

  function startCharge(p) {
    if (p.cd.heavy > 0 || p.hp <= 0 || p.st < 15) return false;
    p.charging = true;
    p.chargeT = 0;
    setState(p, "chargeAttack");
    return true;
  }

  function releaseCharge(p, enemies, dealDamage) {
    if (!p.charging) return false;
    p.charging = false;
    var full = p.chargeT >= 0.98;
    p.chargeT = 0;
    var ab = EN.Classes.universalAttack.heavy;
    var cost = full ? ab.staminaCost : Math.round(ab.staminaCost * 0.6);
    if (p.st < cost) {
      setState(p, "idle");
      return false;
    }
    p.st -= cost;
    p.cd.heavy = ab.cooldown;
    setState(p, "attack");
    var dmg = full ? ab.damage : Math.round(ab.damage * 0.55);
    var hits = EN.Classes.meleeHitTest(p.x, p.y, p.facing, ab.range, Math.PI / 1.7, enemies);
    hits.forEach(function (e) {
      dealDamage(e, dmg);
    });
    return { type: "melee_heavy", full: full, hitCount: hits.length };
  }

  // habilidade 1 da classe (única implementada nesta etapa) — devolve
  // descritor de projétil para quem chamou instanciar, ou aplica dano
  // corpo-a-corpo diretamente (Golpe Poderoso do Guerreiro)
  function useSkill1(p, enemies, dealDamage) {
    if (!p.classDef || !p.classDef.abilities[0]) return false;
    var ab = p.classDef.abilities[0];
    if (p.cd.skill1 > 0 || p.hp <= 0) return false;
    if (ab.staminaCost && p.st < ab.staminaCost) return false;
    if (ab.manaCost && p.mp < ab.manaCost) return false;

    p.st -= ab.staminaCost || 0;
    p.mp -= ab.manaCost || 0;
    p.cd.skill1 = ab.cooldown;
    setState(p, ab.animation || "attack");

    if (ab.type === "melee_heavy" || ab.type === "melee") {
      var halfAngle = ab.type === "melee_heavy" ? Math.PI / 1.6 : Math.PI / 2.1;
      var hits = EN.Classes.meleeHitTest(p.x, p.y, p.facing, ab.range, halfAngle, enemies);
      hits.forEach(function (e) {
        dealDamage(e, ab.damage);
      });
      return { type: ab.type, ability: ab, hitCount: hits.length };
    }
    if (ab.type === "projectile" || ab.type === "projectile_magic") {
      return {
        type: ab.type,
        ability: ab,
        projectile: {
          x: p.x,
          y: p.y,
          vx: p.facing.x * 380,
          vy: p.facing.y * 380,
          r: ab.type === "projectile_magic" ? 6 : 5,
          dmg: ab.damage,
          magic: ab.type === "projectile_magic",
        },
      };
    }
    return false;
  }

  function dodge(p) {
    if (p.cd.dodge > 0 || p.hp <= 0 || p.st < 18) return false;
    p.st -= 18;
    p.cd.dodge = CD_MAX.dodge;
    p.invuln = 0.32;
    setState(p, "dodge");
    return true;
  }

  function useHeal(p) {
    if (p.healCharges <= 0 || p.hp <= 0) return false;
    p.healCharges--;
    p.hp = Math.min(p.hpMax, p.hp + 40);
    return true;
  }

  function takeDamage(p, dmg) {
    if (p.invuln > 0 || p.hp <= 0) return false;
    p.hp = Math.max(0, p.hp - dmg);
    p.invuln = 0.5;
    setState(p, "hurt");
    if (p.hp <= 0) setState(p, "death");
    return true;
  }

  function draw(ctx, p, camX, camY) {
    var anim = {
      state: p.state,
      t: p.stateT,
      facing: p.facing,
      classId: p.classId,
      chargeProgress: p.chargeT,
    };
    if (p.invuln > 0 && p.state !== "hurt" && Math.floor(p.invuln * 20) % 2 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      EN.Appearance.draw(ctx, p.x - camX, p.y - camY, p.appearance, anim);
      ctx.restore();
    } else {
      EN.Appearance.draw(ctx, p.x - camX, p.y - camY, p.appearance, anim);
    }
  }

  return {
    create: create,
    applyClass: applyClass,
    update: update,
    tapAttack: tapAttack,
    startCharge: startCharge,
    releaseCharge: releaseCharge,
    useSkill1: useSkill1,
    dodge: dodge,
    useHeal: useHeal,
    takeDamage: takeDamage,
    draw: draw,
    CD_MAX: CD_MAX,
  };
})();
