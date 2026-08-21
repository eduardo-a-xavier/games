# Ícones de classe

Usados na tela "Escolha seu Caminho" (cards + painel de detalhe) e no retrato compacto do HUD. Definidos em `prototype/web/src/classes.js` → campo `icon` de cada `ClassDefinition`, hoje emoji:

| Classe | Emoji atual |
|---|---|
| Guerreiro | ⚔️ |
| Mateiro | 🏹 |
| Encantado | ✨ |

Substituir mantendo leitura clara em ~24–32px (tamanho do ícone no card de seleção) e em ~16px (tamanho no HUD). Convenção de nome: `<id_da_classe>.png` (ex.: `guerreiro.png`). Novas classes futuras (Benzedeiro, Alquimista, Malandro — ver `docs/GDD.md` Seção 7) só precisam de um novo arquivo aqui + uma entrada em `classes.js`, nada mais no código muda.
