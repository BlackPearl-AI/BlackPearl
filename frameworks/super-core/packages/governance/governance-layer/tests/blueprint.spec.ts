import { describe, expect, it, beforeEach } from 'vitest'
import { BlueprintOrchestrator } from '../src/blueprint/orchestrator.ts'
import { resetOrchestrator } from '../src/blueprint/tools.ts'
import type { BlueprintPhase } from '../src/blueprint/types.ts'

// ---------------------------------------------------------------------------
// BlueprintOrchestrator
// ---------------------------------------------------------------------------

describe('BlueprintOrchestrator', () => {
  let orch: BlueprintOrchestrator

  beforeEach(() => {
    orch = new BlueprintOrchestrator('MG-001', 'School ERP बनाओ')
    resetOrchestrator()
  })

  describe('initialization', () => {
    it('starts in the project-onboarding phase', () => {
      expect(orch.getCurrentPhase()).toBe('project-onboarding')
    })

    it('has 20 phases', () => {
      expect(orch.getPhaseOrder()).toHaveLength(20)
    })

    it('starts with 0% progress', () => {
      const p = orch.getProgress()
      expect(p.completed).toBe(0)
      expect(p.total).toBe(20)
      expect(p.percentage).toBe(0)
    })

    it('is not complete initially', () => {
      expect(orch.isComplete()).toBe(false)
    })
  })

  describe('phase ordering', () => {
    it('returns correct phase labels', () => {
      expect(orch.getPhaseLabel('project-onboarding')).toBe('PHASE 01 — Project Onboarding')
      expect(orch.getPhaseLabel('master-goal-capture')).toBe('PHASE 02 — Master Goal Capture')
      expect(orch.getPhaseLabel('golden-journey')).toBe('PHASE 20 — Full Product Golden Journey')
    })

    it('returns correct phase indices', () => {
      expect(orch.getPhaseIndex('project-onboarding')).toBe(0)
      expect(orch.getPhaseIndex('golden-journey')).toBe(19)
    })

    it('returns next phase correctly', () => {
      expect(orch.getNextPhase('project-onboarding')).toBe('master-goal-capture')
      expect(orch.getNextPhase('golden-journey')).toBeUndefined()
    })

    it('returns previous phase correctly', () => {
      expect(orch.getPreviousPhase('project-onboarding')).toBeUndefined()
      expect(orch.getPreviousPhase('master-goal-capture')).toBe('project-onboarding')
    })

    it('identifies last phase', () => {
      expect(orch.isLastPhase('golden-journey')).toBe(true)
      expect(orch.isLastPhase('project-onboarding')).toBe(false)
    })
  })

  describe('phase lifecycle', () => {
    it('can start the first phase', () => {
      expect(orch.canStartPhase('project-onboarding')).toBe(true)
    })

    it('cannot start a phase until previous is completed', () => {
      expect(orch.canStartPhase('master-goal-capture')).toBe(false)
    })

    it('starts a phase', () => {
      orch.startPhase('project-onboarding')
      const statuses = orch.getPhaseStatuses()
      expect(statuses['project-onboarding']).toBe('running')
    })

    it('completes a phase', () => {
      orch.startPhase('project-onboarding')
      orch.completePhase('project-onboarding', { projectMap: {}, moduleMap: {} })
      const statuses = orch.getPhaseStatuses()
      expect(statuses['project-onboarding']).toBe('completed')
    })

    it('can start next phase after completing current', () => {
      orch.startPhase('project-onboarding')
      orch.completePhase('project-onboarding', {})
      expect(orch.canStartPhase('master-goal-capture')).toBe(true)
    })

    it('fails a phase', () => {
      orch.startPhase('project-onboarding')
      orch.failPhase('project-onboarding', 'scan failed')
      const statuses = orch.getPhaseStatuses()
      expect(statuses['project-onboarding']).toBe('failed')
    })

    it('skips a phase', () => {
      orch.skipPhase('project-onboarding', 'not needed')
      const statuses = orch.getPhaseStatuses()
      expect(statuses['project-onboarding']).toBe('skipped')
    })

    it('can start next phase after skipping current', () => {
      orch.skipPhase('project-onboarding', 'not needed')
      expect(orch.canStartPhase('master-goal-capture')).toBe(true)
    })

    it('throws when completing a non-running phase', () => {
      expect(() => orch.completePhase('project-onboarding', {})).toThrow(
        /cannot complete.*status is "pending"/,
      )
    })

    it('throws when starting a phase with incomplete previous', () => {
      expect(() => orch.startPhase('goal-breakdown')).toThrow(
        /cannot start.*previous phase.*is not completed/,
      )
    })

    it('throws when completing wrong phase', () => {
      orch.startPhase('project-onboarding')
      expect(() => orch.completePhase('master-goal-capture', {})).toThrow(
        /cannot complete/,
      )
    })
  })

  describe('progress tracking', () => {
    it('tracks progress after completions', () => {
      orch.startPhase('project-onboarding')
      orch.completePhase('project-onboarding', {})
      orch.startPhase('master-goal-capture')
      orch.completePhase('master-goal-capture', {})

      const p = orch.getProgress()
      expect(p.completed).toBe(2)
      expect(p.percentage).toBe(10)
    })

    it('reports 100% when all phases completed', () => {
      for (const phase of orch.getPhaseOrder()) {
        orch.startPhase(phase)
        orch.completePhase(phase, {})
      }
      expect(orch.isComplete()).toBe(true)
      expect(orch.getProgress().percentage).toBe(100)
    })

    it('reports 100% with skipped phases', () => {
      for (const phase of orch.getPhaseOrder()) {
        orch.skipPhase(phase, 'test skip')
      }
      expect(orch.isComplete()).toBe(true)
    })
  })

  describe('typed output accessors', () => {
    it('stores and retrieves onboarding output', () => {
      orch.startPhase('project-onboarding')
      orch.completePhase('project-onboarding', {
        projectMap: { rootPath: '/test' },
        moduleMap: { modules: [] },
      })

      const output = orch.getOnboardingOutput()
      expect(output?.projectMap?.rootPath).toBe('/test')
    })

    it('stores and retrieves goal breakdown', () => {
      orch.startPhase('project-onboarding')
      orch.completePhase('project-onboarding', {})
      orch.startPhase('master-goal-capture')
      orch.completePhase('master-goal-capture', {})
      orch.startPhase('conversation-ledger')
      orch.completePhase('conversation-ledger', {})
      orch.startPhase('goal-breakdown')
      orch.completePhase('goal-breakdown', {
        goalId: 'MG-001',
        activeModule: 'student-master',
      })

      const output = orch.getGoalBreakdown()
      expect(output?.activeModule).toBe('student-master')
    })
  })

  describe('full lifecycle (happy path)', () => {
    it('traverses all 20 phases', () => {
      const phases = orch.getPhaseOrder()
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i]!
        orch.startPhase(phase)
        orch.completePhase(phase, { phaseIndex: i })
      }

      expect(orch.isComplete()).toBe(true)
      expect(orch.getProgress().completed).toBe(20)
      expect(orch.getProgress().percentage).toBe(100)
      expect(orch.getCurrentPhase()).toBe('golden-journey')
    })
  })
})

// ---------------------------------------------------------------------------
// Phase Types
// ---------------------------------------------------------------------------

describe('blueprint types', () => {
  it('defines all 20 phases', () => {
    const expectedPhases: BlueprintPhase[] = [
      'project-onboarding',
      'master-goal-capture',
      'conversation-ledger',
      'goal-breakdown',
      'module-identification',
      'module-deep-analysis',
      'goal-blueprint',
      'file-folder-blueprint',
      'element-registry',
      'rule-document-governance',
      'dependency-mapping',
      'task-decomposition',
      'pre-coding-audit',
      'implementation',
      'test-evidence',
      'independent-audit',
      'module-exit-gate',
      'next-module-linking',
      'direct-repair-index',
      'golden-journey',
    ]

    const orch = new BlueprintOrchestrator('test', 'test')
    expect(orch.getPhaseOrder()).toEqual(expectedPhases)
    expect(orch.getPhaseOrder()).toHaveLength(20)
  })
})

// ---------------------------------------------------------------------------
// Phase Status Display
// ---------------------------------------------------------------------------

describe('phase status display', () => {
  it('shows correct status icons', () => {
    const orch = new BlueprintOrchestrator('test', 'test')

    // Start and complete first phase.
    orch.startPhase('project-onboarding')
    orch.completePhase('project-onboarding', {})

    // Skip second phase.
    orch.skipPhase('master-goal-capture', 'not needed')

    // Fail third phase.
    orch.startPhase('conversation-ledger')
    orch.failPhase('conversation-ledger', 'error')

    // Leave rest pending.

    const statuses = orch.getPhaseStatuses()
    expect(statuses['project-onboarding']).toBe('completed')
    expect(statuses['master-goal-capture']).toBe('skipped')
    expect(statuses['conversation-ledger']).toBe('failed')
    expect(statuses['goal-breakdown']).toBe('pending')
  })
})

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('handles empty output gracefully', () => {
    const orch = new BlueprintOrchestrator('test', 'test')
    orch.startPhase('project-onboarding')
    orch.completePhase('project-onboarding', undefined)

    const output = orch.getOutput('project-onboarding')
    expect(output).toBeUndefined()
  })

  it('handles multiple phase cycles', () => {
    const orch = new BlueprintOrchestrator('test', 'test')

    // Complete first 5 phases.
    for (let i = 0; i < 5; i++) {
      const phase = orch.getPhaseOrder()[i]!
      orch.startPhase(phase)
      orch.completePhase(phase, { index: i })
    }

    expect(orch.getCurrentPhase()).toBe(orch.getPhaseOrder()[4])
    expect(orch.getProgress().completed).toBe(5)

    // Continue with remaining 15.
    for (let i = 5; i < 20; i++) {
      const phase = orch.getPhaseOrder()[i]!
      orch.startPhase(phase)
      orch.completePhase(phase, { index: i })
    }

    expect(orch.isComplete()).toBe(true)
  })

  it('preserves state across multiple operations', () => {
    const orch = new BlueprintOrchestrator('test', 'test')
    orch.startPhase('project-onboarding')
    orch.completePhase('project-onboarding', { projectMap: { rootPath: '/a' } })

    // Get state and verify it's preserved.
    const state = orch.getState()
    expect(state.goalId).toBe('test')
    expect(state.objective).toBe('test')
    expect(state.phases['project-onboarding']?.status).toBe('completed')
    expect(state.currentPhase).toBe('project-onboarding')
  })
})
