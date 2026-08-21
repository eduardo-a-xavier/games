window.EN = window.EN || {};

/*
 * Entidade do jogador: movimento, máquina de estados de animação, uso de
 * habilidades e recursos (HP/ST/MP). Não conhece o mundo (inimigos,
 * projéteis) diretamente — ataques corpo-a-corpo recebem uma lista de alvos
 * e um callback `dealDamage`; habilidades à distância devolvem um
 * "descritor" de projétil para quem chamou (world.js/arena.js) instanciar.
 * Isso mantém Player.js independente da cena em que está rodando (mundo
 * principal ou arena de teste).
 *
 * Desenho do combate (GDD Seção 14 — tático, não frenético):
 *  - O ATAQUE do jogador é instantâneo, mas COMPROMETE: cada golpe trava o
 *    movimento por um instante e custa vigor. Não dá pra sair trocando
 *    golpe infinitamente enquanto anda.
 *  - Quem telegrafa é o INIMIGO (0,4–0,8s de aviso). A perícia exigida é
 *    leitura e posicionamento, não reflexo puro — por isso o golpe do
 *    jogador não tem tempo de preparo próprio, que só somaria atraso de
 *    input em cima do toque na tela.
 *  - Sequência de 3 golpes: o terceiro é mais lento, mais largo e mais
 *    forte. Escolher entre fechar a sequência ou recuar é a decisão
 *    tática de cada troca.
 *  - Esquiva com rolamento de verdade (deslocamento + invencibilidade) e
 *    ESQUIVA PERFEITA: rolar dentro da janela de aviso de um inimigo
 *    devolve vigor, desacelera o tempo e libera um contra-ataque bônus.
 *    É a recompensa direta por ler o telegraph.
 */
EN.Player = (function () {
  // bônus fixo por nível (progressão simples pro protótipo -- não é a
  // curva completa de talentos do GDD, só o suficiente pra "subir de
  // nível" ser sentido de verdade numa sessão de teste curta)
  var PER_LEVEL = { hp: 6, st: 3, mp: 2, atk: 1, def: 0.4 };
  function levelBonus(level) {
    var n = Math.max(0, (level || 1) - 1);
    return { hp: n * PER_LEVEL.hp, st: n * PER_LEVEL.st, mp: n * PER_LEVEL.mp, atk: n * PER_LEVEL.atk, def: n * PER_LEVEL.def };
  }

  var DODGE_DUR = 0.28;
  var DODGE_SPEED = 430;
  var RIPOSTE_MULT = 1.6;

  // Passos da sequência de golpes. O terceiro é o "finalizador": trava
  // mais tempo, custa mais vigor e empurra muito mais — é uma aposta.
  var COMBO = [
    { dmgMult: 1.0, range: 50, halfAngle: Math.PI / 3.4, lock: 0.16, st: 4, kb: 150, hitstop: 0.045, shake: 2.0 },
    { dmgMult: 1.2, range: 52, halfAngle: Math.PI / 3.4, lock: 0.18, st: 5, kb: 190, hitstop: 0.05, shake: 2.6 },
    { dmgMult: 1.75, range: 62, halfAngle: Math.PI / 2.3, lock: 0.3, st: 9, kb: 420, hitstop: 0.085, shake: 5.5 },
  ];
  var COMBO_WINDOW = 0.55;
  var AIM_RANGE = 120,
    AIM_ANGLE = Math.PI / 7;

  function create(appearance, classId, x, y, level) {
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
      cd: { basic: 0, heavy: 0, skill1: 0, skill2: 0, dodge: 0 },
      classId: null,
      classDef: null,
      level: level || 1,
      combo: 0,
      comboT: 0,
      attackLock: 0,
      riposte: 0,
      dodgeT: 0,
      heavySwing: 0,
      dodgeVX: 0,
      dodgeVY: 0,
      status: {},
      lastHitBy: null,
      parryT: 0,
      shield: 0,
      shieldT: 0,
      skill2Def: null,
    };
    applyClass(p, classId, true, level);
    return p;
  }

  function applyClass(p, classId, fullHeal, level) {
    var stats;
    if (classId) {
      p.classDef = EN.Classes.getById(classId);
      stats = p.classDef.baseStats;
    } else {
      p.classDef = null;
      stats = EN.Classes.classlessDefaults.baseStats;
    }
    p.classId = classId;
    p.level = level || p.level || 1;
    applyTalent(p, p.talentId);
    var bonus = levelBonus(p.level);
    p.hpMax = stats.hpMax + bonus.hp;
    p.stMax = stats.stMax + bonus.st;
    p.mpMax = stats.mpMax + bonus.mp;
    p.atk = stats.atk + bonus.atk;
    p.def = stats.def + bonus.def;
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

  /*
   * Talento de nível 5 (GDD Seção 11): a segunda habilidade não vem de
   * graça com a classe, é uma ESCOLHA entre duas. Guardar só o id aqui
   * (e resolver a definição em classes.js) mantém o save pequeno e deixa
   * rebalancear números sem migrar save antigo.
   */
  function applyTalent(p, talentId) {
    p.talentId = talentId || null;
    p.skill2Def = talentId && p.classId ? EN.Classes.getTalent(p.classId, talentId) : null;
  }

  function canChooseTalent(p) {
    var t = p.classId && EN.Classes.talentsFor(p.classId);
    return !!(t && !p.talentId && p.level >= t.level);
  }

  var CD_MAX = { dodge: 0.62 };
  var COOLDOWN_TICK_KEYS = ["basic", "heavy", "skill1", "skill2", "dodge"];

  function update(p, dt, moveVec, enemies) {
    COOLDOWN_TICK_KEYS.forEach(function (k) {
      if (p.cd[k] > 0) p.cd[k] = Math.max(0, p.cd[k] - dt);
    });
    if (p.invuln > 0) p.invuln -= dt;
    if (p.attackLock > 0) p.attackLock -= dt;
    if (p.riposte > 0) p.riposte -= dt;
    if (p.parryT > 0) p.parryT -= dt;
    if (p.heavySwing > 0) p.heavySwing -= dt;
    if (p.shieldT > 0) {
      p.shieldT -= dt;
      if (p.shieldT <= 0) p.shield = 0;
    }
    if (p.comboT > 0) {
      p.comboT -= dt;
      if (p.comboT <= 0) p.combo = 0;
    }
    p.stateT += dt;

    EN.Combat.updateStatus(p, dt, function (power) {
      p.hp = Math.max(1, p.hp - power);
    });

    // vigor volta bem devagar durante um golpe, pra sequência longa ter
    // custo real em vez de ser sempre a escolha certa
    var regenScale = p.attackLock > 0 || p.charging ? 0.3 : 1;
    p.st = Math.min(p.stMax, p.st + dt * 11 * regenScale);
    p.mp = Math.min(p.mpMax, p.mp + dt * 4.5);

    if (p.state === "death") return;

    // o rolamento move o personagem sozinho, ignorando o joystick — é o
    // que faz a esquiva ser um compromisso e não só um "andar mais rápido"
    if (p.state === "dodge") {
      p.dodgeT -= dt;
      var k = Math.max(0.22, p.dodgeT / DODGE_DUR);
      p.x += p.dodgeVX * DODGE_SPEED * k * dt;
      p.y += p.dodgeVY * DODGE_SPEED * k * dt;
      p.moving = false;
      p.walkT += dt * 10;
      if (p.dodgeT <= 0) setState(p, "idle");
      return;
    }

    var rooted = EN.Combat.hasStatus(p, "enraizado");
    var mag = Math.hypot(moveVec.x, moveVec.y);
    var canMove = !rooted && p.attackLock <= 0 && p.state !== "hurt";
    p.moving = mag > 0.08 && canMove;

    if (mag > 0.08 && !p.charging && p.attackLock <= 0) {
      p.facing.x = moveVec.x / mag;
      p.facing.y = moveVec.y / mag;
    }

    if (p.moving) {
      var running = mag > 0.85;
      // carregar o golpe pesado deixa o passo lento: reposicionar durante
      // a carga é possível, mas fugir carregando não
      var spd = p.speed * (p.charging ? 0.45 : 1);
      p.x += moveVec.x * spd * dt;
      p.y += moveVec.y * spd * dt;
      p.walkT += dt * (running ? 13 : 8);
      if (!p.charging && p.state !== "hurt") p.state = running ? "run" : "walk";
    } else if (p.state === "walk" || p.state === "run") {
      p.state = "idle";
    }

    if (p.charging) {
      p.chargeT = Math.min(1, p.chargeT + dt / 0.55);
      p.state = "chargeAttack";
    }

    if ((p.state === "attack" || p.state === "hurt" || p.state === "tool") && p.attackLock <= 0 && p.stateT > 0.22) {
      p.state = p.moving ? (mag > 0.85 ? "run" : "walk") : "idle";
    }
  }

  function setState(p, state) {
    p.state = state;
    p.stateT = 0;
  }

  // resolve um golpe corpo-a-corpo já com auto-mira, crítico, recuo,
  // hitstop e tremor — todo ataque do jogador passa por aqui pra que
  // nenhum caminho de dano esqueça o retorno visual
  function resolveMelee(p, enemies, dealDamage, cfg, baseDamage, heavy) {
    if (enemies && enemies.length) {
      p.facing = EN.Combat.autoAim(p.x, p.y, p.facing, enemies, AIM_RANGE, AIM_ANGLE);
    }
    var dmg = baseDamage;
    if (p.riposte > 0) {
      dmg *= RIPOSTE_MULT;
      p.riposte = 0;
    }
    var hits = EN.Classes.meleeHitTest(p.x, p.y, p.facing, cfg.range, cfg.halfAngle, enemies || []);
    hits.forEach(function (e) {
      var roll = EN.Combat.rollDamage(dmg);
      dealDamage(e, roll.value, heavy, roll.crit);
      EN.Combat.knockback(e, p.x, p.y, cfg.kb);
      if (heavy) EN.Combat.applyStatus(e, "sangramento", 2.4, 2);
    });
    if (hits.length) {
      EN.Combat.hitstop(cfg.hitstop);
      EN.Combat.shakeCamera(cfg.shake, 0.18);
    }
    return hits;
  }

  // dano base do golpe = valor da habilidade + parte do ataque do
  // personagem, pra que o atributo ATK (e portanto o nível e a classe)
  // realmente mude o combate — antes ele não era usado em lugar nenhum
  function baseDamageOf(p, ability) {
    return ability.damage + p.atk * 0.8;
  }

  function tapAttack(p, enemies, dealDamage) {
    if (p.cd.basic > 0 || p.hp <= 0 || p.charging || p.state === "dodge" || p.attackLock > 0) return false;
    var step = p.comboT > 0 ? Math.min(COMBO.length - 1, p.combo) : 0;
    var cfg = COMBO[step];
    if (p.st < cfg.st) return false;

    var ab = EN.Classes.universalAttack.basic;
    p.st -= cfg.st;
    p.cd.basic = ab.cooldown;
    p.attackLock = cfg.lock;
    setState(p, "attack");

    var hits = resolveMelee(p, enemies, dealDamage, cfg, baseDamageOf(p, ab) * cfg.dmgMult, step === 2);

    // a sequência só avança se o golpe realmente saiu; ao fechar os três
    // golpes ela reinicia, forçando uma pausa antes da próxima cadeia
    p.combo = step >= COMBO.length - 1 ? 0 : step + 1;
    p.comboT = p.combo === 0 ? 0 : COMBO_WINDOW;
    return { type: "melee", hitCount: hits.length, step: step, finisher: step === 2 };
  }

  function startCharge(p) {
    if (p.cd.heavy > 0 || p.hp <= 0 || p.st < 15 || p.state === "dodge") return false;
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
    p.attackLock = full ? 0.34 : 0.24;
    p.heavySwing = 0.34;
    setState(p, "attack");
    var cfg = {
      range: full ? 68 : 56,
      halfAngle: Math.PI / 2.1,
      kb: full ? 520 : 300,
      hitstop: full ? 0.095 : 0.06,
      shake: full ? 7 : 3.5,
    };
    var dmg = baseDamageOf(p, ab) * (full ? 1 : 0.55);
    var hits = resolveMelee(p, enemies, dealDamage, cfg, dmg, true);
    p.combo = 0;
    p.comboT = 0;
    return { type: "melee_heavy", full: full, hitCount: hits.length };
  }

  // habilidade 1 da classe (única implementada nesta etapa) — devolve
  // descritor de projétil para quem chamou instanciar, ou aplica dano
  // corpo-a-corpo diretamente (Golpe Poderoso do Guerreiro)
  function useSkill1(p, enemies, dealDamage) {
    if (!p.classDef || !p.classDef.abilities[0]) return false;
    var ab = p.classDef.abilities[0];
    if (p.cd.skill1 > 0 || p.hp <= 0 || p.state === "dodge") return false;
    if (ab.staminaCost && p.st < ab.staminaCost) return false;
    if (ab.manaCost && p.mp < ab.manaCost) return false;

    p.st -= ab.staminaCost || 0;
    p.mp -= ab.manaCost || 0;
    p.cd.skill1 = ab.cooldown;
    setState(p, ab.animation || "attack");
    p.attackLock = 0.26;
    p.combo = 0;
    p.comboT = 0;

    if (ab.type === "melee_heavy" || ab.type === "melee") {
      var heavy = ab.type === "melee_heavy";
      var cfg = {
        range: ab.range,
        halfAngle: heavy ? Math.PI / 1.9 : Math.PI / 3.2,
        kb: heavy ? 480 : 220,
        hitstop: heavy ? 0.09 : 0.05,
        shake: heavy ? 6.5 : 3,
      };
      var hits = resolveMelee(p, enemies, dealDamage, cfg, baseDamageOf(p, ab), heavy);
      return { type: ab.type, ability: ab, hitCount: hits.length };
    }
    if (ab.type === "projectile" || ab.type === "projectile_magic") {
      if (enemies && enemies.length) {
        p.facing = EN.Combat.autoAim(p.x, p.y, p.facing, enemies, ab.range, AIM_ANGLE);
      }
      var boost = 1;
      if (p.riposte > 0) {
        boost = RIPOSTE_MULT;
        p.riposte = 0;
      }
      return {
        type: ab.type,
        ability: ab,
        projectile: {
          x: p.x,
          y: p.y,
          vx: p.facing.x * 380,
          vy: p.facing.y * 380,
          r: ab.type === "projectile_magic" ? 6 : 5,
          dmg: baseDamageOf(p, ab) * boost,
          magic: ab.type === "projectile_magic",
        },
      };
    }
    return false;
  }

  /*
   * Habilidade 2 — o talento escolhido no nível 5. Os quatro tipos novos
   * existem pra que a escolha mude COMO se joga, não só o número do dano:
   *   parry            defesa ativa que exige leitura (aparo)
   *   trap             controle de área, sem dano
   *   shield           absorção de dano pagando mana
   *   projectile_multi cobertura de espaço em vez de alvo único
   */
  function useSkill2(p, enemies, dealDamage) {
    var ab = p.skill2Def;
    if (!ab) return false;
    if (p.cd.skill2 > 0 || p.hp <= 0 || p.state === "dodge") return false;
    if (ab.staminaCost && p.st < ab.staminaCost) return false;
    if (ab.manaCost && p.mp < ab.manaCost) return false;

    p.st -= ab.staminaCost || 0;
    p.mp -= ab.manaCost || 0;
    p.cd.skill2 = ab.cooldown;
    setState(p, ab.animation || "attack");
    p.combo = 0;
    p.comboT = 0;

    if (ab.type === "parry") {
      p.parryT = ab.parryWindow;
      p.attackLock = 0.12;
      return { type: "parry", ability: ab };
    }

    if (ab.type === "shield") {
      p.shield = ab.shieldAmount;
      p.shieldT = ab.shieldDuration;
      p.attackLock = 0.16;
      return { type: "shield", ability: ab };
    }

    if (ab.type === "trap") {
      p.attackLock = 0.22;
      var caught = 0;
      (enemies || []).forEach(function (e) {
        if (e.dead) return;
        if (Math.hypot(e.x - p.x, e.y - p.y) > ab.range) return;
        // o Cipó Vivo não se move de qualquer forma; enraizá-lo não faria
        // diferença nenhuma, então a rede não conta como acerto nele
        if (e.arch === "zoner") return;
        EN.Combat.applyStatus(e, "enraizado", ab.rootDuration);
        e.staggerT = Math.max(e.staggerT, 0.25);
        caught++;
      });
      return { type: "trap", ability: ab, caught: caught, radius: ab.range };
    }

    if (ab.type === "projectile_multi") {
      if (enemies && enemies.length) {
        p.facing = EN.Combat.autoAim(p.x, p.y, p.facing, enemies, ab.range, AIM_ANGLE);
      }
      p.attackLock = 0.22;
      var base = Math.atan2(p.facing.y, p.facing.x);
      var shots = [];
      var n = ab.shots || 3;
      for (var i = 0; i < n; i++) {
        var a = base + (i - (n - 1) / 2) * ab.spread;
        shots.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * 380,
          vy: Math.sin(a) * 380,
          r: 5,
          dmg: baseDamageOf(p, ab),
          magic: false,
          life: 1.4,
        });
      }
      return { type: "projectile_multi", ability: ab, projectiles: shots };
    }

    if (ab.type === "melee_heavy" || ab.type === "melee") {
      var heavy = ab.type === "melee_heavy";
      p.attackLock = heavy ? 0.36 : 0.24;
      if (heavy) p.heavySwing = 0.34;
      var cfg = {
        range: ab.range,
        halfAngle: heavy ? Math.PI / 1.8 : Math.PI / 3.2,
        kb: heavy ? 560 : 240,
        hitstop: heavy ? 0.1 : 0.05,
        shake: heavy ? 8 : 3,
      };
      var hits = resolveMelee(p, enemies, dealDamage, cfg, baseDamageOf(p, ab), heavy);
      hits.forEach(function (e) {
        e.poise -= 40;
      });
      return { type: ab.type, ability: ab, hitCount: hits.length };
    }

    if (ab.type === "projectile_magic" || ab.type === "projectile") {
      if (enemies && enemies.length) {
        p.facing = EN.Combat.autoAim(p.x, p.y, p.facing, enemies, ab.range, AIM_ANGLE);
      }
      p.attackLock = 0.24;
      return {
        type: ab.type,
        ability: ab,
        projectile: {
          x: p.x,
          y: p.y,
          vx: p.facing.x * 360,
          vy: p.facing.y * 360,
          r: 8,
          dmg: baseDamageOf(p, ab),
          magic: ab.type === "projectile_magic",
          burn: !!ab.burn,
          life: 1.6,
        },
      };
    }
    return false;
  }

  /*
   * Rolamento. Devolve "perfect" quando o jogador rolou dentro da janela
   * de aviso de um inimigo prestes a acertar — nesse caso o custo de vigor
   * volta, o tempo desacelera e o próximo golpe sai reforçado.
   */
  function dodge(p, enemies) {
    if (p.cd.dodge > 0 || p.hp <= 0 || p.state === "dodge") return false;
    if (EN.Combat.hasStatus(p, "enraizado")) return false;
    var cost = 16;
    if (p.st < cost) return false;

    var mv = p.pendingMove && Math.hypot(p.pendingMove.x, p.pendingMove.y) > 0.15 ? p.pendingMove : p.facing;
    var m = Math.hypot(mv.x, mv.y) || 1;
    p.dodgeVX = mv.x / m;
    p.dodgeVY = mv.y / m;
    p.facing.x = p.dodgeVX;
    p.facing.y = p.dodgeVY;

    p.st -= cost;
    p.cd.dodge = CD_MAX.dodge;
    p.invuln = 0.3;
    p.dodgeT = DODGE_DUR;
    p.attackLock = 0;
    p.charging = false;
    p.combo = 0;
    p.comboT = 0;
    setState(p, "dodge");
    EN.Combat.clearStatus(p);

    var perfect = isPerfectDodge(p, enemies);
    if (perfect) {
      p.st = Math.min(p.stMax, p.st + cost + 10);
      p.riposte = 2.2;
      p.invuln = 0.45;
      EN.Combat.slowmo(0.35, 0.42);
      EN.Combat.shakeCamera(2.5, 0.2);
    }
    return { perfect: perfect };
  }

  // "prestes a acertar" = inimigo já avisou e está no fim do aviso, ou já
  // está no meio do bote. Fora dessa janela rolar é só rolar.
  function isPerfectDodge(p, enemies) {
    if (!enemies) return false;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead) continue;
      var d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d > 90) continue;
      if (e.state === "telegraph" && e.telegraph <= 0.3) return true;
      if (e.state === "lunge" || e.state === "gripping" || e.state === "slam") return true;
    }
    return false;
  }

  function useHeal(p) {
    if (p.healCharges <= 0 || p.hp <= 0) return false;
    if (p.hp >= p.hpMax) return false;
    p.healCharges--;
    p.hp = Math.min(p.hpMax, p.hp + 40);
    EN.Combat.clearStatus(p);
    return true;
  }

  function takeDamage(p, dmg, sourceX, sourceY, source) {
    if (p.invuln > 0 || p.hp <= 0) return false;

    // APARO: apanhar dentro da janela do Contra-Ataque anula o golpe,
    // quebra a postura de quem bateu e devolve o contra-ataque. É defesa
    // ativa — exige prever o golpe, não só sobreviver a ele.
    if (p.parryT > 0) {
      p.parryT = 0;
      p.riposte = 2.5;
      p.invuln = 0.4;
      p.st = Math.min(p.stMax, p.st + 14);
      if (source && !source.dead) {
        source.staggerT = Math.max(source.staggerT || 0, 0.7);
        source.poise = 0;
        source.state = "stagger";
      }
      EN.Combat.slowmo(0.32, 0.4);
      EN.Combat.hitstop(0.09);
      EN.Combat.shakeCamera(4, 0.25);
      return { parried: true, damage: 0 };
    }

    // defesa reduz o dano recebido, com piso pra nenhum inimigo virar
    // inofensivo por acúmulo de nível
    var real = Math.max(1, Math.round(dmg - p.def * 0.35));

    // BARREIRA: absorve antes da vida e some quando acaba
    if (p.shield > 0) {
      var absorbed = Math.min(p.shield, real);
      p.shield -= absorbed;
      real -= absorbed;
      if (p.shield <= 0) p.shieldT = 0;
      if (real <= 0) {
        p.invuln = 0.35;
        EN.Combat.shakeCamera(2, 0.15);
        return { shielded: true, damage: 0 };
      }
    }

    p.hp = Math.max(0, p.hp - real);
    p.invuln = 0.5;
    p.charging = false;
    p.combo = 0;
    p.comboT = 0;
    p.attackLock = 0.18;
    setState(p, "hurt");
    if (sourceX !== undefined) EN.Combat.knockback(p, sourceX, sourceY, 190);
    EN.Combat.hitstop(0.05);
    EN.Combat.shakeCamera(4, 0.22);
    if (p.hp <= 0) {
      setState(p, "death");
      EN.Combat.shakeCamera(8, 0.5);
    }
    return { damage: real };
  }

  function draw(ctx, p, camX, camY) {
    var anim = {
      state: p.state,
      t: p.stateT,
      facing: p.facing,
      classId: p.classId,
      chargeProgress: p.chargeT,
      heavySwing: p.heavySwing,
    };
    var x = p.x - camX,
      y = p.y - camY;

    // aura de contra-ataque: mostra que a esquiva perfeita ainda está valendo
    if (p.riposte > 0) {
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(performance.now() / 90) * 0.1;
      ctx.strokeStyle = "#ffd66b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 17, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // barreira arcana: bolha que encolhe conforme absorve
    if (p.shield > 0) {
      var frac = Math.max(0.25, p.shield / 55);
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(performance.now() / 200) * 0.08;
      ctx.strokeStyle = "#a97bf2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y - 12, 20 * frac + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(169,123,242,.12)";
      ctx.fill();
      ctx.restore();
    }

    // janela de aparo aberta: precisa ser inconfundível, a janela é curta
    if (p.parryT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = "#ffd66b";
      ctx.lineWidth = 3;
      var fa = Math.atan2(p.facing.y, p.facing.x);
      ctx.beginPath();
      ctx.arc(x, y - 10, 26, fa - 0.9, fa + 0.9);
      ctx.stroke();
      ctx.restore();
    }

    if (p.invuln > 0 && p.state !== "hurt" && Math.floor(p.invuln * 20) % 2 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      EN.Appearance.draw(ctx, x, y, p.appearance, anim);
      ctx.restore();
    } else {
      EN.Appearance.draw(ctx, x, y, p.appearance, anim);
    }

    if (EN.Combat.hasStatus(p, "enraizado")) {
      ctx.save();
      ctx.strokeStyle = "rgba(58,90,44,.9)";
      ctx.lineWidth = 2.5;
      for (var i = 0; i < 4; i++) {
        var a = (i / 4) * Math.PI * 2 + p.stateT;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 14, y + 8 + Math.sin(a) * 5);
        ctx.lineTo(x + Math.cos(a) * 5, y - 4);
        ctx.stroke();
      }
      ctx.restore();
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
    useSkill2: useSkill2,
    applyTalent: applyTalent,
    canChooseTalent: canChooseTalent,
    dodge: dodge,
    useHeal: useHeal,
    takeDamage: takeDamage,
    draw: draw,
    CD_MAX: CD_MAX,
    COMBO_LEN: COMBO.length,
  };
})();
