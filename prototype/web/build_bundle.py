#!/usr/bin/env python3
"""Concatena index.html + styles.css + src/*.js num único arquivo HTML
autocontido, só para compartilhar/testar rapidamente (ex.: Artifact) sem
precisar de servidor local. O jogo real roda a partir dos arquivos
separados em index.html + src/*.js — este bundle é só uma conveniência de
distribuição, não o código-fonte canônico."""
import re
from pathlib import Path

ROOT = Path(__file__).parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "styles.css").read_text(encoding="utf-8")

html = html.replace(
    '<link rel="stylesheet" href="styles.css" />',
    "<style>\n" + css + "\n</style>",
)

def inline_script(match):
    src = match.group(1)
    code = (ROOT / src).read_text(encoding="utf-8")
    return "<script>\n" + code + "\n</script>"

html = re.sub(r'<script src="([^"]+\.js)"></script>', inline_script, html)

out_dir = ROOT / "dist"
out_dir.mkdir(exist_ok=True)
(out_dir / "index.bundled.html").write_text(html, encoding="utf-8")
print("bundle escrito em", out_dir / "index.bundled.html")
