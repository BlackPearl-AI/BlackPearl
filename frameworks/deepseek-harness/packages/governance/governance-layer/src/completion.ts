/**
 * Governance completion gate: integrates with the goal authority's
 * `registerCompletionGate` to enforce phase-based completion policy.
 *
 * The gate is a pure function — it reads the governance store and
 * returns `undefined` (allow) or a denial string. It does NOT modify
 * any goal or authority state.
 * @module @deepseek-ai/dsh-governance-layer/completion
 */

import type { Context } from '@deepseek-ai/cordis'
import type { GoalView } from '@deepseek-ai/dsh-goal'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { GovernanceLayerConfig } from './types.ts'
import type { GovernanceStoreAdapter } from './project-store.ts'

/**
 * The minimum phase required for autonomous goal completion.
 * The governance gate requires the agent to be in the `auditing` phase,
 * meaning it has completed testing and is ready for final certification.
 */
const REQUIRED_PHASE_FOR_COMPLETION = 'auditing'

/**
 * Create the governance completion gate function.
 *
 * The gate checks:
 * 1. Whether the calling agent has a governance state.
 * 2. Whether the current phase is `auditing`.
 * 3. Whether the goal id matches the governance state's tracked goal.
 */
function createGate(store: GovernanceStoreAdapter) {
  return (
    execution: { readonly agent: Agent; readonly goal: GoalView },
  ): string | undefined => {
    const state = store.get(execution.agent.id)

    // No governance state: do not block (the goal system handles its own
    // fail-closed behavior when no gate is installed).
    if (state === undefined) return undefined

    // Phase check.
    if (state.phase !== REQUIRED_PHASE_FOR_COMPLETION) {
      return `governance: autonomous completion requires the "${REQUIRED_PHASE_FOR_COMPLETION}" phase; current phase is "${state.phase}"`
    }

    // Goal id check: if the governance state tracks a specific goal, the
    // completing goal must match.
    if (state.goalId !== undefined && state.goalId !== execution.goal.id) {
      return `governance: goal id mismatch (expected "${state.goalId}", got "${execution.goal.id}")`
    }

    return undefined
  }
}

/**
 * Install the governance completion gate on the context.
 *
 * Uses `registerCompletionGate` from the goal authority to register
 * a gate that enforces phase-based completion policy.
 *
 * If the goal authority is not available (goal package not loaded),
 * the gate is silently not installed. This is a valid deployment:
 * governance without goal integration.
 *
 * @param ctx - Harness context that owns the completion policy.
 * @param store - The governance state store.
 * @param config - Plugin configuration.
 * @returns Disposer that removes the completion gate.
 */
export function installCompletionGate(
  ctx: Context,
  store: GovernanceStoreAdapter,
  config: GovernanceLayerConfig,
): () => void {
  if (config.completionEnabled === false) {
    return () => {}
  }

  const gate = createGate(store)

  // Try to import the goal authority synchronously. If the goal package
  // is not loaded, this will throw and we silently skip.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerCompletionGate } = require(
      '@deepseek-ai/dsh-tool-goal',
    ) as typeof import('@deepseek-ai/dsh-tool-goal')
    return registerCompletionGate(ctx, gate as never)
  } catch {
    // Goal package not loaded — completion gate silently not installed.
    return () => {}
  }
}
