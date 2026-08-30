/**
 * Governance state machine: validates transitions, stores per-agent state,
 * and emits phase-change events. Works with both in-memory and file-backed
 * stores through the `GovernanceStoreAdapter` interface.
 * @module @deepseek-ai/dsh-governance-layer/state-machine
 */

import type {
  GovernancePhase,
  GovernanceState,
  GovernanceTransition,
} from './types.ts'
import { VALID_TRANSITIONS } from './types.ts'
import type { GovernanceStoreAdapter } from './project-store.ts'
import { MemoryStore } from './project-store.ts'

/**
 * Whether a transition from `from` to `to` is valid under the governance
 * state machine.
 */
export function isValidTransition(from: GovernancePhase, to: GovernancePhase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/** Create a fresh `GovernanceState` in the idle phase. */
export function createInitialState(goalId?: string): GovernanceState {
  return {
    phase: 'idle',
    ...goalId !== undefined ? { goalId } : {},
    revision: 0,
    lastTransitionAt: new Date().toISOString(),
  }
}

/**
 * Attempt a transition; throws on invalid transitions.
 * Returns the new state with an incremented revision.
 */
export function transition(
  current: GovernanceState,
  to: GovernancePhase,
  _reason: string,
): GovernanceState {
  if (!isValidTransition(current.phase, to)) {
    throw new Error(
      `governance: invalid transition from "${current.phase}" to "${to}" `
      + `(valid: ${VALID_TRANSITIONS[current.phase]?.join(', ') ?? 'none'})`,
    )
  }
  return {
    phase: to,
    ...(current.goalId !== undefined ? { goalId: current.goalId } : {}),
    revision: current.revision + 1,
    lastTransitionAt: new Date().toISOString(),
  }
}

/**
 * Create a fresh in-memory store (for tests and lightweight usage).
 */
export function createStore(): GovernanceStoreAdapter {
  return new MemoryStore()
}

/**
 * Retrieve the current governance state for an agent, or `undefined`
 * if no state has been registered.
 */
export function getState(store: GovernanceStoreAdapter, agentId: string): GovernanceState | undefined {
  return store.get(agentId)
}

/**
 * Ensure an agent has a governance state (creating one if absent) and
 * return it.
 */
export function ensureState(store: GovernanceStoreAdapter, agentId: string, goalId?: string): GovernanceState {
  let state = store.get(agentId)
  if (state === undefined) {
    state = createInitialState(goalId)
    store.set(agentId, state)
  }
  return state
}

/**
 * Perform a transition for an agent, returning the full transition record
 * for audit purposes.
 */
export function applyTransition(
  store: GovernanceStoreAdapter,
  agentId: string,
  to: GovernancePhase,
  reason: string,
): GovernanceTransition {
  const current = ensureState(store, agentId)
  const from = current.phase
  const next = transition(current, to, reason)
  store.set(agentId, next)
  return {
    from,
    to,
    reason,
    agentId,
    timestamp: next.lastTransitionAt,
  }
}

/**
 * Remove governance state for an agent (e.g. on disposal).
 */
export function removeState(store: GovernanceStoreAdapter, agentId: string): void {
  store.delete(agentId)
}
