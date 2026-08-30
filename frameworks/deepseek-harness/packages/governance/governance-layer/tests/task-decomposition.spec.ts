/**
 * PHASE 12 — Task Decomposition Tests
 *
 * Hierarchy: Goal → Sub-goal → Feature → Element → Microtask
 * Traceability: CR-ID → Goal-ID → Element-ID → Task-ID → File → Test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  TaskDecompositionEngine,
  resetEngine,
  getActiveEngine,
  createCreateTaskTool,
  createDecomposeTaskTool,
  createUpdateTaskStatusTool,
  createValidateTasksTool,
  createGetTaskSummaryTool,
  createGetTaskExecutionOrderTool,
  createGetReadyTasksTool,
  createGetTaskTraceabilityTool,
  createGetTaskTreeTool,
} from '../src/task-decomposition/index.ts'

// ---------------------------------------------------------------------------
// Engine — flat mode (backwards compatible)
// ---------------------------------------------------------------------------

describe('TaskDecompositionEngine', () => {
  let engine: TaskDecompositionEngine

  beforeEach(() => {
    engine = new TaskDecompositionEngine()
  })

  // -- Create (flat) --------------------------------------------------------

  describe('create (flat)', () => {
    it('creates a task with generated id', () => {
      const t = engine.create({
        name: 'Create schema',
        description: 'Create student-master schema',
        moduleId: 'MOD',
        category: 'schema',
      })
      expect(t.id).toMatch(/^T-MOD-001$/)
      expect(t.name).toBe('Create schema')
      expect(t.status).toBe('pending')
      expect(t.level).toBe('microtask')
      expect(t.parentTaskId).toBeUndefined()
      expect(t.childTaskIds).toHaveLength(0)
    })

    it('increments sequence per module', () => {
      const t1 = engine.create({ name: 'T1', description: 'D', moduleId: 'MOD', category: 'api' })
      const t2 = engine.create({ name: 'T2', description: 'D', moduleId: 'MOD', category: 'ui' })
      expect(t1.id).toBe('T-MOD-001')
      expect(t2.id).toBe('T-MOD-002')
    })

    it('independent sequences for different modules', () => {
      const t1 = engine.create({ name: 'T1', description: 'D', moduleId: 'A', category: 'api' })
      const t2 = engine.create({ name: 'T2', description: 'D', moduleId: 'B', category: 'api' })
      expect(t1.id).toBe('T-A-001')
      expect(t2.id).toBe('T-B-001')
    })

    it('sets defaults for optional fields', () => {
      const t = engine.create({ name: 'T', description: 'D', moduleId: 'MOD', category: 'other' })
      expect(t.effort).toBe('medium')
      expect(t.priority).toBe('medium')
      expect(t.dependsOn).toHaveLength(0)
      expect(t.files).toHaveLength(0)
      expect(t.traceability).toEqual({})
    })

    it('accepts optional fields', () => {
      const t = engine.create({
        name: 'Complex task',
        description: 'Big task',
        moduleId: 'MOD',
        category: 'refactor',
        effort: 'large',
        priority: 'critical',
        dependsOn: ['T-MOD-001'],
        goalIds: ['G1'],
        files: ['src/a.ts'],
        elementIds: ['BTN-MOD-001'],
        traceability: { crId: 'CR-001', goalId: 'G1' },
        tags: ['core'],
      })
      expect(t.effort).toBe('large')
      expect(t.priority).toBe('critical')
      expect(t.dependsOn).toEqual(['T-MOD-001'])
      expect(t.goalIds).toEqual(['G1'])
      expect(t.traceability.crId).toBe('CR-001')
    })

    it('registers reverse dependencies', () => {
      const t1 = engine.create({ name: 'T1', description: 'D', moduleId: 'MOD', category: 'api' })
      const t2 = engine.create({
        name: 'T2', description: 'D', moduleId: 'MOD', category: 'ui',
        dependsOn: [t1.id],
      })
      expect(t1.dependedBy).toContain(t2.id)
    })
  })

  // -- Create (hierarchical) ------------------------------------------------

  describe('create (hierarchical)', () => {
    it('creates a goal-level task', () => {
      const t = engine.create({
        name: 'Student Management',
        description: 'Complete student management system',
        moduleId: 'STU',
        category: 'api',
        level: 'goal',
        traceability: { crId: 'CR-STU-001' },
      })
      expect(t.level).toBe('goal')
      expect(t.parentTaskId).toBeUndefined()
      expect(t.traceability.crId).toBe('CR-STU-001')
    })

    it('creates parent-child relationship', () => {
      const parent = engine.create({
        name: 'Goal', description: 'D', moduleId: 'M', category: 'api', level: 'goal',
      })
      const child = engine.create({
        name: 'Sub-goal', description: 'D', moduleId: 'M', category: 'api',
        level: 'subgoal', parentTaskId: parent.id,
      })
      expect(child.parentTaskId).toBe(parent.id)
      expect(parent.childTaskIds).toContain(child.id)
    })
  })

  // -- Update ---------------------------------------------------------------

  describe('update', () => {
    it('updates status', () => {
      const t = engine.create({ name: 'T', description: 'D', moduleId: 'MOD', category: 'test' })
      engine.update(t.id, { status: 'in-progress' })
      expect(engine.get(t.id)?.status).toBe('in-progress')
    })

    it('updates multiple fields', () => {
      const t = engine.create({ name: 'T', description: 'D', moduleId: 'MOD', category: 'test' })
      engine.update(t.id, { name: 'Updated', effort: 'epic', priority: 'low' })
      expect(engine.get(t.id)?.name).toBe('Updated')
      expect(engine.get(t.id)?.effort).toBe('epic')
    })

    it('throws for non-existent task', () => {
      expect(() => engine.update('T-X-001', { status: 'completed' })).toThrow()
    })
  })

  // -- Query ----------------------------------------------------------------

  describe('query', () => {
    it('gets all tasks', () => {
      engine.create({ name: 'A', description: 'D', moduleId: 'M', category: 'api' })
      engine.create({ name: 'B', description: 'D', moduleId: 'N', category: 'ui' })
      expect(engine.getAll()).toHaveLength(2)
    })

    it('filters by module', () => {
      engine.create({ name: 'A', description: 'D', moduleId: 'M', category: 'api' })
      engine.create({ name: 'B', description: 'D', moduleId: 'M', category: 'ui' })
      engine.create({ name: 'C', description: 'D', moduleId: 'N', category: 'api' })
      expect(engine.getByModule('M')).toHaveLength(2)
    })

    it('filters by level', () => {
      engine.create({ name: 'Goal', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      engine.create({ name: 'Micro', description: 'D', moduleId: 'M', category: 'api', level: 'microtask' })
      expect(engine.getByLevel('goal')).toHaveLength(1)
      expect(engine.getByLevel('microtask')).toHaveLength(1)
    })

    it('gets children', () => {
      const parent = engine.create({ name: 'P', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      const c1 = engine.create({ name: 'C1', description: 'D', moduleId: 'M', category: 'api', level: 'subgoal', parentTaskId: parent.id })
      engine.create({ name: 'C2', description: 'D', moduleId: 'M', category: 'api', level: 'subgoal', parentTaskId: parent.id })
      expect(engine.getChildren(parent.id)).toHaveLength(2)
      expect(engine.getChildren(parent.id).map(c => c.id)).toContain(c1.id)
    })

    it('gets parent', () => {
      const parent = engine.create({ name: 'P', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      const child = engine.create({ name: 'C', description: 'D', moduleId: 'M', category: 'api', level: 'subgoal', parentTaskId: parent.id })
      expect(engine.getParent(child.id)?.id).toBe(parent.id)
    })

    it('gets roots', () => {
      const r = engine.create({ name: 'R', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      engine.create({ name: 'C', description: 'D', moduleId: 'M', category: 'api', level: 'subgoal', parentTaskId: r.id })
      expect(engine.getRoots()).toHaveLength(1)
      expect(engine.getRoots()[0]!.id).toBe(r.id)
    })

    it('gets leaves', () => {
      const r = engine.create({ name: 'R', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      engine.create({ name: 'C', description: 'D', moduleId: 'M', category: 'api', level: 'subgoal', parentTaskId: r.id })
      expect(engine.getLeaves()).toHaveLength(1)
      expect(engine.getLeaves()[0]!.level).toBe('subgoal')
    })

    it('gets microtasks', () => {
      engine.create({ name: 'G', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      engine.create({ name: 'M1', description: 'D', moduleId: 'M', category: 'api', level: 'microtask' })
      engine.create({ name: 'M2', description: 'D', moduleId: 'M', category: 'api', level: 'microtask' })
      expect(engine.getMicrotasks()).toHaveLength(2)
    })

    it('removes a task and cleans up parent', () => {
      const parent = engine.create({ name: 'P', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      const child = engine.create({ name: 'C', description: 'D', moduleId: 'M', category: 'api', level: 'subgoal', parentTaskId: parent.id })
      expect(engine.remove(child.id)).toBe(true)
      expect(parent.childTaskIds).toHaveLength(0)
      expect(engine.count).toBe(1)
    })
  })

  // -- Decompose ------------------------------------------------------------

  describe('decompose', () => {
    it('decomposes a goal into subgoals', () => {
      const goal = engine.create({ name: 'Goal', description: 'D', moduleId: 'STU', category: 'api', level: 'goal' })
      const children = engine.decompose(goal.id, [
        { name: 'Sub1', description: 'D', category: 'api', level: 'subgoal' },
        { name: 'Sub2', description: 'D', category: 'ui', level: 'subgoal' },
      ])
      expect(children).toHaveLength(2)
      expect(children[0]!.level).toBe('subgoal')
      expect(children[0]!.parentTaskId).toBe(goal.id)
      expect(goal.childTaskIds).toHaveLength(2)
    })

    it('decomposes subgoal → feature → element → microtask', () => {
      const goal = engine.create({ name: 'G', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      const [sub] = engine.decompose(goal.id, [
        { name: 'Sub', description: 'D', category: 'api', level: 'subgoal' },
      ])
      const [feat] = engine.decompose(sub!.id, [
        { name: 'Feat', description: 'D', category: 'api', level: 'feature' },
      ])
      const [elem] = engine.decompose(feat!.id, [
        { name: 'Elem', description: 'D', category: 'api', level: 'element' },
      ])
      const [micro] = engine.decompose(elem!.id, [
        { name: 'Micro', description: 'D', category: 'api', level: 'microtask' },
      ])
      expect(micro!.level).toBe('microtask')
      expect(micro!.parentTaskId).toBe(elem!.id)
    })

    it('throws for microtask decomposition', () => {
      const micro = engine.create({ name: 'M', description: 'D', moduleId: 'M', category: 'api', level: 'microtask' })
      expect(() => engine.decompose(micro.id, [
        { name: 'X', description: 'D', category: 'api', level: 'microtask' },
      ])).toThrow()
    })

    it('throws for invalid child level', () => {
      const goal = engine.create({ name: 'G', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      // goal can only have subgoal children, not feature
      expect(() => engine.decompose(goal.id, [
        { name: 'F', description: 'D', category: 'api', level: 'feature' },
      ])).toThrow()
    })

    it('throws for non-existent parent', () => {
      expect(() => engine.decompose('T-X-001', [
        { name: 'X', description: 'D', category: 'api', level: 'microtask' },
      ])).toThrow()
    })
  })

  // -- Topological order ---------------------------------------------------

  describe('topologicalOrder', () => {
    it('orders a linear chain', () => {
      const t1 = engine.create({ name: 'T1', description: 'D', moduleId: 'M', category: 'api' })
      const t2 = engine.create({ name: 'T2', description: 'D', moduleId: 'M', category: 'ui', dependsOn: [t1.id] })
      const t3 = engine.create({ name: 'T3', description: 'D', moduleId: 'M', category: 'test', dependsOn: [t2.id] })
      const order = engine.topologicalOrder()
      expect(order.indexOf(t1.id)).toBeLessThan(order.indexOf(t2.id))
      expect(order.indexOf(t2.id)).toBeLessThan(order.indexOf(t3.id))
    })

    it('handles diamond dependencies', () => {
      const t1 = engine.create({ name: 'T1', description: 'D', moduleId: 'M', category: 'api' })
      const t2 = engine.create({ name: 'T2', description: 'D', moduleId: 'M', category: 'ui', dependsOn: [t1.id] })
      const t3 = engine.create({ name: 'T3', description: 'D', moduleId: 'M', category: 'doc', dependsOn: [t1.id] })
      const t4 = engine.create({ name: 'T4', description: 'D', moduleId: 'M', category: 'test', dependsOn: [t2.id, t3.id] })
      const order = engine.topologicalOrder()
      expect(order.indexOf(t1.id)).toBeLessThan(order.indexOf(t4.id))
    })
  })

  // -- Ready / Blocked -----------------------------------------------------

  describe('ready and blocked tasks', () => {
    it('finds ready tasks', () => {
      const t1 = engine.create({ name: 'T1', description: 'D', moduleId: 'M', category: 'api' })
      engine.create({ name: 'T2', description: 'D', moduleId: 'M', category: 'ui', dependsOn: [t1.id] })
      expect(engine.getReadyTasks()).toHaveLength(1)
      expect(engine.getReadyTasks()[0]!.id).toBe(t1.id)
    })

    it('unblocks tasks when deps complete', () => {
      const t1 = engine.create({ name: 'T1', description: 'D', moduleId: 'M', category: 'api' })
      const _t2 = engine.create({ name: 'T2', description: 'D', moduleId: 'M', category: 'ui', dependsOn: [t1.id] })
      engine.update(t1.id, { status: 'completed' })
      expect(engine.getReadyTasks()).toHaveLength(1)
      expect(engine.getReadyTasks()[0]!.id).toBe(_t2.id)
    })

    it('finds blocked tasks', () => {
      const t1 = engine.create({ name: 'T1', description: 'D', moduleId: 'M', category: 'api' })
      engine.create({ name: 'T2', description: 'D', moduleId: 'M', category: 'ui', dependsOn: [t1.id] })
      expect(engine.getBlockedTasks()).toHaveLength(1)
    })
  })

  // -- Tree -----------------------------------------------------------------

  describe('tree', () => {
    it('builds task tree from root', () => {
      const goal = engine.create({ name: 'Goal', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      const [sub] = engine.decompose(goal.id, [
        { name: 'Sub', description: 'D', category: 'api', level: 'subgoal' },
      ])
      const tree = engine.getTaskTree(goal.id)!
      expect(tree.id).toBe(goal.id)
      expect(tree.level).toBe('goal')
      expect(tree.children).toHaveLength(1)
      expect(tree.children[0]!.id).toBe(sub!.id)
    })

    it('builds full tree', () => {
      engine.create({ name: 'G1', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      engine.create({ name: 'G2', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      const trees = engine.getFullTree()
      expect(trees).toHaveLength(2)
    })

    it('returns undefined for non-existent task', () => {
      expect(engine.getTaskTree('T-X-001')).toBeUndefined()
    })
  })

  // -- Traceability ---------------------------------------------------------

  describe('traceability', () => {
    it('returns traceability chain for a microtask', () => {
      const goal = engine.create({
        name: 'Goal', description: 'D', moduleId: 'M', category: 'api', level: 'goal',
        traceability: { crId: 'CR-001', goalId: 'G-001' },
      })
      const micro = engine.create({
        name: 'Micro', description: 'D', moduleId: 'M', category: 'api', level: 'microtask',
        parentTaskId: goal.id,
        files: ['src/student.ts'],
      })
      const chain = engine.getTraceabilityChain(micro.id)
      expect(chain.taskId).toBe(micro.id)
      expect(chain.crId).toBe('CR-001')
      expect(chain.goalId).toBe('G-001')
      expect(chain.fileIds).toContain('src/student.ts')
    })

    it('inherits traceability from ancestors', () => {
      const goal = engine.create({
        name: 'Goal', description: 'D', moduleId: 'M', category: 'api', level: 'goal',
        traceability: { crId: 'CR-001' },
      })
      const sub = engine.create({
        name: 'Sub', description: 'D', moduleId: 'M', category: 'api', level: 'subgoal',
        parentTaskId: goal.id,
      })
      const feat = engine.create({
        name: 'Feat', description: 'D', moduleId: 'M', category: 'api', level: 'feature',
        parentTaskId: sub.id,
      })
      const chain = engine.getTraceabilityChain(feat.id)
      expect(chain.crId).toBe('CR-001') // inherited from goal
    })

    it('collects files from leaf children', () => {
      const goal = engine.create({
        name: 'G', description: 'D', moduleId: 'M', category: 'api', level: 'goal',
      })
      const elem = engine.create({
        name: 'E', description: 'D', moduleId: 'M', category: 'api', level: 'element',
        parentTaskId: goal.id,
      })
      engine.create({
        name: 'M1', description: 'D', moduleId: 'M', category: 'api', level: 'microtask',
        parentTaskId: elem.id, files: ['src/a.ts'],
      })
      engine.create({
        name: 'M2', description: 'D', moduleId: 'M', category: 'api', level: 'microtask',
        parentTaskId: elem.id, files: ['src/b.ts'],
      })
      const chain = engine.getTraceabilityChain(goal.id)
      expect(chain.fileIds).toContain('src/a.ts')
      expect(chain.fileIds).toContain('src/b.ts')
    })

    it('returns empty chain for non-existent task', () => {
      expect(engine.getTraceabilityChain('T-X-001')).toEqual({})
    })
  })

  // -- Validation ----------------------------------------------------------

  describe('validate', () => {
    it('returns no errors for clean graph', () => {
      engine.create({ name: 'T1', description: 'D', moduleId: 'M', category: 'api', goalIds: ['G1'] })
      const issues = engine.validate()
      expect(issues.filter(i => i.severity === 'error')).toHaveLength(0)
    })

    it('detects missing dependency targets', () => {
      engine.create({ name: 'T1', description: 'D', moduleId: 'M', category: 'api', dependsOn: ['T-X-999'] })
      const issues = engine.validate()
      expect(issues.some(i => i.type === 'missing-dependency')).toBe(true)
    })

    it('detects circular dependencies', () => {
      const t1 = engine.create({ name: 'T1', description: 'D', moduleId: 'M', category: 'api' })
      const t2 = engine.create({ name: 'T2', description: 'D', moduleId: 'M', category: 'ui', dependsOn: [t1.id] })
      const mutable = t1 as unknown as { dependsOn: string[] }
      mutable.dependsOn = [t2.id]
      const issues = engine.validate()
      expect(issues.some(i => i.type === 'circular-dependency')).toBe(true)
    })

    it('detects tasks with no goals', () => {
      engine.create({ name: 'T1', description: 'D', moduleId: 'M', category: 'api' })
      const issues = engine.validate()
      expect(issues.some(i => i.type === 'missing-goal' && i.severity === 'info')).toBe(true)
    })

    it('detects empty module', () => {
      const issues = engine.validate()
      expect(issues.some(i => i.type === 'empty-module')).toBe(true)
    })

    it('detects non-microtask without children', () => {
      engine.create({ name: 'Goal', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      const issues = engine.validate()
      expect(issues.some(i => i.type === 'non-microtask-no-children' && i.severity === 'error')).toBe(true)
    })

    it('does not flag microtask without children', () => {
      engine.create({ name: 'Micro', description: 'D', moduleId: 'M', category: 'api', level: 'microtask' })
      const issues = engine.validate()
      expect(issues.some(i => i.type === 'non-microtask-no-children')).toBe(false)
    })

    it('detects broken traceability on root', () => {
      engine.create({ name: 'Goal', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      const issues = engine.validate()
      expect(issues.some(i => i.type === 'broken-traceability' && i.severity === 'warning')).toBe(true)
    })

    it('no broken traceability when CR-ID present', () => {
      engine.create({
        name: 'Goal', description: 'D', moduleId: 'M', category: 'api', level: 'goal',
        traceability: { crId: 'CR-001' },
      })
      const issues = engine.validate()
      expect(issues.some(i => i.type === 'broken-traceability')).toBe(false)
    })
  })

  // -- Summary -------------------------------------------------------------

  describe('summary', () => {
    it('computes correct stats', () => {
      const t1 = engine.create({ name: 'T1', description: 'D', moduleId: 'M', category: 'api', effort: 'small' })
      engine.create({ name: 'T2', description: 'D', moduleId: 'M', category: 'ui', effort: 'large' })
      engine.update(t1.id, { status: 'completed' })
      const s = engine.summary()
      expect(s.total).toBe(2)
      expect(s.byStatus.completed).toBe(1)
      expect(s.byStatus.pending).toBe(1)
      expect(s.byCategory.api).toBe(1)
      expect(s.byEffort.small).toBe(1)
    })

    it('returns empty summary for no tasks', () => {
      const s = engine.summary()
      expect(s.total).toBe(0)
      expect(s.hierarchyDepth).toBe(0)
    })

    it('computes hierarchy depth', () => {
      const g = engine.create({ name: 'G', description: 'D', moduleId: 'M', category: 'api', level: 'goal' })
      const [sub] = engine.decompose(g.id, [{ name: 'S', description: 'D', category: 'api', level: 'subgoal' }])
      const [feat] = engine.decompose(sub!.id, [{ name: 'F', description: 'D', category: 'api', level: 'feature' }])
      const [elem] = engine.decompose(feat!.id, [{ name: 'E', description: 'D', category: 'api', level: 'element' }])
      engine.decompose(elem!.id, [{ name: 'M', description: 'D', category: 'api', level: 'microtask' }])
      const s = engine.summary()
      expect(s.hierarchyDepth).toBe(5)
      expect(s.byLevel.goal).toBe(1)
      expect(s.byLevel.subgoal).toBe(1)
      expect(s.byLevel.feature).toBe(1)
      expect(s.byLevel.element).toBe(1)
      expect(s.byLevel.microtask).toBe(1)
    })

    it('counts traceable tasks', () => {
      engine.create({ name: 'T1', description: 'D', moduleId: 'M', category: 'api', traceability: { crId: 'CR-1' } })
      engine.create({ name: 'T2', description: 'D', moduleId: 'M', category: 'api' })
      const s = engine.summary()
      expect(s.traceableCount).toBe(1)
    })
  })

  // -- Bulk operations -----------------------------------------------------

  describe('bulkCreate', () => {
    it('creates multiple tasks', () => {
      const tasks = engine.bulkCreate('MOD', [
        { name: 'T1', description: 'D', category: 'api' },
        { name: 'T2', description: 'D', category: 'ui' },
        { name: 'T3', description: 'D', category: 'test' },
      ])
      expect(tasks).toHaveLength(3)
      expect(engine.count).toBe(3)
    })
  })

  describe('clear', () => {
    it('clears all tasks', () => {
      engine.create({ name: 'T', description: 'D', moduleId: 'M', category: 'api' })
      engine.clear()
      expect(engine.count).toBe(0)
    })
  })
})

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

describe('Task Decomposition tools', () => {
  beforeEach(() => {
    resetEngine()
  })

  it('createCreateTaskTool has correct name', () => {
    expect(createCreateTaskTool().name).toBe('create_task')
  })

  it('createDecomposeTaskTool has correct name', () => {
    expect(createDecomposeTaskTool().name).toBe('decompose_task')
  })

  it('createUpdateTaskStatusTool has correct name', () => {
    expect(createUpdateTaskStatusTool().name).toBe('update_task_status')
  })

  it('createValidateTasksTool has correct name', () => {
    expect(createValidateTasksTool().name).toBe('validate_tasks')
  })

  it('createGetTaskSummaryTool has correct name', () => {
    expect(createGetTaskSummaryTool().name).toBe('get_task_summary')
  })

  it('createGetTaskExecutionOrderTool has correct name', () => {
    expect(createGetTaskExecutionOrderTool().name).toBe('get_task_execution_order')
  })

  it('createGetReadyTasksTool has correct name', () => {
    expect(createGetReadyTasksTool().name).toBe('get_ready_tasks')
  })

  it('createGetTaskTraceabilityTool has correct name', () => {
    expect(createGetTaskTraceabilityTool().name).toBe('get_task_traceability')
  })

  it('createGetTaskTreeTool has correct name', () => {
    expect(createGetTaskTreeTool().name).toBe('get_task_tree')
  })
})

describe('Tool lifecycle', () => {
  beforeEach(() => {
    resetEngine()
  })

  it('getActiveEngine returns undefined initially', () => {
    expect(getActiveEngine()).toBeUndefined()
  })

  it('resetEngine clears active engine', () => {
    const tool = createValidateTasksTool()
    tool.execute({}, {} as any)
    expect(getActiveEngine()).toBeDefined()
    resetEngine()
    expect(getActiveEngine()).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Full lifecycle — School ERP hierarchy
// ---------------------------------------------------------------------------

describe('full lifecycle — School ERP task decomposition', () => {
  let engine: TaskDecompositionEngine

  beforeEach(() => {
    engine = new TaskDecompositionEngine()
  })

  it('decomposes a complete Goal → Microtask chain with traceability', () => {
    // 1. Goal
    const goal = engine.create({
      name: 'Student Fee Management',
      description: 'Complete fee collection and receipt generation',
      moduleId: 'FEE',
      category: 'api',
      level: 'goal',
      traceability: { crId: 'CR-FEE-001', goalId: 'G-FEE-001' },
      goalIds: ['G-FEE-001'],
    })

    // 2. Sub-goals
    const [feeSetup, feeCollect] = engine.decompose(goal.id, [
      { name: 'Fee Structure Setup', description: 'Define fee categories and amounts', category: 'schema', level: 'subgoal' },
      { name: 'Fee Collection', description: 'Collect fees and generate receipts', category: 'api', level: 'subgoal' },
    ])

    // Decompose feeSetup → feature → element → microtask
    const [setupFeat] = engine.decompose(feeSetup!.id, [
      { name: 'Fee Category Schema', description: 'Define fee category table', category: 'schema', level: 'feature' },
    ])
    const [setupElem] = engine.decompose(setupFeat!.id, [
      { name: 'Fee Category Migration', description: 'Create fee_category table', category: 'schema', level: 'element' },
    ])
    engine.decompose(setupElem!.id, [
      { name: 'Write migration SQL', description: 'CREATE TABLE fee_category', category: 'schema', level: 'microtask', effort: 'tiny' },
    ])

    // 3. Features
    const [feeApi] = engine.decompose(feeCollect!.id, [
      { name: 'Fee Payment API', description: 'API endpoint for fee payment', category: 'api', level: 'feature' },
    ])

    // 4. Elements
    const [feeElement] = engine.decompose(feeApi!.id, [
      { name: 'Fee Controller', description: 'REST controller for fee operations', category: 'api', level: 'element' },
    ])

    // 5. Microtasks
    const [micro1] = engine.decompose(feeElement!.id, [
      { name: 'Create fee endpoint', description: 'POST /api/fees', category: 'api', level: 'microtask', effort: 'small' },
      { name: 'Create receipt endpoint', description: 'POST /api/receipts', category: 'api', level: 'microtask', effort: 'medium' },
    ])

    // Verify hierarchy
    expect(engine.count).toBe(10)
    expect(engine.getRoots()).toHaveLength(1)
    expect(engine.getMicrotasks()).toHaveLength(3) // 2 under feeElement + 1 under setupElem
    expect(engine.getLeaves()).toHaveLength(3) // 3 microtasks

    // Verify traceability chain
    const chain = engine.getTraceabilityChain(micro1!.id)
    expect(chain.taskId).toBe(micro1!.id)
    expect(chain.crId).toBe('CR-FEE-001')
    expect(chain.goalId).toBe('G-FEE-001')

    // Verify tree
    const tree = engine.getTaskTree(goal.id)!
    expect(tree.level).toBe('goal')
    expect(tree.children).toHaveLength(2)

    // Verify validation passes
    const issues = engine.validate()
    expect(issues.filter(i => i.severity === 'error')).toHaveLength(0)

    // Verify summary
    const summary = engine.summary()
    expect(summary.hierarchyDepth).toBe(5)
    expect(summary.byLevel.goal).toBe(1)
    expect(summary.byLevel.subgoal).toBe(2)
    expect(summary.byLevel.feature).toBe(2)
    expect(summary.byLevel.element).toBe(2)
    expect(summary.byLevel.microtask).toBe(3)
    expect(summary.traceableCount).toBeGreaterThanOrEqual(1)
  })

  it('CR-ID → Goal-ID → Element-ID → Task-ID → File → Test chain', () => {
    const goal = engine.create({
      name: 'Student Attendance',
      description: 'Track student attendance',
      moduleId: 'ATT',
      category: 'api',
      level: 'goal',
      traceability: { crId: 'CR-ATT-001', goalId: 'G-ATT-001' },
    })

    const [elem] = engine.decompose(goal.id, [
      { name: 'Attendance Service', description: 'Core attendance logic', category: 'api', level: 'subgoal' },
    ])
    const [feat] = engine.decompose(elem!.id, [
      { name: 'Mark Attendance', description: 'Mark attendance for a session', category: 'api', level: 'feature' },
    ])
    const [element] = engine.decompose(feat!.id, [
      { name: 'Attendance Controller', description: 'REST controller', category: 'api', level: 'element' },
    ])
    const [codeTask, testTask] = engine.decompose(element!.id, [
      { name: 'Implement attendance API', description: 'POST /api/attendance', category: 'api', level: 'microtask', files: ['src/attendance/controller.ts'] },
      { name: 'Write attendance tests', description: 'Unit tests for attendance', category: 'test', level: 'microtask', files: ['tests/attendance.test.ts'] },
    ])

    // Trace from code task
    const codeChain = engine.getTraceabilityChain(codeTask!.id)
    expect(codeChain.crId).toBe('CR-ATT-001')
    expect(codeChain.goalId).toBe('G-ATT-001')
    expect(codeChain.fileIds).toContain('src/attendance/controller.ts')

    // Trace from test task
    const testChain = engine.getTraceabilityChain(testTask!.id)
    expect(testChain.crId).toBe('CR-ATT-001')
    expect(testChain.fileIds).toContain('tests/attendance.test.ts')

    // Trace from goal — should collect all files
    const goalChain = engine.getTraceabilityChain(goal.id)
    expect(goalChain.fileIds).toContain('src/attendance/controller.ts')
    expect(goalChain.fileIds).toContain('tests/attendance.test.ts')
  })
})
