/**
 * PHASE 12 — Task Decomposition Tools
 *
 * Tools for creating, decomposing, validating, tracing, and querying
 * hierarchical tasks: Goal → Sub-goal → Feature → Element → Microtask.
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { JsonValue } from '@deepseek-ai/dsh-tools'
import { TaskDecompositionEngine } from './engine.ts'

let activeEngine: TaskDecompositionEngine | undefined

function ensureEngine(): TaskDecompositionEngine {
  if (!activeEngine) {
    activeEngine = new TaskDecompositionEngine()
  }
  return activeEngine
}

/** Reset engine (for tests). */
export function resetEngine(): void {
  activeEngine = undefined
}

/** Get active engine (for tests). */
export function getActiveEngine(): TaskDecompositionEngine | undefined {
  return activeEngine
}

// ---------------------------------------------------------------------------
// Tool: create_task
// ---------------------------------------------------------------------------

/**
 * Create the `create_task` tool.
 */
export function createCreateTaskTool() {
  return defineTool({
    name: 'create_task',
    description:
      'Create a new decomposed task for a module. Returns the task with its generated ID.',
    parameters: {
      name: {
        type: 'string',
        required: true,
        description: 'Short task name.',
      },
      description: {
        type: 'string',
        required: true,
        description: 'Detailed description of what needs to be done.',
      },
      module_id: {
        type: 'string',
        required: true,
        description: 'Module this task belongs to.',
      },
      category: {
        type: 'string',
        required: true,
        description: 'Task category: schema, api, ui, test, doc, config, migration, integration, refactor, security, perf, other.',
      },
      level: {
        type: 'string',
        description: 'Hierarchy level: goal, subgoal, feature, element, microtask (default: microtask).',
      },
      parent_task_id: {
        type: 'string',
        description: 'Parent task id for hierarchy.',
      },
      effort: {
        type: 'string',
        description: 'Effort estimate: tiny, small, medium, large, epic (default: medium).',
      },
      priority: {
        type: 'string',
        description: 'Priority: critical, high, medium, low (default: medium).',
      },
      depends_on: {
        type: 'string',
        description: 'Comma-separated task ids this task depends on.',
      },
      goal_ids: {
        type: 'string',
        description: 'Comma-separated goal ids this task satisfies.',
      },
      files: {
        type: 'string',
        description: 'Comma-separated file paths this task creates or modifies.',
      },
      element_ids: {
        type: 'string',
        description: 'Comma-separated element ids this task creates or modifies.',
      },
      cr_id: {
        type: 'string',
        description: 'Conversation Requirement ID for traceability.',
      },
      tags: {
        type: 'string',
        description: 'Comma-separated tags.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          taskId: { type: 'string' },
          name: { type: 'string' },
          moduleId: { type: 'string' },
          level: { type: 'string' },
          category: { type: 'string' },
          effort: { type: 'string' },
          status: { type: 'string' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>
      const task = engine.create({
        name: input.name!,
        description: input.description!,
        moduleId: input.module_id!,
        category: input.category! as never,
        level: input.level as never,
        ...(input.parent_task_id != null ? { parentTaskId: input.parent_task_id } : {}),
        effort: input.effort as never,
        priority: input.priority as never,
        dependsOn: input.depends_on ? input.depends_on.split(',').map(s => s.trim()) : [],
        goalIds: input.goal_ids ? input.goal_ids.split(',').map(s => s.trim()) : [],
        files: input.files ? input.files.split(',').map(s => s.trim()) : [],
        elementIds: input.element_ids ? input.element_ids.split(',').map(s => s.trim()) : [],
        ...(input.cr_id != null ? { traceability: { crId: input.cr_id } } : {}),
        tags: input.tags ? input.tags.split(',').map(s => s.trim()) : [],
      })
      return Promise.resolve({
        taskId: task.id,
        name: task.name,
        moduleId: task.moduleId,
        level: task.level,
        category: task.category,
        effort: task.effort,
        status: task.status,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: decompose_task
// ---------------------------------------------------------------------------

/**
 * Create the `decompose_task` tool.
 */
export function createDecomposeTaskTool() {
  return defineTool({
    name: 'decompose_task',
    description:
      'Decompose a parent task into child tasks. Validates hierarchy: goal→subgoal→feature→element→microtask.',
    parameters: {
      parent_id: {
        type: 'string',
        required: true,
        description: 'Parent task id to decompose.',
      },
      children: {
        type: 'string',
        required: true,
        description: 'JSON array of child tasks: [{name, description, category, level, effort?, priority?}].',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          parentId: { type: 'string' },
          parentLevel: { type: 'string' },
          childCount: { type: 'number' },
          children: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const { parent_id, children: childrenJson } = args as {
        parent_id: string
        children: string
      }
      const children = JSON.parse(childrenJson) as readonly {
        name: string
        description: string
        category: string
        level: string
        effort?: string
        priority?: string
        goal_ids?: string
        files?: string
        element_ids?: string
      }[]
      const created = engine.decompose(
        parent_id,
        children.map(c => ({
          name: c.name,
          description: c.description,
          category: c.category as never,
          level: c.level as never,
          effort: c.effort as never,
          priority: c.priority as never,
          goalIds: c.goal_ids ? c.goal_ids.split(',').map(s => s.trim()) : [],
          files: c.files ? c.files.split(',').map(s => s.trim()) : [],
          elementIds: c.element_ids ? c.element_ids.split(',').map(s => s.trim()) : [],
        })),
      )
      const parent = engine.get(parent_id)!
      return Promise.resolve({
        parentId: parent_id,
        parentLevel: parent.level,
        childCount: created.length,
        children: created.map(c => ({
          id: c.id,
          name: c.name,
          level: c.level,
          category: c.category,
          effort: c.effort,
        })),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: update_task_status
// ---------------------------------------------------------------------------

/**
 * Create the `update_task_status` tool.
 */
export function createUpdateTaskStatusTool() {
  return defineTool({
    name: 'update_task_status',
    description: 'Update the status of a decomposed task.',
    parameters: {
      task_id: {
        type: 'string',
        required: true,
        description: 'Task id to update.',
      },
      status: {
        type: 'string',
        required: true,
        description: 'New status: pending, in-progress, completed, blocked, skipped, cancelled.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          taskId: { type: 'string' },
          oldStatus: { type: 'string' },
          newStatus: { type: 'string' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const { task_id, status } = args as { task_id: string; status: string }
      const task = engine.get(task_id)
      if (!task) throw new Error(`Task '${task_id}' not found`)
      const oldStatus = task.status
      engine.update(task_id, { status: status as never })
      return Promise.resolve({ taskId: task_id, oldStatus, newStatus: status })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: validate_tasks
// ---------------------------------------------------------------------------

/**
 * Create the `validate_tasks` tool.
 */
export function createValidateTasksTool() {
  return defineTool({
    name: 'validate_tasks',
    description: 'Validate the task graph for cycles, missing deps, hierarchy violations, and other issues.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          valid: { type: 'boolean' },
          issueCount: { type: 'number' },
          errors: { type: 'number' },
          warnings: { type: 'number' },
          issues: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute() {
      const engine = ensureEngine()
      const issues = engine.validate()
      return Promise.resolve({
        valid: !issues.some(i => i.severity === 'error'),
        issueCount: issues.length,
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        issues: issues.map(i => ({
          type: i.type,
          severity: i.severity,
          message: i.message,
          involved: [...i.involved],
        })),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_task_summary
// ---------------------------------------------------------------------------

/**
 * Create the `get_task_summary` tool.
 */
export function createGetTaskSummaryTool() {
  return defineTool({
    name: 'get_task_summary',
    description: 'Get summary statistics of all decomposed tasks including hierarchy depth and traceability.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          total: { type: 'number' },
          totalEffortScore: { type: 'number' },
          blockedCount: { type: 'number' },
          hierarchyDepth: { type: 'number' },
          traceableCount: { type: 'number' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute() {
      const engine = ensureEngine()
      return Promise.resolve(engine.summary())
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_task_execution_order
// ---------------------------------------------------------------------------

/**
 * Create the `get_task_execution_order` tool.
 */
export function createGetTaskExecutionOrderTool() {
  return defineTool({
    name: 'get_task_execution_order',
    description: 'Get the topological execution order of all tasks.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          order: { type: 'array' },
          taskCount: { type: 'number' },
          valid: { type: 'boolean' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute() {
      const engine = ensureEngine()
      try {
        const order = engine.topologicalOrder()
        return Promise.resolve({ order, taskCount: order.length, valid: true })
      } catch {
        return Promise.resolve({
          order: engine.getAll().map(t => t.id),
          taskCount: engine.count,
          valid: false,
        })
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_ready_tasks
// ---------------------------------------------------------------------------

/**
 * Create the `get_ready_tasks` tool.
 */
export function createGetReadyTasksTool() {
  return defineTool({
    name: 'get_ready_tasks',
    description:
      'Get tasks that are ready to execute — all dependencies are completed.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          readyCount: { type: 'number' },
          tasks: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute() {
      const engine = ensureEngine()
      const ready = engine.getReadyTasks()
      return Promise.resolve({
        readyCount: ready.length,
        tasks: ready.map(t => ({
          id: t.id,
          name: t.name,
          level: t.level,
          category: t.category,
          effort: t.effort,
          priority: t.priority,
        })),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_task_traceability
// ---------------------------------------------------------------------------

/**
 * Create the `get_task_traceability` tool.
 */
export function createGetTaskTraceabilityTool() {
  return defineTool({
    name: 'get_task_traceability',
    description:
      'Get the full traceability chain for a task: CR-ID → Goal-ID → Element-ID → Task-ID → File → Test.',
    parameters: {
      task_id: {
        type: 'string',
        required: true,
        description: 'Task id to trace.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          taskId: { type: 'string' },
          crId: { type: 'string' },
          goalId: { type: 'string' },
          elementId: { type: 'string' },
          fileIds: { type: 'array' },
          testFileIds: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const { task_id } = args as { task_id: string }
      const chain = engine.getTraceabilityChain(task_id)
      return Promise.resolve({
        ...(chain.goalId !== undefined ? { goalId: chain.goalId } : {}),
        ...(chain.crId !== undefined ? { crId: chain.crId } : {}),
        ...(chain.elementId !== undefined ? { elementId: chain.elementId } : {}),
        ...(chain.taskId !== undefined ? { taskId: chain.taskId } : {}),
        ...(chain.fileIds !== undefined ? { fileIds: [...chain.fileIds] } : {}),
        ...(chain.testFileIds !== undefined ? { testFileIds: [...chain.testFileIds] } : {}),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_task_tree
// ---------------------------------------------------------------------------

/**
 * Create the `get_task_tree` tool.
 */
export function createGetTaskTreeTool() {
  return defineTool({
    name: 'get_task_tree',
    description:
      'Get the hierarchical task tree: Goal → Sub-goal → Feature → Element → Microtask.',
    parameters: {
      root_id: {
        type: 'string',
        description: 'Root task id. If omitted, returns all root trees.',
      },
      module_id: {
        type: 'string',
        description: 'Module id to filter by.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          trees: { type: 'array' },
          taskCount: { type: 'number' },
          depth: { type: 'number' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const { root_id, module_id } = args as { root_id?: string; module_id?: string }

      if (root_id) {
        const tree = engine.getTaskTree(root_id)
        if (!tree) throw new Error(`Task '${root_id}' not found`)
        return Promise.resolve({ trees: [{ ...tree } as unknown as JsonValue], taskCount: engine.count, depth: engine.summary().hierarchyDepth })
      }

      return Promise.resolve({
        trees: [...engine.getFullTree(module_id)] as unknown as JsonValue[],
        taskCount: engine.count,
        depth: engine.summary().hierarchyDepth,
      })
    },
  })
}
