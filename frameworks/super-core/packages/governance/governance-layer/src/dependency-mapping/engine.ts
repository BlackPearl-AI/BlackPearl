/**
 * PHASE 11 — Dependency Mapping Engine
 *
 * Builds and validates a dependency graph connecting modules, goals, files,
 * and elements. Provides impact analysis, topological ordering, cycle detection,
 * and health reporting.
 */

import type {
  DepNode,
  DepNodeKind,
  DepEdge,
  DepEdgeKind,
  GraphIssue,
  ImpactResult,
  GraphHealth,
  DependencyMappingResult,
} from './types.ts'
import { MODULE_ID_PATTERN } from './types.ts'

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class DependencyMappingEngine {
  private readonly nodes = new Map<string, DepNode>()
  private readonly edges: DepEdge[] = []
  private readonly adjacency = new Map<string, string[]>()
  private readonly reverseAdjacency = new Map<string, string[]>()

  // -- Node operations -----------------------------------------------------

  /** Add a node. Overwrites if same id. */
  addNode(node: DepNode): void {
    this.nodes.set(node.id, node)
    if (!this.adjacency.has(node.id)) this.adjacency.set(node.id, [])
    if (!this.reverseAdjacency.has(node.id)) this.reverseAdjacency.set(node.id, [])
  }

  /** Bulk-add nodes. */
  addNodes(nodes: readonly DepNode[]): void {
    for (const n of nodes) this.addNode(n)
  }

  /** Remove a node and all its edges. */
  removeNode(id: string): boolean {
    if (!this.nodes.has(id)) return false
    this.nodes.delete(id)
    // Remove edges from/to this node
    this.edges.splice(
      0,
      this.edges.length,
      ...this.edges.filter(e => e.from !== id && e.to !== id),
    )
    this.adjacency.delete(id)
    this.reverseAdjacency.delete(id)
    // Remove from adjacency lists
    for (const [, targets] of this.adjacency) {
      const idx = targets.indexOf(id)
      if (idx !== -1) targets.splice(idx, 1)
    }
    for (const [, sources] of this.reverseAdjacency) {
      const idx = sources.indexOf(id)
      if (idx !== -1) sources.splice(idx, 1)
    }
    return true
  }

  /** Get a node. */
  getNode(id: string): DepNode | undefined {
    return this.nodes.get(id)
  }

  /** Get all nodes. */
  getNodes(): readonly DepNode[] {
    return Array.from(this.nodes.values())
  }

  /** Get nodes filtered by kind. */
  getNodesByKind(kind: DepNodeKind): readonly DepNode[] {
    return this.getNodes().filter(n => n.kind === kind)
  }

  /** Get nodes in a specific module. */
  getNodesByModule(moduleId: string): readonly DepNode[] {
    return this.getNodes().filter(n => n.moduleId === moduleId)
  }

  /** Total node count. */
  get nodeCount(): number {
    return this.nodes.size
  }

  // -- Edge operations -----------------------------------------------------

  /** Add a directed edge. Creates implicit nodes if needed. */
  addEdge(edge: DepEdge): void {
    // Validate no self-dependency
    if (edge.from === edge.to) return

    // Ensure nodes exist (create placeholders if not)
    if (!this.nodes.has(edge.from)) {
      this.addNode({ id: edge.from, label: edge.from, kind: 'module' })
    }
    if (!this.nodes.has(edge.to)) {
      this.addNode({ id: edge.to, label: edge.to, kind: 'module' })
    }

    // Prevent duplicate edges
    const exists = this.edges.some(
      e => e.from === edge.from && e.to === edge.to && e.kind === edge.kind,
    )
    if (exists) return

    this.edges.push(edge)
    this.adjacency.get(edge.from)!.push(edge.to)
    this.reverseAdjacency.get(edge.to)!.push(edge.from)
  }

  /** Bulk-add edges. */
  addEdges(edges: readonly DepEdge[]): void {
    for (const e of edges) this.addEdge(e)
  }

  /** Remove a specific edge. */
  removeEdge(from: string, to: string, kind?: DepEdgeKind): boolean {
    const idx = this.edges.findIndex(
      e => e.from === from && e.to === to && (kind === undefined || e.kind === kind),
    )
    if (idx === -1) return false
    const removed = this.edges.splice(idx, 1)[0]
    if (!removed) return false
    const targets = this.adjacency.get(removed.from)
    if (targets) {
      const tIdx = targets.indexOf(removed.to)
      if (tIdx !== -1) targets.splice(tIdx, 1)
    }
    const sources = this.reverseAdjacency.get(removed.to)
    if (sources) {
      const sIdx = sources.indexOf(removed.from)
      if (sIdx !== -1) sources.splice(sIdx, 1)
    }
    return true
  }

  /** Get all outgoing targets for a node. */
  getOutgoing(id: string): readonly string[] {
    return this.adjacency.get(id) ?? []
  }

  /** Direct dependencies alias for getOutgoing. */
  getDirectDependencies(id: string): readonly string[] {
    return this.getOutgoing(id)
  }

  /** Get all incoming sources for a node. */
  getIncoming(id: string): readonly string[] {
    return this.reverseAdjacency.get(id) ?? []
  }

  /** Reverse dependencies alias for getIncoming. */
  getReverseDependencies(id: string): readonly string[] {
    return this.getIncoming(id)
  }

  /** Get edges from a node. */
  getEdgesFrom(id: string): readonly DepEdge[] {
    return this.edges.filter(e => e.from === id)
  }

  /** Get edges to a node. */
  getEdgesTo(id: string): readonly DepEdge[] {
    return this.edges.filter(e => e.to === id)
  }

  /** Get all edges. */
  getEdges(): readonly DepEdge[] {
    return this.edges
  }

  /** Total edge count. */
  get edgeCount(): number {
    return this.edges.length
  }

  // -- Graph algorithms ----------------------------------------------------

  /**
   * Detect strongly connected components using Tarjan's algorithm.
   * Returns array of SCCs, each being an array of node ids.
   */
  findSCCs(): readonly (readonly string[])[] {
    let index = 0
    const stack: string[] = []
    const indices = new Map<string, number>()
    const lowlinks = new Map<string, number>()
    const onStack = new Set<string>()
    const sccs: string[][] = []

    const strongconnect = (v: string) => {
      indices.set(v, index)
      lowlinks.set(v, index)
      index++
      stack.push(v)
      onStack.add(v)

      for (const w of this.adjacency.get(v) ?? []) {
        if (!indices.has(w)) {
          strongconnect(w)
          lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!))
        } else if (onStack.has(w)) {
          lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!))
        }
      }

      if (lowlinks.get(v) === indices.get(v)) {
        const scc: string[] = []
        let w: string
        do {
          w = stack.pop()!
          onStack.delete(w)
          scc.push(w)
        } while (w !== v)
        sccs.push(scc)
      }
    }

    for (const id of this.nodes.keys()) {
      if (!indices.has(id)) strongconnect(id)
    }

    return sccs
  }

  /** Find cycles (SCCs with more than one node). */
  findCycles(): readonly (readonly string[])[] {
    return this.findSCCs().filter(scc => scc.length > 1)
  }

  /**
   * Topological sort using Kahn's algorithm.
   * Returns execution order, or throws on cycle.
   */
  topologicalSort(): string[] {
    const inDegree = new Map<string, number>()
    for (const id of this.nodes.keys()) {
      inDegree.set(id, 0)
    }
    for (const e of this.edges) {
      if (e.kind !== 'conflicts' && e.kind !== 'replaces') {
        inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1)
      }
    }

    const queue: string[] = []
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id)
    }

    const order: string[] = []
    while (queue.length > 0) {
      const n = queue.shift()!
      order.push(n)
      for (const target of this.adjacency.get(n) ?? []) {
        const deg = inDegree.get(target)! - 1
        inDegree.set(target, deg)
        if (deg === 0) queue.push(target)
      }
    }

    if (order.length !== this.nodes.size) {
      const cycleNodes = Array.from(this.nodes.keys()).filter(
        id => !order.includes(id),
      )
      throw new Error(
        `Dependency cycle detected involving: ${cycleNodes.join(', ')}`,
      )
    }

    return order
  }

  /**
   * Compute downstream impact (BFS) for a node.
   * Returns all reachable nodes from the given start.
   */
  computeImpact(nodeId: string, maxDepth = 50): ImpactResult {
    const visited = new Set<string>()
    const directImpact: string[] = []
    const transitiveImpact: string[] = []
    const criticalPath: string[] = [nodeId]
    let depth = 0
    let frontier = [nodeId]
    visited.add(nodeId)

    while (frontier.length > 0 && depth < maxDepth) {
      const nextFrontier: string[] = []
      for (const current of frontier) {
        for (const target of this.adjacency.get(current) ?? []) {
          if (!visited.has(target)) {
            visited.add(target)
            if (depth === 0) {
              directImpact.push(target)
            } else {
              transitiveImpact.push(target)
            }
            if (criticalPath.length <= depth + 1) {
              criticalPath.push(target)
            }
            nextFrontier.push(target)
          }
        }
      }
      frontier = nextFrontier
      depth++
    }

    return {
      nodeId,
      directImpact,
      transitiveImpact,
      totalAffected: directImpact.length + transitiveImpact.length,
      criticalPath,
    }
  }

  /** Compute impact for all nodes. */
  computeAllImpact(): Record<string, ImpactResult> {
    const result: Record<string, ImpactResult> = {}
    for (const id of this.nodes.keys()) {
      result[id] = this.computeImpact(id)
    }
    return result
  }

  // -- Validation ----------------------------------------------------------

  /** Validate the graph and return all issues. */
  validate(): readonly GraphIssue[] {
    const issues: GraphIssue[] = []

    // 1. Cycles
    const cycles = this.findCycles()
    for (const cycle of cycles) {
      issues.push({
        type: 'cycle',
        severity: 'error',
        message: `Dependency cycle: ${cycle.join(' → ')} → ${cycle[0]}`,
        involved: cycle,
      })
    }

    // 2. Self-dependencies (edges that slipped through addEdge guard)
    for (const e of this.edges) {
      if (e.from === e.to) {
        issues.push({
          type: 'self-dependency',
          severity: 'error',
          message: `Self-dependency on node '${e.from}'`,
          involved: [e.from],
        })
      }
    }

    // 3. Dangling edges (missing target nodes)
    for (const e of this.edges) {
      if (!this.nodes.has(e.from)) {
        issues.push({
          type: 'dangling-edge',
          severity: 'error',
          message: `Edge from missing node '${e.from}'`,
          involved: [e.from],
        })
      }
      if (!this.nodes.has(e.to)) {
        issues.push({
          type: 'dangling-edge',
          severity: 'error',
          message: `Edge to missing node '${e.to}'`,
          involved: [e.to],
        })
      }
    }

    // 4. Orphan nodes (no edges at all)
    for (const [id] of this.nodes) {
      const out = this.adjacency.get(id) ?? []
      const inc = this.reverseAdjacency.get(id) ?? []
      if (out.length === 0 && inc.length === 0) {
        issues.push({
          type: 'orphan-node',
          severity: 'warning',
          message: `Node '${id}' has no dependencies and no dependents`,
          involved: [id],
        })
      }
    }

    // 5. Conflict pairs (bidirectional conflicts = contradictory)
    const conflictEdges = this.edges.filter(e => e.kind === 'conflicts')
    for (let i = 0; i < conflictEdges.length; i++) {
      for (let j = i + 1; j < conflictEdges.length; j++) {
        const a = conflictEdges[i]!
        const b = conflictEdges[j]!
        if (a.from === b.to && a.to === b.from) {
          issues.push({
            type: 'conflict-pair',
            severity: 'warning',
            message: `Mutual conflict between '${a.from}' and '${a.to}'`,
            involved: [a.from, a.to],
          })
        }
      }
    }

    // 6. Deep chains (>10 levels)
    for (const [id] of this.nodes) {
      const depth = this.chainDepth(id, new Set())
      if (depth > 10) {
        issues.push({
          type: 'deep-chain',
          severity: 'info',
          message: `Node '${id}' has dependency chain depth ${depth}`,
          involved: [id],
        })
      }
    }

    // 7. Missing ownership on module nodes
    for (const [, node] of this.nodes) {
      if (node.kind === 'module' && !node.ownershipConfirmed) {
        issues.push({
          type: 'missing-ownership',
          severity: 'error',
          message: `Module '${node.id}' has no confirmed owner — IDs and ownership must be decided upfront`,
          involved: [node.id],
        })
      }
    }

    // 8. Invalid module IDs (must match MODULE_ID_PATTERN)
    for (const [, node] of this.nodes) {
      if (node.kind === 'module') {
        const baseId = node.id.replace(/^MOD-/, '')
        if (!MODULE_ID_PATTERN.test(baseId)) {
          issues.push({
            type: 'invalid-module-id',
            severity: 'error',
            message: `Module ID '${node.id}' does not match convention (2-4 uppercase letters)`,
            involved: [node.id],
          })
        }
      }
    }

    return issues
  }

  /** Compute maximum chain depth from a node (DFS). */
  private chainDepth(id: string, visited: Set<string>): number {
    if (visited.has(id)) return 0
    visited.add(id)
    let max = 0
    for (const target of this.adjacency.get(id) ?? []) {
      max = Math.max(max, 1 + this.chainDepth(target, new Set(visited)))
    }
    return max
  }

  // -- Connected components ------------------------------------------------

  /** Count connected components (treating edges as undirected). */
  countComponents(): number {
    const visited = new Set<string>()
    let count = 0

    const bfs = (start: string) => {
      const queue = [start]
      visited.add(start)
      while (queue.length > 0) {
        const current = queue.shift()!
        for (const n of [
          ...(this.adjacency.get(current) ?? []),
          ...(this.reverseAdjacency.get(current) ?? []),
        ]) {
          if (!visited.has(n)) {
            visited.add(n)
            queue.push(n)
          }
        }
      }
    }

    for (const [id] of this.nodes) {
      if (!visited.has(id)) {
        bfs(id)
        count++
      }
    }

    return count
  }

  // -- Health report -------------------------------------------------------

  /** Generate a full graph health report. */
  healthReport(): GraphHealth {
    const issues = this.validate()
    const nodeCounts: Record<DepNodeKind, number> = {
      module: 0, goal: 0, file: 0, element: 0, rule: 0, 'external-package': 0,
    }
    const edgeCounts: Record<DepEdgeKind, number> = {
      requires: 0, 'soft-requires': 0, conflicts: 0, replaces: 0, 'data-flow': 0, calls: 0,
    }

    for (const [, node] of this.nodes) {
      nodeCounts[node.kind]++
    }
    for (const edge of this.edges) {
      edgeCounts[edge.kind]++
    }

    // Max depth
    let maxDepth = 0
    for (const [id] of this.nodes) {
      maxDepth = Math.max(maxDepth, this.chainDepth(id, new Set()))
    }

    // Ownership coverage
    const moduleNodes = Array.from(this.nodes.values()).filter(n => n.kind === 'module')
    const ownedCount = moduleNodes.filter(n => n.ownershipConfirmed).length
    const ownershipCoverage = moduleNodes.length === 0 ? 1 : ownedCount / moduleNodes.length

    return {
      healthy: !issues.some(i => i.severity === 'error'),
      nodeCounts,
      edgeCounts,
      issues,
      components: this.countComponents(),
      maxDepth,
      ownershipCoverage,
    }
  }

  // -- Build full result ---------------------------------------------------

  /** Generate the full dependency mapping result. */
  buildResult(): DependencyMappingResult {
    const issues = this.validate()
    const impactMap = this.computeAllImpact()
    let executionOrder: string[] = []
    try {
      executionOrder = this.topologicalSort()
    } catch {
      // Cycle detected — use DFS-based partial order
      executionOrder = Array.from(this.nodes.keys())
    }

    return {
      nodes: this.getNodes(),
      edges: this.getEdges(),
      issues,
      impactMap,
      executionOrder,
      health: this.healthReport(),
      generatedAt: new Date().toISOString(),
    }
  }

  // -- Serialization -------------------------------------------------------

  /** Export graph as JSON-serializable object. */
  toJSON(): { nodes: DepNode[]; edges: DepEdge[] } {
    return {
      nodes: this.getNodes() as DepNode[],
      edges: this.getEdges() as DepEdge[],
    }
  }

  /** Import graph from JSON. */
  fromJSON(data: { nodes: readonly DepNode[]; edges: readonly DepEdge[] }): void {
    this.nodes.clear()
    this.edges.length = 0
    this.adjacency.clear()
    this.reverseAdjacency.clear()
    this.addNodes(data.nodes)
    this.addEdges(data.edges)
  }

  /** Clear the entire graph. */
  clear(): void {
    this.nodes.clear()
    this.edges.length = 0
    this.adjacency.clear()
    this.reverseAdjacency.clear()
  }
}
