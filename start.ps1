# 极光影院 PowerShell 启动脚本
$Host.UI.RawUI.WindowTitle = "极光影院 - 聚合影视搜索与解析服务"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         极光影院 Cinema Hub 正在启动..." -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path $PSScriptRoot

# 1. 检查 Python 环境
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[1/3] Python 环境正常: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[错误] 未检测到 Python 环境，请先安装 Python 3.9+ 并勾选加入 PATH。" -ForegroundColor Red
    pause
    exit 1
}

# 2. 检查或创建虚拟环境
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "[2/3] 正在创建虚拟环境 venv..." -ForegroundColor Yellow
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 虚拟环境创建失败。" -ForegroundColor Red
        pause
        exit 1
    }
}

# 3. 安装依赖
Write-Host "[2/3] 正在检查依赖..." -ForegroundColor Yellow
& ".venv\Scripts\python.exe" -m pip install -r backend\requirements.txt -q

# 4. 打开浏览器并启动
Write-Host "[3/3] 启动服务并打开浏览器: http://localhost:8000" -ForegroundColor Green
Start-Process "http://localhost:8000"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  服务已启动！浏览器访问地址: http://localhost:8000" -ForegroundColor Green
Write-Host "  按 Ctrl + C 即可停止服务。" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path "$PSScriptRoot\backend"
& "..\.venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload