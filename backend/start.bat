@echo off
chcp 65001 >nul
echo ====================================
echo   RETALK Backend 启动脚本
echo   毕业设计演示版本
echo ====================================
echo.

cd /d "%~dp0"

echo [1/3] 检查 Python 环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python 环境
    pause
    exit /b 1
)
echo [OK] Python 环境正常

echo.
echo [2/3] 检查 Ollama 服务...
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo [警告] Ollama 服务可能未启动，请检查 http://localhost:11434
) else (
    echo [OK] Ollama 服务正常
)

echo.
echo [3/3] 启动 RETALK Backend...
echo [信息] 访问 http://localhost:8000/docs 查看 API 文档
echo.
echo 按 Ctrl+C 停止服务
echo.

python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

pause
