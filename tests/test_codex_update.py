"""Exercise the updater against a CLI that prunes the previous plugin cache."""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


UPDATER = Path(__file__).resolve().parents[1] / 'scripts/update-codex.py'


class CodexUpdateTest(unittest.TestCase):
    def test_preserves_live_hook_paths_and_installer_result(self):
        for exit_code in (0, 1):
            with self.subTest(exit_code=exit_code), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                home = root / 'alternate-account'
                cache = home / 'plugins/cache/colin-ponytail/ponytail'
                old = cache / '4.9.1'
                old.mkdir(parents=True)
                (old / 'hook.js').write_text('original hook')
                cli = root / 'codex'
                cli.write_text('#!/bin/sh\n'
                               'test "$*" = "plugin add ponytail@colin-ponytail" || exit 99\n'
                               'cache="$CODEX_HOME/plugins/cache/colin-ponytail/ponytail"\n'
                               'rm -r "$cache/4.9.1"\n'
                               'mkdir -p "$cache/4.9.2"\n'
                               'echo updated > "$cache/4.9.2/hook.js"\n'
                               f'exit {exit_code}\n')
                cli.chmod(0o755)
                result = subprocess.run(['python3', str(UPDATER)], env={
                    **os.environ, 'CODEX_HOME': str(home), 'PATH': str(root) + os.pathsep + os.environ['PATH'],
                })
                self.assertEqual(result.returncode, exit_code)
                self.assertEqual((old / 'hook.js').read_text(), 'original hook')
                self.assertEqual((cache / '4.9.2/hook.js').read_text(), 'updated\n')


if __name__ == '__main__':
    unittest.main()
