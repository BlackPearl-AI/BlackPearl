/**
 * Element Registry tests — PHASE 09.
 *
 * Covers types, engine, tools, ID generation, validation, query, and report.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { ElementRegistryEngine } from '../src/element-registry/engine.ts'
import {
  createRegisterElementTool,
  createBulkRegisterElementsTool,
  createFindElementTool,
  createElementRegistryReportTool,
  createValidateElementRegistryTool,
  createGetNextSequenceTool,
  resetEngine as resetToolEngine,
  getActiveEngine as getToolEngine,
} from '../src/element-registry/tools.ts'
import {
  ALL_ELEMENT_TYPES,
  ELEMENT_TYPE_PREFIXES,
  ELEMENT_TYPE_LABELS,
  ELEMENT_TYPE_ICONS,
  ELEMENT_STATUS_LABELS,
  ELEMENT_STATUS_ICONS,
  generateElementId,
  parseElementId,
  sequenceKey,
} from '../src/element-registry/types.ts'
import type { ElementType } from '../src/element-registry/types.ts'

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

describe('Element Registry types', () => {
  it('ALL_ELEMENT_TYPES has 11 types', () => {
    expect(ALL_ELEMENT_TYPES).toHaveLength(11)
  })

  it('ELEMENT_TYPE_PREFIXES has entries for all types', () => {
    for (const t of ALL_ELEMENT_TYPES) {
      expect(ELEMENT_TYPE_PREFIXES[t]).toBeDefined()
      expect(typeof ELEMENT_TYPE_PREFIXES[t]).toBe('string')
      expect(ELEMENT_TYPE_PREFIXES[t].length).toBeGreaterThanOrEqual(2)
    }
  })

  it('ELEMENT_TYPE_LABELS has entries for all types', () => {
    for (const t of ALL_ELEMENT_TYPES) {
      expect(ELEMENT_TYPE_LABELS[t]).toBeDefined()
    }
  })

  it('ELEMENT_TYPE_ICONS has entries for all types', () => {
    for (const t of ALL_ELEMENT_TYPES) {
      expect(ELEMENT_TYPE_ICONS[t]).toBeDefined()
    }
  })

  it('ELEMENT_STATUS_LABELS has 4 statuses', () => {
    expect(Object.keys(ELEMENT_STATUS_LABELS)).toHaveLength(4)
    expect(ELEMENT_STATUS_LABELS.active).toBe('Active')
    expect(ELEMENT_STATUS_LABELS.deprecated).toBe('Deprecated')
    expect(ELEMENT_STATUS_LABELS.disabled).toBe('Disabled')
    expect(ELEMENT_STATUS_LABELS.planned).toBe('Planned')
  })

  it('ELEMENT_STATUS_ICONS has 4 statuses', () => {
    expect(Object.keys(ELEMENT_STATUS_ICONS)).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

describe('generateElementId', () => {
  it('generates correct format', () => {
    expect(generateElementId('BTN', 'STU', 1)).toBe('BTN-STU-001')
    expect(generateElementId('API', 'FEE', 42)).toBe('API-FEE-042')
    expect(generateElementId('PRN', 'ATT', 100)).toBe('PRN-ATT-100')
  })

  it('zero-pads to 3 digits', () => {
    expect(generateElementId('DD', 'STU', 1)).toBe('DD-STU-001')
    expect(generateElementId('DD', 'STU', 9)).toBe('DD-STU-009')
    expect(generateElementId('DD', 'STU', 99)).toBe('DD-STU-099')
  })

  it('handles large sequences', () => {
    expect(generateElementId('FLD', 'MOD', 1000)).toBe('FLD-MOD-1000')
    expect(generateElementId('FLD', 'MOD', 999999)).toBe('FLD-MOD-999999')
  })
})

describe('parseElementId', () => {
  it('parses valid IDs', () => {
    const parsed = parseElementId('BTN-STU-001')
    expect(parsed).toEqual({ prefix: 'BTN', modulePrefix: 'STU', sequence: 1 })
  })

  it('parses large sequence numbers', () => {
    const parsed = parseElementId('API-FEE-42000')
    expect(parsed).toEqual({ prefix: 'API', modulePrefix: 'FEE', sequence: 42000 })
  })

  it('returns undefined for invalid IDs', () => {
    expect(parseElementId('BTN-STU')).toBeUndefined()
    expect(parseElementId('BTN-STU-001-EXTRA')).toBeUndefined()
    expect(parseElementId('btn-stu-001')).toBeUndefined()
    expect(parseElementId('invalid')).toBeUndefined()
    expect(parseElementId('')).toBeUndefined()
  })
})

describe('sequenceKey', () => {
  it('produces module:type key', () => {
    expect(sequenceKey('STU', 'button')).toBe('STU:button')
    expect(sequenceKey('FEE', 'api')).toBe('FEE:api')
  })
})

// ---------------------------------------------------------------------------
// Engine: register
// ---------------------------------------------------------------------------

describe('ElementRegistryEngine', () => {
  let engine: ElementRegistryEngine

  beforeEach(() => {
    engine = new ElementRegistryEngine()
  })

  describe('register', () => {
    it('registers a single element', () => {
      const entry = engine.register({
        modulePrefix: 'STU',
        type: 'button',
        name: 'Save Button',
        purpose: 'Saves the student record',
      })
      expect(entry.elementId).toBe('BTN-STU-001')
      expect(entry.type).toBe('button')
      expect(entry.modulePrefix).toBe('STU')
      expect(entry.sequence).toBe(1)
      expect(entry.name).toBe('Save Button')
      expect(entry.status).toBe('planned')
      expect(entry.createdAt).toBeDefined()
    })

    it('increments sequence per type+module', () => {
      const e1 = engine.register({ modulePrefix: 'STU', type: 'button', name: 'Save', purpose: 'Save' })
      const e2 = engine.register({ modulePrefix: 'STU', type: 'button', name: 'Delete', purpose: 'Delete' })
      const e3 = engine.register({ modulePrefix: 'STU', type: 'button', name: 'Edit', purpose: 'Edit' })
      expect(e1.elementId).toBe('BTN-STU-001')
      expect(e2.elementId).toBe('BTN-STU-002')
      expect(e3.elementId).toBe('BTN-STU-003')
    })

    it('different modules get independent sequences', () => {
      const e1 = engine.register({ modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A' })
      const e2 = engine.register({ modulePrefix: 'FEE', type: 'button', name: 'B', purpose: 'B' })
      expect(e1.elementId).toBe('BTN-STU-001')
      expect(e2.elementId).toBe('BTN-FEE-001')
    })

    it('different types get independent sequences', () => {
      const e1 = engine.register({ modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A' })
      const e2 = engine.register({ modulePrefix: 'STU', type: 'dropdown', name: 'B', purpose: 'B' })
      expect(e1.elementId).toBe('BTN-STU-001')
      expect(e2.elementId).toBe('DD-STU-001')
    })

    it('accepts optional fields', () => {
      const entry = engine.register({
        modulePrefix: 'STU',
        type: 'api',
        name: 'Get Students',
        purpose: 'Fetch all students',
        screen: 'StudentList',
        status: 'active',
        tags: ['core', 'list'],
      })
      expect(entry.screen).toBe('StudentList')
      expect(entry.status).toBe('active')
      expect(entry.tags).toEqual(['core', 'list'])
    })

    it('normalises modulePrefix to uppercase', () => {
      const entry = engine.register({
        modulePrefix: 'stu',
        type: 'field',
        name: 'Name',
        purpose: 'Student name',
      })
      expect(entry.modulePrefix).toBe('STU')
      expect(entry.elementId).toBe('FLD-STU-001')
    })

    it('throws for invalid modulePrefix', () => {
      expect(() => engine.register({ modulePrefix: 'S', type: 'button', name: 'X', purpose: 'X' })).toThrow()
      expect(() => engine.register({ modulePrefix: 'TOOLONGPREFIX', type: 'button', name: 'X', purpose: 'X' })).toThrow()
      expect(() => engine.register({ modulePrefix: 'STU1', type: 'button', name: 'X', purpose: 'X' })).toThrow()
    })

    it('throws for invalid type', () => {
      expect(() => engine.register({ modulePrefix: 'STU', type: 'invalid' as ElementType, name: 'X', purpose: 'X' })).toThrow()
    })
  })

  describe('registerBulk', () => {
    it('registers multiple elements', () => {
      const entries = engine.registerBulk([
        { modulePrefix: 'STU', type: 'button', name: 'Save', purpose: 'Save' },
        { modulePrefix: 'STU', type: 'field', name: 'Name', purpose: 'Name' },
        { modulePrefix: 'STU', type: 'tab', name: 'Details', purpose: 'Details' },
      ])
      expect(entries).toHaveLength(3)
      expect(entries[0]!.elementId).toBe('BTN-STU-001')
      expect(entries[1]!.elementId).toBe('FLD-STU-001')
      expect(entries[2]!.elementId).toBe('TAB-STU-001')
    })

    it('returns empty array for empty input', () => {
      expect(engine.registerBulk([])).toEqual([])
    })
  })

  describe('update', () => {
    it('updates name', () => {
      const e = engine.register({ modulePrefix: 'STU', type: 'button', name: 'Save', purpose: 'Save' })
      const updated = engine.update(e.elementId, { name: 'Save Record' })
      expect(updated.name).toBe('Save Record')
      expect(updated.updatedAt).toBeDefined()
      expect(typeof updated.updatedAt).toBe('string')
    })

    it('updates status', () => {
      const e = engine.register({ modulePrefix: 'STU', type: 'button', name: 'Save', purpose: 'Save' })
      const updated = engine.update(e.elementId, { status: 'active' })
      expect(updated.status).toBe('active')
    })

    it('throws for non-existent element', () => {
      expect(() => engine.update('BTN-STU-999', { name: 'X' })).toThrow()
    })
  })

  describe('get / getAll', () => {
    it('returns undefined for non-existent element', () => {
      expect(engine.get('BTN-STU-999')).toBeUndefined()
    })

    it('returns the element', () => {
      const e = engine.register({ modulePrefix: 'STU', type: 'button', name: 'Save', purpose: 'Save' })
      expect(engine.get(e.elementId)).toBe(e)
    })

    it('returns all elements', () => {
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A' })
      engine.register({ modulePrefix: 'FEE', type: 'api', name: 'B', purpose: 'B' })
      expect(engine.getAll()).toHaveLength(2)
    })

    it('returns empty array when empty', () => {
      expect(engine.getAll()).toEqual([])
    })
  })

  describe('size', () => {
    it('tracks count', () => {
      expect(engine.size).toBe(0)
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A' })
      expect(engine.size).toBe(1)
    })
  })

  describe('query', () => {
    beforeEach(() => {
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'Save Student', purpose: 'Save', screen: 'StudentForm', status: 'active', tags: ['core'] })
      engine.register({ modulePrefix: 'STU', type: 'field', name: 'Student Name', purpose: 'Name field', screen: 'StudentForm', status: 'planned' })
      engine.register({ modulePrefix: 'FEE', type: 'api', name: 'Get Fees', purpose: 'Fetch fees', status: 'active', tags: ['api'] })
      engine.register({ modulePrefix: 'FEE', type: 'button', name: 'Pay Fee', purpose: 'Pay', status: 'deprecated' })
    })

    it('returns all when no filter', () => {
      expect(engine.query({})).toHaveLength(4)
    })

    it('filters by modulePrefix', () => {
      expect(engine.query({ modulePrefix: 'STU' })).toHaveLength(2)
      expect(engine.query({ modulePrefix: 'FEE' })).toHaveLength(2)
      expect(engine.query({ modulePrefix: 'ATT' })).toHaveLength(0)
    })

    it('filters by type', () => {
      expect(engine.query({ type: 'button' })).toHaveLength(2)
      expect(engine.query({ type: 'field' })).toHaveLength(1)
    })

    it('filters by status', () => {
      expect(engine.query({ status: 'active' })).toHaveLength(2)
      expect(engine.query({ status: 'deprecated' })).toHaveLength(1)
      expect(engine.query({ status: 'disabled' })).toHaveLength(0)
    })

    it('filters by search', () => {
      expect(engine.query({ search: 'student' })).toHaveLength(2)
      expect(engine.query({ search: 'fee' })).toHaveLength(2)
      expect(engine.query({ search: 'PAY' })).toHaveLength(1)
    })

    it('filters by screen', () => {
      expect(engine.query({ screen: 'StudentForm' })).toHaveLength(2)
      expect(engine.query({ screen: 'Other' })).toHaveLength(0)
    })

    it('filters by tag', () => {
      expect(engine.query({ tag: 'core' })).toHaveLength(1)
      expect(engine.query({ tag: 'api' })).toHaveLength(1)
      expect(engine.query({ tag: 'nonexistent' })).toHaveLength(0)
    })

    it('combines multiple filters', () => {
      expect(engine.query({ modulePrefix: 'STU', type: 'button' })).toHaveLength(1)
      expect(engine.query({ modulePrefix: 'STU', status: 'active' })).toHaveLength(1)
    })
  })

  describe('findByName', () => {
    it('finds by exact name (case-insensitive)', () => {
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'Save Student', purpose: 'Save' })
      const found = engine.findByName('STU', 'save student')
      expect(found).toBeDefined()
      expect(found!.name).toBe('Save Student')
    })

    it('returns undefined for non-existent', () => {
      expect(engine.findByName('STU', 'Nonexistent')).toBeUndefined()
    })

    it('returns undefined for wrong module', () => {
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'Save', purpose: 'Save' })
      expect(engine.findByName('FEE', 'Save')).toBeUndefined()
    })
  })

  describe('sequence tracking', () => {
    it('nextSequence starts at 1', () => {
      expect(engine.nextSequence('STU', 'button')).toBe(1)
    })

    it('nextSequence increments after register', () => {
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A' })
      expect(engine.nextSequence('STU', 'button')).toBe(2)
    })

    it('lastSequence returns 0 when none', () => {
      expect(engine.lastSequence('STU', 'button')).toBe(0)
    })

    it('lastSequence returns correct count', () => {
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A' })
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'B', purpose: 'B' })
      expect(engine.lastSequence('STU', 'button')).toBe(2)
    })
  })

  describe('remove', () => {
    it('removes an element', () => {
      const e = engine.register({ modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A' })
      expect(engine.remove(e.elementId)).toBe(true)
      expect(engine.get(e.elementId)).toBeUndefined()
      expect(engine.size).toBe(0)
    })

    it('returns false for non-existent', () => {
      expect(engine.remove('BTN-STU-999')).toBe(false)
    })
  })

  describe('validate', () => {
    it('passes for empty registry', () => {
      const vr = engine.validate()
      expect(vr.valid).toBe(true)
      expect(vr.violations).toHaveLength(0)
    })

    it('passes for clean registry', () => {
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A' })
      engine.register({ modulePrefix: 'STU', type: 'field', name: 'B', purpose: 'B', dependsOn: ['BTN-STU-001'] })
      const vr = engine.validate()
      expect(vr.valid).toBe(true)
      expect(vr.totalElements).toBe(2)
      expect(vr.byType.button).toBe(1)
      expect(vr.byType.field).toBe(1)
      expect(vr.byStatus.planned).toBe(2)
    })

    it('detects missing dependency target', () => {
      engine.register({
        modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A',
        dependsOn: ['BTN-FEE-999'],
      })
      const vr = engine.validate()
      expect(vr.valid).toBe(false)
      expect(vr.missingDeps).toContain('BTN-FEE-999')
      expect(vr.violations.some(v => v.rule === 'deps-exist')).toBe(true)
    })

    it('detects missing parent target', () => {
      engine.register({
        modulePrefix: 'STU', type: 'field', name: 'A', purpose: 'A',
        parentId: 'BTN-FEE-999',
      })
      const vr = engine.validate()
      expect(vr.valid).toBe(false)
      expect(vr.violations.some(v => v.rule === 'parent-exists')).toBe(true)
    })

    it('detects self-reference dependency via direct manipulation', () => {
      const e2 = engine.register({ modulePrefix: 'STU', type: 'field', name: 'B', purpose: 'B' })
      // Manually inject self-reference (simulates corrupted state).
      const map = (engine as unknown as { elements: Map<string, { dependsOn?: string[] }> }).elements
      const entry = map.get(e2.elementId)!
      entry.dependsOn = [e2.elementId]
      const vr = engine.validate()
      expect(vr.violations.some(v => v.rule === 'no-self-ref')).toBe(true)
      expect(vr.valid).toBe(false)
    })

    it('reports correct byType counts', () => {
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A' })
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'B', purpose: 'B' })
      engine.register({ modulePrefix: 'STU', type: 'field', name: 'C', purpose: 'C' })
      const vr = engine.validate()
      expect(vr.byType.button).toBe(2)
      expect(vr.byType.field).toBe(1)
      expect(vr.byType.tab).toBe(0)
    })

    it('reports correct byStatus counts', () => {
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A', status: 'active' })
      engine.register({ modulePrefix: 'STU', type: 'field', name: 'B', purpose: 'B', status: 'deprecated' })
      const vr = engine.validate()
      expect(vr.byStatus.active).toBe(1)
      expect(vr.byStatus.deprecated).toBe(1)
      expect(vr.byStatus.planned).toBe(0)
    })
  })

  describe('summary', () => {
    it('returns empty summary', () => {
      const s = engine.summary()
      expect(s.totalElements).toBe(0)
      expect(s.byModule).toEqual({})
      expect(s.sequences).toHaveLength(0)
    })

    it('computes correct stats', () => {
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A', status: 'active' })
      engine.register({ modulePrefix: 'FEE', type: 'api', name: 'B', purpose: 'B', status: 'planned' })
      const s = engine.summary()
      expect(s.totalElements).toBe(2)
      expect(s.byType.button).toBe(1)
      expect(s.byType.api).toBe(1)
      expect(s.byModule.STU).toBe(1)
      expect(s.byModule.FEE).toBe(1)
      expect(s.byStatus.active).toBe(1)
      expect(s.byStatus.planned).toBe(1)
      expect(s.sequences.length).toBeGreaterThan(0)
    })
  })

  describe('toMarkdown', () => {
    it('generates empty report', () => {
      const md = engine.toMarkdown()
      expect(md).toContain('Element Registry Report')
      expect(md).toContain('**Total Elements:** 0')
    })

    it('generates report with elements', () => {
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'Save', purpose: 'Save', screen: 'Form', status: 'active' })
      engine.register({ modulePrefix: 'STU', type: 'field', name: 'Name', purpose: 'Name field', status: 'planned' })
      engine.register({ modulePrefix: 'FEE', type: 'api', name: 'Pay', purpose: 'Pay API', status: 'deprecated' })
      const md = engine.toMarkdown()
      expect(md).toContain('**Total Elements:** 3')
      expect(md).toContain('BTN-STU-001')
      expect(md).toContain('FLD-STU-001')
      expect(md).toContain('API-FEE-001')
      expect(md).toContain('## By Type')
      expect(md).toContain('## By Module')
      expect(md).toContain('## Elements')
      expect(md).toContain('Form')
    })

    it('includes violations in report', () => {
      engine.register({
        modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A',
        dependsOn: ['BTN-FEE-999'],
      })
      const md = engine.toMarkdown()
      expect(md).toContain('## Violations')
      expect(md).toContain('deps-exist')
    })
  })

  describe('toMap / sequenceSnapshot', () => {
    it('returns independent copies', () => {
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A' })
      const map = engine.toMap()
      expect(map.size).toBe(1)
      // Modifying the copy should not affect the engine.
      map.clear()
      expect(engine.size).toBe(1)
    })

    it('sequenceSnapshot returns independent copy', () => {
      engine.register({ modulePrefix: 'STU', type: 'button', name: 'A', purpose: 'A' })
      const snap = engine.sequenceSnapshot()
      snap.clear()
      expect(engine.lastSequence('STU', 'button')).toBe(1)
    })
  })
})

// ---------------------------------------------------------------------------
// Tools (engine-level smoke tests)
// ---------------------------------------------------------------------------

describe('Element Registry tools', () => {
  beforeEach(() => {
    resetToolEngine()
  })

  it('createRegisterElementTool has correct name', () => {
    const tool = createRegisterElementTool()
    expect(tool.name).toBe('register_element')
  })

  it('createBulkRegisterElementsTool has correct name', () => {
    const tool = createBulkRegisterElementsTool()
    expect(tool.name).toBe('bulk_register_elements')
  })

  it('createFindElementTool has correct name', () => {
    const tool = createFindElementTool()
    expect(tool.name).toBe('find_element')
  })

  it('createElementRegistryReportTool has correct name', () => {
    const tool = createElementRegistryReportTool()
    expect(tool.name).toBe('get_element_registry_report')
  })

  it('createValidateElementRegistryTool has correct name', () => {
    const tool = createValidateElementRegistryTool()
    expect(tool.name).toBe('validate_element_registry')
  })

  it('createGetNextSequenceTool has correct name', () => {
    const tool = createGetNextSequenceTool()
    expect(tool.name).toBe('get_next_sequence')
  })

  it('getActiveEngine returns undefined initially', () => {
    expect(getToolEngine()).toBeUndefined()
  })

  it('resetEngine clears active engine', () => {
    // Trigger engine creation via register tool
    const tool = createRegisterElementTool()
    tool.execute({
      module_prefix: 'STU',
      type: 'button',
      name: 'Save',
      purpose: 'Save',
    }, {} as any)
    expect(getToolEngine()).toBeDefined()
    resetToolEngine()
    expect(getToolEngine()).toBeUndefined()
  })
})
