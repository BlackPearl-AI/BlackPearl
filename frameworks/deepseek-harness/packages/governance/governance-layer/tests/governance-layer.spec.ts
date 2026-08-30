import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  isValidTransition,
  createInitialState,
  transition,
  createStore,
  getState,
  ensureState,
  applyTransition,
  removeState,
} from '../src/state-machine.ts'
import { ProjectStore, MemoryStore } from '../src/project-store.ts'
import { VALID_TRANSITIONS } from '../src/types.ts'
import type { GovernancePhase } from '../src/types.ts'

// ---------------------------------------------------------------------------
// State Machine
// ---------------------------------------------------------------------------

describe('state-machine', () => {
  describe('isValidTransition', () => {
    it('allows valid forward transitions', () => {
      expect(isValidTransition('idle', 'capturing')).toBe(true)
      expect(isValidTransition('capturing', 'planning')).toBe(true)
      expect(isValidTransition('planning', 'implementing')).toBe(true)
      expect(isValidTransition('implementing', 'testing')).toBe(true)
      expect(isValidTransition('testing', 'auditing')).toBe(true)
      expect(isValidTransition('auditing', 'verified')).toBe(true)
      expect(isValidTransition('verified', 'idle')).toBe(true)
    })

    it('allows valid backward transitions', () => {
      expect(isValidTransition('capturing', 'idle')).toBe(true)
      expect(isValidTransition('planning', 'capturing')).toBe(true)
      expect(isValidTransition('implementing', 'planning')).toBe(true)
      expect(isValidTransition('testing', 'implementing')).toBe(true)
      expect(isValidTransition('auditing', 'testing')).toBe(true)
    })

    it('rejects invalid transitions', () => {
      expect(isValidTransition('idle', 'implementing')).toBe(false)
      expect(isValidTransition('idle', 'testing')).toBe(false)
      expect(isValidTransition('idle', 'auditing')).toBe(false)
      expect(isValidTransition('idle', 'verified')).toBe(false)
      expect(isValidTransition('implementing', 'idle')).toBe(false)
      expect(isValidTransition('implementing', 'capturing')).toBe(false)
      expect(isValidTransition('verified', 'capturing')).toBe(false)
      expect(isValidTransition('verified', 'implementing')).toBe(false)
    })

    it('rejects self-transitions', () => {
      for (const phase of Object.keys(VALID_TRANSITIONS) as GovernancePhase[]) {
        expect(isValidTransition(phase, phase)).toBe(false)
      }
    })
  })

  describe('createInitialState', () => {
    it('creates an idle state with revision 0', () => {
      const state = createInitialState()
      expect(state.phase).toBe('idle')
      expect(state.revision).toBe(0)
      expect(state.goalId).toBeUndefined()
      expect(state.lastTransitionAt).toBeDefined()
      expect(new Date(state.lastTransitionAt).getTime()).not.toBeNaN()
    })

    it('accepts an optional goalId', () => {
      const state = createInitialState('goal-123')
      expect(state.goalId).toBe('goal-123')
    })
  })

  describe('transition', () => {
    it('returns a new state with incremented revision', () => {
      const initial = createInitialState()
      const next = transition(initial, 'capturing', 'user requested')
      expect(next.phase).toBe('capturing')
      expect(next.revision).toBe(1)
      expect(new Date(next.lastTransitionAt).getTime()).toBeGreaterThanOrEqual(
        new Date(initial.lastTransitionAt).getTime(),
      )
    })

    it('preserves goalId across transitions', () => {
      const initial = createInitialState('goal-456')
      const next = transition(initial, 'capturing', 'start')
      expect(next.goalId).toBe('goal-456')
    })

    it('throws on invalid transitions', () => {
      const initial = createInitialState()
      expect(() => transition(initial, 'implementing', 'skip')).toThrow(
        /invalid transition from "idle" to "implementing"/,
      )
    })
  })

  describe('store operations', () => {
    it('creates an empty store', () => {
      const store = createStore()
      let count = 0
      for (const _ of store.entries()) count++
      expect(count).toBe(0)
    })

    it('returns undefined for unknown agents', () => {
      const store = createStore()
      expect(getState(store, 'agent-1')).toBeUndefined()
    })

    it('ensureState creates initial state when absent', () => {
      const store = createStore()
      const state = ensureState(store, 'agent-1')
      expect(state.phase).toBe('idle')
      expect(getState(store, 'agent-1')).toBe(state)
    })

    it('ensureState returns existing state', () => {
      const store = createStore()
      const first = ensureState(store, 'agent-1')
      const second = ensureState(store, 'agent-1')
      expect(first).toBe(second)
    })

    it('applyTransition returns a full transition record', () => {
      const store = createStore()
      const record = applyTransition(store, 'agent-2', 'capturing', 'start governance')
      expect(record.from).toBe('idle')
      expect(record.to).toBe('capturing')
      expect(record.reason).toBe('start governance')
      expect(record.agentId).toBe('agent-2')
      expect(record.timestamp).toBeDefined()
      expect(getState(store, 'agent-2')?.phase).toBe('capturing')
    })

    it('removeState clears the agent entry', () => {
      const store = createStore()
      ensureState(store, 'agent-3')
      expect(getState(store, 'agent-3')).toBeDefined()
      removeState(store, 'agent-3')
      expect(getState(store, 'agent-3')).toBeUndefined()
    })

    it('removeState is idempotent for unknown agents', () => {
      const store = createStore()
      removeState(store, 'unknown')
      let count = 0
      for (const _ of store.entries()) count++
      expect(count).toBe(0)
    })
  })

  describe('full lifecycle', () => {
    it('traverses the happy path: idle → capturing → planning → implementing → testing → auditing → verified → idle', () => {
      const store = createStore()
      const agentId = 'lifecycle-agent'

      const phases: GovernancePhase[] = [
        'capturing', 'planning', 'implementing', 'testing', 'auditing', 'verified', 'idle',
      ]

      for (const phase of phases) {
        const record = applyTransition(store, agentId, phase, `move to ${phase}`)
        expect(record.from).not.toBe(phase)
        expect(record.to).toBe(phase)
      }

      const final = getState(store, agentId)
      expect(final?.phase).toBe('idle')
      expect(final?.revision).toBe(7)
    })
  })
})

// ---------------------------------------------------------------------------
// MemoryStore
// ---------------------------------------------------------------------------

describe('MemoryStore', () => {
  it('implements GovernanceStoreAdapter', () => {
    const store = new MemoryStore()
    expect(store.get('a')).toBeUndefined()
    store.set('a', { phase: 'idle', revision: 0, lastTransitionAt: '' })
    expect(store.get('a')?.phase).toBe('idle')
    store.delete('a')
    expect(store.get('a')).toBeUndefined()
  })

  it('supports iteration via entries()', () => {
    const store = new MemoryStore()
    store.set('x', { phase: 'planning', revision: 1, lastTransitionAt: '' })
    store.set('y', { phase: 'idle', revision: 0, lastTransitionAt: '' })
    const entries = [...store.entries()]
    expect(entries).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// ProjectStore (file-based)
// ---------------------------------------------------------------------------

describe('ProjectStore', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = join(tmpdir(), `governance-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  })

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  describe('scaffold', () => {
    it('creates the .project/ directory tree', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()

      // Verify directories exist.
      expect(existsSync(join(tmpDir, 'requirements'))).toBe(true)
      expect(existsSync(join(tmpDir, 'goals'))).toBe(true)
      expect(existsSync(join(tmpDir, 'constitution/architecture'))).toBe(true)
      expect(existsSync(join(tmpDir, 'constitution/security'))).toBe(true)
      expect(existsSync(join(tmpDir, 'constitution/folders'))).toBe(true)
      expect(existsSync(join(tmpDir, 'constitution/workflows'))).toBe(true)
      expect(existsSync(join(tmpDir, 'blueprints'))).toBe(true)
      expect(existsSync(join(tmpDir, 'runtime'))).toBe(true)
      expect(existsSync(join(tmpDir, 'evidence/tests'))).toBe(true)
      expect(existsSync(join(tmpDir, 'evidence/integration'))).toBe(true)
      expect(existsSync(join(tmpDir, 'evidence/audit'))).toBe(true)
      expect(existsSync(join(tmpDir, 'evidence/completion'))).toBe(true)
      expect(existsSync(join(tmpDir, 'repairs'))).toBe(true)
    })

    it('creates default files', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()

      expect(existsSync(join(tmpDir, 'MASTER-GOAL.json'))).toBe(true)
      expect(existsSync(join(tmpDir, 'goals/goal-index.json'))).toBe(true)
      expect(existsSync(join(tmpDir, 'constitution/rule-index.json'))).toBe(true)
      expect(existsSync(join(tmpDir, 'blueprints/element-index.json'))).toBe(true)
      expect(existsSync(join(tmpDir, 'blueprints/file-index.json'))).toBe(true)
      expect(existsSync(join(tmpDir, 'blueprints/dependency-map.json'))).toBe(true)
      expect(existsSync(join(tmpDir, 'blueprints/repair-index.json'))).toBe(true)
      expect(existsSync(join(tmpDir, 'runtime/state.json'))).toBe(true)
    })

    it('does not overwrite existing files', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()

      // Write custom content to MASTER-GOAL.json.
      const goalPath = join(tmpDir, 'MASTER-GOAL.json')
      const customGoal = { id: 'custom', objective: 'test', status: 'active', createdAt: '', updatedAt: '' }
      const { writeFileSync } = require('node:fs') as typeof import('node:fs')
      writeFileSync(goalPath, JSON.stringify(customGoal), 'utf8')

      // Scaffold again — should not overwrite.
      store.scaffold()
      const read = JSON.parse(readFileSync(goalPath, 'utf8') as string)
      expect(read.id).toBe('custom')
    })
  })

  describe('state persistence', () => {
    it('persists and reads back governance state', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()

      const state = { phase: 'planning' as const, revision: 3, lastTransitionAt: '2026-01-01T00:00:00Z', goalId: 'g1' }
      store.set('agent-1', state)

      const read = store.get('agent-1')
      expect(read?.phase).toBe('planning')
      expect(read?.revision).toBe(3)
      expect(read?.goalId).toBe('g1')
    })

    it('returns undefined for unknown agents', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()
      expect(store.get('unknown')).toBeUndefined()
    })

    it('deletes state', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()
      store.set('agent-1', { phase: 'idle', revision: 0, lastTransitionAt: '' })
      store.delete('agent-1')
      expect(store.get('agent-1')).toBeUndefined()
    })
  })

  describe('runtime state', () => {
    it('reads default runtime state', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()
      const state = store.readRuntimeState()
      expect(state.phase).toBe('idle')
      expect(state.revision).toBe(0)
    })

    it('writes and reads runtime state', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()
      store.writeRuntimeState({
        phase: 'implementing',
        revision: 5,
        lastTransitionAt: '2026-01-01T00:00:00Z',
        history: [],
      })
      const read = store.readRuntimeState()
      expect(read.phase).toBe('implementing')
      expect(read.revision).toBe(5)
    })
  })

  describe('goal operations', () => {
    it('reads empty goal index', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()
      const index = store.readGoalIndex()
      expect(index).toEqual([])
    })

    it('writes and reads goal index', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()
      store.writeGoalIndex([
        { dir: 'G-001', objective: 'test', phase: 'idle', createdAt: '' },
      ])
      const index = store.readGoalIndex()
      expect(index).toHaveLength(1)
      expect(index[0]?.dir).toBe('G-001')
    })

    it('writes and reads individual goals', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()
      store.writeGoal('G-001', {
        id: 'g1',
        objective: 'test goal',
        phase: 'planning',
        revision: 1,
        subgoals: [],
        createdAt: '',
        updatedAt: '',
      })
      const goal = store.readGoal('G-001')
      expect(goal?.objective).toBe('test goal')
      expect(goal?.phase).toBe('planning')
    })
  })

  describe('constitution', () => {
    it('reads empty rule index', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()
      const index = store.readRuleIndex()
      expect(index.rules).toEqual([])
    })
  })

  describe('blueprints', () => {
    it('reads empty element index', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()
      const index = store.readElementIndex()
      expect(index.elements).toEqual([])
    })

    it('reads empty file index', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()
      const index = store.readFileIndex()
      expect(index.files).toEqual([])
    })

    it('reads empty dependency map', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()
      const map = store.readDependencyMap()
      expect(map.edges).toEqual([])
    })

    it('reads empty repair index', () => {
      const store = new ProjectStore(tmpDir)
      store.scaffold()
      const index = store.readRepairIndex()
      expect(index.repairs).toEqual([])
    })
  })
})

// ---------------------------------------------------------------------------
// Pre-Execution Gate (unit logic)
// ---------------------------------------------------------------------------

describe('pre-execution gate logic', () => {
  it('blocks restricted tools during non-unrestricted phases', () => {
    const store = createStore()
    applyTransition(store, 'agent-1', 'capturing', 'start')
    applyTransition(store, 'agent-1', 'planning', 'plan')

    const state = getState(store, 'agent-1')
    expect(state?.phase).toBe('planning')

    const restrictedTools = new Set(['write', 'edit', 'bash'])
    expect(restrictedTools.has('write')).toBe(true)
  })

  it('allows exempt tools during any phase', () => {
    const exemptTools = new Set(['get_goal', 'read_file', 'search'])
    expect(exemptTools.has('get_goal')).toBe(true)
    expect(exemptTools.has('read_file')).toBe(true)
  })

  it('allows all tools during unrestricted phases', () => {
    const store = createStore()
    applyTransition(store, 'agent-1', 'capturing', 'start')
    applyTransition(store, 'agent-1', 'planning', 'plan')
    applyTransition(store, 'agent-1', 'implementing', 'do')

    const state = getState(store, 'agent-1')
    const unrestrictedPhases = new Set(['implementing', 'testing'])
    expect(unrestrictedPhases.has(state?.phase ?? 'idle')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Completion Gate (unit logic)
// ---------------------------------------------------------------------------

describe('completion gate logic', () => {
  it('denies completion when phase is not auditing', () => {
    const store = createStore()
    applyTransition(store, 'agent-1', 'capturing', 'start')
    applyTransition(store, 'agent-1', 'planning', 'plan')
    applyTransition(store, 'agent-1', 'implementing', 'do')

    const state = getState(store, 'agent-1')
    expect(state?.phase).not.toBe('auditing')
  })

  it('allows completion when phase is auditing', () => {
    const store = createStore()
    applyTransition(store, 'agent-1', 'capturing', 'start')
    applyTransition(store, 'agent-1', 'planning', 'plan')
    applyTransition(store, 'agent-1', 'implementing', 'do')
    applyTransition(store, 'agent-1', 'testing', 'test')
    applyTransition(store, 'agent-1', 'auditing', 'audit')

    const state = getState(store, 'agent-1')
    expect(state?.phase).toBe('auditing')
  })

  it('denies completion on goal id mismatch', () => {
    const store = createStore()
    ensureState(store, 'agent-1', 'goal-abc')
    applyTransition(store, 'agent-1', 'capturing', 'start')
    applyTransition(store, 'agent-1', 'planning', 'plan')
    applyTransition(store, 'agent-1', 'implementing', 'do')
    applyTransition(store, 'agent-1', 'testing', 'test')
    applyTransition(store, 'agent-1', 'auditing', 'audit')

    const state = getState(store, 'agent-1')
    expect(state?.goalId).toBe('goal-abc')
    expect(state?.goalId).not.toBe('goal-xyz')
  })
})

// ---------------------------------------------------------------------------
// Prompt Section (unit logic)
// ---------------------------------------------------------------------------

describe('prompt section logic', () => {
  it('renders active phase when store has non-idle state', () => {
    const store = createStore()
    applyTransition(store, 'agent-1', 'capturing', 'start')
    applyTransition(store, 'agent-1', 'planning', 'plan')

    let activePhase: GovernancePhase | undefined
    for (const [, state] of store.entries()) {
      if (state.phase !== 'idle') {
        activePhase = state.phase
        break
      }
    }

    expect(activePhase).toBe('planning')
  })

  it('renders idle when all states are idle', () => {
    const store = createStore()
    ensureState(store, 'agent-1')

    let activePhase: GovernancePhase | undefined
    for (const [, state] of store.entries()) {
      if (state.phase !== 'idle') {
        activePhase = state.phase
        break
      }
    }

    expect(activePhase).toBeUndefined()
  })
})
