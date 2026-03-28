from __future__ import annotations

import argparse
import os
from pathlib import Path

from backend_app import create_app


def _load_local_env() -> None:
    root = Path(__file__).resolve().parent
    for env_path in (root / ".env.local", root / ".env"):
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue

            if line.lower().startswith("export "):
                line = line[7:].strip()

            if "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()

            if not key:
                continue

            if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
                value = value[1:-1]

            # Real shell/cloud environment variables should win over local files.
            os.environ.setdefault(key, value)


_load_local_env()
app = create_app()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the AI Remix backend and UI.")
    parser.add_argument(
        "--host",
        default=os.getenv("HOST", "127.0.0.1"),
        help="Host to bind. Defaults to HOST env var or 127.0.0.1",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("PORT", "8010")),
        help="Port to serve on. Defaults to PORT env var or 8010",
    )
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development.")
    args = parser.parse_args()

    try:
        import uvicorn
    except ImportError as exc:  # pragma: no cover - runtime guard
        raise SystemExit(
            "uvicorn is not installed. Install the web dependencies first: "
            "python -m pip install fastapi uvicorn python-multipart"
        ) from exc

    uvicorn.run("server:app", host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    main()
