#!/usr/bin/env python3
"""Extrai spritesheets direcionais de uma planilha de referência gerada por
IA, recortando POR CONTEÚDO em vez de por grade fixa.

Por que não usar grade: as planilhas recebidas não são consistentes — a
mesma folha pode ter 4 colunas numa direção e 6 em outra, alturas de
cabeçalho diferentes, e poses que estouram a célula (espada erguida,
personagem ajoelhado). Recortar por grade corta cabeça e pé exatamente nas
poses mais dramáticas, que são as que importam.

Como funciona:
  1. Varre a densidade de pixels "não-fundo" por linha para achar as faixas
     de cada direção (cabeçalho vs. linhas de frames).
  2. Dentro de cada faixa, acha os blocos horizontais de conteúdo — cada
     bloco é uma pose, seja qual for a largura dela.
  3. Limpa o recorte em três passadas:
     a) flood fill a partir das bordas remove o xadrez ligado à borda (o
        xadrez é JPEG, não tem alfa real; só some o que casa com a paleta,
        então o anti-aliasing do personagem sobrevive sem franja branca);
     b) remove manchas de xadrez PRESAS dentro da silhueta (entre as
        pernas, sob as botas) — o flood fill de borda não alcança essas.
        Só some mancha grande: medido na fonte, xadrez preso tem ~485px de
        área enquanto respingo legítimo de anti-aliasing tem ~10px, e a
        lâmina do facão fica a 31+ de distância da paleta do xadrez, fora
        da tolerância — ou seja, a arma nunca é confundida com fundo;
     c) descarta componentes soltos pequenos e linhas finas, que é o que
        sobra da moldura da grade e do texto de cabeçalho do template;
     Antes de tudo isso, a moldura da grade é apagada direto na fonte
     (corridas escuras de 100px+, tamanho que nenhuma parte do personagem
     alcança) — é o que evita o risco preto sob os pés dentro do jogo.
  4. Reancora todas as poses num canvas de tamanho único: pés na mesma
     linha, corpo no mesmo eixo horizontal. O eixo vem do centro de massa
     da PARTE DE BAIXO da pose (pernas/botas) e não da caixa inteira —
     senão uma espada esticada pro lado empurraria o corpo e a animação
     tremeria.

LIMITE CONHECIDO e como contornar: a detecção automática das faixas falha
quando a planilha encosta o cabeçalho na primeira fileira de poses, ou
quando uma figura em pé atravessa as duas fileiras de uma direção (aí as
duas viram uma faixa só e o recorte empilha duas poses num frame). Nesses
casos passe as faixas na mão com --sections; o formato é

    "y0-y1,y0-y1;y0-y1,y0-y1;..."

onde `;` separa as direções (down, left, right, up nesta ordem) e `,`
separa as fileiras dentro de uma direção. Sempre confira o resultado num
contato sobre fundo verde antes de aceitar.

Uso:
  python3 extract_pose_sheet.py <planilha.jpg> <pasta_saida> <prefixo> [--sections "..."]
"""
import sys
from collections import deque

from PIL import Image

CHECKER = [(229, 229, 229), (156, 156, 156), (255, 255, 255)]
TOL = 30
DIRS = ["down", "left", "right", "up"]


def is_bg(c):
    r, g, b = c[:3]
    if abs(r - g) > 18 or abs(g - b) > 18:
        return False
    return any(abs(r - a) <= TOL and abs(g - m) <= TOL and abs(b - z) <= TOL for a, m, z in CHECKER)


def row_density(px, W, y):
    n = sum(0 if is_bg(px[x, y]) else 1 for x in range(0, W, 2))
    return n / (W / 2)


def find_bands(px, W, H, thresh=0.06, min_h=4):
    bands, start = [], None
    for y in range(H):
        v = row_density(px, W, y)
        if v > thresh and start is None:
            start = y
        elif v <= thresh and start is not None:
            if y - start >= min_h:
                bands.append((start, y - 1))
            start = None
    if start is not None:
        bands.append((start, H - 1))
    return bands


def col_blocks(px, W, y0, y1, thresh=0.07, min_w=25, join=14):
    n = max(1, (y1 - y0) // 2)
    blocks, start = [], None
    for x in range(W):
        v = sum(0 if is_bg(px[x, y]) else 1 for y in range(y0, y1, 2)) / n
        if v > thresh and start is None:
            start = x
        elif v <= thresh and start is not None:
            if x - start >= min_w:
                blocks.append([start, x - 1])
            start = None
    if start is not None and W - start >= min_w:
        blocks.append([start, W - 1])
    merged = []
    for b in blocks:
        if merged and b[0] - merged[-1][1] < join:
            merged[-1][1] = b[1]
        else:
            merged.append(b)
    return [tuple(b) for b in merged]


def tight_rows(px, x0, x1, y0, y1, thresh=0.08):
    """
    Extremos verticais reais da pose dentro do bloco.

    O limiar precisa ficar acima do ruído do xadrez: a folha é JPEG, e numa
    linha completamente vazia ainda sobram ~3-4% de pixels que escapam do
    teste de fundo. Com limiar menor que isso o detector enxerga conteúdo em
    todas as linhas e topo/base deixam de significar qualquer coisa.
    """
    top, bot = None, None
    span = max(1, (x1 - x0 + 1))
    for y in range(y0, y1):
        v = sum(0 if is_bg(px[x, y]) else 1 for x in range(x0, x1 + 1)) / span
        if v > thresh:
            if top is None:
                top = y
            bot = y
    return top, bot


def spills(px, x0, x1, top, bot, y0, y1, look=1, thresh=0.08):
    """a pose continua para fora da faixa? (ou seja, foi cortada por ela)"""
    span = max(1, x1 - x0 + 1)

    def busy(y):
        return sum(0 if is_bg(px[x, y]) else 1 for x in range(x0, x1 + 1)) / span > thresh

    if top <= y0 + 1 and any(busy(y) for y in range(max(0, y0 - look), y0)):
        return True
    if bot >= y1 - 1 and any(busy(y) for y in range(y1 + 1, y1 + 1 + look)):
        return True
    return False


def strip_enclosed_bg(im, min_area=40):
    """remove xadrez preso dentro da silhueta (o flood fill de borda não chega lá)"""
    W, H = im.size
    px = im.load()
    seen = [[False] * H for _ in range(W)]
    for y in range(H):
        for x in range(W):
            if seen[x][y] or px[x, y][3] < 40 or not is_bg(px[x, y]):
                continue
            q, comp = deque([(x, y)]), []
            seen[x][y] = True
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < W and 0 <= ny < H and not seen[nx][ny]:
                        if px[nx, ny][3] >= 40 and is_bg(px[nx, ny]):
                            seen[nx][ny] = True
                            q.append((nx, ny))
            if len(comp) >= min_area:
                for cx, cy in comp:
                    px[cx, cy] = (0, 0, 0, 0)
    return im


def keep_main_parts(im):
    """
    Fica só com o personagem: descarta componentes opacos pequenos e linhas
    finas. É o que remove a moldura da grade e o texto de cabeçalho do
    template, que sobram como ilhas soltas depois da limpeza do fundo.
    """
    W, H = im.size
    px = im.load()
    seen = [[False] * H for _ in range(W)]
    comps = []
    for y in range(H):
        for x in range(W):
            if seen[x][y] or px[x, y][3] < 40:
                continue
            q, comp = deque([(x, y)]), []
            seen[x][y] = True
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < W and 0 <= ny < H and not seen[nx][ny] and px[nx, ny][3] >= 40:
                        seen[nx][ny] = True
                        q.append((nx, ny))
            comps.append(comp)
    if not comps:
        return im
    biggest = max(len(c) for c in comps)
    for comp in comps:
        xs = [p[0] for p in comp]
        ys = [p[1] for p in comp]
        w = max(xs) - min(xs) + 1
        h = max(ys) - min(ys) + 1
        # linha da moldura: fina, ou comprida demais pra sua espessura
        thin = w <= 5 or h <= 5 or (len(comp) / float(w * h) < 0.3 and max(w, h) / float(min(w, h)) > 6)
        if len(comp) < max(500, biggest * 0.18) or thin:
            for cx, cy in comp:
                px[cx, cy] = (0, 0, 0, 0)
    return im


def erase_frame_rules(im, min_run=100):
    """
    Apaga a moldura da grade DIRETO NA FONTE, antes de qualquer recorte.

    Aqui a distinção é trivial e segura: uma linha de moldura é uma corrida
    contínua de pixels quase pretos com 100px ou mais. O personagem tem ~90px
    de largura no total e a arma dele é cinza-claro, então nenhuma parte do
    desenho consegue formar uma corrida escura desse tamanho. Tentar essa
    limpeza depois, dentro do recorte de cada pose, é que era perigoso — lá
    uma fileira de cabelo escuro de costas passa pelos mesmos critérios e
    acaba virando um rasgo no meio da cabeça.
    """
    W, H = im.size
    px = im.load()

    def dark(x, y):
        r, g, b = px[x, y][:3]
        return (r + g + b) / 3 < 78

    victims = []
    for y in range(H):
        run = 0
        for x in range(W + 1):
            if x < W and dark(x, y):
                run += 1
            else:
                if run >= min_run:
                    victims.append(("h", y, x - run, x))
                run = 0
    for x in range(W):
        run = 0
        for y in range(H + 1):
            if y < H and dark(x, y):
                run += 1
            else:
                if run >= min_run:
                    victims.append(("v", x, y - run, y))
                run = 0

    for kind, fixed, a, b in victims:
        for t in range(a, b):
            if kind == "h":
                px[t, fixed] = (229, 229, 229)
            else:
                px[fixed, t] = (229, 229, 229)
    return len(victims)


def opaque_bbox(im):
    W, H = im.size
    px = im.load()
    xs = [x for x in range(W) if any(px[x, y][3] > 40 for y in range(H))]
    ys = [y for y in range(H) if any(px[x, y][3] > 40 for x in range(W))]
    if not xs or not ys:
        return None
    return (xs[0], ys[0], xs[-1] + 1, ys[-1] + 1)


def cut_alpha(im):
    """recorta o fundo xadrez por flood fill a partir das bordas"""
    im = im.convert("RGBA")
    W, H = im.size
    px = im.load()
    seen = [[False] * H for _ in range(W)]
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            q.append((x, y))
    for y in range(H):
        for x in (0, W - 1):
            q.append((x, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= W or y >= H or seen[x][y]:
            continue
        seen[x][y] = True
        if not is_bg(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im


def anchor_of(im):
    """(centro-x do corpo, linha dos pés) a partir dos pixels opacos"""
    W, H = im.size
    px = im.load()
    ys = [y for y in range(H) if any(px[x, y][3] > 40 for x in range(W))]
    if not ys:
        return W // 2, H - 1
    bottom = ys[-1]
    # centro de massa só do terço inferior: é onde estão pernas e botas,
    # a parte que não se desloca quando a arma se estica
    lo = bottom - max(6, (bottom - ys[0]) // 3)
    xs, tot = 0, 0
    for y in range(lo, bottom + 1):
        for x in range(W):
            if px[x, y][3] > 40:
                xs += x
                tot += 1
    cx = xs // tot if tot else W // 2
    return cx, bottom


def parse_sections(spec):
    """
    "y0-y1,y0-y1;..." com janela horizontal opcional por fileira:
    "y0-y1@x0-x1". A janela existe para descartar figuras que atravessam as
    duas fileiras de uma direção — nessas planilhas elas ficam sempre nas
    pontas, então limitar o x às colunas do meio resolve sem heurística.
    """
    groups = []
    for chunk in spec.split(";"):
        rows = []
        for part in chunk.split(","):
            part = part.strip()
            win = None
            if "@" in part:
                part, wspec = part.split("@")
                wa, wb = wspec.split("-")
                win = (int(wa), int(wb))
            a, b = part.split("-")
            rows.append((int(a), int(b), win))
        groups.append(rows)
    return groups


def extract(src_path, out_dir, prefix, sections=None, drop_spilled=False):
    im = Image.open(src_path).convert("RGB")
    W, H = im.size
    n_rules = erase_frame_rules(im)
    print(f"  moldura da grade: {n_rules} traços apagados na fonte")
    px = im.load()

    if sections:
        groups = sections
    else:
        bands = [b for b in find_bands(px, W, H) if b[1] - b[0] >= 40]
        # a primeira faixa alta e muito densa é a barra de título do arquivo
        if bands and bands[0][0] < 10:
            bands = bands[1:]

        # agrupa as faixas em 4 direções pela ordem vertical
        groups, per = [], max(1, len(bands) // 4)
        for i in range(0, len(bands), per):
            groups.append(bands[i : i + per])
        groups = groups[:4]

    all_poses = {}
    for di, d in enumerate(DIRS):
        poses = []
        for row in groups[di]:
            y0, y1 = row[0], row[1]
            win = row[2] if len(row) > 2 else None
            for (x0, x1) in col_blocks(px, W, y0, y1 + 1):
                # bloco precisa caber INTEIRO na janela: se ele vaza, ou é uma
                # figura que atravessa fileiras, ou são duas poses que o
                # detector fundiu — nos dois casos o recorte sairia errado
                if win and (x0 < win[0] or x1 > win[1]):
                    continue
                top, bot = tight_rows(px, x0, x1, y0, y1 + 1)
                if top is None or bot - top < 40:
                    continue
                # Descarte de pose cortada pela divisão de fileiras (--drop-spilled).
                # Fica desligado por padrão: em folha onde o cabeçalho da seção
                # encosta no topo das poses, o teste confunde o texto com corpo
                # cortado e joga fora a fileira inteira. Preferir a janela em X
                # das seções, que resolve o mesmo caso sem ambiguidade.
                if drop_spilled and spills(px, x0, x1, top, bot, y0, y1):
                    continue
                pad = 8
                box = (max(0, x0 - pad), max(0, top - pad), min(W, x1 + 1 + pad), min(H, bot + 1 + pad))
                pose = keep_main_parts(strip_enclosed_bg(cut_alpha(im.crop(box))))
                bb = opaque_bbox(pose)
                if bb is None or bb[3] - bb[1] < 60:
                    continue  # sobrou só cabeçalho/moldura: não é pose
                poses.append(pose.crop(bb))
        all_poses[d] = poses
        print(f"  {d}: {len(poses)} poses")

    # canvas único pra todas as direções: mesma escala e mesma âncora, senão
    # trocar de direção faria o personagem "pular" de tamanho
    left = right = up = 0
    metrics = {}
    for d, poses in all_poses.items():
        metrics[d] = []
        for p in poses:
            cx, feet = anchor_of(p)
            metrics[d].append((cx, feet))
            left = max(left, cx)
            right = max(right, p.size[0] - cx)
            up = max(up, feet)
    cw, ch = left + right, up + 8

    for d, poses in all_poses.items():
        if not poses:
            continue
        sheet = Image.new("RGBA", (cw * len(poses), ch), (0, 0, 0, 0))
        for i, p in enumerate(poses):
            cx, feet = metrics[d][i]
            sheet.paste(p, (i * cw + left - cx, up - feet), p)
        out = f"{out_dir}/{prefix}_{d}.png"
        sheet.save(out)
        print(f"  gravado {out}  ({sheet.size[0]}x{sheet.size[1]}, {len(poses)} frames)")
    return {d: len(p) for d, p in all_poses.items()}


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    sections = None
    if "--sections" in sys.argv:
        sections = parse_sections(sys.argv[sys.argv.index("--sections") + 1])
    counts = extract(sys.argv[1], sys.argv[2], sys.argv[3], sections, "--drop-spilled" in sys.argv)
    print("frames por direção:", counts)
