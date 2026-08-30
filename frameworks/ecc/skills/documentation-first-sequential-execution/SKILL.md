---
name: documentation-first-sequential-execution
description: "Universal hard execution lifecycle: Goal -> Read Project Docs -> Verify Live Code Reality -> Plan & Gap Analysis -> Decompose to Phases/Tasks/Micro-tasks -> Execute ONE Active Micro-task -> Test & Verify -> Complete -> Next. Enforces zero premature coding and bounded single-track execution."
metadata:
  origin: ECC
---

# DOCUMENTATION-FIRST SEQUENTIAL EXECUTION — HARD RULE
# Applies to: All projects, all languages, all agents (Antigravity, OpenCode, DeepSeek Harness)

> **MANDATORY CORE AXIOM:**  
> **"Never confuse understanding the goal with permission to immediately implement the goal."**  
> Every agent, every session, every user goal. Non-negotiable.

---

## Core Execution Flow

```
                   USER GOAL
                       │
                       ▼
             1. STOP — NO CODING YET
                       │
                       ▼
             2. DISCOVER ALL PROJECT DOCS
                (Root & Nested .md excluding dependencies)
                       │
                       ▼
             3. VERIFY DOCS AGAINST LIVE CODE
                (Code, Tests, DB, Config = Ground Truth)
                       │
                       ▼
             4. GAP ANALYSIS & MODULAR PLAN
                (Project → Domain → Feature → Use-case)
                       │
                       ▼
             5. HIERARCHICAL DECOMPOSITION
                Goal → Phases → Tasks → Micro-tasks
                       │
                       ▼
             6. ONE ACTIVE MICRO-TASK ONLY
                (Implementation → Test → Diff Review → Acceptance)
                       │
                       ▼
             7. MARK COMPLETE ➔ PROCEED TO NEXT
```

---

## Rule 1 — Zero Immediate Coding (HARD STOP)

**NEVER START IMPLEMENTATION DIRECTLY FROM THE USER GOAL.**

When given a goal (e.g., *"Complete inventory module banao"*), the agent MUST NOT immediately create `inventory.py`, `InventoryPage.tsx`, or `inventory.service.ts`.

The agent MUST execute the mandatory sequence:
`UNDERSTAND → DISCOVER → READ → VERIFY → PLAN → DECOMPOSE → EXECUTE`

---

## Rule 2 — Mandatory Documentation Discovery

The agent MUST proactively scan the project root and nested directories for all project-authored documentation:
- Root docs: `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `GOALS.md`, `REQUIREMENTS.md`, `DATABASE.md`, `SCHEMA.md`, `API.md`, `RULES.md`, `HANDOFF.md`, `STATUS.md`, `TODO.md`, `DECISIONS.md`, `DEPLOYMENT.md`
- Module-level docs: `modules/<module>/README.md`, `modules/<module>/ARCHITECTURE.md`, `modules/<module>/<feature>/FLOW.md`

---

## Rule 3 — Document Scope & Exclusion Filter

The agent MUST read project-authored Markdown documentation, but **STRICTLY EXCLUDE** dependency and generated documentation:
- **INCLUDE:** `<project>/**/*.md` (authored documentation)
- **EXCLUDE:** `node_modules/`, `vendor/`, `.venv/`, `dist/`, `build/`, `.worktrees/`, `third_party/`, generated API HTML/specs.

---

## Rule 4 — Documentation vs Reality Verification (Evidence Classification)

Documentation represents **Intent and History**. Executable Code, Tests, DB schemas, and Configuration represent **Live Reality**.

For every claim found in documentation, the agent must classify:
1. `VERIFIED_CURRENT`: Doc claim matches current live code.
2. `VERIFIED_RESOLVED`: Doc says "pending", but code/test proves it is already implemented.
3. `HISTORICAL_ONLY`: Contextual background; not actionable today.
4. `UNKNOWN / UNVERIFIED`: Requires inspection before proceeding.

*Never re-implement or "fix" an item that live tests prove is already resolved.*

---

## Rule 5 — Mandatory Documentation Creation for Undocumented Modules

If a new or complex module has no existing documentation, the agent MUST author minimum required documentation **BEFORE** writing source code:
```
module/
├── README.md                 (Business purpose & scope)
├── ARCHITECTURE.md           (Boundaries & contracts)
└── IMPLEMENTATION_PLAN.md    (Phase/Task/Micro-task breakdown)
```

---

## Rule 6 — Proportional Documentation Standard

Documentation depth must match task complexity:
- **Trivial** (*"Fix button label Save → Update"*): No new docs; inline verification only.
- **Standard Feature**: Implementation plan, affected files list, acceptance criteria.
- **Complex Module**: `README.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `TASKS.md`.
- **High-Risk Subsystem** (Auth, Billing, Migrations): Add `SECURITY.md`, `DATA_FLOW.md`, `API_CONTRACT.md`, `MIGRATION_PLAN.md`.

*Never create bureaucratic documentation for its own sake.*

---

## Rule 7 — Four-Level Decomposition: Goal → Phase → Task → Micro-task

Every non-trivial goal MUST be decomposed into a strict 4-level hierarchy:

```
GOAL: Complete Patient Billing
│
├── PHASE 1: Discovery & Contract Analysis
│   ├── Task 1.1: Read billing docs & inspect DB schema
│   └── Task 1.2: Identify missing API endpoints
│
├── PHASE 2: Domain Logic (Use-cases)
│   ├── Task 2.1: Invoice calculation rules
│   └── Task 2.2: Payment processing rules
│       ├── MT-2.2.1: Define PaymentEntity & rules
│       ├── MT-2.2.2: Create CreatePaymentUseCase
│       └── MT-2.2.3: Unit test payment use-case
│
├── PHASE 3: Backend API & Persistence
│   ├── Task 3.1: Payment API router
│   └── Task 3.2: Payment repository & tenant isolation
│
└── PHASE 4: Verification & Regression
    ├── Task 4.1: Integration tests
    └── Task 4.2: Security review
```

---

## Rule 8 — ONE Active Micro-Task Only (STRICT SINGLE-TRACK)

**Execution Rule:** An agent MUST focus on **EXACTLY ONE** active micro-task at any given moment.

**FORBIDDEN:** Concurrently modifying patient, billing, auth, and reporting files in the same turn.

**REQUIRED:**
`MT-1 Active ➔ Implement ➔ Test ➔ Verify ➔ Close ➔ MT-2 Active`

---

## Rule 9 — Strict Definition of Done (DoD) per Micro-Task

A micro-task is NOT done simply because code was written. A micro-task is done ONLY when:
1. Implementation is complete and strictly scoped.
2. Targeted unit/regression test is written and PASSING.
3. Git diff is inspected for unintended side-effects.
4. Acceptance criteria are satisfied.
5. Zero compiler, runtime, or linter errors exist.

---

## Rule 10 — Hierarchical "Done" Precision (No Premature Victory)

The agent must maintain clear boundaries between completion levels:
- `MICRO-TASK DONE` ≠ `TASK DONE`
- `TASK DONE` ≠ `PHASE DONE`
- `PHASE DONE` ≠ `GOAL DONE`

The agent must report deterministic progress (e.g., *"Micro-task MT-2.2.1 Complete; Task 2.2 is 33% (1/3 MTs done); Overall Goal 25% complete"*).

---

## Rule 11 — Dependency Graph Order (Strict Pipeline Sequence)

Implementation must follow natural architectural dependency direction:

```
1. FOUNDATION (Config, base schemas, DB migrations)
   ↓
2. DOMAIN (Entities, business rules, custom errors)
   ↓
3. DATA ACCESS (Repositories, mappers, DB queries)
   ↓
4. APPLICATION (Single-purpose use-case files)
   ↓
5. API / CONTROLLERS (Routes, request/response DTOs)
   ↓
6. UI (Pages, components, hooks)
   ↓
7. INTEGRATION & VERIFICATION (E2E flows, security audit)
```

Never build UI before backend contracts exist; never build API before domain use-cases exist.

---

## Rule 12 — Micro-Task Contract Specification

Every micro-task must adhere to an internal bounded contract:

```markdown
### [MT-BILL-03] Add Tenant-Safe Payment Creation
- **Objective**: Implement CreatePaymentUseCase with tenant boundary isolation.
- **Inputs**: Current payment schema, patient billing record.
- **Allowed Scope**: `modules/billing/payment/application/create-payment.usecase.ts`
- **Forbidden Scope**: `ui/`, unrelated modules, `.env`
- **Dependencies**: MT-BILL-01, MT-BILL-02
- **Tests**: `tests/billing/payment/create-payment.test.ts`
- **Acceptance Criteria**: Payment records with proper tenant ID; rejects cross-tenant IDs.
- **Status**: ACTIVE
```

---

## Rule 13 — Zero Scope Drift / Discovery Is Not Permission

If an agent discovers an unrelated bug or missing feature while working on an active micro-task:
- **DO NOT** divert to fix the newly discovered item.
- **RECORD** the discovery into the project `Backlog`.
- **CONTINUE** and complete the current active micro-task.

---

## Rule 14 — Backlog Registry for Discovered Work

Discovered improvements or bugs must be appended to the task backlog:
`[BACKLOG-014] Found duplicate patient lookup issue during MT-BILL-03 inspection.`

---

## Rule 15 — Explicit Blocker Handling

If an active micro-task is blocked by a missing prerequisite:
1. Mark status as `BLOCKED`.
2. State the explicit blocking reason and required prerequisite task.
3. Switch focus ONLY to the prerequisite task.

---

## Rule 16 — Authoritative Evidence Hierarchy

When resolving conflicts between sources:
1. **Tier 1**: User's Explicit Current Instruction
2. **Tier 2**: Project Rules (`rules/`, `AGENTS.md`)
3. **Tier 3**: Current Executable Code / DB Schema / Live Config
4. **Tier 4**: Live Test Execution Outputs
5. **Tier 5**: Current Architecture Documentation
6. **Tier 6**: Historical Docs (`CHANGELOG`, old `HANDOFF.md`, archived `TODO.md`)

*Tier 6 never overrides Tier 3 or Tier 4.*

---

## Rule 17 — Module Task Ledger (`TASKS.md`)

Complex modules should maintain a lightweight execution ledger:

```markdown
# Module Tasks

## Phase 1: Foundation
- [x] T-101 Base DB Schema
- [x] T-102 Domain Entities

## Phase 2: Implementation
- [>] T-201 Payment Use-Case (Active: MT-201.2)
- [ ] T-202 Payment API Endpoint
```

---

## Rule 18 — Task Ledger Integrity

`TASKS.md` is an **execution tracker**, NOT ground truth. If code and tests show a task is done, the tracker must be updated to match reality.

---

## Rule 19 — Session Restart Resilience

On session startup or context resume, the agent must:
1. Read project rules and AGENTS guidelines.
2. Read project docs and `TASKS.md` ledger.
3. Verify live repository state against the ledger.
4. Resume the exact next unfinished verified micro-task without asking the user to re-explain.

---

## Rule 20 — Concise Handoff Standard (`HANDOFF.md`)

When pausing or ending a multi-step session, record ONLY:
- Primary Goal
- Completed Phases & Tasks
- Active Phase & Task
- Last Verified Micro-task
- Immediate Next Micro-task
- Known Blockers & Key Decisions

*No raw chat dumps or speculative unverified tasks.*

---

## Rule 21 — Synchronous Documentation Updates

If an implementation changes an architecture boundary, API contract, or data flow, the corresponding documentation MUST be updated within that same task before marking it complete.

---

## Rule 22 — No Bureaucratic Over-Documentation

Document only what controls architecture, contracts, decisions, boundaries, and verification. Avoid generating redundant, decorative documentation.

---

## Rule 23 — Pre-Execution File Registry

Before creating or editing files in a complex feature, the agent must declare:
- `FILES TO CREATE`
- `FILES TO MODIFY`
- `FILES TO READ`
- `FILES FORBIDDEN`

---

## Rule 24 — Reuse Existing Code Before Creating New

Before creating any new file or helper:
- Check if an equivalent responsibility already exists in the feature or module.
- If yes → reuse or extend.
- If distinct responsibility → create focused new file.

---

## Rule 25 — Zero Giant Batch Execution

**FORBIDDEN:** Single-shot changes creating 30+ files across multiple domains without intermediate verification.

**REQUIRED:** Incremental, verified micro-tasks in sequence.

---

## Rule 26 — Multi-Agent & DeepSeek Harness Micro-Task Bounding

When delegating work to external multi-agent systems (e.g., DeepSeek Harness `DSH_IMPLEMENTER`, `DSH_TESTER`, `DSH_FIXER`):
- **NEVER** pass an open-ended goal like *"Build the billing module"*.
- **ALWAYS** pass a strictly bounded micro-task: *"Implement MT-BILL-03: CreatePaymentUseCase only in modules/billing/payment/application/."*

---

## Rule 27 — Bounded DeepSeek Harness Handoff Contract

Every DSH delegation must supply:
1. Micro-Task ID & Objective
2. Allowed Scope (Explicit files)
3. Forbidden Scope (Secrets, unrelated modules)
4. Verified Current State
5. Test Requirements
6. Acceptance Criteria / Definition of Done

---

## Rule 28 — Standardized Planning Artifacts

```
docs/
├── PROJECT_GOAL.md
├── ARCHITECTURE.md
└── DEVELOPMENT_PLAN.md

modules/<module>/
├── README.md
├── ARCHITECTURE.md
└── TASKS.md
```

---

## Rule 29 — Deterministic State Awareness

The agent must be able to report its exact state at any point:
- **CURRENT GOAL:** [Goal name]
- **CURRENT PHASE:** [Phase X]
- **CURRENT TASK:** [Task Y]
- **CURRENT MICRO-TASK:** [MT-Z (ACTIVE)]
- **NEXT MICRO-TASK:** [MT-Z+1]

---

## Rule 30 — The Dual-Skill Unified Discipline

Both global skills operate together as the foundational engine:

```
┌─────────────────────────────────────────────────────────────┐
│ SKILL 1: MODULAR ARCHITECTURE                               │
│ Structure: Project → Domain → Feature → Use-case → File     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ SKILL 2: DOCUMENTATION-FIRST SEQUENTIAL EXECUTION           │
│ Lifecycle: Goal → Read Docs → Verify Reality → Plan →       │
│            Decompose → One Micro-Task → Verify → Next       │
└─────────────────────────────────────────────────────────────┘
```
