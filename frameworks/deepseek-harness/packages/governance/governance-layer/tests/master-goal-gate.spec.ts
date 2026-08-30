import { describe, expect, it } from 'vitest'
import { MasterGoalEngine } from '../src/master-goal-gate/engine.ts'
import { formatModuleStatus, getModuleStatusText } from '../src/master-goal-gate/status.ts'
import type { GoalDecompositionInput } from '../src/master-goal-gate/types.ts'

// ---------------------------------------------------------------------------
// Engine: Input Validation
// ---------------------------------------------------------------------------

describe('MasterGoalEngine', () => {
  const engine = new MasterGoalEngine()

  describe('input validation', () => {
    it('throws on empty modules list', () => {
      expect(() => engine.decompose({
        objective: 'test',
        modules: [],
      })).toThrow('at least one module is required')
    })

    it('throws on duplicate module ids', () => {
      expect(() => engine.decompose({
        objective: 'test',
        modules: [
          { id: 'a', name: 'A', domain: 'D1' },
          { id: 'a', name: 'A2', domain: 'D1' },
        ],
      })).toThrow('duplicate module id "a"')
    })

    it('throws on unknown dependency reference', () => {
      expect(() => engine.decompose({
        objective: 'test',
        modules: [
          { id: 'a', name: 'A', domain: 'D1', dependsOn: ['nonexistent'] },
        ],
      })).toThrow('depends on unknown module "nonexistent"')
    })

    it('throws on missing required fields', () => {
      expect(() => engine.decompose({
        objective: 'test',
        modules: [
          { id: '', name: 'A', domain: 'D1' },
        ],
      })).toThrow('missing required fields')
    })

    it('throws on missing name', () => {
      expect(() => engine.decompose({
        objective: 'test',
        modules: [
          { id: 'a', name: '', domain: 'D1' },
        ],
      })).toThrow('missing required fields')
    })

    it('throws on missing domain', () => {
      expect(() => engine.decompose({
        objective: 'test',
        modules: [
          { id: 'a', name: 'A', domain: '' },
        ],
      })).toThrow('missing required fields')
    })
  })

  // -----------------------------------------------------------------------
  // Graph Construction & Topological Sort
  // -----------------------------------------------------------------------

  describe('topological sort', () => {
    it('sorts a linear dependency chain', () => {
      const result = engine.decompose({
        objective: 'linear chain',
        modules: [
          { id: 'c', name: 'C', domain: 'D', dependsOn: ['b'] },
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
        ],
      })

      // a → b → c
      expect(result.topologicalOrder).toEqual(['a', 'b', 'c'])
    })

    it('sorts independent modules alphabetically', () => {
      const result = engine.decompose({
        objective: 'independent',
        modules: [
          { id: 'z', name: 'Z', domain: 'D' },
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'm', name: 'M', domain: 'D' },
        ],
      })

      expect(result.topologicalOrder).toEqual(['a', 'm', 'z'])
    })

    it('sorts a diamond dependency graph', () => {
      // a → b, a → c, b → d, c → d
      const result = engine.decompose({
        objective: 'diamond',
        modules: [
          { id: 'd', name: 'D', domain: 'D', dependsOn: ['b', 'c'] },
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'c', name: 'C', domain: 'D', dependsOn: ['a'] },
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
        ],
      })

      // a must be first, d must be last. b and c can be in any order.
      expect(result.topologicalOrder[0]).toBe('a')
      expect(result.topologicalOrder[3]).toBe('d')
      expect(result.topologicalOrder).toContain('b')
      expect(result.topologicalOrder).toContain('c')
    })

    it('detects cycles', () => {
      expect(() => engine.decompose({
        objective: 'cycle',
        modules: [
          { id: 'a', name: 'A', domain: 'D', dependsOn: ['b'] },
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
        ],
      })).toThrow('cycle detected')
    })

    it('detects self-referencing cycle', () => {
      // Direct self-reference is caught by validation (unknown module "a" in dependsOn).
      // But a 3-way cycle is caught by topological sort.
      expect(() => engine.decompose({
        objective: '3-cycle',
        modules: [
          { id: 'a', name: 'A', domain: 'D', dependsOn: ['c'] },
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
          { id: 'c', name: 'C', domain: 'D', dependsOn: ['b'] },
        ],
      })).toThrow('cycle detected')
    })
  })

  // -----------------------------------------------------------------------
  // Domain Extraction
  // -----------------------------------------------------------------------

  describe('domain extraction', () => {
    it('groups modules into domains', () => {
      const result = engine.decompose({
        objective: 'domains',
        modules: [
          { id: 's1', name: 'S1', domain: 'Student' },
          { id: 's2', name: 'S2', domain: 'Student' },
          { id: 'f1', name: 'F1', domain: 'Fees' },
          { id: 'a1', name: 'A1', domain: 'Attendance' },
        ],
      })

      expect(result.domains).toHaveLength(3)
      const names = result.domains.map(d => d.name)
      expect(names).toEqual(['Attendance', 'Fees', 'Student']) // alphabetical
    })

    it('preserves topological order within domains', () => {
      const result = engine.decompose({
        objective: 'domain order',
        modules: [
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
          { id: 'a', name: 'A', domain: 'D' },
        ],
      })

      expect(result.domains[0]?.moduleIds).toEqual(['a', 'b'])
    })
  })

  // -----------------------------------------------------------------------
  // Dependency Graph
  // -----------------------------------------------------------------------

  describe('dependency graph', () => {
    it('builds forward and reverse edges', () => {
      const result = engine.decompose({
        objective: 'graph',
        modules: [
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
          { id: 'c', name: 'C', domain: 'D', dependsOn: ['a', 'b'] },
        ],
      })

      // Forward: what does each module depend on?
      expect(result.graph.forward['a']).toEqual([])
      expect(result.graph.forward['b']).toEqual(['a'])
      expect(result.graph.forward['c']).toEqual(['a', 'b'])

      // Reverse: what depends on each module?
      expect(result.graph.reverse['a']).toEqual(['b', 'c'])
      expect(result.graph.reverse['b']).toEqual(['c'])
      expect(result.graph.reverse['c']).toEqual([])
    })
  })

  // -----------------------------------------------------------------------
  // Critical Path
  // -----------------------------------------------------------------------

  describe('critical path', () => {
    it('ranks modules by downstream reachability', () => {
      // a → b → c → d (linear chain)
      const result = engine.decompose({
        objective: 'critical path',
        modules: [
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
          { id: 'c', name: 'C', domain: 'D', dependsOn: ['b'] },
          { id: 'd', name: 'D', domain: 'D', dependsOn: ['c'] },
        ],
      })

      // a unlocks 3 (b, c, d), b unlocks 2 (c, d), c unlocks 1 (d), d unlocks 0.
      expect(result.moduleMap['a']?.criticality).toBe(3)
      expect(result.moduleMap['b']?.criticality).toBe(2)
      expect(result.moduleMap['c']?.criticality).toBe(1)
      expect(result.moduleMap['d']?.criticality).toBe(0)

      // Critical path: a → b → c → d
      expect(result.criticalPath).toEqual(['a', 'b', 'c', 'd'])
    })

    it('handles diamond graph criticality', () => {
      // a → b, a → c, b → d, c → d
      const result = engine.decompose({
        objective: 'diamond criticality',
        modules: [
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
          { id: 'c', name: 'C', domain: 'D', dependsOn: ['a'] },
          { id: 'd', name: 'D', domain: 'D', dependsOn: ['b', 'c'] },
        ],
      })

      // a unlocks 3 (b, c, d), b unlocks 1 (d), c unlocks 1 (d), d unlocks 0.
      expect(result.moduleMap['a']?.criticality).toBe(3)
      expect(result.moduleMap['b']?.criticality).toBe(1)
      expect(result.moduleMap['c']?.criticality).toBe(1)
      expect(result.moduleMap['d']?.criticality).toBe(0)
    })
  })

  // -----------------------------------------------------------------------
  // Module Status Resolution
  // -----------------------------------------------------------------------

  describe('module status resolution', () => {
    it('marks modules with no deps as active', () => {
      const result = engine.decompose({
        objective: 'no deps',
        modules: [
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'b', name: 'B', domain: 'D' },
        ],
      })

      expect(result.activeModules).toEqual(['a', 'b'])
      expect(result.lockedModules).toEqual([])
    })

    it('marks dependent modules as locked when deps are not completed', () => {
      const result = engine.decompose({
        objective: 'locked',
        modules: [
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
        ],
      })

      expect(result.activeModules).toEqual(['a'])
      expect(result.lockedModules).toEqual(['b'])
    })

    it('unlocks modules when their deps are completed', () => {
      const result = engine.decompose({
        objective: 'unlock',
        modules: [
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
          { id: 'c', name: 'C', domain: 'D', dependsOn: ['b'] },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any, new Set(['a']))

      expect(result.activeModules).toEqual(['b'])
      expect(result.lockedModules).toEqual(['c'])
    })

    it('marks completed modules', () => {
      const result = engine.decompose({
        objective: 'completed',
        modules: [
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any, new Set(['a', 'b']))

      expect(result.moduleMap['a']?.status).toBe('completed')
      expect(result.moduleMap['b']?.status).toBe('completed')
      expect(result.activeModules).toEqual([])
      expect(result.lockedModules).toEqual([])
    })

    it('marks skipped modules', () => {
      const result = engine.decompose({
        objective: 'skipped',
        modules: [
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'b', name: 'B', domain: 'D' },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any, new Set(), new Set(['b']))

      expect(result.moduleMap['a']?.status).toBe('active')
      expect(result.moduleMap['b']?.status).toBe('skipped')
    })

    it('unlocks all downstream when entire chain is completed', () => {
      const result = engine.decompose({
        objective: 'full chain completed',
        modules: [
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
          { id: 'c', name: 'C', domain: 'D', dependsOn: ['b'] },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any, new Set(['a', 'b', 'c']))

      for (const id of ['a', 'b', 'c']) {
        expect(result.moduleMap[id]?.status).toBe('completed')
      }
    })
  })

  // -----------------------------------------------------------------------
  // School ERP Example (real-world scenario)
  // -----------------------------------------------------------------------

  describe('School ERP example', () => {
    const schoolERP: GoalDecompositionInput = {
      objective: 'School ERP बनाओ',
      goalId: 'school-erp-001',
      modules: [
        { id: 'student-master', name: 'Student Master', domain: 'Student' },
        { id: 'enrollment', name: 'Enrollment', domain: 'Student', dependsOn: ['student-master'] },
        { id: 'fees', name: 'Fees', domain: 'Fees', dependsOn: ['enrollment'] },
        { id: 'attendance', name: 'Attendance', domain: 'Attendance', dependsOn: ['enrollment'] },
        { id: 'exam', name: 'Exam', domain: 'Exam', dependsOn: ['student-master'] },
        { id: 'documents', name: 'Documents', domain: 'Documents' },
      ],
    }

    it('decomposes correctly', () => {
      const result = engine.decompose(schoolERP)

      expect(result.objective).toBe('School ERP बनाओ')
      expect(result.goalId).toBe('school-erp-001')
      expect(result.domains).toHaveLength(5) // Attendance, Documents, Exam, Fees, Student
    })

    it('identifies active modules', () => {
      const result = engine.decompose(schoolERP)

      // student-master has no deps → active
      // documents has no deps → active
      expect(result.activeModules).toContain('student-master')
      expect(result.activeModules).toContain('documents')
    })

    it('identifies locked modules', () => {
      const result = engine.decompose(schoolERP)

      // enrollment depends on student-master → locked
      expect(result.lockedModules).toContain('enrollment')
      // fees depends on enrollment → locked
      expect(result.lockedModules).toContain('fees')
      // attendance depends on enrollment → locked
      expect(result.lockedModules).toContain('attendance')
      // exam depends on student-master → locked
      expect(result.lockedModules).toContain('exam')
    })

    it('topological order respects dependencies', () => {
      const result = engine.decompose(schoolERP)

      const order = result.topologicalOrder
      const idxA = order.indexOf('student-master')
      const idxE = order.indexOf('enrollment')
      const idxF = order.indexOf('fees')
      const idxAt = order.indexOf('attendance')
      const idxEx = order.indexOf('exam')

      // student-master before enrollment
      expect(idxA).toBeLessThan(idxE)
      // enrollment before fees
      expect(idxE).toBeLessThan(idxF)
      // enrollment before attendance
      expect(idxE).toBeLessThan(idxAt)
      // student-master before exam
      expect(idxA).toBeLessThan(idxEx)
    })

    it('critical path starts with student-master', () => {
      const result = engine.decompose(schoolERP)

      // student-master unlocks: enrollment, exam, fees, attendance (4 downstream)
      // enrollment unlocks: fees, attendance (2 downstream)
      // exam unlocks: 0 (nothing depends on it)
      // documents unlocks: 0
      expect(result.moduleMap['student-master']?.criticality).toBe(4)
      expect(result.moduleMap['enrollment']?.criticality).toBe(2)
      expect(result.moduleMap['exam']?.criticality).toBe(0)
      expect(result.moduleMap['documents']?.criticality).toBe(0)

      // Critical path should start with student-master
      expect(result.criticalPath[0]).toBe('student-master')
    })

    it('re-resolves after completing student-master', () => {
      const initial = engine.decompose(schoolERP)

      // Complete student-master.
      const updated = engine.reResolve(initial, new Set(['student-master']))

      expect(updated.moduleMap['student-master']?.status).toBe('completed')
      expect(updated.moduleMap['enrollment']?.status).toBe('active') // unlocked!
      expect(updated.moduleMap['exam']?.status).toBe('active') // unlocked!
      expect(updated.moduleMap['fees']?.status).toBe('locked') // still locked
      expect(updated.moduleMap['attendance']?.status).toBe('locked') // still locked
      expect(updated.moduleMap['documents']?.status).toBe('active') // no deps
    })

    it('re-resolves after completing entire student domain', () => {
      const initial = engine.decompose(schoolERP)
      const step1 = engine.reResolve(initial, new Set(['student-master']))
      const step2 = engine.reResolve(step1, new Set(['student-master', 'enrollment']))

      expect(step2.moduleMap['fees']?.status).toBe('active') // unlocked!
      expect(step2.moduleMap['attendance']?.status).toBe('active') // unlocked!
      expect(step2.moduleMap['exam']?.status).toBe('active') // still active (no deps from enrollment)
    })
  })

  // -----------------------------------------------------------------------
  // Module Descriptors
  // -----------------------------------------------------------------------

  describe('module descriptors', () => {
    it('populates dependsOn and dependents correctly', () => {
      const result = engine.decompose({
        objective: 'descriptors',
        modules: [
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
          { id: 'c', name: 'C', domain: 'D', dependsOn: ['a', 'b'] },
        ],
      })

      expect(result.moduleMap['a']?.dependsOn).toEqual([])
      expect(result.moduleMap['a']?.dependents).toEqual(['b', 'c'])
      expect(result.moduleMap['b']?.dependsOn).toEqual(['a'])
      expect(result.moduleMap['b']?.dependents).toEqual(['c'])
      expect(result.moduleMap['c']?.dependsOn).toEqual(['a', 'b'])
      expect(result.moduleMap['c']?.dependents).toEqual([])
    })

    it('assigns correct order values', () => {
      const result = engine.decompose({
        objective: 'order',
        modules: [
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
          { id: 'c', name: 'C', domain: 'D', dependsOn: ['b'] },
        ],
      })

      expect(result.moduleMap['a']?.order).toBe(0)
      expect(result.moduleMap['b']?.order).toBe(1)
      expect(result.moduleMap['c']?.order).toBe(2)
    })
  })

  // -----------------------------------------------------------------------
  // Goal ID Generation
  // -----------------------------------------------------------------------

  describe('goal id generation', () => {
    it('uses provided goalId', () => {
      const result = engine.decompose({
        objective: 'test',
        goalId: 'custom-id',
        modules: [{ id: 'a', name: 'A', domain: 'D' }],
      })
      expect(result.goalId).toBe('custom-id')
    })

    it('auto-generates goalId when omitted', () => {
      const result = engine.decompose({
        objective: 'test',
        modules: [{ id: 'a', name: 'A', domain: 'D' }],
      })
      expect(result.goalId).toMatch(/^MG-/)
    })
  })

  // -----------------------------------------------------------------------
  // Re-Resolve
  // -----------------------------------------------------------------------

  describe('reResolve', () => {
    it('preserves the original breakdown metadata', () => {
      const initial = engine.decompose({
        objective: 'test',
        goalId: 'test-001',
        modules: [
          { id: 'a', name: 'A', domain: 'D' },
          { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
        ],
      })

      const updated = engine.reResolve(initial, new Set(['a']))
      expect(updated.objective).toBe('test')
      expect(updated.goalId).toBe('test-001')
      expect(updated.decomposedAt).toBeDefined()
    })
  })
})

// ---------------------------------------------------------------------------
// Status Rendering
// ---------------------------------------------------------------------------

describe('formatModuleStatus', () => {
  const engine = new MasterGoalEngine()

  it('formats a simple breakdown', () => {
    const breakdown = engine.decompose({
      objective: 'School ERP बनाओ',
      goalId: 'test-001',
      modules: [
        { id: 'student', name: 'Student', domain: 'Student' },
        { id: 'fees', name: 'Fees', domain: 'Fees', dependsOn: ['student'] },
      ],
    })

    const text = formatModuleStatus(breakdown)
    expect(text).toContain('## Master Goal: School ERP बनाओ')
    expect(text).toContain('Goal ID: test-001')
    expect(text).toContain('🟢') // active icon
    expect(text).toContain('🔴') // locked icon
    expect(text).toContain('student')
    expect(text).toContain('fees')
    expect(text).toContain('1 active')
    expect(text).toContain('1 locked')
    expect(text).toContain('Critical Path')
  })

  it('formats completed modules', () => {
    const initial = engine.decompose({
      objective: 'test',
      goalId: 'g1',
      modules: [
        { id: 'a', name: 'A', domain: 'D' },
        { id: 'b', name: 'B', domain: 'D', dependsOn: ['a'] },
      ],
    })

    const updated = engine.reResolve(initial, new Set(['a']))
    const text = formatModuleStatus(updated)
    expect(text).toContain('✅') // completed icon
    expect(text).toContain('1 completed')
  })
})

describe('getModuleStatusText', () => {
  const engine = new MasterGoalEngine()

  it('returns structured status data', () => {
    const breakdown = engine.decompose({
      objective: 'test',
      modules: [
        { id: 'a', name: 'A', domain: 'D1' },
        { id: 'b', name: 'B', domain: 'D2', dependsOn: ['a'] },
      ],
    })

    const status = getModuleStatusText(breakdown)
    expect(status.lines.length).toBeGreaterThan(0)
    expect(status.summary).toContain('1 active')
    expect(status.summary).toContain('1 locked')
    expect(status.summary).toContain('2 total')
  })
})
