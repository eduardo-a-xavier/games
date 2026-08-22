# Placeholders de arte — o que substituir depois

> A estrutura de pastas onde a arte definitiva deve entrar, o guia de
> estilo completo e as referências de proporção/paleta/pose vivem em
> `/assets/` (raiz do repositório) — ver `/assets/README.md` e
> `/assets/art_direction/CHARACTER_STYLE_GUIDE.md`. Este arquivo continua
> sendo o contrato rápido, específico do código deste protótipo.

O jogador e o NPC Flávio já possuem sprites próprios. Inimigos, os demais
NPCs e o cenário ainda são desenhados por primitivas de canvas em runtime —
ver `src/appearance.js`, `src/enemy.js` e `src/world.js`. Esta lista separa
o que já é arte utilizada do que continua sendo placeholder.

Os assets canônicos ficam em `/assets`. Para servir o app web localmente,
rode `python3 prototype/web/prepare_web_assets.py`; GitHub Pages executa o
mesmo passo automaticamente e o Gradle copia as fontes direto para o APK.

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
- **`chargeAttack` (golpe carregado) também usa arte real**, mas só para o
  Guerreiro: `assets/player/heavy_{down,left,right,up}.png`, com 8/9/9/12
  frames (a planilha-fonte tinha número de poses diferente por direção —
  `spriteAtlas.js` suporta isso). A sequência é dividida em duas metades:
  a primeira acompanha a carga do botão, a segunda toca na soltada. A arte
  mostra o facão, que é a arma do Guerreiro. Personagem COM classe usa a
  planilha da própria classe em todos os estados (ver
  `appearance.js#drawFromAtlas`); a arte direcional só serve o personagem
  ainda sem classe, senão o Malandro sacaria um
  facão do nada.
- **`dodge` (rolamento) também usa arte real**:
  `assets/player/dodge_{down,left,right,up}.png`, com 4/3/4/4 frames. Só as
  poses de rolagem entraram — na planilha-fonte as figuras em pé ficam nas
  pontas e atravessam as duas fileiras da mesma direção, então sairiam
  cortadas ao meio. A sequência inteira é percorrida uma vez durante os
  0,28s do rolamento, sem repetir.
- **Ainda placeholder procedural**: `tool` (uso de ferramenta), sem
  referência recebida ainda; e o `chargeAttack` das classes que não são
  Guerreiro.
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
  (Malandro, id interno `mateiro`), foco (Encantado) — hoje são traços geométricos simples.

## Inimigos (`src/enemy.js`, dados em `src/bestiary.js`)

- Implementados com desenho procedural próprio (não sprite), **14 no total**:
  incluindo Rato-do-Mato Corrompido, Cão da Estrada, Cipó Vivo, Morcego da
  Mina, Vagalume de Defunto, Sapo de Pedra, Onça de Bruma, Boitatá e
  Carcará de Ferro. Mesmo
  contrato de ancoragem que o jogador. Cada um segue um *arquétipo* de
  comportamento (`charger`/`zoner`/`flyer`/`ranged`/`brute`/`boss`) — a
  arte final precisa comunicar o arquétipo à primeira vista, porque é ele
  que o jogador aprende a ler, não a espécie.
- Saci é parcial: só ponto de interação narrativo (`implemented: "interactable"`),
  sem combate/sprite de ação.
- Três entradas do bestiário (19 no total — ver também
  `/assets/creatures/`, uma pasta por criatura com README próprio) têm
  dados completos (habitat, comportamento, ataques, lore etc.) mas
  **nenhuma arte ou IA ainda** — campo `implemented: false`.

## NPCs (`src/world.js#drawNpcs`, conteúdo em `src/story.js`)

- 5 moradores presentes no mundo. Flávio já usa seu spritesheet próprio;
  Zé, Seu Osvaldo, Dona Micaela e Batista continuam desenhados
  proceduralmente como figuras simples diferenciadas por cor de
  roupa/pele/chapéu. **Placeholder** — o GDD Seção 24 descreve 12
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

## Áudio (`src/audio.js`)

- **Não é placeholder no sentido de "faltando"**: o áudio é sintetizado em
  runtime pela Web Audio API, sem nenhum arquivo de som no projeto. São 17
  efeitos (golpe, impacto, crítico, dano, esquiva, esquiva perfeita, cura,
  moeda, nível, missão, tiro, magia, baque em área, rugido do chefe,
  postura quebrada, morte, UI) mais um acorde de ambiente que muda entre
  dia, noite e mina.
- A razão de ser sintetizado está no formato de distribuição: o bundle de
  arquivo único não pode buscar recurso externo, e som em `.mp3`/`.ogg`
  viraria base64 gigante embutido.
- **O que ainda falta**: trilha musical composta (melodia, instrumentação
  regional — ver GDD Seção 59). O sintetizado cobre o *feedback* do
  combate muito bem, mas não substitui uma trilha autoral. Se um dia
  entrar áudio gravado, `EN.Audio.play(nome)` já é o único ponto que o
  resto do jogo chama — trocar a implementação por samples não exige
  tocar em nenhum outro arquivo.
