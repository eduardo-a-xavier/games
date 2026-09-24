import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "assets" / "tools"))

import sprite_lint  # noqa: E402


class SpriteLintTest(unittest.TestCase):
    def test_atlas_configs_are_parsed_from_source(self):
        configs = sprite_lint.parse_atlas_configs()
        for key in ("default", "guerreiro", "mateiro", "encantado", "flavio"):
            self.assertIn(key, configs)
            self.assertIn("idle", configs[key])
        self.assertEqual(configs["mateiro"]["attack"]["stride"], 36)

    def test_canonical_sheets_pass(self):
        errors, _ = sprite_lint.lint()
        self.assertEqual(errors, [])

    def test_png_roundtrip_and_detections(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "x.png"
            clear, red = (0, 0, 0, 0), (255, 0, 0, 255)
            px = [[clear] * 4, [clear, red, red, clear], [clear, red, (255, 0, 0, 120), clear], [clear] * 4]
            sprite_lint.write_png(path, 4, 4, px)
            w, h, back = sprite_lint.read_png(path)
            self.assertEqual((w, h), (4, 4))
            self.assertEqual(back, px)
            errors, notes = [], []
            sprite_lint.check_transparency("x", w, h, back, errors, notes)
            self.assertTrue(any("alfa parcial" in e for e in errors))
            errors = []
            rows = {"a": {"y": 0, "h": 4, "frames": 2, "x0": 0, "fw": 2, "stride": 3}}
            sprite_lint.check_frames("x", w, h, back, rows, errors)
            self.assertTrue(any("saem da imagem" in e for e in errors))

    def test_v2_art_must_use_canonical_palette(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            clear = (0, 0, 0, 0)
            def img(c):
                return [[clear] * 3, [clear, c, clear], [clear] * 3]

            sprite_lint.write_png(d / "ok.png", 3, 3, img((0xF2, 0xB7, 0x05, 255)))
            sprite_lint.write_png(d / "bad.png", 3, 3, img((1, 2, 3, 255)))
            errors, _ = sprite_lint.lint(strict_dirs=[d])
            self.assertTrue(any("bad.png" in e for e in errors))
            self.assertFalse(any("ok.png" in e for e in errors))


if __name__ == "__main__":
    unittest.main()
