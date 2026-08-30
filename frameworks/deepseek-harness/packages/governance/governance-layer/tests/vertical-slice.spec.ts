/**
 * PHASE 14 — Vertical Slice Tests
 *
 * एक समय में एक Vertical Slice। No confusion.
 *
 * हर slice = UI + API + DB + Business Logic + Mapping + Permission + Print + Integration
 *
 * Tests cover:
 *   - Slice CRUD
 *   - Layer status transitions
 *   - Layer order enforcement
 *   - Validation
 *   - Block/unblock
 *   - Skip handling
 *   - Summary statistics
 *   - School ERP full lifecycle
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  VerticalSliceEngine,
  resetEngine,
  getActiveEngine,
  createCreateVerticalSliceTool,
  createStartSliceLayerTool,
  createCompleteSliceLayerTool,
  createValidateSliceTool,
  createGetSliceStatusTool,
  createGetSliceSummaryTool,
  createCompleteVerticalSliceTool,
  createGetModuleSlicesTool,
} from '../src/vertical-slice/index.ts'
import type { SliceTraceability, LayerId } from '../src/vertical-slice/types.ts'
import { LAYER_ORDER } from '../src/vertical-slice/types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrace(moduleId: string, overrides?: Partial<SliceTraceability>): SliceTraceability {
  return {
    crId: `CR-${moduleId}-001`,
    goalId: `GL-${moduleId}-001`,
    taskId: `T-${moduleId}-001`,
    elementId: `EL-${moduleId}-001`,
    moduleId,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Engine — Create
// ---------------------------------------------------------------------------

describe('VerticalSliceEngine', () => {
  let engine: VerticalSliceEngine

  beforeEach(() => {
    engine = new VerticalSliceEngine()
  })

  describe('create', () => {
    it('creates a slice with all 8 layers', () => {
      const slice = engine.create({
        name: 'Student Registration',
        moduleId: 'STU',
        traceability: makeTrace('STU'),
      })
      expect(slice.id).toBe('VS-STU-001')
      expect(slice.name).toBe('Student Registration')
      expect(slice.moduleId).toBe('STU')
      expect(slice.status).toBe('planned')
      expect(Object.keys(slice.layers)).toHaveLength(8)
    })

    it('creates with priority', () => {
      const slice = engine.create({
        name: 'Fee Collection',
        moduleId: 'FEE',
        priority: 'critical',
        traceability: makeTrace('FEE'),
      })
      expect(slice.priority).toBe('critical')
    })

    it('creates with order', () => {
      engine.create({
        name: 'Slice A',
        moduleId: 'MOD',
        order: 5,
        traceability: makeTrace('MOD'),
      })
      const slice = engine.get('VS-MOD-001')
      expect(slice!.order).toBe(5)
    })

    it('generates sequential IDs per module', () => {
      engine.create({ name: 'A', moduleId: 'MOD', traceability: makeTrace('MOD') })
      engine.create({ name: 'B', moduleId: 'MOD', traceability: makeTrace('MOD') })
      const slices = engine.getByModule('MOD')
      expect(slices).toHaveLength(2)
      expect(slices[0]!.id).toBe('VS-MOD-001')
      expect(slices[1]!.id).toBe('VS-MOD-002')
    })

    it('all layers start as not-started', () => {
      const slice = engine.create({
        name: 'Test',
        moduleId: 'MOD',
        traceability: makeTrace('MOD'),
      })
      for (const layerId of LAYER_ORDER) {
        expect(slice.layers[layerId].status).toBe('not-started')
      }
    })

    it('validation shows no layers started', () => {
      const slice = engine.create({
        name: 'Test',
        moduleId: 'MOD',
        traceability: makeTrace('MOD'),
      })
      expect(slice.validation.isValid).toBe(false)
      expect(slice.validation.completionPct).toBe(0)
    })
  })

  // -- Get -----------------------------------------------------------------

  describe('get', () => {
    it('returns slice by ID', () => {
      engine.create({ name: 'X', moduleId: 'MOD', traceability: makeTrace('MOD') })
      expect(engine.get('VS-MOD-001')).toBeDefined()
    })

    it('returns undefined for missing', () => {
      expect(engine.get('VS-MOD-999')).toBeUndefined()
    })

    it('getOrThrow throws for missing', () => {
      expect(() => engine.getOrThrow('VS-MOD-999')).toThrow('Slice not found')
    })

    it('getByModule returns module slices', () => {
      engine.create({ name: 'A', moduleId: 'MOD', traceability: makeTrace('MOD') })
      engine.create({ name: 'B', moduleId: 'MOD', traceability: makeTrace('MOD') })
      engine.create({ name: 'C', moduleId: 'MOD2', traceability: makeTrace('MOD2') })
      expect(engine.getByModule('MOD')).toHaveLength(2)
    })

    it('getAll returns all slices', () => {
      engine.create({ name: 'A', moduleId: 'MOD', traceability: makeTrace('MOD') })
      engine.create({ name: 'B', moduleId: 'MOD2', traceability: makeTrace('MOD2') })
      expect(engine.getAll()).toHaveLength(2)
    })
  })

  // -- Layer Transitions ---------------------------------------------------

  describe('layer transitions', () => {
    let sliceId: string

    beforeEach(() => {
      const slice = engine.create({
        name: 'Test Slice',
        moduleId: 'STU',
        traceability: makeTrace('STU'),
      })
      sliceId = slice.id
    })

    it('starts a layer (not-started -> in-progress)', () => {
      const layer = engine.startLayer(sliceId, 'db')
      expect(layer.status).toBe('in-progress')
      expect(engine.getOrThrow(sliceId).status).toBe('in-progress')
    })

    it('completes a layer (in-progress -> completed)', () => {
      engine.startLayer(sliceId, 'db')
      const layer = engine.completeLayer(sliceId, 'db', {
        files: ['src/models/student.ts'],
        notes: 'Student schema created',
      })
      expect(layer.status).toBe('completed')
      expect(layer.files).toContain('src/models/student.ts')
      expect(layer.notes).toBe('Student schema created')
    })

    it('fails a layer (in-progress -> failed)', () => {
      engine.startLayer(sliceId, 'db')
      const layer = engine.failLayer(sliceId, 'db', 'Migration failed')
      expect(layer.status).toBe('failed')
      expect(layer.errors).toContain('Migration failed')
      expect(engine.getOrThrow(sliceId).status).toBe('failed')
    })

    it('skips a layer (not-started -> skipped)', () => {
      const layer = engine.skipLayer(sliceId, 'print', 'No print needed')
      expect(layer.status).toBe('skipped')
      expect(layer.notes).toBe('No print needed')
    })

    it('cannot start a layer that is already started', () => {
      engine.startLayer(sliceId, 'db')
      expect(() => engine.startLayer(sliceId, 'db')).toThrow('already started')
    })

    it('cannot complete a layer that is not in-progress', () => {
      expect(() => engine.completeLayer(sliceId, 'db')).toThrow('not in-progress')
    })

    it('cannot skip a layer that is already started', () => {
      engine.startLayer(sliceId, 'db')
      expect(() => engine.skipLayer(sliceId, 'db', 'reason')).toThrow('not in startable state')
    })
  })

  // -- Layer Order Enforcement ---------------------------------------------

  describe('layer order enforcement', () => {
    let sliceId: string

    beforeEach(() => {
      const slice = engine.create({
        name: 'Ordered Slice',
        moduleId: 'STU',
        traceability: makeTrace('STU'),
      })
      sliceId = slice.id
    })

    it('can start layers in correct order', () => {
      for (const layerId of LAYER_ORDER) {
        engine.startLayer(sliceId, layerId)
        engine.completeLayer(sliceId, layerId)
      }
      const slice = engine.getOrThrow(sliceId)
      expect(slice.validation.completionPct).toBe(100)
    })

    it('cannot start api before db', () => {
      expect(() => engine.startLayer(sliceId, 'api')).toThrow('prior layer db must be completed')
    })

    it('cannot start ui before permission', () => {
      // Complete layers before permission (db, business-logic, mapping, api)
      for (const layerId of LAYER_ORDER) {
        if (layerId === 'permission') break
        engine.startLayer(sliceId, layerId)
        engine.completeLayer(sliceId, layerId)
      }
      // permission not done → cannot start ui
      expect(() => engine.startLayer(sliceId, 'ui')).toThrow()
    })

    it('skipped layers allow next layer to start', () => {
      // Skip db, then start business-logic
      engine.skipLayer(sliceId, 'db', 'No DB needed')
      const layer = engine.startLayer(sliceId, 'business-logic')
      expect(layer.status).toBe('in-progress')
    })

    it('can skip intermediate layers', () => {
      // Skip db, skip business-logic, start mapping
      engine.skipLayer(sliceId, 'db', 'No DB')
      engine.skipLayer(sliceId, 'business-logic', 'No BL')
      const layer = engine.startLayer(sliceId, 'mapping')
      expect(layer.status).toBe('in-progress')
    })
  })

  // -- Validation ----------------------------------------------------------

  describe('validation', () => {
    let sliceId: string

    beforeEach(() => {
      const slice = engine.create({
        name: 'Validation Slice',
        moduleId: 'STU',
        traceability: makeTrace('STU'),
      })
      sliceId = slice.id
    })

    it('validates a fresh slice as not valid', () => {
      const result = engine.validate(sliceId)
      expect(result.canCode).toBe(false)
      expect(result.validation.isValid).toBe(false)
    })

    it('validates with all layers complete', () => {
      for (const layerId of LAYER_ORDER) {
        engine.startLayer(sliceId, layerId)
        engine.completeLayer(sliceId, layerId, { files: [`${layerId}.ts`] })
      }
      const result = engine.validate(sliceId)
      expect(result.canCode).toBe(true)
      expect(result.validation.isValid).toBe(true)
      expect(result.validation.completionPct).toBe(100)
    })

    it('validates with some layers skipped', () => {
      engine.skipLayer(sliceId, 'print', 'Not needed')
      engine.skipLayer(sliceId, 'integration', 'Not needed')
      for (const layerId of LAYER_ORDER) {
        const layer = engine.getOrThrow(sliceId).layers[layerId]
        if (layer.status === 'not-started') {
          engine.startLayer(sliceId, layerId)
          engine.completeLayer(sliceId, layerId)
        }
      }
      const result = engine.validate(sliceId)
      expect(result.canCode).toBe(true)
    })

    it('reports incomplete layers', () => {
      engine.startLayer(sliceId, 'db')
      const result = engine.validate(sliceId)
      expect(result.validation.incompleteLayers).toContain('business-logic')
      expect(result.validation.incompleteLayers).toContain('api')
      expect(result.validation.completedLayers).not.toContain('db') // still in-progress
    })

    it('shows completion percentage', () => {
      engine.startLayer(sliceId, 'db')
      engine.completeLayer(sliceId, 'db')
      const result = engine.validate(sliceId)
      expect(result.validation.completionPct).toBeGreaterThan(0)
    })

    it('tracks missing traceability', () => {
      // Create slice without CR-ID
      const slice = engine.create({
        name: 'No CR',
        moduleId: 'MOD',
        traceability: { crId: '', goalId: '', taskId: '', elementId: '', moduleId: 'MOD' },
      })
      const result = engine.validate(slice.id)
      expect(result.issues.some(i => i.type === 'missing-traceability')).toBe(true)
    })
  })

  // -- Block / Unblock -----------------------------------------------------

  describe('block / unblock', () => {
    let sliceId: string

    beforeEach(() => {
      const slice = engine.create({
        name: 'Blockable Slice',
        moduleId: 'STU',
        traceability: makeTrace('STU'),
      })
      sliceId = slice.id
    })

    it('blocks a slice', () => {
      const slice = engine.blockSlice(sliceId, 'Waiting for API key')
      expect(slice.status).toBe('blocked')
      expect(slice.notes).toBe('Waiting for API key')
    })

    it('unblocks a slice', () => {
      engine.blockSlice(sliceId, 'Reason')
      const slice = engine.unblockSlice(sliceId)
      expect(slice.status).toBe('in-progress')
      expect(slice.notes).toBe('')
    })

    it('cannot unblock a non-blocked slice', () => {
      expect(() => engine.unblockSlice(sliceId)).toThrow('not blocked')
    })

    it('cannot modify a blocked slice layer', () => {
      engine.blockSlice(sliceId, 'Blocked')
      expect(() => engine.startLayer(sliceId, 'db')).toThrow()
    })
  })

  // -- Complete Slice ------------------------------------------------------

  describe('completeSlice', () => {
    it('completes when all layers are done', () => {
      const slice = engine.create({
        name: 'Full',
        moduleId: 'MOD',
        traceability: makeTrace('MOD'),
      })
      for (const layerId of LAYER_ORDER) {
        engine.startLayer(slice.id, layerId)
        engine.completeLayer(slice.id, layerId)
      }
      const result = engine.completeSlice(slice.id, 'All done')
      expect(result.status).toBe('completed')
      expect(result.notes).toBe('All done')
    })

    it('fails to complete with incomplete layers', () => {
      const slice = engine.create({
        name: 'Partial',
        moduleId: 'MOD',
        traceability: makeTrace('MOD'),
      })
      engine.startLayer(slice.id, 'db')
      engine.completeLayer(slice.id, 'db')
      expect(() => engine.completeSlice(slice.id)).toThrow('layer business-logic is not-started')
    })

    it('cannot modify completed slice', () => {
      const slice = engine.create({
        name: 'Done',
        moduleId: 'MOD',
        traceability: makeTrace('MOD'),
      })
      for (const layerId of LAYER_ORDER) {
        engine.startLayer(slice.id, layerId)
        engine.completeLayer(slice.id, layerId)
      }
      engine.completeSlice(slice.id)
      expect(() => engine.startLayer(slice.id, 'db')).toThrow('completed')
    })
  })

  // -- Skip Slice ----------------------------------------------------------

  describe('skipSlice', () => {
    it('skips entire slice', () => {
      const slice = engine.create({
        name: 'Skippy',
        moduleId: 'MOD',
        traceability: makeTrace('MOD'),
      })
      const result = engine.skipSlice(slice.id, 'Not needed anymore')
      expect(result.status).toBe('skipped')
    })

    it('sets unstarted layers to skipped', () => {
      const slice = engine.create({
        name: 'Partial Skip',
        moduleId: 'MOD',
        traceability: makeTrace('MOD'),
      })
      engine.startLayer(slice.id, 'db')
      engine.skipSlice(slice.id, 'Abort')
      expect(slice.layers.db.status).toBe('in-progress') // already started stays
      expect(slice.layers.api.status).toBe('skipped') // not-started becomes skipped
    })

    it('cannot modify skipped slice', () => {
      const slice = engine.create({
        name: 'Skippy',
        moduleId: 'MOD',
        traceability: makeTrace('MOD'),
      })
      engine.skipSlice(slice.id, 'Nope')
      expect(() => engine.startLayer(slice.id, 'db')).toThrow('skipped')
    })
  })

  // -- Summary -------------------------------------------------------------

  describe('summary', () => {
    it('returns empty summary for no slices', () => {
      const summary = engine.summary()
      expect(summary.total).toBe(0)
      expect(summary.layerCompletionPct).toBe(0)
      expect(summary.sliceCompletionPct).toBe(0)
    })

    it('counts slices by status', () => {
      const s1 = engine.create({ name: 'A', moduleId: 'MOD', traceability: makeTrace('MOD') })
      const s2 = engine.create({ name: 'B', moduleId: 'MOD', traceability: makeTrace('MOD') })
      // Complete all layers for s1 before calling completeSlice
      for (const layerId of LAYER_ORDER) {
        engine.startLayer(s1.id, layerId)
        engine.completeLayer(s1.id, layerId)
      }
      engine.completeSlice(s1.id)
      engine.skipSlice(s2.id, 'Not needed')
      const summary = engine.summary()
      expect(summary.byStatus.completed).toBe(1)
      expect(summary.byStatus.skipped).toBe(1)
    })

    it('counts layers across slices', () => {
      const s1 = engine.create({ name: 'A', moduleId: 'MOD', traceability: makeTrace('MOD') })
      engine.startLayer(s1.id, 'db')
      engine.completeLayer(s1.id, 'db')
      const summary = engine.summary()
      expect(summary.totalLayers).toBe(8)
      expect(summary.completedLayers).toBe(1)
    })

    it('counts by module', () => {
      engine.create({ name: 'A', moduleId: 'STU', traceability: makeTrace('STU') })
      engine.create({ name: 'B', moduleId: 'STU', traceability: makeTrace('STU') })
      engine.create({ name: 'C', moduleId: 'FEE', traceability: makeTrace('FEE') })
      const summary = engine.summary()
      expect(summary.byModule.STU).toBe(2)
      expect(summary.byModule.FEE).toBe(1)
    })
  })
})

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

describe('Vertical Slice tools', () => {
  beforeEach(() => {
    resetEngine()
  })

  it('createCreateVerticalSliceTool has correct name', () => {
    expect(createCreateVerticalSliceTool().name).toBe('create_vertical_slice')
  })

  it('createStartSliceLayerTool has correct name', () => {
    expect(createStartSliceLayerTool().name).toBe('start_slice_layer')
  })

  it('createCompleteSliceLayerTool has correct name', () => {
    expect(createCompleteSliceLayerTool().name).toBe('complete_slice_layer')
  })

  it('createValidateSliceTool has correct name', () => {
    expect(createValidateSliceTool().name).toBe('validate_slice')
  })

  it('createGetSliceStatusTool has correct name', () => {
    expect(createGetSliceStatusTool().name).toBe('get_slice_status')
  })

  it('createGetSliceSummaryTool has correct name', () => {
    expect(createGetSliceSummaryTool().name).toBe('get_slice_summary')
  })

  it('createCompleteVerticalSliceTool has correct name', () => {
    expect(createCompleteVerticalSliceTool().name).toBe('complete_vertical_slice')
  })

  it('createGetModuleSlicesTool has correct name', () => {
    expect(createGetModuleSlicesTool().name).toBe('get_module_slices')
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
    const tool = createGetSliceSummaryTool()
    tool.execute({}, {} as any)
    expect(getActiveEngine()).toBeDefined()
    resetEngine()
    expect(getActiveEngine()).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Full Lifecycle — School ERP
// ---------------------------------------------------------------------------

describe('full lifecycle — School ERP', () => {
  let engine: VerticalSliceEngine

  beforeEach(() => {
    engine = new VerticalSliceEngine()
  })

  it('complete student registration slice through all 8 layers', () => {
    // 1. Create slice
    const slice = engine.create({
      name: 'Student Registration',
      moduleId: 'STU',
      priority: 'critical',
      traceability: makeTrace('STU'),
    })
    expect(slice.id).toBe('VS-STU-001')
    expect(slice.status).toBe('planned')
    expect(Object.keys(slice.layers)).toHaveLength(8)

    // 2. Implement all layers in order
    const layerFiles: Record<LayerId, string[]> = {
      db: ['src/models/student.ts', 'migrations/001_student.sql'],
      'business-logic': ['src/logic/student-registration.ts'],
      mapping: ['src/mappers/student-mapper.ts'],
      api: ['src/api/students.ts'],
      permission: ['src/permissions/student-rules.ts'],
      ui: ['src/ui/student-form.tsx'],
      print: ['src/print/student-id-card.ts'],
      integration: ['src/integration/school-erp-sync.ts'],
    }

    for (const layerId of LAYER_ORDER) {
      engine.startLayer(slice.id, layerId)
      engine.completeLayer(slice.id, layerId, {
        files: layerFiles[layerId],
        notes: `${layerId} implementation done`,
      })
    }

    // 3. Validate
    const validation = engine.validate(slice.id)
    expect(validation.canCode).toBe(true)
    expect(validation.validation.isValid).toBe(true)
    expect(validation.validation.completionPct).toBe(100)
    expect(validation.validation.completedLayers).toHaveLength(8)
    expect(validation.validation.incompleteLayers).toHaveLength(0)

    // 4. Complete slice
    const completed = engine.completeSlice(slice.id, 'Student registration complete')
    expect(completed.status).toBe('completed')
    expect(completed.files.length).toBeGreaterThan(0)
  })

  it('fee collection slice with skip (no print)', () => {
    const slice = engine.create({
      name: 'Fee Collection',
      moduleId: 'FEE',
      traceability: makeTrace('FEE'),
    })

    // Skip print — no print needed for fee collection
    engine.skipLayer(slice.id, 'print', 'Fee receipts generated by payment gateway')

    for (const layerId of LAYER_ORDER) {
      const layer = slice.layers[layerId]
      if (layer.status === 'not-started') {
        engine.startLayer(slice.id, layerId)
        engine.completeLayer(slice.id, layerId)
      }
    }

    const validation = engine.validate(slice.id)
    expect(validation.canCode).toBe(true)
    expect(validation.validation.completedLayers).toHaveLength(7)
    expect(validation.validation.incompleteLayers).toHaveLength(0)
  })

  it('attendance slice with blocked status', () => {
    const slice = engine.create({
      name: 'Attendance Tracking',
      moduleId: 'ATT',
      traceability: makeTrace('ATT'),
    })

    // Start db layer
    engine.startLayer(slice.id, 'db')
    engine.completeLayer(slice.id, 'db')

    // Block waiting for biometric API
    engine.blockSlice(slice.id, 'Waiting for biometric device API credentials')
    expect(slice.status).toBe('blocked')

    // Unblock and continue
    engine.unblockSlice(slice.id)
    expect(slice.status).toBe('in-progress')

    // Complete remaining layers
    for (const layerId of LAYER_ORDER) {
      const layer = slice.layers[layerId]
      if (layer.status === 'not-started') {
        engine.startLayer(slice.id, layerId)
        engine.completeLayer(slice.id, layerId)
      }
    }

    const validation = engine.validate(slice.id)
    expect(validation.canCode).toBe(true)
  })

  it('multiple slices for different modules', () => {
    const stuSlice = engine.create({
      name: 'Student Registration',
      moduleId: 'STU',
      traceability: makeTrace('STU'),
    })
    const feeSlice = engine.create({
      name: 'Fee Collection',
      moduleId: 'FEE',
      traceability: makeTrace('FEE'),
    })
    const attSlice = engine.create({
      name: 'Attendance',
      moduleId: 'ATT',
      traceability: makeTrace('ATT'),
    })

    // Complete STU slice
    for (const layerId of LAYER_ORDER) {
      engine.startLayer(stuSlice.id, layerId)
      engine.completeLayer(stuSlice.id, layerId)
    }
    engine.completeSlice(stuSlice.id)

    // Skip FEE slice
    engine.skipSlice(feeSlice.id, 'Deferred to Phase 2')

    // ATT still in progress
    engine.startLayer(attSlice.id, 'db')

    const summary = engine.summary()
    expect(summary.total).toBe(3)
    expect(summary.byStatus.completed).toBe(1)
    expect(summary.byStatus.skipped).toBe(1)
    expect(summary.byStatus['in-progress']).toBe(1)
    expect(summary.byModule.STU).toBe(1)
    expect(summary.byModule.FEE).toBe(1)
    expect(summary.byModule.ATT).toBe(1)
  })

  it('failed slice layer shows in validation', () => {
    const slice = engine.create({
      name: 'Exam Module',
      moduleId: 'EXM',
      traceability: makeTrace('EXM'),
    })

    engine.startLayer(slice.id, 'db')
    engine.failLayer(slice.id, 'db', 'Migration conflict with existing schema')

    const validation = engine.validate(slice.id)
    expect(validation.canCode).toBe(false)
    expect(validation.issues.some(i => i.type === 'layer-failed')).toBe(true)
    expect(slice.status).toBe('failed')
  })

  it('traceability chain links to planning phases', () => {
    const slice = engine.create({
      name: 'Exam Results',
      moduleId: 'EXM',
      traceability: {
        crId: 'CR-EXM-003',
        goalId: 'GL-EXM-001',
        taskId: 'T-EXM-005',
        elementId: 'EL-EXM-012',
        moduleId: 'EXM',
      },
    })

    expect(slice.traceability.crId).toBe('CR-EXM-003')
    expect(slice.traceability.goalId).toBe('GL-EXM-001')
    expect(slice.traceability.taskId).toBe('T-EXM-005')
    expect(slice.traceability.elementId).toBe('EL-EXM-012')
  })
})
