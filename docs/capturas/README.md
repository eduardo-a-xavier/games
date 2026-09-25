# Antes e depois — capturas reais

Capturas de Chromium headless com `prototype/web/tools/capture.js`: mesmo save, mesmas posições e mesma ferramenta nas duas versões. **Antes** é o commit `6c3fbd5` (antes da evolução gráfica); **depois** é a qualidade Alta. Nenhuma imagem foi montada à mão, só colocada lado a lado.

| Arquivo | Cena |
|---|---|
| `antes_depois_dia.jpg` | Sítio de dia: cenário em pixel art, ipê, ícones pixel no HUD |
| `antes_depois_noite_casa.jpg` | Noite na casa: janelas acesas, lampião, lamparina do jogador |
| `antes_depois_noite_mina.jpg` | Noite perto da Mina: raízes corrompidas, grama morta |
| `antes_depois_crepusculo.jpg` | Crepúsculo |
| `antes_depois_combate.jpg` | Combate: camada de pixel das criaturas, partículas |

## Métricas medidas (Chromium headless na nuvem, 915×412 CSS, densidade 2)

O FPS com CPU normal fica preso em 60 pelo vsync nas duas versões. O que muda é o tempo de trabalho por quadro, isto é, JS + canvas dentro de `requestAnimationFrame`:

| Cena | Antes: mediana / p95 | Depois (Alto): mediana / p95 |
|---|---|---|
| Dia | 0,6 / 0,9 ms | 1,2 / 1,8 ms |
| Noite na casa | 0,6 / 1,0 ms | 1,4 / 1,8 ms |
| Noite na Mina | 0,6 / 1,2 ms | 1,4 / 1,9 ms |
| Combate | 0,5 / 1,0 ms | 1,4 / 2,0 ms |
| Noite na casa, qualidade Baixa | — | 0,5 / 1,1 ms |

CPU desacelerada 4× pelo DevTools, de dia, 3 execuções cada. É uma aproximação grosseira de aparelho fraco: a renderização é por software, então **não é número de celular**.

| Versão | FPS |
|---|---|
| Antes | 24,0 / 24,4 / 23,7 |
| Depois, Alto | 25,4 / 21,5 / 19,5 |
| Depois, Baixo | 55,5 / 47,9 / 58,9 |

Leitura: no Alto o jogo gasta cerca de 2× mais por quadro, ainda menos de 10% do orçamento de 16,7 ms numa máquina comum. Num aparelho fraco, o Alto fica perto do antigo, e o modo Automático (padrão) desce para o Baixo, que roda mais de 2× mais rápido que a versão antiga. **Falta medir em um Android real.**
