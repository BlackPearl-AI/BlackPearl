# Qwen Code Engine — Complete CLI & Subcommands Reference

The `qwen-code-main` monorepo (`G:\0000 PY PROGRAM\july\super AIrepo_and_aget\qwen-code-main - Copy\qwen-code-main`) exposes a powerful CLI via TypeScript entry point `packages/cli/src/cli.ts`.

---

## 🛠️ Environment Configuration for 100% Offline Local Mode

Before executing any CLI commands, set the local Ollama environment variables:

### Windows PowerShell:
```powershell
$env:OPENAI_API_BASE="http://localhost:11434/v1"
$env:OPENAI_API_KEY="ollama"
$env:OPENAI_MODEL="qwen2.5-coder:7b"
$env:QWEN_MODEL="qwen2.5-coder:7b"
$env:QWEN_PROVIDER="openai"
```

### Windows CMD:
```cmd
set OPENAI_API_BASE=http://localhost:11434/v1
set OPENAI_API_KEY=ollama
set OPENAI_MODEL=qwen2.5-coder:7b
set QWEN_MODEL=qwen2.5-coder:7b
set QWEN_PROVIDER=openai
```

---

## 🚀 Key Commands & Execution Modes

### 1. Universal Agent Mode (`universal`)
Runs full autonomous software generation, creating microtask queues, candidate isolation labs, quality scoring, and automated unit tests.

```powershell
npx tsx "G:\0000 PY PROGRAM\july\super AIrepo_and_aget\qwen-code-main - Copy\qwen-code-main\packages\cli\src\cli.ts" universal --goal "<GOAL_DESCRIPTION>"
```

### 2. Playwright Browser Audit Mode (`--browserAudit`)
Runs automated headless/headed Playwright web application UI audits, capturing screenshots, console errors, and generating bug repair microtasks.

```powershell
npx tsx "G:\0000 PY PROGRAM\july\super AIrepo_and_aget\qwen-code-main - Copy\qwen-code-main\packages\cli\src\cli.ts" universal --browserAudit --url "http://localhost:3000"
```

### 3. Monorepo Package Reference

| Package Path | Purpose | Key Commands |
| :--- | :--- | :--- |
| `packages/cli` | Primary Agent CLI Entrypoint | `npx tsx src/cli.ts` |
| `packages/acp-bridge` | Agent Communication Protocol Bridge | `npm run build` |
| `packages/core` | Core Agent Engine & AST Parsers | Internal engine |
| `packages/webui` | Browser Control UI | `npm run dev` |
| `packages/desktop` | Electron Desktop App wrapper | `npm run start` |
| `packages/chrome-extension` | Chrome Extension Companion | Build extension |
| `packages/vscode-ide-companion` | VS Code Extension Companion | `vsce package` |
