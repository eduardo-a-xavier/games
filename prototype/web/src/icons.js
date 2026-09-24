window.EN = window.EN || {};

/*
 * Ícones pixel próprios de Encantaria.
 *
 * A interface usava emoji Unicode para tudo. Emoji muda de desenho em
 * cada aparelho (Samsung, Google, Apple), tem outro estilo de arte e,
 * pequeno, vira borrão colorido. Estes ícones são grades 12x12 pintadas
 * só com a paleta canônica, ampliadas por inteiro (image-rendering:
 * pixelated), com contorno escuro para ler sobre qualquer fundo.
 *
 * A troca é progressiva e segura: EN.Icons.apply(el, emoji) põe o ícone
 * pixel quando existe um para aquele emoji e mantém o emoji quando não
 * existe — nenhum texto de interface some por falta de desenho.
 */
EN.Icons = (function () {
  var P = EN.Palette;
  var LEGEND = {
    k: P.ui[0], w: P.ui[4], c: P.ui[3],
    r: P.perigo[3], R: P.perigo[2], p: P.perigo[4],
    y: P.ipe[4], Y: P.ipe[3], o: P.ipe[2], l: P.ipe[5],
    b: P.agua[3], B: P.agua[2], a: P.agua[4], A: P.agua[5],
    g: P.grama[4], G: P.grama[2], h: P.grama[6],
    m: P.madeira[3], M: P.madeira[1], t: P.madeira[4],
    s: P.pedra[4], S: P.pedra[2], e: P.pedra[5],
    v: P.encanto[3], V: P.encanto[2], u: P.encanto[4], U: P.encanto[1],
    x: P.cura[2], X: P.cura[1], z: P.cura[3],
    f: P.terracota[3], F: P.terracota[2],
    q: P.terra[4], Q: P.terra[2],
  };

  var GRIDS = {
    coracao: [
      "............",
      "..kkk..kkk..",
      ".kprrkkrrrk.",
      "kprrrrrrrrrk",
      "krrrrrrrrrRk",
      "krrrrrrrrRRk",
      ".krrrrrrRRk.",
      "..krrrrRRk..",
      "...krrRRk...",
      "....kRRk....",
      ".....kk.....",
      "............",
    ],
    raio: [
      "............",
      "......kkkk..",
      ".....kyyyk..",
      "....kyyyk...",
      "...kyyyk....",
      "..kyyyykkk..",
      "..kkkyyyyk..",
      "....kyyyk...",
      "...kYYk.....",
      "...kYk......",
      "...kk.......",
      "............",
    ],
    estrela: [
      ".....k......",
      "....kuk.....",
      "....kuk.....",
      "...kvuvk....",
      ".kkvvuvvkk..",
      "kuuuuwuuuVk.",
      ".kkvvvvVkk..",
      "...kvVVk....",
      "....kVk.....",
      "....kVk.....",
      ".....k......",
      "............",
    ],
    cadeado: [
      "............",
      "....kkkk....",
      "...kSkkSk...",
      "...kk..kk...",
      "...kk..kk...",
      "..kkkkkkkk..",
      "..koyyyyok..",
      "..koyykyok..",
      "..koyykyok..",
      "..kooyyook..",
      "..kkkkkkkk..",
      "............",
    ],
    facao: [
      "..........kk",
      ".........kek",
      "........kewk",
      ".......kesk.",
      "......kesk..",
      "..k..kesk...",
      "..kkkesk....",
      "...kMsk.....",
      "..kmMkk.....",
      ".kmMk.k.....",
      "kMMk........",
      "kkk.........",
    ],
    vento: [
      "............",
      "......kkkk..",
      ".....kaaaak.",
      "kkkkkk.kkak.",
      "kaaaaaak.kk.",
      ".kkkkkkk....",
      "kkkkkkkkkk..",
      "kAAAAAAAAak.",
      ".kkkkkk.kak.",
      "......kkak..",
      ".......kk...",
      "............",
    ],
    pocao: [
      "............",
      "....kkkk....",
      "....keek....",
      ".....kk.....",
      "....kxxk....",
      "...kxzxxk...",
      "..kxzxxxxk..",
      "..kxxxxxXk..",
      "..kxxxxXXk..",
      "...kXXXXk...",
      "....kkkk....",
      "............",
    ],
    fala: [
      "............",
      ".kkkkkkkkkk.",
      "kcccccccccck",
      "kcccccccccck",
      "kckkcckkcckk",
      "kcccccccccck",
      "kcccccccccck",
      ".kkkcckkkkk.",
      "...kcck.....",
      "...kck......",
      "...kk.......",
      "............",
    ],
    porta: [
      "............",
      "...kkkkkk...",
      "..kmmmmmMk..",
      "..kmMmmMMk..",
      "..kmMmmMMk..",
      "..kmmmmmMk..",
      "..kmMmmyMk..",
      "..kmMmmMMk..",
      "..kmMmmMMk..",
      "..kmmmmmMk..",
      ".kkkkkkkkkk.",
      "............",
    ],
    mao: [
      ".....k.k....",
      "....kqkqk.k.",
      "....kqkqkkqk",
      "..k.kqkqkqk.",
      ".kqkkqqqqqk.",
      ".kqqkqqqqqk.",
      "..kqqqqqqQk.",
      "...kqqqqQk..",
      "....kqqQQk..",
      "....kqQQk...",
      ".....kkkk...",
      "............",
    ],
    bau: [
      "............",
      "............",
      "..kkkkkkkk..",
      ".kmmmmmmmmk.",
      ".kmMMMMMMmk.",
      ".kkkkyykkkk.",
      ".kmmmyymmmk.",
      ".kmMMkkMMmk.",
      ".kmMMMMMMmk.",
      ".kkkkkkkkkk.",
      "............",
      "............",
    ],
    lupa: [
      "............",
      "...kkkk.....",
      "..kaAaak....",
      ".kaAaaaak...",
      ".kaaaaaak...",
      ".kaaaaaBk...",
      "..kaaaBk....",
      "...kkkkkk...",
      ".......kmk..",
      "........kmk.",
      ".........kk.",
      "............",
    ],
    portal: [
      "............",
      "...kkkkkk...",
      "..kVvvvvVk..",
      ".kVkkkkkvVk.",
      ".kvkuuukkvk.",
      ".kvkukkukvk.",
      ".kvkkuukkvk.",
      ".kvVkkkkvVk.",
      "..kVvvvvVk..",
      "...kkkkkk...",
      "............",
      "............",
    ],
    som: [
      "............",
      ".....kk.....",
      "....kek..k..",
      ".kkkeek.kck.",
      ".keeeek..kck",
      ".keeeek..kck",
      ".kkkeek.kck.",
      "....kek..k..",
      ".....kk.....",
      "............",
      "............",
      "............",
    ],
    mudo: [
      "............",
      ".....kk.....",
      "....kek.....",
      ".kkkeekkr.rk",
      ".keeeek.krk.",
      ".keeeek.krk.",
      ".kkkeekkr.rk",
      "....kek.....",
      ".....kk.....",
      "............",
      "............",
      "............",
    ],
    menu: [
      "............",
      "............",
      ".kkkkkkkkkk.",
      ".kcccccccck.",
      ".kkkkkkkkkk.",
      ".kcccccccck.",
      ".kkkkkkkkkk.",
      ".kcccccccck.",
      ".kkkkkkkkkk.",
      "............",
      "............",
      "............",
    ],
    fogo: [
      ".....k......",
      "....kyk.....",
      "....kyk..k..",
      "...kyyyk.kk.",
      "..kyylyykyk.",
      "..kyllyyyyk.",
      ".kfylllyyfk.",
      ".kfyllllyfk.",
      ".kFfylyyfFk.",
      "..kFffffFk..",
      "...kkkkkk...",
      "............",
    ],
    escudo: [
      "............",
      ".kkkkkkkkkk.",
      ".kessssssSk.",
      ".kesyyyysSk.",
      ".kesyooysSk.",
      ".kesyooysSk.",
      "..kesyysSk..",
      "..kessssSk..",
      "...kessSk...",
      "....kSSk....",
      ".....kk.....",
      "............",
    ],
    brilho: [
      "............",
      "...k........",
      "..kyk....k..",
      ".kylyk..kyk.",
      "..kyk..kylyk",
      "...k....kyk.",
      "......k..k..",
      ".....kyk....",
      "....kylyk...",
      ".....kyk....",
      "......k.....",
      "............",
    ],
    espadas: [
      "kk........kk",
      "kek......kek",
      ".kek....kek.",
      "..kek..kek..",
      "...kekkek...",
      "....keek....",
      "....keek....",
      "...kMkkMk...",
      "..kMk..kMk..",
      ".kmk....kmk.",
      "kmk......kmk",
      "kk........kk",
    ],
    impacto: [
      ".....k......",
      "..k.kyk.k...",
      "..kkyykkyk..",
      "...kylyyyk..",
      ".kkyllllyykk",
      "kyyllwwllyyk",
      ".kyyllllyykk",
      "..kyylyyk...",
      ".kyykyyyyk..",
      ".kk.kyk.kk..",
      ".....k......",
      "............",
    ],
    machado: [
      "............",
      "...kkkk.....",
      "..keeesk....",
      ".keessskk...",
      ".kessskMk...",
      ".kesskkmk...",
      "..kkk.kmk...",
      "......kmk...",
      "......kmk...",
      "......kmk...",
      "......kMk...",
      ".......k....",
    ],
    adaga: [
      ".....kk.....",
      "....kek.....",
      "....kesk....",
      "....kesk....",
      "....kesk....",
      "....kesk....",
      "..kkkkkkkk..",
      "..kyyyyyyk..",
      "...kkMMkk...",
      "....kmmk....",
      "....kMMk....",
      ".....kk.....",
    ],
    faca: [
      "............",
      ".........kk.",
      "........kek.",
      ".......kesk.",
      "......kesk..",
      ".....kesk...",
      "....kesk....",
      "...kkkk.....",
      "..kmMk......",
      ".kmMk.......",
      ".kkk........",
      "............",
    ],
    leque: [
      "k....kk....k",
      "ke...ke...ek",
      ".ke..ke..ek.",
      ".kse.ke.esk.",
      "..ks.ks.sk..",
      "..kkkkkkkk..",
      "...kMMMMk...",
      "...kmmmmk...",
      "....kMMk....",
      ".....kk.....",
      "............",
      "............",
    ],
    cipo: [
      "............",
      ".kk....kk...",
      "kgk..kkggk..",
      "kgGk.kgGk...",
      ".kgGkgGk....",
      "..kgGGk.kk..",
      "...kgGkkgk..",
      "..kgGkgGGk..",
      ".kgGk.kGk...",
      "kgGk...k....",
      "kGk.........",
      "kk..........",
    ],
    orbe: [
      "............",
      "....kkkk....",
      "...kuuvVk...",
      "..kuwuvvVk..",
      "..kuuvvvVk..",
      "..kvvvvVVk..",
      "..kVvvVVUk..",
      "...kVVVUk...",
      "....kkkk....",
      "...kmmmmk...",
      "..kMMMMMMk..",
      "..kkkkkkkk..",
    ],
  };

  // emoji -> ícone. As variações com seletor (U+FE0F) apontam pro mesmo.
  var EMOJI = {
    "❤️": "coracao", "❤": "coracao",
    "⚡": "raio",
    "✦": "estrela",
    "🔒": "cadeado",
    "👊": "facao",
    "💨": "vento",
    "🧪": "pocao",
    "💬": "fala",
    "🚪": "porta",
    "✋": "mao",
    "🎁": "bau", "🧰": "bau", "🧺": "bau",
    "🔍": "lupa",
    "🌀": "portal",
    "🔊": "som",
    "🔇": "mudo",
    "☰": "menu",
    "🔥": "fogo",
    "🛡️": "escudo", "🛡": "escudo",
    "✨": "brilho",
    "⚔️": "espadas", "⚔": "espadas",
    "💥": "impacto",
    "🪓": "machado",
    "🗡️": "adaga", "🗡": "adaga",
    "🔪": "faca",
    "🎴": "leque",
    "🕸️": "cipo", "🕸": "cipo",
    "🔮": "orbe",
  };

  var cache = {};
  function url(name) {
    if (cache[name]) return cache[name];
    var g = GRIDS[name];
    if (!g) return null;
    var c = document.createElement("canvas");
    c.width = c.height = 12;
    var x2 = c.getContext("2d");
    for (var y = 0; y < 12; y++) {
      for (var x = 0; x < 12; x++) {
        var ch = g[y][x];
        if (ch === "." || !ch) continue;
        x2.fillStyle = LEGEND[ch] || LEGEND.k;
        x2.fillRect(x, y, 1, 1);
      }
    }
    cache[name] = c.toDataURL();
    return cache[name];
  }

  function forEmoji(e) {
    return EMOJI[e] || EMOJI[String(e).replace(/️/g, "")] || null;
  }

  // troca o conteúdo de `el` pelo ícone pixel do emoji (ou deixa o emoji)
  function apply(el, emoji) {
    if (!el) return;
    if (el._pxIcon === emoji) return; // chamado todo frame por controls.js
    el._pxIcon = emoji;
    var name = forEmoji(emoji);
    var src = name && url(name);
    if (!src) {
      el.textContent = emoji;
      return;
    }
    el.innerHTML = "";
    var img = document.createElement("img");
    img.className = "px-icon";
    img.src = src;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.draggable = false;
    el.appendChild(img);
  }

  // ícones fixos do HTML: só troca o nó de texto, preservando filhos
  // (o ponto vermelho do menu, os anéis de recarga)
  function upgradeStatic() {
    var sel = [".bar-icon", ".atk-icon", "#btn-dodge > span", "#btn-heal > span:first-child", "#icon-context", "#icon-skill1", "#icon-skill2"];
    sel.forEach(function (s) {
      Array.prototype.forEach.call(document.querySelectorAll(s), function (el) {
        apply(el, el.textContent.trim());
      });
    });
    ["btn-mute", "btn-menu"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var node = el.firstChild;
      if (!node || node.nodeType !== 3) return;
      var holder = document.createElement("span");
      holder.className = "px-holder";
      el.replaceChild(holder, node);
      apply(holder, node.textContent.trim());
    });
  }

  function setMute(muted) {
    var holder = document.querySelector("#btn-mute .px-holder");
    if (holder) apply(holder, muted ? "🔇" : "🔊");
    else {
      var b = document.getElementById("btn-mute");
      if (b) b.textContent = muted ? "🔇" : "🔊";
    }
  }

  return { url: url, apply: apply, forEmoji: forEmoji, upgradeStatic: upgradeStatic, setMute: setMute, GRIDS: GRIDS, LEGEND: LEGEND };
})();
