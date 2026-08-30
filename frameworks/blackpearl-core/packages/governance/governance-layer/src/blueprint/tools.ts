/**
 * Blueprint tools: `start_blueprint`, `advance_blueprint`, `get_blueprint_status`.
 * These tools let the model interact with the 20-phase orchestrator.
 *
 * @module @deepseek-ai/dsh-governance-layer/blueprint/tools
 */

import { HarnessError } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { BlueprintOrchestrator } from './orchestrator.ts'
import type { BlueprintPhase } from './types.ts'

/** Active orchestrator instance (per-session, created on start_blueprint). */
let activeOrchestrator: BlueprintOrchestrator | undefined

/** Get the active orchestrator (for other modules to read). */
export function getActiveOrchestrator(): BlueprintOrchestrator | undefined {
  return activeOrchestrator
}

/** Reset the active orchestrator (for testing). */
export function resetOrchestrator(): void {
  activeOrchestrator = undefined
}

/**
 * Format the current blueprint progress as a compact status string.
 */
function formatBlueprintStatus(orch: BlueprintOrchestrator): string {
  const state = orch.getState()
  const progress = orch.getProgress()
  const phases = orch.getPhaseOrder()
  const statuses = orch.getPhaseStatuses()

  const lines: string[] = []
  lines.push(`## Blueprint Progress: ${progress.percentage}% (${progress.completed}/${progress.total})`)
  lines.push(`Objective: ${state.objective}`)
  lines.push(`Goal ID: ${state.goalId}`)
  lines.push('')

  for (const phase of phases) {
    const status = statuses[phase]
    const icon = status === 'completed' ? '✅' : status === 'running' ? '🔄' : status === 'failed' ? '❌' : status === 'skipped' ? '⬜' : '⏳'
    const label = orch.getPhaseLabel(phase)
    lines.push(`${icon} ${label}`)
  }

  if (state.currentPhase) {
    lines.push('')
    lines.push(`**Current:** ${orch.getPhaseLabel(state.currentPhase)}`)
  }

  return lines.join('\n')
}

/**
 * Create the `start_blueprint` tool.
 *
 * Initializes a new BlueprintOrchestrator and starts Phase 01.
 */
export function createStartBlueprintTool() {
  return defineTool({
    name: 'start_blueprint',
    description:
      'Start the 20-phase MASTER RECOVERY & DEVELOPMENT BLUEPRINT for a project. '
      + 'Initializes the orchestrator, begins Phase 01 (Project Onboarding), '
      + 'and returns the first status snapshot. Must be called before advance_blueprint.',
    parameters: {
      objective: {
        type: 'string',
        required: true,
        description: 'The high-level objective (e.g. "School ERP बनाओ").',
      },
      goal_id: {
        type: 'string',
        description: 'Optional goal identifier (auto-generated if omitted).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          goalId: { type: 'string', required: true },
          objective: { type: 'string', required: true },
          currentPhase: { type: 'string', required: true },
          status: { type: 'string', required: true },
        },
      } as const,
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const objective = args.objective as string
      const goalId = (args.goal_id as string | undefined) ?? `MG-${Date.now().toString(36).toUpperCase()}`

      if (!objective || objective.trim().length === 0) {
        throw new HarnessError(
          'start_blueprint: objective is required',
          'BLUEPRINT_OBJECTIVE_REQUIRED',
        )
      }

      const orch = new BlueprintOrchestrator(goalId, objective)
      orch.startPhase('project-onboarding')
      activeOrchestrator = orch

      return Promise.resolve({
        goalId,
        objective,
        currentPhase: orch.getPhaseLabel('project-onboarding'),
        status: formatBlueprintStatus(orch),
      })
    },
    presentCall(args): GenericCallView {
      return {
        card: 'generic',
        title: `Blueprint: ${(args as { objective?: string }).objective ?? '?'}`,
        kind: 'other',
        rawInput: 'Starting 20-phase blueprint',
      }
    },
  })
}

/**
 * Create the `advance_blueprint` tool.
 *
 * Completes the current phase with its output and advances to the next.
 */
export function createAdvanceBlueprintTool() {
  return defineTool({
    name: 'advance_blueprint',
    description:
      'Complete the current blueprint phase with its output and advance to the next phase. '
      + 'Each phase produces structured output that feeds into the next phase. '
      + 'Use get_blueprint_status to see the current phase and expected output.',
    parameters: {
      phase: {
        type: 'string',
        required: true,
        description: 'The phase to complete (e.g. "project-onboarding").',
        enum: [
          'project-onboarding', 'master-goal-capture', 'conversation-ledger',
          'goal-breakdown', 'module-identification', 'module-deep-analysis',
          'goal-blueprint', 'file-folder-blueprint', 'element-registry',
          'rule-document-governance', 'dependency-mapping', 'task-decomposition',
          'pre-coding-audit', 'implementation', 'test-evidence',
          'independent-audit', 'module-exit-gate', 'next-module-linking',
          'direct-repair-index', 'golden-journey',
        ] as const,
      },
      output: {
        type: 'object',
        additionalProperties: true,
        required: true,
        description: 'Phase output as a JSON object (structure depends on the phase).',
      },
      skip: {
        type: 'boolean',
        description: 'If true, skip this phase instead of completing it.',
      },
      skip_reason: {
        type: 'string',
        description: 'Reason for skipping (required if skip is true).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          completedPhase: { type: 'string', required: true },
          nextPhase: { type: 'string' },
          status: { type: 'string', required: true },
          isComplete: { type: 'boolean', required: true },
        },
      } as const,
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      if (activeOrchestrator === undefined) {
        throw new HarnessError(
          'advance_blueprint: no active blueprint — call start_blueprint first',
          'BLUEPRINT_NOT_STARTED',
        )
      }

      const phase = args.phase as BlueprintPhase
      const skip = args.skip as boolean | undefined
      const skipReason = args.skip_reason as string | undefined

      // Verify the phase matches the current phase.
      if (phase !== activeOrchestrator.getCurrentPhase()) {
        throw new HarnessError(
          `advance_blueprint: expected phase "${activeOrchestrator.getCurrentPhase()}", got "${phase}"`,
          'BLUEPRINT_PHASE_MISMATCH',
        )
      }

      if (skip === true) {
        activeOrchestrator.skipPhase(phase, skipReason ?? 'skipped by user')
      } else {
        activeOrchestrator.completePhase(phase, args.output)
      }

      const nextPhase = activeOrchestrator.getNextPhase(phase)
      const isComplete = activeOrchestrator.isComplete()

      return Promise.resolve({
        completedPhase: activeOrchestrator.getPhaseLabel(phase),
        ...(nextPhase ? { nextPhase: activeOrchestrator.getPhaseLabel(nextPhase) } : {}),
        status: formatBlueprintStatus(activeOrchestrator),
        isComplete,
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { phase?: string; skip?: boolean }
      return {
        card: 'generic',
        title: input.skip ? `Skip: ${input.phase ?? '?'}` : `Complete: ${input.phase ?? '?'}`,
        kind: 'other',
        rawInput: input.skip ? 'Skipping phase' : 'Advancing phase',
      }
    },
  })
}

/**
 * Create the `get_blueprint_status` tool.
 *
 * Returns the current blueprint progress and phase statuses.
 */
export function createGetBlueprintStatusTool() {
  return defineTool({
    name: 'get_blueprint_status',
    description:
      'Get the current blueprint progress: completed phases, current phase, '
      + 'and overall percentage. Use this to understand where you are in the '
      + '20-phase lifecycle.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          goalId: { type: 'string', required: true },
          objective: { type: 'string', required: true },
          progress: {
            type: 'object',
            additionalProperties: false,
            properties: {
              completed: { type: 'number', required: true },
              total: { type: 'number', required: true },
              percentage: { type: 'number', required: true },
            },
          },
          status: { type: 'string', required: true },
        },
      } as const,
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute() {
      if (activeOrchestrator === undefined) {
        throw new HarnessError(
          'get_blueprint_status: no active blueprint — call start_blueprint first',
          'BLUEPRINT_NOT_STARTED',
        )
      }

      const state = activeOrchestrator.getState()
      const progress = activeOrchestrator.getProgress()

      return Promise.resolve({
        goalId: state.goalId,
        objective: state.objective,
        progress,
        status: formatBlueprintStatus(activeOrchestrator),
      })
    },
    presentCall(): GenericCallView {
      return {
        card: 'generic',
        title: 'Blueprint Status',
        kind: 'other',
        rawInput: 'Checking progress',
      }
    },
  })
}
