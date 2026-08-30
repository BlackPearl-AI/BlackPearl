@echo off
title DeepSeek Harness Launcher
cd /d "%~dp0"

echo ===================================================
echo             DeepSeek Harness Launcher
echo ===================================================
echo Project Directory: %~dp0
echo.
echo [1] Start DeepSeek Harness Web App (pnpm dsh web) [Default]
echo [2] Start ACP Agent Server for OpenCode (pnpm run demo:acp)
echo [3] Run Headless Task (pnpm dsh --profile headless)
echo [4] Start Web Frontend Dev Server (pnpm run dev:web)
echo [5] Install Dependencies (pnpm install)
echo [6] Build Project (pnpm run build)
echo [7] Start Documentation Website (pnpm run website:dev)
echo [8] Exit
echo ===================================================
echo.

set /p choice="Select an option (1-8) [Default: 1]: "
if "%choice%"=="" set choice=1

if "%choice%"=="1" goto run_web_app
if "%choice%"=="2" goto run_acp_server
if "%choice%"=="3" goto run_headless
if "%choice%"=="4" goto run_dev_web
if "%choice%"=="5" goto run_install
if "%choice%"=="6" goto run_build
if "%choice%"=="7" goto run_docs
if "%choice%"=="8" goto end

echo Invalid option selected.
pause
goto end

:run_web_app
echo.
echo Starting DeepSeek Harness Web App (with Free Models Support)...
call pnpm dsh web --patch cordis.patch.yml
goto finish

:run_acp_server
echo.
echo Starting DeepSeek Harness ACP Agent Server (Free Models via OpenRouter)...
call pnpm node --import tsx/esm packages/examples/acp-demo/src/bin.ts --config examples/acp-agent/cordis.yml --patch cordis.acp-free.patch.yml
goto finish

:run_headless
echo.
set /p task_prompt="Enter the task description for the agent: "
if "%task_prompt%"=="" (
    echo Task cannot be empty.
    pause
    goto end
)
echo.
echo Running Headless Task...
call pnpm dsh --profile headless "%task_prompt%"
goto finish

:run_dev_web
echo.
echo Starting Web Dev Server...
call pnpm run dev:web
goto finish

:run_install
echo.
echo Installing dependencies...
call pnpm install
goto finish

:run_build
echo.
echo Building project...
call pnpm run build
goto finish

:run_docs
echo.
echo Starting Documentation Site...
call pnpm run website:dev
goto finish

:finish
echo.
echo ===================================================
echo Process completed or stopped.
pause

:end

