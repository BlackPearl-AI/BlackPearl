/**
 * PHASE 14 — Vertical Slice Engine
 *
 * एक समय में एक Vertical Slice।
 *
 * हर slice = UI + API + DB + Business Logic + Mapping + Permission + Print + Integration
 *
 * Engine manages:
 *   - Slice CRUD (create, complete, fail, skip)
 *   - Layer status tracking
 *   - Validation (all 8 layers must complete)
 *   - Execution order enforcement
 *   - Traceability chain
 */

import type {
  SliceStatus,
  LayerId,
  SliceLayer,
  SliceValidation,
  SliceTraceability,
  VerticalSlice,
  SliceSummary,
  SliceIssue,
  SliceValidationResult,
} from './types.ts'
import { LAYER_LABELS, LAYER_ORDER } from './types.ts'

// ---------------------------------------------------------------------------
// Slice ID generator
// ---------------------------------------------------------------------------

let sliceSeq = 0

function nextSliceId(moduleId: string): string {
  sliceSeq++
  return `VS-${moduleId.toUpperCase()}-${String(sliceSeq).padStart(3, '0')}`
}

function resetSeq(): void {
  sliceSeq = 0
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class VerticalSliceEngine {
  private slices: Map<string, VerticalSlice> = new Map()
  private moduleSlices: Map<string, string[]> = new Map()

  constructor() {
    resetSeq()
  }

  // -- Create --------------------------------------------------------------

  /**
   * Create a new vertical slice with all 8 layers.
   */
  create(input: {
    name: string
    moduleId: string
    priority?: 'critical' | 'high' | 'medium' | 'low'
    order?: number
    traceability: SliceTraceability
  }): VerticalSlice {
    const id = nextSliceId(input.moduleId)
    const now = new Date().toISOString()

    const layers: Record<LayerId, SliceLayer> = {} as Record<LayerId, SliceLayer>
    for (const layerId of LAYER_ORDER) {
      layers[layerId] = {
        id: layerId,
        label: LAYER_LABELS[layerId],
        status: 'not-started',
        description: '',
        files: [],
        elementIds: [],
        errors: [],
        notes: '',
      }
    }

    const validation: SliceValidation = {
      isValid: false,
      errors: ['No layers started'],
      warnings: [],
      completedLayers: [],
      incompleteLayers: [...LAYER_ORDER],
      completionPct: 0,
    }

    const slice: VerticalSlice = {
      id,
      name: input.name,
      moduleId: input.moduleId,
      status: 'planned',
      priority: input.priority ?? 'medium',
      order: input.order ?? this.slices.size,
      layers,
      traceability: input.traceability,
      validation,
      files: [],
      testFiles: [],
      notes: '',
      createdAt: now,
      updatedAt: now,
    }

    this.slices.set(id, slice)

    const moduleSliceIds = this.moduleSlices.get(input.moduleId) ?? []
    moduleSliceIds.push(id)
    this.moduleSlices.set(input.moduleId, moduleSliceIds)

    return slice
  }

  // -- Get -----------------------------------------------------------------

  get(sliceId: string): VerticalSlice | undefined {
    return this.slices.get(sliceId)
  }

  getOrThrow(sliceId: string): VerticalSlice {
    const slice = this.slices.get(sliceId)
    if (!slice) throw new Error(`Slice not found: ${sliceId}`)
    return slice
  }

  getByModule(moduleId: string): readonly VerticalSlice[] {
    const ids = this.moduleSlices.get(moduleId) ?? []
    return ids.map(id => this.slices.get(id)!).filter(Boolean)
  }

  getAll(): readonly VerticalSlice[] {
    return [...this.slices.values()]
  }

  // -- Layer Status --------------------------------------------------------

  /**
   * Start a layer (not-started → in-progress).
   */
  startLayer(sliceId: string, layerId: LayerId): SliceLayer {
    const slice = this.getOrThrow(sliceId)
    this.ensureNotTerminal(slice)

    const layer = slice.layers[layerId]
    if (layer.status !== 'not-started') {
      throw new Error(`Layer ${layerId} already started (status: ${layer.status})`)
    }

    // Enforce order: check that all prior layers are completed or skipped
    const layerIdx = LAYER_ORDER.indexOf(layerId)
    for (let i = 0; i < layerIdx; i++) {
      const priorId = LAYER_ORDER[i]
      if (priorId === undefined) continue
      const prior = slice.layers[priorId]
      if (prior.status !== 'completed' && prior.status !== 'skipped') {
        throw new Error(
          `Cannot start ${layerId}: prior layer ${priorId} must be completed first (status: ${prior.status})`,
        )
      }
    }

    layer.status = 'in-progress'
    if (slice.status === 'planned') {
      slice.status = 'in-progress'
    }
    slice.updatedAt = new Date().toISOString()
    return layer
  }

  /**
   * Complete a layer (in-progress → completed).
   */
  completeLayer(
    sliceId: string,
    layerId: LayerId,
    input?: {
      files?: readonly string[]
      elementIds?: readonly string[]
      notes?: string
    },
  ): SliceLayer {
    const slice = this.getOrThrow(sliceId)
    this.ensureNotTerminal(slice)

    const layer = slice.layers[layerId]
    if (layer.status !== 'in-progress') {
      throw new Error(`Layer ${layerId} not in-progress (status: ${layer.status})`)
    }

    layer.status = 'completed'
    if (input?.files) layer.files.push(...input.files)
    if (input?.elementIds) layer.elementIds.push(...input.elementIds)
    if (input?.notes) layer.notes = input.notes

    this.revalidate(slice)
    slice.updatedAt = new Date().toISOString()
    return layer
  }

  /**
   * Fail a layer (in-progress → failed).
   */
  failLayer(sliceId: string, layerId: LayerId, error: string): SliceLayer {
    const slice = this.getOrThrow(sliceId)
    this.ensureNotTerminal(slice)

    const layer = slice.layers[layerId]
    layer.status = 'failed'
    layer.errors = [...layer.errors, error]
    slice.status = 'failed'
    slice.updatedAt = new Date().toISOString()
    return layer
  }

  /**
   * Skip a layer (not-started → skipped).
   */
  skipLayer(sliceId: string, layerId: LayerId, reason: string): SliceLayer {
    const slice = this.getOrThrow(sliceId)
    this.ensureNotTerminal(slice)

    const layer = slice.layers[layerId]
    if (layer.status !== 'not-started') {
      throw new Error(`Layer ${layerId} not in startable state (status: ${layer.status})`)
    }

    layer.status = 'skipped'
    layer.notes = reason
    this.revalidate(slice)
    slice.updatedAt = new Date().toISOString()
    return layer
  }

  // -- Slice Status --------------------------------------------------------

  /**
   * Complete entire slice (all layers done).
   */
  completeSlice(sliceId: string, notes?: string): VerticalSlice {
    const slice = this.getOrThrow(sliceId)
    this.ensureNotTerminal(slice)

    // Check all layers are completed or skipped
    for (const layerId of LAYER_ORDER) {
      const layer = slice.layers[layerId]
      if (layer.status !== 'completed' && layer.status !== 'skipped') {
        throw new Error(
          `Cannot complete slice: layer ${layerId} is ${layer.status}`,
        )
      }
    }

    slice.status = 'completed'
    if (notes) slice.notes = notes
    this.revalidate(slice)
    slice.updatedAt = new Date().toISOString()
    return slice
  }

  /**
   * Skip entire slice.
   */
  skipSlice(sliceId: string, reason: string): VerticalSlice {
    const slice = this.getOrThrow(sliceId)
    this.ensureNotTerminal(slice)

    slice.status = 'skipped'
    slice.notes = reason
    for (const layerId of LAYER_ORDER) {
      const layer = slice.layers[layerId]
      if (layer.status === 'not-started') {
        layer.status = 'skipped'
      }
    }
    this.revalidate(slice)
    slice.updatedAt = new Date().toISOString()
    return slice
  }

  /**
   * Block entire slice.
   */
  blockSlice(sliceId: string, reason: string): VerticalSlice {
    const slice = this.getOrThrow(sliceId)
    this.ensureNotTerminal(slice)

    slice.status = 'blocked'
    slice.notes = reason
    slice.updatedAt = new Date().toISOString()
    return slice
  }

  /**
   * Unblock a slice (blocked → in-progress).
   */
  unblockSlice(sliceId: string): VerticalSlice {
    const slice = this.getOrThrow(sliceId)
    if (slice.status !== 'blocked') {
      throw new Error(`Slice ${sliceId} not blocked (status: ${slice.status})`)
    }

    slice.status = 'in-progress'
    slice.notes = ''
    slice.updatedAt = new Date().toISOString()
    return slice
  }

  // -- Validation ----------------------------------------------------------

  /**
   * Validate a slice — can coding proceed?
   */
  validate(sliceId: string): SliceValidationResult {
    const slice = this.getOrThrow(sliceId)
    const issues: SliceIssue[] = []
    const completedLayers: LayerId[] = []
    const incompleteLayers: LayerId[] = []

    for (const layerId of LAYER_ORDER) {
      const layer = slice.layers[layerId]
      if (layer.status === 'completed') {
        completedLayers.push(layerId)
      } else if (layer.status === 'skipped') {
        // skipped layers don't count toward completion
      } else if (layer.status === 'failed') {
        incompleteLayers.push(layerId)
        issues.push({
          type: 'layer-failed',
          severity: 'error',
          message: `Layer ${layerId} has failed: ${layer.errors.join('; ')}`,
          layerId,
        })
      } else {
        incompleteLayers.push(layerId)
        if (layer.status === 'not-started') {
          issues.push({
            type: 'layer-not-started',
            severity: 'warning',
            message: `Layer ${layerId} has not been started`,
            layerId,
          })
        }
      }
    }

    // Check traceability
    if (!slice.traceability.crId) {
      issues.push({
        type: 'missing-traceability',
        severity: 'warning',
        message: 'No CR-ID linked to this slice',
      })
    }

    // Check files
    if (completedLayers.length > 0 && slice.files.length === 0) {
      issues.push({
        type: 'missing-files',
        severity: 'info',
        message: 'No files registered for completed layers',
      })
    }

    const activeLayers = LAYER_ORDER.filter(l => slice.layers[l].status !== 'skipped')
    const completionPct = activeLayers.length > 0
      ? Math.round((completedLayers.length / activeLayers.length) * 100)
      : 100

    const hasErrors = issues.some(i => i.severity === 'error')
    const allDone = incompleteLayers.length === 0

    const validation: SliceValidation = {
      isValid: allDone && !hasErrors,
      errors: issues.filter(i => i.severity === 'error').map(i => i.message),
      warnings: issues.filter(i => i.severity === 'warning').map(i => i.message),
      completedLayers,
      incompleteLayers,
      completionPct,
    }

    slice.validation = validation
    slice.updatedAt = new Date().toISOString()

    return {
      sliceId,
      canCode: allDone && !hasErrors,
      issues,
      validation,
      validatedAt: new Date().toISOString(),
    }
  }

  // -- Summary -------------------------------------------------------------

  /**
   * Summary statistics across all slices.
   */
  summary(): SliceSummary {
    const all = this.getAll()
    const byStatus: Record<SliceStatus, number> = {
      planned: 0,
      'in-progress': 0,
      completed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
    }
    const byModule: Record<string, number> = {}
    let totalLayers = 0
    let completedLayers = 0

    for (const slice of all) {
      byStatus[slice.status]++
      byModule[slice.moduleId] = (byModule[slice.moduleId] ?? 0) + 1

      for (const layerId of LAYER_ORDER) {
        totalLayers++
        if (slice.layers[layerId].status === 'completed') {
          completedLayers++
        }
      }
    }

    const nonSkipped = all.filter(s => s.status !== 'skipped')
    const completedSlices = all.filter(s => s.status === 'completed')

    return {
      total: all.length,
      byStatus,
      byModule,
      totalLayers,
      completedLayers,
      layerCompletionPct: totalLayers > 0 ? Math.round((completedLayers / totalLayers) * 100) : 0,
      sliceCompletionPct: nonSkipped.length > 0 ? Math.round((completedSlices.length / nonSkipped.length) * 100) : 0,
    }
  }

  // -- Helpers -------------------------------------------------------------

  private ensureNotTerminal(slice: VerticalSlice): void {
    if (slice.status === 'completed' || slice.status === 'skipped' || slice.status === 'blocked') {
      throw new Error(`Slice ${slice.id} is ${slice.status} and cannot be modified`)
    }
  }

  /**
   * Recompute validation after layer changes.
   */
  private revalidate(slice: VerticalSlice): void {
    const completedLayers: LayerId[] = []
    const incompleteLayers: LayerId[] = []
    const errors: string[] = []
    const warnings: string[] = []

    for (const layerId of LAYER_ORDER) {
      const layer = slice.layers[layerId]
      if (layer.status === 'completed') {
        completedLayers.push(layerId)
      } else if (layer.status === 'skipped') {
        // skip
      } else {
        incompleteLayers.push(layerId)
      }
    }

    const activeLayers = LAYER_ORDER.filter(l => slice.layers[l].status !== 'skipped')
    const completionPct = activeLayers.length > 0
      ? Math.round((completedLayers.length / activeLayers.length) * 100)
      : 100

    if (incompleteLayers.length > 0) {
      warnings.push(`${incompleteLayers.length} layer(s) incomplete`)
    }

    slice.validation = {
      isValid: incompleteLayers.length === 0,
      errors,
      warnings,
      completedLayers,
      incompleteLayers,
      completionPct,
    }

    // Collect files from all completed layers
    const allFiles: string[] = []
    for (const layerId of LAYER_ORDER) {
      const layer = slice.layers[layerId]
      allFiles.push(...layer.files)
    }
    ;(slice as unknown as { files: string[] }).files = allFiles
  }
}
