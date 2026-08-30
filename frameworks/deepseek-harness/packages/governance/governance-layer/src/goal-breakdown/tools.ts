/**
 * Goal Breakdown tools.
 *
 * - `add_breakdown_node`: add a node at any level (goal, module, etc.)
 * - `get_breakdown`: view the full tree with stats
 * - `query_breakdown`: query by level, status, tag, or search
 * - `update_node_status`: change a node's status
 *
 * @module @deepseek-ai/dsh-governance-layer/goal-breakdown/tools
 */

import { HarnessError } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView, JsonValue } from '@deepseek-ai/dsh-tools'
import { GoalBreakdownEngine } from './engine.ts'
import { getActiveGoal } from '../master-goal/tools.ts'
import type { BreakdownLevel, NodeStatus } from './types.ts'
import { LEVEL_ORDER } from './types.ts'

/** Active engine instance (per-session). */
let activeEngine: GoalBreakdownEngine | undefined

/** Get the active engine (for other modules to read). */
export function getActiveEngine(): GoalBreakdownEngine | undefined {
  return activeEngine
}

/** Reset the active engine (for testing). */
export function resetEngine(): void {
  activeEngine = undefined
}

// ---------------------------------------------------------------------------
// Tool: add_breakdown_node
// ---------------------------------------------------------------------------

/**
 * Create the `add_breakdown_node` tool.
 *
 * Adds a node to the breakdown tree at any level.
 */
export function createAddBreakdownNodeTool() {
  return defineTool({
    name: 'add_breakdown_node',
    description:
      'Add a node to the goal breakdown tree. '
      + 'The tree has 8 levels: master-goal → goal → module → sub-module → '
      + 'feature → workflow → element → task. Each node must be one level deeper '
      + 'than its parent. The root (master-goal) is created automatically.',
    parameters: {
      level: {
        type: 'string',
        required: true,
        enum: LEVEL_ORDER as readonly string[],
        description: 'The decomposition level.',
      },
      name: {
        type: 'string',
        required: true,
        description: 'Human-readable name for this node.',
      },
      description: {
        type: 'string',
        required: true,
        description: 'Detailed description.',
      },
      parent_id: {
        type: 'string',
        description: 'Parent node ID. Required for all levels except master-goal.',
      },
      priority: {
        type: 'number',
        description: 'Priority 1-5 (default 3).',
      },
      effort: {
        type: 'string',
        enum: ['small', 'medium', 'large'] as const,
        description: 'Estimated effort (default medium).',
      },
      tags: {
        type: 'array',
        description: 'Tags for categorization.',
      },
      dependencies: {
        type: 'array',
        description: 'Node IDs this depends on.',
      },
      acceptance_criteria: {
        type: 'array',
        description: 'Acceptance criteria for this node.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          nodeId: { type: 'string', required: true },
          level: { type: 'string', required: true },
          name: { type: 'string', required: true },
          parentId: { type: 'string' },
          message: { type: 'string', required: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const level = args.level as BreakdownLevel
      const name = args.name as string
      const description = args.description as string

      if (!name || name.trim().length === 0) {
        throw new HarnessError(
          'add_breakdown_node: name is required',
          'BREAKDOWN_NAME_REQUIRED',
        )
      }

      if (!description || description.trim().length === 0) {
        throw new HarnessError(
          'add_breakdown_node: description is required',
          'BREAKDOWN_DESCRIPTION_REQUIRED',
        )
      }

      // Initialize engine if needed.
      if (activeEngine === undefined) {
        const activeGoal = getActiveGoal?.()
        if (activeGoal) {
          activeEngine = new GoalBreakdownEngine(activeGoal.id, activeGoal.identity, activeGoal.description)
        } else {
          activeEngine = new GoalBreakdownEngine('MG-ROOT', 'Master Goal', 'Root of breakdown tree')
        }
      }

      const result = activeEngine.addNode({
        level,
        name,
        description,
        ...(args.parent_id !== undefined ? { parentId: args.parent_id as string } : {}),
        ...(args.priority !== undefined ? { priority: args.priority as number } : {}),
        ...(args.effort !== undefined ? { effort: args.effort as 'small' | 'medium' | 'large' } : {}),
        ...(args.tags !== undefined ? { tags: args.tags as string[] } : {}),
        ...(args.dependencies !== undefined ? { dependencies: args.dependencies as string[] } : {}),
        ...(args.acceptance_criteria !== undefined ? { acceptanceCriteria: args.acceptance_criteria as string[] } : {}),
      })

      return Promise.resolve({
        nodeId: result.node.id,
        level: result.node.level,
        name: result.node.name,
        ...(result.node.parentId !== undefined ? { parentId: result.node.parentId } : {}),
        message: result.message,
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { level?: string; name?: string }
      return {
        card: 'generic',
        title: `Add: ${input.level ?? '?'}`,
        kind: 'other',
        rawInput: input.name ?? '',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_breakdown
// ---------------------------------------------------------------------------

/**
 * Create the `get_breakdown` tool.
 *
 * Returns the full breakdown tree with summary statistics and formatted markdown.
 */
export function createGetBreakdownTool() {
  return defineTool({
    name: 'get_breakdown',
    description:
      'Get the full goal breakdown tree with summary statistics. '
      + 'Shows all nodes, their levels, statuses, and the tree structure.',
    parameters: {
      format: {
        type: 'string',
        enum: ['json', 'markdown'] as const,
        description: 'Output format (default json).',
      },
    },
    output: {
      schema: {
        type: 'object' as const,
        additionalProperties: false as const,
        properties: {
          summary: {
            type: 'object' as const,
            additionalProperties: true as const,
          },
          nodes: { type: 'array' as const, required: true as const },
          markdown: { type: 'string' as const },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const format = args.format as string | undefined

      if (activeEngine === undefined) {
        const emptySummary: Record<string, JsonValue> = { totalNodes: 0, effortScore: 0, criticalPathLength: 0, byLevel: {}, byStatus: {} }
        const result: { nodes: JsonValue[]; summary: Record<string, JsonValue>; markdown?: string } = {
          nodes: [],
          summary: emptySummary,
        }
        if (format === 'markdown') result.markdown = ''
        return Promise.resolve(result)
      }

      const summary = activeEngine.getSummary()
      const traversal = activeEngine.traverseDFS()

      const nodes = traversal.map(({ node, depth }) => ({
          id: node.id,
          level: node.level,
          name: node.name,
          status: node.status,
          depth,
          parentId: node.parentId,
          childrenCount: node.childrenIds.length,
          priority: node.priority,
          effort: node.effort,
        }))

      const result: { nodes: JsonValue[]; summary: Record<string, JsonValue>; markdown?: string } = {
        nodes: nodes as unknown as JsonValue[],
        summary: {
          totalNodes: summary.totalNodes,
          effortScore: summary.effortScore,
          criticalPathLength: summary.criticalPathLength,
          byLevel: summary.byLevel as unknown as Record<string, JsonValue>,
          byStatus: summary.byStatus as unknown as Record<string, JsonValue>,
        },
      }
      if (format === 'markdown') result.markdown = activeEngine.toMarkdown()
      return Promise.resolve(result)
    },
    presentCall(): GenericCallView {
      return {
        card: 'generic',
        title: 'Goal Breakdown Tree',
        kind: 'other',
        rawInput: 'Viewing breakdown',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: query_breakdown
// ---------------------------------------------------------------------------

/**
 * Create the `query_breakdown` tool.
 *
 * Query nodes by level, status, tag, parent, or search.
 */
export function createQueryBreakdownTool() {
  return defineTool({
    name: 'query_breakdown',
    description:
      'Query the goal breakdown tree by level, status, tag, parent, or search. '
      + 'Returns matching nodes with their details.',
    parameters: {
      level: {
        type: 'string',
        enum: LEVEL_ORDER as readonly string[],
        description: 'Filter by decomposition level.',
      },
      status: {
        type: 'string',
        enum: ['pending', 'active', 'completed', 'blocked', 'deferred', 'cancelled'] as const,
        description: 'Filter by status.',
      },
      tag: {
        type: 'string',
        description: 'Filter by tag.',
      },
      parent_id: {
        type: 'string',
        description: 'Filter by parent ID.',
      },
      search: {
        type: 'string',
        description: 'Search name/description.',
      },
      limit: {
        type: 'number',
        description: 'Maximum nodes to return.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          count: { type: 'number', required: true },
          nodes: { type: 'array', required: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      if (activeEngine === undefined) {
        return Promise.resolve({ count: 0, nodes: [] })
      }

      const query: Record<string, unknown> = {}
      if (args.level !== undefined) query.level = args.level
      if (args.status !== undefined) query.status = args.status
      if (args.tag !== undefined) query.tag = args.tag
      if (args.parent_id !== undefined) query.parentId = args.parent_id
      if (args.search !== undefined) query.search = args.search
      if (args.limit !== undefined) query.limit = args.limit

      const results = activeEngine.query(query as Parameters<typeof activeEngine.query>[0])

      return Promise.resolve({
        count: results.length,
        nodes: results.map(n => ({
          id: n.id,
          level: n.level,
          name: n.name,
          status: n.status,
          ...(n.parentId !== undefined ? { parentId: n.parentId } : {}),
          childrenCount: n.childrenIds.length,
          priority: n.priority,
          effort: n.effort,
          tags: [...n.tags],
        })),
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { level?: string; search?: string }
      return {
        card: 'generic',
        title: `Query: ${input.level ?? input.search ?? 'all'}`,
        kind: 'other',
        rawInput: 'Searching breakdown',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: update_node_status
// ---------------------------------------------------------------------------

/**
 * Create the `update_node_status` tool.
 *
 * Change a node's status with validated transitions.
 */
export function createUpdateNodeStatusTool() {
  return defineTool({
    name: 'update_node_status',
    description:
      'Update the status of a breakdown node. '
      + 'Valid transitions are enforced: completed and cancelled are terminal states.',
    parameters: {
      node_id: {
        type: 'string',
        required: true,
        description: 'The node ID to update.',
      },
      status: {
        type: 'string',
        required: true,
        enum: ['pending', 'active', 'completed', 'blocked', 'deferred', 'cancelled'] as const,
        description: 'The new status.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          nodeId: { type: 'string', required: true },
          oldStatus: { type: 'string', required: true },
          newStatus: { type: 'string', required: true },
          name: { type: 'string', required: true },
        },
      } as const,
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      if (activeEngine === undefined) {
        throw new HarnessError(
          'update_node_status: no active breakdown — add a node first',
          'BREAKDOWN_NOT_INITIALIZED',
        )
      }

      const nodeId = args.node_id as string
      const status = args.status as NodeStatus
      const node = activeEngine.getNode(nodeId)
      if (!node) {
        throw new HarnessError(
          `update_node_status: node "${nodeId}" not found`,
          'BREAKDOWN_NODE_NOT_FOUND',
        )
      }

      const oldStatus = node.status
      const updated = activeEngine.updateStatus(nodeId, status)

      return Promise.resolve({
        nodeId: updated.id,
        oldStatus,
        newStatus: updated.status,
        name: updated.name,
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { node_id?: string; status?: string }
      return {
        card: 'generic',
        title: `Status: ${input.node_id ?? '?'}`,
        kind: 'other',
        rawInput: input.status ?? '',
      }
    },
  })
}
