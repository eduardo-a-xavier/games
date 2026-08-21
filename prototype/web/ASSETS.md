# Placeholders de arte — o que substituir depois

Nada neste protótipo usa arte de terceiros. Todo personagem, inimigo e
cenário é desenhado por primitivas de canvas (retângulos/círculos/curvas)
em runtime — ver `src/appearance.js`, `src/enemy.js` e `src/world.js`. Isso
mantém o protótipo 100% autoral e testável sem depender de nenhum asset
pack, mas precisa ser substituído por pixel art definitiva antes do
lançamento. Esta lista é o contrato de substituição.

## Personagem do jogador (`src/appearance.js`)

- **Formato alvo**: spritesheet 32×48px por frame, ancorado nos pés
  (centro-x, base-y), fundo transparente.
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

- Implementados com desenho próprio (não sprite): Rato-do-Mato Corrompido,
  Cipó Vivo. Mesmo contrato de ancoragem que o jogador.
- As outras 17 entradas do bestiário (`src/bestiary.js`) têm dados
  completos (habitat, comportamento, ataques, lore etc.) mas **nenhuma arte
  ou IA ainda** — ver campo `implemented: false` em cada uma.

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
