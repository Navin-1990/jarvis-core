import os
from pathlib import Path

from app.core import settings


ALLOWED_ROOT = Path(settings.GENERATED_SITES_DIR).resolve()


class FileTool:

    def _validate_path(self, path):
        resolved = Path(path).resolve()
        if not str(resolved).startswith(str(ALLOWED_ROOT)):
            raise ValueError(
                f"Path must be within {ALLOWED_ROOT}"
            )
        return resolved

    def create_folder(self, path):
        safe_path = self._validate_path(path)
        os.makedirs(safe_path, exist_ok=True)

    def write_file(self, path, content):
        safe_path = self._validate_path(path)
        safe_path.parent.mkdir(parents=True, exist_ok=True)

        with open(safe_path, "w", encoding="utf-8") as f:
            f.write(content)
