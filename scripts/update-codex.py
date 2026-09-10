#!/usr/bin/env python3
"""Update Ponytail without removing files used by running Codex sessions."""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def main():
    home = Path(os.environ.get('CODEX_HOME') or Path.home() / '.codex')
    cache = home / 'plugins/cache/colin-ponytail/ponytail'
    with tempfile.TemporaryDirectory(prefix='ponytail-update-') as temporary:
        backup = Path(temporary) / 'versions'
        if cache.exists():
            shutil.copytree(cache, backup)
        try:
            return subprocess.call(['codex', 'plugin', 'add', 'ponytail@colin-ponytail'])
        finally:
            # Codex keeps expanded hook paths in running sessions but prunes old versions on update.
            if backup.exists():
                cache.mkdir(parents=True, exist_ok=True)
                for version in backup.iterdir():
                    if not (cache / version.name).exists():
                        shutil.copytree(version, cache / version.name)


if __name__ == '__main__':
    raise SystemExit(main())
