"""Vercel entrypoint when the project's Root Directory is the repository root.

Vercel's FastAPI preset looks for an `app` instance in index.py / main.py /
app.py / server.py and routes every request to it, so no rewrites are needed.
backend/ is added to sys.path because the API package lives there.
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app  # noqa: E402,F401

__all__ = ["app"]
