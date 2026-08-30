@echo off
title DeepSeek Harness Web App
cd /d "%~dp0"
echo Starting DeepSeek Harness Web App (with Free Models Support)...
call pnpm dsh web --patch cordis.patch.yml
pause
