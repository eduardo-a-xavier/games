window.EN = window.EN || {};

/*
 * Paleta canônica em runtime — espelho EXATO de
 * assets/art_direction/palette_encantaria.json (um teste garante que os
 * dois não divergem). Arte procedural nova (cenário, ícones, partículas)
 * pega cor só daqui, nunca de hex solto.
 */
EN.Palette = {
  grama:     ["#1b3326", "#244a30", "#2f5f37", "#3f7a40", "#5a9447", "#80b05a", "#b0cf73"],
  mata:      ["#10241a", "#173424", "#1f4a2e", "#2d6638", "#43844a"],
  terra:     ["#3a2619", "#553823", "#74502f", "#94693f", "#b38a58", "#d1ae7c"],
  terracota: ["#5a2419", "#833a26", "#ad5535", "#cf7a4f", "#e8a57a"],
  ipe:       ["#6e4510", "#a06a12", "#d39a14", "#f2b705", "#ffd95a", "#fff1b0"],
  pedra:     ["#2a2830", "#3f3d45", "#5a5860", "#7a7880", "#9c9aa0", "#c4c2bc"],
  agua:      ["#142c46", "#1f4a6e", "#2d6d96", "#4a96bc", "#86c6dc", "#d0eef4"],
  madeira:   ["#2e1a14", "#4a2c1e", "#6a432a", "#8c5e3a", "#b0804f"],
  noite:     ["#0a0d1a", "#121a30", "#1e2a4a", "#2e3e6a", "#4a5a8e"],
  encanto:   ["#2e1a52", "#4a2c86", "#7c4fd1", "#a884ec", "#d6c4ff"],
  perigo:    ["#3e0e12", "#6e1a1e", "#a8282a", "#e0483a", "#ff8a6a"],
  cura:      ["#14482c", "#2f8f5a", "#6fdc8c", "#c8ffd0"],
  flor:      ["#8e3a6e", "#d46aa6", "#f0b4d4", "#e8c9e0"],
  ui:        ["#0e0c0a", "#1c1814", "#2e2820", "#f3e6c8", "#ffffff"],
};
