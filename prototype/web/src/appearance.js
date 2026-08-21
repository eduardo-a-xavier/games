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

  var WEAPON_BY_CLASS = {
    guerreiro: "facao",
    mateiro: "arco",
    encantado: "foco",
  };

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
      rot = Math.min(1, t / 0.6) * (Math.PI / 2.2);
      alpha = Math.max(0, 1 - t / 1.1);
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx + lean, cy);
    if (rot) ctx.rotate(rot);
    ctx.scale(scaleX, scaleY);

    // sombra
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.beginPath();
    ctx.ellipse(0, 15, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    var y = -bob;

    // pernas
    ctx.fillStyle = "#2c2118";
    ctx.fillRect(-8, y + 1 + legSwing * 0.3, 6, 12);
    ctx.fillRect(2, y + 1 - legSwing * 0.3, 6, 12);
    ctx.fillStyle = pants;
    ctx.fillRect(-9, y - 3, 18, 9);

    // camisa/torso
    ctx.fillStyle = shirt;
    ctx.fillRect(-11, y - 16, 22, 15);

    // braço com arma (desenhado antes da cabeça p/ ficar atrás em idle, na frente durante ataque)
    var weaponId = WEAPON_BY_CLASS[anim.classId] || null;
    if (weaponId && (state === "attack" || state === "chargeAttack")) {
      drawWeaponSwing(ctx, weaponId, facing, state === "chargeAttack" ? anim.chargeProgress || 0 : 1, y);
    }

    // cabeça
    ctx.fillStyle = skinHex;
    ctx.beginPath();
    ctx.arc(0, y - 25, 9.5, 0, Math.PI * 2);
    ctx.fill();

    // olhos (indicam direção)
    ctx.fillStyle = "#231913";
    var ex = facing.x * 3.4,
      ey = facing.y * 2;
    ctx.beginPath();
    ctx.arc(ex, y - 25 + ey, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // cabelo
    drawHair(ctx, appearance.hair, hairHex, y - 25);

    // chapéu (opcional)
    if (appearance.hat === "palha") {
      ctx.fillStyle = "#d8b872";
      ctx.beginPath();
      ctx.ellipse(0, y - 33, 15, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-7, y - 33);
      ctx.lineTo(7, y - 33);
      ctx.lineTo(0, y - 42);
      ctx.closePath();
      ctx.fill();
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
    ctx.fillStyle = hex;
    if (style === "curto") {
      ctx.beginPath();
      ctx.arc(0, headY - 2, 10, Math.PI, 0);
      ctx.fill();
    } else if (style === "cacheado") {
      for (var i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * 6, headY - 6, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (style === "longo") {
      ctx.beginPath();
      ctx.arc(0, headY - 2, 10, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-9, headY - 2, 5, 16);
      ctx.fillRect(4, headY - 2, 5, 16);
    } else if (style === "coque") {
      ctx.beginPath();
      ctx.arc(0, headY - 2, 9.5, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, headY - 14, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === "raspado") {
      ctx.beginPath();
      ctx.arc(0, headY - 2, 9.6, Math.PI * 0.95, Math.PI * 0.05);
      ctx.fill();
    }
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
      ctx.fillStyle = "#cfd6da";
      ctx.beginPath();
      ctx.moveTo(2, -2.5);
      ctx.lineTo(14, 0);
      ctx.lineTo(2, 2.5);
      ctx.closePath();
      ctx.fill();
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
