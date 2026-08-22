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
      talents: {
        level: 5,
        prompt: "O facão já não basta. Que tipo de guerreiro você vai ser?",
        options: [
          {
            id: "golpe_pesado",
            name: "Golpe Pesado",
            icon: "🪓",
            summary: "Golpe lento e devastador em arco largo. Quebra a postura de quase tudo.",
            cooldown: 4.2,
            staminaCost: 30,
            manaCost: 0,
            damage: 62,
            range: 70,
            type: "melee_heavy",
            animation: "chargeAttack",
          },
          {
            id: "contra_ataque",
            name: "Contra-Ataque",
            icon: "🛡️",
            summary: "Abre uma janela curta de aparo: apanhar dentro dela anula o dano e devolve o golpe.",
            cooldown: 3.4,
            staminaCost: 12,
            manaCost: 0,
            damage: 0,
            range: 0,
            type: "parry",
            animation: "tool",
            parryWindow: 0.5,
          },
        ],
      },
    },
    {
      /*
       * A arte manda na ficha, não o contrário. A planilha desta classe
       * (`mateiro_sheet.png`) é um encapuzado de adaga e magia roxa — um
       * ladino, não um arqueiro. A ficha dizia "Mateiro / Arco Simples /
       * Disparo Preciso" e o jogador via um vulto esfaqueando: a mesma
       * classe contava duas histórias diferentes.
       *
       * O `id` continua "mateiro" de propósito. Ele é chave de save, de
       * planilha (`mateiro_sheet`) e dos testes de contrato de sprite;
       * trocá-lo quebraria personagem de quem já joga em troca de nada
       * que o jogador veja. O que o jogador vê é `name`.
       */
      id: "mateiro",
      name: "Malandro",
      icon: "🗡️",
      tagline: "Ágil • Furtivo • Golpe certo",
      description: "Não troca golpe: escolhe a hora. Chega perto sem ser visto, fere e já não está mais lá.",
      difficulty: "Moderado",
      style: "Furtivo",
      dots: { hp: 3, dmg: 4, def: 2, mobility: 5, magic: 2 },
      baseStats: { hpMax: 105, stMax: 130, mpMax: 40, atk: 12, def: 6, speed: 190 },
      startingEquipment: { id: "peixeira", name: "Peixeira" },
      abilities: [
        {
          id: "faca_arremessada",
          name: "Faca Arremessada",
          icon: "🔪",
          cooldown: 1.6,
          staminaCost: 16,
          manaCost: 0,
          damage: 30,
          range: 380,
          type: "projectile",
          animation: "attack",
        },
      ],
      talents: {
        level: 5,
        prompt: "Uma faca por vez já não segura o mato. Como você vai caçar?",
        options: [
          {
            id: "tiro_multiplo",
            name: "Leque de Facas",
            icon: "🎴",
            summary: "Três facas em leque. Menos dano cada, cobre muito mais espaço.",
            cooldown: 3.0,
            staminaCost: 22,
            manaCost: 0,
            damage: 20,
            range: 360,
            type: "projectile_multi",
            animation: "attack",
            shots: 3,
            spread: 0.26,
          },
          {
            id: "armadilha_rede",
            name: "Rasteira de Cipó",
            icon: "🕸️",
            summary: "Prende no lugar quem estiver perto. Não dá dano — dá tempo.",
            cooldown: 5.0,
            staminaCost: 18,
            manaCost: 0,
            damage: 0,
            range: 90,
            type: "trap",
            animation: "tool",
            rootDuration: 2.2,
          },
        ],
      },
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
      talents: {
        level: 5,
        prompt: "O Encantado responde. Você vai canalizar ou se proteger?",
        options: [
          {
            id: "rajada_elemental",
            name: "Rajada Elemental",
            icon: "🔥",
            summary: "Projétil pesado que queima o alvo por alguns segundos.",
            cooldown: 3.2,
            staminaCost: 0,
            manaCost: 26,
            damage: 44,
            range: 340,
            type: "projectile_magic",
            animation: "attack",
            burn: true,
          },
          {
            id: "barreira_arcana",
            name: "Barreira Arcana",
            icon: "🔮",
            summary: "Converte mana em escudo. Absorve dano até acabar.",
            cooldown: 6.0,
            staminaCost: 0,
            manaCost: 30,
            damage: 0,
            range: 0,
            type: "shield",
            animation: "tool",
            shieldAmount: 55,
            shieldDuration: 9,
          },
        ],
      },
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

  // acha a definição de um talento de nível 5 pelo id, sem o chamador
  // precisar saber de que classe ele é
  function getTalent(classId, talentId) {
    var c = getById(classId);
    if (!c || !c.talents) return null;
    for (var i = 0; i < c.talents.options.length; i++) {
      if (c.talents.options[i].id === talentId) return c.talents.options[i];
    }
    return null;
  }

  function talentsFor(classId) {
    var c = getById(classId);
    return c && c.talents ? c.talents : null;
  }

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
    getTalent: getTalent,
    talentsFor: talentsFor,
    universalAttack: universalAttack,
    meleeHitTest: meleeHitTest,
  };
})();
