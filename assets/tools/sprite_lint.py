#!/usr/bin/env python3
"""Validador automático de sprites de Encantaria — só biblioteca padrão.

Verifica, sem depender de Pillow (roda igual no CI e no celular do Termux):

  * transparência — cantos com alfa 0 e proporção de alfa parcial (pixel art
    de verdade não tem alfa parcial; muito alfa parcial = imagem reduzida
    com filtro, a "falsa pixel art");
  * dimensões — tamanho da planilha e de cada frame declarado;
  * frames — cada frame declarado em SHEET_CONFIGS/NPC_CONFIGS do
    src/spriteAtlas.js cabe na imagem e não está vazio;
  * paleta — quantas cores e quantas estão fora de palette_encantaria.json.
    Arte em assets/v2/ é ESTRITA (erro); arte antiga é só relatório, para
    nunca "reprovar" o que já está funcionando no jogo.

Uso:
  python3 assets/tools/sprite_lint.py            # relatório + código de saída
  python3 assets/tools/sprite_lint.py --swatch   # regenera palette_encantaria.png
"""
import json
import re
import struct
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PALETTE_JSON = ROOT / "assets" / "art_direction" / "palette_encantaria.json"
ATLAS_JS = ROOT / "prototype" / "web" / "src" / "spriteAtlas.js"

SHEETS = {
    "default": ROOT / "prototype" / "web" / "assets" / "player" / "player_sheet.png",
    "guerreiro": ROOT / "prototype" / "web" / "assets" / "player" / "guerreiro_sheet.png",
    "mateiro": ROOT / "prototype" / "web" / "assets" / "player" / "mateiro_sheet.png",
    "encantado": ROOT / "prototype" / "web" / "assets" / "player" / "encantado_sheet.png",
    "flavio": ROOT / "assets" / "characters" / "npcs" / "Npc_flavio.png",
}
SHEET_SIZE = (360, 288)
MAX_PARTIAL_ALPHA = 0.02  # fração de pixels visíveis com alfa parcial


# ---------------------------------------------------------------- PNG ----
def read_png(path):
    """Decodifica PNG 8 bits (tons de cinza, RGB, paleta, RGBA) em RGBA."""
    data = Path(path).read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path}: não é PNG")
    pos, idat, plte, trns = 8, b"", None, None
    width = height = depth = ctype = interlace = None
    while pos < len(data):
        length, kind = struct.unpack(">I4s", data[pos:pos + 8])
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            width, height, depth, ctype, _, _, interlace = struct.unpack(">IIBBBBB", chunk)
        elif kind == b"PLTE":
            plte = chunk
        elif kind == b"tRNS":
            trns = chunk
        elif kind == b"IDAT":
            idat += chunk
        elif kind == b"IEND":
            break
    if depth != 8 or interlace:
        raise ValueError(f"{path}: só PNG 8 bits sem entrelaçamento (depth={depth})")
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ctype]
    stride = width * channels
    raw = zlib.decompress(idat)
    rows, prev = [], bytearray(stride)
    for y in range(height):
        f = raw[y * (stride + 1)]
        line = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - channels] if i >= channels else 0
            b = prev[i]
            c = prev[i - channels] if i >= channels else 0
            if f == 1:
                line[i] = (line[i] + a) & 255
            elif f == 2:
                line[i] = (line[i] + b) & 255
            elif f == 3:
                line[i] = (line[i] + ((a + b) >> 1)) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        rows.append(bytes(line))
        prev = line
    px = []
    for line in rows:
        out = []
        for x in range(width):
            v = line[x * channels:(x + 1) * channels]
            if ctype == 6:
                out.append(tuple(v))
            elif ctype == 2:
                out.append((v[0], v[1], v[2], 255))
            elif ctype == 0:
                out.append((v[0], v[0], v[0], 255))
            elif ctype == 4:
                out.append((v[0], v[0], v[0], v[1]))
            else:
                i = v[0]
                alpha = trns[i] if trns and i < len(trns) else 255
                out.append((plte[i * 3], plte[i * 3 + 1], plte[i * 3 + 2], alpha))
        px.append(out)
    return width, height, px


def write_png(path, width, height, px):
    raw = b"".join(b"\x00" + bytes(c for p in row for c in p) for row in px)

    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)

    Path(path).write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


# -------------------------------------------------------------- dados ----
def load_palette():
    ramps = json.loads(PALETTE_JSON.read_text(encoding="utf-8"))["ramps"]
    colors = set()
    for ramp in ramps.values():
        for hx in ramp:
            colors.add(tuple(int(hx[i:i + 2], 16) for i in (1, 3, 5)))
    return ramps, colors


def parse_atlas_configs(text=None):
    """Lê SHEET_CONFIGS e NPC_CONFIGS direto do spriteAtlas.js (fonte da verdade)."""
    text = text if text is not None else ATLAS_JS.read_text(encoding="utf-8")
    configs, current = {}, None
    head = re.compile(r'^\s*"?(\w+)"?\s*:\s*\{\s*$')
    row = re.compile(r'(\w+):\s*\{\s*y:\s*(\d+),\s*h:\s*(\d+),\s*frames:\s*(\d+),\s*x0:\s*(\d+),\s*fw:\s*(\d+),\s*stride:\s*(\d+)(?:,\s*ax:\s*[\d.]+)?\s*\}')
    for line in text.splitlines():
        m = row.search(line)
        if m and current:
            name, *nums = m.groups()
            configs[current][name] = dict(zip(("y", "h", "frames", "x0", "fw", "stride"), map(int, nums)))
            continue
        h = head.match(line)
        if h and h.group(1) not in ("rows", "SHEET_CONFIGS", "NPC_CONFIGS"):
            current = h.group(1)
            configs.setdefault(current, {})
    return {k: v for k, v in configs.items() if v}


# ------------------------------------------------------------ checagens --
def check_transparency(name, w, h, px, errors, notes):
    corners = [px[0][0], px[0][w - 1], px[h - 1][0], px[h - 1][w - 1]]
    if any(c[3] != 0 for c in corners):
        errors.append(f"{name}: cantos não são transparentes")
    visible = [p for row in px for p in row if p[3] > 0]
    if not visible:
        errors.append(f"{name}: imagem vazia")
        return
    partial = sum(1 for p in visible if p[3] < 255) / len(visible)
    if partial > MAX_PARTIAL_ALPHA:
        errors.append(f"{name}: {partial:.1%} de alfa parcial (limite {MAX_PARTIAL_ALPHA:.0%}) — parece reduzida com filtro")
    elif partial:
        notes.append(f"{name}: {partial:.2%} de alfa parcial (tolerado)")


def check_frames(name, w, h, px, rows, errors):
    for rname, r in rows.items():
        right = r["x0"] + r["stride"] * (r["frames"] - 1) + r["fw"]
        if right > w or r["y"] + r["h"] > h:
            errors.append(f"{name}.{rname}: frames saem da imagem ({right}x{r['y'] + r['h']} > {w}x{h})")
            continue
        for f in range(r["frames"]):
            x0 = r["x0"] + f * r["stride"]
            opaque = sum(1 for y in range(r["y"], r["y"] + r["h"]) for x in range(x0, x0 + r["fw"]) if px[y][x][3] > 0)
            if opaque < 8:
                errors.append(f"{name}.{rname}[{f}]: frame vazio ({opaque} px)")


def palette_report(px, palette):
    colors = {p[:3] for row in px for p in row if p[3] == 255}
    outside = colors - palette
    return len(colors), len(outside)


def lint(strict_dirs=None):
    errors, notes = [], []
    _, palette = load_palette()
    configs = parse_atlas_configs()
    for key, path in SHEETS.items():
        if not path.exists():
            notes.append(f"{key}: {path.relative_to(ROOT)} ausente (rode prepare_web_assets.py)")
            continue
        w, h, px = read_png(path)
        if (w, h) != SHEET_SIZE:
            errors.append(f"{key}: tamanho {w}x{h}, esperado {SHEET_SIZE[0]}x{SHEET_SIZE[1]}")
        check_transparency(key, w, h, px, errors, notes)
        if key in configs:
            check_frames(key, w, h, px, configs[key], errors)
        else:
            errors.append(f"{key}: sem config no spriteAtlas.js")
        n, out = palette_report(px, palette)
        notes.append(f"{key}: {n} cores, {out} fora da paleta canônica (legado: só relatório)")
    for d in strict_dirs or [ROOT / "assets" / "v2"]:
        for path in sorted(Path(d).rglob("*.png")) if Path(d).exists() else []:
            rel = path.relative_to(ROOT) if path.is_relative_to(ROOT) else path
            w, h, px = read_png(path)
            check_transparency(str(rel), w, h, px, errors, notes)
            n, out = palette_report(px, palette)
            if out:
                errors.append(f"{rel}: {out} de {n} cores fora da paleta canônica")
    return errors, notes


def write_swatch():
    ramps, _ = load_palette()
    cell, width = 12, max(len(r) for r in ramps.values())
    rows = []
    for ramp in ramps.values():
        line = []
        for i in range(width):
            c = tuple(int(ramp[i][j:j + 2], 16) for j in (1, 3, 5)) + (255,) if i < len(ramp) else (0, 0, 0, 0)
            line += [c] * cell
        rows += [line] * cell
    out = PALETTE_JSON.with_suffix(".png")
    write_png(out, width * cell, len(rows), rows)
    return out


def main(argv):
    if "--swatch" in argv:
        print("swatch:", write_swatch().relative_to(ROOT))
    errors, notes = lint()
    for n in notes:
        print("  ·", n)
    for e in errors:
        print("  ✗", e)
    print(f"sprite_lint: {len(errors)} erro(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
