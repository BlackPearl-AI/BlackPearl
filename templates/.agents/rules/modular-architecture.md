# MODULAR ARCHITECTURE — HARD RULE

> **MANDATORY.** This rule applies to all projects, all languages, all agents. Non-negotiable.

---

## Core Principle

```
Project → Module/Domain → Feature/Capability → Use-case → Responsibility → File
```

**Agent decomposes FIRST. Then writes code. Never the reverse.**

Before touching a single file on any new module or feature, the agent MUST internally derive:
```
MODULE → FEATURES → USE CASES → FILES → DEPENDENCIES → TESTS
```
Present this structure (or self-approve if trivial), then implement.

---

## Rule 1 — Five-Level Decomposition (MANDATORY)

```
PROJECT
│
├── MODULE / BUSINESS DOMAIN
│     ├── FEATURE / CAPABILITY
│     │      ├── USE CASE / ACTION
│     │      │      ├── domain/
│     │      │      ├── application/
│     │      │      ├── api/
│     │      │      ├── data/
│     │      │      ├── ui/
│     │      │      ├── validation/
│     │      │      ├── permissions/
│     │      │      ├── events/
│     │      │      ├── jobs/
│     │      │      ├── infrastructure/
│     │      │      ├── tests/
│     │      │      └── docs/
│     │      └── (only folders with actual content)
│     └── MODULE CONTRACTS (public/ + shared/)
└── SHARED / PLATFORM (truly cross-domain only)
```

**FORBIDDEN:**
- `laboratory.service.ts` with 4000 lines
- `LaboratoryPage.tsx` containing the entire module

**REQUIRED:**
```
laboratory/
├── sample-receive/
├── result-entry/
├── result-validation/
├── result-approval/
├── critical-value-alert/
├── instrument-integration/
└── report-generation/
```

---

## Rule 2 — One Business Action = One Focused Use-Case File

```
patient-registration/
└── application/
    ├── create-patient.usecase.ts
    ├── update-patient.usecase.ts
    ├── search-patient.usecase.ts
    ├── detect-duplicate-patient.usecase.ts
    ├── merge-patient.usecase.ts
    ├── assign-patient-id.usecase.ts
    └── upload-patient-document.usecase.ts
```

Not one `patient.service.ts` with all of these crammed together.

---

## Rule 3 — Split Decision (CRITICAL)

### Split WHEN:
- Responsibility is distinct
- Business rule is distinct
- Lifecycle is distinct
- Dependencies are distinct
- Needs to be independently tested
- Has independent change probability

### Do NOT Split WHEN:
- 3-line helper with no independent life
- Tightly-coupled private logic of the same responsibility
- Splitting harms discoverability
- Creates meaningless micro-files: `getName.ts`, `setName.ts`, `formatName.ts`

**Goal: Modularity, NOT inflated file count.**

---

## Rule 4 — Feature Ownership (HARD)

Every file has ONE clear owner feature.

- Code used only by `payment` → `billing/payment/`
- Code used by 4+ billing features → `billing/shared/`
- Code used by multiple unrelated modules → `shared/` (and ONLY then)

**`shared/` is NOT a garbage dump.**

---

## Rule 5 — Cross-Module Dependency via Contract Only

**FORBIDDEN:** `billing/` directly imports `patient/internal/repository`

**REQUIRED:**
```
Patient Module
     ↓
patient/public/patient.contract.ts
patient/public/patient.query.ts
     ↓
Billing Module  ← consumes ONLY patient/public/
```

Agents must NEVER import `module/internal/` from another module.

---

## Rule 6 — Internal vs Public Boundary (EVERY MODULE)

```
billing/
├── public/              ← STABLE — other modules may import this
│   ├── billing.contract.ts
│   ├── billing.events.ts
│   └── billing.types.ts
├── internal/            ← REFACTORABLE — only billing touches this
│   ├── invoice/
│   ├── payment/
│   ├── refund/
│   └── ledger/
└── shared/              ← billing-internal shared only
    ├── money.ts
    └── billing.errors.ts
```

---

## Rule 7 — Frontend + Backend Mirror the Same Feature Map

```
backend/modules/billing/invoice/
frontend/modules/billing/invoice/
```

Same feature name everywhere. Enables instant cross-stack navigation.

---

## Rule 8 — Database Files Are Feature-Aware

**FORBIDDEN:** `models.py` with 500 models for the whole project.

**REQUIRED:**
```
billing/payment/
└── data/
    ├── payment.model.py
    ├── payment.repository.py
    └── payment.mapper.py
```

Migrations: centralized but feature-labeled filenames:
```
migrations/
├── 2026_08_30_billing_add_payment_status.sql
└── 2026_08_31_patient_add_branch_id.sql
```

---

## Rule 9 — Permissions Are Feature-Collocated (NOT an Afterthought)

```
payment/
└── permissions/
    ├── payment.actions.ts     ← VIEW_PAYMENT, CREATE_PAYMENT, etc.
    ├── payment.policy.ts
    └── payment.scope.ts       ← tenant isolation traceable here
```

---

## Rule 10 — Tests Mirror Production Structure

```
# Code:
modules/billing/payment/

# Tests:
tests/billing/payment/
├── domain/
├── application/
├── api/
└── integration/

# OR feature-local:
billing/payment/tests/
```

Project picks ONE convention and sticks to it.
**FORBIDDEN:** `test1.py`, `test_new.py`, `final_test.py`, `working_test2.py`

---

## Rule 11 — Folder Naming in Business Language

**FORBIDDEN:** `module1/`, `feature2/`, `utils2/`, `misc/`, `new/`, `final/`

**REQUIRED:**
```
patient-registration/
sample-collection/
lab-result-entry/
doctor-referral/
payment-reconciliation/
report-dispatch/
```

---

## Rule 12 — `utils/helpers/common` Misuse Is FORBIDDEN

If a helper has a clear business owner → put it in that feature.

```
calculateReferenceRange() → laboratory/result-formula/   CORRECT
calculateReferenceRange() → shared/utils/               WRONG
```

Global `shared/` only for truly primitive utilities used by multiple unrelated modules with zero business domain ownership.

---

## Rule 13 — File Responsibility Contract (ONE PURPOSE PER FILE)

`payment.service.ts` doing create + PDF + WhatsApp + refund + ledger + email + permissions = **WRONG**

Split into:
```
payment/
├── create-payment.usecase.ts
├── refund-payment.usecase.ts
├── payment-ledger.service.ts
├── payment-receipt.service.ts
└── payment-notification.service.ts
```

---

## Rule 14 — Dependency Direction Is Universal

```
UI / API
   ↓
APPLICATION (use-cases)
   ↓
DOMAIN (entities, rules, errors)
   ↑
INFRASTRUCTURE (implementations) via interfaces
```

Domain NEVER imports from: React, Vue, FastAPI, Django, Express, PostgreSQL, Redis, etc.
Domain business logic stays framework-independent.

---

## Rule 15 — Event-Driven Coupling Prevention

**FORBIDDEN:** Payment controller directly calling `generateReceipt()`, `updateLedger()`, `sendNotification()`

**REQUIRED:**
```
payment/events/payment-completed.event.ts
receipt/handlers/on-payment-completed.ts
ledger/handlers/on-payment-completed.ts
notification/handlers/on-payment-completed.ts
```

---

## Rule 16 — Background Jobs Stay Separate

```
report-dispatch/
└── jobs/
    ├── email-report.job.ts
    ├── whatsapp-report.job.ts
    └── retry-failed-report.job.ts
```

Background worker logic NEVER lives inside API controllers.

---

## Rule 17 — External Integrations Use Adapter Layer

```
instrument-integration/
└── infrastructure/
    ├── sysmex/
    ├── mindray/
    └── generic-hl7/

notifications/
└── adapters/
    ├── whatsapp/
    ├── email/
    └── sms/
```

Business logic is NEVER tightly coupled to vendor-specific APIs.

---

## Rule 18 — Configuration Is Ownership-Based

```
config/               ← global: database, auth, logging, env
billing/payment/config/  ← feature-specific config stays HERE
```

Feature config does NOT get dumped into global config.

---

## Rule 19 — Public API Contract Is Stable Surface

`feature/public/` (types, contracts, events) = **STABLE**. Breaking = HIGH RISK.
`feature/internal/` = freely refactorable without cross-module risk.

---

## Rule 20 — Circular Dependencies Are FORBIDDEN

`Billing → Patient` AND `Patient → Billing` = **FORBIDDEN**

Cross-module communication ONLY via:
- Public contracts
- Domain events
- Public query interfaces
- Application services exposed at `public/`

---

## Rule 21 — Documentation Is Proportional (Not Decorative)

- Large/complex module: `billing/README.md` + `ARCHITECTURE.md`
- Complex feature: `payment/docs/README.md` + `FLOW.md` + `BUSINESS_RULES.md`
- Simple feature: One README only if needed

**NEVER create** `TODO.md`, `STATUS.md`, `HANDOFF.md` as mandatory per-feature files.
Historical docs are NEVER current truth.

---

## Rule 22 — Existing Projects: No Blind Restructure

- New work → Apply correct modular structure from the start ✅
- Old existing code → Touch ONLY when feature work or genuine refactor requires it ✅
- No mass rewrites just because this rule is new ❌

---

## Rule 23 — Empty Decorative Folders Forbidden

Only create a folder if it has actual content NOW.
`result-entry/events/` ← nothing yet → skip, add when genuinely needed.

---

## Reference: Mature Project Universal Tree

```
project/
├── apps/
│   ├── frontend/
│   └── backend/
├── modules/
│   ├── patient/
│   │   ├── public/
│   │   ├── shared/
│   │   ├── registration/
│   │   ├── search/
│   │   ├── documents/
│   │   └── merge/
│   ├── billing/
│   │   ├── public/
│   │   ├── shared/
│   │   ├── invoice/
│   │   ├── payment/
│   │   ├── refund/
│   │   ├── receipt/
│   │   └── ledger/
│   └── laboratory/
│       ├── public/
│       ├── shared/
│       ├── sample-receive/
│       ├── result-entry/
│       ├── formula-engine/
│       ├── validation/
│       ├── approval/
│       ├── instrument-integration/
│       └── report-generation/
├── platform/
│   ├── auth/
│   ├── database/
│   ├── logging/
│   ├── storage/
│   └── messaging/
├── shared/
│   ├── primitives/
│   └── truly-cross-domain/
├── migrations/
├── scripts/
├── docs/
└── tests/
```

---

## Reference: Feature Internal Structure

```
feature/
├── domain/         ← entities, types, rules, errors
├── application/    ← use-cases (one file per business action)
├── api/            ← routes, controllers, request/response DTOs
├── data/           ← repository, mapper, queries
├── ui/             ← pages, components, hooks
├── validation/     ← input schemas, range validators
├── permissions/    ← actions, policies, scopes
├── events/         ← domain events emitted
├── jobs/           ← background/scheduled jobs
├── infrastructure/ ← external adapters, vendor integrations
├── tests/          ← mirrors all above layers
└── docs/           ← README, FLOW, BUSINESS_RULES (only if complex)
```

Only include folders that have real content.

---

## Agent Pre-Code Checklist (MANDATORY)

Before creating any file in a new module or feature:

- [ ] What MODULE does this belong to?
- [ ] What FEATURE within that module?
- [ ] What specific USE CASE is this file serving?
- [ ] What LAYER is this (domain/application/api/data/ui/...)?
- [ ] Does a similar file already exist that should be extended?
- [ ] Would this create a circular dependency?
- [ ] Is this going into `shared/` — and is it truly cross-domain?
- [ ] Does this split create an independent testable unit or just noise?
- [ ] Is `public/internal/` boundary respected?

If any answer is unclear → STOP and ask before writing.

---

**This rule exists for one reason:**
Every business capability must have clear ownership, boundary, contract, implementation,
test, and lifecycle — so that 3 years and 100 modules later, the path from
"problem" to "exact file" takes seconds, not hours.

For agents: smaller working context, fewer unrelated files opened,
fewer hallucinated cross-module edits, easier multi-agent scope separation.
