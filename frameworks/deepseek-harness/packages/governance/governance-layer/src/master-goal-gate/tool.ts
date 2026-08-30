/**
 * `resolve_master_goal` tool: accepts a high-level objective and module
 * definitions, decomposes them into a dependency-aware hierarchy, and
 * returns the full breakdown with active/locked module status.
 *
 * @module @deepseek-ai/dsh-governance-layer/master-goal-gate/tool
 */

import { HarnessError } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { MasterGoalEngine } from './engine.ts'
import { formatModuleStatus } from './status.ts'
import type { GoalDecompositionInput, MasterGoalBreakdown } from './types.ts'

/** Shared engine instance (stateless — all state in the breakdown). */
const engine = new MasterGoalEngine()

/** Canonical output schema for the resolve_master_goal tool. */
const RESOLVE_MASTER_GOAL_OUTPUT = {
  schema: {
    type: 'object' as const,
    additionalProperties: false as const,
    properties: {
      breakdown: {
        type: 'object' as const,
        additionalProperties: false as const,
        properties: {
          objective: { type: 'string' as const, required: true as const },
          goalId: { type: 'string' as const, required: true as const },
          domains: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              additionalProperties: false as const,
              properties: {
                name: { type: 'string' as const, required: true as const },
                moduleIds: { type: 'array' as const, items: { type: 'string' as const }, required: true as const },
              },
            },
            required: true as const,
          },
          moduleMap: {
            type: 'object' as const,
            additionalProperties: true as const,
            required: true as const,
          },
          topologicalOrder: { type: 'array' as const, items: { type: 'string' as const }, required: true as const },
          criticalPath: { type: 'array' as const, items: { type: 'string' as const } },
          activeModules: { type: 'array' as const, items: { type: 'string' as const }, required: true as const },
          lockedModules: { type: 'array' as const, items: { type: 'string' as const }, required: true as const },
          decomposedAt: { type: 'string' as const, required: true as const },
        },
      },
      statusText: { type: 'string' as const },
    },
  },
  render: (_args: unknown, value: unknown) => [{
    type: 'text' as const,
    text: JSON.stringify(value, null, 2),
  }],
}

/** Generic pending presentation for the tool. */
function presentCall(args: unknown): GenericCallView {
  const input = args as { objective?: string; modules?: unknown[] }
  return {
    card: 'generic',
    title: `Master Goal: ${input.objective ?? '?'}`,
    kind: 'other',
    rawInput: `${input.modules?.length ?? 0} modules`,
  }
}

/**
 * Create the `resolve_master_goal` tool definition.
 *
 * The tool accepts:
 * - `objective`: The high-level goal text.
 * - `goalId`: Optional goal identifier.
 * - `modules`: Array of module definitions with id, name, domain, and dependsOn.
 *
 * Returns the full breakdown with active/locked module status and
 * a formatted status text for the prompt.
 */
export function createResolveMasterGoalTool() {
  return defineTool({
    name: 'resolve_master_goal',
    description:
      'Decompose a high-level goal into product domains, modules, and dependencies. '
      + 'Returns the full hierarchy with ACTIVE/LOCKED status for each module. '
      + 'Modules with all dependencies satisfied are ACTIVE. '
      + 'Modules with unsatisfied dependencies are LOCKED. '
      + 'Use this to understand what can be built NOW vs what must WAIT.',
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
      modules: {
        type: 'array',
        required: true,
        description: 'Module definitions with id, name, domain, and optional dependsOn array.',
        items: {
          type: 'object',
          additionalProperties: true,
          properties: {
            id: { type: 'string', description: 'Unique module identifier.' },
            name: { type: 'string', description: 'Human-readable module name.' },
            domain: { type: 'string', description: 'Product domain this module belongs to.' },
            depends_on: { type: 'array', items: { type: 'string' }, description: 'Module ids this depends on.' },
            priority: { type: 'number', description: 'Critical-path weight (default 1).' },
          },
        },
      },
      completed: {
        type: 'array',
        description: 'Module ids already completed (affects lock resolution).',
        items: { type: 'string' },
      },
      skipped: {
        type: 'array',
        description: 'Module ids intentionally skipped.',
        items: { type: 'string' },
      },
    },
    output: RESOLVE_MASTER_GOAL_OUTPUT,
    execute(args) {
      const objective = args.objective as string
      const goalId = args.goal_id as string | undefined
      const rawModules = args.modules as Array<{
        id: string
        name: string
        domain: string
        depends_on?: string[]
        priority?: number
      }>
      const completed = new Set<string>(
        Array.isArray(args.completed) ? args.completed as string[] : [],
      )
      const skipped = new Set<string>(
        Array.isArray(args.skipped) ? args.skipped as string[] : [],
      )

      // Normalize module input: convert depends_on → dependsOn.
      const modules: GoalDecompositionInput['modules'] = rawModules.map(m => ({
        id: m.id,
        name: m.name,
        domain: m.domain,
        dependsOn: m.depends_on ?? [],
        ...(m.priority !== undefined ? { priority: m.priority } : {}),
      }))

      // Validate input before decomposition.
      if (!objective || objective.trim().length === 0) {
        throw new HarnessError(
          'resolve_master_goal: objective is required',
          'MASTER_GOAL_OBJECTIVE_REQUIRED',
        )
      }
      if (modules.length === 0) {
        throw new HarnessError(
          'resolve_master_goal: at least one module is required',
          'MASTER_GOAL_MODULES_REQUIRED',
        )
      }

      // Validate no module id is in both completed and skipped.
      for (const id of completed) {
        if (skipped.has(id)) {
          throw new HarnessError(
            `resolve_master_goal: module "${id}" cannot be both completed and skipped`,
            'MASTER_GOAL_CONFLICTING_STATUS',
          )
        }
      }

      let breakdown: MasterGoalBreakdown
      try {
        breakdown = engine.decompose(
          { objective, ...(goalId !== undefined ? { goalId } : {}), modules },
          completed,
          skipped,
        )
      } catch (error) {
        if (error instanceof Error) {
          throw new HarnessError(
            `resolve_master_goal: ${error.message}`,
            'MASTER_GOAL_DECOMPOSITION_FAILED',
          )
        }
        throw error
      }

      const statusText = formatModuleStatus(breakdown)

      return Promise.resolve({
        breakdown: {
          objective: breakdown.objective,
          goalId: breakdown.goalId,
          domains: breakdown.domains,
          moduleMap: breakdown.moduleMap,
          topologicalOrder: breakdown.topologicalOrder,
          criticalPath: breakdown.criticalPath,
          activeModules: breakdown.activeModules,
          lockedModules: breakdown.lockedModules,
          decomposedAt: breakdown.decomposedAt,
        },
        statusText,
      })
    },
    presentCall,
  })
}

// Re-export for direct import.
export { MasterGoalEngine } from './engine.ts'
export { formatModuleStatus, getModuleStatusText } from './status.ts'
export type {
  GoalDecompositionInput,
  ModuleInput,
  MasterGoalBreakdown,
  ModuleDescriptor,
  ProductDomain,
  DependencyGraph,
  ModuleStatus,
  ModuleStatusText,
} from './types.ts'
