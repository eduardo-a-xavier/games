# Armas equipadas — camada de aparência

Armas iniciais por classe, definidas em `prototype/web/src/classes.js` → `startingEquipment` (id interno usado pelo renderizador em `appearance.js` → `WEAPON_BY_CLASS`):

| Classe | id interno | Nome |
|---|---|---|
| Guerreiro | `facao` | Facão Simples |
| Mateiro | `arco` | Arco Simples |
| Encantado | `foco` | Foco Encantado |

Hoje cada arma é uma forma geométrica simples desenhada por cima do braço durante `attack`/`chargeAttack` (ver `drawWeaponShape` em `appearance.js`) e em repouso perto do quadril em outros estados. Uma arte definitiva por arma precisa de:

- **1 sprite "idle"** (arma na posição de repouso, perto do quadril/costas).
- **1 sprite "swing"**, ou uma pequena sequência, se o golpe precisar de mais leitura do que a rotação procedural atual já dá.

Grid recomendado: 24×24px, ancorado na mão (ponto onde o braço termina em `base/attack.png`). Convenção de nome: `<id_da_arma>_idle.png`, `<id_da_arma>_swing.png`.

A lista completa de armas por tier/variante (Seção 15 do GDD, além do que já está implementado) fica em `docs/GDD.md` — esta pasta só cobre o que já existe no protótipo jogável.
