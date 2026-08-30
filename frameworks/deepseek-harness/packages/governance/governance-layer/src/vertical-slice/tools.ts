/**
 * PHASE 14 — Vertical Slice Tools
 *
 * Tools for creating, implementing, validating vertical slices.
 *
 * एक समय में एक Vertical Slice।
 * हर slice = UI + API + DB + Business Logic + Mapping + Permission + Print + Integration
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { VerticalSliceEngine } from './engine.ts'
import { LAYER_ORDER } from './types.ts'
import type { LayerId, LayerStatus } from './types.ts'

let activeEngine: VerticalSliceEngine | undefined

function ensureEngine(): VerticalSliceEngine {
  if (!activeEngine) {
    activeEngine = new VerticalSliceEngine()
  }
  return activeEngine
}

/** Reset engine (for tests). */
export function resetEngine(): void {
  activeEngine = undefined
}

/** Get active engine (for tests). */
export function getActiveEngine(): VerticalSliceEngine | undefined {
  return activeEngine
}

// ---------------------------------------------------------------------------
// Tool: create_vertical_slice
// ---------------------------------------------------------------------------

export function createCreateVerticalSliceTool() {
  return defineTool({
    name: 'create_vertical_slice',
    description:
      'Create a new vertical slice with all 8 layers (UI, API, DB, Business Logic, Mapping, Permission, Print, Integration). One slice at a time.',
    parameters: {
      name: {
        type: 'string',
        required: true,
        description: 'Slice name.',
      },
      module_id: {
        type: 'string',
        required: true,
        description: 'Module this slice belongs to.',
      },
      cr_id: {
        type: 'string',
        required: true,
        description: 'Conversation Requirement ID.',
      },
      goal_id: {
        type: 'string',
        required: true,
        description: 'Goal ID this slice satisfies.',
      },
      task_id: {
        type: 'string',
        required: true,
        description: 'Task ID being implemented.',
      },
      element_id: {
        type: 'string',
        required: true,
        description: 'Element ID being created.',
      },
      priority: {
        type: 'string',
        description: 'Priority: critical, high, medium, low (default: medium).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sliceId: { type: 'string' },
          name: { type: 'string' },
          moduleId: { type: 'string' },
          status: { type: 'string' },
          layers: { type: 'number' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>

      const slice = engine.create({
        name: input.name!,
        moduleId: input.module_id!,
        priority: input.priority as never,
        traceability: {
          crId: input.cr_id!,
          goalId: input.goal_id!,
          taskId: input.task_id!,
          elementId: input.element_id!,
          moduleId: input.module_id!,
        },
      })

      return Promise.resolve({
        sliceId: slice.id,
        name: slice.name,
        moduleId: slice.moduleId,
        status: slice.status,
        layers: LAYER_ORDER.length,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: start_slice_layer
// ---------------------------------------------------------------------------

export function createStartSliceLayerTool() {
  return defineTool({
    name: 'start_slice_layer',
    description:
      'Start implementing a layer in a vertical slice. Must follow order: db → business-logic → mapping → api → permission → ui → print → integration.',
    parameters: {
      slice_id: {
        type: 'string',
        required: true,
        description: 'Slice ID.',
      },
      layer_id: {
        type: 'string',
        required: true,
        description: 'Layer to start: db, business-logic, mapping, api, permission, ui, print, integration.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sliceId: { type: 'string' },
          layerId: { type: 'string' },
          status: { type: 'string' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>

      const layer = engine.startLayer(input.slice_id!, input.layer_id! as LayerId)

      return Promise.resolve({
        sliceId: input.slice_id!,
        layerId: layer.id,
        status: layer.status,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: complete_slice_layer
// ---------------------------------------------------------------------------

export function createCompleteSliceLayerTool() {
  return defineTool({
    name: 'complete_slice_layer',
    description:
      'Mark a layer as completed with its files and notes.',
    parameters: {
      slice_id: {
        type: 'string',
        required: true,
        description: 'Slice ID.',
      },
      layer_id: {
        type: 'string',
        required: true,
        description: 'Layer to complete.',
      },
      files: {
        type: 'string',
        description: 'Comma-separated file paths created/modified.',
      },
      element_ids: {
        type: 'string',
        description: 'Comma-separated element IDs created.',
      },
      notes: {
        type: 'string',
        description: 'Implementation notes.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sliceId: { type: 'string' },
          layerId: { type: 'string' },
          status: { type: 'string' },
          completionPct: { type: 'number' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>

      const layer = engine.completeLayer(input.slice_id!, input.layer_id! as LayerId, {
        files: input.files ? input.files.split(',').map(s => s.trim()) : [],
        elementIds: input.element_ids ? input.element_ids.split(',').map(s => s.trim()) : [],
        ...(input.notes != null ? { notes: input.notes } : {}),
      })

      const slice = engine.getOrThrow(input.slice_id!)

      return Promise.resolve({
        sliceId: input.slice_id!,
        layerId: layer.id,
        status: layer.status,
        completionPct: slice.validation.completionPct,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: fail_slice_layer
// ---------------------------------------------------------------------------

export function createFailSliceLayerTool() {
  return defineTool({
    name: 'fail_slice_layer',
    description:
      'Mark a layer as failed with an error message.',
    parameters: {
      slice_id: {
        type: 'string',
        required: true,
        description: 'Slice ID.',
      },
      layer_id: {
        type: 'string',
        required: true,
        description: 'Layer that failed.',
      },
      error: {
        type: 'string',
        required: true,
        description: 'Error description.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sliceId: { type: 'string' },
          layerId: { type: 'string' },
          status: { type: 'string' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>

      const layer = engine.failLayer(input.slice_id!, input.layer_id! as LayerId, input.error!)

      return Promise.resolve({
        sliceId: input.slice_id!,
        layerId: layer.id,
        status: layer.status,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: skip_slice_layer
// ---------------------------------------------------------------------------

export function createSkipSliceLayerTool() {
  return defineTool({
    name: 'skip_slice_layer',
    description:
      'Skip a layer (e.g. no print needed). Must provide reason.',
    parameters: {
      slice_id: {
        type: 'string',
        required: true,
        description: 'Slice ID.',
      },
      layer_id: {
        type: 'string',
        required: true,
        description: 'Layer to skip.',
      },
      reason: {
        type: 'string',
        required: true,
        description: 'Why this layer is skipped.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sliceId: { type: 'string' },
          layerId: { type: 'string' },
          status: { type: 'string' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>

      const layer = engine.skipLayer(input.slice_id!, input.layer_id! as LayerId, input.reason!)

      return Promise.resolve({
        sliceId: input.slice_id!,
        layerId: layer.id,
        status: layer.status,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: validate_slice
// ---------------------------------------------------------------------------

export function createValidateSliceTool() {
  return defineTool({
    name: 'validate_slice',
    description:
      'Validate a vertical slice — check if coding can proceed. All 8 layers must be completed or skipped.',
    parameters: {
      slice_id: {
        type: 'string',
        required: true,
        description: 'Slice ID to validate.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sliceId: { type: 'string' },
          canCode: { type: 'boolean' },
          completionPct: { type: 'number' },
          completedLayers: { type: 'array' },
          incompleteLayers: { type: 'array' },
          errors: { type: 'array' },
          warnings: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>

      const result = engine.validate(input.slice_id!)

      return Promise.resolve({
        sliceId: result.sliceId,
        canCode: result.canCode,
        completionPct: result.validation.completionPct,
        completedLayers: [...result.validation.completedLayers],
        incompleteLayers: [...result.validation.incompleteLayers],
        errors: [...result.validation.errors],
        warnings: [...result.validation.warnings],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_slice_status
// ---------------------------------------------------------------------------

export function createGetSliceStatusTool() {
  return defineTool({
    name: 'get_slice_status',
    description:
      'Get the current status of a vertical slice and all its layers.',
    parameters: {
      slice_id: {
        type: 'string',
        required: true,
        description: 'Slice ID.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sliceId: { type: 'string' },
          name: { type: 'string' },
          moduleId: { type: 'string' },
          status: { type: 'string' },
          completionPct: { type: 'number' },
          layers: { type: 'object', additionalProperties: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>

      const slice = engine.getOrThrow(input.slice_id!)
      const layerStatus: Record<string, LayerStatus> = {}

      for (const layerId of LAYER_ORDER) {
        layerStatus[layerId] = slice.layers[layerId].status
      }

      return Promise.resolve({
        sliceId: slice.id,
        name: slice.name,
        moduleId: slice.moduleId,
        status: slice.status,
        completionPct: slice.validation.completionPct,
        layers: { ...layerStatus },
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_slice_summary
// ---------------------------------------------------------------------------

export function createGetSliceSummaryTool() {
  return defineTool({
    name: 'get_slice_summary',
    description:
      'Get summary statistics across all vertical slices.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          total: { type: 'number' },
          byStatus: { type: 'object', additionalProperties: true },
          totalLayers: { type: 'number' },
          completedLayers: { type: 'number' },
          layerCompletionPct: { type: 'number' },
          sliceCompletionPct: { type: 'number' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute() {
      const engine = ensureEngine()
      const summary = engine.summary()

      return Promise.resolve({
        total: summary.total,
        byStatus: { ...summary.byStatus } as Record<string, number>,
        totalLayers: summary.totalLayers,
        completedLayers: summary.completedLayers,
        layerCompletionPct: summary.layerCompletionPct,
        sliceCompletionPct: summary.sliceCompletionPct,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: block_slice / unblock_slice
// ---------------------------------------------------------------------------

export function createBlockSliceTool() {
  return defineTool({
    name: 'block_slice',
    description:
      'Block a slice (e.g. waiting for external dependency).',
    parameters: {
      slice_id: {
        type: 'string',
        required: true,
        description: 'Slice ID.',
      },
      reason: {
        type: 'string',
        required: true,
        description: 'Blocking reason.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sliceId: { type: 'string' },
          status: { type: 'string' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>
      const slice = engine.blockSlice(input.slice_id!, input.reason!)
      return Promise.resolve({ sliceId: slice.id, status: slice.status })
    },
  })
}

export function createUnblockSliceTool() {
  return defineTool({
    name: 'unblock_slice',
    description:
      'Unblock a previously blocked slice.',
    parameters: {
      slice_id: {
        type: 'string',
        required: true,
        description: 'Slice ID.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sliceId: { type: 'string' },
          status: { type: 'string' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>
      const slice = engine.unblockSlice(input.slice_id!)
      return Promise.resolve({ sliceId: slice.id, status: slice.status })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: complete_vertical_slice
// ---------------------------------------------------------------------------

export function createCompleteVerticalSliceTool() {
  return defineTool({
    name: 'complete_vertical_slice',
    description:
      'Mark entire slice as completed. All layers must be done.',
    parameters: {
      slice_id: {
        type: 'string',
        required: true,
        description: 'Slice ID.',
      },
      notes: {
        type: 'string',
        description: 'Final implementation notes.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sliceId: { type: 'string' },
          status: { type: 'string' },
          completionPct: { type: 'number' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>
      const slice = engine.completeSlice(input.slice_id!, input.notes)
      return Promise.resolve({
        sliceId: slice.id,
        status: slice.status,
        completionPct: slice.validation.completionPct,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_module_slices
// ---------------------------------------------------------------------------

export function createGetModuleSlicesTool() {
  return defineTool({
    name: 'get_module_slices',
    description:
      'Get all vertical slices for a module.',
    parameters: {
      module_id: {
        type: 'string',
        required: true,
        description: 'Module ID.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          moduleId: { type: 'string' },
          sliceCount: { type: 'number' },
          slices: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>
      const slices = engine.getByModule(input.module_id!)

      return Promise.resolve({
        moduleId: input.module_id!,
        sliceCount: slices.length,
        slices: slices.map(s => ({
          id: s.id,
          name: s.name,
          status: s.status,
          completionPct: s.validation.completionPct,
          order: s.order,
        })),
      })
    },
  })
}
