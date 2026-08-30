/**
 * Pre-execution governance gate: intercepts `tools/pre-execute` waterfall and
 * applies phase-based policy (e.g. block state-changing tools during `planning`).
 *
 * Tool lists are config-driven, not hardcoded. The `restrictedTools` and
 * `exemptTools` config fields override the defaults, making the gate
 * extensible without modifying this file.
 * @module @deepseek-ai/dsh-governance-layer/pre-execution
 */

import type { Context } from '@deepseek-ai/cordis'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'
import type { GovernancePhase, GovernanceLayerConfig } from './types.ts'
import type { GovernanceStoreAdapter } from './project-store.ts'

/**
 * Default tools that are state-changing and restricted during certain phases.
 * Overridden by `config.restrictedTools` when provided.
 */
const DEFAULT_RESTRICTED_TOOLS: readonly string[] = [
  'write',
  'edit',
  'bash',
  'pwsh',
  'run_code',
  'delete_file',
  'rename_file',
  'create_goal',
  'update_goal',
]

/**
 * Default tools that are always allowed regardless of phase.
 * Overridden by `config.exemptTools` when provided.
 */
const DEFAULT_EXEMPT_TOOLS: readonly string[] = [
  'get_goal',
  'read_file',
  'search',
  'web_search',
  'web_fetch',
]

/**
 * Install the pre-execution governance gate on the context.
 *
 * The gate checks:
 * 1. Whether governance is enabled.
 * 2. Whether the calling agent has a governance state.
 * 3. Whether the current phase permits the requested tool.
 *
 * Always delegates to `next()` (never short-circuits the waterfall)
 * unless it blocks or asks.
 */
export function installPreExecutionGate(
  ctx: Context,
  store: GovernanceStoreAdapter,
  config: GovernanceLayerConfig,
): () => void {
  if (config.preExecutionEnabled === false) {
    return () => {}
  }

  const restrictedTools = new Set(
    config.restrictedTools ?? DEFAULT_RESTRICTED_TOOLS,
  )
  const exemptTools = new Set(
    config.exemptTools ?? DEFAULT_EXEMPT_TOOLS,
  )
  const unrestrictedPhases = new Set<GovernancePhase>(
    config.unrestrictedPhases ?? ['implementing', 'testing'],
  )

  const listener = async (
    exec: ToolExecution,
    next: () => Promise<PreToolDecision>,
  ): Promise<PreToolDecision> => {
    // Always allow exempt tools.
    if (exemptTools.has(exec.name)) {
      return next()
    }

    // No agent means no governance context — delegate.
    if (exec.agent === undefined) {
      return next()
    }

    const state = store.get(exec.agent.id)

    // No governance state registered — not under governance; delegate.
    if (state === undefined) {
      return next()
    }

    // Unrestricted phases pass through.
    if (unrestrictedPhases.has(state.phase)) {
      return next()
    }

    // Non-unrestricted phases block restricted tools.
    if (restrictedTools.has(exec.name)) {
      return {
        kind: 'deny',
        reason: `governance: tool "${exec.name}" is blocked during the "${state.phase}" phase; transition to "implementing" or "testing" first`,
      }
    }

    return next()
  }

  const dispose = ctx.on('tools/pre-execute', listener)
  return dispose
}
