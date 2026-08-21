# assets/

Estrutura de produção de arte de Encantaria. Nada aqui é dependência de build do protótipo (`prototype/web/`) — o jogo hoje desenha tudo proceduralmente como placeholder (ver `prototype/web/ASSETS.md`). Esta pasta é o destino final de onde a arte definitiva deve entrar, organizada pra bater com o código sem precisar de refatoração:

```
assets/
├── art_direction/     guia de estilo + referências (proporção, paleta, pose)
├── tools/              ferramenta que gera os placeholders atuais a partir do jogo
├── characters/
│   ├── player/         corpo base + camadas (cabelo, roupa, chapéu, arma)
│   └── npcs/            os 12 NPCs do MVP (GDD Seção 24)
├── creatures/           uma pasta por criatura do bestiário (prototype/web/src/bestiary.js)
└── ui/                  ícones de classe, habilidade e item
```

**Comece por** `art_direction/CHARACTER_STYLE_GUIDE.md` — proporções, grid de frame, ancoragem e o sistema de camadas que o código já assume. Cada subpasta tem seu próprio `README.md` com o contrato específico (que arquivos são esperados, convenção de nome, de onde os dados/lore vêm no código).

Os arquivos que já existem em `characters/player/base/` e as três imagens de `art_direction/` **não são arte definitiva** — foram exportados automaticamente do renderizador procedural do jogo (`prototype/web/src/appearance.js`) pela ferramenta em `tools/sprite_export.html`, só pra a estrutura já nascer com algo real e coerente com o que roda no protótipo hoje, em vez de pastas vazias.
