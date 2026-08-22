window.EN = window.EN || {};

/*
 * Orquestrador: telas (criação de personagem, mundo, Despertar, seleção de
 * classe, arena, mina) e o loop de jogo genérico que roda qualquer sessão —
 * mundo principal, mina ou arena têm todas o mesmo formato, então
 * update()/render() não sabem qual delas está ativa.
 *
 * Também é aqui que o tempo do jogo passa por EN.Combat.consumeFrame(): o
 * hitstop e a câmera lenta da esquiva perfeita afetam o mundo inteiro, e
 * concentrar isso num ponto só evita que algum sistema continue rodando em
 * velocidade normal durante o congelamento.
 */
EN.Main = (function () {
  var canvas, ctx, dpr, vw, vh;
  var currentSession = null;
  var mainSession = null; // referência estável ao mundo principal — arena/mina nunca a sobrescrevem
  var paused = true;
  var last = performance.now();
  var deathT = -1;

  function boot() {
    canvas = document.getElementById("world-canvas");
    ctx = canvas.getContext("2d");
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    resize();
    wireResize();

    EN.Controls.init();
    wireToast();
    EN.Menu.init();
    wireDespertarScreen();
    wireDeathScreen();
    wireLandscapeLock();
    wireAudio();

    EN.Story.init({
      toast: toast,
      refreshTracker: refreshQuestTracker,
    });

    if (EN.State.hasProfile()) {
      startMainWorld();
    } else {
      EN.CharCreation.open(function () {
        startMainWorld();
      });
    }

    requestAnimationFrame(loop);
  }

  /*
   * O navegador só deixa tocar som depois de um gesto do usuário, então o
   * áudio é ligado no primeiro toque em qualquer lugar — o mesmo gesto que
   * já pedia fullscreen. Antes disso tudo vira silêncio, nunca erro.
   */
  function wireAudio() {
    var muteBtn = document.getElementById("btn-mute");
    var saved = EN.State.data.settings;
    EN.Audio.setMuted(!!saved.muted);
    muteBtn.textContent = saved.muted ? "🔇" : "🔊";

    function unlockOnce() {
      EN.Audio.unlock();
      EN.Audio.startAmbient();
      refreshAmbience();
    }
    document.addEventListener("pointerdown", unlockOnce, { once: true });

    muteBtn.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      EN.Audio.unlock();
      var m = EN.Audio.setMuted(!EN.Audio.isMuted());
      saved.muted = m;
      EN.State.persist();
      muteBtn.textContent = m ? "🔇" : "🔊";
      if (!m) {
        EN.Audio.startAmbient();
        refreshAmbience();
        EN.Audio.play("ui");
      }
    });
  }

  var lastAmbience = null;
  function refreshAmbience() {
    if (!currentSession) return;
    var phase = currentSession.isMine ? "mina" : currentSession.meta.dayT >= 6 && currentSession.meta.dayT < 18 ? "dia" : "noite";
    if (phase === lastAmbience) return;
    lastAmbience = phase;
    EN.Audio.setAmbience(phase);
  }

  // Encantaria é desenhado para paisagem (ver docs/GDD.md "UX MOBILE"). Em
  // navegadores/contextos que permitem, o primeiro toque tenta fullscreen +
  // travar a orientação; onde isso não é permitido (ex.: dentro de um
  // iframe sem permissão), o CSS de #rotate-prompt garante que o jogo só
  // aparece quando o aparelho já está em paisagem — nunca deixa o jogador
  // preso num layout espremido.
  function wireLandscapeLock() {
    document.addEventListener(
      "pointerdown",
      function () {
        try {
          var el = document.documentElement;
          var req = el.requestFullscreen || el.webkitRequestFullscreen;
          var fsPromise = req ? req.call(el) : Promise.resolve();
          Promise.resolve(fsPromise)
            .then(function () {
              return screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape");
            })
            .catch(function () {});
        } catch (e) {}
      },
      { once: true }
    );
  }

  // Alguns navegadores/WebViews não disparam 'resize' de forma confiável
  // ao girar o aparelho (ou disparam com as dimensões ainda desatualizadas
  // por um instante) -- era isso que deixava o jogo "preso num
  // quadradinho" depois de virar pra paisagem. Escutamos todo evento
  // plausível, com uma segunda checagem atrasada depois de girar, e ainda
  // mantemos um relógio de segurança comparando o tamanho real da janela
  // contra o que o canvas acha que é, corrigindo sozinho se ficarem
  // diferentes por qualquer motivo.
  function wireResize() {
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", function () {
      resize();
      setTimeout(resize, 120);
      setTimeout(resize, 400);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", resize);
    }
    if (screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener("change", function () {
        setTimeout(resize, 60);
      });
    }
    setInterval(function () {
      if (canvas.width !== Math.round(window.innerWidth * dpr) || canvas.height !== Math.round(window.innerHeight * dpr)) {
        resize();
      }
    }, 500);
  }

  function resize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;
    canvas.style.width = vw + "px";
    canvas.style.height = vh + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  // ---------- sessão do mundo principal ----------
  function startMainWorld() {
    document.getElementById("screen-game").classList.add("active");
    var save = EN.State.data;
    var appearance = save.profile.appearance;
    var player = EN.Player.create(appearance, save.progress.classId, save.world.x, save.world.y, save.progress.level);
    EN.Player.applyTalent(player, save.progress.talentId);
    player.healCharges = save.world.inventory.curas;

    var session = {
      isArena: false,
      isMine: false,
      player: player,
      enemies: EN.World.spawnInitialEnemies(),
      coins: [],
      projectiles: [],
      enemyProjectiles: [],
      fx: [],
      worldCanvas: EN.World.bake(),
      worldW: EN.World.WORLD_W,
      worldH: EN.World.WORLD_H,
      camera: EN.Camera.create(player.x, player.y),
      meta: save.world,
      areaName: "Sítio",
      showNpcs: true,
    };

    /*
     * A Onça de Bruma guarda a trilha do sudoeste. Ela pode ser morta
     * antes da missão que pede isso existir (o mundo é aberto, e é assim
     * que tem que ser) — então enquanto a missão estiver ativa e ela não
     * estiver no mapa, ela volta. Não é respawn de grinding: é a trilha
     * continuar fechada até a missão certa mandar abrir.
     */
    session.tick = function (s) {
      if (!EN.Quests.isActive("trilha")) return;
      var present = s.enemies.some(function (e) {
        return e.defId === "onca_de_bruma" && !e.dead;
      });
      if (!present && Math.hypot(s.player.x - 240, s.player.y - 720) > 420) {
        s.enemies.push(EN.Enemy.spawn("onca_de_bruma", 240, 720));
      }
    };

    EN.World.populate({
      onDespertar: handleDespertarTrigger,
      onTalkNpc: handleTalkNpc,
      onSay: handleSay,
      onOpenChest: handleOpenChest,
      onPickupItem: handlePickupItem,
      onCropInteract: handleCropInteract,
      onEnterHouse: handleEnterHouse,
      onEnterMine: handleEnterMine,
      onEnterBrejo: handleEnterBrejo,
    });
    mainSession = session;
    setSession(session);
    refreshQuestTracker();
    showDailyWelcome(player);

    // se o Despertar já aconteceu mas por algum motivo nenhuma classe foi
    // confirmada (estado inconsistente improvável, mas tratado com
    // segurança), reabre a seleção direto, sem repetir a narrativa
    if (save.progress.despertarSeen && !save.progress.classId) {
      openClassSelect();
    }
  }

  /*
   * Visita diária. Aparece só uma vez por dia real e só depois que o
   * mundo já está montado — chegar no jogo e levar um pop-up antes de
   * ver o personagem é a pior primeira impressão possível.
   *
   * O atraso curto deixa a tela aparecer primeiro.
   */
  function showDailyWelcome(player) {
    setTimeout(function () {
      var r = EN.Daily.claim(player);
      if (!r) return;
      var el = document.getElementById("daily-card");
      if (!el) return;
      document.getElementById("daily-streak").textContent = r.streak;
      document.getElementById("daily-label").textContent =
        r.streak === 1 ? "primeiro dia" : r.streak + " dias seguidos";
      var linhas = ["🪙 +" + r.vintem + " Vintém"];
      if (r.curas) linhas.push("🧪 +" + r.curas + " preparo de ervas");
      if (r.capped) linhas.push("no teto — o prêmio não cresce mais");
      else linhas.push("volte amanhã pra um prêmio maior");
      document.getElementById("daily-rewards").innerHTML = linhas
        .map(function (l) { return "<span>" + l + "</span>"; })
        .join("");
      el.classList.add("show");
      EN.Audio.play("levelup");
      setTimeout(function () {
        el.classList.remove("show");
      }, 4200);
    }, 900);
  }

  function handleTalkNpc(npcId) {
    EN.Story.talkTo(npcId);
  }

  function handleDespertarTrigger() {
    var save = EN.State.data;
    if (save.progress.despertarSeen) {
      toast("As raízes negras continuam ali, silenciosas.");
      return;
    }
    EN.Story.flag("raiz_tocada");
    EN.Story.playDespertarVision(function () {
      playDespertarSequence();
    });
  }

  function handleSay(id) {
    // o redemoinho é o encontro com o Saci — ver pet.js#meet
    if (id === "saci") return EN.Pet.meet(toast);
    var lines = {
      porta: "A porta está fechada por enquanto — ninguém em casa.",
    };
    toast(lines[id] || "...");
  }

  function handleOpenChest() {
    EN.State.data.world.vintem += 12;
    EN.State.persist();
    toast("Baú aberto: +12 Vintém");
  }

  function handlePickupItem() {
    EN.State.data.world.vintem += 3;
    EN.State.persist();
    toast("Você pegou uma Erva Selvagem (+3 Vintém em feira futura)");
  }

  /*
   * Roça. Um canteiro só faz uma coisa por vez, e qual é depende do
   * estágio da planta — então o toque não abre menu quando não precisa:
   * colher e limpar são imediatos, só plantar pergunta o quê.
   */
  function handleCropInteract(index) {
    var st = EN.Farm.stageOf(EN.Farm.state()[index]);
    if (st.stage === "maduro") {
      var r = EN.Farm.harvest(index);
      toast(r.msg);
      EN.Audio.play(r.ok ? "coin" : "ui");
      return;
    }
    if (st.stage === "crescendo") {
      toast("🌱 " + st.def.name + " ainda verde — " + EN.Farm.falta(st.faltam) + ".");
      return;
    }
    if (st.stage === "murcho") {
      EN.Farm.clear(index);
      toast("Canteiro limpo. Dá pra plantar de novo.");
      EN.Audio.play("ui");
      return;
    }
    openSeeds(index);
  }

  /*
   * Escolha de semente. Pausa o jogo: gastar Vintém é decisão, e a roça
   * fica longe o bastante de inimigo pra ninguém ser pego escolhendo.
   */
  var seedEls = null;
  function openSeeds(index) {
    if (!seedEls) {
      seedEls = {
        box: document.getElementById("screen-seeds"),
        rows: document.getElementById("seed-rows"),
        close: document.getElementById("seeds-close"),
        purse: document.getElementById("seed-purse"),
      };
      seedEls.close.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        closeSeeds();
      });
      seedEls.box.addEventListener("pointerdown", function (e) {
        if (e.target === seedEls.box) closeSeeds();
      });
    }
    seedEls.box.classList.add("open");
    paused = true;
    EN.Audio.play("ui");
    renderSeeds(index);
  }

  function closeSeeds() {
    if (!seedEls) return;
    seedEls.box.classList.remove("open");
    paused = false;
  }

  function renderSeeds(index) {
    var vintem = EN.State.data.world.vintem;
    seedEls.purse.textContent = vintem + " Vintém";
    seedEls.rows.innerHTML = EN.Farm.ORDER.map(function (id) {
      var c = EN.Farm.CROPS[id];
      var pode = vintem >= c.cost;
      var lucro = c.pay - c.cost;
      return (
        '<button class="seed-card' + (pode ? "" : " broke") + '" data-crop="' + id + '"' + (pode ? "" : " disabled") + ">" +
        '<span class="seed-icon">' + c.icon + "</span>" +
        '<span class="seed-name">' + c.name + "</span>" +
        '<span class="seed-line">custa <b>' + c.cost + "</b> · rende <b>" + c.pay + "</b></span>" +
        '<span class="seed-line">' + c.days + (c.days > 1 ? " dias" : " dia") + " · lucro <b>+" + lucro + "</b></span>" +
        '<span class="seed-rot">estraga em ' + (c.days + c.rot) + " dias</span>" +
        "</button>"
      );
    }).join("");

    Array.prototype.forEach.call(seedEls.rows.querySelectorAll(".seed-card"), function (btn) {
      btn.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        if (btn.disabled) return;
        var r = EN.Farm.plant(index, btn.dataset.crop);
        toast(r.msg);
        if (r.ok) {
          EN.Audio.play("coin");
          closeSeeds();
        }
      });
    });
  }

  // ---------- Mina Santa Luzia ----------
  function handleEnterMine() {
    if (!EN.State.data.progress.classId) {
      toast("Você não entraria aí do jeito que está. Ainda não.");
      return;
    }
    var s = EN.Mine.enter(mainSession, {
      onExit: function () {
        toast("Você volta pra luz do sol.");
        refreshQuestTracker();
      },
      onBossStart: function () {
        EN.Story.reachArea("camara");
        EN.Story.playBossIntro(function () {});
      },
      onBossPhase: function (phase) {
        toast("O Carcará muda de postura — fase " + phase);
      },
      onBossDefeated: function () {
        EN.Story.flag("boss_morto");
        EN.Story.playBossDefeat(function () {});
      },
    });
    EN.Story.reachArea("mina");
    refreshQuestTracker();
    return s;
  }

  // ---------- Casa do jogador ----------
  function handleEnterHouse() {
    EN.House.enter(mainSession, {
      onExit: function () {
        refreshQuestTracker();
      },
      onChest: openChest,
      onSleep: function () {
        // o Saci colhe durante a noite: o companheiro adianta trabalho,
        // não substitui o jogador (ele pega no máximo `harvestCap`)
        if (!EN.House.sleep(mainSession.player, toast)) return;
        var colheu = EN.Pet.harvestOvernight();
        if (colheu) {
          setTimeout(function () {
            toast("🌀 O Saci colheu " + colheu.count + " canteiro" + (colheu.count > 1 ? "s" : "") + " durante a noite: +" + colheu.vintem + " Vintém.");
            EN.Audio.play("coin");
          }, 1400);
        }
      },
    });
  }

  /*
   * Baú de casa. Aberto por cima do jogo com a sessão PAUSADA — mexer no
   * inventário é decisão, não reflexo, mesmo que dentro de casa não haja
   * inimigo nenhum pra atrapalhar.
   */
  var chestEls = null;
  function openChest() {
    if (!chestEls) {
      chestEls = {
        box: document.getElementById("screen-chest"),
        rows: document.getElementById("chest-rows"),
        close: document.getElementById("chest-close"),
      };
      chestEls.close.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        closeChest();
      });
      chestEls.box.addEventListener("pointerdown", function (e) {
        if (e.target === chestEls.box) closeChest();
      });
    }
    chestEls.box.classList.add("open");
    paused = true;
    EN.Audio.play("ui");
    renderChest();
  }

  function closeChest() {
    if (!chestEls) return;
    chestEls.box.classList.remove("open");
    paused = false;
  }

  function renderChest() {
    var p = mainSession.player;
    var store = EN.House.storage();
    chestEls.rows.innerHTML = EN.House.STORABLE.map(function (it) {
      return (
        '<div class="chest-row" data-item="' + it.id + '">' +
        '<span class="chest-icon">' + it.icon + "</span>" +
        '<span class="chest-name">' + it.name + "</span>" +
        '<button class="chest-btn" data-dir="-1">◀ tirar</button>' +
        '<span class="chest-count"><b>' + (store[it.id] || 0) + '</b> guardado</span>' +
        '<button class="chest-btn" data-dir="1">guardar ▶</button>' +
        '<span class="chest-held">com você: <b>' + EN.House.heldOf(it.id, p) + "</b></span>" +
        "</div>"
      );
    }).join("");

    Array.prototype.forEach.call(chestEls.rows.querySelectorAll(".chest-btn"), function (btn) {
      btn.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        var row = btn.closest(".chest-row");
        var dir = Number(btn.dataset.dir);
        // Vintém anda de 10 em 10: mover moeda de 1 em 1 seria castigo
        var step = row.dataset.item === "vintem" ? 10 : 1;
        if (EN.House.move(row.dataset.item, dir * step, mainSession.player)) EN.Audio.play("coin");
        renderChest();
      });
    });
  }

  // ---------- Brejo das Lanternas (Ato 3) ----------
  function handleEnterBrejo() {
    // o Brejo só abre depois do Carcará: entrar antes seria pular o ato
    // inteiro que explica o que é um Veio envenenado
    if (!EN.Quests.isDone("carcara")) {
      toast("A trilha do brejo está tomada de mato. Ainda não é hora.");
      return;
    }
    var s = EN.Brejo.enter(mainSession, {
      onExit: function () {
        toast("Você deixa o brejo pra trás. O cheiro de queimado fica.");
        refreshQuestTracker();
      },
      onIara: function () {
        EN.Story.talkToIara();
      },
      onBossStart: function () {
        EN.Story.reachArea("poco");
        EN.Story.playBoitataIntro(function () {});
      },
      onBossPhase: function (phase) {
        toast(phase === 3 ? "O fogo do Boitatá fica branco de quente." : "O Boitatá se enrola — fase " + phase);
      },
      onBossDefeated: function () {
        EN.Story.flag("boitata_apaziguado");
        EN.Story.playBoitataDefeat(function () {});
      },
    });
    EN.Story.reachArea("brejo");
    refreshQuestTracker();
    return s;
  }

  // ---------- O Despertar ----------
  function wireDespertarScreen() {
    document.getElementById("desp-continue").addEventListener("click", function () {
      document.getElementById("screen-despertar").classList.remove("active");
      openClassSelect();
    });
  }

  function playDespertarSequence() {
    paused = true;
    document.getElementById("screen-despertar").classList.add("active");
  }

  function openClassSelect() {
    document.getElementById("screen-game").classList.remove("active");
    var appearance = EN.State.data.profile.appearance;
    EN.ClassSelect.open(appearance, function (classId) {
      confirmClass(classId, appearance);
    });
  }

  // SEMPRE aplica a classe em `mainSession` — nunca na sessão ativa no
  // momento, porque se o jogador confirmou a partir da arena, a sessão
  // ativa é a temporária da arena (ver arena.js), e escolher a classe ali
  // não pode virar progresso permanente no lugar errado.
  function confirmClass(classId, appearance) {
    EN.State.data.progress.despertarSeen = true;
    EN.State.data.progress.classId = classId;
    EN.State.persist();
    document.getElementById("screen-classselect").classList.remove("active");
    document.getElementById("screen-game").classList.add("active");
    EN.Player.applyClass(mainSession.player, classId, true, EN.State.data.progress.level);
    EN.Player.applyTalent(mainSession.player, EN.State.data.progress.talentId);
    toast("Você agora é " + EN.Classes.getById(classId).name + "!");
    setSession(mainSession);
    EN.Story.flag("classe_escolhida");
    refreshQuestTracker();
    maybeOpenTalentChoice();
  }

  // chamado pela arena quando o jogador toca "ESCOLHER ESTA CLASSE"
  function confirmClassFromArena(classId, appearance) {
    confirmClass(classId, appearance);
  }

  // troca a sessão ativa de volta para o mundo principal sem mexer em
  // classe/telas — usado quando a arena/mina é encerrada
  function restoreMainSession() {
    setSession(mainSession);
  }

  /*
   * Escolha de talento do nível 5 (GDD Seção 11). Abre sozinha assim que o
   * jogador atinge o nível com uma classe definida, e só uma vez: o id
   * escolhido fica no save e é reaplicado a cada carregamento.
   */
  function maybeOpenTalentChoice() {
    var p = mainSession && mainSession.player;
    if (!p || !EN.Player.canChooseTalent(p)) return;
    var talents = EN.Classes.talentsFor(p.classId);
    if (!talents) return;

    paused = true;
    var screen = document.getElementById("screen-talent");
    document.getElementById("talent-prompt").textContent = talents.prompt;
    var box = document.getElementById("talent-cards");
    box.innerHTML = "";

    talents.options.forEach(function (opt) {
      var card = document.createElement("button");
      card.className = "talent-card";
      card.innerHTML =
        '<span class="talent-icon">' + opt.icon + "</span>" +
        '<span class="talent-name"></span>' +
        '<span class="talent-summary"></span>';
      card.querySelector(".talent-name").textContent = opt.name;
      card.querySelector(".talent-summary").textContent = opt.summary;
      card.addEventListener("pointerdown", function (ev) {
        ev.preventDefault();
        chooseTalent(opt.id);
      });
      box.appendChild(card);
    });
    screen.classList.add("active");
  }

  function chooseTalent(talentId) {
    EN.State.data.progress.talentId = talentId;
    EN.State.persist();
    EN.Player.applyTalent(mainSession.player, talentId);
    document.getElementById("screen-talent").classList.remove("active");
    paused = false;
    EN.Audio.play("levelup");
    var def = EN.Classes.getTalent(mainSession.player.classId, talentId);
    toast("Novo talento: " + (def ? def.name : talentId));
  }

  // ---------- morte ----------
  function wireDeathScreen() {
    document.getElementById("death-continue").addEventListener("click", function () {
      document.getElementById("screen-death").classList.remove("active");
      respawn();
    });
  }

  function respawn() {
    if (EN.Mine.current()) EN.Mine.exit();
    var p = mainSession.player;
    p.hp = p.hpMax;
    p.st = p.stMax;
    p.mp = p.mpMax;
    p.state = "idle";
    p.stateT = 0;
    p.invuln = 1.2;
    p.combo = 0;
    p.comboT = 0;
    p.attackLock = 0;
    p.dodgeT = 0;
    p.kbx = 0;
    p.kby = 0;
    EN.Combat.clearStatus(p);
    p.x = 300;
    p.y = 300;
    // perder parte do Vintém é a única punição — o protótipo não tira
    // progresso de missão nem nível, pra morrer não desfazer história
    var lost = Math.floor(EN.State.data.world.vintem * 0.25);
    EN.State.data.world.vintem -= lost;
    EN.State.persist();
    deathT = -1;
    setSession(mainSession);
    if (lost > 0) toast("Você perdeu " + lost + " Vintém no caminho de volta.");
  }

  // tabela simples de labels por tipo de ataque, espelhando o bestiário
  var ELEM_LABELS = {
    magic:    ["Dano mágico", "Magia"],
    fire:     ["Fogo"],
    cut:      ["Corte"],
    pierce:   ["Perfuração"],
    physical: ["Dano físico"],
  };

  function getElementalMult(def, atkType) {
    var labels = ELEM_LABELS[atkType] || [];
    function matchList(list) {
      return (list || []).some(function (entry) {
        return labels.some(function (l) { return entry.indexOf(l) >= 0 || l.indexOf(entry) >= 0; });
      });
    }
    if (matchList(def.weaknesses)) return 1.5;
    if (matchList(def.resistances)) return 0.65;
    return 1;
  }

  // Único funil de dano a inimigo: aplica o dano E o feedback visual
  // (número flutuante + estouro de impacto) no mesmo lugar, pra nenhum
  // caminho de dano (corpo-a-corpo, projétil, especial) esquecer o
  // feedback -- essa era exatamente a reclamação de "não sei se acertei".
  function applyDamage(session, enemy, dmg, heavy, crit, opts) {
    opts = opts || {};
    // guardado ANTES do ajuste elemental: fraqueza elemental engorda o
    // número e pinta o dano como pesado, mas não é um golpe pesado de
    // verdade — e é o golpe de verdade que abre a casca do Tatu
    var realHeavy = !!heavy;
    if (opts.atkType && enemy.def) {
      var mult = getElementalMult(enemy.def, opts.atkType);
      if (mult !== 1) {
        dmg = Math.max(1, Math.round(dmg * mult));
        heavy = heavy || mult > 1; // fraqueza visual = peso de heavy
      }
    }
    var wasDead = enemy.dead;
    EN.Enemy.damage(
      enemy,
      dmg,
      function (killed) {
        if (session.isArena) return;
        session.coins.push({ x: killed.x, y: killed.y, t: 0, taken: false });
        grantXP(
          EN.Enemy.isBoss(killed) ? 220
          : EN.Enemy.isMiniBoss(killed) ? 90
          : killed.def && killed.def.category === "territorial" ? 12
          : 9
        );
        EN.Story.enemyKilled(killed.defId);
        EN.Menu.recordSeen(killed.defId, true);
        if (EN.Enemy.isBoss(killed) && session.onBossDefeated) {
          session.boss = null;
          session.onBossDefeated();
        }
        if (EN.Enemy.isMiniBoss(killed) && session.boss === killed) session.boss = null;
      },
      // o peso do golpe importa pro Tatu de Pedra: só o pesado abre a
      // casca. Sem repassar isso aqui a blindagem dele nunca cederia.
      { heavy: realHeavy }
    );
    session.fx.push({ kind: "dmgnum", x: enemy.x, y: enemy.y - 14, t: 0, value: dmg, heavy: !!heavy, crit: !!crit });
    if (!wasDead) {
      session.fx.push({ kind: "hit", x: enemy.x, y: enemy.y, t: 0 });
      EN.Audio.play(crit ? "crit" : "hit");
    }
  }

  var XP_PER_LEVEL_BASE = 18,
    XP_PER_LEVEL_STEP = 10;
  function xpForLevel(level) {
    return XP_PER_LEVEL_BASE + (level - 1) * XP_PER_LEVEL_STEP;
  }
  function grantXP(amount) {
    var pr = EN.State.data.progress;
    if (pr.level >= 30) return;
    pr.xp += amount;
    var levelsGained = 0;
    while (pr.level < 30 && pr.xp >= xpForLevel(pr.level)) {
      pr.xp -= xpForLevel(pr.level);
      pr.level++;
      levelsGained++;
    }
    if (levelsGained > 0) {
      pr.attrPoints = (pr.attrPoints || 0) + levelsGained * 3;
      // preserva a vida atual proporcionalmente em vez de curar tudo: subir
      // de nível no meio da luta não pode ser uma cura grátis
      var p = mainSession.player;
      var hpPct = p.hp / p.hpMax;
      EN.Player.applyClass(p, p.classId, false, pr.level);
      p.hp = Math.max(p.hp, Math.round(p.hpMax * hpPct));
      EN.Audio.play("levelup");
      toast("✦ Nível " + pr.level + "! +" + (levelsGained * 3) + " pontos de atributo");
      maybeOpenTalentChoice();
    }
    EN.State.persist();
  }

  // ---------- sessão ativa ----------
  function setSession(session) {
    currentSession = session;
    paused = false;
    // o companheiro entra junto: sem isso ele tentaria atravessar o mapa
    // inteiro atrás do jogador ao mudar de área
    EN.Pet.teleportTo(session.player.x, session.player.y);
    document.getElementById("status-panel").style.display = session.meta.showClock === false ? "none" : "";
    EN.Controls.bind({
      player: session.player,
      enemies: session.enemies,
      session: session,
      dealDamage: function (enemy, dmg, heavy, crit) {
        applyDamage(session, enemy, dmg, heavy, crit);
      },
      spawnProjectile: function (desc) {
        desc.life = desc.life || 1.4;
        session.projectiles.push(desc);
      },
      spawnFx: function (kind, data) {
        data.kind = kind;
        data.t = 0;
        session.fx.push(data);
      },
      toast: toast,
    });
  }

  // ---------- loop genérico ----------
  function loop(now) {
    var dtReal = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (currentSession) {
      var blocked = paused || EN.Dialogue.isOpen();
      var dt = blocked ? 0 : EN.Combat.consumeFrame(dtReal);
      if (!blocked) update(currentSession, dt);
      render(currentSession, dt);
      EN.HUD.update(currentSession.player, currentSession.meta, currentSession.player.appearance);
      EN.Controls.refreshVisuals(currentSession.player);
      refreshQuestTracker();
      updateBossBar(currentSession);
      refreshAmbience();
    }
    requestAnimationFrame(loop);
  }

  /*
   * Converte um ponto de TELA (px CSS, como vem de um evento de mouse) pro
   * ponto correspondente no MUNDO. É o inverso exato do que render() faz:
   * lá o contexto recebe scale(zoom) e o mundo é desenhado a partir de
   * `origin`, então aqui divide-se pelo zoom e soma-se a origem.
   *
   * O tremor de câmera é ignorado de propósito: ele é um efeito visual de
   * poucos pixels, e deixar a mira tremer junto tornaria acertar durante
   * um impacto uma questão de sorte.
   */
  function screenToWorld(sx, sy) {
    if (!currentSession || !vw) return null;
    var s = currentSession;
    var origin = EN.Camera.getViewOrigin(s.camera, vw, vh, s.worldW, s.worldH);
    var zoom = s.camera.zoom;
    return { x: origin.x + sx / zoom, y: origin.y + sy / zoom };
  }

  function update(s, dt) {
    var p = s.player;
    var move = EN.Controls.getMoveVector();
    p.pendingMove = move;
    // mira do cursor (nula no toque) — o jogador desenha e ataca na
    // direção dela, ver EN.Player.update
    p.aim = EN.Controls.getAim();
    EN.Player.update(p, dt, move, s.enemies);
    EN.Combat.updateKnockback(p, dt);
    p.x = Math.max(20, Math.min(s.worldW - 20, p.x));
    p.y = Math.max(20, Math.min(s.worldH - 20, p.y));
    EN.Camera.update(s.camera, p.x, p.y, dt);

    if (p.hp <= 0) {
      deathT = deathT < 0 ? 0 : deathT + dt;
      if (deathT > 1.3) {
        paused = true;
        document.getElementById("screen-death").classList.add("active");
      }
    }

    var api = {
      damagePlayer: function (dmg, sx, sy, src) {
        var r = EN.Player.takeDamage(p, dmg, sx, sy, src);
        if (!r) return;
        if (r.parried) {
          EN.Audio.play("perfect");
          s.fx.push({ kind: "perfect", x: p.x, y: p.y, t: 0, label: "APARADO" });
        } else if (r.shielded) {
          EN.Audio.play("ui");
        } else {
          EN.Audio.play(p.hp <= 0 ? "death" : "hurt");
        }
      },
      spawnEnemyProjectile: function (desc) {
        s.enemyProjectiles.push(desc);
      },
      spawnFx: function (kind, data) {
        data.kind = kind;
        data.t = 0;
        s.fx.push(data);
      },
      onBossPhase: s.onBossPhase,
    };

    s.enemies.forEach(function (e) {
      EN.Enemy.update(e, dt, p, api);
      // bestiário se preenche sozinho: ver a criatura de perto já basta,
      // não precisa matar. Fora da arena, que é sessão descartável.
      if (!s.isArena && !e.dead && e.state !== "disguised" && Math.hypot(e.x - p.x, e.y - p.y) < 260) {
        if (EN.Menu.recordSeen(e.defId, false)) {
          toast("📖 " + e.def.name + " entrou no bestiário");
        }
      }
      // mini-chefe entra na barra grande do HUD assim que engaja, e sai
      // dela se o jogador conseguir se descolar — não é uma luta trancada
      if (EN.Enemy.isMiniBoss(e) && !e.dead) {
        if (e.state !== "patrol" && !s.boss) s.boss = e;
        else if (e.state === "patrol" && s.boss === e) s.boss = null;
      }
    });
    s.enemies = s.enemies.filter(function (e) {
      if (e.dead) {
        e.deadT += dt;
        return e.deadT < 0.5;
      }
      return true;
    });

    EN.Pet.update(s, dt);
    updateProjectiles(s, dt);
    updateEnemyProjectiles(s, dt, p);

    s.coins.forEach(function (c) {
      c.t += dt;
      if (!c.taken && Math.hypot(c.x - p.x, c.y - p.y) < 24) {
        c.taken = true;
          s.meta.vintem += 2 + Math.floor(Math.random() * 4);
        EN.Audio.play("coin");
      }
    });
    s.coins = s.coins.filter(function (c) {
      return !c.taken;
    });

    s.fx.forEach(function (f) {
      f.t += dt;
    });
    s.fx = s.fx.filter(function (f) {
      return f.t < 1.1;
    });

    if (s.tick) s.tick(s, dt);

    // só o mundo aberto avança o relógio e grava a posição do jogador —
    // gravar as coordenadas da mina ou do brejo devolveria o jogador pro
    // meio do nada ao recarregar o save
    if (!s.isArena && !s.isMine && !s.isBrejo) {
      s.meta.dayT = (s.meta.dayT + dt * (24 / 240)) % 24;
      if (s.meta.dayT < 0.02) s.meta.day++;
      s.meta.x = p.x;
      s.meta.y = p.y;
      s.meta.level = EN.State.data.progress.level; // espelho só pra exibição no HUD
      s.meta.inventory.curas = p.healCharges;
      persistThrottled();
      if (s.enemies.length < 4 && Math.random() > 0.994) {
        s.enemies.push(EN.Enemy.spawn("rato_mato_corrompido", 300 + Math.random() * 900, 300 + Math.random() * 500));
      }
    } else if (s.isArena && s.enemies.filter(function (e) { return !e.dead; }).length === 0 && !s._respawning) {
      s._respawning = true;
      setTimeout(function () {
        s.respawnEnemies();
        s._respawning = false;
      }, 1200);
    }
  }

  function updateProjectiles(s, dt) {
    s.projectiles.forEach(function (proj) {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.life -= dt;
      s.enemies.forEach(function (e) {
        if (e.dead || proj.hit) return;
        if (Math.hypot(e.x - proj.x, e.y - proj.y) < e.r + proj.r) {
          var roll = EN.Combat.rollDamage(proj.dmg);
          var atkType = proj.magic && proj.burn ? "fire" : proj.magic ? "magic" : proj.burn ? "fire" : "physical";
          applyDamage(s, e, roll.value, !!proj.burn, roll.crit, { atkType: atkType });
          if (proj.burn) EN.Combat.applyStatus(e, "queimando", 3, 3);
          EN.Combat.knockback(e, proj.x, proj.y, 160);
          EN.Combat.hitstop(0.035);
          proj.hit = true;
        }
      });
    });
    s.projectiles = s.projectiles.filter(function (pr) {
      return pr.life > 0 && !pr.hit;
    });
  }

  function updateEnemyProjectiles(s, dt, p) {
    s.enemyProjectiles = s.enemyProjectiles || [];
    var born = [];
    s.enemyProjectiles.forEach(function (proj) {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;

      /*
       * FOGO QUE FICA (Boitatá). Uma poça de fogo não some ao encostar no
       * jogador: ela continua lá e volta a queimar depois de um respiro
       * curto. É o que transforma a arena num espaço que encolhe em vez de
       * um projétil que se esquiva uma vez e acabou.
       *
       * Água apaga: no Brejo o fogo sobre a água some ~4x mais rápido, e
       * é assim que o mapa ensina a resposta sem uma linha de tutorial.
       */
      if (proj.lingering) {
        var onWater = s.isWater && s.isWater(proj.x, proj.y);
        proj.life -= dt * (onWater ? 4.5 : 1);
        if (proj.touchCd > 0) proj.touchCd -= dt;
        if (proj.touchCd <= 0 && Math.hypot(p.x - proj.x, p.y - proj.y) < p.r + proj.r) {
          proj.touchCd = 0.55;
          EN.Player.takeDamage(p, proj.dmg, proj.x, proj.y);
          EN.Combat.applyStatus(p, "queimando", 2, 2);
        }
        return;
      }

      proj.life -= dt;
      if (proj.hit) return;
      if (Math.hypot(p.x - proj.x, p.y - proj.y) < p.r + proj.r) {
        EN.Player.takeDamage(p, proj.dmg, proj.x, proj.y);
        if (proj.burns) EN.Combat.applyStatus(p, "queimando", 3, 3);
        proj.hit = true;
      }
      // chama do Boitatá: onde ela cai (por acerto ou por fim de voo)
      // vira uma poça que continua queimando
      if (proj.leavesFire && (proj.hit || proj.life <= 0)) {
        born.push({
          x: proj.x, y: proj.y, vx: 0, vy: 0, r: 16, dmg: 7,
          kind: "fogo", lingering: true, touchCd: 0, life: 4.5,
        });
      }
    });
    s.enemyProjectiles = s.enemyProjectiles.filter(function (pr) {
      return pr.life > 0 && !pr.hit;
    });
    if (born.length) s.enemyProjectiles = s.enemyProjectiles.concat(born);
  }

  var persistTimer = null;
  function persistThrottled() {
    if (persistTimer) return;
    persistTimer = setTimeout(function () {
      persistTimer = null;
      EN.State.persist();
    }, 1000);
  }

  function render(s, dt) {
    ctx.clearRect(0, 0, vw, vh);
    var origin = EN.Camera.getViewOrigin(s.camera, vw, vh, s.worldW, s.worldH);
    var zoom = s.camera.zoom;
    var shake = EN.Combat.shakeOffset();

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(shake.x, shake.y);
    ctx.drawImage(s.worldCanvas, origin.x, origin.y, origin.viewW, origin.viewH, 0, 0, origin.viewW, origin.viewH);

    s.coins.forEach(function (c) {
      drawCoin(ctx, c, origin.x, origin.y);
    });
    if (s.showNpcs) {
      EN.World.drawNpcs(ctx, origin.x, origin.y, performance.now() / 1000);
      EN.Farm.draw(ctx, origin.x, origin.y, performance.now() / 1000);
    }
    s.enemies.forEach(function (e) {
      EN.Enemy.draw(ctx, e, origin.x, origin.y);
    });
    EN.Pet.draw(ctx, origin.x, origin.y);
    EN.Player.draw(ctx, s.player, origin.x, origin.y);

    s.projectiles.forEach(function (pr) {
      var fill = pr.magic ? (pr.burn ? "#ff9a40" : "#c9a8f2") : (pr.burn ? "#ff6a20" : "#7fe0c9");
      var stroke = pr.magic ? (pr.burn ? "#c04a00" : "#7c4fd1") : (pr.burn ? "#8a2a00" : "#2f8f75");
      drawProjectile(pr, origin.x, origin.y, fill, stroke);
    });
    (s.enemyProjectiles || []).forEach(function (pr) {
      if (pr.lingering) return drawFirePool(pr, origin.x, origin.y);
      if (pr.kind === "chama") return drawProjectile(pr, origin.x, origin.y, "#ffb43a", "#a03a00");
      if (pr.kind === "espinho") return drawThorn(pr, origin.x, origin.y);
      var isFeather = pr.kind === "pena";
      drawProjectile(pr, origin.x, origin.y, isFeather ? "#c9a227" : "#f2e05a", isFeather ? "#6b5220" : "#a08a1a");
    });

    s.fx.forEach(function (f) {
      drawFx(f, origin.x, origin.y);
    });

    // trilha guia: fica ACIMA do chão e ABAIXO da atmosfera, então a
    // noite escurece ela junto com o resto em vez de deixá-la boiando
    if (!s.isArena) EN.Guide.drawTrail(ctx, s, origin.x, origin.y, performance.now() / 1000);

    if (!s.isArena && !s.isMine && !s.isBrejo) {
      if (!EN.State.data.progress.despertarSeen) {
        EN.World.drawDespertarBeacon(ctx, origin.x, origin.y, performance.now() / 1000);
      }
      EN.World.drawAtmosphere(ctx, s.meta.dayT, origin.x, origin.y, origin.viewW, origin.viewH, dt);
    } else if (s.isMine) {
      drawMineDarkness(ctx, s, origin);
    } else if (s.isBrejo) {
      // o Brejo é sempre noite: névoa fria por cima e uma vinheta mais
      // aberta que a da mina (é céu aberto, não galeria)
      ctx.fillStyle = "rgba(12,22,34,.42)";
      ctx.fillRect(0, 0, origin.viewW, origin.viewH);
      var bp = { x: s.player.x - origin.x, y: s.player.y - origin.y };
      var bg = ctx.createRadialGradient(bp.x, bp.y, 120, bp.x, bp.y, 460);
      bg.addColorStop(0, "rgba(6,14,20,0)");
      bg.addColorStop(1, "rgba(6,14,20,.7)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, origin.viewW, origin.viewH);
    }
    ctx.restore();
  }

  function drawProjectile(pr, camX, camY, fill, stroke) {
    var px = pr.x - camX, py = pr.y - camY;
    if (pr.magic) {
      // halo de brilho por trás do núcleo
      var g = ctx.createRadialGradient(px, py, 0, px, py, pr.r * 4.5);
      g.addColorStop(0, pr.burn ? "rgba(255,130,20,.75)" : "rgba(190,110,255,.7)");
      g.addColorStop(0.45, pr.burn ? "rgba(255,80,10,.3)" : "rgba(140,60,230,.25)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, pr.r * 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(px, py, pr.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = pr.magic ? 1.5 : 1;
    ctx.stroke();
    if (pr.magic) {
      // núcleo branco central
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.beginPath();
      ctx.arc(px, py, pr.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /*
   * Poça de fogo do Boitatá. Precisa ser lida como PERIGO PERMANENTE, não
   * como projétil: por isso não tem contorno duro, pulsa, e some por
   * transparência conforme a vida acaba — o jogador consegue prever
   * quando aquele pedaço de chão volta a ser seguro.
   */
  function drawFirePool(pr, camX, camY) {
    var x = pr.x - camX,
      y = pr.y - camY;
    var t = performance.now() / 1000;
    var fade = Math.min(1, pr.life / 1.2);
    var pulse = 0.86 + Math.sin(t * 9 + pr.x) * 0.14;
    var r = pr.r * pulse;

    ctx.save();
    ctx.globalAlpha = fade;
    var g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, "rgba(255,240,170,.9)");
    g.addColorStop(0.35, "rgba(255,150,30,.75)");
    g.addColorStop(0.75, "rgba(210,60,10,.4)");
    g.addColorStop(1, "rgba(140,30,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();

    // línguas de fogo subindo: dá altura ao que senão seria uma mancha
    ctx.fillStyle = "rgba(255,190,70,.72)";
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2 + t * 1.3;
      var fh = 8 + Math.abs(Math.sin(t * 7 + i * 1.9)) * 11;
      var fx = x + Math.cos(a) * r * 0.5;
      ctx.beginPath();
      ctx.moveTo(fx - 3, y);
      ctx.quadraticCurveTo(fx, y - fh, fx + 3, y);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawThorn(pr, camX, camY) {
    var x = pr.x - camX,
      y = pr.y - camY;
    var a = Math.atan2(pr.vy, pr.vx);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = "#4a6b30";
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, 3.2);
    ctx.lineTo(-5, -3.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#22381a";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // escuridão da mina: vinheta que segue o jogador, o suficiente pra
  // mudar o clima sem esconder inimigo a ponto de virar injustiça
  function drawMineDarkness(ctx, s, origin) {
    var px = s.player.x - origin.x,
      py = s.player.y - origin.y;
    var g = ctx.createRadialGradient(px, py, 60, px, py, 300);
    g.addColorStop(0, "rgba(8,6,10,0)");
    g.addColorStop(1, "rgba(8,6,10,.82)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, origin.viewW, origin.viewH);
  }

  function drawCoin(ctx, c, camX, camY) {
    var x = c.x - camX,
      y = c.y - camY - 6;
    var sq = Math.abs(Math.sin(c.t * 4));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.4 + sq * 0.6, 1);
    ctx.fillStyle = "#f2b705";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.arc(-2, -2, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Feedback de combate: número de dano flutuante (confirma "eu acertei"),
  // estouro de impacto no alvo, arco de golpe (confirma "eu ataquei",
  // acertando ou não) e onda de choque dos golpes em área dos inimigos.
  function drawFx(f, camX, camY) {
    var x = f.x - camX,
      y = f.y - camY;
    if (f.kind === "dmgnum") {
      var t = Math.min(1, f.t / 0.7);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t * 1.1);
      var size = f.crit ? 16 : f.heavy ? 13 : 11;
      ctx.font = "bold " + size + "px 'Silkscreen', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = f.crit ? "#ff8a3a" : f.heavy ? "#f2b705" : f.burn ? "#ff6820" : f.bleed ? "#cc3333" : "#fff3e0";
      ctx.strokeStyle = "#1c1210";
      ctx.lineWidth = 3;
      var ny = y - 16 - t * 18;
      var label = String(f.value) + (f.crit ? "!" : "");
      ctx.strokeText(label, x, ny);
      ctx.fillText(label, x, ny);
      ctx.restore();
    } else if (f.kind === "hit") {
      var ht = f.t / 0.22;
      if (ht > 1) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - ht);
      ctx.strokeStyle = "#fff3e0";
      ctx.lineWidth = 2;
      for (var i = 0; i < 4; i++) {
        var ang = (i / 4) * Math.PI * 2 + 0.4;
        var r0 = 4 + ht * 4,
          r1 = 8 + ht * 12;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0);
        ctx.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1);
        ctx.stroke();
      }
      ctx.restore();
    } else if (f.kind === "slash") {
      var st = f.t / 0.22;
      if (st > 1) return;
      var fa = Math.atan2(f.fy, f.fx);
      var range = f.heavy ? 44 : f.finisher ? 40 : 30;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - st) * 0.95;
      ctx.strokeStyle = f.heavy || f.finisher ? "#f2b705" : "#eef7f0";
      ctx.lineWidth = f.heavy ? 4 : f.finisher ? 3.6 : 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(x, y - 8, range * (0.5 + st * 0.6), fa - (f.heavy ? 1.1 : 0.75), fa + (f.heavy ? 1.1 : 0.75));
      ctx.stroke();
      ctx.restore();
    } else if (f.kind === "shock") {
      var kt = f.t / 0.45;
      if (kt > 1) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - kt) * 0.8;
      ctx.strokeStyle = f.friendly ? "#7fe0c9" : "#e0483a";
      ctx.lineWidth = 4 - kt * 2.5;
      ctx.beginPath();
      ctx.arc(x, y, (f.radius || 60) * (0.2 + kt * 0.95), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (f.kind === "perfect") {
      var pt = f.t / 0.7;
      if (pt > 1) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - pt);
      ctx.font = "bold 13px 'Silkscreen', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd66b";
      ctx.strokeStyle = "#1c1210";
      ctx.lineWidth = 3;
      var label = f.label || "ESQUIVA PERFEITA";
      ctx.strokeText(label, x, y - 30 - pt * 14);
      ctx.fillText(label, x, y - 30 - pt * 14);
      ctx.restore();
    }
  }

  // ---------- HUD de missão e chefe ----------
  var trackerEls = null;
  function refreshQuestTracker() {
    if (!trackerEls) {
      trackerEls = {
        box: document.getElementById("quest-tracker"),
        title: document.getElementById("quest-title"),
        obj: document.getElementById("quest-objective"),
        where: document.getElementById("quest-where"),
      };
    }
    if (!trackerEls.box) return;
    var cur = EN.Quests.active();
    if (!cur || !cur.objective) {
      trackerEls.box.classList.remove("visible");
      return;
    }
    trackerEls.box.classList.add("visible");
    trackerEls.title.textContent = cur.quest.title;
    var need = cur.objective.count || 1;
    var suffix = need > 1 ? " (" + cur.state.count + "/" + need + ")" : "";
    trackerEls.obj.textContent = cur.objective.text + suffix;
    // onde fica o objetivo, em palavras — o minimapa mostra, a trilha
    // aponta, e isso aqui nomeia. Três formas de responder a mesma
    // pergunta, porque "pra onde eu vou?" é a que mais faz largar o jogo.
    var hint = currentSession ? EN.Guide.targetHint(currentSession) : "";
    trackerEls.where.textContent = hint;
    trackerEls.where.style.display = hint ? "" : "none";
  }

  var bossEls = null;
  function updateBossBar(s) {
    if (!bossEls) {
      bossEls = {
        box: document.getElementById("boss-bar"),
        name: document.getElementById("boss-name"),
        fill: document.getElementById("boss-fill"),
        phase: document.getElementById("boss-phase"),
      };
    }
    if (!bossEls.box) return;
    var boss = s.boss;
    if (!boss || boss.dead) {
      bossEls.box.classList.remove("visible");
      return;
    }
    bossEls.box.classList.add("visible");
    bossEls.name.textContent = boss.def.name;
    bossEls.fill.style.transform = "scaleX(" + Math.max(0, boss.hp / boss.hpMax) + ")";
    // mini-chefe não tem fases: mostrar "Fase 1" o tempo todo mentiria
    // sobre a estrutura da luta
    bossEls.phase.textContent = EN.Enemy.isMiniBoss(boss)
      ? boss.hp / boss.hpMax < 0.5 ? "Acuada" : "Espreitando"
      : "Fase " + boss.phase;
  }

  // ---------- toast ----------
  var toastEl, toastTimer;
  function wireToast() {
    toastEl = document.getElementById("toast");
  }
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2400);
  }

  return {
    boot: boot,
    setSession: setSession,
    restoreMainSession: restoreMainSession,
    confirmClassFromArena: confirmClassFromArena,
    toast: toast,
    refreshQuestTracker: refreshQuestTracker,
    screenToWorld: screenToWorld,
    // o menu congela a sessão enquanto está aberto — distribuir ponto de
    // atributo com um inimigo em cima não é escolha, é acidente
    setPaused: function (v) {
      paused = !!v;
    },
    getSession: function () {
      return currentSession;
    },
    getMainSession: function () {
      return mainSession;
    },
  };
})();

window.addEventListener("DOMContentLoaded", EN.Main.boot);
