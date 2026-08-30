/**
 * MASTER-GOAL: The authoritative product definition.
 *
 * @module @deepseek-ai/dsh-governance-layer/master-goal
 */

export {
  validateDefinition,
  isInScope,
  checkModuleScope,
  computeProgress,
  verifyAgainstGoal,
  summarizeGoal,
} from './engine.ts'

export {
  createCaptureMasterGoalTool,
  createVerifyAgainstGoalTool,
  createGetMasterGoalProgressTool,
  getActiveGoal,
  resetGoal,
} from './tools.ts'

export type {
  MasterGoalDefinition,
  ProductScope,
  ScopeItem,
  AcceptanceCriteria,
  Criterion,
  QualityAttributes,
  MasterGoalProgress,
  ModuleProgressEntry,
  GoalVerificationResult,
} from './types.ts'
