window.EN = window.EN || {};

/*
 * Arquitetura de classes — dado-orientada, sem if/else por classe.
 *
 * ClassDefinition: id, name, icon, tagline, description, difficulty, style,
 *   dots (1-5 para as barras da tela de seleção), baseStats reais,
 *   startingEquipment, abilities: [AbilityDefinition]
 *
 * AbilityDefinition: id, name, icon, cooldown, staminaCost, manaCost,
 *   damage, range, type ('melee' | 'melee_heavy' | 'projectile' | 'projectile_magic'),
 *   animation
 *
 * Novas classes (Benzedeiro, Alquimista, Malandro, ...) só precisam de uma
 * nova entrada em `list` — nenhum outro arquivo precisa saber o nome delas.
 * O combate resolve tudo por `ability.type`, ver executeAbility().
 */
EN.Classes = (function () {
  var list = [
    {
      id: "guerreiro",
      name: "Guerreiro",
      icon: "⚔️",
      tagline: "Corpo a corpo • Resistente • Direto",
      description: "Enfrenta o perigo de frente, aguenta o tranco e retribui com força.",
      difficulty: "Fácil de aprender",
      style: "Corpo a corpo",
      dots: { hp: 5, dmg: 4, def: 4, mobility: 2, magic: 1 },
      baseStats: { hpMax: 140, stMax: 110, mpMax: 30, atk: 15, def: 10, speed: 155 },
      startingEquipment: { id: "facao", name: "Facão Simples" },
      abilities: [
        {
          id: "golpe_poderoso",
          name: "Golpe Poderoso",
          icon: "💥",
          cooldown: 2.6,
          staminaCost: 26,
          manaCost: 0,
          damage: 40,
          range: 58,
          type: "melee_heavy",
          animation: "chargeAttack",
        },
      ],
    },
    {
      id: "mateiro",
      name: "Mateiro",
      icon: "🏹",
      tagline: "Ágil • Distância • Exploração",
      description: "Lê o terreno, mantém distância e pune com precisão antes de ser alcançado.",
      difficulty: "Moderado",
      style: "À distância",
      dots: { hp: 3, dmg: 4, def: 2, mobility: 5, magic: 1 },
      baseStats: { hpMax: 105, stMax: 130, mpMax: 30, atk: 12, def: 6, speed: 190 },
      startingEquipment: { id: "arco", name: "Arco Simples" },
      abilities: [
        {
          id: "disparo_preciso",
          name: "Disparo Preciso",
          icon: "🎯",
          cooldown: 1.6,
          staminaCost: 16,
          manaCost: 0,
          damage: 30,
          range: 380,
          type: "projectile",
          animation: "attack",
        },
      ],
    },
    {
      id: "encantado",
      name: "Encantado",
      icon: "✨",
      tagline: "Místico • Área • Frágil",
      description: "Canaliza a energia do Encantado — poderoso à distância, vulnerável de perto.",
      difficulty: "Avançado",
      style: "Magia",
      dots: { hp: 2, dmg: 4, def: 2, mobility: 3, magic: 5 },
      baseStats: { hpMax: 95, stMax: 100, mpMax: 90, atk: 10, def: 5, speed: 165 },
      startingEquipment: { id: "foco", name: "Foco Encantado" },
      abilities: [
        {
          id: "rajada_encantada",
          name: "Rajada Encantada",
          icon: "✨",
          cooldown: 1.3,
          staminaCost: 0,
          manaCost: 16,
          damage: 26,
          range: 340,
          type: "projectile_magic",
          animation: "attack",
        },
      ],
    },
  ];

  // usado enquanto o jogador ainda não passou pelo Despertar
  var classlessDefaults = {
    id: null,
    name: "Andarilho",
    baseStats: { hpMax: 90, stMax: 100, mpMax: 20, atk: 9, def: 4, speed: 160 },
    startingEquipment: { id: null, name: "Mãos vazias" },
  };

  // ataque universal (tap = normal, hold = carregado) — existe mesmo sem classe
  var universalAttack = {
    basic: { id: "ataque_basico", cooldown: 0.32, staminaCost: 0, damage: 11, range: 46, type: "melee", animation: "attack" },
    heavy: { id: "ataque_carregado", cooldown: 0.9, staminaCost: 18, damage: 24, range: 52, type: "melee_heavy", animation: "chargeAttack" },
  };

  function getById(id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // teste geométrico puro de cone corpo-a-corpo — devolve os alvos atingidos
  function meleeHitTest(px, py, facing, range, halfAngle, targets) {
    var fa = Math.atan2(facing.y, facing.x);
    var hits = [];
    for (var i = 0; i < targets.length; i++) {
      var e = targets[i];
      if (e.dead) continue;
      var dx = e.x - px,
        dy = e.y - py,
        d = Math.hypot(dx, dy);
      if (d > range) continue;
      var ea = Math.atan2(dy, dx);
      var diff = Math.atan2(Math.sin(ea - fa), Math.cos(ea - fa));
      if (Math.abs(diff) <= halfAngle) hits.push(e);
    }
    return hits;
  }

  return {
    list: list,
    getById: getById,
    classlessDefaults: classlessDefaults,
    universalAttack: universalAttack,
    meleeHitTest: meleeHitTest,
  };
})();
