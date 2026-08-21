# Roupas — camada de aparência

Conjuntos iniciais definidos em `prototype/web/src/appearance.js` → `EN.Appearance.outfits`: **Roupa de Roça**, **Traje de Pescador**, **Manto de Viajante**, **Traje de Festa** (cores exatas em `palette_reference.png`).

Hoje cada conjunto é só uma cor de camisa + cor de calça (sem sprite próprio, é recolorização). Se a arte definitiva passar a ter textura/corte por roupa (não só cor), esta pasta recebe um spritesheet por estado por conjunto, mesmo grid/âncora do `base/` — ver `assets/art_direction/CHARACTER_STYLE_GUIDE.md`. Convenção de nome: `<id_da_roupa>/<estado>.png` (ex.: `roca/walk.png`) se for esse o caso, ou `<id_da_roupa>.png` único se continuar sendo só recolorização de uma textura base.
