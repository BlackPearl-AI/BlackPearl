# ⚡ BlackPearl Core Engine (Multi-Agent Worktree Isolation & Execution)

> **The Core Execution & Isolation Engine of BlackPearl.**  
> Provides isolated worktree snapshotting, multi-agent process pipelines, automatic base diff computation (`RESULT - BASE SNAPSHOT`), and dynamic persona injection.

---

## 🌟 Overview

**BlackPearl Core Engine** is the execution backbone for multi-agent autonomous engineering within **BlackPearl**. It powers:

1. **Worktree Snapshot Isolation**: Real OS processes running inside dedicated temporary git worktrees (`.worktrees/dsh-*`) so that the host repository stays 100% clean.
2. **Automated Multi-Agent Pipelines**: 26 pre-configured automated workflows (Full Stack Feature, High-Risk Security Audits, Migration Gate, Refactoring loops).
3. **Dynamic Persona Loader**: Dynamically loads any of the 273+ BlackPearl Division specialist personas into runtime tasks.
4. **Base Snapshot Diffing**: Ensures prior uncommitted work from the developer is never falsely attributed to AI tasks.

---

## 🚀 Execution Commands

### Run Multi-Agent Team Pipeline
```bash
node scripts/dsh-team.js --pipeline FULL_STACK_DEV --objective "<YOUR_OBJECTIVE>"
```

### Run Single Bounded Role Session
```bash
node scripts/dsh-delegate.js --role DSH_PLANNER --task "<TASK>" --allowed-files "src/**"
```

---

## 📂 Architecture

- **`apps/cli`**: CLI interface and interactive terminal runner.
- **`apps/web`**: Web monitoring UI for live agent telemetry.
- **`packages/`**: Core runtime libraries, cordis plugin framework, diff isolation adapters.
- **`scripts/`**: Pipeline runners (`dsh-delegate.js`, `dsh-team.js`, etc.).

---

## 📜 License
MIT License. Part of the BlackPearl ecosystem.

