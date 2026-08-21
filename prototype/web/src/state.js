window.EN = window.EN || {};

/*
 * Estado global persistido (perfil, aparência, classe, progresso).
 * Tudo que precisa sobreviver a fechar/abrir o jogo vive aqui.
 * Estados de ARENA (teste de classe) nunca tocam este objeto — ver arena.js.
 */
EN.State = (function () {
  var STORAGE_KEY = "encantaria_save_v2";

  function freshSave() {
    return {
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
      },
    };
  }

  var save = load();

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshSave();
      var parsed = JSON.parse(raw);
      // merge raso para tolerar saves antigos incompletos
      var base = freshSave();
      return {
        profile: Object.assign(base.profile, parsed.profile),
        progress: Object.assign(base.progress, parsed.progress),
        settings: Object.assign(base.settings, parsed.settings),
        world: Object.assign(base.world, parsed.world),
      };
    } catch (e) {
      return freshSave();
    }
  }

  var saveTimer = null;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
      } catch (e) {
        /* armazenamento indisponível (modo privado etc.) — falha silenciosa, não é crítico para o protótipo */
      }
    }, 200);
  }

  return {
    data: save,
    persist: persist,
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
