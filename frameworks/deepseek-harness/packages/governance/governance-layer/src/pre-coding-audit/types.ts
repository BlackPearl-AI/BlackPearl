/**
 * PHASE 13 — Pre-Coding Audit Types
 *
 * Final quality gate before implementation begins.
 * Coding से पहले verify:
 *   - Requirement clear?
 *   - Blueprint complete?
 *   - Files known?
 *   - Rules loaded?
 *   - Dependencies known?
 *   - Tests defined?
 *   - Conflict exists?
 *
 * सब PASS होने पर ही coding।
 */

// ---------------------------------------------------------------------------
// Audit Checks
// ---------------------------------------------------------------------------

/** Category of audit check. */
export type AuditCategory =
  | 'requirements'    // Requirements captured and clear
  | 'goals'           // Goal breakdown exists and is valid
  | 'blueprint'       // Blueprint completeness (not just existence)
  | 'files'           // File/folder blueprint exists
  | 'elements'        // Element registry is populated
  | 'rules'           // Rule governance is in place
  | 'dependencies'    // Dependency graph is mapped
  | 'tasks'           // Tasks are decomposed
  | 'tests'           // Test tasks are defined
  | 'conflicts'       // Conflict detection
  | 'consistency'     // Cross-phase consistency
  | 'coverage'        // Goal-to-task coverage

/** Status of a single audit check. */
export type AuditCheckStatus = 'pass' | 'fail' | 'warn' | 'skip'

/** Severity of a check for verdict computation. */
export type CheckSeverity = 'critical' | 'important' | 'advisory'

/** One audit check result. */
export interface AuditCheck {
  /** Unique check id (e.g. PC-GOAL-001). */
  readonly id: string
  /** Human-readable check name. */
  readonly name: string
  /** Check category. */
  readonly category: AuditCategory
  /** Check result status. */
  readonly status: AuditCheckStatus
  /** Severity for verdict computation. */
  readonly severity: CheckSeverity
  /** Human-readable reason/description. */
  readonly message: string
  /** Related phase (if applicable). */
  readonly phase?: string
}

// ---------------------------------------------------------------------------
// Audit Result
// ---------------------------------------------------------------------------

/** Overall audit verdict. */
export type AuditVerdict = 'pass' | 'fail' | 'conditional'

/** Full audit result for a module. */
export interface PreCodingAuditResult {
  /** Module id being audited. */
  readonly moduleId: string
  /** Overall verdict. */
  readonly verdict: AuditVerdict
  /** All check results. */
  readonly checks: readonly AuditCheck[]
  /** Number of passes. */
  readonly passCount: number
  /** Number of failures. */
  readonly failCount: number
  /** Number of warnings. */
  readonly warnCount: number
  /** Number of skipped. */
  readonly skipCount: number
  /** Critical failures (must resolve before coding). */
  readonly criticalFailures: readonly string[]
  /** Blocking issues (failures that must be resolved). */
  readonly blockingIssues: readonly string[]
  /** Non-blocking suggestions (warnings). */
  readonly suggestions: readonly string[]
  /** Readiness score (0-100). */
  readonly readinessScore: number
  /** ISO-8601 audit timestamp. */
  readonly auditedAt: string
}

// ---------------------------------------------------------------------------
// Audit Configuration
// ---------------------------------------------------------------------------

/** Configuration for which checks to run. */
export interface AuditConfig {
  /** Module id to audit. */
  readonly moduleId: string

  // -- Requirements --------------------------------------------------------
  /** Whether requirements are captured (CR ledger has entries). */
  readonly hasRequirements: boolean
  /** Number of captured requirements. */
  readonly requirementCount: number

  // -- Goals ---------------------------------------------------------------
  /** Whether goals phase is complete. */
  readonly hasGoals: boolean
  /** Number of goals. */
  readonly goalCount: number

  // -- Blueprint -----------------------------------------------------------
  /** Whether file blueprint exists. */
  readonly hasFileBlueprint: boolean
  /** Blueprint completeness score (0-100). */
  readonly blueprintCompleteness: number

  // -- Elements ------------------------------------------------------------
  /** Number of registered elements. */
  readonly elementCount: number

  // -- Rules ---------------------------------------------------------------
  /** Number of active rules. */
  readonly ruleCount: number

  // -- Dependencies --------------------------------------------------------
  /** Number of dependency edges. */
  readonly dependencyEdgeCount: number
  /** Whether dependency graph has cycles. */
  readonly hasDependencyCycles: number
  /** Number of dependency conflicts. */
  readonly dependencyConflictCount: number

  // -- Tasks ---------------------------------------------------------------
  /** Number of tasks decomposed. */
  readonly taskCount: number
  /** Number of tasks with no goals. */
  readonly tasksWithoutGoals: number
  /** Number of tasks with test category. */
  readonly testTaskCount: number
  /** Whether task graph has cycles. */
  readonly hasTaskCycles: boolean

  // -- Coverage ------------------------------------------------------------
  /** Whether all goals have tasks. */
  readonly allGoalsHaveTasks: boolean

  // -- Conflicts -----------------------------------------------------------
  /** Number of detected conflicts (naming, dependency, rule). */
  readonly conflictCount: number
}
