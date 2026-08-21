const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const playerDir = path.resolve(__dirname, "..", "..", "..", "assets", "characters", "player", "base");

function pngWidth(file) {
  const header = fs.readFileSync(file).subarray(0, 24);
  assert.equal(header.toString("ascii", 1, 4), "PNG", `${file} não é PNG`);
  return header.readUInt32BE(16);
}

const directionalFrames = {
  idle: { down: 4, left: 4, right: 4, up: 4 },
  walk: { down: 5, left: 5, right: 5, up: 5 },
  run: { down: 6, left: 6, right: 6, up: 6 },
  hurt: { down: 3, left: 3, right: 3, up: 3 },
  dodge: { down: 4, left: 3, right: 4, up: 4 },
  heavy: { down: 8, left: 9, right: 9, up: 12 },
  attack_guerreiro: { down: 6, left: 6, right: 6, up: 6 },
  attack_mateiro: { down: 8, left: 8, right: 8, up: 8 },
  attack_encantado: { down: 6, left: 6, right: 6, up: 4 },
};

test("cada spritesheet direcional divide em frames inteiros", () => {
  for (const [animation, directions] of Object.entries(directionalFrames)) {
    for (const [direction, frames] of Object.entries(directions)) {
      const file = path.join(playerDir, `${animation}_${direction}.png`);
      assert.ok(fs.existsSync(file), `asset ausente: ${file}`);
      assert.equal(pngWidth(file) % frames, 0, `${animation}_${direction}: largura incompatível com ${frames} frames`);
    }
  }
});

test("contrato do Guerreiro usa seis frames no carregador", () => {
  const atlas = fs.readFileSync(path.join(__dirname, "..", "src", "spriteAtlas.js"), "utf8");
  assert.match(atlas, /loadDirectional\("attack_guerreiro", 6\)/);
});
