/**
 * Master Goal Engine: decomposes a high-level objective into a dependency
 * graph, computes topological order, detects cycles, scores criticality,
 * and resolves module lock status.
 *
 * Algorithm:
 * 1. Validate inputs — unique ids, valid dependency references.
 * 2. Build adjacency lists (forward = deps, reverse = dependents).
 * 3. Topological sort via Kahn's algorithm (also detects cycles).
 * 4. Group modules into product domains.
 * 5. DFS downstream reachability for critical-path scoring.
 * 6. Resolve module statuses: completed > active (no deps) > locked.
 *
 * @module @deepseek-ai/dsh-governance-layer/master-goal-gate/engine
 */

import type {
  GoalDecompositionInput,
  ModuleInput,
  MasterGoalBreakdown,
  ModuleDescriptor,
  ProductDomain,
  DependencyGraph,
  ModuleStatus,
} from './types.ts'

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate decomposition inputs. Throws on:
 * - Duplicate module ids
 * - References to unknown module ids in dependsOn
 * - Empty module list
 * - Missing required fields (id, name, domain)
 */
function validateInput(input: GoalDecompositionInput): void {
  if (input.modules.length === 0) {
    throw new Error('master-goal-gate: at least one module is required')
  }

  const ids = new Set<string>()
  for (const mod of input.modules) {
    if (!mod.id || !mod.name || !mod.domain) {
      throw new Error(`master-goal-gate: module is missing required fields (id, name, domain): ${JSON.stringify(mod)}`)
    }
    if (ids.has(mod.id)) {
      throw new Error(`master-goal-gate: duplicate module id "${mod.id}"`)
    }
    ids.add(mod.id)
  }

  // Validate dependency references.
  for (const mod of input.modules) {
    if (mod.dependsOn) {
      for (const dep of mod.dependsOn) {
        if (!ids.has(dep)) {
          throw new Error(
            `master-goal-gate: module "${mod.id}" depends on unknown module "${dep}"`,
          )
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Graph Construction
// ---------------------------------------------------------------------------

/**
 * Build forward and reverse adjacency lists.
 * Forward[module] = modules it depends on (its prerequisites).
 * Reverse[module] = modules that depend on it (its dependents).
 */
function buildGraph(modules: readonly ModuleInput[]): DependencyGraph {
  const forward: Record<string, string[]> = {}
  const reverse: Record<string, string[]> = {}

  // Initialize all modules.
  for (const mod of modules) {
    forward[mod.id] = []
    reverse[mod.id] = []
  }

  // Build edges.
  for (const mod of modules) {
    if (mod.dependsOn) {
      for (const dep of mod.dependsOn) {
        // mod depends on dep → forward[mod] includes dep.
        forward[mod.id]!.push(dep)
        // dep is depended upon by mod → reverse[dep] includes mod.
        reverse[dep]!.push(mod.id)
      }
    }
  }

  return { forward, reverse }
}

// ---------------------------------------------------------------------------
// Topological Sort (Kahn's Algorithm)
// ---------------------------------------------------------------------------

/**
 * Compute topological order via Kahn's algorithm.
 * Returns the sorted module ids, or throws if a cycle is detected.
 *
 * Also returns a `visited` set for cycle detection.
 */
function topologicalSort(
  modules: readonly ModuleInput[],
  graph: DependencyGraph,
): string[] {
  // Compute in-degree for each module.
  const inDegree = new Map<string, number>()
  for (const mod of modules) {
    inDegree.set(mod.id, graph.forward[mod.id]?.length ?? 0)
  }

  // Start with modules that have no dependencies.
  const queue: string[] = []
  for (const mod of modules) {
    if ((inDegree.get(mod.id) ?? 0) === 0) {
      queue.push(mod.id)
    }
  }

  // Sort queue by module id for deterministic output.
  queue.sort()

  const sorted: string[] = []

  while (queue.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const current = queue.shift()!
    sorted.push(current)

    // Reduce in-degree for all modules that depend on current.
    const dependents = graph.reverse[current] ?? []
    for (const dep of dependents) {
      const newDegree = (inDegree.get(dep) ?? 1) - 1
      inDegree.set(dep, newDegree)
      if (newDegree === 0) {
        queue.push(dep)
        // Re-sort for deterministic output.
        queue.sort()
      }
    }
  }

  // If not all modules are sorted, there's a cycle.
  if (sorted.length !== modules.length) {
    const remaining = new Set(modules.map(m => m.id))
    for (const id of sorted) {
      remaining.delete(id)
    }
    throw new Error(
      `master-goal-gate: cycle detected among modules: ${[...remaining].join(', ')}`,
    )
  }

  return sorted
}

// ---------------------------------------------------------------------------
// Domain Extraction
// ---------------------------------------------------------------------------

/**
 * Group modules into product domains based on their `domain` field.
 * Domains are sorted alphabetically; modules within each domain follow
 * topological order.
 */
function extractDomains(
  modules: readonly ModuleInput[],
  topologicalOrder: readonly string[],
): ProductDomain[] {
  const orderMap = new Map<string, number>()
  for (let i = 0; i < topologicalOrder.length; i++) {
    orderMap.set(topologicalOrder[i]!, i)
  }

  // Group by domain.
  const domainMap = new Map<string, string[]>()
  for (const mod of modules) {
    const existing = domainMap.get(mod.domain) ?? []
    existing.push(mod.id)
    domainMap.set(mod.domain, existing)
  }

  // Sort domains alphabetically, modules within by topological order.
  const domains: ProductDomain[] = []
  for (const [name, moduleIds] of [...domainMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    domains.push({
      name,
      moduleIds: [...moduleIds].sort((a, b) => (orderMap.get(a) ?? 0) - (orderMap.get(b) ?? 0)),
    })
  }

  return domains
}

// ---------------------------------------------------------------------------
// Critical-Path Scoring (DFS downstream reachability)
// ---------------------------------------------------------------------------

/**
 * Compute criticality for each module: the number of downstream modules
 * reachable from it (i.e., how many modules it unlocks).
 *
 * Uses iterative DFS to avoid stack overflow on large graphs.
 */
function computeCriticality(
  modules: readonly ModuleInput[],
  graph: DependencyGraph,
): Map<string, number> {
  const criticality = new Map<string, number>()

  // Memoized DFS: count reachable downstream nodes from `start`.
  function dfs(start: string): number {
    const cached = criticality.get(start)
    if (cached !== undefined) return cached

    const visited = new Set<string>()
    const stack = [start]

    while (stack.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const current = stack.pop()!
      const dependents = graph.reverse[current] ?? []

      for (const dep of dependents) {
        if (!visited.has(dep)) {
          visited.add(dep)
          stack.push(dep)
        }
      }
    }

    const score = visited.size
    criticality.set(start, score)
    return score
  }

  for (const mod of modules) {
    dfs(mod.id)
  }

  return criticality
}

// ---------------------------------------------------------------------------
// Module Status Resolution
// ---------------------------------------------------------------------------

/**
 * Determine the status of each module based on completed modules.
 *
 * A module is:
 * - `completed` if it is in the `completedModules` set.
 * - `active` if ALL its dependencies are completed.
 * - `locked` if any dependency is not completed.
 * - `skipped` if it is in the `skippedModules` set.
 */
function resolveModuleStatus(
  mod: ModuleInput,
  graph: DependencyGraph,
  completedModules: ReadonlySet<string>,
  skippedModules: ReadonlySet<string>,
): ModuleStatus {
  if (skippedModules.has(mod.id)) return 'skipped'
  if (completedModules.has(mod.id)) return 'completed'

  const deps = graph.forward[mod.id] ?? []
  const allDepsCompleted = deps.every(d => completedModules.has(d))

  return allDepsCompleted ? 'active' : 'locked'
}

// ---------------------------------------------------------------------------
// Public API: MasterGoalEngine
// ---------------------------------------------------------------------------

/**
 * The Master Goal Engine decomposes a high-level objective into a
 * dependency-aware module hierarchy.
 *
 * Usage:
 * ```ts
 * const engine = new MasterGoalEngine()
 * const breakdown = engine.decompose({
 *   objective: 'School ERP बनाओ',
 *   modules: [
 *     { id: 'student-master', name: 'Student Master', domain: 'Student' },
 *     { id: 'enrollment', name: 'Enrollment', domain: 'Student', dependsOn: ['student-master'] },
 *     { id: 'fees', name: 'Fees', domain: 'Fees', dependsOn: ['enrollment'] },
 *     { id: 'attendance', name: 'Attendance', domain: 'Attendance', dependsOn: ['enrollment'] },
 *     { id: 'exam', name: 'Exam', domain: 'Exam', dependsOn: ['student-master'] },
 *     { id: 'documents', name: 'Documents', domain: 'Documents' },
 *   ],
 * })
 * // breakdown.activeModules → ['student-master', 'documents']
 * // breakdown.lockedModules → ['enrollment', 'fees', 'attendance', 'exam']
 * ```
 */
export class MasterGoalEngine {
  /**
   * Decompose a goal into a full hierarchical breakdown.
   *
   * @param input - The goal decomposition input with modules and dependencies.
   * @param completedModules - Module ids already completed (default: empty set).
   * @param skippedModules - Module ids intentionally skipped (default: empty set).
   * @returns The full breakdown with domains, dependency graph, topological
   *   order, critical path, and module statuses.
   * @throws On invalid inputs or dependency cycles.
   */
  decompose(
    input: GoalDecompositionInput,
    completedModules: ReadonlySet<string> = new Set(),
    skippedModules: ReadonlySet<string> = new Set(),
  ): MasterGoalBreakdown {
    // 1. Validate.
    validateInput(input)

    // 2. Build graph.
    const graph = buildGraph(input.modules)

    // 3. Topological sort (also detects cycles).
    const topologicalOrder = topologicalSort(input.modules, graph)

    // 4. Extract domains.
    const domains = extractDomains(input.modules, topologicalOrder)

    // 5. Compute criticality scores.
    const criticality = computeCriticality(input.modules, graph)

    // 6. Resolve statuses and build module descriptors.
    const moduleMap: Record<string, ModuleDescriptor> = {}
    const activeModules: string[] = []
    const lockedModules: string[] = []

    for (let i = 0; i < topologicalOrder.length; i++) {
      const modId = topologicalOrder[i]!
      const mod = input.modules.find(m => m.id === modId)
      if (mod === undefined) continue // Should never happen.

      const status = resolveModuleStatus(mod, graph, completedModules, skippedModules)
      const desc: ModuleDescriptor = {
        id: mod.id,
        name: mod.name,
        domain: mod.domain,
        dependsOn: graph.forward[mod.id] ?? [],
        dependents: graph.reverse[mod.id] ?? [],
        status,
        order: i,
        criticality: criticality.get(mod.id) ?? 0,
      }
      moduleMap[mod.id] = desc

      if (status === 'active') activeModules.push(mod.id)
      if (status === 'locked') lockedModules.push(mod.id)
    }

    // 7. Compute critical path: modules sorted by criticality descending.
    const criticalPath = topologicalOrder
      .slice()
      .sort((a, b) => (criticality.get(b) ?? 0) - (criticality.get(a) ?? 0))
      .filter(id => {
        const mod = input.modules.find(m => m.id === id)
        return mod !== undefined
      })

    // 8. Generate goal id if not provided.
    const goalId = input.goalId ?? `MG-${Date.now().toString(36).toUpperCase()}`

    return {
      objective: input.objective,
      goalId,
      domains,
      moduleMap,
      graph,
      topologicalOrder,
      criticalPath,
      activeModules,
      lockedModules,
      decomposedAt: new Date().toISOString(),
    }
  }

  /**
   * Re-resolve module statuses after completing or skipping modules.
   *
   * Returns a new breakdown with updated statuses while preserving
   * the original dependency graph and domain structure.
   */
  reResolve(
    original: MasterGoalBreakdown,
    completedModules: ReadonlySet<string>,
    skippedModules: ReadonlySet<string> = new Set(),
  ): MasterGoalBreakdown {
    // Re-decompose with the original input's modules.
    const modules: ModuleInput[] = original.topologicalOrder.map(id => {
      const desc = original.moduleMap[id]
      if (desc === undefined) throw new Error(`master-goal-gate: unknown module "${id}" in breakdown`)
      return {
        id: desc.id,
        name: desc.name,
        domain: desc.domain,
        dependsOn: desc.dependsOn,
      }
    })

    return this.decompose(
      { objective: original.objective, goalId: original.goalId, modules },
      completedModules,
      skippedModules,
    )
  }
}
