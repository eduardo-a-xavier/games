# Guia de Estilo — Personagens de Encantaria

> Referência para quem for produzir a arte definitiva dos personagens. **O ciclo de caminhada do jogador já usa arte real** (Seção 3-A) — o resto (idle, ataque, esquiva, criaturas) ainda usa o renderizador procedural do protótipo como placeholder, ver `proportions_reference.png` e `palette_reference.png` nesta pasta (geradas a partir de `prototype/web/src/appearance.js`, não desenhadas à mão).

---

## 1. Identidade visual

Pixel art 2D, vista top-down levemente angulada, colorida e aconchegante de dia, misteriosa e contida à noite — ver `docs/GDD.md` Seção 58 (Direção de Arte) para a diretriz completa do jogo. Para personagens especificamente:

- **Legível em tela pequena.** O personagem ocupa poucos centímetros num celular; silhueta clara importa mais que detalhe fino. Teste sempre em ~40–60px de altura na tela, não só ampliado no editor.
- **Charmoso, não infantilizado.** Proporções levemente estilizadas (cabeça um pouco maior que o realismo, corpo compacto) sem virar caricatura. Mistura arquitetura/roupa rural e urbana brasileira — evitar estereótipo.
- **Silhueta > detalhe.** Cada estado de animação (Seção 3-B) precisa ser reconhecível só pela forma, mesmo sem cor.

## 2. Proporções

Ver `proportions_reference.png` para a régua visual. Medidas do rig atual (o que o código já assume, portanto o que qualquer sprite novo precisa respeitar para encaixar sem reescrever `player.js`/`appearance.js`):

| Parte | Medida (px, escala 1×) |
|---|---|
| Altura total (chão até topo da cabeça) | ~35px |
| Cabeça (diâmetro) | 19px |
| Torso (largura × altura) | 22 × 15px |
| Pernas (cada, largura × altura) | 6 × 12px |
| Braço (comprimento) | ~11px |
| **Frame de exportação** | 40 × 56px |
| **Ponto de ancoragem** | (20, 40) — centro-x, próximo da base, com folga abaixo pra sombra |

Proporção cabeça:corpo ≈ 1:2.7 — mais "boneco" que realista, deliberadamente. **A arte real do `walk` (Seção 3-A) tem proporção mais naturalista** (cabeça proporcionalmente menor, corpo mais alongado) — as duas convivem hoje porque cobrem estados diferentes; alinhar as proporções entre os dois estilos é uma decisão de produção em aberto, não algo já resolvido.

## 3-A. Design definitivo do personagem principal (arte real)

O design abaixo já está em produção e substitui o placeholder procedural para os estados `idle`, `walk`, `run`, `hurt`, `attack` (por classe) e `defeat` — é a referência que qualquer arte nova do protagonista deve seguir:

- **Cabelo:** castanho, cacheado/volumoso.
- **Pele:** tom médio.
- **Roupa:** camisa manga curta terracota/ferrugem, lenço/bandana vermelho-escuro no pescoço.
- **Acessório:** bolsa transversal (satchel) marrom-claro no quadril.
- **Calça:** verde-oliva/cinza, barra dobrada (rolled cuffs).
- **Calçado:** botas marrons.

Referências completas nesta pasta: `player_concept_turnaround.jpg` (down/left/up + poses duplicadas), `player_concept_sheet.jpg` (frente/costas/lados + grid de proporção + close-up de rosto + demonstração em escala de jogo), `player_concept_walkcycles_source.jpg` (a planilha-fonte de onde os frames reais foram recortados — 4 direções × 5 frames, fundo em xadrez removido por chroma-key de borda).

**Arquivos já em uso no jogo** (`prototype/web/src/spriteAtlas.js` + `assets/characters/player/base/`, cópia local em `prototype/web/assets/player/`), todos spritesheet horizontal, 4 direções (`_down/_left/_right/_up`) exceto `defeat` que não tem direção, fundo transparente:

- `walk_{down,left,right,up}.png` — 5 frames cada, ~137×306px por frame.
- `idle_{down,left,right,up}.png` — 4 frames cada.
- `run_{down,left,right,up}.png` — 6 frames cada, animação de corrida própria (não é mais `walk` tocado mais rápido).
- `hurt_{down,left,right,up}.png` — 3 frames cada.
- `attack_guerreiro_{down,left,right,up}.png` — 6 frames cada, ataque de facão.
- `attack_mateiro_{down,left,right,up}.png` — 8 frames cada, ataque de arco. `EN.SpriteAtlas`/`appearance.js` escolhem o conjunto `attack_<classe>` certo a partir da classe atual do jogador; sem classe (`Sem classe`), cai no placeholder procedural de "mãos vazias".
- `attack_encantado_{down,left,right,up}.png` — 6 frames em `down/left/right`, 4 em `up` (contagem de frame por direção não precisa ser igual — `spriteAtlas.js` suporta isso).
- `defeat.png` — 4 frames, sequência única sem direção, usada no estado `death` (a queda já está desenhada nos frames, o código não aplica mais rotação por cima quando esse sprite está disponível).

`right` **não** é o espelho de `left` em nenhum desses conjuntos — cada direção é um frame desenhado à parte.

**O que ainda falta pra esse design**: `chargeAttack` (Golpe Poderoso) e `dodge` continuam no placeholder procedural da Seção 3-B. A referência recebida para `heavy_attack` teve problemas de recorte (cabeça/pés cortados em poses de giro largo, ou vazamento de cabeçalho do sheet) que não foram resolvidos com segurança suficiente para publicar sem defeito visível — decisão consciente de manter o placeholder até haver fonte de arte mais limpa. `tool` também segue procedural, sem referência recebida.

## 3-B. Estados de animação (contrato geral / placeholder procedural)

Todos já existem como estados de máquina no código (`player.js`/`appearance.js`) — a arte final só precisa de frames para eles, a lógica de transição já funciona. `idle`, `walk`, `run`, `attack`, `hurt` e `death` já usam arte real (Seção 3-A); `chargeAttack` e `dodge` ainda são o placeholder procedural descrito abaixo:

| Estado | Uso | Frames sugeridos |
|---|---|---|
| `idle` | parado | 4 (respiração leve) |
| `walk` | andando | 6 (ciclo de marcha completo) |
| `run` | correndo (joystick no talo) | 6 |
| `attack` | ataque normal (toque) | 4 (preparo → contato → recuo) |
| `chargeAttack` | segurando pra golpe pesado | 4 (progressão 0→100% de carga) |
| `dodge` | esquiva | 3 |
| `hurt` | recebeu dano | 2 |
| `tool` | interagindo/usando ferramenta | 4 |
| `death` | HP zerado | 5 |

Os arquivos em `characters/player/base/` seguem exatamente essa lista (um spritesheet horizontal por estado, ver `assets/tools/sprite_export.html`).

**Direção:** o protótipo só resolve a direção do olhar/arma por espelhamento simples (não há 4/8 direções desenhadas). Se a arte final for direcional, o contrato de nomes é `idle_down.png`, `idle_up.png`, `idle_side.png` etc. — decidir isso é a próxima escolha de produção, não está travado no código.

## 4. Formato de arquivo

- **Spritesheet horizontal**, um arquivo por estado (ex.: `walk.png` = todos os frames de caminhar lado a lado).
- **Frame:** 40×56px, fundo transparente, personagem ancorado em (20, 40) — ver `proportions_reference.png`.
- **Escala de exportação:** 1× (pixel art nativo). O jogo faz o upscale na tela, nunca a arte.
- **Paleta:** ver `palette_reference.png`. Cores de pele/cabelo/roupa são dados (`prototype/web/src/appearance.js`), não fixas por sprite — arte definitiva precisa continuar suportando recolorização por camada (Seção 5) ou fornecer variantes por opção.

## 5. Sistema de camadas (customização)

A arquitetura (`appearance.js`) já separa a aparência em camadas independentes — a arte final deve manter essa separação, não fundir tudo num sprite único:

1. **Corpo/tom de pele** — 4 tons definidos (`clara`, `media`, `morena`, `escura`).
2. **Cabelo** — 5 estilos × 5 cores.
3. **Roupa** — 4 conjuntos iniciais (torso+pernas juntos por enquanto).
4. **Chapéu** — opcional, 1 estilo hoje (`palha`).
5. **Arma equipada** — por classe (facão, arco, foco), desenhada por cima do braço durante `attack`/`chargeAttack`.

Cada camada = pasta própria em `characters/player/` (`hair/`, `clothes/`, `hats/`, `weapons/`), um arquivo por opção, mesmo grid de 32×48 e mesma ancoragem do `base/` pra encaixar sem ajuste manual de offset.

## 6. Criaturas (`assets/creatures/`)

Uma pasta por criatura do bestiário (`prototype/web/src/bestiary.js`), nomeada pelo mesmo `id` usado no código — isso é o que permite o jogo carregar o sprite certo pelo id sem mapeamento manual. Cada pasta recebe, no mínimo, um `idle.png` e um `attack.png`; o resto dos estados segue a mesma lista da Seção 3-B, conforme a criatura precisar (uma planta como o Cipó Vivo não precisa de `run`, por exemplo).

**Antes de desenhar uma criatura do folclore**, ler a entrada correspondente em `bestiary.js` (lore, categoria, pistas de corrupção) — a arte precisa comunicar a categoria à primeira vista:

- **Hostil**: postura de ataque, cores mais saturadas/quentes de alerta.
- **Territorial**: mais estática/enraizada, comunica "não se aproxime" sem parecer agressiva à distância.
- **Neutra/Narrativa**: silhueta menos ameaçadora, geralmente com algum elemento de luz/brilho (Saci, Iara).
- **Guardiã**: maior, mais imponente, sem ler como vilã.

Criaturas afetadas pela corrupção do Encantado (ver `corruptionVisual` em cada entrada de `bestiary.js`) precisam do sinal visual descrito lá (raízes negras, olhos alterados etc.) — é a pista que ensina ao jogador a regra "nem toda criatura é inimiga, mas corrupção é sempre sinal de alerta".

## 7. UI (`assets/ui/`)

- `classes/` — um ícone por classe (`guerreiro`, `mateiro`, `encantado`, ...), usado na tela "Escolha seu Caminho" e no retrato do HUD. Hoje são emoji (⚔️🏹✨); substituir mantendo leitura em ~24px.
- `abilities/` — um ícone por `AbilityDefinition` (`prototype/web/src/classes.js`), mesmo critério de tamanho.
- `items/` — ícones de item/inventário (ainda não há um inventário completo no protótipo; reservado pra quando existir).

## 8. Como isto foi gerado

**Placeholder procedural** (`player_reference.png`, `proportions_reference.png`, `palette_reference.png`, e o conteúdo de `characters/player/base/` que não é `walk_*.png`): exportado automaticamente do renderizador procedural em `prototype/web/src/appearance.js` pela ferramenta `assets/tools/sprite_export.html` (abrir num navegador a partir da raiz do repositório). Rodar essa ferramenta de novo depois de qualquer mudança em `appearance.js` mantém os placeholders honestos com o que está realmente no jogo.

**Arte real do `walk`** (`walk_down.png`, `walk_left.png`, `walk_right.png`, `walk_up.png`): recortada de `player_concept_walkcycles_source.jpg` (fornecida já como planilha de ciclo de caminhada em 4 direções × 5 frames) pela ferramenta `assets/tools/extract_walkcycle_sheet.py` (Python + Pillow). O fundo em xadrez (JPEG, sem canal alfa real) é removido por *flood fill* a partir das bordas da imagem — qualquer pixel alcançável a partir da borda e parecido com uma das cores do xadrez vira transparente, o que preserva bordas anti-aliased do personagem sem review manual. Reaproveitável pra próximas planilhas no mesmo layout (`python3 assets/tools/extract_walkcycle_sheet.py <planilha.jpg> <pasta_saida>`); layouts diferentes precisam recalibrar os parâmetros de seção/coluna do script.

**Arte real de `idle`, `run`, `hurt`, `attack_guerreiro`, `attack_mateiro`, `attack_encantado` e `defeat`**: mesma técnica de *flood fill* a partir das bordas, aplicada planilha por planilha a referências fornecidas em lotes (cada uma com seu próprio layout de fundo — xadrez ou cinza-chapado, com ou sem barra de título, com ou sem borda de grade preta entre frames). Cada planilha precisou de calibração própria de faixa de conteúdo (varredura de densidade de pixel-de-fundo por linha/coluna pra achar onde cada frame começa/termina, já que os layouts não são consistentes entre lotes) — não existe um script único reaproveitável como o do walk cycle porque cada fonte tinha um template diferente; o processo foi feito sob demanda por recorte via Pillow. `attack_guerreiro` (facão), `attack_mateiro` (arco) e `attack_encantado` (foco/magia) vieram de três planilhas de ataque distintas, uma por classe, escolhidas em runtime pela classe do jogador (Seção 3-A).

**Pendência conhecida — `heavy_attack`**: a planilha de referência para o golpe carregado (Golpe Poderoso / `chargeAttack`) teve duas tentativas de calibração, ambas com defeitos residuais (cabeça/pés cortados nas poses de giro largo/agachado, ou vazamento de texto de cabeçalho, ou resíduo de xadrez em alguns frames) — não foi integrada ao jogo por decisão consciente de não publicar arte com defeito visível. `chargeAttack` continua no placeholder procedural até uma fonte mais limpa estar disponível.
