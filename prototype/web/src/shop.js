window.EN = window.EN || {};

/*
 * Venda do Zé — o ralo do Vintém.
 *
 * Até agora o jogo só ENCHIA a carteira: inimigo dropa, baú dá, colheita
 * paga, visita diária premia. A única saída era semente. Economia sem
 * ralo não é economia: o número sobe pra sempre, para de significar
 * alguma coisa, e o jogador para de reparar nele.
 *
 * O que a venda faz, e por que cada item existe:
 *
 *  - PREPARO DE ERVAS: o recurso que decide luta difícil. Caro de
 *    propósito — se cura fosse barata, morrer deixaria de doer.
 *  - PACOTE DE SEMENTES: desconto por volume. Recompensa quem já
 *    entendeu o loop da roça em vez de dar vantagem a quem chegou agora.
 *  - CANTEIRO NOVO: o melhor sink que existe aqui, porque devolve em
 *    CAPACIDADE, não em poder. O preço sobe a cada canteiro, então
 *    expandir a roça é uma meta longa em vez de um botão.
 *  - BOLSA MAIOR: aumenta quantas curas cabem. Conveniência, não dano.
 *
 * Nada aqui vende ATAQUE, DEFESA ou VIDA. A regra é a mesma do
 * companheiro e da visita diária: dinheiro compra conveniência e
 * capacidade, nunca poder de combate. É o que mantém o jogo justo se um
 * dia existir compra de verdade.
 */
EN.Shop = (function () {
  var els = null;

  function bagMax() {
    var w = EN.State.data.world;
    return 3 + Math.floor(finite(w.bagLevel, 0, 0, 5));
  }

  function finite(v, fb, min, max) {
    var n = Number(v);
    if (!Number.isFinite(n)) return fb;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return n;
  }

  /*
   * Catálogo. `price` pode ser função pra preço que escala (canteiro e
   * bolsa ficam mais caros a cada compra), e `avail` esconde o que já
   * não faz sentido oferecer.
   */
  var ITEMS = [
    {
      id: "cura",
      icon: "🧪",
      name: "Preparo de ervas",
      desc: "Recupera vida na hora. Não dá pra carregar mais que a bolsa aguenta.",
      price: function () { return 25; },
      avail: function (p) { return p.healCharges < bagMax(); },
      why: function (p) { return "Bolsa cheia (" + bagMax() + ")"; },
      buy: function (p) {
        p.healCharges++;
        EN.State.data.world.inventory.curas = p.healCharges;
        return "🧪 Preparo comprado. Você leva " + p.healCharges + ".";
      },
    },
    {
      id: "sementes",
      icon: "🌰",
      name: "Pacote de sementes",
      desc: "Três milhos pelo preço de dois. Vale pra quem já planta.",
      price: function () { return 12; },
      avail: function () { return true; },
      buy: function () {
        var inv = EN.State.data.world.inventory;
        if (!inv.colheita || typeof inv.colheita !== "object") inv.colheita = {};
        inv.colheita.milho = (inv.colheita.milho || 0) + 3;
        return "🌰 Três milhos na sacola. Dá pra plantar ou alimentar o Saci.";
      },
    },
    {
      id: "canteiro",
      icon: "🌱",
      name: "Abrir canteiro",
      desc: "O Zé ara mais um pedaço da sua roça. Cada um novo sai mais caro.",
      // 40, 70, 110, 160, 220, 290 — a curva é o que faz a roça cheia
      // ser uma meta de dias, não de uma tarde
      price: function () {
        var n = EN.Farm.unlocked() - EN.Farm.BASE_PLOTS;
        return 40 + n * 30 + n * n * 5;
      },
      avail: function () { return EN.Farm.unlocked() < EN.Farm.PLOTS; },
      why: function () { return "A roça já está inteira aberta"; },
      buy: function () {
        var n = EN.Farm.unlock();
        return "🌱 Canteiro aberto. Agora são " + n + ".";
      },
    },
    {
      id: "bolsa",
      icon: "🎒",
      name: "Bolsa maior",
      desc: "Cabe um preparo a mais. Não cura nada sozinha — só deixa você sair de casa com mais.",
      price: function () {
        var n = finite(EN.State.data.world.bagLevel, 0, 0, 5);
        return 60 + n * 55;
      },
      avail: function () { return finite(EN.State.data.world.bagLevel, 0, 0, 5) < 5; },
      why: function () { return "Bolsa no tamanho máximo"; },
      buy: function () {
        var w = EN.State.data.world;
        w.bagLevel = finite(w.bagLevel, 0, 0, 5) + 1;
        return "🎒 Agora cabem " + bagMax() + " preparos.";
      },
    },
  ];

  // ---------------------------------------------------------------
  function open(player, toast) {
    if (!els) {
      els = {
        box: document.getElementById("screen-shop"),
        rows: document.getElementById("shop-rows"),
        purse: document.getElementById("shop-purse"),
        close: document.getElementById("shop-close"),
      };
      els.close.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        close();
      });
      els.box.addEventListener("pointerdown", function (e) {
        if (e.target === els.box) close();
      });
    }
    els.box.classList.add("open");
    EN.Main.setPaused(true);
    EN.Audio.play("ui");
    render(player, toast);
  }

  function close() {
    if (!els) return;
    els.box.classList.remove("open");
    EN.Main.setPaused(false);
  }

  function render(player, toast) {
    var vintem = EN.State.data.world.vintem;
    els.purse.textContent = vintem + " Vintém";

    els.rows.innerHTML = ITEMS.map(function (it) {
      var disponivel = it.avail(player);
      var preco = it.price();
      var podePagar = vintem >= preco;
      var bloqueio = !disponivel ? it.why(player) : !podePagar ? "Faltam " + (preco - vintem) : "";
      return (
        '<div class="shop-row' + (disponivel && podePagar ? "" : " off") + '" data-item="' + it.id + '">' +
        '<span class="shop-icon">' + it.icon + "</span>" +
        '<div class="shop-text"><b>' + it.name + "</b><span>" + it.desc + "</span></div>" +
        (bloqueio
          ? '<span class="shop-block">' + bloqueio + "</span>"
          : '<button class="shop-buy">' + preco + " 🪙</button>") +
        "</div>"
      );
    }).join("");

    Array.prototype.forEach.call(els.rows.querySelectorAll(".shop-buy"), function (btn) {
      btn.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        var id = btn.closest(".shop-row").dataset.item;
        var it = ITEMS.filter(function (x) { return x.id === id; })[0];
        if (!it) return;
        var preco = it.price();
        var w = EN.State.data.world;
        // revalida na hora da compra: o preço do canteiro sobe a cada
        // clique, e a tela pode estar mostrando o valor anterior
        if (w.vintem < preco || !it.avail(player)) return;
        w.vintem -= preco;
        var msg = it.buy(player);
        EN.State.persist();
        EN.Audio.play("coin");
        if (toast) toast(msg);
        render(player, toast);
      });
    });
  }

  return { open: open, close: close, bagMax: bagMax };
})();
