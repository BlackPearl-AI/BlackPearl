# 🧠 BlackPearl AI — Master Ecosystem Memory & Deployment Guide

> **Official Organization:** [https://github.com/BlackPearl-AI](https://github.com/BlackPearl-AI)  
> **Official Repository:** [https://github.com/BlackPearl-AI/BlackPearl](https://github.com/BlackPearl-AI/BlackPearl)  
> **Tagline:** `ORCHESTRATE. NAVIGATE. VERIFY. EXECUTE.`

---

## 📌 1. Ecosystem Overview & Architecture

BlackPearl is a production-ready **Autonomous AI Software Engineering Operating System** built around a 4-tier Control Plane vs. Execution Plane architecture:

```
                                      ┌──────────────────────────────────────────────┐
                                      │                  USER GOAL                   │
                                      └──────────────────────┬───────────────────────┘
                                                             │
                                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                 BLACKPEARL CONTROL PLANE                                                         │
│  - Lead Supervisor (Intent & Domain Router)                 - Universal Hard Rules (5-Level Decomposition & Doc-First Gate)     │
│  - 18 Enterprise Specialist Divisions (273+ Personas)       - Skills Engine (634+ Skills, 68 Subagents, 94 Commands)           │
└────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────┘
                                                             │
                                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       BLACKPEARL MULTI-AGENT TEAM ORCHESTRATION                                                  │
│  - dsh-team.js: 26 Autonomous Executable Pipelines (STARTUP_MVP, ENTERPRISE_FEATURE, INCIDENT_RESPONSE, FULL_STACK_DEV, etc.)    │
│  - Role Sequencing & Bounded Agent-to-Agent Handoff Contracts (Orchestration Run IDs)                                          │
│  - Automated Reviewer ➔ Fixer Self-Correction Loop (Hard ceiling: max 3 cycles)                                                 │
└────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────┘
                                                             │
                                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BLACKPEARL CORE / EXECUTION PLANE (DSH & CORDIS)                                               │
│  - dsh-delegate.js Universal Persona Loader                 - Cordis Spatiotemporal Plugin Engine                                │
│  - Sandboxed Process Execution                              - Terminal / Filesystem / Tool Registry                              │
└────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────┘
                                                             │
                                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                            PHYSICAL EXECUTION & GROUND TRUTH                                                     │
│  - Isolated Worktree per Child Process (.worktrees/dsh-*)   - Base Snapshot Isolation Baseline                                   │
│  - Deterministic Attribution: RESULT - BASE SNAPSHOT        - Compilers, Linters, Test Runners, Live Git HEAD                   │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 2. Physical Directory Structure

```
BlackPearl/
├── assets/                          # Official brand assets (avatar.png, banner.png, comparison-infographic.png)
├── frameworks/
│   ├── blackpearl-core/             # DeepSeek Harness runtime, Cordis engine, process sandboxes
│   ├── blackpearl-skills/           # 634+ workflow skills, 68 subagents, 94 commands, hooks
│   └── blackpearl-divisions/        # 18 specialist enterprise divisions (273+ personas)
├── platforms/
│   ├── antigravity/                 # Global Supervisor directives & 657 skills pool
│   └── opencode/                    # 273+ canonical agents & 26 team pipeline orchestrators
├── templates/                       # Project onboarding scaffolds & AGENTS.md templates
├── DECLARATION.md                   # Official Ecosystem Manifesto & Origins
├── SETUP-NEW-PC.md                  # Comprehensive fresh machine onboarding guide
├── MEMORY.md                        # Master Ecosystem Memory & Deployment Guide
├── install.ps1 / install.sh         # 1-Click zero-config master installers
├── verify.ps1                       # Automated ecosystem health auditor
└── scaffold.ps1                     # Instant new project scaffolder
```

---

## ⚡ 3. The 26 Preconfigured Autonomous Team Pipelines

Execute any pipeline using `dsh-team.js`:

```powershell
node "platforms\opencode\scripts\dsh-team.js" --pipeline <PIPELINE_NAME> --objective "<YOUR_GOAL>"
```

### Full Pipeline Roster:
1. `STARTUP_MVP`: Full 0-to-1 MVP feature delivery (`PLANNER ➔ ARCHITECT ➔ IMPLEMENTER ➔ TESTER ➔ CODE_REVIEWER ➔ REALITY_CHECKER ➔ VERIFIER`)
2. `ENTERPRISE_FEATURE`: Enterprise-grade high-compliance delivery (`PLANNER ➔ ARCHITECT ➔ IMPLEMENTER ➔ API_TESTER ➔ SECURITY_REVIEWER ➔ COMPLIANCE ➔ REALITY_CHECKER ➔ VERIFIER`)
3. `INCIDENT_RESPONSE`: Production incident triage & hotfix patch (`PLANNER ➔ FIXER ➔ TESTER ➔ SECURITY ➔ VERIFIER`)
4. `FULL_STACK_DEV`: Complete full-stack web/app development (`PLANNER ➔ ARCHITECT ➔ BACKEND_DEV ➔ FRONTEND_DEV ➔ TDD_GUIDE ➔ CODE_REVIEWER ➔ VERIFIER`)
5. `COMPLIANCE_AUDIT`: FedRAMP, HIPAA, SOC2, GDPR audit (`COMPLIANCE_CHECKER ➔ SECURITY_REVIEWER ➔ REALITY_CHECKER`)
6. `HARDCORE_SEC_AUDIT`: Penetration & vulnerability testing (`SECURITY_REVIEWER ➔ APPSEC ➔ PEN_TESTER ➔ SECRETS ➔ REALITY_CHECKER`)
7. `AI_SECURITY_AUDIT`: AI-generated code vulnerability scanner (`AI_CODE_AUDITOR ➔ OWASP ➔ SECRETS ➔ VERIFIER`)
8. `HEALTHCARE_EVAL`: Medical guidelines, clinical evidence, PHI/HIPAA (`CLINICAL_SPECIALIST ➔ PHI_COMPLIANCE ➔ REALITY_CHECKER`)
9. `GIS_PIPELINE`: Geospatial analysis, PostGIS, maps (`GIS_ANALYTICS ➔ SPATIAL_SCIENTIST ➔ CARTOGRAPHER ➔ QA`)
10. `GAME_DESIGN`: Mechanics, economy, audio, level design (`GAME_DESIGNER ➔ ECONOMY_DESIGNER ➔ LEVEL_DESIGNER ➔ TECH_ARTIST`)
11. `MOBILE_APP`: Native iOS (SwiftUI) & Android (Kotlin/Flutter) (`MOBILE_BUILDER ➔ UI_DESIGNER ➔ TDD_GUIDE ➔ A11Y`)
12. `PAYMENTS_BILLING`: Stripe, billing, subscription accounting (`PAYMENTS_ENGINEER ➔ SECURITY ➔ FINOPS ➔ VERIFIER`)
13. `RAG_PIPELINE`: Vector retrieval, chunking, reranking (`RAG_ENGINEER ➔ SEARCH_RELEVANCE ➔ EVAL_HARNESS ➔ VERIFIER`)
14. `UI_POLISH`: Tokens, anti-generic finishing, micro-animations (`UI_DESIGNER ➔ WHIMSY ➔ MOTION ➔ UI_FINISH_GATE`)
15. `MCP_SERVER`: Model Context Protocol server development (`MCP_BUILDER ➔ API_TESTER ➔ SECURITY ➔ VERIFIER`)
16. `CODE_ARCHAEOLOGY`: Legacy codebase exploration & dead code removal (`CODEBASE_ARCHAEOLOGIST ➔ REFACTOR ➔ DOC_UPDATER`)
17. `SPATIAL_APP`: VisionOS SwiftUI volumetric UI & WebXR (`VISIONOS_ENGINEER ➔ XR_INTERACTION ➔ TECH_ARTIST ➔ VERIFIER`)
18. `INFRA_OPS`: Docker, Kubernetes, CI/CD, SRE observability (`PLANNER ➔ INFRA_MAINTAINER ➔ SECURITY ➔ VERIFIER`)
19. `FULL_ASSURANCE`: Complete quality assurance gate (`PLANNER ➔ IMPLEMENTER ➔ CODE_REVIEW ➔ SEC_REVIEW ➔ REALITY_CHECK ➔ VERIFIER`)
20. `REALITY_CHECK`: Skeptical proof & screenshot verification (`REALITY_CHECKER ➔ EVIDENCE_COLLECTOR ➔ QA`)
21. `AUDIT`: Fast static security & code review (`SECURITY_REVIEWER ➔ CODE_REVIEWER`)
22. `HEAVY`: Deep autonomous worktree coding session (`PLANNER ➔ IMPLEMENTER (worktree) ➔ CODE_REVIEWER ➔ VERIFIER`)
23. `HIGH_RISK`: Sensitive auth, database migrations, security (`PLANNER ➔ ARCHITECT ➔ IMPLEMENTER ➔ SECURITY ➔ FIXER ➔ VERIFIER`)
24. `COMPLEX`: Standard multi-file feature development (`PLANNER ➔ IMPLEMENTER ➔ CODE_REVIEWER ➔ FIXER ➔ VERIFIER`)
25. `GTM_LAUNCH`: Product marketing & growth launch (`PRODUCT_MANAGER ➔ SEO ➔ GROWTH_HACKER ➔ COPYWRITER`)
26. `DEEP_RESEARCH`: Cross-source literature & intelligence synthesis (`RESEARCH_SYNTHESIST ➔ TREND_RESEARCHER ➔ SUMMARY`)

---

## 🔒 4. Universal Hard Rules

### Hard Rule 1: 5-Level Modular Decomposition
```
Project ➔ Module/Domain ➔ Feature/Capability ➔ Use-case ➔ Responsibility ➔ File
```
- **One Business Action = One Use-Case File**: Monolithic files are strictly forbidden.
- **Feature Ownership**: Private domain logic stays in `module/feature/`. Never dump into `shared/` or `utils/`.
- **Public Contracts**: Inter-module communication via `public/` interfaces only.

### Hard Rule 2: Documentation-First Sequential Execution
```
Goal ➔ Stop & Discover Docs ➔ Verify Reality ➔ Plan 4 Levels ➔ ONE Active Micro-Task
```
- **Stop & Discover**: Read all project-authored `.md` files before touching any code.
- **Verify Reality**: Live executable code, DB schemas, and tests are ground truth.
- **Single-Track Focus**: Execute **EXACTLY ONE** active micro-task at a time: `Implement ➔ Test ➔ Diff Review ➔ Quality Gate Met ➔ Close`.

---

## 🚀 5. How to Deploy, Sync, and Maintain on Git

### A. Initial Git Setup (On Fresh Machine)
```powershell
# 1. Configure Git Identity (Matches BlackPearl standard)
git config --global user.name "modarif"
git config --global user.email "22arif@gmail.com"

# 2. Clone the Repository
git clone https://github.com/BlackPearl-AI/BlackPearl.git "G:\0000 PY PROGRAM\_AI_TOOLS\BlackPearl"
cd "G:\0000 PY PROGRAM\_AI_TOOLS\BlackPearl"

# 3. Run One-Click Master Installer
.\install.ps1

# 4. Verify System Health
.\verify.ps1
```

### B. Daily Development & Sync Workflow
```powershell
# Check status
git status

# Stage all changes
git add -A

# Commit with Conventional Commits format
git commit -m "feat(scope): describe change clearly"

# Push to GitHub
git push origin main
```

### C. Creating Official Release Tags
```powershell
# Create a semver release tag
git tag -a v2.5.0 -m "Release v2.5.0: BlackPearl Autonomous AI Engineering OS"

# Push tags to GitHub
git push origin --tags
```

### D. Updating Git Remote URL (If Ever Moved)
```powershell
git remote set-url origin https://github.com/BlackPearl-AI/BlackPearl.git
git remote -v
```

---

## 💻 6. Local Folder Renaming (From `SUper` to `BlackPearl`)

If your local folder is currently named `G:\0000 PY PROGRAM\_AI_TOOLS\SUper`, run the following in PowerShell outside the active folder (or in a fresh PowerShell window):

```powershell
# 1. Close any open terminals or files inside the folder
# 2. In a fresh PowerShell window:
Rename-Item -Path "G:\0000 PY PROGRAM\_AI_TOOLS\SUper" -NewName "BlackPearl"

# 3. Navigate into the renamed folder:
cd "G:\0000 PY PROGRAM\_AI_TOOLS\BlackPearl"

# 4. Re-run installer to update local paths:
.\install.ps1
```

---

<p align="center">
  <b>BlackPearl AI — Autonomous Software Engineering Operating System</b><br>
  <i>Orchestrate. Navigate. Verify. Execute.</i>
</p>
