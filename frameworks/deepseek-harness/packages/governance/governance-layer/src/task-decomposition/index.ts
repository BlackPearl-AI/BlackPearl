/**
 * PHASE 12 — Task Decomposition
 *
 * Breaks modules into a 5-level hierarchy:
 *   Goal → Sub-goal → Feature → Element → Microtask
 *
 * Every task is traceable:
 *   CR-ID → Goal-ID → Element-ID → Task-ID → File → Test
 */

export type {
  TaskLevel,
  TaskCategory,
  Effort,
  TaskStatus,
  TaskPriority,
  TraceabilityChain,
  Task,
  TaskIssue,
  TaskSummary,
  TaskTreeNode,
  TaskDecompositionResult,
} from './types.ts'

export { TaskDecompositionEngine } from './engine.ts'

export {
  createCreateTaskTool,
  createDecomposeTaskTool,
  createUpdateTaskStatusTool,
  createValidateTasksTool,
  createGetTaskSummaryTool,
  createGetTaskExecutionOrderTool,
  createGetReadyTasksTool,
  createGetTaskTraceabilityTool,
  createGetTaskTreeTool,
  resetEngine,
  getActiveEngine,
} from './tools.ts'
