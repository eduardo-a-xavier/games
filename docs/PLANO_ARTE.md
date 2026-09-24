# Plano de melhoria visual — Encantaria

Plano para melhorar sprites, cenários, animações, efeitos visuais e interface.
Prioridade: ferramentas gratuitas primeiro. Regra fixa: **nenhuma arte existente
é apagada ou sobrescrita.**

---

## 0. Regras de preservação (valem para todas as fases)

1. Tudo o que está em `/assets` e `prototype/web/assets` é **somente leitura**.
   Arte nova entra em caminhos novos, por exemplo `assets/v2/...`, ou com sufixo
   `_v2`. O que já existe continua sendo o fallback.
2. Trocar uma arte = mudar um caminho em `spriteAtlas.js` / `prepare_web_assets.py`,
   nunca substituir o arquivo antigo.
3. Um commit por lote de arte, com a origem registrada (ferramenta, modelo,
   prompt, custo). Assim qualquer troca pode ser revertida.
4. Antes de qualquer geração paga no Higgsfield: informar o **modelo** e o **custo**
   (`higgsfield generate cost ...`, que não gasta crédito) e esperar autorização
   explícita.

---

## 1. Diagnóstico

### O que já existe
- **Personagem jogável (canônico):** planilhas pixel 360×288
  (`player_sheet`, `guerreiro_sheet`, `mateiro_sheet`, `encantado_sheet`).
  Figuras de ~11–24px de largura e ~17–23px de altura, **uma única direção
  lateral**. Estados: idle, walk, run, attack, heavy, hurt, defeat.
- **NPC Flávio:** planilha no mesmo formato.
- **Arte direcional em alta resolução** (`assets/characters/player/base/`,
  ~137×306 por frame, 4 direções). Pelo commit `209600d`, é a arte **antiga**
  e fica só como rede de segurança. Mostra restos de JPEG e manchas
  (ex.: marca perto do pé em `walk_down.png`).
- **Procedural (placeholder):** 14 inimigos, 4 NPCs, todo o cenário (Sítio,
  arena, mina, brejo, casa), armas, retrato do HUD.
- **UI:** emojis Unicode como ícones; retratos de diálogo também são emoji.
- **VFX:** existe screenshake e tint de dia/noite; **não existe sistema de
  partículas** (nenhum arquivo em `src/` implementa um).

### Problemas que precisam de decisão antes de produzir arte

| # | Problema | Por que importa |
|---|---|---|
| D1 | **A escala é contraditória.** O GDD §58 fala em personagem 32×48, o guia de estilo em frame 40×56 e altura ~35px, mas as planilhas reais têm ~19px de altura. | Qualquer sprite novo feito na escala errada vai destoar ou exigir reescrita do rig. É a primeira decisão. |
| D2 | **As planilhas têm só a vista lateral**, e o jogo se move em 4 direções (GDD §58). | Andar para cima ou para baixo mostra o personagem de lado. Maior lacuna visual do personagem. |
| D3 | **Duas linguagens visuais convivem** (pixel pequeno × ilustração em alta resolução). | Mistura estilos na tela. A alta resolução deveria sair do caminho do jogo, mas continuar arquivada. |
| D4 | **Não há paleta travada** para o pixel art canônico. | Sem paleta fixa, cada lote novo (manual ou IA) muda de tom. |

**Recomendação:** travar a escala das planilhas atuais (célula de 36px,
personagem com ~19px) como padrão oficial, porque é o que o jogador já vê, e
atualizar o GDD/guia para isso. Depois, extrair a paleta das 4 planilhas para
`assets/art_direction/palette_v2.png` (script local, gratuito).

---

## 2. Ferramentas — o que é grátis e o que não é

| Ferramenta | Custo | Uso recomendado |
|---|---|---|
| **LibreSprite** / **Piskel** (web) | Grátis | Desenhar e animar pixel art na célula de 36px. Principal ferramenta de produção. |
| Aseprite | ~US$20 (compilar o código-fonte é grátis) | Alternativa melhor que o LibreSprite, se aceitar pagar. |
| **Código canvas** (já é a base do jogo) | Grátis | VFX, partículas, iluminação, tiles procedurais, animação secundária. |
| **Script Python local** (Pillow) | Grátis | Extrair/travar paleta, quantizar, montar planilhas, validar frames. |
| **Assets CC0** (Kenney, OpenGameArt filtrado por CC0) | Grátis | Referência ou base de tileset e ícones; **exige repintar na paleta D4**, senão destoa. |
| **Higgsfield** | **Pago (créditos)**. Nenhum modelo de geração é gratuito. | Só onde a IA de fato ajuda (ver abaixo), sempre com o custo informado antes. |

### Onde o Higgsfield ajuda e onde não ajuda

- **Não recomendado para sprites de jogo nesta escala.** Modelos de imagem e
  vídeo (incluindo `autosprite`, que exporta frames de 256px) produzem
  "pixel-look" em alta resolução, não pixel art de 19px com paleta travada.
  Reduzir para 36px destrói o detalhe e gera ruído: foi exatamente o
  problema da arte direcional antiga.
- **Útil para:**
  1. **Retratos de diálogo** (substituem os emojis). Retrato aceita mais
     resolução (ex.: 64×64 ou 96×96) e depois é quantizado para a paleta.
  2. **Concept art** de criaturas e cenários, como referência para desenhar
     à mão (ex.: Boitatá, Iara, Mula-sem-cabeça).
  3. **Key art / tela de título / ícone do app.**
  4. **Trilha e SFX** (Seed Audio). Fora do escopo visual, mas é a lacuna do GDD §59.

---

## 3. Fases (ordem recomendada)

### Fase 1 — Fundação (grátis, sem arte nova)
- [ ] Decidir D1 e atualizar GDD §58 e o guia de estilo.
- [ ] Script `assets/tools/extract_palette.py`: paleta canônica a partir das planilhas.
- [ ] Script `assets/tools/quantize_to_palette.py`: qualquer arte nova passa por ele.
- [ ] Mover a arte direcional antiga para `assets/archive/` **por referência**
      (o código aponta para lá) ou só marcá-la como legado. Nenhum arquivo apagado.

### Fase 2 — VFX e animação por código (grátis, maior ganho por esforço)
- [ ] Sistema de partículas leve (`src/particles.js`, pool fixo, sem alocação
      por frame por causa do Android): poeira ao correr e rolar, faíscas no
      acerto, folhas, vagalumes à noite, gotas no brejo, brilho de moeda.
- [ ] Hit-stop (pausa de 2–4 frames no impacto) e flash branco do inimigo ao
      receber dano.
- [ ] Números de dano com curva de easing e cor por tipo (crítico, magia).
- [ ] Squash/stretch aplicado por transformação sobre os sprites existentes
      (pulo, aterrissagem, carga do golpe). Não exige desenhar frame novo.
- [ ] Luz pontual à noite (tochas, vagalumes, magia do Encantado) com
      `globalCompositeOperation` sobre o tint existente.
- [ ] Sombra elíptica consistente sob todas as entidades.

### Fase 3 — Personagem em 4 direções (grátis, trabalho manual)
- [ ] Desenhar `walk_up`/`walk_down` e `idle_up`/`idle_down` no formato da
      planilha atual (célula de 36px), em LibreSprite/Piskel, partindo do frame
      lateral existente como base.
- [ ] Novas planilhas em `prototype/web/assets/player/v2/`; `spriteAtlas.js`
      ganha linhas por direção e cai na planilha atual quando falta uma direção.
- [ ] Mesma coisa para as 3 classes, na ordem idle → walk → attack.

### Fase 4 — Cenário em tiles (grátis)
- [ ] Tileset 16×16 do Sítio: grama (3 variações), terra, borda grama/terra
      (autotile de 16 ou 47 peças), água, cerca, plantação em 4 estágios.
- [ ] Base CC0 do Kenney/OpenGameArt repintada na paleta, **ou** desenho próprio.
- [ ] Renderizar o cenário estático uma vez num canvas offscreen (desempenho
      no Android) e manter o procedural como fallback.
- [ ] Depois: mina, brejo, vila (coreto, capela) seguindo o GDD §58.

### Fase 5 — Inimigos e NPCs (grátis; concept opcional pago)
- [ ] Sprite pixel para os 14 inimigos, em ordem de frequência de aparição
      (Rato-do-Mato, Cão da Estrada, Cipó Vivo primeiro). Mínimo por inimigo:
      idle (2–4 frames), move, telegraph (o aviso de ataque), hit, death.
      O telegraph precisa comunicar o arquétipo (§ASSETS.md).
- [ ] Zé, Seu Osvaldo, Dona Micaela, Batista no formato da planilha do Flávio.
- [ ] *(Opcional, pago)* Concept art dos chefes no Higgsfield para servir de
      referência antes de desenhar.

### Fase 6 — Interface (grátis + retratos opcionalmente pagos)
- [ ] Ícones pixel 16×16 no lugar dos emojis (❤️⚡✦🔒💬✋🎁🧺🚪🔍🌀): ~12
      ícones, desenhados à mão ou a partir de CC0 (Kenney tem um pack de ícones
      de UI) repintados.
- [ ] Moldura 9-slice para diálogos, menus e botões, com o dourado do ipê
      como cor de destaque (GDD §58).
- [ ] Fonte pixel com licença OFL (ex.: da coleção Google Fonts) com
      acentuação completa em PT-BR.
- [ ] *(Opcional, pago)* Retratos de diálogo dos 5 NPCs e do protagonista.

---

## 4. Uso do Higgsfield — protocolo

1. Autenticar (`higgsfield auth login`) e selecionar o workspace
   (`higgsfield workspace set <id>`).
2. `higgsfield account status` → mostrar créditos e plano.
3. `higgsfield model list` → confirmar os modelos disponíveis.
4. Para cada pedido: `higgsfield generate cost <modelo> <params>` → informar
   **modelo + custo em créditos** → **esperar autorização**.
5. Resultado salvo em `assets/v2/generated/<data>_<assunto>/` com
   `SOURCE.md` (modelo, prompt, custo, job id), sempre passando por
   `quantize_to_palette.py` antes de entrar no jogo.

---

## 5. Resumo de custo

| Fase | Custo em créditos |
|---|---|
| 1–4 | 0 |
| 5 (concept dos chefes) | opcional, orçado antes |
| 6 (retratos) | opcional, orçado antes |
