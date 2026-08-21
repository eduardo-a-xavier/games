window.EN = window.EN || {};

/*
 * Tela "Escolha seu Caminho" (evento O Despertar). Lê inteiramente de
 * EN.Classes.list — adicionar uma 4ª classe no futuro não exige tocar
 * neste arquivo, só uma nova entrada em classes.js.
 */
EN.ClassSelect = (function () {
  var selectedId = null;
  var appearance = null;
  var onChosen = null;
  var wired = false;

  function open(appearanceRef, chosenCallback) {
    appearance = appearanceRef;
    onChosen = chosenCallback;
    selectedId = null;
    buildCards();
    document.getElementById("cs-detail").classList.remove("visible");
    document.getElementById("screen-classselect").classList.add("active");
    wireOnce();
  }

  function close() {
    document.getElementById("screen-classselect").classList.remove("active");
  }

  function buildCards() {
    var wrap = document.getElementById("cs-cards");
    wrap.innerHTML = "";
    EN.Classes.list.forEach(function (cls) {
      var card = document.createElement("button");
      card.className = "class-card";
      card.type = "button";
      card.innerHTML =
        '<div class="cc-icon">' +
        cls.icon +
        '</div><div class="cc-name">' +
        cls.name +
        '</div><div class="cc-tag">' +
        cls.tagline +
        "</div>";
      card.addEventListener("click", function () {
        selectedId = cls.id;
        wrap.querySelectorAll(".class-card").forEach(function (c) {
          c.classList.remove("selected");
        });
        card.classList.add("selected");
        showDetail(cls);
      });
      wrap.appendChild(card);
    });
  }

  function dots(value, max) {
    max = max || 5;
    var s = "";
    for (var i = 0; i < max; i++) s += i < value ? "●" : "○";
    return s;
  }

  function showDetail(cls) {
    var d = document.getElementById("cs-detail");
    d.classList.add("visible");
    document.getElementById("cs-detail-icon").textContent = cls.icon;
    document.getElementById("cs-detail-name").textContent = cls.name;
    document.getElementById("cs-detail-tagline").textContent = cls.tagline;
    document.getElementById("cs-detail-desc").textContent = cls.description;
    document.getElementById("cs-detail-diff").textContent = cls.difficulty;
    document.getElementById("cs-detail-style").textContent = cls.style;

    var rows = [
      ["Vida", cls.dots.hp],
      ["Dano", cls.dots.dmg],
      ["Defesa", cls.dots.def],
      ["Mobilidade", cls.dots.mobility],
      ["Magia", cls.dots.magic],
    ];
    var statsEl = document.getElementById("cs-detail-stats");
    statsEl.innerHTML = "";
    rows.forEach(function (r) {
      var row = document.createElement("div");
      row.className = "stat-row";
      row.innerHTML = '<span class="stat-label">' + r[0] + '</span><span class="stat-dots">' + dots(r[1]) + "</span>";
      statsEl.appendChild(row);
    });

    document.getElementById("cs-detail-weapon").textContent = cls.startingEquipment.name;
    document.getElementById("cs-detail-ability-icon").textContent = cls.abilities[0].icon;
    document.getElementById("cs-detail-ability-name").textContent = cls.abilities[0].name;
  }

  function wireOnce() {
    if (wired) return;
    wired = true;
    document.getElementById("cs-test").addEventListener("click", function () {
      if (!selectedId) return;
      EN.Arena.open(appearance, selectedId, function () {
        document.getElementById("screen-classselect").classList.add("active");
      });
    });
    document.getElementById("cs-choose").addEventListener("click", function () {
      if (!selectedId) return;
      close();
      onChosen(selectedId);
    });
  }

  return { open: open };
})();
