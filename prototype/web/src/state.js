window.EN = window.EN || {};

/*
 * Estado global persistido (perfil, aparência, classe, progresso).
 * Tudo que precisa sobreviver a fechar/abrir o jogo vive aqui.
 * Estados de ARENA (teste de classe) nunca tocam este objeto — ver arena.js.
 */
EN.State = (function () {
  var STORAGE_KEY = "encantaria_save_v2";
  var SAVE_VERSION = 3;

  function freshSave() {
    return {
      version: SAVE_VERSION,
      profile: {
        name: "",
        appearance: null, // preenchido em CharCreation, ver appearance.js#defaultAppearance
        created: false,
      },
      progress: {
        despertarSeen: false,
        classId: null, // 'guerreiro' | 'mateiro' | 'encantado' | null (ainda pessoa comum)
        talentId: null, // talento de nível 5 escolhido (GDD Seção 11)
        level: 1,
        xp: 0,
        attrPoints: 0,
        attrs: { forca: 0, vitalidade: 0, vigor: 0, magia: 0, defesa: 0 },
        seen: {},      // bestiário: { defId: { kills } } — preenchido ao encontrar
        menuNew: false, // ponto vermelho no botão do menu
        quests: {},
      },
      settings: {
        muted: false,
      },
      world: {
        x: 300,
        y: 300,
        vintem: 0,
        day: 1,
        dayT: 8, // hora do dia (0-24), começa de manhã
        inventory: { curas: 3 },
        storage: {}, // baú de casa: { itemId: quantidade } — ver house.js
      },
    };
  }

  var save = load();

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  /*
   * Mescla recursivamente apenas objetos JSON simples. O merge raso antigo
   * substituía `attrs` e `inventory` inteiros: um save de versão anterior
   * com só um campo fazia os demais virarem `undefined` e o jogo quebrava
   * mais tarde, longe do carregamento. As chaves de proteção também evitam
   * que um save importado altere o protótipo dos objetos do runtime.
   */
  function mergeSave(base, incoming) {
    if (!isPlainObject(incoming)) return base;
    Object.keys(incoming).forEach(function (key) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") return;
      var value = incoming[key];
      if (isPlainObject(base[key]) && isPlainObject(value)) {
        mergeSave(base[key], value);
      } else if (value !== undefined) {
        base[key] = value;
      }
    });
    return base;
  }

  function finiteNumber(value, fallback, min, max) {
    if (value === null || value === "" || typeof value === "boolean") return fallback;
    var number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    if (min !== undefined) number = Math.max(min, number);
    if (max !== undefined) number = Math.min(max, number);
    return number;
  }

  function normalize(parsed) {
    var defaults = freshSave();
    var normalized = mergeSave(freshSave(), parsed);
    ["profile", "progress", "settings", "world"].forEach(function (key) {
      if (!isPlainObject(normalized[key])) normalized[key] = defaults[key];
    });
    if (!isPlainObject(normalized.progress.attrs)) normalized.progress.attrs = defaults.progress.attrs;
    if (!isPlainObject(normalized.progress.quests)) normalized.progress.quests = {};
    if (!isPlainObject(normalized.world.inventory)) normalized.world.inventory = defaults.world.inventory;
    // bestiário e baú: EN.Menu/EN.House escrevem dentro deles assumindo
    // objeto. Um save com tipo errado aqui só explodia lá na frente, no
    // primeiro inimigo morto ou no primeiro item guardado.
    if (!isPlainObject(normalized.progress.seen)) normalized.progress.seen = {};
    Object.keys(normalized.progress.seen).forEach(function (id) {
      var entry = normalized.progress.seen[id];
      normalized.progress.seen[id] = { kills: Math.floor(finiteNumber(entry && entry.kills, 0, 0)) };
    });
    normalized.progress.menuNew = !!normalized.progress.menuNew;
    if (!isPlainObject(normalized.world.storage)) normalized.world.storage = {};
    normalized.version = SAVE_VERSION;

    normalized.profile.name = typeof normalized.profile.name === "string" ? normalized.profile.name.slice(0, 16) : "";
    normalized.profile.created = !!normalized.profile.created;
    normalized.settings.muted = !!normalized.settings.muted;

    normalized.progress.level = Math.floor(finiteNumber(normalized.progress.level, 1, 1));
    normalized.progress.xp = Math.floor(finiteNumber(normalized.progress.xp, 0, 0));
    normalized.progress.attrPoints = Math.floor(finiteNumber(normalized.progress.attrPoints, 0, 0));
    Object.keys(freshSave().progress.attrs).forEach(function (key) {
      normalized.progress.attrs[key] = Math.floor(finiteNumber(normalized.progress.attrs[key], 0, 0));
    });
    normalized.world.x = finiteNumber(normalized.world.x, 300, 0);
    normalized.world.y = finiteNumber(normalized.world.y, 300, 0);
    normalized.world.vintem = Math.floor(finiteNumber(normalized.world.vintem, 0, 0));
    normalized.world.day = Math.floor(finiteNumber(normalized.world.day, 1, 1));
    var hour = finiteNumber(normalized.world.dayT, 8);
    normalized.world.dayT = ((hour % 24) + 24) % 24;
    normalized.world.inventory.curas = Math.floor(finiteNumber(normalized.world.inventory.curas, 3, 0));

    return normalized;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshSave();
      return normalize(JSON.parse(raw));
    } catch (e) {
      return freshSave();
    }
  }

  var saveTimer = null;
  function persistNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch (e) {
      /* armazenamento indisponível (modo privado etc.) — o jogo continua sem travar */
    }
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      persistNow();
    }, 200);
  }

  // WebViews podem ser encerradas sem esperar o debounce. Grava no último
  // evento de ciclo de vida confiável para não perder posição/loot recentes.
  window.addEventListener("pagehide", persistNow);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) persistNow();
  });

  return {
    data: save,
    persist: persist,
    flush: persistNow,
    version: SAVE_VERSION,
    hasProfile: function () {
      return !!save.profile.created && !!save.profile.appearance;
    },
    resetAll: function () {
      save = freshSave();
      this.data = save;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
    },
  };
})();
