---
name: deepseek-harness-worker
description: "Delegate tasks to real external DeepSeek Harness agent sessions (DSH_PLANNER, DSH_ARCHITECT, DSH_IMPLEMENTER, DSH_TESTER, DSH_CODE_REVIEWER, DSH_SECURITY_REVIEWER, DSH_DATABASE_REVIEWER, DSH_FIXER, DSH_VERIFIER) with automated Git Worktree snapshot isolation and distinct Orchestration Run IDs."
metadata:
  origin: OpenCode-DSH
---

# DeepSeek Harness External Agent Worker

Use this skill when delegating tasks to real external DeepSeek Harness agent processes with worktree snapshot isolation, Single-Writer enforcement, and structured Orchestration Run ID tracking.

---

## 1. Supported Specialist Roles

- **`DSH_PLANNER`**: SOFT READ-ONLY architecture inspection and step-by-step implementation plan.
- **`DSH_ARCHITECT`**: SOFT READ-ONLY system contract, API schema, and database design validation.
- **`DSH_IMPLEMENTER`**: Bounded code implementation in isolated git worktree snapshot (`.worktrees/dsh-*`).
- **`DSH_TESTER`**: Regression/unit/integration test creation and execution in isolated worktree.
- **`DSH_CODE_REVIEWER`**: SOFT READ-ONLY independent git diff and code quality review.
- **`DSH_SECURITY_REVIEWER`**: SOFT READ-ONLY OWASP Top 10, secrets, authentication, and injection audit.
- **`DSH_DATABASE_REVIEWER`**: SOFT READ-ONLY schema, index, transaction, and migration audit.
- **`DSH_FIXER`**: Surgical bug/defect correction in existing worktree based on verified reviewer findings.
- **`DSH_VERIFIER`**: SOFT READ-ONLY / TEST RUNNER independent diff, test suite, and build verification.

---

## 2. Invocation Commands

### Single Agent Run:
```powershell
node "C:\Users\victo\.config\opencode\scripts\dsh-delegate.js" --role DSH_PLANNER --objective "<GOAL>" --targetPath "<DIR>"
```

### Full Multi-Agent Pipeline:
```powershell
node "C:\Users\victo\.config\opencode\scripts\dsh-team.js" --pipeline <COMPLEX|HIGH_RISK|HEAVY|AUDIT|REALITY_CHECK|FULL_ASSURANCE|COMPLIANCE_AUDIT|INFRA_OPS|STARTUP_MVP|ENTERPRISE_FEATURE|INCIDENT_RESPONSE|MCP_SERVER|CODE_ARCHAEOLOGY|SPATIAL_APP|AI_SECURITY_AUDIT|HARDCORE_SEC_AUDIT|UI_POLISH|RAG_PIPELINE|MOBILE_APP|PAYMENTS_BILLING|FULL_STACK_DEV|GIS_PIPELINE|GAME_DESIGN|HEALTHCARE_EVAL|GTM_LAUNCH|DEEP_RESEARCH> --objective "<GOAL>" --targetPath "<DIR>"
```

---

## 3. Worktree & Diff Isolation

1. **Dirty-Workspace Snapshot**:
   - Tracked modifications (`git diff HEAD --binary`) are applied to the isolated worktree via `git apply --binary`.
   - Safe untracked files are copied; secrets (`.env`, `credentials`), backups, and build artifacts are strictly excluded.
   - Base snapshot commit is created locally in the worktree.
2. **Isolated Diff**:
   - DSH diff is computed strictly as `DSH RESULT - BASE SNAPSHOT` to isolate user uncommitted work from DeepSeek additions.
3. **No Automatic Merge**:
   - Outputs are returned to Antigravity Lead for independent ECC verification before any merge.

---

## 4. Universal Modular Architecture Mandate

All DSH roles automatically receive and enforce the 5-level Modular Architecture Hard Rule:
- **Project → Domain → Feature → Use-case → Responsibility → File**
- **DSH_PLANNER**: Produces granular use-case breakdowns (one file per business action).
- **DSH_IMPLEMENTER**: Writes code strictly in dedicated feature subfolders; no 4000-line monolithic files.
- **DSH_CODE_REVIEWER**: Audits diffs for modular boundaries, feature colocation, and public contracts.

---

## 5. Documentation-First & Sequential Execution Mandate

All DSH delegations must be micro-task bounded:
- **Never open-ended**: DSH never receives "Build module X". DSH receives MT-ID with explicit allowed files.
- **Documentation discovery**: DSH inspects relevant project-authored docs and verifies live reality before modifying code.
- **Single active micro-task**: Executes one micro-task at a time (Implement ➔ Test ➔ Diff Review ➔ DoD Verified).
- **Discovery to Backlog**: Unrelated bugs discovered during execution are logged to backlog, not fixed in active scope.










