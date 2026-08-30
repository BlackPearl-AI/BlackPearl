/**
 * Master Goal Gate: hierarchical goal decomposition with dependency
 * graph, topological ordering, cycle detection, critical-path scoring,
 * and module lock resolution.
 *
 * @module @deepseek-ai/dsh-governance-layer/master-goal-gate
 */

export { MasterGoalEngine } from './engine.ts'
export { createResolveMasterGoalTool } from './tool.ts'
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
