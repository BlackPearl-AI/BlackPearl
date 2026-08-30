/**
 * PHASE 12 — Task Decomposition Engine
 *
 * Manages hierarchical task decomposition:
 *
 *   Goal → Sub-goal → Feature → Element → Microtask
 *
 * Provides decomposition, tree traversal, traceability chains,
 * topological ordering, and validation.
 */

import type {
  Task,
  TaskLevel,
  TaskCategory,
  Effort,
  TaskStatus,
  TaskPriority,
  TraceabilityChain,
  TaskIssue,
  TaskSummary,
  TaskTreeNode,
  TaskDecompositionResult,
} from './types.ts'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Effort weights for scoring. */
const EFFORT_WEIGHTS: Record<Effort, number> = {
  tiny: 1,
  small: 2,
  medium: 5,
  large: 10,
  epic: 20,
}

/** Valid parent → child level transitions. */
const VALID_CHILD_LEVELS: Record<TaskLevel, readonly TaskLevel[]> = {
  goal: ['subgoal'],
  subgoal: ['feature'],
  feature: ['element'],
  element: ['microtask'],
  microtask: [], // leaf — no children allowed
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class TaskDecompositionEngine {
  private readonly tasks = new Map<string, Task>()
  private readonly moduleSeq = new Map<string, number>()

  private nextSeq(moduleId: string): number {
    const current = this.moduleSeq.get(moduleId) ?? 0
    const next = current + 1
    this.moduleSeq.set(moduleId, next)
    return next
  }

  // -- Create ---------------------------------------------------------------

  /** Create a new task. Default level is 'microtask' (flat mode). */
  create(input: {
    name: string
    description: string
    moduleId: string
    category: TaskCategory
    level?: TaskLevel
    parentTaskId?: string
    effort?: Effort
    priority?: TaskPriority
    order?: number
    dependsOn?: readonly string[]
    goalIds?: readonly string[]
    files?: readonly string[]
    elementIds?: readonly string[]
    traceability?: TraceabilityChain
    tags?: readonly string[]
  }): Task {
    const seq = this.nextSeq(input.moduleId)
    const id = `T-${input.moduleId.toUpperCase()}-${String(seq).padStart(3, '0')}`
    const now = new Date().toISOString()
    const level: TaskLevel = input.level ?? 'microtask'

    const task: Task = {
      id,
      name: input.name,
      description: input.description,
      moduleId: input.moduleId,
      level,
      parentTaskId: input.parentTaskId ?? undefined,
      childTaskIds: [],
      category: input.category,
      effort: input.effort ?? 'medium',
      priority: input.priority ?? 'medium',
      status: 'pending',
      order: input.order ?? seq,
      dependsOn: input.dependsOn ?? [],
      dependedBy: [],
      goalIds: input.goalIds ?? [],
      files: input.files ?? [],
      elementIds: input.elementIds ?? [],
      traceability: input.traceability ?? {},
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    }

    // Register reverse dependencies
    for (const depId of task.dependsOn) {
      const dep = this.tasks.get(depId)
      if (dep) {
        ;(dep as unknown as { dependedBy: string[] }).dependedBy = [
          ...dep.dependedBy,
          id,
        ]
      }
    }

    // Register as child of parent
    if (task.parentTaskId) {
      const parent = this.tasks.get(task.parentTaskId)
      if (parent) {
        ;(parent as unknown as { childTaskIds: string[] }).childTaskIds = [
          ...parent.childTaskIds,
          id,
        ]
      }
    }

    this.tasks.set(id, task)
    return task
  }

  // -- Decompose -----------------------------------------------------------

  /**
   * Decompose a parent task into children.
   * Validates that children levels match the hierarchy.
   * Returns the created child tasks.
   */
  decompose(
    parentId: string,
    children: readonly {
      name: string
      description: string
      category: TaskCategory
      level: TaskLevel
      effort?: Effort
      priority?: TaskPriority
      dependsOn?: readonly string[]
      goalIds?: readonly string[]
      files?: readonly string[]
      elementIds?: readonly string[]
      traceability?: TraceabilityChain
      tags?: readonly string[]
    }[],
  ): readonly Task[] {
    const parent = this.tasks.get(parentId)
    if (!parent) throw new Error(`Parent task '${parentId}' not found`)

    const allowedLevels = VALID_CHILD_LEVELS[parent.level]
    if (allowedLevels.length === 0) {
      throw new Error(
        `Task '${parentId}' is a microtask (leaf) and cannot have children`,
      )
    }

    const created: Task[] = []
    for (const child of children) {
      if (!allowedLevels.includes(child.level)) {
        throw new Error(
          `Invalid child level '${child.level}' for parent level '${parent.level}'. ` +
          `Allowed: ${allowedLevels.join(', ')}`,
        )
      }
      const task = this.create({
        ...child,
        moduleId: parent.moduleId,
        parentTaskId: parentId,
      })
      created.push(task)
    }
    return created
  }

  // -- Update ---------------------------------------------------------------

  /** Update task fields. */
  update(taskId: string, patch: Partial<{
    name: string
    description: string
    status: TaskStatus
    effort: Effort
    priority: TaskPriority
    order: number
    category: TaskCategory
    traceability: TraceabilityChain
    tags: readonly string[]
  }>): Task {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task '${taskId}' not found`)
    const mutable = task as Mutable<Task>
    if (patch.name !== undefined) mutable.name = patch.name
    if (patch.description !== undefined) mutable.description = patch.description
    if (patch.status !== undefined) mutable.status = patch.status
    if (patch.effort !== undefined) mutable.effort = patch.effort
    if (patch.priority !== undefined) mutable.priority = patch.priority
    if (patch.order !== undefined) mutable.order = patch.order
    if (patch.category !== undefined) mutable.category = patch.category
    if (patch.traceability !== undefined) mutable.traceability = patch.traceability
    if (patch.tags !== undefined) mutable.tags = patch.tags
    mutable.updatedAt = new Date().toISOString()
    return task
  }

  // -- Query ----------------------------------------------------------------

  /** Get a task by id. */
  get(taskId: string): Task | undefined {
    return this.tasks.get(taskId)
  }

  /** Get all tasks. */
  getAll(): readonly Task[] {
    return Array.from(this.tasks.values())
  }

  /** Get tasks for a module. */
  getByModule(moduleId: string): readonly Task[] {
    return this.getAll().filter(t => t.moduleId === moduleId)
  }

  /** Get tasks by status. */
  getByStatus(status: TaskStatus): readonly Task[] {
    return this.getAll().filter(t => t.status === status)
  }

  /** Get tasks by category. */
  getByCategory(category: TaskCategory): readonly Task[] {
    return this.getAll().filter(t => t.category === category)
  }

  /** Get tasks by hierarchy level. */
  getByLevel(level: TaskLevel): readonly Task[] {
    return this.getAll().filter(t => t.level === level)
  }

  /** Get children of a task. */
  getChildren(taskId: string): readonly Task[] {
    const task = this.tasks.get(taskId)
    if (!task) return []
    return task.childTaskIds.map(id => this.tasks.get(id)!).filter(Boolean)
  }

  /** Get parent of a task. */
  getParent(taskId: string): Task | undefined {
    const task = this.tasks.get(taskId)
    if (!task?.parentTaskId) return undefined
    return this.tasks.get(task.parentTaskId)
  }

  /** Get root tasks (no parent). */
  getRoots(): readonly Task[] {
    return this.getAll().filter(t => !t.parentTaskId)
  }

  /** Get leaf tasks (no children). */
  getLeaves(): readonly Task[] {
    return this.getAll().filter(t => t.childTaskIds.length === 0)
  }

  /** Get all microtasks. */
  getMicrotasks(moduleId?: string): readonly Task[] {
    const tasks = moduleId ? this.getByModule(moduleId) : this.getAll()
    return tasks.filter(t => t.level === 'microtask')
  }

  /** Total task count. */
  get count(): number {
    return this.tasks.size
  }

  /** Remove a task. */
  remove(taskId: string): boolean {
    if (!this.tasks.has(taskId)) return false
    // Clean up reverse dependencies
    for (const task of this.tasks.values()) {
      const deps = task.dependsOn.filter(d => d !== taskId)
      const mutable = task as Mutable<Task>
      mutable.dependsOn = deps
    }
    // Clean up parent's childTaskIds
    const task = this.tasks.get(taskId)!
    if (task.parentTaskId) {
      const parent = this.tasks.get(task.parentTaskId)
      if (parent) {
        const mutable = parent as Mutable<Task>
        mutable.childTaskIds = parent.childTaskIds.filter(c => c !== taskId)
      }
    }
    // Clean up children's parentTaskId
    for (const childId of task.childTaskIds) {
      const child = this.tasks.get(childId)
      if (child) {
        const mutable = child as Mutable<Task>
        mutable.parentTaskId = undefined
      }
    }
    this.tasks.delete(taskId)
    return true
  }

  // -- Tree -----------------------------------------------------------------

  /** Build hierarchical tree from a root task. */
  getTaskTree(rootId: string): TaskTreeNode | undefined {
    const task = this.tasks.get(rootId)
    if (!task) return undefined
    return this.buildTreeNode(task)
  }

  /** Build hierarchical tree of all root tasks. */
  getFullTree(moduleId?: string): readonly TaskTreeNode[] {
    const roots = moduleId
      ? this.getRoots().filter(t => t.moduleId === moduleId)
      : this.getRoots()
    return roots.map(r => this.buildTreeNode(r))
  }

  private buildTreeNode(task: Task): TaskTreeNode {
    return {
      id: task.id,
      name: task.name,
      level: task.level,
      status: task.status,
      category: task.category,
      children: task.childTaskIds
        .map(id => this.tasks.get(id))
        .filter(Boolean)
        .map(child => this.buildTreeNode(child!)),
    }
  }

  // -- Traceability ---------------------------------------------------------

  /**
   * Get the full traceability chain for a task.
   * Walks up the hierarchy to collect CR → Goal → Element → Task → File → Test.
   */
  getTraceabilityChain(taskId: string): TraceabilityChain {
    const task = this.tasks.get(taskId)
    if (!task) return {}

    // Walk up the hierarchy, collecting traceability from ancestors
    const chain: Mutable<TraceabilityChain> = { taskId }

    // Collect from this task
    if (task.traceability.crId) chain.crId = task.traceability.crId
    if (task.traceability.goalId) chain.goalId = task.traceability.goalId
    if (task.traceability.elementId) chain.elementId = task.traceability.elementId

    // Walk ancestors for inherited traceability
    let current: Task | undefined = task
    while (current) {
      if (current.traceability.crId && !chain.crId) chain.crId = current.traceability.crId
      if (current.traceability.goalId && !chain.goalId) chain.goalId = current.traceability.goalId
      if (current.traceability.elementId && !chain.elementId) chain.elementId = current.traceability.elementId
      current = current.parentTaskId ? this.tasks.get(current.parentTaskId) : undefined
    }

    // Collect files and tests from this task
    if (task.files.length > 0) chain.fileIds = task.files
    if (task.elementIds.length > 0) chain.elementId = chain.elementId ?? task.elementIds[0]!

    // Walk children for files and tests
    this.collectLeafFiles(task, chain)

    return chain
  }

  private collectLeafFiles(task: Task, chain: Mutable<TraceabilityChain>): void {
    if (task.childTaskIds.length === 0) {
      // Leaf — collect files
      if (task.files.length > 0) {
        const existing = chain.fileIds ? [...chain.fileIds] : []
        chain.fileIds = [...existing, ...task.files.filter(f => !existing.includes(f))]
      }
      // Collect test files
      if (task.category === 'test' && task.files.length > 0) {
        const existing = chain.testFileIds ? [...chain.testFileIds] : []
        chain.testFileIds = [...existing, ...task.files.filter(f => !existing.includes(f))]
      }
    } else {
      for (const childId of task.childTaskIds) {
        const child = this.tasks.get(childId)
        if (child) this.collectLeafFiles(child, chain)
      }
    }
  }

  // -- Ordering & Traversal ------------------------------------------------

  /** Topological execution order. */
  topologicalOrder(): string[] {
    const inDegree = new Map<string, number>()
    for (const [id] of this.tasks) {
      inDegree.set(id, 0)
    }
    for (const [, task] of this.tasks) {
      for (const dep of task.dependsOn) {
        if (this.tasks.has(dep)) {
          inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1)
        }
      }
    }

    const queue: string[] = []
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id)
    }

    const order: string[] = []
    while (queue.length > 0) {
      const id = queue.shift()!
      order.push(id)
      for (const other of this.tasks.values()) {
        if (other.dependsOn.includes(id)) {
          const deg = inDegree.get(other.id)! - 1
          inDegree.set(other.id, deg)
          if (deg === 0) queue.push(other.id)
        }
      }
    }

    return order
  }

  /** Get tasks that are ready to execute (all deps completed). */
  getReadyTasks(): readonly Task[] {
    return this.getAll().filter(t => {
      if (t.status !== 'pending') return false
      return t.dependsOn.every(depId => {
        const dep = this.tasks.get(depId)
        return dep?.status === 'completed'
      })
    })
  }

  /** Get blocked tasks (pending but with incomplete deps). */
  getBlockedTasks(): readonly Task[] {
    return this.getAll().filter(t => {
      if (t.status !== 'pending' && t.status !== 'blocked') return false
      return t.dependsOn.some(depId => {
        const dep = this.tasks.get(depId)
        return dep && dep.status !== 'completed'
      })
    })
  }

  // -- Validation ----------------------------------------------------------

  /** Validate the task graph and hierarchy. */
  validate(): readonly TaskIssue[] {
    const issues: TaskIssue[] = []

    // 1. Missing dependency targets
    for (const [, task] of this.tasks) {
      for (const depId of task.dependsOn) {
        if (!this.tasks.has(depId)) {
          issues.push({
            type: 'missing-dependency',
            severity: 'error',
            message: `Task '${task.id}' depends on missing task '${depId}'`,
            involved: [task.id, depId],
          })
        }
      }
    }

    // 2. Circular dependencies (DFS)
    const visited = new Set<string>()
    const stack = new Set<string>()
    const findCycle = (id: string, path: string[]): string[] | null => {
      if (stack.has(id)) {
        const cycleStart = path.indexOf(id)
        return path.slice(cycleStart)
      }
      if (visited.has(id)) return null
      visited.add(id)
      stack.add(id)
      path.push(id)
      const task = this.tasks.get(id)
      if (task) {
        for (const dep of task.dependsOn) {
          const cycle = findCycle(dep, [...path])
          if (cycle) return cycle
        }
      }
      stack.delete(id)
      return null
    }

    for (const [id] of this.tasks) {
      visited.clear()
      stack.clear()
      const cycle = findCycle(id, [])
      if (cycle) {
        issues.push({
          type: 'circular-dependency',
          severity: 'error',
          message: `Circular dependency: ${cycle.join(' → ')} → ${cycle[0]}`,
          involved: cycle,
        })
        break
      }
    }

    // 3. Duplicate ids
    const ids = new Set<string>()
    for (const [id] of this.tasks) {
      if (ids.has(id)) {
        issues.push({
          type: 'duplicate-id',
          severity: 'error',
          message: `Duplicate task id: '${id}'`,
          involved: [id],
        })
      }
      ids.add(id)
    }

    // 4. Epic tasks without breakdown
    for (const [, task] of this.tasks) {
      if (task.effort === 'epic' && task.childTaskIds.length === 0 && task.dependedBy.length === 0) {
        issues.push({
          type: 'high-effort-no-breakdown',
          severity: 'warning',
          message: `Epic task '${task.id}' has no sub-tasks — consider breaking down`,
          involved: [task.id],
        })
      }
    }

    // 5. Tasks with no goal coverage
    for (const [, task] of this.tasks) {
      if (task.goalIds.length === 0) {
        issues.push({
          type: 'missing-goal',
          severity: 'info',
          message: `Task '${task.id}' has no associated goals`,
          involved: [task.id],
        })
      }
    }

    // 6. Empty module
    if (this.tasks.size === 0) {
      issues.push({
        type: 'empty-module',
        severity: 'warning',
        message: 'No tasks defined — module decomposition is empty',
        involved: [],
      })
    }

    // 7. Non-microtask without children (should be decomposed)
    for (const [, task] of this.tasks) {
      if (task.level !== 'microtask' && task.childTaskIds.length === 0) {
        issues.push({
          type: 'non-microtask-no-children',
          severity: 'error',
          message: `Task '${task.id}' is level '${task.level}' but has no children — must be decomposed to microtask level`,
          involved: [task.id],
        })
      }
    }

    // 8. Microtask with children (violates leaf rule)
    for (const [, task] of this.tasks) {
      if (task.level === 'microtask' && task.childTaskIds.length > 0) {
        issues.push({
          type: 'microtask-has-children',
          severity: 'error',
          message: `Microtask '${task.id}' should not have children`,
          involved: [task.id],
        })
      }
    }

    // 9. Broken traceability — root tasks should have crId
    for (const [, task] of this.tasks) {
      if (!task.parentTaskId && !task.traceability.crId) {
        issues.push({
          type: 'broken-traceability',
          severity: 'warning',
          message: `Root task '${task.id}' has no CR-ID in traceability chain`,
          involved: [task.id],
        })
      }
    }

    return issues
  }

  // -- Summary & Reporting -------------------------------------------------

  /** Compute maximum hierarchy depth. */
  private computeMaxDepth(): number {
    let maxDepth = 0
    const visited = new Set<string>()
    const dfs = (taskId: string, depth: number) => {
      if (visited.has(taskId)) return
      visited.add(taskId)
      maxDepth = Math.max(maxDepth, depth)
      const task = this.tasks.get(taskId)
      if (task) {
        for (const childId of task.childTaskIds) {
          dfs(childId, depth + 1)
        }
      }
    }
    for (const root of this.getRoots()) {
      dfs(root.id, 1)
    }
    return maxDepth
  }

  /** Compute summary statistics. */
  summary(): TaskSummary {
    const tasks = this.getAll()

    const byStatus: Record<TaskStatus, number> = {
      pending: 0, 'in-progress': 0, completed: 0, blocked: 0, skipped: 0, cancelled: 0,
    }
    const byCategory: Record<TaskCategory, number> = {
      schema: 0, api: 0, ui: 0, test: 0, doc: 0, config: 0, migration: 0,
      integration: 0, refactor: 0, security: 0, perf: 0, other: 0,
    }
    const byEffort: Record<Effort, number> = {
      tiny: 0, small: 0, medium: 0, large: 0, epic: 0,
    }
    const byPriority: Record<TaskPriority, number> = {
      critical: 0, high: 0, medium: 0, low: 0,
    }
    const byLevel: Record<TaskLevel, number> = {
      goal: 0, subgoal: 0, feature: 0, element: 0, microtask: 0,
    }

    let totalEffortScore = 0
    let traceableCount = 0

    for (const t of tasks) {
      byStatus[t.status]++
      byCategory[t.category]++
      byEffort[t.effort]++
      byPriority[t.priority]++
      byLevel[t.level]++
      totalEffortScore += EFFORT_WEIGHTS[t.effort]
      if (t.traceability.crId || t.traceability.goalId) traceableCount++
    }

    return {
      total: tasks.length,
      byStatus,
      byCategory,
      byEffort,
      byPriority,
      byLevel,
      totalEffortScore,
      blockedCount: byStatus.blocked,
      criticalPathCount: this.getReadyTasks().length,
      hierarchyDepth: this.computeMaxDepth(),
      traceableCount,
    }
  }

  // -- Build Full Result ---------------------------------------------------

  /** Generate the full decomposition result. */
  buildResult(moduleId: string): TaskDecompositionResult {
    const issues = this.validate()
    let executionOrder: string[] = []
    try {
      executionOrder = this.topologicalOrder()
    } catch {
      executionOrder = this.getAll().map(t => t.id)
    }

    return {
      moduleId,
      tasks: this.getAll(),
      executionOrder,
      issues,
      summary: this.summary(),
      generatedAt: new Date().toISOString(),
    }
  }

  // -- Bulk Operations -----------------------------------------------------

  /** Bulk-create tasks from a list of partial inputs. */
  bulkCreate(
    moduleId: string,
    inputs: readonly (Omit<Parameters<TaskDecompositionEngine['create']>[0], 'moduleId'>)[],
  ): readonly Task[] {
    return inputs.map(input => this.create({ ...input, moduleId }))
  }

  /** Clear all tasks. */
  clear(): void {
    this.tasks.clear()
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
