<p align="center">
  <img src="assets/banner.png" alt="BlackPearl — Autonomous AI Engineering Operating System" width="620" />
</p>
# ⚡ BlackPearl — Autonomous AI Engineering Operating System

> **ORCHESTRATE. NAVIGATE. VERIFY. EXECUTE.**  
> **BlackPearl** is a comprehensive, production-ready **Autonomous AI Software Engineering Operating System**. It unifies **BlackPearl Control Plane** (Lead Supervisor & 26 Autonomous Multi-Agent Pipelines), **BlackPearl Skills Engine** (634+ workflow skills, 68 subagents, 94 commands), **BlackPearl Core Engine** (DeepSeek Harness & Cordis multi-process worktree snapshot isolation), and **BlackPearl Divisions** (18 Specialist Enterprise Divisions / 273+ Subagents) into a single, fully portable, zero-config Git repository.

[![Declaration](https://img.shields.io/badge/Manifesto-Ecosystem%20Declaration-blueviolet.svg)](DECLARATION.md)
[![Setup Guide](https://img.shields.io/badge/Guide-New%20PC%20Setup-blue.svg)](SETUP-NEW-PC.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platforms: Windows | Linux | macOS](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-blue.svg)](SETUP-NEW-PC.md)
[![Organization](https://img.shields.io/badge/GitHub-BlackPearl--AI-black.svg)](https://github.com/BlackPearl-AI/BlackPearl)

---

## 📜 Ecosystem Declaration & Origins

> **Read the complete manifesto**: **[📜 DECLARATION.md](DECLARATION.md)**

**BlackPearl** is a standardized meta-operating system created by synthesizing the highest-rigor architectures, rules, execution harnesses, and agent personas from across the global open-source AI community:

- 🎯 **BlackPearl Control Plane**: Built upon **Antigravity & Gemini CLI** global Supervisor architecture with 657 intent-triggered skills.
- ⚡ **BlackPearl Core Execution Engine**: Powered by **DeepSeek Harness & Cordis** multi-process worktree snapshot isolation.
- 🛠️ **BlackPearl Skills Engine**: Standardized on **Everything Claude Code (ECC)** engineering rules, TDD workflows, subagents, and hooks.
- 🎭 **BlackPearl Divisions**: Housing all 18 enterprise specialist divisions (273+ personas) curated from **The Agency**.

---

## ⚖️ Architectural Definition: Control Plane (BlackPearl) vs. Execution Plane (DSH)

<p align="center">
  <img src="assets/comparison-infographic.png" alt="BlackPearl Complete AI Ecosystem vs Standalone Harness" width="900" />
</p>

### 1. The Core Architectural Thesis: Engine vs. Operating System

A fundamental architectural principle separates **BlackPearl** from standalone runtimes like **DeepSeek Harness (DSH)**:

> **"DeepSeek Harness is the engine. BlackPearl is the operating system."**
> 
> - **DeepSeek Harness (DSH)** is the **Programmable Agent Runtime & Execution Substrate**: Built on the Cordis spatiotemporal plugin architecture, it provides the low-level primitives: agent loop, sandboxing, tool routing, session logs, and process execution.
> - **BlackPearl** is the **Engineering Control Plane & AI Software Organization**: It embeds DeepSeek Harness at its foundational execution layer (`frameworks/blackpearl-core/`) and builds a complete multi-agent governance hierarchy on top of it — integrating lead supervision, 26 executable team pipelines, 18 specialist divisions (273+ personas), 634+ workflow skills, TDD guardrails, and universal architectural constraints.

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

### 2. Complete Execution Envelope: How BlackPearl Operates

Unlike unconstrained agents that directly mutate files with single prompts, BlackPearl enforces an end-to-end, multi-stage engineering lifecycle:

```
[USER OBJECTIVE]
       │
       ▼
[BLACKPEARL SUPERVISOR] ➔ [HARD RULE GATES: 5-Level Decomposition + Doc-First Scan]
       │
       ▼
[TEAM PIPELINE SELECTOR (26 Preconfigured Workflows)]
       │
       ▼
[ROLE RESOLUTION & BOUNDED CONTRACT] (Generates Unique Orchestration Run ID)
       │
       ▼
[BASE SNAPSHOT CAPTURE] (Records clean/dirty workspace state baseline)
       │
       ▼
[ISOLATED GIT WORKTREE CREATION] (.worktrees/dsh-<role>-<runId>)
       │
       ▼
[DSH / CORDIS EXECUTION PROCESS] (Sandboxed execution with injected persona instructions)
       │
       ├─► [CORE_IMPLEMENTER] (Write changes in worktree)
       │
       ├─► [CORE_CODE_REVIEWER / CORE_SECURITY_REVIEWER] (Independent soft read-only diff audit)
       │         │
       │    [ISSUE FOUND?]
       │     ├── YES ➔ [CORE_FIXER] (Surgical repair in worktree, max 3 cycles)
       │     └── NO  ➔ [CORE_VERIFIER] (Test suite, build, lint verification)
       │
       ▼
[BASE-DIFF ATTRIBUTION] (RESULT - BASE SNAPSHOT computed to isolate AI changes)
       │
       ▼
[FINAL QUALITY GATE ➔ VERIFIED RESULT TO USER]
```

---

### 3. The Worktree Snapshot & Attribution Model (`RESULT - BASE SNAPSHOT`)

One of BlackPearl's biggest engineering breakthroughs is eliminating developer workspace contamination:

```
Developer Workspace (Host Repo)
  ├── Committed HEAD
  ├── Uncommitted Local Edits (User's prior work)
  └── Untracked Scratch Files
          │
          ▼
   [BASE SNAPSHOT] (Frozen Baseline Commit in Isolated Worktree)
          │
          ▼
   [.worktrees/dsh-<runId>] (DSH Agent Execution)
          │
          ▼
   [RESULT STATE] (Post-Execution Worktree State)
          │
          ▼
   [DETERMINISTIC ATTRIBUTION: RESULT - BASE SNAPSHOT]
```

- **Zero Accidental Overwrites**: AI agents never overwrite or revert uncommitted developer changes.
- **Accurate Diffs**: Only genuine AI modifications are attributed, reviewed, and merged.

---

### 4. 26 Preconfigured Autonomous Team Pipelines (`dsh-team.js`)

BlackPearl comes equipped with 26 autonomous multi-agent pipelines out of the box:

| Pipeline | Role Sequence | Target Use-Case |
|---|---|---|
| `STARTUP_MVP` | `PLANNER ➔ ARCHITECT ➔ IMPLEMENTER ➔ TESTER ➔ CODE_REVIEWER ➔ REALITY_CHECKER ➔ VERIFIER` | Complete 0-to-1 MVP feature delivery |
| `ENTERPRISE_FEATURE` | `PLANNER ➔ ARCHITECT ➔ IMPLEMENTER ➔ API_TESTER ➔ SECURITY_REVIEWER ➔ COMPLIANCE ➔ REALITY_CHECKER ➔ VERIFIER` | High-compliance corporate features |
| `INCIDENT_RESPONSE` | `PLANNER (Triage) ➔ FIXER (Emergency Patch) ➔ TESTER (Regression) ➔ SECURITY ➔ VERIFIER` | Hotfixes & production outage mitigation |
| `FULL_STACK_DEV` | `PLANNER ➔ ARCHITECT ➔ BACKEND_DEV ➔ FRONTEND_DEV ➔ TDD_GUIDE ➔ CODE_REVIEWER ➔ VERIFIER` | End-to-end full stack implementations |
| `COMPLIANCE_AUDIT` | `COMPLIANCE_CHECKER ➔ SECURITY_REVIEWER ➔ REALITY_CHECKER` | FedRAMP, HIPAA, SOC2, GDPR compliance audits |
| `HARDCORE_SEC_AUDIT`| `SECURITY_REVIEWER ➔ APPSEC_ENGINEER ➔ PEN_TESTER ➔ SECRETS_AUDITOR ➔ REALITY_CHECKER` | Deep penetration & vulnerability testing |
| `AI_SECURITY_AUDIT` | `AI_CODE_AUDITOR ➔ OWASP_REVIEWER ➔ SECRETS_HYGIENE ➔ VERIFIER` | AI-generated code vulnerability scanner |
| `HEALTHCARE_EVAL` | `CLINICAL_SPECIALIST ➔ PHI_COMPLIANCE ➔ REALITY_CHECKER` | Medical guideline & HIPAA safety verification |
| `GIS_PIPELINE` | `GIS_ANALYTICS ➔ SPATIAL_SCIENTIST ➔ CARTOGRAPHER ➔ QA_ENGINEER` | PostGIS, GeoJSON, maps & spatial indexing |
| `GAME_DESIGN` | `GAME_DESIGNER ➔ ECONOMY_DESIGNER ➔ LEVEL_DESIGNER ➔ TECH_ARTIST` | Gameplay loop, mechanics & balance audit |
| `MOBILE_APP` | `MOBILE_BUILDER ➔ UI_DESIGNER ➔ TDD_GUIDE ➔ A11Y_AUDITOR` | iOS (SwiftUI) & Android (Kotlin/Flutter) apps |
| `PAYMENTS_BILLING` | `PAYMENTS_ENGINEER ➔ SECURITY_REVIEWER ➔ FINOPS_ENGINEER ➔ VERIFIER` | Stripe, subscription billing & financial isolation |
| `RAG_PIPELINE` | `RAG_ENGINEER ➔ SEARCH_RELEVANCE ➔ EVAL_HARNESS ➔ VERIFIER` | Vector search, chunking, reranking & retrieval |
| `UI_POLISH` | `UI_DESIGNER ➔ WHIMSY_INJECTOR ➔ MOTION_ENGINEER ➔ UI_FINISH_GATE` | Anti-generic UI polish, tokens & animations |
| `MCP_SERVER` | `MCP_BUILDER ➔ API_TESTER ➔ SECURITY_REVIEWER ➔ VERIFIER` | Model Context Protocol servers & connectors |
| `CODE_ARCHAEOLOGY` | `CODEBASE_ARCHAEOLOGIST ➔ REFACTOR_CLEANER ➔ DOC_UPDATER` | Legacy repo exploration & dead code removal |
| `SPATIAL_APP` | `VISIONOS_ENGINEER ➔ XR_INTERACTION ➔ TECH_ARTIST ➔ VERIFIER` | visionOS, WebXR Three.js & volumetric UI |
| `INFRA_OPS` | `PLANNER ➔ INFRA_MAINTAINER ➔ SECURITY_REVIEWER ➔ VERIFIER` | Docker, Kubernetes, CI/CD pipelines & SRE |
| `FULL_ASSURANCE` | `PLANNER ➔ IMPLEMENTER ➔ CODE_REVIEW ➔ SEC_REVIEW ➔ REALITY_CHECK ➔ VERIFIER` | Mission-critical release quality gate |
| `REALITY_CHECK` | `REALITY_CHECKER ➔ EVIDENCE_COLLECTOR ➔ QA_ENGINEER` | Skeptical proof & screenshot verification |
| `AUDIT` | `SECURITY_REVIEWER ➔ CODE_REVIEWER` | Fast static security & code review |
| `HEAVY` | `PLANNER ➔ IMPLEMENTER (worktree) ➔ CODE_REVIEWER ➔ VERIFIER` | Long autonomous refactoring & large features |
| `HIGH_RISK` | `PLANNER ➔ ARCHITECT ➔ IMPLEMENTER ➔ SECURITY_REVIEWER ➔ FIXER ➔ VERIFIER` | Auth, migrations, payments & tenant isolation |
| `COMPLEX` | `PLANNER ➔ IMPLEMENTER ➔ CODE_REVIEWER ➔ FIXER ➔ VERIFIER` | Standard multi-file feature development |
| `GTM_LAUNCH` | `PRODUCT_MANAGER ➔ SEO_SPECIALIST ➔ GROWTH_HACKER ➔ COPYWRITER` | Go-to-market release & launch strategy |
| `DEEP_RESEARCH` | `RESEARCH_SYNTHESIST ➔ TREND_RESEARCHER ➔ EXECUTIVE_SUMMARY` | Cross-source literature & market intelligence |

---

### 5. Architectural Scorecard: BlackPearl vs. DeepSeek Harness (DSH)

| Evaluation Dimension | 🏴‍☠️ BlackPearl (AI Engineering OS) | 🧠 DeepSeek Harness (DSH Engine) | Architectural Role |
|---|:---:|:---:|---|
| **Primary Architectural Role** | **AI Engineering OS & Control Plane** | **Programmable Agent Runtime Engine** | *Complementary Stack* |
| **“Install and Start Engineering”** | ⭐⭐⭐⭐⭐ **10/10** | ⭐⭐⭐ 7/10 | 🏆 **BlackPearl** (Ready out of the box) |
| **Pre-Configured Specialist Agents** | ⭐⭐⭐⭐⭐ **10/10 (273+ Personas)** | ⭐⭐ 4/10 (Runtime only) | 🏆 **BlackPearl** (18 Enterprise Divisions) |
| **Pre-Authored Skills Library** | ⭐⭐⭐⭐⭐ **10/10 (634+ Skills)** | ⭐⭐⭐ 5/10 (Skill service only) | 🏆 **BlackPearl** (ECC + Custom Skills) |
| **Multi-Agent Team Workflows** | ⭐⭐⭐⭐⭐ **10/10 (26 Executable Pipelines)**| ⭐⭐⭐ 7/10 (Requires user code) | 🏆 **BlackPearl** (`dsh-team.js` orchestrator) |
| **Engineering Discipline & Rules** | ⭐⭐⭐⭐⭐ **10/10 (5-Level Decomposition)**| ⭐⭐⭐ 6/10 (Opinion-neutral) | 🏆 **BlackPearl** (Strict Hard Rules) |
| **Worktree Snapshot Attribution** | ⭐⭐⭐⭐⭐ **10/10 (`RESULT - BASE`)** | ⭐⭐⭐⭐ 8/10 (Git worktrees) | 🏆 **BlackPearl** (Baseline isolation) |
| **Platform Integrations** | ⭐⭐⭐⭐⭐ **10/10 (Gemini, OpenCode, VS Code)**| ⭐⭐⭐⭐ 8/10 (Core runtime) | 🏆 **BlackPearl** (Universal portability) |
| **Low-Level Plugin Runtime (Cordis)**| ⭐⭐⭐⭐ 8/10 (Embedded in Core) | ⭐⭐⭐⭐⭐ **10/10 (Native Cordis)** | 🧠 **DSH** (Raw runtime foundation) |
| **Low-Level Sandbox Primitives** | ⭐⭐⭐⭐ 8/10 (Uses DSH engine) | ⭐⭐⭐⭐⭐ **10/10 (Fail-closed sandbox)**| 🧠 **DSH** (Low-level containment) |
| **Dynamic Runtime Metaprogramming**| ⭐⭐⭐⭐ 8/10 (Pre-configured) | ⭐⭐⭐⭐⭐ **10/10 (Runtime package editing)**| 🧠 **DSH** (Runtime extensibility) |
| **Overall Engineering OS Score** | 🥇 **9.5 / 10** | 7.5 / 10 | 🏆 **BlackPearl: Winner for Software Engineering** |
| **Overall Runtime Engine Score** | 8.5 / 10 | 🥇 **9.8 / 10** | 🧠 **DSH: Winner for Raw Runtime Foundation** |
| **Combined Architecture Score** | 👑 **10.0 / 10 (BlackPearl OS + DSH Core Engine)** | — | 🌟 **The Ultimate Autonomous Engineering Stack** |

---

## 🌟 What is BlackPearl?

**BlackPearl** is an enterprise-grade AI software development ecosystem designed to be completely portable across machines, operating systems, and fresh installations. Cloning this repository and running a single script immediately configures:

1. **BlackPearl Control Plane (Lead Supervisor)** (`platforms/antigravity/` -> `~/.gemini/config/`)
   - 657 specialized skills auto-activated on intent.
   - Master directives (`AGENTS.md`, `GEMINI.md`) with Section 11 Division Routing.
   - Universal Hard Rules (5-Level Modular Decomposition & Doc-First Sequential Execution).
2. **BlackPearl Agent Layer** (`platforms/opencode/` -> `~/.config/opencode/`)
   - 273+ specialized `.md` canonical personas mentionable anywhere (`@agent-name`).
   - `dsh-team.js` & `dsh-delegate.js` multi-agent orchestrator with 26 executable pipelines.
3. **BlackPearl Core Engine** (`frameworks/blackpearl-core/`)
   - Complete DeepSeek Harness & Cordis execution framework with worktree snapshot isolation.
4. **BlackPearl Skills Engine** (`frameworks/blackpearl-skills/`)
   - 634+ workflow skills, 68 subagents, 94 commands, and automated hooks.
5. **BlackPearl Specialist Divisions** (`frameworks/blackpearl-divisions/`)
   - 18 enterprise divisions covering Engineering, Testing, Security, Design, Product, Healthcare, Finance, GIS, GameDev, and more.

---

## 🏢 BlackPearl Divisions — 18 Specialist Divisions (273+ Subagents)

| Division | Primary Capabilities & Focus | Key Roles & Personas |
|---|---|---|
| 💻 **Engineering (59)** | Clean Architecture APIs, Mobile (iOS/Android), RAG, DB Optimization, SRE | `agency-backend-architect`, `agency-mobile-app-builder`, `agency-rag-pipeline-engineer`, `agency-sre` |
| 🧪 **Testing & QA (9)** | Skeptical QA, WCAG 2.2 a11y, API contract fuzzing, Core Web Vitals | `agency-reality-checker`, `agency-accessibility-auditor`, `agency-api-tester`, `agency-performance-benchmarker` |
| 🛡️ **Security & AppSec (12)** | AI-code vulnerability scanner, OWASP Top 10, Secrets governance, Pen-testing | `agency-security-ai-generated-code-auditor`, `agency-security-appsec-engineer`, `agency-security-penetration-tester` |
| 🎨 **Design & UI (10)** | Design systems, CSS tokens, Anti-generic UI finish gate, Micro-animations | `agency-ui-designer`, `agency-ui-finish-gate-reviewer`, `agency-whimsy-injector`, `agency-ux-architect` |
| 📦 **Product (5)** | PRD specs, RICE scoring, user journeys, behavioral nudge engine | `agency-product-manager`, `agency-sprint-prioritizer`, `agency-behavioral-nudge-engine` |
| 📋 **Project Mgmt (7)** | Spec-to-task conversion, delivery tracking, meeting notes synthesis | `agency-senior-project-manager`, `agency-project-shepherd`, `agency-meeting-notes-specialist` |
| 📊 **Strategy & Runbooks (6)** | Multi-agent runbooks: Startup MVP, Enterprise Feature, Incident Response | `agency-runbook-startup-mvp`, `agency-runbook-enterprise-feature`, `agency-runbook-incident-response` |
| 🏥 **Healthcare (3)** | Clinical evidence mapping, medical guidelines, patient safety & HIPAA | `agency-clinical-evidence-agent`, `agency-healthcare-innovation-strategist` |
| 💰 **Finance & FinOps (5)** | Financial pro-forma models, SaaS unit economics, tax planning, FP&A | `agency-financial-analyst`, `agency-tax-strategist`, `agency-fpa-analyst` |
| 🗺️ **GIS & Spatial (13)** | Web GIS maps, GeoJSON, PostGIS queries, Cartography, Drone reality | `agency-web-gis-developer`, `agency-spatial-data-scientist`, `agency-drone-reality-mapping` |
| 🥽 **Spatial Computing (6)** | VisionOS SwiftUI volumetric UI, Metal 90fps GPU, WebXR Three.js | `agency-visionos-spatial-engineer`, `agency-macos-spatial-metal-engineer`, `agency-xr-immersive-developer` |
| 🎮 **Game Dev (6)** | Core gameplay loops, virtual in-game economy balancing, audio, mechanics | `agency-game-designer`, `agency-economy-designer`, `agency-game-audio-engineer` |
| 📢 **Marketing (36)** | SEO, AEO (AI Engine Optimization), viral growth loops, Social | `agency-seo-specialist`, `agency-growth-hacker`, `agency-aeo-foundations-architect` |
| 🎯 **Paid Media (7)** | Google/Meta PPC campaigns, search query analytics, ROAS optimization | `agency-ppc-campaign-strategist`, `agency-paid-social-strategist`, `agency-paid-media-auditor` |
| 💼 **Sales (9)** | B2B outbound prospecting, discovery call coaching, deal closing | `agency-outbound-strategist`, `agency-discovery-coach`, `agency-deal-strategist` |
| 🎓 **Academic (6)** | Statistical rigor, psychological models, ethnographic systems | `agency-statistician`, `agency-psychologist`, `agency-narratologist` |
| 🔬 **Research (1)** | Cross-source research synthesis, literature maps, competitive matrix | `agency-research-synthesist` |
| 🧩 **Specialized (58)** | MCP server builder, Codebase archaeology, Medical coding, FedRAMP | `agency-mcp-builder`, `agency-codebase-archaeologist`, `agency-medical-billing-coding-specialist` |

---

## 🔒 Master Hard Rules

Every agent operating within BlackPearl strictly enforces two universal architectural mandates:

### 1. Modular Architecture (5-Level Decomposition)
```
Project ➔ Module/Domain ➔ Feature/Capability ➔ Use-case ➔ Responsibility ➔ File
```
- **One Business Action = One Use-Case File**: Monolithic files (>400 lines typical, >800 lines max) are strictly forbidden.
- **Feature Ownership**: Private domain logic stays inside `module/feature/`. Never dump business logic into `shared/` or `utils/`.
- **Public Contracts**: Inter-module communication flows exclusively through `public/` interfaces. `internal/` is private.

### 2. Documentation-First Sequential Execution
```
Goal ➔ Stop & Discover Docs ➔ Verify Live Code Reality ➔ Plan 4 Levels ➔ ONE Active Micro-Task
```
- **Stop & Discover**: Read all project-authored `.md` files before touching any code.
- **Verify Reality**: Distinguish between historical docs and live executable ground truth.
- **Single-Track Focus**: Execute **EXACTLY ONE** active micro-task at a time: `Implement ➔ Test ➔ Diff Review ➔ Quality Gate Met ➔ Close`.

---

## 💻 Complete New PC / Fresh Windows Setup Guide

> **Dedicated Migration Guide**: **[💻 SETUP-NEW-PC.md](SETUP-NEW-PC.md)**

To deploy the entire BlackPearl ecosystem onto any fresh Windows, macOS, or Linux machine:

### 📍 Step 1: Install Prerequisites (Run in PowerShell / Terminal)
```powershell
# Windows (winget)
winget install Git.Git OpenJS.NodeJS.LTS
```

### 📍 Step 2: Clone BlackPearl Repository
```powershell
git clone https://github.com/BlackPearl-AI/BlackPearl.git "G:\0000 PY PROGRAM\_AI_TOOLS\BlackPearl"
cd "G:\0000 PY PROGRAM\_AI_TOOLS\BlackPearl"
```

### 📍 Step 3: Run 1-Click Master Installer
```powershell
# Windows PowerShell
.\install.ps1

# Linux / macOS Bash
./install.sh
```

### 📍 Step 4: Verify System Health
```powershell
.\verify.ps1
```
*Expected Output: `ALL TESTS PASSED! BlackPearl Suite is 100% healthy, synchronized, and operational.`*

---

## 🔑 LLM API Keys & Provider Configuration

BlackPearl supports all major AI models and 100% Free Offline Local Models:

### 1. Antigravity IDE & Gemini CLI (Built-in Free Integration)
- If you run inside **Antigravity IDE** or **Gemini CLI**, BlackPearl automatically uses your active Google DeepMind environment with **ZERO API keys needed**!

### 2. 100% Free & Offline Local Models via Ollama (Zero Cost, No Internet Required)
```powershell
# Install Ollama
winget install Ollama.Ollama

# Pull recommended coding models
ollama run qwen2.5-coder:14b
ollama run deepseek-r1:14b
```

### 3. Cloud LLM API Keys (Optional for Cloud Execution)
Set keys in your system environment variables or `~/.env`:
```powershell
[System.Environment]::SetEnvironmentVariable('DEEPSEEK_API_KEY', 'sk-your-key', 'User')
[System.Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', 'sk-ant-your-key', 'User')
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', 'sk-your-key', 'User')
[System.Environment]::SetEnvironmentVariable('GEMINI_API_KEY', 'AIza-your-key', 'User')
```

---

## 📁 Repository Architecture

```
BlackPearl/
├── assets/                          # Official brand assets (orb avatar, hero banner, infographic)
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
├── install.ps1 / install.sh         # 1-Click zero-config master installers
├── verify.ps1                       # Automated ecosystem health auditor
└── scaffold.ps1                     # Instant new project scaffolder
```

---

## 🛡️ License

Distributed under the **MIT License**. Free for personal and commercial autonomous software engineering.

---

<p align="center">
  <b>BlackPearl AI — Autonomous Software Engineering Operating System</b><br>
  <i>Orchestrate. Navigate. Verify. Execute.</i>
</p>
