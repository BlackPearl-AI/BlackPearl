/**
 * Project Store persistence tests — DB Test category for PHASE 15
 * 
 * Tests file-backed GovernanceStoreAdapter persistence via ProjectStore:
 * - Scaffold creates directory structure
 * - State read/write preserves data
 * - File I/O creates expected .project/ files
 * - Goal index persistence
 * - Agent state lifecycle
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ProjectStore, MemoryStore } from '../src/project-store'
import { rmSync } from 'node:fs'

const TEST_PROJECT_ROOT = '/tmp/governance-test-project'
const TEST_AGENT_ID = 'test-agent-001'

// Clean up before/after each test
beforeEach(() => {
  rmSync(TEST_PROJECT_ROOT, { recursive: true, force: true })
})

afterEach(() => {
  rmSync(TEST_PROJECT_ROOT, { recursive: true, force: true })
})

describe('Project Store — DB Persistence (PHASE 15)', () => {
  let store: ProjectStore

  beforeEach(() => {
    store = new ProjectStore(TEST_PROJECT_ROOT)
    store.scaffold()
  })

  describe('scaffold creates directory structure', () => {
    it('should create all required directories', () => {
      const requiredDirs = [
        'requirements',
        'goals',
        'constitution/architecture',
        'constitution/security',
        'constitution/folders',
        'constitution/workflows',
        'blueprints',
        'runtime',
        'evidence/tests',
        'evidence/integration',
        'evidence/audit',
        'evidence/completion',
        'repairs',
      ]

      for (const dir of requiredDirs) {
        const dirPath = `${TEST_PROJECT_ROOT}/${dir}`
        expect(require('node:fs').existsSync(dirPath)).toBe(true)
      }
    })

    it('should create all required files with defaults', () => {
      const requiredFiles = [
        'MASTER-GOAL.json',
        'goals/goal-index.json',
        'constitution/rule-index.json',
        'blueprints/element-index.json',
        'blueprints/file-index.json',
        'blueprints/dependency-map.json',
        'blueprints/repair-index.json',
        'runtime/state.json',
      ]

      for (const file of requiredFiles) {
        const filePath = `${TEST_PROJECT_ROOT}/${file}`
        expect(require('node:fs').existsSync(filePath)).toBe(true)
      }
    })
  })

  describe('state read/write preserves data', () => {
    it('should persist and retrieve runtime state', () => {
      // Write a custom runtime state
      store.writeRuntimeState({
        phase: 'capturing',
        revision: 1,
        lastTransitionAt: new Date().toISOString(),
        history: [],
      })

      // Read it back
      const state = store.readRuntimeState()
      expect(state.phase).toBe('capturing')
      expect(state.revision).toBe(1)
    })

    it('should persist and retrieve goal index', () => {
      // Write goal index
      store.writeGoalIndex([
        { id: 'goal-001', name: 'School ERP', status: 'active' },
        { id: 'goal-002', name: 'Fee Management', status: 'pending' },
      ])

      // Read it back
      const index = store.readGoalIndex()
      expect(index).toHaveLength(2)
      expect(index[0].name).toBe('School ERP')
      expect(index[1].name).toBe('Fee Management')
    })

    it('should persist and retrieve goal metadata', () => {
      // Write a goal
      store.writeGoal('goal-001', {
        id: 'goal-001',
        objective: 'School management system',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // Read it back
      const goal = store.readGoal('goal-001')
      expect(goal).toBeDefined()
      expect(goal?.objective).toBe('School management system')
      expect(goal?.status).toBe('active')
    })
  })

  describe('agent state lifecycle', () => {
    it('should set and get agent state', () => {
      const state = {
        phase: 'idle',
        goalId: 'master-001',
        revision: 0,
        lastTransitionAt: new Date().toISOString(),
        history: [],
      }

      store.set(TEST_AGENT_ID, state)
      const retrieved = store.get(TEST_AGENT_ID)

      expect(retrieved).toBeDefined()
      expect(retrieved?.phase).toBe('idle')
      expect(retrieved?.goalId).toBe('master-001')
    })
  })

  describe('MemoryStore comparison', () => {
    it('MemoryStore should have same interface for comparison', () => {
      const memStore = new MemoryStore()

      // Both should have compatible get/set interfaces
      expect(memStore.get).toBeDefined()
      expect(memStore.set).toBeDefined()
      expect(memStore.delete).toBeDefined()
      expect(memStore.clear).toBeDefined()

      // ProjectStore should also have these
      expect(store.get).toBeDefined()
      expect(store.set).toBeDefined()
      expect(store.delete).toBeDefined()
      expect(store.clear).toBeDefined()
    })
  })
})