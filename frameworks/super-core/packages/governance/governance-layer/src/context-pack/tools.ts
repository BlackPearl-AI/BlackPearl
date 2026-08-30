/**
 * G-28 — Task-Specific Context Pack Engine: Cordis Tool Wrappers
 *
 * Tools:
 * - build_context_pack      → automatically assemble compact context pack for a task
 * - get_context_pack_manifest → retrieve machine-readable manifest of a context pack
 * - estimate_context_size    → calculate estimated token/byte footprint before injection
 *
 * @module @deepseek-ai/dsh-governance-layer/context-pack/tools
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { ContextPackEngine } from './engine.ts'
import type { ContextPackRequest } from './types.ts'

let activeEngine: ContextPackEngine | undefined

/** Get active context pack engine. */
export function getActiveEngine(): ContextPackEngine | undefined {
  return activeEngine
}

/** Reset engine (for testing). */
export function resetEngine(): void {
  activeEngine = undefined
}

function ensureEngine(): ContextPackEngine {
  if (activeEngine === undefined) {
    activeEngine = new ContextPackEngine()
  }
  return activeEngine
}

function presentCall(args: unknown): GenericCallView {
  const a = args as Record<string, unknown>
  const id = a['task_id'] ?? a['pack_id'] ?? '?'
  return {
    card: 'generic',
    title: `ContextPack: ${String(id)}`,
    kind: 'other',
    rawInput: JSON.stringify(args),
  }
}

const JSON_OUTPUT = {
  schema: { type: 'object' as const, additionalProperties: true as const },
  render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
} as const

// ---------------------------------------------------------------------------
// Tool: build_context_pack
// ---------------------------------------------------------------------------

export function createBuildContextPackTool() {
  return defineTool({
    name: 'build_context_pack',
    description:
      'Build a compact, task-specific context pack containing ONLY relevant requirements, '
      + 'active goals, applicable rules, exact files, direct dependencies, and tests. '
      + 'Prevents token waste by excluding unrelated repository files and blueprint sections.',
    parameters: {
      task_id: {
        type: 'string',
        required: true,
        description: 'Task or repair ID to build context for.',
      },
      module_id: {
        type: 'string',
        description: 'Optional target module ID.',
      },
      element_ids: {
        type: 'array',
        description: 'Specific element IDs relevant to the task.',
        items: { type: 'string' },
      },
      goal_id: {
        type: 'string',
        description: 'Optional goal ID.',
      },
      query: {
        type: 'string',
        description: 'Natural language task description or focus query.',
      },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const req: ContextPackRequest = {
        taskId: args.task_id as string,
        moduleId: args.module_id as string | undefined,
        elementIds: args.element_ids as string[] | undefined,
        goalId: args.goal_id as string | undefined,
        query: args.query as string | undefined,
      }
      const pack = engine.buildContextPack(req)
      return Promise.resolve(pack)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: get_context_pack_manifest
// ---------------------------------------------------------------------------

export function createGetContextPackManifestTool() {
  return defineTool({
    name: 'get_context_pack_manifest',
    description: 'Retrieve the machine-readable manifest and item breakdown of a built context pack.',
    parameters: {
      pack_id: {
        type: 'string',
        required: true,
        description: 'Context pack ID returned by build_context_pack.',
      },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const manifest = engine.getManifest(args.pack_id as string)
      if (manifest === undefined) {
        throw new Error(`context pack "${String(args.pack_id)}" not found`)
      }
      return Promise.resolve(manifest)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: estimate_context_size
// ---------------------------------------------------------------------------

export function createEstimateContextSizeTool() {
  return defineTool({
    name: 'estimate_context_size',
    description: 'Preview the token and byte footprint of a context pack before building it.',
    parameters: {
      task_id: {
        type: 'string',
        required: true,
        description: 'Task ID.',
      },
      module_id: {
        type: 'string',
        description: 'Module ID.',
      },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const req: ContextPackRequest = {
        taskId: args.task_id as string,
        moduleId: args.module_id as string | undefined,
      }
      const pack = engine.buildContextPack(req)
      return Promise.resolve({
        taskId: req.taskId,
        moduleId: req.moduleId,
        totalTokenEstimate: pack.manifest.totalTokenEstimate,
        totalSizeBytes: pack.manifest.totalSizeBytes,
        itemCount: pack.manifest.items.length,
      })
    },
    presentCall,
  })
}
