const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const stateSource = fs.readFileSync(path.join(__dirname, "..", "src", "state.js"), "utf8");

function loadState(rawSave) {
  const storage = new Map();
  if (rawSave !== undefined) storage.set("encantaria_save_v2", rawSave);

  let pendingTimer = null;
  const context = {
    console,
    document: { hidden: false, addEventListener() {} },
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, value);
      },
      removeItem(key) {
        storage.delete(key);
      },
    },
    setTimeout(callback) {
      pendingTimer = callback;
      return 1;
    },
    clearTimeout() {
      pendingTimer = null;
    },
    addEventListener() {},
  };
  context.window = context;
  context.EN = {};

  vm.createContext(context);
  vm.runInContext(stateSource, context, { filename: "state.js" });
  return { state: context.EN.State, storage, runTimer: () => pendingTimer && pendingTimer() };
}

test("cria save completo e versionado quando não existe progresso", () => {
  const { state } = loadState();
  assert.equal(state.version, 3);
  assert.equal(state.data.version, 3);
  assert.deepEqual(
    JSON.parse(JSON.stringify(state.data.progress.attrs)),
    { forca: 0, vitalidade: 0, vigor: 0, magia: 0, defesa: 0 }
  );
  assert.equal(state.data.world.inventory.curas, 3);
});

test("migra save antigo sem apagar campos aninhados", () => {
  const oldSave = JSON.stringify({
    profile: { name: "Um nome grande demais para o limite", created: 1 },
    progress: {
      level: "5",
      attrs: { forca: 2 },
      quests: { trilha: { status: "active", step: 1 } },
    },
    world: { dayT: 50, inventory: { curas: "2" } },
  });
  const { state } = loadState(oldSave);

  assert.equal(state.data.profile.name.length, 16);
  assert.equal(state.data.progress.level, 5);
  assert.equal(state.data.progress.attrs.forca, 2);
  assert.equal(state.data.progress.attrs.vitalidade, 0);
  assert.equal(state.data.progress.attrs.defesa, 0);
  assert.equal(state.data.progress.quests.trilha.step, 1);
  assert.equal(state.data.world.inventory.curas, 2);
  assert.equal(state.data.world.dayT, 2);
});

test("normaliza números inválidos e não deixa recursos negativos", () => {
  const broken = JSON.stringify({
    progress: { level: "não-numérico", xp: -50, attrPoints: -2, attrs: { vigor: -10 } },
    world: { x: null, y: "oops", vintem: -9, day: 0, dayT: -1, inventory: { curas: -4 } },
  });
  const { state } = loadState(broken);

  assert.equal(state.data.progress.level, 1);
  assert.equal(state.data.progress.xp, 0);
  assert.equal(state.data.progress.attrPoints, 0);
  assert.equal(state.data.progress.attrs.vigor, 0);
  assert.equal(state.data.world.x, 300);
  assert.equal(state.data.world.y, 300);
  assert.equal(state.data.world.vintem, 0);
  assert.equal(state.data.world.day, 1);
  assert.equal(state.data.world.dayT, 23);
  assert.equal(state.data.world.inventory.curas, 0);
});

test("seção inválida não apaga as outras partes válidas do save", () => {
  const { state } = loadState(JSON.stringify({ progress: "quebrado", world: { vintem: 18 } }));
  assert.equal(state.data.progress.level, 1);
  assert.equal(state.data.progress.attrs.forca, 0);
  assert.equal(state.data.world.vintem, 18);
});

test("save corrompido volta ao padrão e flush persiste imediatamente", () => {
  const { state, storage } = loadState("{quebrado");
  state.data.world.vintem = 37;
  state.persist();
  state.flush();

  const persisted = JSON.parse(storage.get("encantaria_save_v2"));
  assert.equal(persisted.world.vintem, 37);
  assert.equal(persisted.version, 3);
});
