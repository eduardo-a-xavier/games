window.EN = window.EN || {};

/*
 * Roça — o sistema que dá ao jogo um motivo pra amanhã.
 *
 * O combate resolve o "agora": você entra, luta, sai. Sozinho, ele
 * termina quando a história termina. A roça faz o oposto: você planta
 * hoje uma coisa que só existe depois de dormir, e sair do jogo com um
 * canteiro no meio do caminho é diferente de sair com a tela limpa.
 *
 * Regras de desenho do sistema, e por que cada uma:
 *
 *  - CRESCE POR DIA DE JOGO, não por tempo real. Dormir na cama de casa é
 *    o que faz a planta crescer, então o loop é fechado dentro do jogo e
 *    não pune quem some por uma semana.
 *  - SEMENTE CUSTA VINTÉM. Sem custo não é decisão, é botão. Com custo,
 *    plantar café (caro, lento, paga muito) em vez de milho (barato,
 *    rápido, paga pouco) vira uma aposta sobre quanto você vai jogar.
 *  - PODE MURCHAR. Deixar maduro por muitos dias estraga. É o que
 *    diferencia "voltar" de "deixar rodando" — e é honesto: avisa antes,
 *    no HUD e no minimapa.
 */
EN.Farm = (function () {
  var FIELD = { x: 700, y: 760, w: 300, h: 180 };
  var COLS = 4,
    ROWS = 3;
  /*
   * A roça NÃO começa inteira. Seis canteiros abertos, doze possíveis —
   * os outros o Zé ara por Vintém (ver shop.js). Isso dá ao dinheiro um
   * destino que devolve capacidade em vez de poder, e transforma "encher
   * a roça" numa meta de dias em vez de um botão.
   */
  var BASE_PLOTS = 6;

  function unlocked() {
    var n = Number(EN.State.data.world.farmPlots);
    if (!Number.isFinite(n)) n = BASE_PLOTS;
    return Math.max(BASE_PLOTS, Math.min(COLS * ROWS, Math.floor(n)));
  }

  function unlock() {
    var w = EN.State.data.world;
    w.farmPlots = Math.min(COLS * ROWS, unlocked() + 1);
    EN.State.persist();
    return w.farmPlots;
  }

  function isOpen(i) {
    return i < unlocked();
  }

  /*
   * As três culturas cobrem três perfis de jogador de propósito: quem
   * entra e sai rápido (milho), quem joga uma sessão longa (mandioca) e
   * quem planeja vários dias (café).
   */
  var CROPS = {
    milho: { name: "Milho", icon: "🌽", cost: 6, days: 1, pay: 14, rot: 4, color: "#e0c04a" },
    mandioca: { name: "Mandioca", icon: "🥔", cost: 12, days: 2, pay: 34, rot: 5, color: "#d8cba8" },
    cafe: { name: "Café", icon: "☕", cost: 26, days: 4, pay: 96, rot: 7, color: "#a5432f" },
  };
  var ORDER = ["milho", "mandioca", "cafe"];

  function state() {
    var w = EN.State.data.world;
    if (!Array.isArray(w.farm)) w.farm = [];
    // canteiros são posicionais: o índice É a identidade do canteiro
    while (w.farm.length < COLS * ROWS) w.farm.push(null);
    w.farm.length = COLS * ROWS;
    return w.farm;
  }

  function plotPos(i) {
    var col = i % COLS,
      row = Math.floor(i / COLS);
    return {
      x: FIELD.x + 44 + col * ((FIELD.w - 88) / (COLS - 1)),
      y: FIELD.y + 40 + row * ((FIELD.h - 80) / (ROWS - 1)),
    };
  }

  /*
   * Estágio de um canteiro. Devolve sempre um objeto, mesmo vazio, pra
   * quem chama nunca precisar checar null antes de ler `.stage`.
   */
  // "falta 1 dia" / "faltam 2 dias" — o verbo concorda, não só o
  // substantivo. Um jogo em português errado parece amador antes de
  // qualquer outra coisa.
  function falta(n) {
    return n > 1 ? "faltam " + n + " dias" : "falta 1 dia";
  }

  function stageOf(plot, index) {
    if (index !== undefined && !isOpen(index)) return { stage: "fechado" };
    if (!plot || !CROPS[plot.crop]) return { stage: "vazio" };
    var def = CROPS[plot.crop];
    var age = EN.State.data.world.day - plot.day;
    if (age >= def.days + def.rot) return { stage: "murcho", def: def, age: age };
    if (age >= def.days) return { stage: "maduro", def: def, age: age, sobra: def.days + def.rot - age };
    return { stage: "crescendo", def: def, age: age, faltam: def.days - age, pct: age / def.days };
  }

  function readyCount() {
    var n = 0;
    state().forEach(function (p, i) {
      if (stageOf(p, i).stage === "maduro") n++;
    });
    return n;
  }

  function emptyCount() {
    var n = 0;
    state().forEach(function (p, i) {
      var s = stageOf(p, i).stage;
      if (s === "vazio" || s === "murcho") n++;
    });
    return n;
  }

  // ---------------------------------------------------------------
  // ações
  // ---------------------------------------------------------------
  function plant(index, cropId) {
    var def = CROPS[cropId];
    if (!def) return { ok: false, msg: "Semente desconhecida." };
    var w = EN.State.data.world;
    if (w.vintem < def.cost) return { ok: false, msg: "Faltam " + (def.cost - w.vintem) + " Vintém pra essa semente." };
    var farm = state();
    var s = stageOf(farm[index], index).stage;
    if (s === "fechado") return { ok: false, msg: "Esse pedaço ainda não foi arado. Fale com o Zé." };
    if (s !== "vazio" && s !== "murcho") return { ok: false, msg: "Esse canteiro já está ocupado." };
    w.vintem -= def.cost;
    farm[index] = { crop: cropId, day: w.day };
    EN.State.persist();
    return { ok: true, msg: def.icon + " " + def.name + " plantado. Colhe em " + def.days + (def.days > 1 ? " dias." : " dia.") };
  }

  function harvest(index) {
    var farm = state();
    var st = stageOf(farm[index], index);
    var plotCrop = farm[index] && farm[index].crop;
    if (st.stage === "vazio") return { ok: false, msg: "Canteiro vazio." };
    if (st.stage === "crescendo") {
      return { ok: false, msg: "Ainda verde — " + falta(st.faltam) + "." };
    }
    farm[index] = null;
    if (st.stage === "murcho") {
      EN.State.persist();
      return { ok: false, msg: "Passou do ponto. Perdeu-se." };
    }
    /*
     * A colheita rende Vintém E um pé do que foi plantado. O Vintém é o
     * que paga a próxima semente; o pé é o que alimenta o companheiro.
     * Sem esse segundo, "alimente com o que você planta" seria só uma
     * frase bonita sem item por trás.
     */
    var pay = st.def.pay;
    var inv = EN.State.data.world.inventory;
    if (!inv.colheita || typeof inv.colheita !== "object") inv.colheita = {};
    inv.colheita[plotCrop] = (inv.colheita[plotCrop] || 0) + 1;
    EN.State.data.world.vintem += pay;
    EN.State.persist();
    return { ok: true, pay: pay, crop: plotCrop, msg: st.def.icon + " Colhido: +" + pay + " Vintém e 1 " + st.def.name.toLowerCase() + "." };
  }

  // limpa canteiro murcho sem colher nada, pra poder replantar
  function clear(index) {
    var farm = state();
    if (stageOf(farm[index], index).stage === "murcho") {
      farm[index] = null;
      EN.State.persist();
      return true;
    }
    return false;
  }

  /*
   * Canteiro mais próximo do jogador, dentro de um alcance curto. É o que
   * transforma a roça inteira num único ponto de interação sem precisar
   * de 12 objetos registrados no Interactable.
   */
  function nearestPlot(x, y, range) {
    var best = -1,
      bestD = range || 46;
    for (var i = 0; i < COLS * ROWS; i++) {
      var p = plotPos(i);
      var d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  // ---------------------------------------------------------------
  // desenho (no mundo, por cima do fundo pré-renderizado)
  // ---------------------------------------------------------------
  function draw(ctx, camX, camY, time) {
    var farm = state();
    for (var i = 0; i < farm.length; i++) {
      var st = stageOf(farm[i], i);
      var p = plotPos(i);
      var x = p.x - camX,
        y = p.y - camY;

      // canteiro ainda não arado: mato por cima da terra, pra ficar
      // visível que ali CABE alguma coisa que ainda não é sua
      if (st.stage === "fechado") {
        ctx.strokeStyle = "rgba(70,96,58,.75)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        for (var wd = -2; wd <= 2; wd++) {
          ctx.beginPath();
          ctx.moveTo(x + wd * 5, y + 5);
          ctx.quadraticCurveTo(x + wd * 6, y - 2, x + wd * 4 + Math.sin(time + i + wd) * 2, y - 9);
          ctx.stroke();
        }
        continue;
      }
      if (st.stage === "vazio") continue;

      if (st.stage === "murcho") {
        ctx.strokeStyle = "rgba(120,100,70,.8)";
        ctx.lineWidth = 2;
        for (var m = -1; m <= 1; m++) {
          ctx.beginPath();
          ctx.moveTo(x + m * 5, y + 4);
          ctx.lineTo(x + m * 7, y - 6);
          ctx.stroke();
        }
        continue;
      }

      var def = st.def;
      var grow = st.stage === "maduro" ? 1 : 0.25 + st.pct * 0.65;
      var h = 6 + grow * 16;
      var sway = Math.sin(time * 1.6 + i) * grow * 1.6;

      // talos
      ctx.strokeStyle = "#3f7a34";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (var s = -1; s <= 1; s++) {
        ctx.beginPath();
        ctx.moveTo(x + s * 4, y + 4);
        ctx.quadraticCurveTo(x + s * 4 + sway, y + 4 - h * 0.6, x + s * 3 + sway * 1.4, y + 4 - h);
        ctx.stroke();
      }

      if (st.stage === "maduro") {
        // fruto + brilho: o "pode colher" tem que ser visível de longe
        var pulse = 0.75 + Math.abs(Math.sin(time * 2.4 + i)) * 0.25;
        var g = ctx.createRadialGradient(x, y - h * 0.7, 1, x, y - h * 0.7, 18);
        g.addColorStop(0, "rgba(242,183,5," + 0.3 * pulse + ")");
        g.addColorStop(1, "rgba(242,183,5,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y - h * 0.7, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = def.color;
        for (var f = -1; f <= 1; f += 2) {
          ctx.beginPath();
          ctx.ellipse(x + f * 4 + sway, y + 4 - h * 0.75, 3.4, 4.4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = "rgba(30,24,10,.5)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // aviso de que vai passar do ponto
        if (st.sobra <= 1) {
          ctx.fillStyle = "#e0483a";
          ctx.font = "bold 9px 'Silkscreen', monospace";
          ctx.textAlign = "center";
          ctx.fillText("!", x, y - h - 6);
        }
      }
    }
  }

  return {
    CROPS: CROPS,
    ORDER: ORDER,
    FIELD: FIELD,
    PLOTS: COLS * ROWS,
    BASE_PLOTS: BASE_PLOTS,
    unlocked: unlocked,
    unlock: unlock,
    isOpen: isOpen,
    state: state,
    plotPos: plotPos,
    stageOf: stageOf,
    readyCount: readyCount,
    emptyCount: emptyCount,
    nearestPlot: nearestPlot,
    falta: falta,
    held: function (cropId) {
      var c = EN.State.data.world.inventory.colheita;
      return (c && c[cropId]) || 0;
    },
    consume: function (cropId) {
      var c = EN.State.data.world.inventory.colheita;
      if (!c || !c[cropId]) return false;
      c[cropId]--;
      if (!c[cropId]) delete c[cropId];
      return true;
    },
    plant: plant,
    harvest: harvest,
    clear: clear,
    draw: draw,
  };
})();
