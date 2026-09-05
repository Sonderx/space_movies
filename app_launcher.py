import os
import sys
import multiprocessing
from pathlib import Path

if __name__ == "__main__":
    multiprocessing.freeze_support()

    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
        except Exception:
            pass

    root_dir = Path(__file__).resolve().parent
    if getattr(sys, "frozen", False):
        root_dir = Path(sys._MEIPASS)

    backend_dir = root_dir / "backend"
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    from backend.main import start_server
    start_server()