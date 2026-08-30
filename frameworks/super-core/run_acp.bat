@echo off
title DeepSeek Harness ACP Agent Server
cd /d "%~dp0"
echo Starting DeepSeek Harness ACP Server...
call pnpm run demo:acp
pause
