window.EN = window.EN || {};

/*
 * Sistema de aparência em camadas + renderizador "pixel doll" procedural.
 *
 * PLACEHOLDER DE ARTE: enquanto não existem spritesheets definitivos, cada
 * camada é desenhada com primitivas de canvas (retângulos/círculos) em vez
 * de sprites. A função draw() abaixo é o único lugar que precisa mudar
 * quando a arte final chegar — ver PLACEHOLDER em ASSETS.md para o
 * contrato de substituição (tamanho de frame, ancoragem, lista de estados).
 */
EN.Appearance = (function () {
  var skins = [
    { id: "clara", name: "Clara", hex: "#e8bf95" },
    { id: "media", name: "Média", hex: "#c98f5e" },
    { id: "morena", name: "Morena", hex: "#9a6238" },
    { id: "escura", name: "Escura", hex: "#5f3a20" },
  ];

  var hairStyles = [
    { id: "curto", name: "Curto" },
    { id: "cacheado", name: "Cacheado" },
    { id: "longo", name: "Longo" },
    { id: "coque", name: "Coque" },
    { id: "raspado", name: "Raspado" },
  ];

  var hairColors = [
    { id: "preto", hex: "#231913" },
    { id: "castanho", hex: "#4a2f1c" },
    { id: "ruivo", hex: "#8a3d22" },
    { id: "grisalho", hex: "#9c9186" },
    { id: "loiro", hex: "#c9a24a" },
  ];

  var outfits = [
    { id: "roca", name: "Roupa de Roça", shirt: "#b5603f", pants: "#4a3a2a" },
    { id: "pescador", name: "Traje de Pescador", shirt: "#3f6e8f", pants: "#3a3a3a" },
    { id: "viajante", name: "Manto de Viajante", shirt: "#5a5033", pants: "#33291c" },
    { id: "festa", name: "Traje de Festa", shirt: "#a8324a", pants: "#20232e" },
  ];

  function defaultAppearance() {
    return {
      name: "",
      skin: "media",
      hair: "curto",
      hairColor: "castanho",
      outfit: "roca",
      hat: null,
    };
  }

  function findHex(list, id, key) {
    key = key || "hex";
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i][key];
    return list[0][key];
  }

  // clareia/escurece uma cor hex em `amt` (positivo clareia, negativo
  // escurece) -- usado pra tirar as camadas do visual "clipart chapado" e
  // dar um sombreamento simples e barato (gradiente + contorno) sem exigir
  // sprite desenhado à mão
  function shade(hex, amt) {
    var num = parseInt(hex.replace("#", ""), 16);
    var r = Math.min(255, Math.max(0, (num >> 16) + amt));
    var g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
    var b = Math.min(255, Math.max(0, (num & 0xff) + amt));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function vGrad(ctx, x0, y0, x1, y1, hex, lightAmt, darkAmt) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, shade(hex, lightAmt));
    g.addColorStop(1, shade(hex, darkAmt));
    return g;
  }

  var OUTLINE = "rgba(24,17,12,.55)";

  function roundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function fillStroke(ctx, fillStyle, lineWidth) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = lineWidth || 1.1;
    ctx.stroke();
  }

  var WEAPON_BY_CLASS = {
    guerreiro: "facao",
    mateiro: "arco",
    encantado: "foco",
  };

  var ATTACK_ART_CLASSES = { guerreiro: 1, mateiro: 1, encantado: 1 };

  // tenta desenhar o estado atual a partir de spritesheets reais; devolve
  // false se não houver arte pro estado (ou pra classe, no caso de
  // ataque) -- quem chamou cai pro desenho procedural nesse caso
  var HEAVY_SWING_DUR = 0.34;
  var DODGE_DUR = 0.28;

  function drawFromAtlas(ctx, state, t, facing, anim) {
    var SA = EN.SpriteAtlas;
    if (state === "idle" && SA.ready("idle")) {
      return SA.drawDirectional(ctx, "idle", 0, 15, facing, t * 0.6, 52);
    }
    if (state === "walk" && SA.ready("walk")) {
      return SA.drawDirectional(ctx, "walk", 0, 15, facing, (t * 8) / (2 * Math.PI), 52);
    }
    if (state === "run" && SA.ready("run")) {
      return SA.drawDirectional(ctx, "run", 0, 15, facing, (t * 13) / (2 * Math.PI), 52);
    }
    // o rolamento dura DODGE_DUR em player.js; a sequência inteira é
    // percorrida uma vez nesse intervalo, sem repetir
    if (state === "dodge" && SA.ready("dodge")) {
      return SA.drawDirectional(ctx, "dodge", 0, 15, facing, Math.min(0.999, t / DODGE_DUR), 52);
    }
    if (state === "hurt" && SA.ready("hurt")) {
      return SA.drawDirectional(ctx, "hurt", 0, 15, facing, t * 2, 52);
    }
    /*
     * Golpe carregado com facão. A arte é do protagonista com o facão, que
     * é a arma do Guerreiro — por isso só ele usa esse conjunto; Mateiro e
     * Encantado continuam com a arte da própria arma, senão o arqueiro
     * sacaria um facão do nada ao carregar.
     *
     * A sequência é dividida em duas metades: a primeira acompanha a
     * CARGA (quanto mais segura, mais o braço sobe) e a segunda toca
     * sozinha na SOLTADA. Sem isso o jogador nunca veria os frames do
     * golpe em si, porque o estado vira "attack" assim que solta.
     */
    if (anim.classId === "guerreiro" && SA.ready("heavy")) {
      if (state === "chargeAttack") {
        var charge = Math.min(1, anim.chargeProgress || 0);
        return SA.drawDirectional(ctx, "heavy", 0, 15, facing, charge * 0.5, 52);
      }
      if (state === "attack" && anim.heavySwing > 0) {
        var swing = 1 - Math.min(1, anim.heavySwing / HEAVY_SWING_DUR);
        return SA.drawDirectional(ctx, "heavy", 0, 15, facing, 0.5 + swing * 0.499, 52);
      }
    }

    if ((state === "attack" || state === "chargeAttack") && anim.classId && ATTACK_ART_CLASSES[anim.classId]) {
      // ataque leve: guerreiro e mateiro usam a mesma arte (facão),
      // só encantado tem animação própria (magia)
      var key = anim.classId === "encantado" ? "attack_encantado" : "attack_guerreiro";
      if (!SA.ready(key)) return false;
      var progress = state === "chargeAttack" ? Math.min(0.999, anim.chargeProgress || 0) : Math.min(0.999, t / 0.3);
      return SA.drawDirectional(ctx, key, 0, 15, facing, progress, 52);
    }
    if (state === "death" && SA.ready("defeat")) {
      return SA.drawSingle(ctx, "defeat", 0, 15, t / 1.0, 52);
    }
    return false;
  }

  // desenha o personagem ancorado nos pés em (cx, cy), em espaço de tela
  function draw(ctx, cx, cy, appearance, anim) {
    var skinHex = findHex(skins, appearance.skin);
    var hairHex = findHex(hairColors, appearance.hairColor);
    var shirt = findHex(outfits, appearance.outfit, "shirt");
    var pants = findHex(outfits, appearance.outfit, "pants");
    var state = anim.state || "idle";
    var t = anim.t || 0;
    var facing = anim.facing || { x: 0, y: 1 };
    var scaleY = 1,
      scaleX = 1,
      lean = 0,
      bob = 0,
      legSwing = 0,
      alpha = 1,
      rot = 0;

    if (state === "idle") bob = Math.sin(t * 2.2) * 1.4;
    else if (state === "walk") {
      bob = Math.abs(Math.sin(t * 8)) * 1.6;
      legSwing = Math.sin(t * 8) * 4.5;
    } else if (state === "run") {
      bob = Math.abs(Math.sin(t * 13)) * 2.4;
      legSwing = Math.sin(t * 13) * 6.5;
      lean = facing.x * 2.2;
    } else if (state === "attack") {
      lean = facing.x * 2;
      bob = -1;
    } else if (state === "chargeAttack") {
      scaleY = 0.94;
      bob = Math.sin(t * 20) * 0.8;
    } else if (state === "dodge") {
      lean = facing.x * 5;
      scaleX = 0.9;
    } else if (state === "hurt") {
      lean = -facing.x * 3;
    } else if (state === "tool") {
      bob = Math.sin(t * 6) * 1.2;
      lean = facing.x * 1.5;
    } else if (state === "death") {
      // a arte real (spritesheet) já mostra a queda frame a frame -- só
      // gira sinteticamente quando caindo de volta pro desenho procedural
      if (!(window.EN.SpriteAtlas && EN.SpriteAtlas.ready("defeat"))) {
        rot = Math.min(1, t / 0.6) * (Math.PI / 2.2);
      }
      alpha = Math.max(0, 1 - t / 1.1);
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx + lean, cy);
    if (rot) ctx.rotate(rot);
    ctx.scale(scaleX, scaleY);

    // sombra (gradiente radial em vez de elipse chapada)
    var shadowG = ctx.createRadialGradient(0, 15, 1, 0, 15, 12);
    shadowG.addColorStop(0, "rgba(0,0,0,.38)");
    shadowG.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadowG;
    ctx.beginPath();
    ctx.ellipse(0, 15, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // arte real (spritesheet) tem prioridade sobre o desenho procedural
    // quando existe pro estado atual -- ver spriteAtlas.js. `dodge`,
    // `tool` ainda não têm arte correspondente, então continuam
    // procedurais mesmo com o atlas carregado.
    if (window.EN.SpriteAtlas && drawFromAtlas(ctx, state, t, facing, anim)) {
      ctx.restore();
      return;
    }

    var y = -bob;

    // pernas (cantos arredondados + sombreado leve)
    roundRect(ctx, -8, y + 1 + legSwing * 0.3, 6, 12, 2);
    fillStroke(ctx, vGrad(ctx, 0, y, 0, y + 13, "#2c2118", 14, -10), 1);
    roundRect(ctx, 2, y + 1 - legSwing * 0.3, 6, 12, 2);
    fillStroke(ctx, vGrad(ctx, 0, y, 0, y + 13, "#2c2118", 6, -16), 1);

    // calça/saia (banda na cintura)
    roundRect(ctx, -9, y - 3, 18, 9, 2.5);
    fillStroke(ctx, vGrad(ctx, 0, y - 3, 0, y + 6, pants, 18, -22));

    // ângulos de balanço dos braços -- ombro esquerdo/direito, em fase
    // oposta às pernas (marcha natural), com poses distintas por estado
    var armL = 0.12,
      armR = -0.12; // idle: leve abertura de repouso
    if (state === "walk" || state === "run") {
      var swing = (legSwing / 4.5) * (state === "run" ? 0.9 : 0.6);
      armL = 0.15 - swing;
      armR = -0.15 - swing;
    } else if (state === "dodge") {
      armL = 0.55;
      armR = -0.55;
    } else if (state === "hurt") {
      armL = 0.9;
      armR = -0.75;
    } else if (state === "death") {
      armL = 1.3;
      armR = -1.1;
    } else if (state === "tool") {
      armR = -0.9 + Math.sin(t * 6) * 0.4;
    }

    // braço "de trás" (o que não segura arma): desenhado antes do tronco
    drawArm(ctx, -1, armL, y, shirt, skinHex);

    // camisa/torso
    roundRect(ctx, -11, y - 16, 22, 15, 3.5);
    fillStroke(ctx, vGrad(ctx, 0, y - 16, 0, y - 1, shirt, 26, -18));
    // dobra central sutil, só pra quebrar a chapa de cor
    ctx.strokeStyle = "rgba(0,0,0,.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y - 15);
    ctx.lineTo(0, y - 2);
    ctx.stroke();

    // braço com arma (desenhado antes da cabeça p/ ficar atrás em idle, na frente durante ataque)
    var weaponId = WEAPON_BY_CLASS[anim.classId] || null;
    if (weaponId && (state === "attack" || state === "chargeAttack")) {
      var swingProgress = state === "chargeAttack" ? anim.chargeProgress || 0 : 1;
      drawArmSwing(ctx, facing, swingProgress, y, shirt, skinHex);
      drawWeaponSwing(ctx, weaponId, facing, swingProgress, y);
    } else {
      drawArm(ctx, 1, armR, y, shirt, skinHex);
    }

    // cabeça (gradiente radial: luz vindo de cima-esquerda)
    var headG = ctx.createRadialGradient(-3, y - 28, 1, 0, y - 25, 11);
    headG.addColorStop(0, shade(skinHex, 30));
    headG.addColorStop(0.6, skinHex);
    headG.addColorStop(1, shade(skinHex, -22));
    ctx.beginPath();
    ctx.arc(0, y - 25, 9.5, 0, Math.PI * 2);
    fillStroke(ctx, headG, 1.2);

    // bochecha/nariz sutil pro rosto não ficar uma bola lisa
    ctx.fillStyle = shade(skinHex, -14);
    ctx.beginPath();
    ctx.ellipse(facing.x >= 0 ? 4 : -4, y - 23, 2.2, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // olhos (indicam direção)
    ctx.fillStyle = "#231913";
    var ex = facing.x * 3.6,
      ey = facing.y * 2.2;
    ctx.beginPath();
    ctx.arc(ex - 1.6, y - 25 + ey, 1.3, 0, Math.PI * 2);
    ctx.arc(ex + 1.6, y - 25 + ey, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.beginPath();
    ctx.arc(ex - 1.9, y - 25.6 + ey, 0.5, 0, Math.PI * 2);
    ctx.arc(ex + 1.3, y - 25.6 + ey, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // cabelo
    drawHair(ctx, appearance.hair, hairHex, y - 25);

    // chapéu (opcional)
    if (appearance.hat === "palha") {
      ctx.beginPath();
      ctx.ellipse(0, y - 33, 15, 4.5, 0, 0, Math.PI * 2);
      fillStroke(ctx, vGrad(ctx, 0, y - 37, 0, y - 29, "#d8b872", 18, -16));
      ctx.beginPath();
      ctx.moveTo(-7, y - 33);
      ctx.lineTo(7, y - 33);
      ctx.lineTo(0, y - 42);
      ctx.closePath();
      fillStroke(ctx, vGrad(ctx, 0, y - 42, 0, y - 33, "#d8b872", 10, -20));
    }

    if (weaponId && state !== "attack" && state !== "chargeAttack") {
      drawWeaponIdle(ctx, weaponId, facing, y);
    }

    // flash de dano
    if (state === "hurt") {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(224,72,58," + Math.max(0, 0.55 - t * 1.8) + ")";
      ctx.fillRect(-14, y - 40, 28, 60);
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.restore();
  }

  function drawHair(ctx, style, hex, headY) {
    var fill = vGrad(ctx, 0, headY - 16, 0, headY - 2, hex, 22, -14);
    if (style === "curto") {
      ctx.beginPath();
      ctx.arc(0, headY - 2, 10, Math.PI, 0);
      fillStroke(ctx, fill, 1);
    } else if (style === "cacheado") {
      for (var i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * 6, headY - 6, 5, 0, Math.PI * 2);
        fillStroke(ctx, fill, 1);
      }
    } else if (style === "longo") {
      ctx.beginPath();
      ctx.arc(0, headY - 2, 10, Math.PI, 0);
      roundRectAppend(ctx, -9, headY - 2, 5, 16, 2);
      roundRectAppend(ctx, 4, headY - 2, 5, 16, 2);
      fillStroke(ctx, fill, 1);
    } else if (style === "coque") {
      ctx.beginPath();
      ctx.arc(0, headY - 2, 9.5, Math.PI, 0);
      fillStroke(ctx, fill, 1);
      ctx.beginPath();
      ctx.arc(0, headY - 14, 4, 0, Math.PI * 2);
      fillStroke(ctx, fill, 1);
    } else if (style === "raspado") {
      ctx.beginPath();
      ctx.arc(0, headY - 2, 9.6, Math.PI * 0.95, Math.PI * 0.05);
      fillStroke(ctx, fill, 1);
    }
  }

  // acrescenta um retângulo arredondado ao path corrente (sem beginPath),
  // pra poder combinar formas num único fill+stroke coerente (ex.: cabelo
  // longo = touca + duas mechas, tudo com o mesmo contorno)
  function roundRectAppend(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.rect(x, y, w, h);
  }

  // braço "de repouso": pende do ombro e balança em torno dele (ângulo em
  // radianos, 0 = pra baixo). side: -1 esquerdo, 1 direito.
  function drawArm(ctx, side, angle, y, sleeveHex, skinHex) {
    ctx.save();
    ctx.translate(side * 9.5, y - 14);
    ctx.rotate(angle * side);
    roundRect(ctx, -2.6, 0, 5.2, 9, 2.4);
    fillStroke(ctx, vGrad(ctx, 0, 0, 0, 9, sleeveHex, 10, -20), 0.9);
    ctx.beginPath();
    ctx.arc(0, 10.5, 2.6, 0, Math.PI * 2);
    fillStroke(ctx, shade(skinHex, -6), 0.9);
    ctx.restore();
  }

  // braço esticado na direção do golpe, acompanhando o mesmo ângulo da
  // arma (ver drawWeaponSwing) -- é o que faltava pra "segurar" a arma em
  // vez dela flutuar sozinha
  function drawArmSwing(ctx, facing, progress, y, sleeveHex, skinHex) {
    var fa = Math.atan2(facing.y, facing.x);
    ctx.save();
    ctx.translate(0, y - 8);
    ctx.rotate(fa - 0.9 + progress * 1.7);
    roundRect(ctx, 0, -2.6, 13, 5.2, 2.4);
    fillStroke(ctx, vGrad(ctx, 0, -2.6, 0, 2.6, sleeveHex, 12, -18), 0.9);
    ctx.beginPath();
    ctx.arc(14, 0, 2.8, 0, Math.PI * 2);
    fillStroke(ctx, shade(skinHex, -6), 0.9);
    ctx.restore();
  }

  function drawWeaponIdle(ctx, weaponId, facing, y) {
    ctx.save();
    ctx.translate(9, y - 8);
    drawWeaponShape(ctx, weaponId, 0);
    ctx.restore();
  }

  function drawWeaponSwing(ctx, weaponId, facing, progress, y) {
    var fa = Math.atan2(facing.y, facing.x);
    ctx.save();
    ctx.translate(0, y - 8);
    ctx.rotate(fa - 0.9 + progress * 1.7);
    ctx.translate(16, 0);
    drawWeaponShape(ctx, weaponId, progress);
    ctx.restore();
  }

  function drawWeaponShape(ctx, weaponId, glow) {
    if (weaponId === "facao") {
      ctx.strokeStyle = "#3a3a3a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(11, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(2, -2.5);
      ctx.lineTo(14, 0);
      ctx.lineTo(2, 2.5);
      ctx.closePath();
      fillStroke(ctx, vGrad(ctx, 2, -2.5, 2, 2.5, "#cfd6da", 20, -30), 0.8);
    } else if (weaponId === "arco") {
      ctx.strokeStyle = "#6b4a2a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 10, -1.1, 1.1);
      ctx.stroke();
      ctx.strokeStyle = "#cfc8b0";
      ctx.beginPath();
      ctx.moveTo(4.2, -8.5);
      ctx.lineTo(4.2, 8.5);
      ctx.stroke();
    } else if (weaponId === "foco") {
      ctx.strokeStyle = "#6b4a2a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(10, -4);
      ctx.stroke();
      if (glow > 0) {
        ctx.fillStyle = "rgba(242,183,5," + (0.5 + glow * 0.5) + ")";
        ctx.beginPath();
        ctx.arc(11, -6, 3 + glow * 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#f2b705";
        ctx.beginPath();
        ctx.arc(11, -6, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return {
    skins: skins,
    hairStyles: hairStyles,
    hairColors: hairColors,
    outfits: outfits,
    defaultAppearance: defaultAppearance,
    draw: draw,
  };
})();
