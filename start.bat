@echo off
chcp 65001 >nul
title 极光影院 - 聚合影视搜索与解析服务

echo ========================================================
echo          极光影院 Cinema Hub 正在启动...
echo ========================================================
echo.

cd /d "%~dp0"

REM 检查系统 Python 环境
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python 环境，请先安装 Python 3.9+ 并将其勾选加入 PATH 环境变量。
    pause
    exit /b 1
)

REM 检查虚拟环境
if not exist ".venv\Scripts\python.exe" (
    echo [1/3] 正在创建 Python 虚拟环境 venv...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [错误] 创建虚拟环境失败。
        pause
        exit /b 1
    )
)

REM 检查并安装依赖
echo [2/3] 正在检查与安装后端依赖库...
".venv\Scripts\python.exe" -m pip install -r backend\requirements.txt -q
if %errorlevel% neq 0 (
    echo [警告] 依赖安装有提示或网络波动，尝试继续启动...
)

REM 启动本地服务并打开浏览器
echo [3/3] 启动本地影院服务 http://localhost:8000 ...
start http://localhost:8000

echo.
echo ========================================================
echo   服务已成功启动！
echo   访问地址: http://localhost:8000
echo.
echo   如需停止服务，请在此窗口按 Ctrl + C。
echo ========================================================
echo.

cd /d "%~dp0backend"
"..\.venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
