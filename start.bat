@echo off

REM AI Scholar 启动脚本
cd /d "%~dp0"

echo =======================================
echo        AI Scholar 启动脚本        
echo =======================================
echo.
echo 正在启动 AI Scholar 应用...
echo 请确保已安装 Node.js 环境
echo 访问地址: http://localhost:5173/
echo (如果端口被占用，Vite 会自动分配其他端口)
echo.
echo 按 Ctrl+C 可以停止应用
echo =======================================
echo.

REM 启动开发服务器
npm run dev

pause