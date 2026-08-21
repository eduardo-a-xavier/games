# Ícones de habilidade

Um ícone por `AbilityDefinition` em `prototype/web/src/classes.js` (campo `icon`, hoje emoji), usado no botão de Habilidade 1 do HUD de combate e no painel de detalhe da tela de seleção de classe:

| Habilidade | Classe | Emoji atual |
|---|---|---|
| Golpe Poderoso | Guerreiro | 💥 |
| Disparo Preciso | Mateiro | 🎯 |
| Rajada Encantada | Encantado | ✨ |

Convenção de nome: `<id_da_habilidade>.png` (ex.: `golpe_poderoso.png`). Precisa ler bem pequeno (~18–20px, o botão de habilidade no HUD mobile) e ter contraste suficiente contra o anel de cooldown (escurecimento radial, ver `prototype/web/styles.css` `.cd-ring`).

A Habilidade 2 de cada classe ainda não existe (reservada para especializações futuras — GDD Seção 11/12); quando existir, segue a mesma convenção aqui.
