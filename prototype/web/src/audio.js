window.EN = window.EN || {};

/*
 * Áudio 100% sintetizado em runtime (Web Audio API) — nenhum arquivo de
 * som no projeto.
 *
 * Por que assim: o jogo é distribuído também como UM arquivo HTML só
 * (build_bundle.py), servido num contexto que bloqueia requisição
 * externa. Áudio em .mp3/.ogg viraria base64 gigante no bundle; sintetizar
 * custa alguns kB de código e nunca falha por rede. Também deixa cada som
 * ajustável por parâmetro, o que é melhor pra prototipar do que trocar
 * arquivo.
 *
 * Regras que o navegador impõe e que este módulo respeita:
 *  - AudioContext só pode tocar depois de um gesto do usuário; por isso a
 *    inicialização é preguiçosa (unlock() no primeiro toque) e tudo antes
 *    disso vira silêncio, nunca erro.
 *  - Nada aqui pode lançar exceção: som é acessório, e um jogo que quebra
 *    porque o áudio falhou é pior do que um jogo mudo.
 */
EN.Audio = (function () {
  var ac = null;
  var master = null;
  var sfxGain = null;
  var ambGain = null;
  var ready = false;
  var muted = false;
  var ambient = null;
  var noiseBuf = null;

  function unlock() {
    if (ready) {
      if (ac && ac.state === "suspended") ac.resume().catch(function () {});
      return;
    }
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      ac = new Ctx();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.85;
      master.connect(ac.destination);

      sfxGain = ac.createGain();
      sfxGain.gain.value = 0.9;
      sfxGain.connect(master);

      ambGain = ac.createGain();
      ambGain.gain.value = 0.0;
      ambGain.connect(master);

      noiseBuf = makeNoise();
      ready = true;
      if (ac.state === "suspended") ac.resume().catch(function () {});
    } catch (e) {
      ready = false;
    }
  }

  function makeNoise() {
    var len = Math.floor(ac.sampleRate * 0.5);
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function now() {
    return ac.currentTime;
  }

  // ---- blocos de construção ----

  function tone(opts) {
    if (!ready) return;
    var t0 = now() + (opts.delay || 0);
    var osc = ac.createOscillator();
    var g = ac.createGain();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.freqTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqTo), t0 + opts.dur);

    var peak = opts.gain === undefined ? 0.25 : opts.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);

    var out = g;
    if (opts.filter) {
      var f = ac.createBiquadFilter();
      f.type = opts.filter;
      f.frequency.value = opts.filterFreq || 900;
      g.connect(f);
      out = f;
    }
    out.connect(opts.bus || sfxGain);
    osc.connect(g);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.02);
  }

  function noise(opts) {
    if (!ready) return;
    var t0 = now() + (opts.delay || 0);
    var src = ac.createBufferSource();
    src.buffer = noiseBuf;
    var f = ac.createBiquadFilter();
    f.type = opts.filter || "bandpass";
    f.frequency.setValueAtTime(opts.freq || 1200, t0);
    if (opts.freqTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, opts.freqTo), t0 + opts.dur);
    f.Q.value = opts.q === undefined ? 1 : opts.q;

    var g = ac.createGain();
    var peak = opts.gain === undefined ? 0.2 : opts.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);

    src.connect(f);
    f.connect(g);
    g.connect(opts.bus || sfxGain);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.02);
  }

  // ---- catálogo de efeitos ----
  // cada som é uma função pra poder variar levemente a cada disparo:
  // repetição idêntica é o que faz áudio de jogo cansar rápido

  var SFX = {
    swing: function () {
      noise({ filter: "bandpass", freq: 1900, freqTo: 500, dur: 0.16, gain: 0.11, q: 0.8 });
    },
    swingHeavy: function () {
      noise({ filter: "bandpass", freq: 1200, freqTo: 260, dur: 0.28, gain: 0.18, q: 0.7 });
      tone({ type: "triangle", freq: 150, freqTo: 70, dur: 0.22, gain: 0.1 });
    },
    hit: function () {
      var v = 0.9 + Math.random() * 0.25;
      noise({ filter: "lowpass", freq: 1600 * v, freqTo: 300, dur: 0.12, gain: 0.24 });
      tone({ type: "triangle", freq: 190 * v, freqTo: 80, dur: 0.13, gain: 0.2 });
    },
    crit: function () {
      noise({ filter: "highpass", freq: 2400, dur: 0.14, gain: 0.2 });
      tone({ type: "square", freq: 620, freqTo: 1250, dur: 0.14, gain: 0.14 });
      tone({ type: "triangle", freq: 160, freqTo: 60, dur: 0.2, gain: 0.22 });
    },
    hurt: function () {
      tone({ type: "sawtooth", freq: 230, freqTo: 90, dur: 0.26, gain: 0.2, filter: "lowpass", filterFreq: 900 });
      noise({ filter: "lowpass", freq: 700, dur: 0.16, gain: 0.16 });
    },
    dodge: function () {
      noise({ filter: "bandpass", freq: 800, freqTo: 2200, dur: 0.2, gain: 0.1, q: 1.6 });
    },
    perfect: function () {
      // acorde curto e brilhante: precisa ser inconfundível, é a
      // confirmação de que o jogador leu o telegraph certo
      [880, 1320, 1760].forEach(function (f, i) {
        tone({ type: "sine", freq: f, dur: 0.5 - i * 0.08, gain: 0.16, delay: i * 0.045 });
      });
      noise({ filter: "highpass", freq: 3200, dur: 0.3, gain: 0.08 });
    },
    heal: function () {
      [523, 659, 784].forEach(function (f, i) {
        tone({ type: "sine", freq: f, dur: 0.32, gain: 0.13, delay: i * 0.07 });
      });
    },
    coin: function () {
      tone({ type: "square", freq: 1180, dur: 0.07, gain: 0.09 });
      tone({ type: "square", freq: 1720, dur: 0.09, gain: 0.07, delay: 0.06 });
    },
    levelup: function () {
      [523, 659, 784, 1046].forEach(function (f, i) {
        tone({ type: "triangle", freq: f, dur: 0.42, gain: 0.17, delay: i * 0.09 });
      });
    },
    quest: function () {
      tone({ type: "sine", freq: 740, dur: 0.22, gain: 0.14 });
      tone({ type: "sine", freq: 988, dur: 0.3, gain: 0.13, delay: 0.11 });
    },
    ui: function () {
      tone({ type: "square", freq: 520, dur: 0.05, gain: 0.05 });
    },
    shot: function () {
      tone({ type: "sawtooth", freq: 900, freqTo: 300, dur: 0.16, gain: 0.1, filter: "lowpass", filterFreq: 2200 });
    },
    magic: function () {
      tone({ type: "sine", freq: 500, freqTo: 1400, dur: 0.3, gain: 0.11 });
      noise({ filter: "bandpass", freq: 2600, dur: 0.24, gain: 0.06, q: 3 });
    },
    enemyShot: function () {
      tone({ type: "square", freq: 380, freqTo: 180, dur: 0.18, gain: 0.08 });
    },
    slam: function () {
      noise({ filter: "lowpass", freq: 500, freqTo: 90, dur: 0.42, gain: 0.3 });
      tone({ type: "sine", freq: 90, freqTo: 40, dur: 0.4, gain: 0.26 });
    },
    roar: function () {
      noise({ filter: "bandpass", freq: 700, freqTo: 180, dur: 1.1, gain: 0.26, q: 0.6 });
      tone({ type: "sawtooth", freq: 150, freqTo: 62, dur: 1.0, gain: 0.2, filter: "lowpass", filterFreq: 700 });
      tone({ type: "sawtooth", freq: 226, freqTo: 88, dur: 0.9, gain: 0.12, filter: "lowpass", filterFreq: 900, delay: 0.05 });
    },
    death: function () {
      tone({ type: "sawtooth", freq: 330, freqTo: 60, dur: 1.1, gain: 0.22, filter: "lowpass", filterFreq: 800 });
    },
    stagger: function () {
      tone({ type: "square", freq: 300, freqTo: 520, dur: 0.1, gain: 0.09 });
    },
  };

  function play(name) {
    if (!ready || muted) return;
    var fn = SFX[name];
    if (!fn) return;
    try {
      fn();
    } catch (e) {
      /* som nunca derruba o jogo */
    }
  }

  /*
   * Ambiente: dois osciladores levemente desafinados formando um acorde
   * grave, filtrados. A "fase do dia" só move o filtro e a afinação — de
   * dia soa aberto, de noite soa abafado e mais baixo. Na mina, mais grave
   * ainda. Barato o suficiente pra rodar em celular sem pesar.
   */
  function startAmbient() {
    if (!ready || ambient) return;
    try {
      var g = ac.createGain();
      g.gain.value = 1;
      var filt = ac.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = 700;
      filt.Q.value = 0.6;

      var oscs = [110, 164.8, 220].map(function (f, i) {
        var o = ac.createOscillator();
        o.type = i === 2 ? "sine" : "triangle";
        o.frequency.value = f;
        o.detune.value = (i - 1) * 6;
        var og = ac.createGain();
        og.gain.value = i === 2 ? 0.05 : 0.09;
        o.connect(og);
        og.connect(filt);
        o.start();
        return o;
      });

      filt.connect(g);
      g.connect(ambGain);
      ambient = { oscs: oscs, filt: filt, gain: g };
      ambGain.gain.setTargetAtTime(0.22, now(), 1.5);
    } catch (e) {
      ambient = null;
    }
  }

  // phase: 'dia' | 'noite' | 'mina'
  function setAmbience(phase) {
    if (!ready || !ambient) return;
    try {
      var t = now();
      var cfg =
        phase === "mina"
          ? { cutoff: 320, level: 0.3, detune: -12 }
          : phase === "noite"
          ? { cutoff: 460, level: 0.18, detune: -5 }
          : { cutoff: 1100, level: 0.15, detune: 0 };
      ambient.filt.frequency.setTargetAtTime(cfg.cutoff, t, 1.2);
      ambGain.gain.setTargetAtTime(cfg.level, t, 1.2);
      ambient.oscs.forEach(function (o, i) {
        o.detune.setTargetAtTime((i - 1) * 6 + cfg.detune, t, 1.2);
      });
    } catch (e) {}
  }

  function setMuted(v) {
    muted = !!v;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.85, now(), 0.05);
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function isReady() {
    return ready;
  }

  return {
    unlock: unlock,
    play: play,
    startAmbient: startAmbient,
    setAmbience: setAmbience,
    setMuted: setMuted,
    isMuted: isMuted,
    isReady: isReady,
  };
})();
