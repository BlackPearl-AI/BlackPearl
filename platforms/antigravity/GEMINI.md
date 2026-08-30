# ⚡ BlackPearl for Gemini & Antigravity IDE

This file provides the baseline **BlackPearl** workflow, review standards, and security checks for repositories and global environments.

## Overview

**BlackPearl** is a unified autonomous AI coding operating system with 68 specialized core agents, 345+ skills, 94 commands, and 18 specialist divisions (273+ subagents).

## Core Workflow (DUAL HARD RULES)

1. **Stop & Discover Documentation**: Read all project-authored `.md` files before writing any code. Never confuse understanding the goal with permission to immediately implement.
2. **Verify Live Code Reality**: Check executable code, DB schemas, and tests; classify claims as `VERIFIED_CURRENT`, `VERIFIED_RESOLVED`, or `HISTORICAL`.
3. **5-Level Decomposition**: Derive `Project → Domain → Feature → Use-case → Responsibility → File`.
4. **Hierarchical Planning**: Break work into `Goal → Phase → Task → Micro-task`.
5. **Single-Track Execution**: Execute **EXACTLY ONE** active micro-task at a time (`Implement ➔ Test ➔ Diff Review ➔ Close`).
6. **Synchronous Updates**: Update architecture and documentation synchronously when behaviors change.

## Coding Standards

- **Modular Architecture (HARD RULE)**: Enforce 5-level decomposition. One business action = one use-case file. No giant 4000-line service files or monster pages.
- **Documentation-First (HARD RULE)**: Stop, discover project docs, verify against live reality, and execute sequentially one micro-task at a time.
- **Feature ownership**: No dumping business logic into `shared/` or `utils/`.
- **Cross-module communication**: Via `public/` contracts only; `internal/` is strictly private.
- **Frontend/Backend mirroring**: Feature maps must mirror identically across client and server.
- **Prefer immutable updates**: Over in-place mutation.
- **Keep functions small and files focused**: (<50 lines per function, <400 lines typical per file).
- **Validate user input**: At system boundaries.
- **Never hardcode secrets**: Enforce `.env` isolation.
- **Fail loudly**: With clear error messages instead of silently swallowing problems.

## Security Checklist

Before any commit:
- No hardcoded API keys, passwords, or tokens
- All external input validated
- Parameterized queries for database writes
- Sanitized HTML output where applicable
- Authz/authn checked for sensitive paths
- Error messages scrubbed of sensitive internals

## Delivery Standards

- Use conventional commits: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`
- Run targeted verification for touched areas before shipping
- Prefer contained local implementations over adding new third-party runtime dependencies

## BlackPearl Areas To Reuse

- `AGENTS.md` for repo-wide operating rules
- `skills/` for deep workflow guidance
- `commands/` for slash-command patterns worth adapting into prompts/macros
- `mcp-configs/` for shared connector baselines

