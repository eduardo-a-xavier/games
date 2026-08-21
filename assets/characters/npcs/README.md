# NPCs

Os 12 NPCs centrais do MVP estão descritos por completo em `docs/GDD.md` Seção 24 (nome, idade, profissão, personalidade, segredo, quest pessoal): Seu Osvaldo, Dona Micaela, Cauã, Iara (a pescadora), Zeca do Boteco, Padre Anselmo, Marisa, Tunico, Deca, Vô Benedito, Iolanda, Batista.

Nenhum tem sprite próprio ainda — o protótipo hoje só tem um NPC de exemplo genérico ("Zé", em `prototype/web/src/world.js`) usando o mesmo renderizador do jogador, sem aparência distinta. Cada NPC final precisa de:

- Uma aparência própria (pode reusar o sistema de camadas do jogador — Seção 5 do guia de estilo — ou ganhar um design único, a decidir na produção).
- No mínimo os estados `idle` e `walk` (a maioria dos NPCs não entra em combate).
- Uma pasta própria aqui, nomeada por um id estável (sugestão: primeiro nome em minúsculas, ex. `osvaldo/`, `micaela/`), mesmo grid/âncora do `characters/player/base/`.
