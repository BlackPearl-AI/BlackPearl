/**
 * PHASE 11 — Dependency Mapping Types
 *
 * Builds a comprehensive dependency graph connecting modules, goals, files,
 * and elements. Enables impact analysis, execution ordering, and risk assessment.
 */

// ---------------------------------------------------------------------------
// Node Types
// ---------------------------------------------------------------------------

/** Types of nodes in the dependency graph. */
export type DepNodeKind =
  | 'module'
  | 'goal'
  | 'file'
  | 'element'
  | 'rule'
  | 'external-package'

/** Module ID prefix convention: 2-4 uppercase letters, hyphen-separated. */
export const MODULE_ID_PATTERN = /^[A-Z]{2,4}$/

/** Valid module ID prefixes for School ERP. */
export const SCHOOL_ERP_PREFIXES = [
  'STU', // Student Master
  'ENR', // Enrollment
  'FEE', // Fees / Accounts
  'ATT', // Attendance
  'EXM', // Examinations
  'DOC', // Documents
  'INV', // Inventory
  'RPT', // Reports
  'USR', // Users / Auth
  'CFG', // Configuration
] as const

/** One node in the dependency graph. */
export interface DepNode {
  /** Unique node identifier (e.g. MOD-STU, MOD-ENR). */
  readonly id: string
  /** Human-readable label. */
  readonly label: string
  /** Node kind. */
  readonly kind: DepNodeKind
  /** Module this node belongs to (if any). */
  readonly moduleId?: string
  /** Person or role responsible for building this module. */
  readonly owner?: string
  /** Person or role responsible for reviewing this module. */
  readonly reviewer?: string
  /** Whether ownership is mandatory for module nodes. */
  readonly ownershipConfirmed?: boolean
  /** Freeform metadata. */
  readonly meta?: Record<string, string>
}

// ---------------------------------------------------------------------------
// Edge Types
// ---------------------------------------------------------------------------

/** Relationship type between two nodes. */
export type DepEdgeKind =
  | 'requires'      // Hard: A needs B to function
  | 'soft-requires' // Soft: A benefits from B but can work without
  | 'conflicts'     // A and B cannot coexist
  | 'replaces'      // A supersedes B
  | 'data-flow'     // A sends data to B
  | 'calls'         // A invokes B

/** One directed edge in the dependency graph. */
export interface DepEdge {
  /** Source node id. */
  readonly from: string
  /** Target node id. */
  readonly to: string
  /** Relationship kind. */
  readonly kind: DepEdgeKind
  /** Human-readable reason for the dependency. */
  readonly reason?: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Severity of a graph issue. */
export type GraphIssueSeverity = 'error' | 'warning' | 'info'

/** One issue found during graph validation. */
export interface GraphIssue {
  /** Issue type. */
  readonly type:
    | 'cycle'
    | 'missing-target'
    | 'orphan-node'
    | 'self-dependency'
    | 'conflict-pair'
    | 'deep-chain'
    | 'dangling-edge'
    | 'missing-ownership'
    | 'invalid-module-id'
  /** Severity level. */
  readonly severity: GraphIssueSeverity
  /** Human-readable description. */
  readonly message: string
  /** Involved node or edge ids. */
  readonly involved: readonly string[]
}

// ---------------------------------------------------------------------------
// Impact Analysis
// ---------------------------------------------------------------------------

/** Result of impact analysis for a single node. */
export interface ImpactResult {
  /** Node being analyzed. */
  readonly nodeId: string
  /** All nodes directly affected (1 hop). */
  readonly directImpact: readonly string[]
  /** All nodes transitively affected (2+ hops). */
  readonly transitiveImpact: readonly string[]
  /** Total affected count (direct + transitive). */
  readonly totalAffected: number
  /** Critical path through the impact chain. */
  readonly criticalPath: readonly string[]
}

// ---------------------------------------------------------------------------
// Health / Summary
// ---------------------------------------------------------------------------

/** Overall graph health report. */
export interface GraphHealth {
  /** Whether the graph is healthy (no error-level issues). */
  readonly healthy: boolean
  /** Number of nodes by kind. */
  readonly nodeCounts: Record<DepNodeKind, number>
  /** Number of edges by kind. */
  readonly edgeCounts: Record<DepEdgeKind, number>
  /** Issues found. */
  readonly issues: readonly GraphIssue[]
  /** Number of connected components. */
  readonly components: number
  /** Longest dependency chain depth. */
  readonly maxDepth: number
  /** Fraction of module nodes with confirmed ownership (0-1). */
  readonly ownershipCoverage: number
}

// ---------------------------------------------------------------------------
// Engine Output
// ---------------------------------------------------------------------------

/** Full output of the dependency mapping engine. */
export interface DependencyMappingResult {
  /** All nodes. */
  readonly nodes: readonly DepNode[]
  /** All edges. */
  readonly edges: readonly DepEdge[]
  /** Validation issues. */
  readonly issues: readonly GraphIssue[]
  /** Impact results for each node (keyed by node id). */
  readonly impactMap: Readonly<Record<string, ImpactResult>>
  /** Topological execution order (node ids). */
  readonly executionOrder: readonly string[]
  /** Graph health summary. */
  readonly health: GraphHealth
  /** ISO-8601 timestamp when the mapping was generated. */
  readonly generatedAt: string
}
