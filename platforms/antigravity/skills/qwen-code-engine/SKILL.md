---
name: qwen-code-engine
description: Production-grade 100% offline local agent engine using local qwen2.5-coder:7b (Ollama) for deep code synthesis, Playwright browser audits, candidate isolation labs, quality gates, automated test-driven repairs, and automatic run_app.bat launcher creation. Trigger for ALL coding tasks, software development, building desktop/web/python/typescript applications, refactoring, or bug fixes.
---

# 🚀 Qwen Code Engine Skill (`qwen-code-engine`)

This skill integrates the **Qwen Universal AI Code Engine** located at `G:\0000 PY PROGRAM\july\super AIrepo_and_aget\qwen-code-main - Copy\qwen-code-main\`.

---

## 📌 Engine Capabilities & Commands

### 1. Setup Engine (1-Click Windows Setup)
To initialize dependencies and build core packages:
```powershell
cd "G:\0000 PY PROGRAM\july\super AIrepo_and_aget\qwen-code-main - Copy\qwen-code-main"
.\setup.bat
```

### 2. Launch Interactive Terminal UI
```powershell
cd "G:\0000 PY PROGRAM\july\super AIrepo_and_aget\qwen-code-main - Copy\qwen-code-main"
npm start
```

### 3. Launch Daemon Server Engine (HTTP + SSE Stream)
To allow other sub-agents to stream tasks via Agent Communication Protocol (ACP):
```powershell
cd "G:\0000 PY PROGRAM\july\super AIrepo_and_aget\qwen-code-main - Copy\qwen-code-main"
npm run dev:daemon
```

---

## 🛠️ Integrated Sub-Agent Isolation Rules

- **`Explore` Subagent:** Read-Only exploration. Executes `glob`, `grep`, `read_file` only. Zero file modifications allowed.
- **`General-purpose` Subagent:** Multi-step implementation worker. Executes code edits and runs automated test verification before returning concise summary to parent agent.
- **Candidate Isolation Labs:** Works inside `brain/sandbox/task_<id>/` before merging into production codebase.
