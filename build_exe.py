import os
import sys
import subprocess
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def build():
    root_dir = Path(__file__).resolve().parent
    frontend_dir = root_dir / "frontend"
    backend_dir = root_dir / "backend"

    cmd = [
        str(root_dir / ".venv" / "Scripts" / "pyinstaller.exe"),
        "--noconfirm",
        "--clean",
        "--onefile",
        "--name", "极光影院",
        "--add-data", f"{frontend_dir};frontend",
        "--add-data", f"{backend_dir};backend",
        "--hidden-import", "uvicorn",
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.http.h11_impl",
        "--hidden-import", "uvicorn.protocols.websockets",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--hidden-import", "anyio._backends._asyncio",
        "--hidden-import", "fastapi",
        "--hidden-import", "starlette",
        "--hidden-import", "httpx",
        "--hidden-import", "bs4",
        "--exclude-module", "playwright",
        str(root_dir / "app_launcher.py")
    ]

    print("正在使用 PyInstaller 编译为单文件绿色免安装 EXE ...")
    res = subprocess.run(cmd, cwd=str(root_dir))
    if res.returncode == 0:
        print("[SUCCESS] 打包成功！生成的单文件位于 dist/极光影院.exe")
    else:
        print(f"[ERROR] 打包失败，错误码: {res.returncode}")
        sys.exit(res.returncode)

if __name__ == "__main__":
    build()