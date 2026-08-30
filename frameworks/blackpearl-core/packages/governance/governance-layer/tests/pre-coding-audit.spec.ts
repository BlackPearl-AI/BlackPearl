/**
 * PHASE 13 — Pre-Coding Audit Tests
 *
 * Coding से पहले verify:
 *   1. Requirement clear?
 *   2. Blueprint complete?
 *   3. Files known?
 *   4. Rules loaded?
 *   5. Dependencies known?
 *   6. Tests defined?
 *   7. Conflict exists?
 *
 * सब PASS होने पर ही coding।
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  PreCodingAuditEngine,
  resetEngine,
  getActiveEngine,
  createRunPreCodingAuditTool,
  createCheckCodingReadinessTool,
} from '../src/pre-coding-audit/index.ts'
import type { AuditConfig } from '../src/pre-coding-audit/types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides?: Partial<AuditConfig>): AuditConfig {
  return {
    moduleId: 'MOD',
    hasRequirements: true,
    requirementCount: 5,
    hasGoals: true,
    goalCount: 4,
    hasFileBlueprint: true,
    blueprintCompleteness: 90,
    elementCount: 5,
    ruleCount: 3,
    dependencyEdgeCount: 4,
    hasDependencyCycles: 0,
    dependencyConflictCount: 0,
    taskCount: 8,
    tasksWithoutGoals: 0,
    testTaskCount: 3,
    hasTaskCycles: false,
    allGoalsHaveTasks: true,
    conflictCount: 0,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

describe('PreCodingAuditEngine', () => {
  let engine: PreCodingAuditEngine

  beforeEach(() => {
    engine = new PreCodingAuditEngine()
  })

  // -- Happy path ----------------------------------------------------------

  describe('audit — happy path', () => {
    it('passes when all phases are complete', () => {
      const result = engine.audit(makeConfig())
      expect(result.verdict).toBe('pass')
      expect(result.failCount).toBe(0)
      expect(result.passCount).toBeGreaterThan(0)
      expect(result.readinessScore).toBe(100)
    })

    it('has correct module id', () => {
      const result = engine.audit(makeConfig({ moduleId: 'STU' }))
      expect(result.moduleId).toBe('STU')
    })

    it('has auditedAt timestamp', () => {
      const result = engine.audit(makeConfig())
      expect(result.auditedAt).toBeDefined()
    })

    it('has criticalFailures field', () => {
      const result = engine.audit(makeConfig())
      expect(result.criticalFailures).toHaveLength(0)
    })
  })

  // -- 1. Requirement clear? -----------------------------------------------

  describe('audit — requirement checks', () => {
    it('fails when requirements missing', () => {
      const result = engine.audit(makeConfig({ hasRequirements: false }))
      expect(result.checks.some(c => c.name === 'Requirements missing' && c.status === 'fail')).toBe(true)
      expect(result.criticalFailures.length).toBeGreaterThan(0)
    })

    it('passes when requirements captured', () => {
      const result = engine.audit(makeConfig())
      expect(result.checks.some(c => c.name === 'Requirements captured' && c.status === 'pass')).toBe(true)
    })

    it('warns when few requirements', () => {
      const result = engine.audit(makeConfig({ requirementCount: 1 }))
      expect(result.checks.some(c => c.name === 'Few requirements' && c.status === 'warn')).toBe(true)
    })

    it('passes when sufficient requirements', () => {
      const result = engine.audit(makeConfig({ requirementCount: 5 }))
      expect(result.checks.some(c => c.name === 'Sufficient requirements' && c.status === 'pass')).toBe(true)
    })
  })

  // -- 2. Goals ------------------------------------------------------------

  describe('audit — goal checks', () => {
    it('fails when goals phase incomplete', () => {
      const result = engine.audit(makeConfig({ hasGoals: false }))
      expect(result.checks.some(c => c.name === 'Goals phase incomplete' && c.status === 'fail')).toBe(true)
    })

    it('fails when goal count is 0', () => {
      const result = engine.audit(makeConfig({ goalCount: 0 }))
      expect(result.checks.some(c => c.name === 'No goals defined' && c.status === 'fail')).toBe(true)
    })

    it('passes when goals are defined', () => {
      const result = engine.audit(makeConfig())
      expect(result.checks.some(c => c.name === 'Goals defined' && c.status === 'pass')).toBe(true)
    })
  })

  // -- 3. Blueprint complete? ----------------------------------------------

  describe('audit — blueprint checks', () => {
    it('fails when no file blueprint', () => {
      const result = engine.audit(makeConfig({ hasFileBlueprint: false }))
      expect(result.checks.some(c => c.name === 'Missing file blueprint' && c.status === 'fail')).toBe(true)
    })

    it('passes when blueprint complete (≥80%)', () => {
      const result = engine.audit(makeConfig({ blueprintCompleteness: 85 }))
      expect(result.checks.some(c => c.name === 'Blueprint complete' && c.status === 'pass')).toBe(true)
    })

    it('warns when blueprint partial (50-79%)', () => {
      const result = engine.audit(makeConfig({ blueprintCompleteness: 60 }))
      expect(result.checks.some(c => c.name === 'Blueprint partial' && c.status === 'warn')).toBe(true)
    })

    it('fails when blueprint incomplete (<50%)', () => {
      const result = engine.audit(makeConfig({ blueprintCompleteness: 30 }))
      expect(result.checks.some(c => c.name === 'Blueprint incomplete' && c.status === 'fail')).toBe(true)
    })
  })

  // -- 4. Files known? -----------------------------------------------------

  describe('audit — file checks', () => {
    it('fails when files unknown', () => {
      const result = engine.audit(makeConfig({ hasFileBlueprint: false }))
      expect(result.checks.some(c => c.name === 'Files unknown' && c.status === 'fail')).toBe(true)
    })

    it('passes when files known', () => {
      const result = engine.audit(makeConfig())
      expect(result.checks.some(c => c.name === 'Files known' && c.status === 'pass')).toBe(true)
    })
  })

  // -- 5. Rules loaded? ----------------------------------------------------

  describe('audit — rule checks', () => {
    it('warns when no rules loaded', () => {
      const result = engine.audit(makeConfig({ ruleCount: 0 }))
      expect(result.checks.some(c => c.name === 'No rules loaded' && c.status === 'warn')).toBe(true)
    })

    it('passes when rules exist', () => {
      const result = engine.audit(makeConfig({ ruleCount: 3 }))
      expect(result.checks.some(c => c.name === 'Rules loaded' && c.status === 'pass')).toBe(true)
    })
  })

  // -- 6. Dependencies known? ----------------------------------------------

  describe('audit — dependency checks', () => {
    it('fails when dependency cycles exist', () => {
      const result = engine.audit(makeConfig({ hasDependencyCycles: 1 }))
      expect(result.checks.some(c => c.name === 'Dependency cycles detected' && c.status === 'fail')).toBe(true)
    })

    it('warns when no dependencies mapped', () => {
      const result = engine.audit(makeConfig({ dependencyEdgeCount: 0 }))
      expect(result.checks.some(c => c.name === 'No dependencies mapped' && c.status === 'warn')).toBe(true)
    })
  })

  // -- 7. Tests defined? ---------------------------------------------------

  describe('audit — test checks', () => {
    it('fails when no tests defined', () => {
      const result = engine.audit(makeConfig({ testTaskCount: 0 }))
      expect(result.checks.some(c => c.name === 'No tests defined' && c.status === 'fail')).toBe(true)
    })

    it('passes when tests defined', () => {
      const result = engine.audit(makeConfig({ testTaskCount: 3 }))
      expect(result.checks.some(c => c.name === 'Tests defined' && c.status === 'pass')).toBe(true)
    })

    it('skips test check when no tasks', () => {
      const result = engine.audit(makeConfig({ taskCount: 0, testTaskCount: 0 }))
      expect(result.checks.some(c => c.name === 'No tasks for test check' && c.status === 'skip')).toBe(true)
    })
  })

  // -- 8. Conflict exists? -------------------------------------------------

  describe('audit — conflict checks', () => {
    it('fails when conflicts detected', () => {
      const result = engine.audit(makeConfig({ conflictCount: 2 }))
      expect(result.checks.some(c => c.name === 'Conflicts detected' && c.status === 'fail')).toBe(true)
    })

    it('fails when dependency conflicts exist', () => {
      const result = engine.audit(makeConfig({ dependencyConflictCount: 1 }))
      expect(result.checks.some(c => c.name === 'Dependency conflicts' && c.status === 'fail')).toBe(true)
    })

    it('passes when no conflicts', () => {
      const result = engine.audit(makeConfig())
      expect(result.checks.some(c => c.name === 'No conflicts detected' && c.status === 'pass')).toBe(true)
    })
  })

  // -- Coverage checks -----------------------------------------------------

  describe('audit — coverage checks', () => {
    it('passes when all goals have tasks', () => {
      const result = engine.audit(makeConfig({ allGoalsHaveTasks: true }))
      expect(result.checks.some(c => c.name === 'All goals covered' && c.status === 'pass')).toBe(true)
    })

    it('warns when some goals lack tasks', () => {
      const result = engine.audit(makeConfig({ allGoalsHaveTasks: false, taskCount: 3, goalCount: 5 }))
      expect(result.checks.some(c => c.name === 'Incomplete goal-task coverage' && c.status === 'warn')).toBe(true)
    })

    it('warns when tasks have no goals', () => {
      const result = engine.audit(makeConfig({ tasksWithoutGoals: 2 }))
      expect(result.checks.some(c => c.name === 'Tasks without goals' && c.status === 'warn')).toBe(true)
    })
  })

  // -- Consistency checks --------------------------------------------------

  describe('audit — consistency checks', () => {
    it('fails when critical phases incomplete', () => {
      const result = engine.audit(makeConfig({ hasRequirements: false, hasGoals: false, taskCount: 0 }))
      expect(result.checks.some(c => c.name === 'Incomplete planning' && c.status === 'fail')).toBe(true)
    })

    it('passes when all critical phases complete', () => {
      const result = engine.audit(makeConfig())
      expect(result.checks.some(c => c.name === 'All critical phases complete' && c.status === 'pass')).toBe(true)
    })
  })

  // -- Verdict -------------------------------------------------------------

  describe('audit — verdict', () => {
    it('returns pass when no failures', () => {
      const result = engine.audit(makeConfig())
      expect(result.verdict).toBe('pass')
    })

    it('returns fail when multiple failures', () => {
      const result = engine.audit(makeConfig({
        hasRequirements: false,
        hasGoals: false,
        hasFileBlueprint: false,
        taskCount: 0,
        conflictCount: 2,
      }))
      expect(result.verdict).toBe('fail')
    })

    it('returns conditional for two critical failures with no important failures', () => {
      const result = engine.audit(makeConfig({
        hasRequirements: true,
        hasGoals: true,
        goalCount: 4,
        hasFileBlueprint: true,
        blueprintCompleteness: 90,
        elementCount: 5,
        ruleCount: 3,
        dependencyEdgeCount: 4,
        hasDependencyCycles: 1,
        taskCount: 8,
        hasTaskCycles: true,
        testTaskCount: 3,
        conflictCount: 0,
        allGoalsHaveTasks: true,
      }))
      // 2 critical fails (dependency cycles + task cycles) → conditional
      expect(result.verdict).toBe('conditional')
      expect(result.failCount).toBe(2)
    })
  })

  // -- Readiness score -----------------------------------------------------

  describe('audit — readiness score', () => {
    it('returns 100 for perfect audit', () => {
      const result = engine.audit(makeConfig())
      expect(result.readinessScore).toBe(100)
    })

    it('deducts for critical failures', () => {
      const result = engine.audit(makeConfig({ hasRequirements: false }))
      expect(result.readinessScore).toBeLessThan(100)
    })

    it('deducts for warnings', () => {
      const result = engine.audit(makeConfig({ elementCount: 0, ruleCount: 0 }))
      expect(result.readinessScore).toBeLessThan(100)
    })

    it('never goes below 0', () => {
      const result = engine.audit(makeConfig({
        hasRequirements: false,
        hasGoals: false,
        hasFileBlueprint: false,
        taskCount: 0,
        conflictCount: 10,
        dependencyConflictCount: 10,
        hasDependencyCycles: 1,
        hasTaskCycles: true,
      }))
      expect(result.readinessScore).toBeGreaterThanOrEqual(0)
    })
  })

  // -- Blocking issues and suggestions -------------------------------------

  describe('audit — blocking issues and suggestions', () => {
    it('collects blocking issues from failures', () => {
      const result = engine.audit(makeConfig({ hasRequirements: false, taskCount: 0 }))
      expect(result.blockingIssues.length).toBeGreaterThan(0)
    })

    it('collects critical failures separately', () => {
      const result = engine.audit(makeConfig({ hasRequirements: false }))
      expect(result.criticalFailures.length).toBeGreaterThan(0)
    })

    it('collects suggestions from warnings', () => {
      const result = engine.audit(makeConfig({ elementCount: 0, ruleCount: 0 }))
      expect(result.suggestions.length).toBeGreaterThan(0)
    })
  })
})

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

describe('Pre-Coding Audit tools', () => {
  beforeEach(() => {
    resetEngine()
  })

  it('createRunPreCodingAuditTool has correct name', () => {
    expect(createRunPreCodingAuditTool().name).toBe('run_pre_coding_audit')
  })

  it('createCheckCodingReadinessTool has correct name', () => {
    expect(createCheckCodingReadinessTool().name).toBe('check_coding_readiness')
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
    const tool = createCheckCodingReadinessTool()
    tool.execute({
      module_id: 'MOD',
      has_requirements: 'true',
      has_goals: 'true',
      has_file_blueprint: 'true',
    }, {} as any)
    expect(getActiveEngine()).toBeDefined()
    resetEngine()
    expect(getActiveEngine()).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Full lifecycle — School ERP audit
// ---------------------------------------------------------------------------

describe('full lifecycle — School ERP pre-coding audit', () => {
  let engine: PreCodingAuditEngine

  beforeEach(() => {
    engine = new PreCodingAuditEngine()
  })

  it('full audit with all 7 areas passing', () => {
    const result = engine.audit(makeConfig({
      moduleId: 'STU',
      hasRequirements: true,
      requirementCount: 8,
      hasGoals: true,
      goalCount: 3,
      hasFileBlueprint: true,
      blueprintCompleteness: 95,
      elementCount: 12,
      ruleCount: 5,
      dependencyEdgeCount: 6,
      dependencyConflictCount: 0,
      taskCount: 15,
      tasksWithoutGoals: 0,
      testTaskCount: 5,
      hasTaskCycles: false,
    hasDependencyCycles: 0,
      allGoalsHaveTasks: true,
      conflictCount: 0,
    }))

    expect(result.verdict).toBe('pass')
    expect(result.readinessScore).toBe(100)
    expect(result.moduleId).toBe('STU')
    expect(result.criticalFailures).toHaveLength(0)
    expect(result.passCount).toBeGreaterThanOrEqual(7)

    // Verify all 7 areas are checked
    const categories = new Set(result.checks.map(c => c.category))
    expect(categories.has('requirements')).toBe(true)
    expect(categories.has('goals')).toBe(true)
    expect(categories.has('blueprint')).toBe(true)
    expect(categories.has('files')).toBe(true)
    expect(categories.has('dependencies')).toBe(true)
    expect(categories.has('tests')).toBe(true)
    expect(categories.has('conflicts')).toBe(true)
  })

  it('fails when requirements missing + conflicts exist', () => {
    const result = engine.audit(makeConfig({
      moduleId: 'FEE',
      hasRequirements: false,
      conflictCount: 3,
    }))

    expect(result.verdict).toBe('fail')
    expect(result.criticalFailures.length).toBeGreaterThanOrEqual(2)
    expect(result.readinessScore).toBeLessThan(70)
  })

  it('conditional when blueprint incomplete but rest OK', () => {
    const result = engine.audit(makeConfig({
      moduleId: 'ATT',
      hasFileBlueprint: true,
      blueprintCompleteness: 30, // < 50% → fail
      hasRequirements: true,
      hasGoals: true,
      goalCount: 4,
      taskCount: 8,
      testTaskCount: 3,
      conflictCount: 0,
      allGoalsHaveTasks: true,
    }))

    // 1 critical fail (blueprint incomplete) → conditional (consistency passes since all 4 are present)
    expect(result.verdict).toBe('conditional')
    expect(result.blockingIssues.length).toBeGreaterThanOrEqual(1)
  })
})
