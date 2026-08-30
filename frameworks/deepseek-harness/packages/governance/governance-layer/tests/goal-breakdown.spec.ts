import { describe, expect, it, beforeEach } from 'vitest'
import { GoalBreakdownEngine } from '../src/goal-breakdown/engine.ts'
import { resetEngine } from '../src/goal-breakdown/tools.ts'
import { LEVEL_ORDER, LEVEL_LABELS, LEVEL_ICONS, STATUS_LABELS } from '../src/goal-breakdown/types.ts'
import type { BreakdownLevel, NodeStatus } from '../src/goal-breakdown/types.ts'

// ---------------------------------------------------------------------------
// Types Tests
// ---------------------------------------------------------------------------

describe('Goal Breakdown types', () => {
  it('LEVEL_ORDER has 8 levels', () => {
    expect(LEVEL_ORDER).toHaveLength(8)
  })

  it('LEVEL_ORDER starts with master-goal and ends with task', () => {
    expect(LEVEL_ORDER[0]).toBe('master-goal')
    expect(LEVEL_ORDER[7]).toBe('task')
  })

  it('LEVEL_LABELS covers all levels', () => {
    for (const level of LEVEL_ORDER) {
      expect(LEVEL_LABELS[level]).toBeDefined()
      expect(LEVEL_LABELS[level]).toContain('—')
    }
  })

  it('LEVEL_ICONS covers all levels', () => {
    for (const level of LEVEL_ORDER) {
      expect(LEVEL_ICONS[level]).toBeDefined()
    }
  })

  it('STATUS_LABELS covers all statuses', () => {
    const statuses: NodeStatus[] = ['pending', 'active', 'completed', 'blocked', 'deferred', 'cancelled']
    for (const status of statuses) {
      expect(STATUS_LABELS[status]).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// GoalBreakdownEngine Tests
// ---------------------------------------------------------------------------

describe('GoalBreakdownEngine', () => {
  let engine: GoalBreakdownEngine

  beforeEach(() => {
    resetEngine()
    engine = new GoalBreakdownEngine('MG-001', 'School ERP', 'Complete school management system')
  })

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------

  describe('constructor', () => {
    it('creates a tree with a root master-goal node', () => {
      const tree = engine.getTree()
      expect(tree.totalNodes).toBe(1)
      expect(tree.rootId).toBe('MG-001')
    })

    it('root node has master-goal level', () => {
      const root = engine.getRoot()
      expect(root.level).toBe('master-goal')
      expect(root.name).toBe('School ERP')
      expect(root.status).toBe('active')
    })

    it('root has no parent', () => {
      const root = engine.getRoot()
      expect(root.parentId).toBeUndefined()
    })

    it('root has empty children', () => {
      const root = engine.getRoot()
      expect(root.childrenIds).toHaveLength(0)
    })
  })

  // -----------------------------------------------------------------------
  // addNode
  // -----------------------------------------------------------------------

  describe('addNode', () => {
    it('adds a goal node', () => {
      const result = engine.addNode({
        level: 'goal',
        name: 'Student Management',
        description: 'Manage student data',
        parentId: 'MG-001',
      })
      expect(result.node.level).toBe('goal')
      expect(result.node.parentId).toBe('MG-001')
      expect(result.node.name).toBe('Student Management')
    })

    it('adds a module node', () => {
      engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      const result = engine.addNode({
        level: 'module',
        name: 'Student Master',
        description: 'Student registration',
        parentId: 'MG-001-G1',
      })
      expect(result.node.level).toBe('module')
    })

    it('adds all 8 levels deep', () => {
      const levels: BreakdownLevel[] = ['goal', 'module', 'sub-module', 'feature', 'workflow', 'element', 'task']
      let parentId = 'MG-001'
      for (const level of levels) {
        const result = engine.addNode({
          level,
          name: `${level} node`,
          description: `Description for ${level}`,
          parentId,
        })
        expect(result.node.level).toBe(level)
        expect(result.node.parentId).toBe(parentId)
        parentId = result.node.id
      }

      const tree = engine.getTree()
      expect(tree.totalNodes).toBe(8) // root + 7 children
    })

    it('generates sequential IDs', () => {
      engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.addNode({ level: 'goal', name: 'G2', description: 'Goal 2', parentId: 'MG-001' })
      engine.addNode({ level: 'goal', name: 'G3', description: 'Goal 3', parentId: 'MG-001' })

      const children = engine.getChildren('MG-001')
      expect(children).toHaveLength(3)
      expect(children[0]!.id).toContain('-G1')
      expect(children[1]!.id).toContain('-G2')
      expect(children[2]!.id).toContain('-G3')
    })

    it('updates parent children list', () => {
      engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.addNode({ level: 'goal', name: 'G2', description: 'Goal 2', parentId: 'MG-001' })

      const root = engine.getRoot()
      expect(root.childrenIds).toHaveLength(2)
    })

    it('sets default status to pending', () => {
      const result = engine.addNode({
        level: 'goal',
        name: 'G1',
        description: 'Goal 1',
        parentId: 'MG-001',
      })
      expect(result.node.status).toBe('pending')
    })

    it('sets default priority to 3', () => {
      const result = engine.addNode({
        level: 'goal',
        name: 'G1',
        description: 'Goal 1',
        parentId: 'MG-001',
      })
      expect(result.node.priority).toBe(3)
    })

    it('sets default effort to medium', () => {
      const result = engine.addNode({
        level: 'goal',
        name: 'G1',
        description: 'Goal 1',
        parentId: 'MG-001',
      })
      expect(result.node.effort).toBe('medium')
    })

    it('accepts custom priority and effort', () => {
      const result = engine.addNode({
        level: 'goal',
        name: 'G1',
        description: 'Goal 1',
        parentId: 'MG-001',
        priority: 1,
        effort: 'small',
      })
      expect(result.node.priority).toBe(1)
      expect(result.node.effort).toBe('small')
    })

    it('records tags', () => {
      const result = engine.addNode({
        level: 'goal',
        name: 'G1',
        description: 'Goal 1',
        parentId: 'MG-001',
        tags: ['fees', 'module'],
      })
      expect(result.node.tags).toEqual(['fees', 'module'])
    })

    it('records dependencies', () => {
      const g1 = engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      const g2 = engine.addNode({
        level: 'goal',
        name: 'G2',
        description: 'Goal 2',
        parentId: 'MG-001',
        dependencies: [g1.node.id],
      })
      expect(g2.node.dependencies).toEqual([g1.node.id])
    })

    it('records acceptance criteria', () => {
      const result = engine.addNode({
        level: 'goal',
        name: 'G1',
        description: 'Goal 1',
        parentId: 'MG-001',
        acceptanceCriteria: ['AC-001: Student can register'],
      })
      expect(result.node.acceptanceCriteria).toEqual(['AC-001: Student can register'])
    })

    it('includes message with icon and label', () => {
      const result = engine.addNode({
        level: 'goal',
        name: 'G1',
        description: 'Goal 1',
        parentId: 'MG-001',
      })
      expect(result.message).toContain('🏁')
      expect(result.message).toContain('GOAL')
    })

    // Error cases
    it('throws on adding master-goal', () => {
      expect(() => engine.addNode({
        level: 'master-goal',
        name: 'Second',
        description: 'Duplicate',
      })).toThrow('Cannot add a second master-goal')
    })

    it('throws on missing parent ID', () => {
      expect(() => engine.addNode({
        level: 'goal',
        name: 'G1',
        description: 'Goal 1',
      })).toThrow('Parent ID is required')
    })

    it('throws on non-existent parent', () => {
      expect(() => engine.addNode({
        level: 'goal',
        name: 'G1',
        description: 'Goal 1',
        parentId: 'NON-EXISTENT',
      })).toThrow('not found')
    })

    it('throws on invalid level hierarchy', () => {
      expect(() => engine.addNode({
        level: 'task',
        name: 'T1',
        description: 'Task 1',
        parentId: 'MG-001',
      })).toThrow('Invalid level hierarchy')
    })

    it('throws on adding child to task node', () => {
      // Build a chain to task level.
      let parentId = 'MG-001'
      for (const level of ['goal', 'module', 'sub-module', 'feature', 'workflow', 'element', 'task'] as const) {
        const result = engine.addNode({ level, name: `${level}-1`, description: `desc`, parentId })
        parentId = result.node.id
      }

      // The hierarchy check fires first: task cannot be child of task.
      expect(() => engine.addNode({
        level: 'task' as BreakdownLevel,
        name: 'T2',
        description: 'Cannot add child to task',
        parentId,
      })).toThrow('Invalid level hierarchy')
    })

    it('throws on non-existent dependency', () => {
      expect(() => engine.addNode({
        level: 'goal',
        name: 'G1',
        description: 'Goal 1',
        parentId: 'MG-001',
        dependencies: ['NON-EXISTENT'],
      })).toThrow('Dependency node "NON-EXISTENT" not found')
    })

    it('accepts valid dependency', () => {
      const g1 = engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      expect(() => engine.addNode({
        level: 'goal',
        name: 'G2',
        description: 'Goal 2',
        parentId: 'MG-001',
        dependencies: [g1.node.id],
      })).not.toThrow()
    })
  })

  // -----------------------------------------------------------------------
  // updateStatus
  // -----------------------------------------------------------------------

  describe('updateStatus', () => {
    it('transitions pending → active', () => {
      const g1 = engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      const updated = engine.updateStatus(g1.node.id, 'active')
      expect(updated.status).toBe('active')
    })

    it('transitions active → completed', () => {
      const g1 = engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.updateStatus(g1.node.id, 'active')
      const completed = engine.updateStatus(g1.node.id, 'completed')
      expect(completed.status).toBe('completed')
    })

    it('transitions active → blocked', () => {
      const g1 = engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.updateStatus(g1.node.id, 'active')
      const blocked = engine.updateStatus(g1.node.id, 'blocked')
      expect(blocked.status).toBe('blocked')
    })

    it('transitions blocked → active', () => {
      const g1 = engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.updateStatus(g1.node.id, 'active')
      engine.updateStatus(g1.node.id, 'blocked')
      const active = engine.updateStatus(g1.node.id, 'active')
      expect(active.status).toBe('active')
    })

    it('transitions pending → deferred', () => {
      const g1 = engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      const deferred = engine.updateStatus(g1.node.id, 'deferred')
      expect(deferred.status).toBe('deferred')
    })

    it('transitions deferred → pending', () => {
      const g1 = engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.updateStatus(g1.node.id, 'deferred')
      const pending = engine.updateStatus(g1.node.id, 'pending')
      expect(pending.status).toBe('pending')
    })

    it('transitions pending → cancelled', () => {
      const g1 = engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      const cancelled = engine.updateStatus(g1.node.id, 'cancelled')
      expect(cancelled.status).toBe('cancelled')
    })

    it('throws on completed → any', () => {
      const g1 = engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.updateStatus(g1.node.id, 'active')
      engine.updateStatus(g1.node.id, 'completed')
      expect(() => engine.updateStatus(g1.node.id, 'active')).toThrow('Cannot change status')
    })

    it('throws on cancelled → any', () => {
      const g1 = engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.updateStatus(g1.node.id, 'cancelled')
      expect(() => engine.updateStatus(g1.node.id, 'active')).toThrow('Cannot change status')
    })

    it('throws on invalid transition pending → completed', () => {
      const g1 = engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      expect(() => engine.updateStatus(g1.node.id, 'completed')).toThrow('Invalid status transition')
    })

    it('throws on non-existent node', () => {
      expect(() => engine.updateStatus('NON-EXISTENT', 'active')).toThrow('not found')
    })

    it('updates tree snapshot', () => {
      const g1 = engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.updateStatus(g1.node.id, 'active')

      const tree = engine.getTree()
      expect(tree.byStatus.active).toBe(2) // root + g1
    })
  })

  // -----------------------------------------------------------------------
  // getChildren / getDescendants / getPath
  // -----------------------------------------------------------------------

  describe('tree traversal', () => {
    beforeEach(() => {
      // Build a small tree:
      // MG-001
      //   ├─ G1 (MG-001-G1)
      //   │   ├─ M1 (MG-001-G1-M1)
      //   │   └─ M2 (MG-001-G1-M2)
      //   └─ G2 (MG-001-G2)
      engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.addNode({ level: 'goal', name: 'G2', description: 'Goal 2', parentId: 'MG-001' })
      engine.addNode({ level: 'module', name: 'M1', description: 'Module 1', parentId: 'MG-001-G1' })
      engine.addNode({ level: 'module', name: 'M2', description: 'Module 2', parentId: 'MG-001-G1' })
    })

    it('getChildren returns direct children', () => {
      const children = engine.getChildren('MG-001')
      expect(children).toHaveLength(2)
      expect(children.map(c => c.name)).toEqual(['G1', 'G2'])
    })

    it('getChildren returns empty for leaf', () => {
      const children = engine.getChildren('MG-001-G2')
      expect(children).toHaveLength(0)
    })

    it('getChildren returns empty for non-existent', () => {
      const children = engine.getChildren('NON-EXISTENT')
      expect(children).toHaveLength(0)
    })

    it('getDescendants returns all descendants', () => {
      const descendants = engine.getDescendants('MG-001')
      expect(descendants).toHaveLength(4) // G1, G2, M1, M2
    })

    it('getDescendants returns only subtree', () => {
      const descendants = engine.getDescendants('MG-001-G1')
      expect(descendants).toHaveLength(2) // M1, M2
    })

    it('getDescendants returns empty for leaf', () => {
      const descendants = engine.getDescendants('MG-001-G2')
      expect(descendants).toHaveLength(0)
    })

    it('getPath returns path from root', () => {
      const path = engine.getPath('MG-001-G1-M1')
      expect(path).toHaveLength(3)
      expect(path.map(n => n.id)).toEqual(['MG-001', 'MG-001-G1', 'MG-001-G1-M1'])
    })

    it('getPath returns single node for root', () => {
      const path = engine.getPath('MG-001')
      expect(path).toHaveLength(1)
      expect(path[0]!.id).toBe('MG-001')
    })
  })

  // -----------------------------------------------------------------------
  // traverseDFS
  // -----------------------------------------------------------------------

  describe('traverseDFS', () => {
    it('traverses entire tree', () => {
      engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.addNode({ level: 'goal', name: 'G2', description: 'Goal 2', parentId: 'MG-001' })

      const traversal = engine.traverseDFS()
      expect(traversal).toHaveLength(3)
      expect(traversal[0]!.node.id).toBe('MG-001')
      expect(traversal[0]!.depth).toBe(0)
    })

    it('reports correct depth', () => {
      engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.addNode({ level: 'module', name: 'M1', description: 'Module 1', parentId: 'MG-001-G1' })

      const traversal = engine.traverseDFS()
      const g1 = traversal.find(t => t.node.id === 'MG-001-G1')
      const m1 = traversal.find(t => t.node.id === 'MG-001-G1-M1')
      expect(g1!.depth).toBe(1)
      expect(m1!.depth).toBe(2)
    })

    it('traverses from a subtree', () => {
      engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.addNode({ level: 'module', name: 'M1', description: 'Module 1', parentId: 'MG-001-G1' })

      const traversal = engine.traverseDFS('MG-001-G1')
      expect(traversal).toHaveLength(2)
      expect(traversal[0]!.node.id).toBe('MG-001-G1')
    })
  })

  // -----------------------------------------------------------------------
  // query
  // -----------------------------------------------------------------------

  describe('query', () => {
    beforeEach(() => {
      engine.addNode({ level: 'goal', name: 'Student Management', description: 'Manage students', parentId: 'MG-001', tags: ['student'] })
      engine.addNode({ level: 'goal', name: 'Fee Management', description: 'Manage fees', parentId: 'MG-001', tags: ['fees'] })
      engine.addNode({ level: 'module', name: 'Student Master', description: 'Student registration', parentId: 'MG-001-G1', tags: ['student'] })
    })

    it('filters by level', () => {
      const results = engine.query({ level: 'goal' })
      expect(results).toHaveLength(2)
    })

    it('filters by status', () => {
      engine.updateStatus('MG-001-G1', 'active')
      const results = engine.query({ status: 'active' })
      // root is 'active' + G1 is 'active' = 2
      expect(results).toHaveLength(2)
      expect(results.map(n => n.id)).toContain('MG-001-G1')
    })

    it('filters by tag', () => {
      const results = engine.query({ tag: 'fees' })
      expect(results).toHaveLength(1)
      expect(results[0]!.name).toBe('Fee Management')
    })

    it('filters by parent', () => {
      const results = engine.query({ parentId: 'MG-001-G1' })
      expect(results).toHaveLength(1)
      expect(results[0]!.name).toBe('Student Master')
    })

    it('searches by name', () => {
      const results = engine.query({ search: 'Student' })
      expect(results).toHaveLength(2) // Student Management + Student Master
    })

    it('searches by description', () => {
      const results = engine.query({ search: 'registration' })
      expect(results).toHaveLength(1)
    })

    it('applies limit', () => {
      const results = engine.query({ limit: 2 })
      expect(results).toHaveLength(2)
    })

    it('combines filters', () => {
      const results = engine.query({ level: 'goal', tag: 'student' })
      expect(results).toHaveLength(1)
      expect(results[0]!.name).toBe('Student Management')
    })

    it('returns all when no filter', () => {
      const results = engine.query({})
      // 1 root + 3 children = 4 total nodes.
      expect(results).toHaveLength(4)
    })
  })

  // -----------------------------------------------------------------------
  // getSummary
  // -----------------------------------------------------------------------

  describe('getSummary', () => {
    it('reports total nodes', () => {
      engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      const summary = engine.getSummary()
      expect(summary.totalNodes).toBe(2)
    })

    it('computes byLevel', () => {
      engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.addNode({ level: 'goal', name: 'G2', description: 'Goal 2', parentId: 'MG-001' })
      engine.addNode({ level: 'module', name: 'M1', description: 'Module 1', parentId: 'MG-001-G1' })

      const summary = engine.getSummary()
      expect(summary.byLevel['master-goal']).toBe(1)
      expect(summary.byLevel['goal']).toBe(2)
      expect(summary.byLevel['module']).toBe(1)
    })

    it('computes byStatus', () => {
      engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.updateStatus('MG-001-G1', 'active')
      engine.updateStatus('MG-001-G1', 'completed')

      const summary = engine.getSummary()
      expect(summary.byStatus.active).toBe(1) // root
      expect(summary.byStatus.completed).toBe(1) // G1
    })

    it('computes effortScore', () => {
      engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001', effort: 'small' })
      engine.addNode({ level: 'goal', name: 'G2', description: 'Goal 2', parentId: 'MG-001', effort: 'large' })

      const summary = engine.getSummary()
      // root(large=3) + G1(small=1) + G2(large=3) = 7
      expect(summary.effortScore).toBe(7)
    })

    it('computes criticalPathLength', () => {
      // Build deep chain: MG → G1 → M1 → SM1 → F1 → W1 → E1 → T1
      let parentId = 'MG-001'
      for (const level of ['goal', 'module', 'sub-module', 'feature', 'workflow', 'element', 'task'] as const) {
        const result = engine.addNode({ level, name: `${level}-1`, description: 'desc', parentId })
        parentId = result.node.id
      }

      const summary = engine.getSummary()
      expect(summary.criticalPathLength).toBe(7) // depth from root to task
    })
  })

  // -----------------------------------------------------------------------
  // toMarkdown
  // -----------------------------------------------------------------------

  describe('toMarkdown', () => {
    it('generates markdown for root-only tree', () => {
      const md = engine.toMarkdown()
      expect(md).toContain('Goal Breakdown Tree')
      expect(md).toContain('School ERP')
      expect(md).toContain('Total Nodes:** 1')
    })

    it('generates markdown with children', () => {
      engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.addNode({ level: 'module', name: 'M1', description: 'Module 1', parentId: 'MG-001-G1' })

      const md = engine.toMarkdown()
      expect(md).toContain('G1')
      expect(md).toContain('M1')
      expect(md).toContain('MG-001')
    })

    it('shows status labels', () => {
      engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      engine.updateStatus('MG-001-G1', 'active')

      const md = engine.toMarkdown()
      expect(md).toContain('Active')
    })
  })

  // -----------------------------------------------------------------------
  // Full lifecycle — School ERP scenario
  // -----------------------------------------------------------------------

  describe('full lifecycle — School ERP', () => {
    it('builds a complete breakdown tree', () => {
      // Master Goal (root)
      // Goal: Student Management
      //   Module: Student Master
      //     Sub-Module: Registration
      //       Feature: Add Student
      //         Workflow: Fill Form
      //           Element: Form Fields
      //             Task: Validate Name
      const g1 = engine.addNode({
        level: 'goal', name: 'Student Management', description: 'Manage student data',
        parentId: 'MG-001', priority: 1, effort: 'large',
        tags: ['student'], acceptanceCriteria: ['All students can be registered'],
      })

      const m1 = engine.addNode({
        level: 'module', name: 'Student Master', description: 'Student registration module',
        parentId: g1.node.id, priority: 1,
      })

      const sm1 = engine.addNode({
        level: 'sub-module', name: 'Registration', description: 'Student registration flow',
        parentId: m1.node.id,
      })

      const f1 = engine.addNode({
        level: 'feature', name: 'Add Student', description: 'Add a new student',
        parentId: sm1.node.id,
      })

      const w1 = engine.addNode({
        level: 'workflow', name: 'Fill Form', description: 'Fill student details form',
        parentId: f1.node.id,
      })

      const e1 = engine.addNode({
        level: 'element', name: 'Form Fields', description: 'Input fields for student data',
        parentId: w1.node.id,
      })

      const t1 = engine.addNode({
        level: 'task', name: 'Validate Name', description: 'Validate student name field',
        parentId: e1.node.id, effort: 'small',
        acceptanceCriteria: ['Name is non-empty', 'Name is 2-100 chars'],
      })

      // Verify tree structure
      const tree = engine.getTree()
      expect(tree.totalNodes).toBe(8)
      expect(tree.byLevel['master-goal']).toBe(1)
      expect(tree.byLevel['goal']).toBe(1)
      expect(tree.byLevel['module']).toBe(1)
      expect(tree.byLevel['sub-module']).toBe(1)
      expect(tree.byLevel['feature']).toBe(1)
      expect(tree.byLevel['workflow']).toBe(1)
      expect(tree.byLevel['element']).toBe(1)
      expect(tree.byLevel['task']).toBe(1)

      // Verify path
      const path = engine.getPath(t1.node.id)
      expect(path).toHaveLength(8)
      expect(path.map(n => n.level)).toEqual(LEVEL_ORDER)

      // Verify DFS traversal
      const traversal = engine.traverseDFS()
      expect(traversal).toHaveLength(8)
      expect(traversal[0]!.depth).toBe(0)
      expect(traversal[7]!.depth).toBe(7)

      // Verify critical path
      const summary = engine.getSummary()
      expect(summary.criticalPathLength).toBe(7)

      // Mark task complete
      engine.updateStatus(t1.node.id, 'active')
      engine.updateStatus(t1.node.id, 'completed')

      const updated = engine.getNode(t1.node.id)
      expect(updated!.status).toBe('completed')

      // Verify markdown output
      const md = engine.toMarkdown()
      expect(md).toContain('Validate Name')
      expect(md).toContain('Completed')
    })
  })

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles multiple children at same level', () => {
      for (let i = 1; i <= 5; i++) {
        engine.addNode({ level: 'goal', name: `G${i}`, description: `Goal ${i}`, parentId: 'MG-001' })
      }
      expect(engine.getChildren('MG-001')).toHaveLength(5)
    })

    it('handles branching at multiple levels', () => {
      const g1 = engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      const g2 = engine.addNode({ level: 'goal', name: 'G2', description: 'Goal 2', parentId: 'MG-001' })
      engine.addNode({ level: 'module', name: 'M1', description: 'Module 1', parentId: g1.node.id })
      engine.addNode({ level: 'module', name: 'M2', description: 'Module 2', parentId: g1.node.id })
      engine.addNode({ level: 'module', name: 'M3', description: 'Module 3', parentId: g2.node.id })

      expect(engine.getDescendants('MG-001')).toHaveLength(5)
      expect(engine.getDescendants(g1.node.id)).toHaveLength(2)
      expect(engine.getDescendants(g2.node.id)).toHaveLength(1)
    })

    it('query returns empty for non-matching', () => {
      const results = engine.query({ level: 'task' })
      expect(results).toHaveLength(0)
    })

    it('getNode returns undefined for non-existent', () => {
      expect(engine.getNode('NON-EXISTENT')).toBeUndefined()
    })

    it('tree snapshot is independent', () => {
      const tree1 = engine.getTree()
      engine.addNode({ level: 'goal', name: 'G1', description: 'Goal 1', parentId: 'MG-001' })
      const tree2 = engine.getTree()
      expect(tree1.totalNodes).toBe(1)
      expect(tree2.totalNodes).toBe(2)
    })
  })
})
