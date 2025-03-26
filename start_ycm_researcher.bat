@echo off
echo 启动 YCM Researcher Enhanced...
cd /d %~dp0

REM 检查是否已安装所需的依赖项
python -c "import fastapi" 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo 正在安装必要的依赖项...
    pip install fastapi uvicorn python-dotenv requests aiohttp markdown
)

REM 启动应用程序
python main.py

pause
