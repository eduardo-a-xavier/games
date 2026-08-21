#!/usr/bin/env python3
"""Recorta uma planilha de ciclo de caminhada em 4 direções (formato
"DOWN/LEFT/RIGHT/UP WALK", N frames cada, empilhadas verticalmente, fundo
em xadrez) em 4 spritesheets horizontais com fundo transparente.

Feito pra planilhas geradas por IA nesse layout específico (ver
assets/art_direction/player_concept_walkcycles_source.jpg, a origem dos
walk_*.png atuais). Se a próxima planilha vier num layout diferente, os
números de calibração (seções/colunas/margens) precisam ser reajustados —
não é um recorte 100% genérico.

Uso:
    python3 extract_walkcycle_sheet.py <imagem_origem.jpg> <pasta_saida> [--frames N]

Requer Pillow (`pip install Pillow`).
"""
import argparse
import os
from collections import deque

from PIL import Image

DIRS = ["down", "left", "right", "up"]

# cores de fundo (xadrez) observadas na planilha de referência -- ajustar
# se a próxima planilha usar um xadrez de cores diferentes
BG_SAMPLES = [(184, 190, 189), (253, 254, 252), (218, 222, 221), (150, 152, 151)]
TOL = 42


def is_bg(rgb):
    r, g, b = rgb
    for br, bgc, bb in BG_SAMPLES:
        if (r - br) ** 2 + (g - bgc) ** 2 + (b - bb) ** 2 < TOL * TOL:
            return True
    return False


def flood_alpha(crop):
    """Remove o fundo por flood fill a partir das bordas -- só remove
    pixels de cor parecida com o xadrez E conectados à borda, então não
    apaga tons claros que fazem parte do personagem (ex.: bolsa clara),
    contanto que exista um contorno separando as duas regiões."""
    w, h = crop.size
    px = crop.load()
    visited = [[False] * h for _ in range(w)]
    alpha = [[255] * h for _ in range(w)]
    dq = deque()
    for x in range(w):
        dq.append((x, 0))
        dq.append((x, h - 1))
    for y in range(h):
        dq.append((0, y))
        dq.append((w - 1, y))
    while dq:
        x, y = dq.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or visited[x][y]:
            continue
        visited[x][y] = True
        if not is_bg(px[x, y]):
            continue
        alpha[x][y] = 0
        dq.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    out = Image.new("RGBA", (w, h))
    outpx = out.load()
    for x in range(w):
        for y in range(h):
            r, g, b = px[x, y]
            outpx[x, y] = (r, g, b, alpha[x][y])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("out_dir")
    ap.add_argument("--frames", type=int, default=5)
    ap.add_argument("--content-top", type=int, default=40, help="margem acima do conteúdo dentro de cada seção")
    ap.add_argument("--content-bottom", type=int, default=346, help="fim do conteúdo dentro de cada seção")
    args = ap.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    im = Image.open(args.source).convert("RGB")
    w, h = im.size
    sec_h = h / 4.0
    col_w = w / float(args.frames)

    for si, d in enumerate(DIRS):
        sec_top = si * sec_h
        frames = []
        for fi in range(args.frames):
            x0, x1 = fi * col_w, (fi + 1) * col_w
            y0, y1 = sec_top + args.content_top, sec_top + args.content_bottom
            crop = im.crop((int(x0), int(y0), int(x1), int(y1)))
            frames.append(flood_alpha(crop))
        fw, fh = frames[0].size
        sheet = Image.new("RGBA", (fw * args.frames, fh), (0, 0, 0, 0))
        for i, fr in enumerate(frames):
            sheet.paste(fr, (i * fw, 0), fr)
        out_path = os.path.join(args.out_dir, f"walk_{d}.png")
        sheet.save(out_path)
        print(f"gerado {out_path} ({sheet.width}x{sheet.height}, {args.frames} frames de {fw}x{fh})")


if __name__ == "__main__":
    main()
