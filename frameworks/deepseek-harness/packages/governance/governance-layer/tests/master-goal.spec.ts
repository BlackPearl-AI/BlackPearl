import { describe, expect, it } from 'vitest'
import {
  validateDefinition,
  isInScope,
  checkModuleScope,
  computeProgress,
  verifyAgainstGoal,
  summarizeGoal,
} from '../src/master-goal/engine.ts'
import type { MasterGoalDefinition } from '../src/master-goal/types.ts'

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

function makeSchoolERPGoal(): MasterGoalDefinition {
  return {
    id: 'school-erp-001',
    identity: 'School ERP is a complete school management system.',
    description: 'A comprehensive ERP for schools covering student management, fees, attendance, exams, and documents. Built as a plugin-based system.',
    scope: {
      included: [
        { id: 'student-master', name: 'Student Master', description: 'Student registration and profile management', priority: 'must-have' },
        { id: 'enrollment', name: 'Enrollment', description: 'Student enrollment into classes and sections', priority: 'must-have' },
        { id: 'fees', name: 'Fees', description: 'Fee collection and receipt generation', priority: 'must-have' },
        { id: 'attendance', name: 'Attendance', description: 'Daily attendance tracking', priority: 'should-have' },
        { id: 'exam', name: 'Exam', description: 'Exam scheduling and result management', priority: 'should-have' },
        { id: 'documents', name: 'Documents', description: 'Document generation (ID cards, certificates)', priority: 'nice-to-have' },
      ],
      excluded: [
        { id: 'payroll', name: 'Payroll', description: 'Employee salary management', priority: 'must-have' },
        { id: 'inventory', name: 'Inventory', description: 'School inventory management', priority: 'must-have' },
      ],
      deferred: [
        { id: 'transport', name: 'Transport', description: 'Bus route management', priority: 'should-have' },
      ],
    },
    acceptanceCriteria: {
      functional: [
        { id: 'AC-001', statement: 'Student can be registered with all required fields', verificationMethod: 'test', moduleId: 'student-master', status: 'unverified' },
        { id: 'AC-002', statement: 'Enrollment links student to class and section', verificationMethod: 'test', moduleId: 'enrollment', status: 'unverified' },
        { id: 'AC-003', statement: 'Fee receipt is generated on payment', verificationMethod: 'test', moduleId: 'fees', status: 'unverified' },
      ],
      integration: [
        { id: 'AC-INT-001', statement: 'Enrollment requires student master to exist', verificationMethod: 'test', moduleId: 'enrollment', status: 'unverified' },
      ],
      userExperience: [],
    },
    qualityAttributes: {
      performance: ['Page load under 2 seconds'],
      security: ['All API endpoints require authentication'],
    },
    version: '1.0.0',
    createdAt: '2026-08-26T12:00:00Z',
    updatedAt: '2026-08-26T12:00:00Z',
  }
}

// ---------------------------------------------------------------------------
// validateDefinition
// ---------------------------------------------------------------------------

describe('validateDefinition', () => {
  it('passes for a valid definition', () => {
    expect(() => validateDefinition(makeSchoolERPGoal())).not.toThrow()
  })

  it('throws on empty id', () => {
    const def = { ...makeSchoolERPGoal(), id: '' }
    expect(() => validateDefinition(def)).toThrow('id is required')
  })

  it('throws on empty identity', () => {
    const def = { ...makeSchoolERPGoal(), identity: '' }
    expect(() => validateDefinition(def)).toThrow('identity is required')
  })

  it('throws on empty description', () => {
    const def = { ...makeSchoolERPGoal(), description: '' }
    expect(() => validateDefinition(def)).toThrow('description is required')
  })

  it('throws on empty included scope', () => {
    const def = { ...makeSchoolERPGoal(), scope: { ...makeSchoolERPGoal().scope, included: [] } }
    expect(() => validateDefinition(def)).toThrow('at least one included scope item')
  })

  it('throws on empty functional criteria', () => {
    const def = { ...makeSchoolERPGoal(), acceptanceCriteria: { ...makeSchoolERPGoal().acceptanceCriteria, functional: [] } }
    expect(() => validateDefinition(def)).toThrow('at least one functional acceptance criterion')
  })
})

// ---------------------------------------------------------------------------
// isInScope
// ---------------------------------------------------------------------------

describe('isInScope', () => {
  const goal = makeSchoolERPGoal()

  it('returns "included" for included capabilities', () => {
    expect(isInScope(goal, 'student-master')).toBe('included')
    expect(isInScope(goal, 'fees')).toBe('included')
  })

  it('returns "excluded" for excluded capabilities', () => {
    expect(isInScope(goal, 'payroll')).toBe('excluded')
    expect(isInScope(goal, 'inventory')).toBe('excluded')
  })

  it('returns "deferred" for deferred capabilities', () => {
    expect(isInScope(goal, 'transport')).toBe('deferred')
  })

  it('returns "unknown" for unknown capabilities', () => {
    expect(isInScope(goal, 'ai-chatbot')).toBe('unknown')
    expect(isInScope(goal, 'blockchain')).toBe('unknown')
  })
})

// ---------------------------------------------------------------------------
// checkModuleScope
// ---------------------------------------------------------------------------

describe('checkModuleScope', () => {
  const goal = makeSchoolERPGoal()

  it('identifies in-scope capabilities', () => {
    const result = checkModuleScope(goal, ['student-master', 'fees'])
    expect(result.inScope).toEqual(['student-master', 'fees'])
    expect(result.outOfScope).toEqual([])
    expect(result.unknown).toEqual([])
  })

  it('identifies out-of-scope capabilities', () => {
    const result = checkModuleScope(goal, ['payroll', 'inventory'])
    expect(result.outOfScope).toEqual(['payroll', 'inventory'])
    expect(result.inScope).toEqual([])
  })

  it('identifies mixed scope', () => {
    const result = checkModuleScope(goal, ['student-master', 'payroll', 'ai-chatbot'])
    expect(result.inScope).toEqual(['student-master'])
    expect(result.outOfScope).toEqual(['payroll'])
    expect(result.unknown).toEqual(['ai-chatbot'])
  })

  it('handles empty capabilities', () => {
    const result = checkModuleScope(goal, [])
    expect(result.inScope).toEqual([])
    expect(result.outOfScope).toEqual([])
    expect(result.unknown).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// computeProgress
// ---------------------------------------------------------------------------

describe('computeProgress', () => {
  const goal = makeSchoolERPGoal()

  it('starts at 0%', () => {
    const progress = computeProgress(goal, new Set(), new Set(), new Set())
    expect(progress.score).toBe(0)
    expect(progress.implementedScopeItems).toBe(0)
    expect(progress.verifiedCriteria).toBe(0)
  })

  it('scores scope implementation (60% weight)', () => {
    // All 6 scope items completed.
    const completed = new Set(goal.scope.included.map(s => s.id))
    const progress = computeProgress(goal, completed, new Set(), new Set())
    // 60% * 100 + 40% * 0 = 60
    expect(progress.score).toBe(60)
    expect(progress.implementedScopeItems).toBe(6)
  })

  it('scores criteria verification (40% weight)', () => {
    // All 4 criteria verified (3 functional + 1 integration).
    const verified = new Set(['AC-001', 'AC-002', 'AC-003', 'AC-INT-001'])
    const progress = computeProgress(goal, new Set(), verified, new Set())
    // 60% * 0 + 40% * 100 = 40
    expect(progress.score).toBe(40)
    expect(progress.verifiedCriteria).toBe(4)
  })

  it('combines scope and criteria', () => {
    // 3 of 6 scope items (50%).
    const completed = new Set(['student-master', 'enrollment', 'fees'])
    // 2 of 4 criteria (50%).
    const verified = new Set(['AC-001', 'AC-002'])
    const progress = computeProgress(goal, completed, verified, new Set())
    // 60% * 50 + 40% * 50 = 30 + 20 = 50
    expect(progress.score).toBe(50)
  })

  it('handles failed criteria', () => {
    const failed = new Set(['AC-003'])
    const progress = computeProgress(goal, new Set(), new Set(), failed)
    expect(progress.failedCriteria).toBe(1)
  })

  it('reports total scope and criteria counts', () => {
    const progress = computeProgress(goal, new Set(), new Set(), new Set())
    expect(progress.totalScopeItems).toBe(6)
    expect(progress.totalCriteria).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// verifyAgainstGoal
// ---------------------------------------------------------------------------

describe('verifyAgainstGoal', () => {
  const goal = makeSchoolERPGoal()

  it('passes for in-scope implementation', () => {
    const result = verifyAgainstGoal(goal, ['student-master'], ['AC-001'])
    expect(result.consistent).toBe(true)
    expect(result.alignmentScore).toBeGreaterThan(50)
    expect(result.scopeViolations).toEqual([])
  })

  it('fails for excluded scope', () => {
    const result = verifyAgainstGoal(goal, ['payroll'], [])
    expect(result.consistent).toBe(false)
    expect(result.scopeViolations).toContain('payroll')
  })

  it('warns about deferred scope', () => {
    const result = verifyAgainstGoal(goal, ['transport'], [])
    expect(result.alignmentScore).toBeLessThan(100)
    expect(result.reasons.some(r => r.includes('DEFERRED'))).toBe(true)
  })

  it('warns about unknown scope', () => {
    const result = verifyAgainstGoal(goal, ['ai-chatbot'], [])
    expect(result.alignmentScore).toBeLessThan(100)
    expect(result.reasons.some(r => r.includes('not explicitly'))).toBe(true)
  })

  it('identifies missing criteria', () => {
    // Implement student-master but don't cover AC-001.
    const result = verifyAgainstGoal(goal, ['student-master'], [])
    expect(result.missingCriteria).toContain('AC-001')
  })

  it('passes with full coverage', () => {
    const result = verifyAgainstGoal(
      goal,
      ['student-master', 'enrollment', 'fees'],
      ['AC-001', 'AC-002', 'AC-003', 'AC-INT-001'],
    )
    expect(result.consistent).toBe(true)
    expect(result.alignmentScore).toBe(100)
    expect(result.scopeViolations).toEqual([])
    expect(result.missingCriteria).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// summarizeGoal
// ---------------------------------------------------------------------------

describe('summarizeGoal', () => {
  it('produces a readable summary', () => {
    const goal = makeSchoolERPGoal()
    const summary = summarizeGoal(goal)

    expect(summary).toContain('MASTER-GOAL: School ERP is a complete school management system.')
    expect(summary).toContain('ID: school-erp-001')
    expect(summary).toContain('INCLUDED (must build)')
    expect(summary).toContain('EXCLUDED (must NOT build)')
    expect(summary).toContain('DEFERRED (future)')
    expect(summary).toContain('Acceptance Criteria')
    expect(summary).toContain('Student Master')
    expect(summary).toContain('Payroll')
    expect(summary).toContain('Transport')
  })

  it('handles empty excluded/deferred', () => {
    const goal: MasterGoalDefinition = {
      ...makeSchoolERPGoal(),
      scope: {
        ...makeSchoolERPGoal().scope,
        excluded: [],
        deferred: [],
      },
    }
    const summary = summarizeGoal(goal)
    expect(summary).toContain('INCLUDED')
    expect(summary).not.toContain('EXCLUDED (must NOT build)')
    expect(summary).not.toContain('DEFERRED (future)')
  })
})
