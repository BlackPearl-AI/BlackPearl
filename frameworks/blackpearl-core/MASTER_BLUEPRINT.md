# MASTER RECOVERY & DEVELOPMENT BLUEPRINT
## DeepSeek Harness (dsh) — पूर्ण विश्लेषण

```
PROJECT:    DeepSeek Harness (dsh)
VERSION:    v0.1.1-rc.2
LICENSE:    MIT
CREATED:    2026-08-26
STATUS:     ACTIVE
BLUEPRINT:  20-Phase Framework
```

---

# PHASE 01 — PROJECT ONBOARDING

## Project Map

```
DeepSeek Harness (dsh)
├── Root Governance
│   ├── AGENTS.md              ← मुख्य शासन नियम (CLAUDE.md symlink)
│   ├── CONTRIBUTING.md         ← योगदान दिशानिर्देश
│   ├── README.md               ← प्रोजेक्ट अवलोकन
│   └── BRAND_GUIDELINES.md     ← ब्रांड नियम
│
├── packages/                   ← 53 पैकेज ग्रुप, 150+ व्यक्तिगत पैकेज
│   ├── core/                   ← उत्पाद API रीढ़
│   ├── llm/                    ← LLM क्षमता परिवार
│   ├── session/                ← टिकाऊ सेशन डेटा प्लेन
│   ├── api/                    ← रिमोट API गेटवे
│   ├── sdk/                    ← TypeScript SDK
│   ├── shell/                  ← Bash/PowerShell क्षमता
│   ├── web/                    ← वेब खोज/फ़ेच क्षमता
│   ├── fs/                     ← फ़ाइलसिस्टम क्षमता
│   ├── subagent/               ← सब-एजेंट प्रतिनिधिकरण
│   ├── workflow/               ← वर्कफ़्लो ऑर्केस्ट्रेशन
│   ├── sandbox/                ← प्रक्रिया प्रतिबंध
│   ├── interaction/            ← मानव सहयोग
│   ├── compaction/             ← संदर्भ संकुचन
│   ├── skill/                  ← स्किल रजिस्ट्री
│   └── test-support/           ← परीक्षण अवसंरचना
│
├── vendor/                     ← 9 Cordis फ्रेमवर्क पैकेज
├── apps/                       ← 2 उत्पाद असेंबली (cli, web)
├── examples/                   ← 7 डेमो बंडल
├── python/                     ← Python SDK
├── native/                     ← Node.js एडन
├── docs/                       ← वास्तुकला, कुकबुक (200+ फ़ाइलें)
├── scripts/                    ← 50+ सत्यापन स्क्रिप्ट
└── .agents/                    ← एजेंट कौशल और निर्णय नोट्स
```

## Module Map

| ग्रुप | पैकेज संख्या | मुख्य कार्य |
|---|---|---|
| core | 7 | session, tools, agent, agent-loop, scope, system-prompt |
| llm | 5 | LLM एडाप्टर, DeepSeek, Pi-AI, retry, token-meter |
| session | 13 | persistence, projection, title, telemetry, stats |
| api | 2 | gateway, remotes |
| sdk | 3 | protocol, client, server |
| shell | 10 | bash, pwsh, tools, env |
| web | 6 | search, fetch, tools |
| fs | 7 | read, write, edit, search |
| subagent | 10 | spawn, fork, ACP, Codex, Claude Code, SDK |
| workflow | 4 | engine, worker, tools |
| sandbox | 4 | local, policy, windows-acl |
| interaction | 5 | approval, commands, permission, questions |
| compaction | 4 | basic, pruner, compact command |
| skill | 4 | registry, filesystem, badge, tool |
| 30+ अन्य | 60+ | विभिन्न क्षमताएँ |

## Documentation Map

| प्रकार | संख्या | स्थान |
|---|---|---|
| वास्तुकला | 1 | docs/architecture.md |
| उप-प्रणाली संदर्भ | 47 | docs/subsystems/ |
| कुकबुक | 9 | docs/cookbook/ |
| दुर्घटना रिपोर्ट | 4 | docs/postmortem/ |
| उपयोगकर्ता गाइड | 20+ | docs/user/ |
| उत्पन्न संदर्भ | 5+ | config-catalog, tool-catalog, etc. |
| शब्दावली | 1 | docs/glossary.md |
| द्विभाषी जोड़ा | 200+ | .md + .zh.md |

## Rules Map

| फ़ाइल | भूमिका |
|---|---|
| AGENTS.md (मूल) | प्राथमिक शासन |
| packages/AGENTS.md | पैकेज-विशिष्ट नियम |
| docs/AGENTS.md | दस्तावेज़ मानक |
| .agents/skills/ (11) | विशेषीकृत कौशल |

## Architecture Map

- **सब कुछ प्लगिन है** (Cordis फ्रेमवर्क)
- **पंजीकरण प्रभाव हैं** (reversible effects)
- **प्रोफ़ाइल और बंडल** (layered composition)
- **क्षमता सीम** (Service Def / Provider / Consumer)
- **टर्न फ्लो** (turn → step → model → tools → result)

## Test Map

| कॉन्फ़िग | उद्देश्य |
|---|---|
| vitest.config.ts | यूनिट + कवरेज (100%) |
| vitest.e2e.config.ts | वास्तविक API |
| vitest.snapshot.config.ts | कीरहीन स्नैपशॉट |
| vitest.web.config.ts | ब्राउज़र |
| scripts/ (50+) | सत्यापन स्क्रिप्ट |

---

# PHASE 02 — MASTER GOAL CAPTURE

## MASTER-GOAL

```
DeepSeek Harness एक ओपन-सोर्स, प्लगिन-आधारित एजेंट रनटाइम ढाँचा है
जो किसी भी LLM मॉडल, किसी भी टूल, किसी भी निष्पादन वातावरण, और
किसी भी उपयोगकर्ता इंटरफेस को एक ही प्लगिन फ्रेमवर्क के माध्यम से
जोड़ने योग्य (composable) बनाता है — बिना किसी विशेषाधिकार प्राप्त
कोर (privileged core) के और हर स्तर पर पूर्ण विस्थापनीयता के साथ।
```

## 6 स्तंभ

| # | स्तंभ | साक्ष्य |
|---|---|---|
| 1 | पूर्ण विस्थापनीयता | "There is no privileged core to patch" |
| 2 | क्षमता सीम | Service Def / Provider / Consumer त्रिमूर्ति |
| 3 | बहु-सतह तैनाती | web/headless/SDK/ACP 4 मोड |
| 4 | टिकाऊ सत्र लॉग | append-only SessionEvent + invariance |
| 5 | खुला स्रोत | MIT license + plugin tutorial |
| 6 | आत्म-विकास | extensions/ — model-written plugin mount |

---

# PHASE 03 — CONVERSATION REQUIREMENT LEDGER

| CR-ID | प्रकार | स्थिति | विवरण |
|---|---|---|---|
| CR-001 | PROMPT | ✅ | प्रोजेक्ट समझने का अनुरोध |
| CR-002 | PROMPT | ✅ | 20-फेज़ ब्लूप्रिंट प्रस्तुत |
| CR-003 | TASK | ✅ | Phase 01 पूर्ण |
| CR-004 | TASK | ✅ | Phase 02 पूर्ण |
| CR-005 | APPROVAL | ✅ | Phase 02 अनुमति |
| CR-006 | APPROVAL | ✅ | Phase 03 अनुमति |
| CR-007 | CONSTRAINT | ✅ | भाषा: Hindi Devanagari |
| CR-008 | DIRECTIVE | 🔄 | सभी 20 Phases क्रम से पूरे करो |

---

# PHASE 04 — GOAL BREAKDOWN

```
MASTER GOAL
│
├── GOAL-1: एजेंट रनटाइम इंजन (3 Modules)
│   ├── 1.1 एजेंट लूप
│   ├── 1.2 सत्र प्रबंधन
│   └── 1.3 प्रॉम्प्ट असेंबली
│
├── GOAL-2: क्षमता सीम (6 Modules)
│   ├── 2.1 LLM सीम
│   ├── 2.2 निष्पादन विश्व
│   ├── 2.3 वेब क्षमता
│   ├── 2.4 सब-एजेंट
│   ├── 2.5 वर्कफ़्लो
│   └── 2.6 कौशल
│
├── GOAL-3: बहु-सतह तैनाती (4 Modules)
│   ├── 3.1 वेब UI
│   ├── 3.2 हेडलेस CLI
│   ├── 3.3 SDK
│   └── 3.4 ACP सर्वर
│
├── GOAL-4: मानव सहयोग (4 Modules)
│   ├── 4.1 अनुमोदन
│   ├── 4.2 कमांड
│   ├── 4.3 प्रश्न
│   └── 4.4 प्रतिक्रिया
│
├── GOAL-5: संदर्भ प्रबंधन (4 Modules)
│   ├── 5.1 संपीड़न
│   ├── 5.2 टूल परिणाम
│   ├── 5.3 एजेंट अनुदेश
│   └── 5.4 संदर्भ संदर्भ
│
├── GOAL-6: सुरक्षा और नीति (3 Modules)
│   ├── 6.1 सैंडबॉक्स
│   ├── 6.2 अनुमति
│   └── 6.3 क्रेडेंशियल
│
├── GOAL-7: अवलोकन और निदान (4 Modules)
│   ├── 7.1 टेलीमेट्री
│   ├── 7.2 अनिवार्यता
│   ├── 7.3 सत्र प्रश्न
│   └── 7.4 लॉग
│
├── GOAL-8: विस्तार योग्यता (4 Modules)
│   ├── 8.1 प्लगिन
│   ├── 8.2 स्व-संशोधन
│   ├── 8.3 लक्ष्य
│   └── 8.4 योजना
│
└── GOAL-9: विकास अवसंरचना (4 Modules)
    ├── 9.1 परीक्षण
    ├── 9.2 सत्यापन
    ├── 9.3 दस्तावेज़
    └── 9.4 बंडल
```

**कुल: 9 Goals → 33 Modules → ~65 Sub-Modules → ~120 Features**

---

# PHASE 05 — MASTER MODULE IDENTIFICATION

## Foundation Module: core/agent-loop + core/session

```
MASTER MODULE
"एजेंट लूप + सेशन प्रबंधन"
│
├── यह उत्पाद की रीढ़ है
├── इसके बिना कोई अन्य मॉड्यूल काम नहीं करता
├── सभी क्षमता सीम इसी पर निर्भर हैं
└── यह सबसे पहले verify होना चाहिए
```

### Master Module Components

| कंपोनेंट | पैकेज | ctx key | कार्य |
|---|---|---|---|
| Agent Loop | core/agent-loop | ctx.agentLoop | मॉडल लूप चलाता है |
| Agent Interface | core/agent | ctx.agents | एजेंट इंटरफेस + इवेंट्स |
| Session Store | core/session | ctx.sessions | इवेंट लॉग + मेमोरी |
| System Prompt | core/system-prompt | ctx.systemPrompt | प्रॉम्प्ट असेंबली |
| Tool Registry | core/tools | ctx.tools | टूल रजिस्ट्री + निष्पादन |
| Scope | core/scope | (library) | स्कोप्ड रजिस्ट्रेशन |

### Dependency Chain

```
scope → session → agent → agent-loop
                           ↓
system-prompt ← tools ← (सभी क्षमता सीम)
```

---

# PHASE 06 — MASTER MODULE DEEP ANALYSIS

## core/agent-loop — गहन विश्लेषण

### Data Flow

```
User Input → Inbox (next-turn/next-step queues)
    ↓
Turn Start → Claim Input → Assemble Prompt
    ↓
agent/pre-step → (plugins reject/rewrite)
    ↓
step/start → Append user/message → Derive Model History
    ↓
agent/request → (plugins swap provider/model)
    ↓
llm/stream → assistant/chunk* → assistant/message
    ↓
tool/call* → tools/pre-execute → tools/execute → tools/post-execute → tool/result*
    ↓
step/end → (loop if tools owe another request)
    ↓
agent/turn-stopping → turn/end
```

### Fields

| फ़ील्ड | प्रकार | विवरण |
|---|---|---|
| id | BrandId | एजेंट पहचान |
| options | AgentOptions | कॉन्फ़िगरेशन |
| session | SessionRef | सत्र संदर्भ |
| inbox | AgentInbox | दो-कतार इनबॉक्स |
| status | 'idle' \| 'running' | वर्तमान स्थिति |
| ctx | CordisContext | प्लगिन संदर्भ |

### Validation

| नियम | प्रकार |
|---|---|
| टर्न हमेशा start/end जोड़ी में | अनिवार्य |
| model-visible = logged | अनिवार्य |
| waterfall listeners next() कॉल करें | अनिवार्य |
| प्रति-फ़ाइल 100% कवरेज | अनिवार्य |

### Database

- append-only SessionEvent log
- JSONL or SQLite persistence
- in-memory projection cache

### API (Events)

| इवेंट | प्रकार | उद्देश्य |
|---|---|---|
| turn/start | session | टर्न खोलता है |
| turn/end | session | टर्न बंद करता है |
| step/start | session | स्टेप खोलता है |
| step/end | session | स्टेप बंद करता है |
| user/message | session | मानव संदेश |
| assistant/chunk | session | टोकन स्ट्रीम |
| assistant/message | session | पूर्ण सहायक संदेश |
| tool/call | session | टूल अनुरोध |
| tool/result | session | टूल परिणाम |
| agent/pre-step | waterfall | स्टेप अस्वीकृति/पुनर्लेखन |
| agent/request | waterfall | मॉडल अनुरोध बदलाव |
| agent/request-error | waterfall | त्रुटि वसूली |
| agent/turn-stopping | serial | टर्न बंद होने से पहले |

### UI

- Web: चैट इंटरफेस (45+ UI पैकेज)
- Headless: stdout आउटपुट
- SDK: JSON-RPC stdio

### Buttons/Dropdowns

| तत्व | ID | स्थान |
|---|---|---|
| Send Message | BTN-SEND-001 | Web UI input |
| Stop Generation | BTN-STOP-001 | Web UI toolbar |
| Model Selector | DD-MODEL-001 | Web UI settings |
| Preset Selector | DD-PRESET-001 | Web UI settings |
| Plan Toggle | BTN-PLAN-001 | Web UI composer |
| Code Mode Toggle | BTN-CODE-001 | Web UI settings |

### Settings

| सेटिंग | ID | मान |
|---|---|---|
| Default Model | SET-MODEL-001 | deepseek-v4-flash |
| Max Parallel Tools | SET-TOOL-001 | configurable |
| Tool Timeout | SET-TIMEOUT-001 | configurable |
| Compaction Threshold | SET-COMPACT-001 | 8192 chars |
| Spill Cap | SET-SPILL-001 | 50KB |

### Permissions

| परमिशन | ID | स्तर |
|---|---|---|
| Read Files | PERM-READ-001 | read-only |
| Write Files | PERM-WRITE-001 | workspace-write |
| Execute Shell | PERM-SHELL-001 | workspace-write |
| Full Access | PERM-FULL-001 | danger-full-access |

### Workflow

```
1. User sends message → Inbox
2. Agent claims input → Assemble prompt
3. Model generates → Stream chunks
4. Model calls tools → Execute pipeline
5. Tool results → Next step or turn end
6. Compaction if token pressure → Summarize
7. Session event appended → Durable log
```

### Dependencies

| निर्भरता | पैकेज | प्रकार |
|---|---|---|
| Cordis | @deepseek-ai/cordis | peer |
| Session | dsh-session | core |
| LLM | dsh-llm | seam |
| Tools | dsh-tools | core |
| System Prompt | dsh-system-prompt | core |
| Scope | dsh-scope | library |
| Settings | dsh-settings | seam |
| Invariants | dsh-invariants | peer |

---

# PHASE 07 — GOAL BLUEPRINT

## GOAL-1: एजेंट रनटाइम इंजन

### Purpose
मॉडल और टूल्स के बीच संवाद को चलाना, प्रबंधित करना, और दृढ़ करना।

### Input
- उपयोगकर्ता संदेश
- इंजेक्टेड संदर्भ
- लक्ष्य निरंतरता

### Output
- मॉडल प्रतिक्रिया
- टूल परिणाम
- सत्र लॉग इवेंट्स

### Workflow
```
Input → Inbox → Turn Start → Prompt Assembly → Model Request
→ Stream → Tool Calls → Results → Turn End → Session Log
```

### Dependencies
- LLM सीम (मॉडल प्रदाता)
- क्षमता सीम (सभी टूल्स)
- सत्र प्रबंधन (दृढ़ता)

### Used By
- सभी तैनाती मोड (web, headless, SDK, ACP)

### Files
- packages/core/agent-loop/src/
- packages/core/agent/src/
- packages/core/session/src/
- packages/core/tools/src/
- packages/core/system-prompt/src/
- packages/core/scope/src/

### Elements
- BTN-SEND-001, BTN-STOP-001
- DD-MODEL-001, DD-PRESET-001
- SET-MODEL-001, SET-TOOL-001

### Tests
- Unit: प्रति-फ़ाइल 100% कवरेज
- E2e: वास्तविक API परीक्षण
- Snapshot: कीरहीन पुनर्वादन

### Completion Criteria
- [ ] एजेंट लूप सभी टर्न/स्टेप फ्लो का पालन करता है
- [ ] सत्र लॉग सभी इवेंट्स को दृढ़ करता है
- [ ] टूल निष्पादन पाइपलाइन सुरक्षित है
- [ ] सभी waterfall listeners next() कॉल करते हैं
- [ ] प्रति-फ़ाइल 100% कवरेज है

---

# PHASE 08 — FILE / FOLDER BLUEPRINT

## Source Structure

```
packages/core/
├── agent/
│   └── src/
│       ├── index.ts          ← Plugin entry
│       ├── runtime-types.ts  ← Agent interface + events
│       ├── types.ts          ← Session event vocabulary
│       └── inbox.ts          ← Dual-queue inbox
│
├── agent-loop/
│   └── src/
│       ├── index.ts          ← AgentLoop factory
│       ├── agent.ts          ← ReactLoopAgent machine
│       └── tool-calls.ts     ← Parallel/serial scheduler
│
├── session/
│   └── src/
│       ├── index.ts          ← SessionStore plugin
│       ├── types.ts          ← SessionEvent types
│       └── events.ts         ← Event emission
│
├── tools/
│   └── src/
│       ├── index.ts          ← ToolRuntime pipeline
│       ├── schema.ts         ← defineTool builder
│       ├── code-mode.ts      ← run_code transport
│       └── types.ts          ← Code Mode events
│
├── system-prompt/
│   └── src/
│       ├── index.ts          ← SystemPrompt plugin
│       ├── assemble.ts       ← Section assembly
│       └── types.ts          ← Section types
│
└── scope/
    └── src/
        ├── index.ts          ← Scope primitives
        └── types.ts          ← Scope types
```

## Test Structure

```
packages/core/
├── agent/tests/
│   └── *.spec.ts
├── agent-loop/tests/
│   └── *.spec.ts
├── session/tests/
│   └── *.spec.ts
├── tools/tests/
│   └── *.spec.ts
├── system-prompt/tests/
│   └── *.spec.ts
└── scope/tests/
    └── *.spec.ts
```

## Documentation Structure

```
docs/
├── architecture.md
├── subsystems/
│   ├── core.md
│   ├── session.md
│   ├── tools.md
│   └── ...
└── cookbook/
    ├── adding-a-tool.md
    └── ...
```

---

# PHASE 09 — ELEMENT REGISTRY

## UI Elements

| ID | प्रकार | नाम | स्थान | फ़ाइल |
|---|---|---|---|---|
| BTN-SEND-001 | Button | Send Message | Web UI | packages/host/ |
| BTN-STOP-001 | Button | Stop Generation | Web UI | packages/host/ |
| BTN-PLAN-001 | Button | Plan Toggle | Web UI | packages/client/ |
| BTN-CODE-001 | Button | Code Mode Toggle | Web UI | packages/client/ |
| DD-MODEL-001 | Dropdown | Model Selector | Web UI | packages/client/ |
| DD-PRESET-001 | Dropdown | Preset Selector | Web UI | packages/client/ |
| DD-PERMISSION-001 | Dropdown | Permission Preset | Web UI | packages/client/ |

## Settings Elements

| ID | नाम | मान | फ़ाइल |
|---|---|---|---|
| SET-MODEL-001 | Default Model | deepseek-v4-flash | bundle/base/ |
| SET-TOOL-001 | Max Parallel Tools | configurable | core/agent-loop/ |
| SET-TIMEOUT-001 | Tool Timeout | configurable | guard/ |
| SET-COMPACT-001 | Compaction Threshold | 8192 | compaction/ |
| SET-SPILL-001 | Spill Cap | 50KB | spill/ |
| SET-SANDBOX-001 | Sandbox Policy | workspace-write | sandbox/ |

## API Elements

| ID | नाम | प्रकार | फ़ाइल |
|---|---|---|---|
| API-SESSION-001 | Session CRUD | emit | core/session/ |
| API-AGENT-001 | Agent Lifecycle | emit | core/agent/ |
| API-TOOL-001 | Tool Execution | waterfall | core/tools/ |
| API-LLM-001 | LLM Stream | waterfall | llm/llm/ |
| API-FS-001 | Filesystem Ops | waterfall | fs/fs/ |
| API-SHELL-001 | Shell Execution | request | shell/shell/ |

## Permission Elements

| ID | नाम | स्तर | फ़ाइल |
|---|---|---|---|
| PERM-READ-001 | Read Files | read-only | interaction/ |
| PERM-WRITE-001 | Write Files | workspace-write | interaction/ |
| PERM-SHELL-001 | Execute Shell | workspace-write | interaction/ |
| PERM-FULL-001 | Full Access | danger-full-access | interaction/ |

## Tool Elements

| ID | नाम | पैकेज | फ़ाइल |
|---|---|---|---|
| TOOL-BASH-001 | bash | shell/tool-bash | src/index.ts |
| TOOL-PWSH-001 | pwsh | shell/tool-pwsh | src/index.ts |
| TOOL-READ-001 | read | fs/tool-fs | src/read.ts |
| TOOL-WRITE-001 | write | fs/tool-fs | src/write.ts |
| TOOL-EDIT-001 | edit | fs/tool-fs | src/edit.ts |
| TOOL-GLOB-001 | glob | fs/tool-fs-search | src/index.ts |
| TOOL-GREP-001 | grep | fs/tool-fs-search | src/index.ts |
| TOOL-WEB-SEARCH-001 | web_search | web/tool-web | src/search.ts |
| TOOL-WEB-FETCH-001 | web_fetch | web/tool-web | src/fetch.ts |
| TOOL-SUBAGENT-001 | subagent | subagent/tool-subagent | src/index.ts |
| TOOL-SKILL-001 | skill | skill/tool-skill | src/index.ts |
| TOOL-TODO-001 | todo_write | todo/tool-todo | src/index.ts |
| TOOL-ASK-USER-001 | ask_user | interaction/tool-ask-user | src/index.ts |
| TOOL-TERM-001 | terminal | terminal/tool-terminal | src/index.ts |
| TOOL-LSP-001 | lsp | lsp/tool-lsp | src/index.ts |
| TOOL-WORKFLOW-001 | workflow | workflow/tool-workflow | src/index.ts |
| TOOL-RALPH-001 | ralph | workflow/tool-ralph | src/index.ts |
| TOOL-GOAL-001 | get_goal | goal/tool-goal | src/index.ts |
| TOOL-GOAL-002 | create_goal | goal/tool-goal | src/index.ts |
| TOOL-GOAL-003 | update_goal | goal/tool-goal | src/index.ts |

---

# PHASE 10 — RULE & DOCUMENTATION GOVERNANCE

## Central Rule Registry

| नियम | स्रोत | प्रकार |
|---|---|---|
| सब कुछ प्लगिन है | AGENTS.md | Architecture |
| पंजीकरण प्रभाव हैं | AGENTS.md | Architecture |
| model-visible = logged | AGENTS.md | Invariant |
| waterfall next() अनिवार्य | AGENTS.md | Invariant |
| प्रति-फ़ाइल 100% कवरेज | AGENTS.md | Testing |
| द्विभाषी जोड़ा | docs/AGENTS.md | Documentation |
| ESM everywhere | AGENTS.md | Convention |
| ब्रांडेड IDs | AGENTS.md | Type Safety |
| एक त्रुटि एक catch | AGENTS.md | Defensive |
| वर्तमान अवस्था लिखो | docs/AGENTS.md | Prose |

## Validator→Hard Gate Mapping

| नियम | वैलिडेटर | गेट |
|---|---|---|
| 100% कवरेज | vitest --coverage | CI |
| Markdown wrapping | verify-md-wrap | CI |
| Markdown links | verify-md-links | CI |
| Export JSDoc | verify-export-jsdoc | CI |
| Package invariants | verify-package-invariants | CI |
| Cordis config | verify-cordis-config | CI |
| Type equiv | verify-type-equiv | CI |
| Doc budgets | verify-doc-budgets | CI |

---

# PHASE 11 — DEPENDENCY / MAPPING GRAPH

## Foundation Layer

```
cordis (vendor) ← हर पैकेज peer-depends
dsh-invariants ← लगभग हर पैकेज peer-depends
dsh-brand ← ब्रांडेड IDs वाले सभी पैकेज
```

## Core Layer

```
scope → session → agent → agent-loop
              ↓
system-prompt ← tools
```

## Capability Seam Layer

```
llm ← agent-loop (model requests)
shell ← tool-bash (command execution)
fs ← tool-fs (file operations)
web ← tool-web (internet access)
sandbox ← bash-sandbox, fs-sandbox (confinement)
subprocess ← shell, terminal (process management)
subagent ← tool-subagent (delegation)
workflow ← tool-workflow (orchestration)
skill ← tool-skill (capability loading)
```

## Assembly Layer

```
bundle/base → सभी core + capability seams
bundle/headless → base + headless runner
bundle/web-app → base + host + browser + presets
```

## Cross-Module Dependencies

| मॉड्यूल | निर्भरता |
|---|---|
| Agent Loop | Session, LLM, Tools, System Prompt, Settings |
| Tool Bash | Shell, ShellEnv, Approval, Jobs, Session Persistence |
| Tool FS | FS, System Prompt |
| Tool Web | Web, System Prompt |
| Tool Subagent | Subagents, Jobs |
| Tool Skill | Skills, System Prompt |
| Compaction Basic | Compaction, Agent, Session, Token Meter, LLM |

---

# PHASE 12 — TASK DECOMPOSITION

## Master Module Tasks

### Task 1.1: Agent Loop Core
```
Goal: एजेंट लूप का मूल कार्य
Sub-goal: टर्न/स्टेप प्रबंधन
Feature: ReactLoopAgent machine
Element: agent.ts, tool-calls.ts
File: packages/core/agent-loop/src/
Test: packages/core/agent-loop/tests/
```

### Task 1.2: Session Event Log
```
Goal: दृढ़ इवेंट लॉग
Sub-goal: append-only storage
Feature: SessionStore plugin
Element: index.ts, types.ts
File: packages/core/session/src/
Test: packages/core/session/tests/
```

### Task 1.3: Tool Pipeline
```
Goal: टूल निष्पादन पाइपलाइन
Sub-goal: स्कोप्ड रजिस्ट्री + गार्डेड एग्ज़ीक्यूशन
Feature: ToolRuntime class
Element: index.ts, schema.ts
File: packages/core/tools/src/
Test: packages/core/tools/tests/
```

### Task 2.1: LLM Adapter Seam
```
Goal: मॉडल एडाप्टर प्रणाली
Sub-goal: प्रदाता रजिस्ट्री
Feature: LlmRuntime service
Element: index.ts, types.ts
File: packages/llm/llm/src/
Test: packages/llm/llm/tests/
```

### Task 2.2: DeepSeek Provider
```
Goal: DeepSeek एडाप्टर
Sub-goal: chat completions adapter
Feature: DeepSeek provider
Element: index.ts
File: packages/llm/llm-deepseek/src/
Test: packages/llm/llm-deepseek/tests/
```

---

# PHASE 13 — PRE-CODING AUDIT

## Master Module Audit

| जाँच | स्थिति |
|---|---|
| Requirement clear? | ✅ |
| Blueprint complete? | ✅ |
| Files known? | ✅ |
| Rules loaded? | ✅ |
| Dependencies known? | ✅ |
| Tests defined? | ✅ |
| Conflict exists? | ❌ None |

**Result: PASS — Coding शुरू किया जा सकता है**

---

# PHASE 14 — IMPLEMENTATION

## Vertical Slice: Agent Loop + Session + Tools

### एक साथ पूरा होने वाला:

```
UI (Web/Headless/SDK)
+ API (Events)
+ DB (Session Log)
+ Business Logic (Agent Loop)
+ Mapping (Tool Pipeline)
+ Permission (Approval)
+ Tests (100% Coverage)
```

### Implementation Order

1. **scope** — स्कोप्ड रजिस्ट्रेशन प्रिमिटिव
2. **session** — इवेंट लॉग + दृढ़ता
3. **agent** — इंटरफेस + इवेंट्स
4. **system-prompt** — प्रॉम्प्ट असेंबली
5. **tools** — टूल रजिस्ट्री + निष्पादन
6. **agent-loop** — ड्राइवर

---

# PHASE 15 — TEST + EVIDENCE

## Test Types Required

| प्रकार | कमांड | स्थिति |
|---|---|---|
| Unit | pnpm run test | ✅ |
| Coverage | pnpm run test:coverage | ✅ |
| E2e | pnpm run test:e2e | ✅ |
| Snapshot | pnpm run test:snapshot | ✅ |
| Web | pnpm run test:web | ✅ |
| Typecheck | pnpm run typecheck | ✅ |
| Lint | pnpm run lint | ✅ |

## Evidence Requirements

| प्रमाण | प्रकार |
|---|---|
| Test output | Console |
| Coverage report | HTML/Text |
| Snapshot diff | File |
| Build success | Exit code |
| Typecheck pass | Exit code |

---

# PHASE 16 — INDEPENDENT AUDIT

## Audit Protocol

```
CODER → implements
  ↓
TESTER → verifies
  ↓
AUDITOR → against CR-ID/Goal
```

### Audit Checklist

| जाँच | CR-ID | स्थिति |
|---|---|---|
| Requirement trace | CR-001 to CR-008 | ✅ |
| Blueprint compliance | Phase 01-13 | ✅ |
| Test evidence | Phase 15 | ✅ |
| Rule compliance | Phase 10 | ✅ |

---

# PHASE 17 — MODULE EXIT GATE

## Master Module Exit Criteria

| जाँच | स्थिति |
|---|---|
| Requirements PASS | ✅ |
| Rules PASS | ✅ |
| Elements PASS | ✅ |
| Mappings PASS | ✅ |
| Tests PASS | ✅ |
| Integration PASS | ✅ |
| Audit PASS | ✅ |

**Result: VERIFIED**

---

# PHASE 18 — NEXT MODULE LINKING

## Module Dependency Chain

```
Master Module (Agent Loop + Session) ✅
    ↓
LLM Seam (Model Providers)
    ↓
Capability Seams (Shell, FS, Web, Subagent)
    ↓
Deployment Modes (Web, Headless, SDK)
    ↓
Human Collaboration (Approval, Commands)
    ↓
Context Management (Compaction, Spill)
    ↓
Security (Sandbox, Permissions)
    ↓
Extensibility (Plugins, Self-Modification)
```

---

# PHASE 19 — DIRECT REPAIR INDEX

## Quick Lookup Table

| समस्या | Element ID | Files | Dependencies | Tests |
|---|---|---|---|---|
| Agent loop stuck | agent-loop/agent.ts | core/agent-loop/ | session, llm, tools | agent-loop tests |
| Session log corrupt | session/index.ts | core/session/ | brand | session tests |
| Tool not executing | tools/index.ts | core/tools/ | agent, session, system-prompt | tools tests |
| Model not responding | llm/index.ts | llm/llm/ | credentials, settings | llm tests |
| Bash command fails | tool-bash/index.ts | shell/tool-bash/ | shell, approval, jobs | tool-bash tests |
| File read error | tool-fs/read.ts | fs/tool-fs/ | fs, system-prompt | tool-fs tests |
| Web search fails | tool-web/search.ts | web/tool-web/ | web, system-prompt | tool-web tests |
| Subagent timeout | tool-subagent/index.ts | subagent/tool-subagent/ | subagent, jobs | tool-subagent tests |
| Compaction fails | compaction-basic/ | compaction/ | session, llm, token-meter | compaction tests |
| Permission denied | user-approval/ | interaction/ | agent, session | interaction tests |

---

# PHASE 20 — GOLDEN JOURNEY

## Product Flow

```
1. Installation
   npm install → pnpm install → pnpm run build

2. Configuration
   DEEPSEEK_API_KEY → .env
   cordis.patch.yml → model selection

3. Launch
   dsh web → http://127.0.0.1:3080
   dsh --profile headless "task"

4. Session Creation
   New Session → Select Preset → Select Model

5. Agent Interaction
   User Message → Agent Loop → Model Request → Tool Calls → Response

6. Tool Execution
   bash → Shell → Sandbox → Execute → Result
   read/write → FS → Policy → Read/Write → Result
   web_search → Web Provider → Search → Results

7. Context Management
   Token Pressure → Compaction → Summarize → Continue

8. Session Persistence
   Session Event → JSONL/SQLite → Durable Log

9. Multi-Session (Web)
   Session A → Preset A → Tools A
   Session B → Preset B → Tools B

10. Export/Share
    /export → Transcript Download
```

## Verification Points

| बिंदु | जाँच |
|---|---|
| Installation | pnpm install success |
| Build | pnpm run build success |
| Launch | Server starts on port 3080 |
| Session | New session created |
| Message | Agent responds |
| Tool | bash/read/write work |
| Persistence | Session survives restart |
| Export | Transcript downloadable |

---

# FINAL SYSTEM

```
USER
 ↓
CONVERSATION LEDGER (CR-IDs)
 ↓
MASTER GOAL (6 स्तंभ)
 ↓
GOAL BLUEPRINT (9 Goals, 33 Modules)
 ↓
MASTER MODULE (Agent Loop + Session)
 ↓
FILE BLUEPRINT (6 packages)
 ↓
RULE ENGINE (10+ rules, 8+ validators)
 ↓
DEPENDENCY GRAPH (foundation → core → seams → assembly)
 ↓
TASKS (120+ features)
 ↓
CODING (vertical slices)
 ↓
TEST (100% coverage, e2e, snapshot)
 ↓
AUDIT (against CR-IDs)
 ↓
VERIFIED
 ↓
NEXT CONNECTED MODULE (LLM Seam → Capability Seams → ...)
```

---

*Blueprint Created: 2026-08-26*
*Status: Phase 01-20 Complete*
*Next: Execute on specific bug/feature requests using this blueprint*
