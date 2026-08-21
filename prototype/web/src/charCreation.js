window.EN = window.EN || {};

/*
 * Tela de criação de personagem: nome, tom de pele, cabelo, cor do cabelo,
 * roupa inicial, com preview ao vivo. As opções vêm inteiramente de
 * appearance.js — esta tela só monta os controles a partir dessas listas,
 * então adicionar uma nova opção de cabelo/roupa no futuro não exige tocar
 * neste arquivo.
 */
EN.CharCreation = (function () {
  var appearance;
  var onDone;
  var previewCanvas, previewCtx;
  var animT = 0,
    rafId = null;

  function open(doneCallback) {
    onDone = doneCallback;
    appearance = EN.Appearance.defaultAppearance();
    var saved = EN.State.data.profile.appearance;
    if (saved) appearance = Object.assign(appearance, saved);
    document.getElementById("screen-game").classList.remove("active");
    document.getElementById("screen-charcreate").classList.add("active");
    buildSwatches();
    wireOnce();
    document.getElementById("cc-name").value = EN.State.data.profile.name || "";
    previewCanvas = document.getElementById("cc-preview");
    previewCtx = previewCanvas.getContext("2d");
    startPreviewLoop();
    validate();
  }

  function close() {
    document.getElementById("screen-charcreate").classList.remove("active");
    cancelAnimationFrame(rafId);
  }

  function buildSwatches() {
    buildRow("cc-skins", EN.Appearance.skins, "skin", function (opt) {
      return '<span class="swatch-color" style="background:' + opt.hex + '"></span>';
    });
    buildRow("cc-hair", EN.Appearance.hairStyles, "hair", function (opt) {
      return '<span class="swatch-label">' + opt.name + "</span>";
    });
    buildRow("cc-haircolor", EN.Appearance.hairColors, "hairColor", function (opt) {
      return '<span class="swatch-color" style="background:' + opt.hex + '"></span>';
    });
    buildRow("cc-outfits", EN.Appearance.outfits, "outfit", function (opt) {
      return (
        '<span class="swatch-color split" style="background:linear-gradient(180deg,' +
        opt.shirt +
        " 50%," +
        opt.pants +
        ' 50%)"></span><span class="swatch-label">' +
        opt.name +
        "</span>"
      );
    });
  }

  function buildRow(containerId, options, key, innerHtml) {
    var el = document.getElementById(containerId);
    el.innerHTML = "";
    options.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.className = "swatch";
      btn.type = "button";
      btn.innerHTML = innerHtml(opt);
      btn.dataset.id = opt.id;
      if (appearance[key] === opt.id) btn.classList.add("selected");
      btn.addEventListener("click", function () {
        appearance[key] = opt.id;
        el.querySelectorAll(".swatch").forEach(function (s) {
          s.classList.remove("selected");
        });
        btn.classList.add("selected");
      });
      el.appendChild(btn);
    });
  }

  var wired = false;
  function wireOnce() {
    if (wired) return;
    wired = true;
    document.getElementById("cc-name").addEventListener("input", validate);
    document.getElementById("cc-start").addEventListener("click", function () {
      appearance.name = document.getElementById("cc-name").value.trim().slice(0, 16) || "Viajante";
      EN.State.data.profile.name = appearance.name;
      EN.State.data.profile.appearance = appearance;
      EN.State.data.profile.created = true;
      EN.State.persist();
      close();
      onDone(appearance);
    });
  }

  function validate() {
    var name = document.getElementById("cc-name").value.trim();
    document.getElementById("cc-start").disabled = name.length === 0;
  }

  function startPreviewLoop() {
    function loop(now) {
      animT = now / 1000;
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewCtx.imageSmoothingEnabled = false;
      EN.Appearance.draw(previewCtx, previewCanvas.width / 2, previewCanvas.height / 2 + 30, appearance, {
        state: "idle",
        t: animT,
        facing: { x: 0, y: 1 },
        classId: null,
      });
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }

  return { open: open };
})();
