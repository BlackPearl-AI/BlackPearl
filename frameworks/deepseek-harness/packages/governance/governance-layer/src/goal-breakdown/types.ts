/**
 * Types for the Goal Breakdown Engine (PHASE 04).
 *
 * Implements the 8-level hierarchical decomposition:
 *
 *   MASTER GOAL
 *     └─ GOAL
 *         └─ MODULE
 *             └─ SUB-MODULE
 *                 └─ FEATURE
 *                     └─ WORKFLOW
 *                         └─ ELEMENT
 *                             └─ TASK
 *
 * Each node in the tree carries a unique ID, a level, parent/children
 * references, status, and descriptive metadata.
 *
 * @module @deepseek-ai/dsh-governance-layer/goal-breakdown/types
 */

// ---------------------------------------------------------------------------
// Breakdown Levels
// ---------------------------------------------------------------------------

/** The 8 decomposition levels, ordered from broadest to most granular. */
export type BreakdownLevel =
  | 'master-goal'
  | 'goal'
  | 'module'
  | 'sub-module'
  | 'feature'
  | 'workflow'
  | 'element'
  | 'task'

/** Canonical level ordering (index = depth, 0 = master-goal). */
export const LEVEL_ORDER: readonly BreakdownLevel[] = [
  'master-goal',
  'goal',
  'module',
  'sub-module',
  'feature',
  'workflow',
  'element',
  'task',
]

/** Human-readable labels for each level (Hindi + English). */
export const LEVEL_LABELS: Record<BreakdownLevel, string> = {
  'master-goal': 'MASTER GOAL — मुख्य लक्ष्य',
  'goal': 'GOAL — लक्ष्य',
  'module': 'MODULE — मॉड्यूल',
  'sub-module': 'SUB-MODULE — उप-मॉड्यूल',
  'feature': 'FEATURE — विशेषता',
  'workflow': 'WORKFLOW — कार्यप्रवाह',
  'element': 'ELEMENT — तत्व',
  'task': 'TASK — कार्य',
}

/** Short icons for each level. */
export const LEVEL_ICONS: Record<BreakdownLevel, string> = {
  'master-goal': '🎯',
  'goal': '🏁',
  'module': '📦',
  'sub-module': '📂',
  'feature': '✨',
  'workflow': '🔄',
  'element': '⚙️',
  'task': '📝',
}

// ---------------------------------------------------------------------------
// Node Status
// ---------------------------------------------------------------------------

/** Status of a breakdown node. */
export type NodeStatus =
  | 'pending'      // Not yet started
  | 'active'       // Currently being worked on
  | 'completed'    // Done
  | 'blocked'      // Blocked by dependency
  | 'deferred'     // Deferred to later
  | 'cancelled'    // No longer needed

/** Human-readable labels for node statuses. */
export const STATUS_LABELS: Record<NodeStatus, string> = {
  pending: '⏳ Pending',
  active: '🔄 Active',
  completed: '✅ Completed',
  blocked: '🚫 Blocked',
  deferred: '⏭️ Deferred',
  cancelled: '❌ Cancelled',
}

// ---------------------------------------------------------------------------
// Breakdown Node
// ---------------------------------------------------------------------------

/**
 * A single node in the breakdown tree.
 *
 * Nodes form a tree via `parentId` and `childrenIds`. The root node
 * is always `master-goal` level.
 */
export interface BreakdownNode {
  /** Unique identifier for this node (e.g., "MG-001", "G-001-M1", "T-001-M1-S1-F1-W1-E1-01"). */
  readonly id: string
  /** The decomposition level. */
  readonly level: BreakdownLevel
  /** Human-readable name/title. */
  readonly name: string
  /** Detailed description. */
  readonly description: string
  /** Parent node ID (undefined for master-goal). */
  readonly parentId?: string
  /** Child node IDs (ordered). */
  readonly childrenIds: readonly string[]
  /** Current status. */
  readonly status: NodeStatus
  /** Priority (1 = highest, 5 = lowest). */
  readonly priority: number
  /** Estimated effort: small (< 1h), medium (1-4h), large (4h+). */
  readonly effort: 'small' | 'medium' | 'large'
  /** Tags for categorization. */
  readonly tags: readonly string[]
  /** Dependencies: IDs of nodes that must complete before this one. */
  readonly dependencies: readonly string[]
  /** Acceptance criteria for this node. */
  readonly acceptanceCriteria: readonly string[]
  /** Additional metadata. */
  readonly metadata: Readonly<Record<string, string>>
  /** When the node was created. */
  readonly createdAt: string
  /** When the node was last updated. */
  readonly updatedAt: string
}

// ---------------------------------------------------------------------------
// Breakdown Tree
// ---------------------------------------------------------------------------

/**
 * The complete breakdown tree.
 *
 * Maintains a flat map of all nodes plus the root ID for traversal.
 */
export interface BreakdownTree {
  /** The master goal ID (root of the tree). */
  readonly rootId: string
  /** All nodes indexed by ID. */
  readonly nodes: Readonly<Record<string, BreakdownNode>>
  /** Total node count. */
  readonly totalNodes: number
  /** Breakdown by level. */
  readonly byLevel: Readonly<Record<BreakdownLevel, number>>
  /** Breakdown by status. */
  readonly byStatus: Readonly<Record<NodeStatus, number>>
  /** When the tree was created. */
  readonly createdAt: string
  /** When the tree was last updated. */
  readonly updatedAt: string
}

// ---------------------------------------------------------------------------
// Add Node Input
// ---------------------------------------------------------------------------

/**
 * Input for adding a new node to the breakdown tree.
 */
export interface AddNodeInput {
  /** The level of the new node. */
  readonly level: BreakdownLevel
  /** Human-readable name. */
  readonly name: string
  /** Detailed description. */
  readonly description: string
  /** Parent node ID. Required for all levels except master-goal. */
  readonly parentId?: string
  /** Priority (1-5, default 3). */
  readonly priority?: number
  /** Estimated effort (default 'medium'). */
  readonly effort?: 'small' | 'medium' | 'large'
  /** Tags. */
  readonly tags?: readonly string[]
  /** Dependencies (node IDs). */
  readonly dependencies?: readonly string[]
  /** Acceptance criteria. */
  readonly acceptanceCriteria?: readonly string[]
  /** Additional metadata. */
  readonly metadata?: Readonly<Record<string, string>>
}

/**
 * Result of adding a new node.
 */
export interface AddNodeResult {
  /** The newly created node. */
  readonly node: BreakdownNode
  /** Summary message. */
  readonly message: string
}

// ---------------------------------------------------------------------------
// Query Types
// ---------------------------------------------------------------------------

/**
 * Filter criteria for querying the breakdown tree.
 */
export interface BreakdownQuery {
  /** Filter by level. */
  readonly level?: BreakdownLevel
  /** Filter by status. */
  readonly status?: NodeStatus
  /** Filter by tag. */
  readonly tag?: string
  /** Filter by parent ID. */
  readonly parentId?: string
  /** Search name/description by substring. */
  readonly search?: string
  /** Maximum nodes to return. */
  readonly limit?: number
}

/**
 * Summary statistics for the breakdown tree.
 */
export interface BreakdownSummary {
  /** Total nodes. */
  readonly totalNodes: number
  /** Breakdown by level. */
  readonly byLevel: Readonly<Record<BreakdownLevel, number>>
  /** Breakdown by status. */
  readonly byStatus: Readonly<Record<NodeStatus, number>>
  /** Total estimated effort (sum of small=1, medium=2, large=3). */
  readonly effortScore: number
  /** Critical path length (longest dependency chain). */
  readonly criticalPathLength: number
}

// ---------------------------------------------------------------------------
// Tree Traversal Result
// ---------------------------------------------------------------------------

/**
 * A node with its depth in the tree (for indented display).
 */
export interface DepthNode {
  readonly node: BreakdownNode
  readonly depth: number
}
