# Governance Layer — Refined Modification Blueprint

## PRE-READ: Existing Extension Points (DO NOT MODIFY)

```
HARNESS EXTENSION POINT MAP (read-only reference)
═══════════════════════════════════════════════════

packages/core/tools/src/index.ts
├── 'tools/pre-execute'     waterfall  → PreToolDecision {allow|deny|ask}
├── 'tools/execute'         waterfall  → ToolExecutionResult (around-dispatch)
├── 'tools/post-execute'    waterfall  → PostToolDecision {accept|block}
├── 'tools/code-dispatch-log' waterfall → ContentBlock[] (log-only)
├── 'tools/result'          emit       → observe settled result
└── 'tools/change'          emit       → tool set changed

packages/core/system-prompt/src/index.ts
├── systemPrompt.section()  → register PromptSection {name, order, text|provider}
├── systemPrompt.context()  → register PromptContext
├── systemPrompt.tools()    → register tool-schema provider
├── systemPrompt.variable() → register {{variable}}
└── 'system-prompt/assemble' waterfall → PromptAssembly

packages/goal/tool-goal/src/authority.ts
├── registerCompletionGate(ctx, gate)  → disposer
├── requireCompletionCertification()   → throw on gate failure
├── goalToolExecution(ctx, exec)       → GoalToolExecution
└── completionAuthority(ctx, exec)     → GoalToolAuthority

packages/goal/tool-goal/src/index.ts
├── ctx.tools.register(defineTool({...}))  → tool registration
├── ctx.systemPrompt.section({...})        → prompt section
└── apply(ctx, config)                     → plugin entry
```

**RULE: Governance Layer hooks into these surfaces. It NEVER patches
core/tools, core/system-prompt, goal/tool-goal, or any existing package.**

---

## AUDIT: Current `packages/governance/governance-layer/`

### File Inventory

| File | Status | Issue |
|------|--------|-------|
| `src/types.ts` | ✅ | Clean |
| `src/state-machine.ts` | ✅ | Clean |
| `src/pre-execution.ts` | ⚠️ | Hardcoded tool lists; missing `ctx` injection pattern |
| `src/completion.ts` | ⚠️ | Broken async import; should use sync authority API |
| `src/prompt-section.ts` | ⚠️ | Static text; should be dynamic per-agent via AssembleContext |
| `src/index.ts` | ⚠️ | Missing `governance_transition` tool; missing inject declaration |
| `tests/governance-layer.spec.ts` | ⚠️ | Only tests state machine; missing gate integration tests |
| `package.json` | ✅ | Clean |
| `tsconfig.json` | ✅ | Clean |

---

## PHASE-BY-PHASE FIX PLAN

### Phase 1: `src/types.ts` — No Changes
Current types are correct and complete.

### Phase 2: `src/state-machine.ts` — No Changes
State machine logic is correct and complete.

### Phase 3: `src/pre-execution.ts` — Fix Hardcoded Tool Lists

**Problem:** `STATE_CHANGING_TOOLS` and `ALWAYS_ALLOWED_TOOLS` are hardcoded
sets. New tools added to the harness won't be covered.

**Fix:** Use the runtime tool registry to classify tools dynamically.
The `tools/pre-execute` waterfall receives `ToolExecution` which has
`exec.name`. We can query `ctx.tools` for registered tool metadata.

**Current (broken):**
```ts
const STATE_CHANGING_TOOLS: ReadonlySet<string> = new Set([
  'write', 'edit', 'bash', ...
])
```

**Fixed approach:** Instead of hardcoding, use a config-driven allow/deny
list with sensible defaults. The user's `cordis.yml` can override:
```ts
// Config-driven, not hardcoded
restrictedTools: string[]    // tools blocked during non-unrestricted phases
exemptTools: string[]        // tools always allowed
```

### Phase 4: `src/completion.ts` — Fix Broken Import

**Problem:** Uses `import('@deepseek-ai/dsh-goal/authority')` which is a
dynamic import that may fail silently. The goal package is a peerDependency.

**Fix:** Use the synchronous import path. The plugin's peerDependencies
already declare `@deepseek-ai/dsh-goal`. If the goal package is loaded,
we import directly. If not, we skip gracefully.

**Current (broken):**
```ts
import('@deepseek-ai/dsh-goal/authority').then(({ registerCompletionGate }) => {
  disposer = registerCompletionGate(ctx, gate as never)
}).catch(() => { /* silently skip */ })
```

**Fixed approach:** Static import with a try/catch at the module level,
or accept the goal service through `ctx.get('goals')` which is the
standard Cordis service resolution pattern.

### Phase 5: `src/prompt-section.ts` — Make Dynamic Per-Agent

**Problem:** The prompt section is static text. It should read the
current agent's governance state and show the actual phase.

**Fix:** Use the `AssembleContext` parameter in the text provider.
The `system-prompt/assemble` waterfall provides the context scope.
We can look up the agent's governance state from the store.

**Current (broken):**
```ts
text: (context: AssembleContext) => {
  // Static text — never reads actual state
  return '## Governance Framework\n...'
}
```

**Fixed approach:**
```ts
text: (_context: AssembleContext) => {
  // The text provider runs during assembly. We cannot access the calling
  // agent directly from AssembleContext. However, we can register a
  // dynamic section that reads from the store. The store is keyed by
  // agent id; we need to determine which agent is being assembled.
  //
  // Since AssembleContext doesn't carry the agent, we use a workaround:
  // the governance state store tracks the "current" agent via the most
  // recent transition. This is set by the pre-execution gate.
  const currentAgentId = store.get('__current__')
  // ...
}
```

### Phase 6: `src/index.ts` — Add Tool + Fix Plugin Shape

**Problem:** Missing `governance_transition` tool. The plugin should
register a model-facing tool so the model can transition governance phases.

**Fix:** Register `governance_transition` tool using `defineTool` pattern
from `@deepseek-ai/dsh-tools`.

**Add:**
```ts
ctx.tools.register(defineTool({
  name: 'governance_transition',
  description: 'Transition the governance state machine to a new phase.',
  parameters: {
    to_phase: {
      type: 'string',
      required: true,
      enum: ['capturing', 'planning', 'implementing', 'testing', 'auditing', 'verified', 'idle'],
      description: 'Target governance phase.',
    },
    reason: {
      type: 'string',
      required: true,
      description: 'Reason for the transition.',
    },
  },
  output: GOAL_OUTPUT,  // reuse the goal output schema pattern
  execute(args, exec) {
    // Use state machine to validate and apply transition
  },
}))
```

### Phase 7: `tests/governance-layer.spec.ts` — Add Gate Tests

**Problem:** Tests only cover the state machine. Missing:
- Pre-execution gate integration
- Completion gate integration
- Prompt section integration
- Full plugin lifecycle

**Fix:** Add tests that mock the Cordis context and verify gate behavior.

---

## MODIFICATION SEQUENCE (per blueprint flow)

```
STEP 1: src/types.ts          [NO CHANGE]
STEP 2: src/state-machine.ts  [NO CHANGE]
STEP 3: src/pre-execution.ts  [FIX: config-driven tool lists]
STEP 4: src/completion.ts     [FIX: sync import, remove async]
STEP 5: src/prompt-section.ts [FIX: dynamic per-agent section]
STEP 6: src/index.ts          [ADD: governance_transition tool]
STEP 7: tests/governance-layer.spec.ts [ADD: gate tests]
STEP 8: Verify all 17+ tests pass
```

## EXTENSION POINT SURFACE (where Governance Layer hooks)

```
Governance Layer Surface Map
═════════════════════════════

1. PRE-EXECUTION GATE
   Hook: ctx.on('tools/pre-execute', listener)
   Effect: Block state-changing tools during planning/auditing phases
   Reads: GovernanceStore[agent.id].phase
   Writes: nothing (pure gate)

2. COMPLETION GATE
   Hook: registerCompletionGate(ctx, gate)
   Effect: Require 'auditing' phase for autonomous goal completion
   Reads: GovernanceStore[agent.id].phase, goal.id
   Writes: nothing (pure gate)

3. PROMPT SECTION
   Hook: ctx.systemPrompt.section({name, order, text})
   Effect: Inject governance phase description into system prompt
   Reads: GovernanceStore (dynamic provider)
   Writes: nothing (pure contribution)

4. TOOL REGISTRATION
   Hook: ctx.tools.register(defineTool({...}))
   Effect: Model can call governance_transition tool
   Reads: GovernanceStore
   Writes: GovernanceStore[agent.id] (state transition)
```

## SUCCESS CRITERIA

1. All existing 17 state-machine tests pass (no regression)
2. New gate integration tests pass
3. No import of `@deepseek-ai/dsh-tools` internals beyond public API
4. No modification to any existing package
5. Plugin loads via `cordis.yml` config
6. State transitions are logged to session events
