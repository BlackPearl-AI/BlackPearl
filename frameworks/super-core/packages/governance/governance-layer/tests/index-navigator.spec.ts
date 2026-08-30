import { describe, expect, it, beforeEach } from 'vitest'
import {
  createNavigateIndexesTool,
  createCheckIndexStalenessTool,
  createRepairIndexBoundedTool,
  createDeduplicateContextTool,
  createEstimateContextTokensTool,
  createExpandScopeByDependencyTool,
  resetEngine,
} from '../src/index-navigator/index.ts'

describe('G-29 — Token / Context Efficiency & Index Navigator Engine', () => {
  beforeEach(() => {
    resetEngine()
  })

  it('enforces mandatory 1 to 7 navigation priority cascade', async () => {
    const navTool = createNavigateIndexesTool()
    const plan = await navTool.execute({
      task_id: 'TASK-NAV-01',
      query: 'Student report card',
      target_module: 'STU',
    }, {} as any)

    expect(plan.taskId).toBe('TASK-NAV-01')
    expect(plan.steps.length).toBe(7)

    // Verify exact level ordering
    expect(plan.steps[0].level).toBe(1)
    expect(plan.steps[0].indexType).toBe('requirement_goal')

    expect(plan.steps[1].level).toBe(2)
    expect(plan.steps[1].indexType).toBe('element')

    expect(plan.steps[2].level).toBe(3)
    expect(plan.steps[2].indexType).toBe('blueprint')

    expect(plan.steps[3].level).toBe(4)
    expect(plan.steps[3].indexType).toBe('dependency')

    expect(plan.steps[4].level).toBe(5)
    expect(plan.steps[4].indexType).toBe('file')

    expect(plan.steps[5].level).toBe(6)
    expect(plan.steps[5].indexType).toBe('repair')

    expect(plan.steps[6].level).toBe(7)
    expect(plan.steps[6].indexType).toBe('raw_source')
  })

  it('checks index staleness without full repo scan', async () => {
    const checkTool = createCheckIndexStalenessTool()
    const result = await checkTool.execute({
      index_type: 'element',
      target_module: 'FEE',
    }, {} as any)

    expect(result.indexType).toBe('element')
    expect(result.recommendedAction).toBeDefined()
    expect(result.lastSyncedAt).toBeDefined()
  })

  it('performs bounded index repair', async () => {
    const repairTool = createRepairIndexBoundedTool()
    const result = await repairTool.execute({
      index_type: 'file',
      bounded_scope: 'packages/core/session',
    }, {} as any)

    expect(result.indexType).toBe('file')
    expect(result.scope).toBe('packages/core/session')
    expect(result.success).toBe(true)
    expect(result.completedAt).toBeDefined()
  })

  it('deduplicates repetitive context and calculates savings', async () => {
    const dedupTool = createDeduplicateContextTool()
    const inputEntries = [
      'const user = { id: 1 };',
      'const user = { id: 1 };',
      'const fee = 100;',
      'const user = { id: 1 };',
    ]

    const result = await dedupTool.execute({ entries: inputEntries }, {} as any)

    expect(result.originalCount).toBe(4)
    expect(result.uniqueCount).toBe(2)
    expect(result.duplicatesRemoved).toBe(2)
    expect(result.tokenSavings).toBeGreaterThan(0)
    expect(result.deduplicatedEntries).toEqual(['const user = { id: 1 };', 'const fee = 100;'])
  })

  it('estimates token and byte accounting report', async () => {
    const tokenTool = createEstimateContextTokensTool()
    const result = await tokenTool.execute({
      entries: ['Alpha', 'Beta', 'Gamma'],
    }, {} as any)

    expect(result.totalTokens).toBeGreaterThan(0)
    expect(result.totalBytes).toBeGreaterThan(0)
    expect(result.efficiencyRatio).toBeDefined()
  })

  it('performs BFS dependency scope expansion with max hops limit', async () => {
    const expandTool = createExpandScopeByDependencyTool()
    const result = await expandTool.execute({
      start_module: 'core/agent-loop',
      max_hops: 2,
    }, {} as any)

    expect(result.startModule).toBe('core/agent-loop')
    expect(result.maxHops).toBe(2)
    expect(Array.isArray(result.expandedModules)).toBe(true)
    expect(result.expandedModules).toContain('core/agent-loop')
  })
})
