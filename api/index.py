"""Vercel serverless entrypoint: exposes the FastAPI app from backend/main.py."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from backend.main import app  # noqa: E402,F401
