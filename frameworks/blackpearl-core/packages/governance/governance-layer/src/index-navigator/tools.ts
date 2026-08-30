/**
 * G-29 — Token / Context Efficiency Engine: Cordis Tool Wrappers
 *
 * Tools:
 * - navigate_indexes          → execute mandatory 1 to 7 navigation cascade
 * - check_index_staleness     → detect missing or stale indexes without full scans
 * - repair_index_bounded      → repair an index within a bounded scope
 * - deduplicate_context       → eliminate redundant context snippets
 * - estimate_context_tokens   → compute token and byte efficiency reports
 * - expand_scope_by_dependency → perform bounded BFS expansion over dependency graph
 *
 * @module @deepseek-ai/dsh-governance-layer/index-navigator/tools
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { IndexNavigatorEngine } from './engine.ts'
import type { IndexType } from './types.ts'

let activeEngine: IndexNavigatorEngine | undefined

/** Get active index navigator engine. */
export function getActiveEngine(): IndexNavigatorEngine | undefined {
  return activeEngine
}

/** Reset engine (for testing). */
export function resetEngine(): void {
  activeEngine = undefined
}

function ensureEngine(): IndexNavigatorEngine {
  if (activeEngine === undefined) {
    activeEngine = new IndexNavigatorEngine()
  }
  return activeEngine
}

function presentCall(args: unknown): GenericCallView {
  const a = args as Record<string, unknown>
  const id = a['task_id'] ?? a['index_type'] ?? a['module_id'] ?? '?'
  return {
    card: 'generic',
    title: `IndexNavigator: ${String(id)}`,
    kind: 'other',
    rawInput: JSON.stringify(args),
  }
}

const JSON_OUTPUT = {
  schema: { type: 'object' as const, additionalProperties: true as const },
  render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
} as const

// ---------------------------------------------------------------------------
// Tool: navigate_indexes
// ---------------------------------------------------------------------------

export function createNavigateIndexesTool() {
  return defineTool({
    name: 'navigate_indexes',
    description:
      'Execute mandatory 1→7 index navigation priority (Requirement→Element→Blueprint→'
      + 'Dependency→File→Repair→RawSource). Raw source files are accessible ONLY when '
      + 'verified by higher-level indexes.',
    parameters: {
      task_id: {
        type: 'string',
        required: true,
        description: 'Task or repair ID to execute navigation priority for.',
      },
      query: {
        type: 'string',
        description: 'Target query or feature description.',
      },
      target_module: {
        type: 'string',
        description: 'Optional target module identifier.',
      },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const plan = engine.navigate(
        args.task_id as string,
        args.query as string | undefined,
        args.target_module as string | undefined,
      )
      return Promise.resolve(plan)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: check_index_staleness
// ---------------------------------------------------------------------------

export function createCheckIndexStalenessTool() {
  return defineTool({
    name: 'check_index_staleness',
    description: 'Check if a specific index is missing or stale without scanning the entire repo.',
    parameters: {
      index_type: {
        type: 'string',
        required: true,
        enum: ['requirement_goal', 'element', 'blueprint', 'dependency', 'file', 'repair', 'raw_source'] as const,
        description: 'Type of index to check for staleness.',
      },
      target_module: {
        type: 'string',
        description: 'Optional target module.',
      },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const result = engine.checkStaleness(
        args.index_type as IndexType,
        args.target_module as string | undefined,
      )
      return Promise.resolve(result)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: repair_index_bounded
// ---------------------------------------------------------------------------

export function createRepairIndexBoundedTool() {
  return defineTool({
    name: 'repair_index_bounded',
    description: 'Repair a stale index within a bounded scope without scanning the whole repository.',
    parameters: {
      index_type: {
        type: 'string',
        required: true,
        enum: ['requirement_goal', 'element', 'blueprint', 'dependency', 'file', 'repair', 'raw_source'] as const,
        description: 'Type of index to repair.',
      },
      bounded_scope: {
        type: 'string',
        required: true,
        description: 'Target module or component scope to repair.',
      },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const result = engine.repairIndexBounded(
        args.index_type as IndexType,
        args.bounded_scope as string,
      )
      return Promise.resolve(result)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: deduplicate_context
// ---------------------------------------------------------------------------

export function createDeduplicateContextTool() {
  return defineTool({
    name: 'deduplicate_context',
    description: 'Remove duplicate lines and snippets from context to minimize token consumption.',
    parameters: {
      entries: {
        type: 'array',
        required: true,
        description: 'Array of context text entries to deduplicate.',
        items: { type: 'string' },
      },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const result = engine.deduplicateContext((args.entries as string[]) ?? [])
      return Promise.resolve(result)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: estimate_context_tokens
// ---------------------------------------------------------------------------

export function createEstimateContextTokensTool() {
  return defineTool({
    name: 'estimate_context_tokens',
    description: 'Calculate detailed token and byte accounting report for a set of context entries.',
    parameters: {
      entries: {
        type: 'array',
        required: true,
        description: 'Array of context entries to evaluate.',
        items: { type: 'string' },
      },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const result = engine.accountContext((args.entries as string[]) ?? [])
      return Promise.resolve(result)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: expand_scope_by_dependency
// ---------------------------------------------------------------------------

export function createExpandScopeByDependencyTool() {
  return defineTool({
    name: 'expand_scope_by_dependency',
    description: 'Perform bounded BFS dependency expansion up to a maximum number of hops.',
    parameters: {
      start_module: {
        type: 'string',
        required: true,
        description: 'Starting module identifier.',
      },
      max_hops: {
        type: 'integer',
        description: 'Maximum dependency hops to traverse (default 1).',
      },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const result = engine.expandScopeByDependency(
        args.start_module as string,
        (args.max_hops as number | undefined) ?? 1,
      )
      return Promise.resolve(result)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: reuse_evidence
// ---------------------------------------------------------------------------

export function createReuseEvidenceTool() {
  return defineTool({
    name: 'reuse_evidence',
    description: 'Check and reuse recorded test evidence and verification records for a given task.',
    parameters: {
      task_id: {
        type: 'string',
        required: true,
        description: 'Target task or repair ID.',
      },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const result = engine.reuseEvidence(args.task_id as string)
      return Promise.resolve(result)
    },
    presentCall,
  })
}
