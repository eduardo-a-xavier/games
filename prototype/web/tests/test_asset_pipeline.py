import tempfile
import unittest
from pathlib import Path
import re
import sys


WEB_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(WEB_ROOT))

import prepare_web_assets  # noqa: E402


class AssetPipelineTest(unittest.TestCase):
    def test_sync_is_complete_and_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp)
            expected = prepare_web_assets.expected_assets()

            self.assertEqual(prepare_web_assets.sync_assets(target), len(expected))
            self.assertEqual(prepare_web_assets.check_assets(target), [])
            self.assertEqual(prepare_web_assets.sync_assets(target), 0)

            source, relative = expected[0]
            (target / relative).write_bytes(b"desatualizado")
            self.assertTrue(prepare_web_assets.check_assets(target))
            self.assertEqual(prepare_web_assets.sync_assets(target), 1)
            self.assertEqual((target / relative).read_bytes(), source.read_bytes())

    def test_every_precache_entry_exists_after_prepare(self):
        with tempfile.TemporaryDirectory() as tmp:
            generated_assets = Path(tmp)
            prepare_web_assets.sync_assets(generated_assets)
            sw = (WEB_ROOT / "sw.js").read_text(encoding="utf-8")
            entries = re.findall(r'^\s*"([^"]+)",?$', sw, flags=re.MULTILINE)

            missing = []
            for entry in entries:
                if entry in {"./"}:
                    continue
                if entry.startswith("assets/player/") or entry.startswith("assets/npcs/"):
                    generated = generated_assets / entry.removeprefix("assets/")
                    source_path = generated if generated.exists() else WEB_ROOT / entry
                else:
                    source_path = WEB_ROOT / entry
                if not source_path.exists():
                    missing.append(entry)

            self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
