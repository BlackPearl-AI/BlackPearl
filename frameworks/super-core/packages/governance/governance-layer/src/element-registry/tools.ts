/**
 * Element Registry tools — PHASE 09.
 *
 * - `register_element`: register a single element with a unique ID
 * - `bulk_register_elements`: register multiple elements at once
 * - `find_element`: find elements by query
 * - `get_element_registry_report`: generate a markdown report
 * - `validate_element_registry`: check for duplicates, missing deps, etc.
 * - `get_next_sequence`: preview the next sequence number for a module+type
 *
 * @module @deepseek-ai/dsh-governance-layer/element-registry/tools
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { ElementRegistryEngine } from './engine.ts'
import {
  ALL_ELEMENT_TYPES,
  ELEMENT_TYPE_PREFIXES,
} from './types.ts'
import type { ElementType, ElementStatus } from './types.ts'

/** Active engine instance (per-session). */
let activeEngine: ElementRegistryEngine | undefined

/** Get the active engine. */
export function getActiveEngine(): ElementRegistryEngine | undefined {
  return activeEngine
}

/** Reset the active engine (for testing). */
export function resetEngine(): void {
  activeEngine = undefined
}

function ensureEngine(): ElementRegistryEngine {
  if (activeEngine === undefined) {
    activeEngine = new ElementRegistryEngine()
  }
  return activeEngine
}

// ---------------------------------------------------------------------------
// Tool: register_element
// ---------------------------------------------------------------------------

/**
 * Create the `register_element` tool.
 */
export function createRegisterElementTool() {
  return defineTool({
    name: 'register_element',
    description:
      'Register a single UI element, API, print template, permission, workflow, '
      + 'or integration with a unique ID. Format: {PREFIX}-{MODULE}-{SEQ}. '
      + 'Example: BTN-STU-001, API-STU-004, PRN-STU-002.',
    parameters: {
      module_prefix: {
        type: 'string',
        required: true,
        description: 'Module prefix code (e.g. STU, ATT, FEE). 2-10 uppercase letters.',
      },
      type: {
        type: 'string',
        required: true,
        description: `Element type: ${ALL_ELEMENT_TYPES.join(', ')}.`,
      },
      name: {
        type: 'string',
        required: true,
        description: 'Human-readable element name.',
      },
      purpose: {
        type: 'string',
        required: true,
        description: 'Purpose or description of this element.',
      },
      screen: {
        type: 'string',
        description: 'Screen or page this element belongs to.',
      },
      parent_id: {
        type: 'string',
        description: 'Parent element ID if this element is nested.',
      },
      tags: {
        type: 'string',
        description: 'Comma-separated tags for categorisation.',
      },
      status: {
        type: 'string',
        description: 'Element status: active, deprecated, disabled, planned (default: planned).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          elementId: { type: 'string' },
          type: { type: 'string' },
          modulePrefix: { type: 'string' },
          sequence: { type: 'number' },
          name: { type: 'string' },
          status: { type: 'string' },
          screen: { type: 'string' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as {
        module_prefix: string
        type: string
        name: string
        purpose: string
        screen?: string
        parent_id?: string
        tags?: string
        status?: string
      }

      const entry = engine.register({
        modulePrefix: input.module_prefix.toUpperCase(),
        type: input.type as ElementType,
        name: input.name,
        purpose: input.purpose,
        ...(input.screen != null ? { screen: input.screen } : {}),
        ...(input.parent_id != null ? { parentId: input.parent_id } : {}),
        ...(input.tags != null ? { tags: input.tags.split(',').map(t => t.trim()) } : {}),
        status: (input.status as ElementStatus) ?? 'planned',
      })

      return Promise.resolve({
        elementId: entry.elementId,
        type: entry.type,
        modulePrefix: entry.modulePrefix,
        sequence: entry.sequence,
        name: entry.name,
        status: entry.status,
        ...(entry.screen !== undefined ? { screen: entry.screen } : {}),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: bulk_register_elements
// ---------------------------------------------------------------------------

/**
 * Create the `bulk_register_elements` tool.
 */
export function createBulkRegisterElementsTool() {
  return defineTool({
    name: 'bulk_register_elements',
    description:
      'Register multiple elements at once for a module. '
      + 'Each element gets a unique ID: {PREFIX}-{MODULE}-{SEQ}.',
    parameters: {
      module_prefix: {
        type: 'string',
        required: true,
        description: 'Module prefix code (e.g. STU).',
      },
      elements_json: {
        type: 'string',
        required: true,
        description:
          'JSON array of elements. Each: { "type": "button", "name": "...", "purpose": "...", "screen?"?: "...", "tags?"?: ["..."] }.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          count: { type: 'number' },
          elements: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as { module_prefix: string; elements_json: string }

      const parsed: Array<Record<string, unknown>> = JSON.parse(input.elements_json)
      const modulePrefix = input.module_prefix.toUpperCase()

      const entries = engine.registerBulk(parsed.map(el => ({
        modulePrefix,
        type: el.type as ElementType,
        name: String(el.name),
        purpose: String(el.purpose),
        ...(el.screen != null ? { screen: el.screen as string } : {}),
        ...(Array.isArray(el.tags) ? { tags: el.tags as string[] } : {}),
        status: (el.status as ElementStatus) ?? 'planned',
      })))

      return Promise.resolve({
        count: entries.length,
        elements: entries.map(e => ({
          elementId: e.elementId,
          type: e.type,
          name: e.name,
          status: e.status,
        })),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: find_element
// ---------------------------------------------------------------------------

/**
 * Create the `find_element` tool.
 */
export function createFindElementTool() {
  return defineTool({
    name: 'find_element',
    description:
      'Find registered elements by module prefix, type, status, '
      + 'screen, tag, or text search.',
    parameters: {
      module_prefix: {
        type: 'string',
        description: 'Filter by module prefix (e.g. STU).',
      },
      type: {
        type: 'string',
        description: `Filter by type: ${ALL_ELEMENT_TYPES.join(', ')}.`,
      },
      status: {
        type: 'string',
        description: `Filter by status: active, deprecated, disabled, planned.`,
      },
      search: {
        type: 'string',
        description: 'Search name and purpose (case-insensitive).',
      },
      screen: {
        type: 'string',
        description: 'Filter by screen.',
      },
      tag: {
        type: 'string',
        description: 'Filter by tag.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          count: { type: 'number' },
          elements: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as {
        module_prefix?: string
        type?: string
        status?: string
        search?: string
        screen?: string
        tag?: string
      }

      const results = engine.query({
        ...(input.module_prefix != null ? { modulePrefix: input.module_prefix } : {}),
        ...(input.type != null ? { type: input.type as ElementType } : {}),
        ...(input.status != null ? { status: input.status as ElementStatus } : {}),
        ...(input.search != null ? { search: input.search } : {}),
        ...(input.screen != null ? { screen: input.screen } : {}),
        ...(input.tag != null ? { tag: input.tag } : {}),
      })

      return Promise.resolve({
        count: results.length,
        elements: results.map(e => ({
          elementId: e.elementId,
          type: e.type,
          modulePrefix: e.modulePrefix,
          name: e.name,
          purpose: e.purpose,
          status: e.status,
          ...(e.screen !== undefined ? { screen: e.screen } : {}),
        })),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_element_registry_report
// ---------------------------------------------------------------------------

/**
 * Create the `get_element_registry_report` tool.
 */
export function createElementRegistryReportTool() {
  return defineTool({
    name: 'get_element_registry_report',
    description:
      'Generate a markdown report of the entire element registry '
      + 'showing all registered elements, summary stats, and any violations.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          totalElements: { type: 'number' },
          report: { type: 'string' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute() {
      const engine = ensureEngine()
      const report = engine.toMarkdown()
      const summary = engine.summary()
      return Promise.resolve({
        totalElements: summary.totalElements,
        report,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: validate_element_registry
// ---------------------------------------------------------------------------

/**
 * Create the `validate_element_registry` tool.
 */
export function createValidateElementRegistryTool() {
  return defineTool({
    name: 'validate_element_registry',
    description:
      'Validate the element registry: check for duplicate IDs, '
      + 'missing dependencies, missing parents, and self-references.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          valid: { type: 'boolean' },
          totalElements: { type: 'number' },
          violationCount: { type: 'number' },
          violations: { type: 'array' },
          duplicates: { type: 'array' },
          missingDeps: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute() {
      const engine = ensureEngine()
      const vr = engine.validate()
      return Promise.resolve({
        valid: vr.valid,
        totalElements: vr.totalElements,
        violationCount: vr.violations.length,
        violations: vr.violations.map(v => ({
          ...v,
          ...(v.elementId !== undefined ? { elementId: v.elementId } : {}),
        })),
        duplicates: [...vr.duplicates],
        missingDeps: [...vr.missingDeps],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_next_sequence
// ---------------------------------------------------------------------------

/**
 * Create the `get_next_sequence` tool.
 */
export function createGetNextSequenceTool() {
  return defineTool({
    name: 'get_next_sequence',
    description:
      'Preview the next sequence number that would be assigned for '
      + 'a given module prefix and element type.',
    parameters: {
      module_prefix: {
        type: 'string',
        required: true,
        description: 'Module prefix code (e.g. STU).',
      },
      type: {
        type: 'string',
        required: true,
        description: `Element type: ${ALL_ELEMENT_TYPES.join(', ')}.`,
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          modulePrefix: { type: 'string' },
          type: { type: 'string' },
          nextSequence: { type: 'number' },
          lastSequence: { type: 'number' },
          preview: { type: 'string' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as { module_prefix: string; type: string }
      const modulePrefix = input.module_prefix.toUpperCase()
      const type = input.type as ElementType

      const next = engine.nextSequence(modulePrefix, type)
      const last = engine.lastSequence(modulePrefix, type)

      // Build preview ID.
      const preview = `${ELEMENT_TYPE_PREFIXES[type]}-${modulePrefix}-${String(next).padStart(3, '0')}`

      return Promise.resolve({
        modulePrefix,
        type,
        nextSequence: next,
        lastSequence: last,
        preview,
      })
    },
  })
}
