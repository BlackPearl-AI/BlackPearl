/**
 * Goal Blueprint tools.
 *
 * - `create_goal_blueprint`: create a blueprint for a goal node
 * - `get_goal_blueprint`: retrieve a blueprint
 * - `update_blueprint_section`: update a specific section
 * - `validate_blueprints`: check completeness of all blueprints
 * - `get_blueprint_report`: generate markdown report
 *
 * @module @deepseek-ai/dsh-governance-layer/goal-blueprint/tools
 */

import { HarnessError } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView, JsonValue } from '@deepseek-ai/dsh-tools'
import { GoalBlueprintEngine } from './engine.ts'
import { SECTION_ORDER } from './types.ts'
import type { BlueprintSectionKey } from './types.ts'

/** Active engine instance (per-session). */
let activeEngine: GoalBlueprintEngine | undefined

/** Get the active engine. */
export function getActiveEngine(): GoalBlueprintEngine | undefined {
  return activeEngine
}

/** Reset the active engine (for testing). */
export function resetEngine(): void {
  activeEngine = undefined
}

function ensureEngine(): GoalBlueprintEngine {
  if (activeEngine === undefined) {
    activeEngine = new GoalBlueprintEngine()
  }
  return activeEngine
}

// ---------------------------------------------------------------------------
// Tool: create_goal_blueprint
// ---------------------------------------------------------------------------

/**
 * Create the `create_goal_blueprint` tool.
 */
export function createCreateGoalBlueprintTool() {
  return defineTool({
    name: 'create_goal_blueprint',
    description:
      'Create a structured blueprint for a goal node in the breakdown tree. '
      + 'Each goal gets a blueprint with 10 sections: Purpose, Input, Output, '
      + 'Workflow, Dependencies, Used By, Files, Elements, Tests, Completion Criteria.',
    parameters: {
      goal_node_id: {
        type: 'string',
        required: true,
        description: 'The goal node ID to create a blueprint for.',
      },
      goal_name: {
        type: 'string',
        required: true,
        description: 'Display name for the goal.',
      },
      purpose_description: {
        type: 'string',
        description: 'Optional initial purpose description.',
      },
      justification: {
        type: 'string',
        description: 'Optional business justification.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          goalNodeId: { type: 'string', required: true },
          goalName: { type: 'string', required: true },
          status: { type: 'string', required: true },
          completenessScore: { type: 'number', required: true },
          populatedSections: { type: 'array', required: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const goalNodeId = args.goal_node_id as string
      const goalName = args.goal_name as string

      if (!goalNodeId || goalNodeId.trim().length === 0) {
        throw new HarnessError('create_goal_blueprint: goal_node_id is required', 'GOAL_NODE_ID_REQUIRED')
      }
      if (!goalName || goalName.trim().length === 0) {
        throw new HarnessError('create_goal_blueprint: goal_name is required', 'GOAL_NAME_REQUIRED')
      }

      const engine = ensureEngine()
      const bp = engine.createBlueprint({
        goalNodeId,
        goalName,
        ...(args.purpose_description !== undefined ? { purposeDescription: args.purpose_description as string } : {}),
        ...(args.justification !== undefined ? { justification: args.justification as string } : {}),
      })

      return Promise.resolve({
        goalNodeId: bp.goalNodeId,
        goalName: bp.goalName,
        status: bp.status,
        completenessScore: bp.completenessScore,
        populatedSections: [...bp.populatedSections],
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { goal_node_id?: string; goal_name?: string }
      return {
        card: 'generic',
        title: `Blueprint: ${input.goal_name ?? input.goal_node_id ?? '?'}`,
        kind: 'other',
        rawInput: 'Creating goal blueprint',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_goal_blueprint
// ---------------------------------------------------------------------------

/**
 * Create the `get_goal_blueprint` tool.
 */
export function createGetGoalBlueprintTool() {
  return defineTool({
    name: 'get_goal_blueprint',
    description:
      'Get the full blueprint for a goal node. Returns all 10 sections '
      + 'and completeness score.',
    parameters: {
      goal_node_id: {
        type: 'string',
        required: true,
        description: 'The goal node ID.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          found: { type: 'boolean', required: true },
          goalNodeId: { type: 'string' },
          goalName: { type: 'string' },
          status: { type: 'string' },
          completenessScore: { type: 'number' },
          populatedSections: { type: 'array' },
          blueprint: { type: 'object', additionalProperties: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const goalNodeId = args.goal_node_id as string
      if (!goalNodeId || goalNodeId.trim().length === 0) {
        throw new HarnessError('get_goal_blueprint: goal_node_id is required', 'GOAL_NODE_ID_REQUIRED')
      }

      const engine = ensureEngine()
      const bp = engine.getBlueprint(goalNodeId)
      if (!bp) {
        return Promise.resolve({ found: false, message: `No blueprint for goal "${goalNodeId}"` })
      }

      return Promise.resolve({
        found: true,
        goalNodeId: bp.goalNodeId,
        goalName: bp.goalName,
        status: bp.status,
        completenessScore: bp.completenessScore,
        populatedSections: [...bp.populatedSections],
        blueprint: {
          purpose: bp.purpose,
          input: bp.input,
          output: bp.output,
          workflow: bp.workflow,
          dependencies: bp.dependencies,
          usedBy: bp.usedBy,
          files: bp.files,
          elements: bp.elements,
          tests: bp.tests,
          completionCriteria: bp.completionCriteria,
        } as Record<string, JsonValue>,
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { goal_node_id?: string }
      return {
        card: 'generic',
        title: `Blueprint: ${input.goal_node_id ?? '?'}`,
        kind: 'other',
        rawInput: 'Getting goal blueprint',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: update_blueprint_section
// ---------------------------------------------------------------------------

/**
 * Create the `update_blueprint_section` tool.
 */
export function createUpdateBlueprintSectionTool() {
  return defineTool({
    name: 'update_blueprint_section',
    description:
      'Update a specific section of a goal blueprint. Sections: '
      + SECTION_ORDER.join(', ') + '. '
      + 'Pass the full section data object — it replaces the existing section content.',
    parameters: {
      goal_node_id: {
        type: 'string',
        required: true,
        description: 'The goal node ID.',
      },
      section: {
        type: 'string',
        required: true,
        enum: SECTION_ORDER as readonly string[],
        description: 'The section to update.',
      },
      data: {
        type: 'object',
        additionalProperties: true,
        description: 'Section data object (shape must match the section type).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          goalNodeId: { type: 'string', required: true },
          section: { type: 'string', required: true },
          completenessScore: { type: 'number', required: true },
          populatedSections: { type: 'array', required: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const goalNodeId = args.goal_node_id as string
      const section = args.section as string
      const data = args.data as Record<string, unknown>

      if (!goalNodeId || goalNodeId.trim().length === 0) {
        throw new HarnessError('update_blueprint_section: goal_node_id is required', 'GOAL_NODE_ID_REQUIRED')
      }
      if (!section || section.trim().length === 0) {
        throw new HarnessError('update_blueprint_section: section is required', 'SECTION_REQUIRED')
      }
      if (!SECTION_ORDER.includes(section as BlueprintSectionKey)) {
        throw new HarnessError(
          `update_blueprint_section: unknown section "${section}". Valid: ${SECTION_ORDER.join(', ')}`,
          'UNKNOWN_SECTION',
        )
      }
      if (!data) {
        throw new HarnessError('update_blueprint_section: data is required', 'DATA_REQUIRED')
      }

      const engine = ensureEngine()
      const bp = engine.updateSection({
        goalNodeId,
        section: section as BlueprintSectionKey,
        data,
      })

      return Promise.resolve({
        goalNodeId: bp.goalNodeId,
        section,
        completenessScore: bp.completenessScore,
        populatedSections: [...bp.populatedSections],
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { goal_node_id?: string; section?: string }
      return {
        card: 'generic',
        title: `Blueprint ${input.section ?? '?'}: ${input.goal_node_id ?? '?'}`,
        kind: 'other',
        rawInput: 'Updating blueprint section',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: validate_blueprints
// ---------------------------------------------------------------------------

/**
 * Create the `validate_blueprints` tool.
 */
export function createValidateBlueprintsTool() {
  return defineTool({
    name: 'validate_blueprints',
    description:
      'Validate completeness of all goal blueprints or a specific one. '
      + 'Returns missing sections and completeness scores.',
    parameters: {
      goal_node_id: {
        type: 'string',
        description: 'Specific goal to validate (omit for all).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          total: { type: 'number', required: true },
          results: { type: 'array', required: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const engine = ensureEngine()
      const goalNodeId = args.goal_node_id as string | undefined

      if (goalNodeId) {
        const bp = engine.getBlueprint(goalNodeId)
        if (!bp) {
          return Promise.resolve({
            total: 0,
            results: [],
            message: `No blueprint for goal "${goalNodeId}"`,
          })
        }
        const missing = SECTION_ORDER.filter(s => !bp.populatedSections.includes(s))
        return Promise.resolve({
          total: 1,
          results: [{
            goalNodeId: bp.goalNodeId,
            goalName: bp.goalName,
            completenessScore: bp.completenessScore,
            missingSections: [...missing],
          }],
        })
      }

      const results = engine.validateCompleteness()
      return Promise.resolve({ total: results.length, results: results.map(r => ({ ...r, missingSections: [...r.missingSections] })) })
    },
    presentCall(): GenericCallView {
      return {
        card: 'generic',
        title: 'Validate Blueprints',
        kind: 'other',
        rawInput: 'Validating blueprint completeness',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_blueprint_report
// ---------------------------------------------------------------------------

/**
 * Create the `get_blueprint_report` tool.
 */
export function createBlueprintReportTool() {
  return defineTool({
    name: 'get_blueprint_report',
    description:
      'Generate a comprehensive markdown report of all goal blueprints '
      + 'or a specific one.',
    parameters: {
      goal_node_id: {
        type: 'string',
        description: 'Specific goal to report on (omit for all).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          report: { type: 'string', required: true },
          blueprintCount: { type: 'number', required: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: (value as { report: string }).report,
      }],
    },
    execute(args) {
      const engine = ensureEngine()
      const goalNodeId = args.goal_node_id as string | undefined
      const report = engine.toMarkdown(goalNodeId)
      const count = goalNodeId ? 1 : engine.getBlueprints().length

      return Promise.resolve({ report, blueprintCount: count })
    },
    presentCall(): GenericCallView {
      return {
        card: 'generic',
        title: 'Blueprint Report',
        kind: 'other',
        rawInput: 'Generating report',
      }
    },
  })
}
