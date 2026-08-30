/**
 * Goal Breakdown Engine — PHASE 04.
 *
 * 8-level hierarchical decomposition:
 *   MASTER GOAL → GOAL → MODULE → SUB-MODULE → FEATURE → WORKFLOW → ELEMENT → TASK
 *
 * @module @deepseek-ai/dsh-governance-layer/goal-breakdown
 */

export { GoalBreakdownEngine } from './engine.ts'

export {
  createAddBreakdownNodeTool,
  createGetBreakdownTool,
  createQueryBreakdownTool,
  createUpdateNodeStatusTool,
  getActiveEngine,
  resetEngine,
} from './tools.ts'

export type {
  BreakdownLevel,
  NodeStatus,
  BreakdownNode,
  BreakdownTree,
  AddNodeInput,
  AddNodeResult,
  BreakdownQuery,
  BreakdownSummary,
  DepthNode,
} from './types.ts'

export {
  LEVEL_ORDER,
  LEVEL_LABELS,
  LEVEL_ICONS,
  STATUS_LABELS,
} from './types.ts'
