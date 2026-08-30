/**
 * Types for the Master Goal Gate: hierarchical goal decomposition,
 * dependency graph, and module lock resolution.
 *
 * @module @deepseek-ai/dsh-governance-layer/master-goal-gate/types
 */

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/**
 * User-provided module definitions. Each module declares its name,
 * owning domain, and dependency list (by module id).
 */
export interface ModuleInput {
  /** Unique module identifier. */
  readonly id: string
  /** Human-readable module name. */
  readonly name: string
  /** Domain this module belongs to. */
  readonly domain: string
  /** Module ids this module depends on (must be built first). */
  readonly dependsOn?: readonly string[]
  /** Optional priority weight for critical-path scoring (default 1). */
  readonly priority?: number
}

/**
 * Input specification for goal decomposition.
 */
export interface GoalDecompositionInput {
  /** The high-level objective. */
  readonly objective: string
  /** Optional human-readable goal id (auto-generated if omitted). */
  readonly goalId?: string
  /** Module definitions with dependency declarations. */
  readonly modules: readonly ModuleInput[]
}

// ---------------------------------------------------------------------------
// Output: Hierarchical Breakdown
// ---------------------------------------------------------------------------

/**
 * Lock status of a module.
 *
 * - `active`: All dependencies satisfied — this module can be worked on now.
 * - `locked`: One or more dependencies are not yet completed.
 * - `completed`: The module has been verified and finished.
 * - `skipped`: The module has been intentionally bypassed.
 */
export type ModuleStatus = 'active' | 'locked' | 'completed' | 'skipped'

/**
 * One decomposed module in the hierarchy.
 */
export interface ModuleDescriptor {
  /** Unique module id. */
  readonly id: string
  /** Human-readable module name. */
  readonly name: string
  /** Domain this module belongs to. */
  readonly domain: string
  /** Module ids this module depends on. */
  readonly dependsOn: readonly string[]
  /** Module ids that depend on this module. */
  readonly dependents: readonly string[]
  /** Current lock status. */
  readonly status: ModuleStatus
  /** Topological sort order (lower = earlier in dependency order). */
  readonly order: number
  /** Critical-path score: number of downstream modules reachable. */
  readonly criticality: number
}

/**
 * A product domain containing one or more modules.
 */
export interface ProductDomain {
  /** Domain name (e.g. "Student", "Fees", "Attendance"). */
  readonly name: string
  /** Module ids belonging to this domain. */
  readonly moduleIds: readonly string[]
}

/**
 * The dependency graph as an adjacency list.
 */
export interface DependencyGraph {
  /** Forward edges: module → [modules it depends on]. */
  readonly forward: Readonly<Record<string, readonly string[]>>
  /** Reverse edges: module → [modules that depend on it]. */
  readonly reverse: Readonly<Record<string, readonly string[]>>
}

/**
 * The full hierarchical decomposition of a master goal.
 */
export interface MasterGoalBreakdown {
  /** The high-level objective. */
  readonly objective: string
  /** Unique goal id. */
  readonly goalId: string
  /** Decomposed product domains. */
  readonly domains: readonly ProductDomain[]
  /** Module descriptors keyed by module id. */
  readonly moduleMap: Readonly<Record<string, ModuleDescriptor>>
  /** The dependency graph. */
  readonly graph: DependencyGraph
  /** Topological order: module ids from root (no deps) to leaf. */
  readonly topologicalOrder: readonly string[]
  /** Critical path: module ids that unlock the most downstream work, sorted by criticality descending. */
  readonly criticalPath: readonly string[]
  /** Modules currently in `active` status (work can begin). */
  readonly activeModules: readonly string[]
  /** Modules currently in `locked` status (blocked by dependencies). */
  readonly lockedModules: readonly string[]
  /** ISO-8601 decomposition timestamp. */
  readonly decomposedAt: string
}

// ---------------------------------------------------------------------------
// Prompt Rendering
// ---------------------------------------------------------------------------

/**
 * Compact status text for the prompt section.
 */
export interface ModuleStatusText {
  /** Formatted status lines for each module. */
  readonly lines: readonly string[]
  /** Summary line: "N active, M locked, K completed". */
  readonly summary: string
}
