# Direção de arte — Encantaria: Vila do Ipê

Regras que o jogo **já aplica em código**. Cada regra aponta para o arquivo
que a implementa ou para o teste que a garante. Quando algo aqui contradisser
outro documento, vale este, porque foi medido no jogo.

## 1. Escala — a regra que amarra tudo

| Medida | Valor | Onde |
|---|---|---|
| Pixel de arte | **3 px de mundo** | `palette_encantaria.json#art_pixel_world_px` |
| Personagem jogável | figura de 17–23 px de altura, desenhada com 52 px de mundo | `spriteAtlas.js` (`idleH`), `appearance.js` (`drawHeight` 52) |
| Célula das planilhas | 36 px (planilha de 360×288, 10 colunas × 8 linhas) | `spriteAtlas.js#SHEET_CONFIGS` |
| Câmera | zoom 1,4 → 1 pixel de arte ≈ 4,2 px CSS | `camera.js` |

> O GDD (§58) falava em personagem de 32×48 e o guia de estilo em frame de
> 40×56 com ~35 px de altura. **Nenhum dos dois é o que o jogo usa.** As
> planilhas pixel (as que o jogador vê) têm figuras de ~19 px. Arte nova de
> personagem entra nessa escala, com célula de 36 px.

Tudo que vai para a tela respeita essa grade:
- **cenário**: pintado em 1/3 da resolução e ampliado 3× sem interpolação (`pixelWorld.js`);
- **criaturas, NPCs, moedas e efeitos** desenhados por código: camada em 1/3 da resolução, alinhada à grade do chão (`pixelLayer.js`);
- **partículas**: quadrados de 3 px alinhados à grade (`particles.js`);
- **luz**: lightmap em 1/3 da resolução, com borda em degraus (`lighting.js`).

**Proibido:** misturar ilustração em alta resolução reduzida com filtro. A arte
direcional antiga (`assets/characters/player/base/`, frames de ~137×306 px)
continua no repositório, mas só como reserva para os estados que as planilhas
não cobrem. `sprite_lint.py` reprova arte nova com alfa parcial acima de 2%,
que é a marca de imagem reduzida com filtro.

## 2. Paleta

`assets/art_direction/palette_encantaria.json` tem 14 rampas, do escuro para o
claro (swatch em `palette_encantaria.png`):

- **grama / mata** — verdes profundos; a mata é a sombra da grama;
- **terra / madeira / terracota** — chão, construções, telhado colonial;
- **ipê** — o dourado-assinatura do jogo (GDD §58): ipês, janelas acesas, moedas, faíscas;
- **pedra / água** — Mina, rochas, tanque, Brejo;
- **noite / encanto** — céu noturno e o sobrenatural (raízes da Mina, magia do Encantado);
- **perigo / cura / flor / ui** — feedback e interface.

Garantias automáticas:
- `EN.Palette` (`src/palette.js`) espelha o JSON exatamente (teste em `regressions.test.js`);
- `pixelWorld.js` e `particles.js` não usam nenhuma cor fora da paleta (teste);
- arte em `assets/v2/` com cor fora da paleta reprova no `sprite_lint.py`.

As planilhas antigas de personagem têm de 11 a 79 cores próprias. O validador
só relata isso, não reprova: não se refaz arte que funciona.

## 3. Luz e sombra

- A luz vem de **cima à esquerda**. As sombras de objeto caem para baixo e para a direita, como elipse de meia sombra com borda em dithering (`pixelWorld.js#groundShadow`).
- O contorno tem 1 px, na cor **mais escura da rampa do próprio objeto**, nunca preto puro.
- Transições de tom usam **dithering Bayer 4×4**, não gradiente.
- **Dia**: sem véu; tom quente leve de manhã e à tarde.
- **Crepúsculo** das 17h às 20h (alaranjado) e **aurora** das 5h às 7h, graduais.
- **Noite**: escuridão a 70% furada por luzes reais (janelas, lampião, tochas da Mina, fogo-fátuo do Brejo, vaga-lumes, lamparina do jogador, magia e fogo). A lamparina tem raio suficiente para ler o personagem e o inimigo encostado, porque a noite pode ser difícil, mas não pode ser injusta.

## 4. Linguagem dos ambientes

| Área | Leitura | Como o chão comunica |
|---|---|---|
| Casa / entorno | seguro, acolhedor | grama clara, flores, janelas acesas à noite |
| Caminho, roça | trabalho, rotina | terra batida com borda escura; sulcos e cerca de madeira |
| Rumo à Mina (NE) | perigo | grama escurece e morre em manchas; paredão de pedra; raízes negras com brilho roxo saindo da boca; tochas |
| Rumo ao Brejo (SO) | sobrenatural | grama morta, lama, poças, taboas; fogo-fátuo frio (a única luz que não é de fogo) |

O perigo é lido **no chão**, antes de aparecer o inimigo (`pixelWorld.js#dangerAt`).

## 5. Criaturas

- A forma comunica o **arquétipo de comportamento** (charger, zoner, flyer, ranged, brute, boss), não a espécie (ver `ASSETS.md`).
- A silhueta tem corte seco: pixel opaco ou vazio.
- Sumir (neblina, morte) é feito com **transparência em dithering**, nunca com alfa contínuo. Assim a Onça de Bruma continua visível a 8%, como o design pede.
- O aviso de ataque (anel vermelho) é sólido e em pixel. Nenhum efeito pode cobrir esse anel.

## 6. Animação e efeitos

- As partículas rodam no **tempo do jogo**: congelam no hitstop, e isso dá peso ao golpe.
- As partículas encolhem em degraus de pixel no fim da vida, em vez de sumir por transparência.
- A intensidade é contida: nenhum efeito cobre o personagem ou o aviso de um inimigo.
- O pool é fixo (700 partículas no Alto, 220 no Baixo): nada é alocado por quadro.
- Os recortes de frame são validados automaticamente (`sprite_lint.py`). A âncora `ax` mantém o corpo parado quando o frame precisa ser largo para caber o efeito da arma.

## 7. Interface e ícones

- Os ícones são próprios, em grade 12×12, usam só a paleta e têm contorno escuro (`src/icons.js`).
- São exibidos em múltiplos inteiros: **12 / 24 / 36 px CSS**.
- Onde ainda não existe ícone desenhado, o emoji continua aparecendo: a troca é progressiva e nada some da interface.

## 8. Qualidade gráfica

Menu → Opções → Gráficos:

- **Alto**: tudo ligado.
- **Baixo**: sem lightmap e sem camada de pixel, partículas reduzidas, resolução interna 1×.
- **Automático** (padrão): começa no Alto e cai para o Baixo, uma vez, se a média de quadro passar de 22 ms por 4 s seguidos. Isso não é gravado no save.

## 9. Ferramentas

| Ferramenta | O que faz |
|---|---|
| `assets/tools/sprite_lint.py` | transparência, alfa parcial, dimensões, frames declarados no `spriteAtlas.js` e paleta; `--swatch` regenera o swatch |
| `prototype/web/tools/capture.js` | capturas reais e medição de FPS e de tempo de trabalho por quadro em Chromium headless (`THROTTLE=4` desacelera a CPU) |
| `?mundo=antigo` na URL | volta ao cenário e à noite antigos, para comparar |
