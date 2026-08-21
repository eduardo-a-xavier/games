#!/usr/bin/env python3
"""Prepara no app web os assets canônicos usados pelo runtime.

Os PNGs grandes continuam com uma única fonte da verdade em ``/assets``.
GitHub Pages e o preview local chamam este script para montar as cópias que
o navegador espera em ``prototype/web/assets``. O Android copia as mesmas
fontes diretamente no Gradle, sem depender de Python.
"""

from __future__ import annotations

import argparse
import filecmp
import shutil
from pathlib import Path


WEB_ROOT = Path(__file__).resolve().parent
REPO_ROOT = WEB_ROOT.parents[1]
PLAYER_SOURCE = REPO_ROOT / "assets" / "characters" / "player" / "base"
NPC_SOURCE = REPO_ROOT / "assets" / "characters" / "npcs"

PLAYER_PATTERNS = (
    "idle_*.png",
    "walk_*.png",
    "run_*.png",
    "hurt_*.png",
    "dodge_*.png",
    "heavy_*.png",
    "attack_guerreiro_*.png",
    "attack_mateiro_*.png",
    "attack_encantado_*.png",
    "defeat.png",
)

NPC_FILES = {
    "Npc_flavio.png": "flavio_sheet.png",
}


def player_sources() -> list[Path]:
    files: dict[str, Path] = {}
    for pattern in PLAYER_PATTERNS:
        for source in PLAYER_SOURCE.glob(pattern):
            files[source.name] = source
    return [files[name] for name in sorted(files)]


def expected_assets() -> list[tuple[Path, Path]]:
    assets: list[tuple[Path, Path]] = []
    for source in player_sources():
        assets.append((source, Path("player") / source.name))
    for source_name, target_name in NPC_FILES.items():
        assets.append((NPC_SOURCE / source_name, Path("npcs") / target_name))
    return assets


def sync_assets(target_root: Path | None = None) -> int:
    target_root = target_root or WEB_ROOT / "assets"
    copied = 0
    for source, relative_target in expected_assets():
        if not source.is_file():
            raise FileNotFoundError(f"Asset canônico ausente: {source}")
        target = target_root / relative_target
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.is_file() and filecmp.cmp(source, target, shallow=False):
            continue
        shutil.copy2(source, target)
        copied += 1
    return copied


def check_assets(target_root: Path | None = None) -> list[str]:
    target_root = target_root or WEB_ROOT / "assets"
    problems: list[str] = []
    for source, relative_target in expected_assets():
        target = target_root / relative_target
        if not source.is_file():
            problems.append(f"fonte ausente: {source}")
        elif not target.is_file():
            problems.append(f"destino ausente: {target}")
        elif not filecmp.cmp(source, target, shallow=False):
            problems.append(f"destino desatualizado: {target}")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="apenas valida as cópias já preparadas")
    args = parser.parse_args()

    if args.check:
        problems = check_assets()
        if problems:
            print("\n".join(problems))
            return 1
        print(f"assets web verificados: {len(expected_assets())}")
        return 0

    copied = sync_assets()
    print(f"assets web preparados: {len(expected_assets())} ({copied} atualizados)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
