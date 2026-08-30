import { describe, expect, it, beforeEach } from 'vitest'
import {
  createBuildContextPackTool,
  createGetContextPackManifestTool,
  createEstimateContextSizeTool,
  resetEngine,
} from '../src/context-pack/index.ts'

describe('G-28 — Task-Specific Context Pack Engine', () => {
  beforeEach(() => {
    resetEngine()
  })

  it('builds compact context pack with machine-readable manifest', async () => {
    const buildTool = createBuildContextPackTool()
    const pack = await buildTool.execute({
      task_id: 'TASK-FEE-01',
      module_id: 'FEE',
      query: 'Fee receipt generation',
    }, {} as any)

    expect(pack.manifest).toBeDefined()
    expect(pack.manifest.packId).toMatch(/^CPACK-/)
    expect(pack.manifest.taskId).toBe('TASK-FEE-01')
    expect(pack.manifest.moduleId).toBe('FEE')
    expect(pack.manifest.totalTokenEstimate).toBeGreaterThan(0)
    expect(pack.manifest.totalSizeBytes).toBeGreaterThan(0)
    expect(pack.manifest.checksum).toBeDefined()
    expect(Array.isArray(pack.manifest.items)).toBe(true)
    expect(pack.promptPayload).toContain('# TASK CONTEXT PACK')
  })

  it('retrieves machine-readable manifest via get_context_pack_manifest', async () => {
    const buildTool = createBuildContextPackTool()
    const pack = await buildTool.execute({
      task_id: 'TASK-STU-02',
      module_id: 'STU',
    }, {} as any)

    const manifestTool = createGetContextPackManifestTool()
    const manifest = await manifestTool.execute({ pack_id: pack.manifest.packId }, {} as any)

    expect(manifest.packId).toBe(pack.manifest.packId)
    expect(manifest.taskId).toBe('TASK-STU-02')
    expect(manifest.items).toBeDefined()
  })

  it('estimates context size before generation', async () => {
    const estimateTool = createEstimateContextSizeTool()
    const estimate = await estimateTool.execute({
      task_id: 'TASK-EST-01',
      module_id: 'ATT',
    }, {} as any)

    expect(estimate.taskId).toBe('TASK-EST-01')
    expect(estimate.totalTokenEstimate).toBeDefined()
    expect(estimate.totalSizeBytes).toBeDefined()
    expect(estimate.itemCount).toBeDefined()
  })

  it('throws when getting manifest for non-existent pack', async () => {
    const manifestTool = createGetContextPackManifestTool()
    await expect(manifestTool.execute({ pack_id: 'NON_EXISTENT' }, {} as any)).rejects.toThrow(/not found/)
  })
})
