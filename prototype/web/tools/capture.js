/*
 * Captura de tela e medição de FPS reais do jogo em Chromium headless.
 *
 *   python3 -m http.server 4173 --directory prototype/web &
 *   NODE_PATH=$(npm root -g) node prototype/web/tools/capture.js <pasta-saida> [rótulo]
 *
 * Além do FPS (preso em 60 pelo vsync), mede o TEMPO DE TRABALHO por
 * quadro — quanto do orçamento de 16,7 ms o jogo gasta em JS + canvas —
 * envolvendo requestAnimationFrame. Com THROTTLE=4 a CPU é desacelerada 4x
 * pelo DevTools, aproximação grosseira de um Android intermediário.
 *
 * Injeta um save pronto (perfil criado, Guerreiro, despertar visto) para ir
 * direto ao Sítio, fotografa de dia, de noite e em combate, e mede FPS de
 * 5 s por cena. O FPS headless é da máquina de CI/nuvem, com GPU por
 * software: serve para comparar antes/depois no mesmo ambiente, não como
 * número de celular.
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const out = process.argv[2] || "shots";
const label = process.argv[3] || "run";
const base = process.env.GAME_URL || "http://localhost:4173/";
fs.mkdirSync(out, { recursive: true });

function makeSave(dayT, pos, graficos) {
  return JSON.stringify(Object.assign({
    version: 3,
    profile: {
      name: "Teste", created: true,
      appearance: { skin: "media", hair: "curto", hairColor: "castanho", outfit: "roca", hat: null },
    },
    progress: { despertarSeen: true, classId: "guerreiro", level: 3, hints: { all: true } },
    settings: { graficos: graficos || "alto" },
    world: { x: (pos || {}).x || 520, y: (pos || {}).y || 470, dayT: dayT, day: 2, vintem: 40 },
  }));
}

async function scene(browser, name, dayT, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript((s) => {
    try { localStorage.setItem("encantaria_save_v2", s); } catch (e) {}
    const raf = window.requestAnimationFrame.bind(window);
    window.__work = [];
    window.requestAnimationFrame = (cb) => raf((t) => {
      const t0 = performance.now();
      cb(t);
      window.__work.push(performance.now() - t0);
    });
  }, makeSave(dayT, opts.pos, opts.graficos));
  const throttle = +(process.env.THROTTLE || 1);
  if (throttle > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  }
  await page.goto(base + (opts.query || ""));
  await page.waitForTimeout(2500);
  if (opts.act) await opts.act(page);
  // FPS real: conta requestAnimationFrame durante 5 s
  const fps = await page.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now(); const times = [];
    let prev = t0;
    function f(now) {
      n++; times.push(now - prev); prev = now;
      if (now - t0 < 5000) requestAnimationFrame(f);
      else {
        times.sort((a, b) => a - b);
        res({ fps: +(n / ((now - t0) / 1000)).toFixed(1), p95ms: +times[Math.floor(times.length * 0.95)].toFixed(1) });
      }
    }
    requestAnimationFrame(f);
  }));
  const work = await page.evaluate(() => {
    const w = window.__work.slice(-240).sort((a, b) => a - b);
    return { medianMs: +w[w.length >> 1].toFixed(2), p95Ms: +w[Math.floor(w.length * 0.95)].toFixed(2) };
  });
  fps.work = work;
  const file = path.join(out, label + "_" + name + ".png");
  await page.screenshot({ path: file });
  await page.close();
  return { scene: name, file, fps, errors };
}

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
  const results = [];
  results.push(await scene(browser, "dia", 10));
  results.push(await scene(browser, "noite", 21.5));
  results.push(await scene(browser, "noite_casa", 22, { pos: { x: 250, y: 300 } }));
  results.push(await scene(browser, "noite_mina", 23, { pos: { x: 1430, y: 290 } }));
  results.push(await scene(browser, "noite_casa_baixo", 22, { pos: { x: 250, y: 300 }, graficos: "baixo" }));
  results.push(await scene(browser, "crepusculo", 18.5, { pos: { x: 420, y: 330 } }));
  results.push(await scene(browser, "combate", 15, {
    act: async (page) => {
      // anda para o leste (onde nascem os primeiros inimigos) e ataca
      await page.keyboard.down("d"); await page.waitForTimeout(900); await page.keyboard.up("d");
      for (let i = 0; i < 6; i++) {
        await page.mouse.move(560, 200); await page.mouse.down(); await page.waitForTimeout(60);
        await page.mouse.up(); await page.waitForTimeout(140);
      }
    },
  }));
  await browser.close();
  fs.writeFileSync(path.join(out, label + "_metrics.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
