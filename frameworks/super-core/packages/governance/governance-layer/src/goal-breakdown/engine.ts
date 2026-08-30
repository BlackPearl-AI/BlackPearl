/**
 * Goal Breakdown Engine.
 *
 * Manages the 8-level hierarchical decomposition:
 *   MASTER GOAL → GOAL → MODULE → SUB-MODULE → FEATURE → WORKFLOW → ELEMENT → TASK
 *
 * Provides tree construction, traversal, querying, and summary statistics.
 *
 * @module @deepseek-ai/dsh-governance-layer/goal-breakdown/engine
 */

import type {
  AddNodeInput,
  AddNodeResult,
  BreakdownLevel,
  BreakdownNode,
  BreakdownQuery,
  BreakdownSummary,
  BreakdownTree,
  DepthNode,
  NodeStatus,
} from './types.ts'
import { LEVEL_ORDER, LEVEL_LABELS, LEVEL_ICONS, STATUS_LABELS } from './types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the depth (index) of a level. */
function levelDepth(level: BreakdownLevel): number {
  return LEVEL_ORDER.indexOf(level)
}

/** Check if `child` is a valid child of `parent` (one level deeper). */
function isValidChildLevel(parent: BreakdownLevel, child: BreakdownLevel): boolean {
  return levelDepth(child) === levelDepth(parent) + 1
}

/** Effort score: small=1, medium=2, large=3. */
function effortScore(e: 'small' | 'medium' | 'large'): number {
  return e === 'small' ? 1 : e === 'medium' ? 2 : 3
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * The Goal Breakdown Engine.
 *
 * Responsibilities:
 * 1. Create the root master-goal node.
 * 2. Add child nodes at each level with validation.
 * 3. Traverse the tree (DFS, BFS, depth-first with levels).
 * 4. Query by level, status, tag, parent, or search.
 * 5. Update node status.
 * 6. Compute summary statistics and critical path.
 */
export class GoalBreakdownEngine {
  private tree: BreakdownTree
  private nodeMap: Map<string, BreakdownNode>
  private seqCounters: Map<BreakdownLevel, number>

  constructor(masterGoalId: string, masterGoalName: string, masterGoalDescription: string) {
    const now = new Date().toISOString()
    const rootNode: BreakdownNode = {
      id: masterGoalId,
      level: 'master-goal',
      name: masterGoalName,
      description: masterGoalDescription,
      childrenIds: [],
      status: 'active',
      priority: 1,
      effort: 'large',
      tags: [],
      dependencies: [],
      acceptanceCriteria: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    }

    this.nodeMap = new Map()
    this.nodeMap.set(rootNode.id, rootNode)
    this.seqCounters = new Map()
    for (const level of LEVEL_ORDER) {
      this.seqCounters.set(level, 0)
    }

    this.tree = {
      rootId: rootNode.id,
      nodes: { [rootNode.id]: rootNode },
      totalNodes: 1,
      byLevel: this.computeByLevel(),
      byStatus: this.computeByStatus(),
      createdAt: now,
      updatedAt: now,
    }
  }

  /** Get the tree snapshot. */
  getTree(): BreakdownTree {
    return { ...this.tree, nodes: Object.fromEntries(this.nodeMap) }
  }

  /** Get a node by ID. */
  getNode(id: string): BreakdownNode | undefined {
    return this.nodeMap.get(id)
  }

  /** Get the root node. */
  getRoot(): BreakdownNode {
    return this.nodeMap.get(this.tree.rootId)!
  }

  /**
   * Add a new node to the tree.
   *
   * Validates:
   * - Level hierarchy (must be one level deeper than parent).
   * - Parent exists.
   * - Parent is not a leaf (task level cannot have children).
   * - Dependencies exist.
   */
  addNode(input: AddNodeInput): AddNodeResult {
    // Master goal is the root; cannot add another.
    if (input.level === 'master-goal') {
      throw new Error('Cannot add a second master-goal node. The root already exists.')
    }

    // Parent is required for non-root nodes.
    if (!input.parentId) {
      throw new Error(`Parent ID is required for level "${input.level}"`)
    }

    const parent = this.nodeMap.get(input.parentId)
    if (!parent) {
      throw new Error(`Parent node "${input.parentId}" not found`)
    }

    // Validate level hierarchy.
    if (!isValidChildLevel(parent.level, input.level)) {
      throw new Error(
        `Invalid level hierarchy: "${input.level}" cannot be a child of "${parent.level}" `
        + `(expected "${LEVEL_ORDER[levelDepth(parent.level) + 1] ?? 'none'}")`,
      )
    }

    // Validate parent is not a leaf.
    if (parent.level === 'task') {
      throw new Error(`Task nodes cannot have children`)
    }

    // Validate dependencies exist.
    for (const depId of input.dependencies ?? []) {
      if (!this.nodeMap.has(depId)) {
        throw new Error(`Dependency node "${depId}" not found`)
      }
    }

    // Generate ID.
    const seq = (this.seqCounters.get(input.level) ?? 0) + 1
    this.seqCounters.set(input.level, seq)
    const id = `${parent.id}-${input.level.charAt(0).toUpperCase()}${seq}`

    const now = new Date().toISOString()
    const node: BreakdownNode = {
      id,
      level: input.level,
      name: input.name,
      description: input.description,
      parentId: input.parentId,
      childrenIds: [],
      status: 'pending',
      priority: input.priority ?? 3,
      effort: input.effort ?? 'medium',
      tags: input.tags ?? [],
      dependencies: input.dependencies ?? [],
      acceptanceCriteria: input.acceptanceCriteria ?? [],
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    }

    // Add to map and update parent.
    this.nodeMap.set(id, node)
    const updatedParent: BreakdownNode = {
      ...parent,
      childrenIds: [...parent.childrenIds, id],
      updatedAt: now,
    }
    this.nodeMap.set(parent.id, updatedParent)

    // Update root nodes record.
    this.tree = {
      ...this.tree,
      nodes: Object.fromEntries(this.nodeMap),
      totalNodes: this.nodeMap.size,
      byLevel: this.computeByLevel(),
      byStatus: this.computeByStatus(),
      updatedAt: now,
    }

    return {
      node,
      message: `${LEVEL_ICONS[input.level]} Node "${id}" added at ${LEVEL_LABELS[input.level]}`,
    }
  }

  /**
   * Update the status of a node.
   *
   * Validates that the status transition is allowed:
   * - cancelled and completed are terminal.
   * - blocked → any is allowed.
   * - pending → active, deferred, cancelled.
   * - active → completed, blocked, deferred, cancelled.
   * - deferred → pending, active, cancelled.
   */
  updateStatus(nodeId: string, status: NodeStatus): BreakdownNode {
    const node = this.nodeMap.get(nodeId)
    if (!node) {
      throw new Error(`Node "${nodeId}" not found`)
    }

    // Validate transition.
    if (node.status === 'completed' || node.status === 'cancelled') {
      throw new Error(`Cannot change status of "${node.status}" node "${nodeId}"`)
    }

    const allowed: Record<NodeStatus, readonly NodeStatus[]> = {
      pending: ['active', 'deferred', 'cancelled'],
      active: ['completed', 'blocked', 'deferred', 'cancelled'],
      blocked: ['pending', 'active', 'deferred', 'cancelled'],
      deferred: ['pending', 'active', 'cancelled'],
      completed: [],
      cancelled: [],
    }

    if (!allowed[node.status]!.includes(status)) {
      throw new Error(
        `Invalid status transition: "${node.status}" → "${status}" for node "${nodeId}"`,
      )
    }

    const now = new Date().toISOString()
    const updated: BreakdownNode = { ...node, status, updatedAt: now }
    this.nodeMap.set(nodeId, updated)

    this.tree = {
      ...this.tree,
      nodes: Object.fromEntries(this.nodeMap),
      byStatus: this.computeByStatus(),
      updatedAt: now,
    }

    return updated
  }

  /**
   * Get children of a node.
   */
  getChildren(nodeId: string): readonly BreakdownNode[] {
    const node = this.nodeMap.get(nodeId)
    if (!node) return []
    return node.childrenIds.map(id => this.nodeMap.get(id)!).filter(Boolean)
  }

  /**
   * Get all descendants of a node (recursive).
   */
  getDescendants(nodeId: string): readonly BreakdownNode[] {
    const result: BreakdownNode[] = []
    const stack = [nodeId]
    while (stack.length > 0) {
      const current = stack.pop()!
      const children = this.getChildren(current)
      for (const child of children) {
        result.push(child)
        stack.push(child.id)
      }
    }
    return result
  }

  /**
   * Get the path from root to a node.
   */
  getPath(nodeId: string): readonly BreakdownNode[] {
    const path: BreakdownNode[] = []
    let current = this.nodeMap.get(nodeId)
    while (current) {
      path.unshift(current)
      current = current.parentId ? this.nodeMap.get(current.parentId) : undefined
    }
    return path
  }

  /**
   * Traverse the tree depth-first, yielding nodes with their depth.
   */
  traverseDFS(nodeId?: string): readonly DepthNode[] {
    const root = nodeId ?? this.tree.rootId
    const result: DepthNode[] = []
    const stack: { id: string; depth: number }[] = [{ id: root, depth: 0 }]

    while (stack.length > 0) {
      const { id, depth } = stack.pop()!
      const node = this.nodeMap.get(id)
      if (!node) continue
      result.push({ node, depth })

      // Push children in reverse order so leftmost is processed first.
      const children = [...node.childrenIds].reverse()
      for (const childId of children) {
        stack.push({ id: childId, depth: depth + 1 })
      }
    }

    return result
  }

  /**
   * Query nodes by filter criteria.
   */
  query(filter: BreakdownQuery): readonly BreakdownNode[] {
    let results = Array.from(this.nodeMap.values())

    if (filter.level) {
      results = results.filter(n => n.level === filter.level)
    }
    if (filter.status) {
      results = results.filter(n => n.status === filter.status)
    }
    if (filter.tag) {
      results = results.filter(n => n.tags.includes(filter.tag!))
    }
    if (filter.parentId) {
      results = results.filter(n => n.parentId === filter.parentId)
    }
    if (filter.search) {
      const s = filter.search.toLowerCase()
      results = results.filter(n =>
        n.name.toLowerCase().includes(s) || n.description.toLowerCase().includes(s),
      )
    }
    if (filter.limit !== undefined && filter.limit > 0) {
      results = results.slice(0, filter.limit)
    }

    return results
  }

  /**
   * Get summary statistics.
   */
  getSummary(): BreakdownSummary {
    const nodes = Array.from(this.nodeMap.values())
    let totalEffort = 0
    for (const n of nodes) {
      totalEffort += effortScore(n.effort)
    }

    return {
      totalNodes: this.nodeMap.size,
      byLevel: this.computeByLevel(),
      byStatus: this.computeByStatus(),
      effortScore: totalEffort,
      criticalPathLength: this.computeCriticalPath(),
    }
  }

  /**
   * Generate the breakdown as a formatted markdown string.
   */
  toMarkdown(): string {
    const lines: string[] = []
    const summary = this.getSummary()

    lines.push('## Goal Breakdown Tree')
    lines.push('')
    lines.push(`**Total Nodes:** ${summary.totalNodes} | **Effort Score:** ${summary.effortScore} | **Critical Path:** ${summary.criticalPathLength}`)
    lines.push('')

    // DFS traversal with indentation.
    const traversal = this.traverseDFS()
    for (const { node, depth } of traversal) {
      const indent = '  '.repeat(depth)
      const icon = LEVEL_ICONS[node.level]
      const status = STATUS_LABELS[node.status]
      lines.push(`${indent}${icon} **${node.name}** (${node.id}) — ${status}`)

      if (node.description) {
        lines.push(`${indent}  ${node.description}`)
      }
      if (node.childrenIds.length > 0) {
        lines.push(`${indent}  Children: ${node.childrenIds.length}`)
      }
    }

    return lines.join('\n')
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private computeByLevel(): Record<BreakdownLevel, number> {
    const counts: Record<string, number> = {}
    for (const level of LEVEL_ORDER) {
      counts[level] = 0
    }
    for (const node of this.nodeMap.values()) {
      counts[node.level] = (counts[node.level] ?? 0) + 1
    }
    return counts as Record<BreakdownLevel, number>
  }

  private computeByStatus(): Record<NodeStatus, number> {
    const counts: Record<string, number> = {
      pending: 0, active: 0, completed: 0, blocked: 0, deferred: 0, cancelled: 0,
    }
    for (const node of this.nodeMap.values()) {
      counts[node.status] = (counts[node.status] ?? 0) + 1
    }
    return counts as Record<NodeStatus, number>
  }

  /**
   * Compute the critical path length (longest chain from root to any leaf).
   */
  private computeCriticalPath(): number {
    let maxDepth = 0
    const stack: { id: string; depth: number }[] = [{ id: this.tree.rootId, depth: 0 }]

    while (stack.length > 0) {
      const { id, depth } = stack.pop()!
      const node = this.nodeMap.get(id)
      if (!node) continue

      if (node.childrenIds.length === 0) {
        maxDepth = Math.max(maxDepth, depth)
      }

      for (const childId of node.childrenIds) {
        stack.push({ id: childId, depth: depth + 1 })
      }
    }

    return maxDepth
  }
}
