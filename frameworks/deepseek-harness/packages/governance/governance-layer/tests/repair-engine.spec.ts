import { describe, expect, it, beforeEach } from 'vitest'
import {
  createInitiateRepairTool,
  createExpandRepairScopeTool,
  createCompleteRepairTool,
  resetRepairEngine,
  getRepairCache,
} from '../src/repair-engine/index.ts'

describe('G-21 — Direct Repair Engine', () => {
  beforeEach(() => {
    resetRepairEngine()
  })

  it('resolves repair request with minimum scope first', async () => {
    const initiateTool = createInitiateRepairTool()
    const result = await initiateTool.execute({
      repair_target: 'Student fee payment receipt button',
    }, {} as any)

    expect(result.taskId).toBeDefined()
    expect(result.target).toBe('Student fee payment receipt button')
    expect(result.scope).toBe('minimum')
    expect(result.status).toBe('pending')
    expect(result.relevantRules).toBeDefined()
    expect(Array.isArray(result.sourceFiles)).toBe(true)
    expect(Array.isArray(result.directDependencies)).toBe(true)
    expect(result.regressionTestsRequired).toBeDefined()
  })

  it('rejects empty repair target', async () => {
    const initiateTool = createInitiateRepairTool()
    await expect(initiateTool.execute({ repair_target: '' }, {} as any)).rejects.toThrow('repair target is required')
  })

  it('stores resolution in repairCache', async () => {
    const initiateTool = createInitiateRepairTool()
    const result = await initiateTool.execute({ repair_target: 'Invoice export' }, {} as any)

    const cache = getRepairCache()
    expect(cache.has(result.taskId)).toBe(true)
    expect(cache.get(result.taskId)?.target).toBe('Invoice export')
  })

  it('expands repair scope one-hop upon evidence', async () => {
    const initiateTool = createInitiateRepairTool()
    const task = await initiateTool.execute({ repair_target: 'Attendance sync' }, {} as any)

    const expandTool = createExpandRepairScopeTool()
    const expanded = await expandTool.execute({ repair_task_id: task.taskId }, {} as any)

    expect(expanded.taskId).toBe(task.taskId)
    expect(expanded.scope).toBe('one-hop')
    expect(expanded.expandedAt).toBeDefined()
  })

  it('fails expansion if repair task not found', async () => {
    const expandTool = createExpandRepairScopeTool()
    await expect(expandTool.execute({ repair_task_id: 'NON_EXISTENT' }, {} as any)).rejects.toThrow(/not found/)
  })

  it('completes repair and updates index sync status', async () => {
    const initiateTool = createInitiateRepairTool()
    const task = await initiateTool.execute({ repair_target: 'Login validation' }, {} as any)

    const completeTool = createCompleteRepairTool()
    const completed = await completeTool.execute({
      repair_task_id: task.taskId,
      changes: ['src/auth/login.ts', 'src/auth/validation.ts'],
    }, {} as any)

    expect(completed.status).toBe('completed')
    expect(completed.completedAt).toBeDefined()
    expect(completed.changes).toEqual(['src/auth/login.ts', 'src/auth/validation.ts'])
    expect(completed.indexSync).toBeDefined()
    expect(completed.indexSync?.elementRegistry).toBeDefined()
    expect(completed.indexSync?.blueprint).toBeDefined()
    expect(completed.indexSync?.dependencyGraph).toBeDefined()
  })
})
