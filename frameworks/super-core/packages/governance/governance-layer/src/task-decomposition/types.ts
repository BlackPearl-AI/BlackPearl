/**
 * PHASE 12 — Task Decomposition Types
 *
 * Breaks modules into a 5-level hierarchy:
 *
 *   Goal → Sub-goal → Feature → Element → Microtask
 *
 * Every task is traceable through a full chain:
 *
 *   CR-ID → Goal-ID → Element-ID → Task-ID → File → Test
 */

// ---------------------------------------------------------------------------
// Task Hierarchy
// ---------------------------------------------------------------------------

/** Hierarchy level of a task. Microtask is always a leaf. */
export type TaskLevel = 'goal' | 'subgoal' | 'feature' | 'element' | 'microtask'

// ---------------------------------------------------------------------------
// Task Types
// ---------------------------------------------------------------------------

/** Category of work for a task. */
export type TaskCategory =
  | 'schema'     // Database schema, migrations
  | 'api'        // API endpoints, services
  | 'ui'         // UI components, screens
  | 'test'       // Tests, fixtures
  | 'doc'        // Documentation
  | 'config'     // Configuration, settings
  | 'migration'  // Data migrations
  | 'integration' // External integrations
  | 'refactor'   // Code cleanup, restructuring
  | 'security'   // Security hardening
  | 'perf'       // Performance optimization
  | 'other'      // Anything else

/** Effort estimate for a task. */
export type Effort = 'tiny' | 'small' | 'medium' | 'large' | 'epic'

/** Status of a task. */
export type TaskStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'blocked'
  | 'skipped'
  | 'cancelled'

/** Priority level. */
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'

// ---------------------------------------------------------------------------
// Traceability
// ---------------------------------------------------------------------------

/**
 * Full traceability chain for a task.
 * Every task traces back to a CR and forward to files/tests.
 */
export interface TraceabilityChain {
  /** Conversation Requirement ID. */
  readonly crId?: string
  /** Goal ID this task satisfies. */
  readonly goalId?: string
  /** Element ID this task creates or modifies. */
  readonly elementId?: string
  /** Task ID (self-referencing for convenience). */
  readonly taskId?: string
  /** File paths this task creates or modifies. */
  readonly fileIds?: readonly string[]
  /** Test file paths that validate this task. */
  readonly testFileIds?: readonly string[]
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

/** One decomposed task in the hierarchy. */
export interface Task {
  /** Unique task id (e.g. T-STU-001). */
  readonly id: string
  /** Short descriptive name. */
  readonly name: string
  /** Detailed description of what needs to be done. */
  readonly description: string
  /** Module this task belongs to. */
  readonly moduleId: string
  /** Hierarchy level. Default: 'microtask'. */
  readonly level: TaskLevel
  /** Parent task id (undefined = root). */
  readonly parentTaskId: string | undefined
  /** Child task ids (empty = leaf). */
  readonly childTaskIds: readonly string[]
  /** Category of work. */
  readonly category: TaskCategory
  /** Effort estimate. */
  readonly effort: Effort
  /** Priority level. */
  readonly priority: TaskPriority
  /** Current status. */
  status: TaskStatus
  /** Execution order (lower = earlier). */
  readonly order: number
  /** Task ids this task depends on. */
  readonly dependsOn: readonly string[]
  /** Task ids that depend on this task. */
  readonly dependedBy: readonly string[]
  /** Goal ids this task satisfies. */
  readonly goalIds: readonly string[]
  /** File paths this task creates or modifies. */
  readonly files: readonly string[]
  /** Element ids this task creates or modifies. */
  readonly elementIds: readonly string[]
  /** Traceability chain. */
  readonly traceability: TraceabilityChain
  /** Tags for filtering. */
  readonly tags: readonly string[]
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string
  /** ISO-8601 last update timestamp. */
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Issue found during task validation. */
export interface TaskIssue {
  /** Issue type. */
  readonly type:
    | 'missing-dependency'
    | 'circular-dependency'
    | 'unblocked-loop'
    | 'duplicate-id'
    | 'orphan-task'
    | 'high-effort-no-breakdown'
    | 'missing-goal'
    | 'empty-module'
    | 'non-microtask-no-children'
    | 'microtask-has-children'
    | 'broken-traceability'
  /** Severity. */
  readonly severity: 'error' | 'warning' | 'info'
  /** Human-readable message. */
  readonly message: string
  /** Involved task ids. */
  readonly involved: readonly string[]
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

/** Summary statistics for a task set. */
export interface TaskSummary {
  /** Total tasks. */
  readonly total: number
  /** Tasks by status. */
  readonly byStatus: Record<TaskStatus, number>
  /** Tasks by category. */
  readonly byCategory: Record<TaskCategory, number>
  /** Tasks by effort. */
  readonly byEffort: Record<Effort, number>
  /** Tasks by priority. */
  readonly byPriority: Record<TaskPriority, number>
  /** Tasks by level. */
  readonly byLevel: Record<TaskLevel, number>
  /** Total estimated effort (weighted score). */
  readonly totalEffortScore: number
  /** Number of blocked tasks. */
  readonly blockedCount: number
  /** Critical path task count. */
  readonly criticalPathCount: number
  /** Maximum hierarchy depth. */
  readonly hierarchyDepth: number
  /** Number of traceable tasks (have traceability chain). */
  readonly traceableCount: number
}

// ---------------------------------------------------------------------------
// Tree
// ---------------------------------------------------------------------------

/** Hierarchical tree node for display/query. */
export interface TaskTreeNode {
  /** Task id. */
  readonly id: string
  /** Task name. */
  readonly name: string
  /** Hierarchy level. */
  readonly level: TaskLevel
  /** Status. */
  readonly status: TaskStatus
  /** Category. */
  readonly category: TaskCategory
  /** Children nodes. */
  readonly children: readonly TaskTreeNode[]
}

// ---------------------------------------------------------------------------
// Engine Output
// ---------------------------------------------------------------------------

/** Full output of task decomposition. */
export interface TaskDecompositionResult {
  /** Module id. */
  readonly moduleId: string
  /** All tasks. */
  readonly tasks: readonly Task[]
  /** Execution order (task ids). */
  readonly executionOrder: readonly string[]
  /** Validation issues. */
  readonly issues: readonly TaskIssue[]
  /** Summary statistics. */
  readonly summary: TaskSummary
  /** ISO-8601 generation timestamp. */
  readonly generatedAt: string
}
