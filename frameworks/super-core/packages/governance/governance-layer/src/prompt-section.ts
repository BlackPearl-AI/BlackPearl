/**
 * Governance prompt section: injects a system-prompt section describing the
 * current governance phase and available transitions.
 *
 * The section provider is dynamic — it reads the governance store on each
 * assembly and renders the current phase for the active agent.
 * @module @deepseek-ai/dsh-governance-layer/prompt-section
 */

import type { Context } from '@deepseek-ai/cordis'
import type { AssembleContext } from '@deepseek-ai/dsh-system-prompt'
import type { GovernancePhase, GovernanceLayerConfig } from './types.ts'
import { VALID_TRANSITIONS } from './types.ts'
import type { GovernanceStoreAdapter } from './project-store.ts'

/**
 * Human-readable descriptions for each governance phase.
 */
const PHASE_DESCRIPTIONS: Record<GovernancePhase, string> = {
  idle: 'No active governance policy. The model may operate freely.',
  capturing: 'Capturing the user\'s intent and creating or updating the goal definition.',
  planning: 'Planning the implementation. State-changing tools are restricted; the model should produce a plan or blueprint.',
  implementing: 'Executing the implementation plan. All tools are available.',
  testing: 'Running tests and validating the implementation. All tools are available.',
  auditing: 'Final audit and certification. The model should verify completeness before autonomous completion.',
  verified: 'The goal has been completed and verified. Transition back to idle.',
}

/**
 * Format the governance section text for a given phase.
 */
function formatGovernanceText(phase: GovernancePhase, goalId: string | undefined): string {
  const description = PHASE_DESCRIPTIONS[phase]
  const allowedTransitions = VALID_TRANSITIONS[phase]
  const goalNote = goalId !== undefined ? `\nGoal: ${goalId}` : ''

  return [
    `## Governance Phase: ${phase}${goalNote}`,
    '',
    description,
    '',
    'Available transitions:',
    ...allowedTransitions.map(t => `- ${phase} → ${t}`),
    '',
    'Use the `governance_transition` tool to move between phases.',
  ].join('\n')
}

/**
 * Install the governance prompt section on the context.
 *
 * The section is dynamically evaluated on each assembly. It reads the
 * governance store to determine the current phase and renders appropriate
 * guidance. When no governance state exists, it renders a static
 * framework description.
 *
 * @param ctx - Harness context with `systemPrompt` service.
 * @param store - The governance state store.
 * @param config - Plugin configuration.
 * @returns Disposer that removes the section.
 */
export function installPromptSection(
  ctx: Context,
  store: GovernanceStoreAdapter,
  config: GovernanceLayerConfig,
): () => void {
  if (config.promptEnabled === false) {
    return () => {}
  }

  const section = ctx.systemPrompt.section({
    name: 'governance:phase',
    order: -50,
    text: (_context: AssembleContext) => {
      // The text provider is evaluated on each assembly. We cannot directly
      // access the calling agent from AssembleContext, but we can check
      // the store for any active governance state. If the store has entries,
      // we render the dynamic phase for the most recently transitioned agent.
      //
      // For single-agent sessions (the common case), the store has exactly
      // one entry and we render its phase. For multi-agent sessions, we
      // render the first non-idle state found.
      let activePhase: GovernancePhase | undefined
      let activeGoalId: string | undefined

      for (const [, state] of store.entries()) {
        if (state.phase !== 'idle') {
          activePhase = state.phase
          activeGoalId = state.goalId
          break
        }
      }

      if (activePhase !== undefined) {
        return formatGovernanceText(activePhase, activeGoalId)
      }

      // No active governance state — render the static framework description.
      return [
        '## Governance Framework',
        '',
        'This session is governed by a phase-based governance policy.',
        'When a goal is active, the session progresses through phases:',
        'idle → capturing → planning → implementing → testing → auditing → verified.',
        '',
        'During the `planning` phase, state-changing tools (write, edit, bash) are restricted.',
        'During `implementing` and `testing`, all tools are available.',
        'Autonomous goal completion requires the `auditing` phase.',
      ].join('\n')
    },
  })

  return section
}
