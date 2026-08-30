/**
 * MASTER-GOAL tools: capture_master_goal, verify_against_goal.
 *
 * @module @deepseek-ai/dsh-governance-layer/master-goal/tools
 */

import { HarnessError } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView, JsonValue } from '@deepseek-ai/dsh-tools'
import {
  validateDefinition,
  computeProgress,
  verifyAgainstGoal,
  summarizeGoal,
} from './engine.ts'
import type {
  MasterGoalDefinition,
  ScopeItem,
  Criterion,
} from './types.ts'

/** Active MASTER-GOAL definition (per-session). */
let activeGoal: MasterGoalDefinition | undefined

/** Get the active MASTER-GOAL. */
export function getActiveGoal(): MasterGoalDefinition | undefined {
  return activeGoal
}

/** Set the active MASTER-GOAL (for testing). */
export function setActiveGoal(goal: MasterGoalDefinition | undefined): void {
  activeGoal = goal
}

/** Reset (for testing). */
export function resetGoal(): void {
  activeGoal = undefined
}

// ---------------------------------------------------------------------------
// capture_master_goal
// ---------------------------------------------------------------------------

/**
 * Create the `capture_master_goal` tool.
 *
 * Accepts a structured product definition and stores it as the
 * authoritative MASTER-GOAL for the session.
 */
export function createCaptureMasterGoalTool() {
  return defineTool({
    name: 'capture_master_goal',
    description:
      'Capture the MASTER-GOAL: the authoritative definition of what the product is, '
      + 'what it does, what it does NOT do, and how success is measured. '
      + 'All development is verified against this definition. '
      + 'This is NOT a task list — it is a statement of WHAT the product IS.',
    parameters: {
      id: {
        type: 'string',
        required: true,
        description: 'Unique goal id (e.g. "school-erp-001").',
      },
      identity: {
        type: 'string',
        required: true,
        description: 'One-sentence product identity: what IS this product?',
      },
      description: {
        type: 'string',
        required: true,
        description: 'Detailed product description (2-5 sentences).',
      },
      included: {
        type: 'array',
        required: true,
        description: 'Capabilities the product MUST have.',
        items: {
          type: 'object',
          additionalProperties: true,
          properties: {
            id: { type: 'string', description: 'Unique capability id.' },
            name: { type: 'string', description: 'Capability name.' },
            description: { type: 'string', description: 'What this capability means.' },
            priority: { type: 'string', description: 'must-have, should-have, or nice-to-have.' },
          },
        },
      },
      excluded: {
        type: 'array',
        description: 'Capabilities the product MUST NOT have (scope boundaries).',
        items: {
          type: 'object',
          additionalProperties: true,
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string' },
          },
        },
      },
      deferred: {
        type: 'array',
        description: 'Capabilities deferred to a future version.',
        items: {
          type: 'object',
          additionalProperties: true,
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string' },
          },
        },
      },
      functional_criteria: {
        type: 'array',
        required: true,
        description: 'Functional acceptance criteria: what the product must DO.',
        items: {
          type: 'object',
          additionalProperties: true,
          properties: {
            id: { type: 'string', description: 'Criterion id.' },
            statement: { type: 'string', description: 'What must be true.' },
            verification_method: { type: 'string', description: 'test, manual, audit, or observation.' },
            module_id: { type: 'string', description: 'Module this applies to (optional).' },
          },
        },
      },
      integration_criteria: {
        type: 'array',
        description: 'Integration acceptance criteria: how modules must work together.',
        items: {
          type: 'object',
          additionalProperties: true,
          properties: {
            id: { type: 'string' },
            statement: { type: 'string' },
            verification_method: { type: 'string' },
            module_id: { type: 'string' },
          },
        },
      },
      quality_attributes: {
        type: 'object',
        description: 'Non-functional requirements (performance, security, etc.).',
        additionalProperties: true,
        properties: {
          performance: { type: 'array', items: { type: 'string' } },
          security: { type: 'array', items: { type: 'string' } },
          scalability: { type: 'array', items: { type: 'string' } },
          usability: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    output: {
      schema: {
        type: 'object' as const,
        additionalProperties: false as const,
        properties: {
          goalId: { type: 'string' as const, required: true as const },
          summary: { type: 'string' as const, required: true as const },
          valid: { type: 'boolean' as const, required: true as const },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const now = new Date().toISOString()
      const goal: MasterGoalDefinition = {
        id: args.id as string,
        identity: args.identity as string,
        description: args.description as string,
        scope: {
          included: (args.included as ScopeItem[]).map(i => ({
            id: i.id,
            name: i.name,
            description: i.description,
            priority: i.priority ?? 'must-have',
          })),
          excluded: ((args.excluded as ScopeItem[] ?? []).map(e => ({
            id: e.id,
            name: e.name,
            description: e.description,
            priority: e.priority ?? 'must-have',
          }))),
          deferred: ((args.deferred as ScopeItem[] ?? []).map(d => ({
            id: d.id,
            name: d.name,
            description: d.description,
            priority: d.priority ?? 'should-have',
          }))),
        },
        acceptanceCriteria: {
          functional: (args.functional_criteria as unknown as Criterion[]).map(c => ({
            id: c.id,
            statement: c.statement,
            verificationMethod: c.verificationMethod ?? 'test',
            ...(c.moduleId !== undefined ? { moduleId: c.moduleId } : {}),
            status: 'unverified' as const,
          })),
          integration: ((args.integration_criteria as unknown as Criterion[] ?? []).map(c => ({
            id: c.id,
            statement: c.statement,
            verificationMethod: c.verificationMethod ?? 'test',
            ...(c.moduleId !== undefined ? { moduleId: c.moduleId } : {}),
            status: 'unverified' as const,
          }))),
          userExperience: [],
        },
        qualityAttributes: {
          ...((args.quality_attributes as Record<string, string[]> | undefined)?.performance !== undefined
            ? { performance: (args.quality_attributes as Record<string, string[]>).performance }
            : {}),
          ...((args.quality_attributes as Record<string, string[]> | undefined)?.security !== undefined
            ? { security: (args.quality_attributes as Record<string, string[]>).security }
            : {}),
          ...((args.quality_attributes as Record<string, string[]> | undefined)?.scalability !== undefined
            ? { scalability: (args.quality_attributes as Record<string, string[]>).scalability }
            : {}),
          ...((args.quality_attributes as Record<string, string[]> | undefined)?.usability !== undefined
            ? { usability: (args.quality_attributes as Record<string, string[]>).usability }
            : {}),
        },
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
      }

      // Validate.
      try {
        validateDefinition(goal)
      } catch (error) {
        if (error instanceof Error) {
          throw new HarnessError(
            `capture_master_goal: ${error.message}`,
            'MASTER_GOAL_VALIDATION_FAILED',
          )
        }
        throw error
      }

      // Store.
      activeGoal = goal

      // Generate summary.
      const summary = summarizeGoal(goal)

      return Promise.resolve({
        goalId: goal.id,
        summary,
        valid: true,
      })
    },
    presentCall(args): GenericCallView {
      return {
        card: 'generic',
        title: `MASTER-GOAL: ${(args as { identity?: string }).identity ?? '?'}`,
        kind: 'other',
        rawInput: 'Capturing product definition',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// verify_against_goal
// ---------------------------------------------------------------------------

/**
 * Create the `verify_against_goal` tool.
 *
 * Verifies a proposed implementation or decision against the MASTER-GOAL.
 */
export function createVerifyAgainstGoalTool() {
  return defineTool({
    name: 'verify_against_goal',
    description:
      'Verify a proposed implementation or decision against the MASTER-GOAL. '
      + 'Checks scope compliance, criteria coverage, and alignment score. '
      + 'Use this before implementing any module to ensure it serves the goal.',
    parameters: {
      proposed_capabilities: {
        type: 'array',
        required: true,
        description: 'Capability ids this implementation provides.',
        items: { type: 'string' },
      },
      covered_criteria: {
        type: 'array',
        description: 'Acceptance criterion ids this implementation covers.',
        items: { type: 'string' },
      },
    },
    output: {
      schema: {
        type: 'object' as const,
        additionalProperties: false as const,
        properties: {
          consistent: { type: 'boolean' as const, required: true as const },
          alignmentScore: { type: 'number' as const, required: true as const },
          reasons: { type: 'array' as const, items: { type: 'string' as const }, required: true as const },
          scopeViolations: { type: 'array' as const, items: { type: 'string' as const }, required: true as const },
          missingCriteria: { type: 'array' as const, items: { type: 'string' as const }, required: true as const },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      if (activeGoal === undefined) {
        throw new HarnessError(
          'verify_against_goal: no MASTER-GOAL captured — call capture_master_goal first',
          'MASTER_GOAL_NOT_CAPTURED',
        )
      }

      const proposedCapabilities = args.proposed_capabilities as string[]
      const coveredCriteria = (args.covered_criteria as string[]) ?? []

      const result = verifyAgainstGoal(activeGoal, proposedCapabilities, coveredCriteria)

      return Promise.resolve({
        consistent: result.consistent,
        alignmentScore: result.alignmentScore,
        reasons: [...result.reasons],
        scopeViolations: [...result.scopeViolations],
        missingCriteria: [...result.missingCriteria],
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { proposed_capabilities?: string[] }
      return {
        card: 'generic',
        title: 'Verify Against MASTER-GOAL',
        kind: 'other',
        rawInput: `${input.proposed_capabilities?.length ?? 0} capabilities`,
      }
    },
  })
}

// ---------------------------------------------------------------------------
// get_master_goal_progress
// ---------------------------------------------------------------------------

/**
 * Create the `get_master_goal_progress` tool.
 */
export function createGetMasterGoalProgressTool() {
  return defineTool({
    name: 'get_master_goal_progress',
    description:
      'Get progress against the MASTER-GOAL: scope items implemented, '
      + 'acceptance criteria verified, and overall score.',
    parameters: {
      completed_modules: {
        type: 'array',
        description: 'Module ids that have been completed.',
        items: { type: 'string' },
      },
      verified_criteria: {
        type: 'array',
        description: 'Acceptance criterion ids that have been verified.',
        items: { type: 'string' },
      },
      failed_criteria: {
        type: 'array',
        description: 'Acceptance criterion ids that have failed.',
        items: { type: 'string' },
      },
    },
    output: {
      schema: {
        type: 'object' as const,
        additionalProperties: false as const,
        properties: {
          goalId: { type: 'string' as const, required: true as const },
          progress: { type: 'object' as const, additionalProperties: true as const, required: true as const },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      if (activeGoal === undefined) {
        throw new HarnessError(
          'get_master_goal_progress: no MASTER-GOAL captured',
          'MASTER_GOAL_NOT_CAPTURED',
        )
      }

      const completedModules = new Set<string>((args.completed_modules as string[]) ?? [])
      const verifiedCriteria = new Set<string>((args.verified_criteria as string[]) ?? [])
      const failedCriteria = new Set<string>((args.failed_criteria as string[]) ?? [])

      const progress = computeProgress(activeGoal, completedModules, verifiedCriteria, failedCriteria)

      return Promise.resolve({
        goalId: activeGoal.id,
        progress: progress as unknown as Record<string, JsonValue>,
      })
    },
    presentCall(): GenericCallView {
      return {
        card: 'generic',
        title: 'MASTER-GOAL Progress',
        kind: 'other',
        rawInput: 'Checking progress',
      }
    },
  })
}
