# ⚡ BlackPearl Core Engine (多智能体工作区隔离与执行引擎)

> **BlackPearl 的核心执行与多进程隔离引擎。**  
> 提供隔离的工作区（Git Worktree）快照、多智能体协作流水线、自动差异计算（`RESULT - BASE SNAPSHOT`）以及动态专家角色注入机制。

---

## 🌟 概述

**BlackPearl Core Engine** 是 **BlackPearl** 自主 AI 软件工程的多智能体底层执行引擎：

1. **Worktree 工作区快照隔离**：多智能体在独立的临时 Git 工作区（`.worktrees/dsh-*`）中运行，确保主代码仓库 100% 干净与安全。
2. **多智能体自动化流水线**：预置 26 种自动化协作工作流（全栈功能开发、高风险安全审计、数据库迁移与重构回路）。
3. **动态角色加载器**：动态加载 273+ BlackPearl Divisions 专家智能体 Persona。
4. **快照差异计算**：确保开发者原有的未提交代码永远不会被错误归因于 AI 修改。

---

## 🚀 运行命令

### 运行多智能体协作团队流水线
```bash
node scripts/dsh-team.js --pipeline FULL_STACK_DEV --objective "<目标描述>"
```

### 运行单角色独立任务
```bash
node scripts/dsh-delegate.js --role DSH_PLANNER --task "<任务描述>" --allowed-files "src/**"
```

---

## 📜 许可证
MIT License. 属于 BlackPearl 生态系统。

