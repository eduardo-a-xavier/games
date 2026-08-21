window.EN = window.EN || {};

/*
 * Caixa de diálogo modal com texto revelado letra a letra e escolhas
 * opcionais. É o único lugar do jogo que sabe COMO uma conversa aparece na
 * tela — story.js só descreve o que é dito, nunca mexe em DOM.
 *
 * Formato de um roteiro (array de nós):
 *   { who, icon, text }                        fala simples
 *   { who, icon, text, choices: [{label, value}] }   fala + escolha
 *
 * O valor da escolha volta em onEnd(value), e é isso que quests.js usa
 * para ramificar (ver o padrão de 4 abordagens do GDD Seção 30).
 */
EN.Dialogue = (function () {
  var root, elWho, elIcon, elText, elChoices, elHint;
  var script = null,
    idx = 0,
    onEnd = null,
    picked = null;
  var typed = 0,
    typing = false,
    fullText = "";
  var lastT = 0;

  function ensureDom() {
    if (root) return;
    root = document.getElementById("dialogue");
    elWho = document.getElementById("dlg-who");
    elIcon = document.getElementById("dlg-icon");
    elText = document.getElementById("dlg-text");
    elChoices = document.getElementById("dlg-choices");
    elHint = document.getElementById("dlg-hint");
    root.addEventListener("pointerdown", function (e) {
      // clicar numa escolha não pode contar como "avançar"
      if (e.target.closest(".dlg-choice")) return;
      advance();
    });
  }

  function isOpen() {
    return !!script;
  }

  function play(lines, opts) {
    ensureDom();
    opts = opts || {};
    script = lines.slice();
    idx = -1;
    picked = null;
    onEnd = opts.onEnd || null;
    root.classList.add("open");
    advance();
  }

  function advance() {
    if (!script) return;
    // primeiro toque completa o texto em vez de pular a fala
    if (typing) {
      typed = fullText.length;
      typing = false;
      renderText();
      renderChoices();
      return;
    }
    var cur = script[idx];
    if (cur && cur.choices && !picked) return; // trava até escolher

    idx++;
    if (idx >= script.length) return close();
    var node = script[idx];
    elWho.textContent = node.who || "";
    elIcon.textContent = node.icon || "💬";
    fullText = node.text || "";
    typed = 0;
    typing = true;
    lastT = performance.now();
    elChoices.innerHTML = "";
    elHint.style.display = "none";
    renderText();
    requestAnimationFrame(tick);
  }

  function tick(now) {
    if (!typing || !script) return;
    var dt = now - lastT;
    lastT = now;
    typed = Math.min(fullText.length, typed + dt / 16);
    renderText();
    if (typed >= fullText.length) {
      typing = false;
      renderChoices();
      return;
    }
    requestAnimationFrame(tick);
  }

  function renderText() {
    elText.textContent = fullText.slice(0, Math.floor(typed));
  }

  function renderChoices() {
    var node = script[idx];
    if (node && node.choices) {
      elChoices.innerHTML = "";
      node.choices.forEach(function (c) {
        var b = document.createElement("button");
        b.className = "dlg-choice";
        b.textContent = c.label;
        b.addEventListener("pointerdown", function (ev) {
          ev.stopPropagation();
          picked = c.value;
          elChoices.innerHTML = "";
          advance();
        });
        elChoices.appendChild(b);
      });
      elHint.style.display = "none";
    } else {
      elHint.style.display = "";
    }
  }

  function close() {
    root.classList.remove("open");
    var result = picked;
    var cb = onEnd;
    script = null;
    onEnd = null;
    picked = null;
    if (cb) cb(result);
  }

  return { play: play, isOpen: isOpen };
})();
