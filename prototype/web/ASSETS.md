# Placeholders de arte — o que substituir depois

> A estrutura de pastas onde a arte definitiva deve entrar, o guia de
> estilo completo e as referências de proporção/paleta/pose vivem em
> `/assets/` (raiz do repositório) — ver `/assets/README.md` e
> `/assets/art_direction/CHARACTER_STYLE_GUIDE.md`. Este arquivo continua
> sendo o contrato rápido, específico do código deste protótipo.

Nada neste protótipo usa arte de terceiros. Todo personagem, inimigo e
cenário é desenhado por primitivas de canvas (retângulos/círculos/curvas)
em runtime — ver `src/appearance.js`, `src/enemy.js` e `src/world.js`. Isso
mantém o protótipo 100% autoral e testável sem depender de nenhum asset
pack, mas precisa ser substituído por pixel art definitiva antes do
lançamento. Esta lista é o contrato de substituição.

## Personagem do jogador (`src/appearance.js`, `src/spriteAtlas.js`)

- **A maioria dos estados já usa arte real**, não mais placeholder:
  `idle`, `walk`, `run`, `hurt` (4 spritesheets direcionais cada,
  `assets/player/<estado>_{down,left,right,up}.png`, cópia de
  `/assets/characters/player/base/`) e `attack` — que agora tem uma
  variante **por classe** (`attack_guerreiro` = facão, `attack_mateiro` =
  arco, `attack_encantado` = foco/magia), escolhida em `appearance.js`
  pela classe atual do jogador. `defeat` é uma sequência única sem
  direção (`assets/player/defeat.png`), usada no estado `death`. Tudo
  carregado por `src/spriteAtlas.js` (`EN.SpriteAtlas`) e escolhido por
  `pickDirection()` a partir do vetor de direção do jogador. `run`
  reaproveita os mesmos frames de `walk` tocados mais rápido apenas se
  não houver spritesheet própria — hoje `run` tem sprite própria. Ver
  `/assets/art_direction/CHARACTER_STYLE_GUIDE.md` Seção 3-A para o
  design de referência completo.
- **Ainda placeholder procedural**: `chargeAttack` (Golpe Poderoso, o
  ataque carregado/finisher) e `dodge`. O material de referência recebido
  para `heavy_attack` teve problemas de recorte (cabeça/pés cortados nas
  poses de giro largo, ou vazamento de texto do cabeçalho do sheet) que
  não foram resolvidos com confiança suficiente para substituir o
  placeholder sem introduzir defeitos visuais — decisão consciente de
  manter o desenho procedural até haver uma fonte de arte mais limpa para
  esse estado específico. `tool` (interação com ferramentas) também seguem
  procedural, sem referência recebida ainda.
- **Formato alvo do placeholder procedural**: spritesheet 40×56px por
  frame, ancorado em (20,40) (centro-x, próximo da base — ver
  `/assets/art_direction/proportions_reference.png`), fundo transparente.
- **Camadas** (na ordem em que já são desenhadas — manter a ordem ao trocar
  por sprites reais): sombra → pernas/pants → torso/shirt → arma (se
  ataque) → cabeça/pele → olhos → cabelo → chapéu → arma (se idle).
- **Opções de aparência já modeladas em dados** (`EN.Appearance`), só
  faltam os sprites correspondentes:
  - 4 tons de pele (`clara`, `media`, `morena`, `escura`)
  - 5 estilos de cabelo × 5 cores
  - 4 roupas iniciais (cores já definidas, precisam de arte)
  - 1 chapéu (`palha`)
- **Estados de animação que já existem no código e esperam frames reais**:
  `idle`, `walk`, `run`, `attack`, `chargeAttack`, `dodge`, `hurt`, `tool`,
  `death`. Hoje cada estado é simulado por transformações (bob, lean,
  scale, rotação) em vez de frames desenhados à mão — funcional, mas
  claramente placeholder.
- **Armas por classe** (`drawWeaponShape`): facão (Guerreiro), arco
  (Mateiro), foco (Encantado) — hoje são traços geométricos simples.

## Inimigos (`src/enemy.js`, dados em `src/bestiary.js`)

- Implementados com desenho próprio (não sprite), **7 no total**:
  Rato-do-Mato Corrompido, Cão da Estrada, Cipó Vivo, Morcego da Mina,
  Vagalume de Defunto, Sapo de Pedra e o chefe Carcará de Ferro. Mesmo
  contrato de ancoragem que o jogador. Cada um segue um *arquétipo* de
  comportamento (`charger`/`zoner`/`flyer`/`ranged`/`brute`/`boss`) — a
  arte final precisa comunicar o arquétipo à primeira vista, porque é ele
  que o jogador aprende a ler, não a espécie.
- Saci é parcial: só ponto de interação narrativo (`implemented: "interactable"`),
  sem combate/sprite de ação.
- As outras 11 entradas do bestiário (19 no total — ver também
  `/assets/creatures/`, uma pasta por criatura com README próprio) têm
  dados completos (habitat, comportamento, ataques, lore etc.) mas
  **nenhuma arte ou IA ainda** — campo `implemented: false`.

## NPCs (`src/world.js#drawNpcs`, conteúdo em `src/story.js`)

- 4 moradores presentes no mundo (Zé, Seu Osvaldo, Dona Micaela, Batista),
  desenhados proceduralmente como figuras simples diferenciadas só por
  cor de roupa/pele/chapéu. **Placeholder** — o GDD Seção 24 descreve 12
  NPCs com idade, rotina e personalidade próprias, e cada um precisa de
  sprite e retrato próprios (o retrato aparece na caixa de diálogo, hoje
  substituído por emoji).

## Cenário (`src/world.js`, `src/arena.js`)

- Fundo do Sítio inteiro é gerado por código (grama speckled, caminho de
  terra com jitter, casa, plantação, árvores, pedras, flores, tufos de
  grama). Formato alvo para versão final: tileset 16×16px conforme
  Direção de Arte do GDD (`docs/GDD.md`, Seção 58).
- Chão da arena de teste (`src/arena.js`) é um placeholder ainda mais
  simples (câmara fechada com poste de cerca) — não é para chegar ao
  jogo final, é só um espaço neutro de teste.

## HUD / ícones

- Ícones de habilidade/UI usam emoji Unicode (❤️⚡✦🔒💬✋🎁🧺🚪🔍🌀 etc.)
  em vez de ícones desenhados — renderiza de forma consistente em
  iOS/Android sem exigir spritesheet de UI agora, mas o ideal para
  lançamento é substituir por ícones vetoriais/pixel art próprios com a
  identidade visual final do jogo.
- Retrato do HUD (`#hud-portrait`) é a mesma renderização procedural do
  personagem em miniatura — funciona, mas fica melhor com um retrato
  desenhado à mão quando a arte final existir.

## Áudio

- Nenhum áudio foi implementado nesta etapa (ver pendências no relatório
  final). O gancho para eventos de fase do dia (`EN.World.currentPhase`)
  já existe e pode disparar trilha/ambiente adaptativos quando o áudio for
  adicionado.
