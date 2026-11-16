"""Vercel entrypoint when the project's Root Directory is backend/.

Vercel's FastAPI preset looks for an `app` instance here and serves the whole
application, including /api/v1/... routes and /docs.
"""

from app.main import app  # noqa: F401

__all__ = ["app"]
