/*
 * Regressões encontradas numa varredura do jogo rodando no navegador.
 * Cada teste aqui corresponde a um bug que chegou a acontecer de verdade —
 * o nome do teste é o sintoma, não a implementação.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const WEB = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(WEB, p), "utf8");

// ---------------------------------------------------------------------
// sandbox mínimo: state.js + farm.js + pet.js, sem canvas nem DOM
// ---------------------------------------------------------------------
function loadGame() {
  const storage = new Map();
  const context = {
    console,
    document: { hidden: false, addEventListener() {} },
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, v),
      removeItem: (k) => storage.delete(k),
    },
    setTimeout: () => 1,
    clearTimeout() {},
    addEventListener() {},
  };
  context.window = context;
  context.EN = {};
  vm.createContext(context);
  for (const f of ["src/state.js", "src/farm.js", "src/pet.js"]) {
    vm.runInContext(read(f), context, { filename: f });
  }
  // pet.js fala com Dialogue/Audio só no encontro, que estes testes não usam
  context.EN.Dialogue = { play() {} };
  context.EN.Audio = { play() {} };
  return context.EN;
}

test("plantar num índice inválido não gasta Vintém nem some com a semente", () => {
  const EN = loadGame();
  const W = EN.State.data.world;
  W.vintem = 500;
  W.farmPlots = 6;

  for (const idx of [-1, 999, null, undefined, "x", 1.5, NaN]) {
    const antes = W.vintem;
    const r = EN.Farm.plant(idx, "milho");
    assert.equal(r.ok, false, `plant(${String(idx)}) não devia plantar`);
    assert.equal(W.vintem, antes, `plant(${String(idx)}) não devia cobrar`);
  }

  // o array continua sendo um array de 12 posições, sem chave pendurada
  EN.Farm.state(); // materializa os canteiros
  assert.equal(W.farm.length, 12);
  assert.ok(Object.keys(W.farm).every((k) => /^\d+$/.test(k)));
});

test("colher num canteiro ainda não arado avisa em vez de quebrar", () => {
  const EN = loadGame();
  EN.State.data.world.farmPlots = 6;
  const r = EN.Farm.harvest(11);
  assert.equal(r.ok, false);
  assert.match(r.msg, /arado/);
});

test("colher num índice inválido não quebra", () => {
  const EN = loadGame();
  for (const idx of [-1, 999, null, undefined, "x", 1.5]) {
    assert.doesNotThrow(() => EN.Farm.harvest(idx), `harvest(${String(idx)})`);
  }
});

test("chaves do protótipo não são sementes", () => {
  const EN = loadGame();
  EN.State.data.world.vintem = 500;
  for (const semente of ["__proto__", "constructor", "prototype", "toString"]) {
    const r = EN.Farm.plant(0, semente);
    assert.equal(r.ok, false, `${semente} não é semente`);
  }
  assert.equal(EN.Farm.plant(0, "milho").ok, true, "milho continua sendo semente");
});

test("o Saci só consome a colheita quando aceita comer", () => {
  const EN = loadGame();
  const W = EN.State.data.world;
  EN.State.data.progress.pet = { has: true, name: "Saci", level: 1, fed: 0, met: true };

  // sem nada guardado: recusa e diz o motivo certo
  W.inventory.colheita = {};
  const semComida = EN.Pet.feed("milho");
  assert.equal(semComida.ok, false);
  assert.match(semComida.msg, /não tem/i);

  // comendo: desconta exatamente um
  W.inventory.colheita = { milho: 3 };
  assert.equal(EN.Pet.feed("milho").ok, true);
  assert.equal(W.inventory.colheita.milho, 2);

  // no ponto: recusa sem cobrar
  EN.State.data.progress.pet.level = 5;
  assert.equal(EN.Pet.feed("milho").ok, false);
  assert.equal(W.inventory.colheita.milho, 2);

  // comida que não existe: recusa sem cobrar
  EN.State.data.progress.pet.level = 1;
  assert.equal(EN.Pet.feed("__proto__").ok, false);
  assert.equal(W.inventory.colheita.milho, 2);
});

// ---------------------------------------------------------------------
// contratos entre arquivos — pegam o que só aparece em produção
// ---------------------------------------------------------------------
test("todo script do index está no precache do service worker", () => {
  const sw = read("sw.js");
  const scripts = [...read("index.html").matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(scripts.length > 20, "esperava a lista de scripts do jogo");
  const faltando = scripts.filter((s) => !sw.includes(`"${s}"`));
  assert.deepEqual(faltando, [], "sem isto o jogo não abre offline");
});

test("tudo que o precache lista existe no disco", () => {
  const sw = read("sw.js");
  const lista = sw.match(/var PRECACHE = \[([\s\S]*?)\];/)[1].match(/"([^"]+)"/g).map((x) => x.slice(1, -1));
  const faltando = lista.filter((u) => u !== "./" && !fs.existsSync(path.join(WEB, u)));
  assert.deepEqual(faltando, [], "um arquivo listado e ausente derruba a instalação inteira");
});

test("voltar ao Sítio depois de morrer sai de toda sub-área", () => {
  // o registro de interativos do mundo só volta no exit() de cada área.
  // Morrer no brejo chamava restoreMainSession() por fora e o Sítio
  // ficava sem NPC, sem casa e sem roça até recarregar a página.
  const main = read("src/main.js");
  const bloco = main.match(/function leaveSubArea\(\)[\s\S]*?\n  \}/);
  assert.ok(bloco, "esperava a saída centralizada de sub-área");
  for (const area of ["Mine", "Brejo", "House"]) {
    assert.match(bloco[0], new RegExp(`EN\\.${area}\\.current\\(\\)[\\s\\S]*?EN\\.${area}\\.exit\\(\\)`));
  }
  assert.match(main, /function respawn\(\)\s*\{\s*leaveSubArea\(\);/);
});
