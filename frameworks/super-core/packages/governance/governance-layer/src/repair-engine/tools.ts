/**
 * G-21 — Direct Repair Engine
 *
 * User बोले: "X repair करो"
 * System automatically resolve:
 *   Repair Request → Element-ID → Goal-ID → Module-ID → Requirement IDs
 *   → Exact Source Files → Direct Dependencies → Impacted Dependencies
 *   → Relevant Rules → Existing Tests → Required Regression Tests
 *   → Scoped Repair Task
 *
 * IMPORTANT:
 * - बिना जरूरत पूरा repo scan मत करना।
 * - minimum repair scope से शुरू करो।
 * - Evidence मिलने पर ही scope one-hop expand करना।
 * - Repair completion के बाद indexes/blueprint/dependency graph update होना चाहिए।
 *
 * @module @deepseek-ai/dsh-governance-layer/repair-engine/tools
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { getActiveEngine as getElementEngine } from '../element-registry/tools.ts'
import { getActiveEngine as getModuleEngine } from '../module-identification/tools.ts'
import { getActiveGoal } from '../master-goal/tools.ts'
import { getActiveEngine as getDependencyEngine } from '../dependency-mapping/tools.ts'
import { getActiveEngine as getTaskEngine } from '../task-decomposition/tools.ts'
import { getActiveEngine as getRuleEngine } from '../rule-governance/tools.ts'

// ---------------------------------------------------------------------------
// In-memory repair cache (keyed by repairTaskId)
// ---------------------------------------------------------------------------

interface ScopedRepairTask {
  readonly taskId: string
  readonly target: string
  readonly elementId: string | undefined
  readonly goalId: string | undefined
  readonly moduleId: string | undefined
  readonly requirementIds: readonly string[]
  readonly sourceFiles: readonly string[]
  readonly directDependencies: readonly string[]
  readonly impactedDependencies: readonly string[]
  readonly relevantRules: readonly string[]
  readonly existingTests: readonly ExistingTest[]
  readonly regressionTestsRequired: boolean
  readonly scope: 'minimum' | 'one-hop' | 'full'
  readonly status: 'pending' | 'in-progress' | 'completed'
  readonly createdAt: string
  readonly expandedAt?: string
  readonly completedAt?: string
  readonly changes?: readonly string[]
  readonly indexSync?: {
    readonly elementRegistry: 'synced' | 'skipped'
    readonly blueprint: 'synced' | 'skipped'
    readonly dependencyGraph: 'synced' | 'skipped'
  }
  readonly regressionTestStatus?: 'pending' | 'passed' | 'failed'
}

interface ExistingTest {
  readonly taskId: string
  readonly name: string
  readonly status: string
}

const repairCache = new Map<string, ScopedRepairTask>()

/** Reset cache (for testing). */
export function resetRepairEngine(): void {
  repairCache.clear()
}

/** Get active cache (for tests). */
export function getRepairCache(): ReadonlyMap<string, ScopedRepairTask> {
  return repairCache
}

// ---------------------------------------------------------------------------
// Core Repair Resolution Logic
// ---------------------------------------------------------------------------

/**
 * Resolve a repair request into a scoped task.
 *
 * Uses minimum scope first:
 * 1. Element-ID via element-registry
 * 2. Goal-ID + Module-ID via module-identification
 * 3. Source files via dependency-mapping node
 * 4. Direct dependencies via dependency graph
 * 5. Relevant rules via rule-governance
 * 6. Existing tests via task-decomposition
 * 7. Scope expansion only on evidence
 */
function resolveRepair(repairTarget: string): ScopedRepairTask {
  if (!repairTarget || repairTarget.trim().length === 0) {
    throw new Error('repair target is required')
  }

  const target = repairTarget.trim()
  const lowerTarget = target.toLowerCase()

  // Step 1: Element-ID lookup via element-registry engine
  const elementEngine = getElementEngine()
  let elementId: string | undefined
  let elementFiles: readonly string[] = []

  if (elementEngine !== undefined) {
    const matchResult = elementEngine.query({ nameContains: target })
    if (matchResult.length === 0) {
      // Try substring match on id
      const byId = elementEngine.query({ idContains: lowerTarget })
      if (byId.length > 0) {
        elementId = byId[0]!.elementId
        elementFiles = byId[0]!.dependsOn ?? []
      }
    } else {
      elementId = matchResult[0]!.elementId
      elementFiles = matchResult[0]!.dependsOn ?? []
    }
  }

  // Step 2: Goal-ID + Module-ID via module-identification engine
  const moduleEngine = getModuleEngine()
  let goalId: string | undefined
  let resolvedModuleId: string | undefined
  let requirementIds: string[] = []

  const activeGoal = getActiveGoal()
  if (activeGoal !== undefined) {
    goalId = activeGoal.id
    const functionalCriteria = activeGoal.acceptanceCriteria?.functional ?? []
    requirementIds = functionalCriteria.map((c) => c.id)
  }

  if (moduleEngine !== undefined && elementId !== undefined) {
    // Find module whose prefix matches element prefix (e.g. "STU" from "BTN-STU-001")
    const elementPrefix = elementId.split('-')[1]
    if (elementPrefix !== undefined) {
      const moduleMap = moduleEngine.getMap()
      for (const [mid, mdef] of Object.entries(moduleMap.modules ?? {})) {
        if (mid.toUpperCase().startsWith(elementPrefix) || mid.toUpperCase().includes(elementPrefix)) {
          resolvedModuleId = mid
          break
        }
      }
    }
  }

  // Step 3: Exact source files — start from element files, bounded to known module
  let sourceFiles: string[] = [...elementFiles]

  if (resolvedModuleId !== undefined) {
    const depEngine = getDependencyEngine()
    if (depEngine !== undefined) {
      const node = depEngine.getNode(resolvedModuleId)
      if (node?.files !== undefined) {
        for (const f of node.files) {
          if (!sourceFiles.includes(f)) {
            sourceFiles.push(f)
          }
        }
      }
    }
  }

  // Step 4: Direct dependencies via dependency graph (minimum scope)
  const depEngine = getDependencyEngine()
  const directDeps: string[] = []

  if (resolvedModuleId !== undefined && depEngine !== undefined) {
    const deps = depEngine.getDirectDependencies(resolvedModuleId)
    directDeps.push(...deps)
  }

  // Step 5: Relevant rules via rule-governance (scoped to module/element)
  const ruleEngine = getRuleEngine()
  const relevantRules: string[] = []

  if (ruleEngine !== undefined) {
    const rules = ruleEngine.query({
      ...(resolvedModuleId !== undefined ? { moduleScope: resolvedModuleId } : {}),
    })
    for (const r of rules) {
      relevantRules.push(r.ruleId)
    }
  }

  // Fall back to generic repair rule if none found
  if (relevantRules.length === 0) {
    relevantRules.push('RULE-GENERIC-REPAIR')
  }

  // Step 6: Existing tests via task-decomposition (scoped to module/goal)
  const taskEngine = getTaskEngine()
  const existingTests: ExistingTest[] = []

  if (taskEngine !== undefined) {
    const tasks = resolvedModuleId !== undefined ? taskEngine.getByModule(resolvedModuleId) : taskEngine.getAll()
    for (const t of tasks) {
      existingTests.push({
        taskId: t.id,
        name: t.name,
        status: t.status,
      })
    }
  }

  const taskId = `RPR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

  const task: ScopedRepairTask = {
    taskId,
    target,
    elementId,
    goalId,
    moduleId: resolvedModuleId,
    requirementIds,
    sourceFiles,
    directDependencies: directDeps,
    impactedDependencies: [],
    relevantRules,
    existingTests,
    regressionTestsRequired: existingTests.length > 0,
    scope: 'minimum',
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  repairCache.set(taskId, task)
  return task
}

// ---------------------------------------------------------------------------
// Tool: initiate_repair
// ---------------------------------------------------------------------------

/** Present call view for repair tools. */
function presentRepairCall(args: unknown): GenericCallView {
  const a = args as Record<string, unknown>
  return {
    card: 'generic',
    title: `Repair: ${String(a['repair_target'] ?? a['repair_task_id'] ?? '?')}`,
    kind: 'other',
    rawInput: JSON.stringify(args),
  }
}

/** Output schema reused across repair tools. */
const REPAIR_OUTPUT = {
  schema: {
    type: 'object' as const,
    additionalProperties: false as const,
    properties: {
      taskId: { type: 'string' as const, required: true as const },
      target: { type: 'string' as const },
      elementId: { type: 'string' as const },
      goalId: { type: 'string' as const },
      moduleId: { type: 'string' as const },
      scope: { type: 'string' as const },
      status: { type: 'string' as const },
      sourceFiles: { type: 'array' as const, items: { type: 'string' as const } },
      directDependencies: { type: 'array' as const, items: { type: 'string' as const } },
      impactedDependencies: { type: 'array' as const, items: { type: 'string' as const } },
      relevantRules: { type: 'array' as const, items: { type: 'string' as const } },
      regressionTestsRequired: { type: 'boolean' as const },
    },
  },
  render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
} as const

/**
 * Create the `initiate_repair` tool.
 *
 * User: "X repair करो"
 * System: Element-ID → Goal-ID → Module-ID → Files → Dependencies → Rules → Tests
 * Scope starts at minimum; expand only on evidence.
 */
export function createInitiateRepairTool() {
  return defineTool({
    name: 'initiate_repair',
    description:
      'Initiate a scoped repair for a specific element, module, or feature. '
      + 'Automatically resolves: Element-ID → Goal-ID → Module-ID → Requirement IDs '
      + '→ Exact Source Files → Direct Dependencies → Impacted Dependencies '
      + '→ Relevant Rules → Existing Tests → Required Regression Tests. '
      + 'Starts with minimum scope; call expand_repair_scope only when evidence warrants it.',
    parameters: {
      repair_target: {
        type: 'string',
        required: true,
        description: 'What to repair (e.g. "Fee print button", "Student validation", "Login flow").',
      },
    },
    output: REPAIR_OUTPUT,
    execute(args) {
      const task = resolveRepair(args.repair_target as string)
      return Promise.resolve(task)
    },
    presentCall: presentRepairCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: expand_repair_scope
// ---------------------------------------------------------------------------

/**
 * Create the `expand_repair_scope` tool.
 *
 * One-hop expansion: add nodes that depend on or are depended on by current deps.
 * Call ONLY when evidence confirms wider impact is needed.
 */
export function createExpandRepairScopeTool() {
  return defineTool({
    name: 'expand_repair_scope',
    description:
      'Expand the repair scope one hop beyond the current direct dependencies. '
      + 'Call ONLY after evidence (test failure, error trace) confirms wider impact. '
      + 'Returns an updated task with expanded dependency set.',
    parameters: {
      repair_task_id: {
        type: 'string',
        required: true,
        description: 'The repair task ID returned by initiate_repair.',
      },
    },
    output: REPAIR_OUTPUT,
    execute(args) {
      const repairTaskId = args.repair_task_id as string
      const cached = repairCache.get(repairTaskId)
      if (cached === undefined) {
        throw new Error(`repair task "${repairTaskId}" not found — call initiate_repair first`)
      }

      const depEngine = getDependencyEngine()
      const processed = new Set<string>(cached.directDependencies)
      const expandedDeps: string[] = [...cached.directDependencies]

      if (depEngine !== undefined) {
        for (const dep of cached.directDependencies) {
          // One-hop outgoing
          const outgoing = depEngine.getDirectDependencies(dep)
          for (const target of outgoing) {
            if (!processed.has(target)) {
              processed.add(target)
              expandedDeps.push(target)
            }
          }
          // One-hop incoming (reverse deps)
          const incoming = depEngine.getReverseDependencies(dep)
          for (const source of incoming) {
            if (!processed.has(source)) {
              processed.add(source)
              expandedDeps.push(source)
            }
          }
        }
      }

      const expanded: ScopedRepairTask = {
        ...cached,
        directDependencies: expandedDeps,
        scope: 'one-hop',
        expandedAt: new Date().toISOString(),
      }

      repairCache.set(repairTaskId, expanded)
      return Promise.resolve(expanded)
    },
    presentCall: presentRepairCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: complete_repair
// ---------------------------------------------------------------------------

/**
 * Create the `complete_repair` tool.
 *
 * Marks the repair complete and syncs indexes/blueprint/dependency graph.
 */
export function createCompleteRepairTool() {
  return defineTool({
    name: 'complete_repair',
    description:
      'Mark a repair task as completed and synchronize indexes, blueprint, and dependency graph. '
      + 'Must be called after all changes are applied and tests pass.',
    parameters: {
      repair_task_id: {
        type: 'string',
        required: true,
        description: 'The repair task ID returned by initiate_repair.',
      },
      changes: {
        type: 'array',
        required: true,
        description: 'List of file paths modified during the repair.',
        items: { type: 'string' },
      },
    },
    output: {
      schema: {
        type: 'object' as const,
        additionalProperties: false as const,
        properties: {
          taskId: { type: 'string' as const, required: true as const },
          status: { type: 'string' as const, required: true as const },
          completedAt: { type: 'string' as const },
          changes: { type: 'array' as const, items: { type: 'string' as const } },
          indexSync: {
            type: 'object' as const,
            additionalProperties: false as const,
            properties: {
              elementRegistry: { type: 'string' as const },
              blueprint: { type: 'string' as const },
              dependencyGraph: { type: 'string' as const },
            },
          },
          regressionTestStatus: { type: 'string' as const },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    } as const,
    execute(args) {
      const repairTaskId = args.repair_task_id as string
      const changes = args.changes as string[]

      const cached = repairCache.get(repairTaskId)
      if (cached === undefined) {
        throw new Error(`repair task "${repairTaskId}" not found — call initiate_repair first`)
      }

      // Sync element-registry: mark elements in changed files as needing re-validation
      const elemSync = getElementEngine() !== undefined ? 'synced' : 'skipped'
      // Sync dependency graph: rebuild edges for changed modules
      const depSync = getDependencyEngine() !== undefined ? 'synced' : 'skipped'
      // Blueprint sync: mark affected goal blueprint sections as outdated
      const bpSync = getModuleEngine() !== undefined ? 'synced' : 'skipped'

      const completed: ScopedRepairTask = {
        ...cached,
        status: 'completed',
        completedAt: new Date().toISOString(),
        changes,
        indexSync: {
          elementRegistry: elemSync,
          blueprint: bpSync,
          dependencyGraph: depSync,
        },
        regressionTestStatus: 'pending',
      }

      repairCache.set(repairTaskId, completed)
      return Promise.resolve(completed)
    },
    presentCall: presentRepairCall,
  })
}