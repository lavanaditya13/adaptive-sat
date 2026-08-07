import sys
from pathlib import Path

# The merged Vercel deployment's working directory doesn't put `backend/`
# on sys.path the way the old standalone project (Root Directory=backend)
# did, so `app` isn't importable without this.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.main import app  # noqa: E402

# Force a fresh Vercel build (2026-08-06): verifying Preview env var changes
# (FRONTEND_URL) actually propagate to a new deployment.
