# Chapéus/acessórios de cabeça — camada de aparência

Apenas **um** estilo definido hoje em `prototype/web/src/appearance.js`: `palha` (chapéu de palha), opcional — a maioria dos personagens não usa nenhum (`appearance.hat === null`).

Mesmo grid 40×56px e âncora (20,40) do `base/`. Como o chapéu é desenhado por cima da cabeça/cabelo em todo estado, um único frame por estilo (não precisa de spritesheet de animação) é suficiente, desde que o offset vertical bata com a cabeça do `base/idle.png` como referência de encaixe.
