/**
 * G-29 — Token / Context Efficiency Engine: barrel exports.
 *
 * @module @deepseek-ai/dsh-governance-layer/index-navigator
 */

export { IndexNavigatorEngine } from './engine.ts'

export {
  createNavigateIndexesTool,
  createCheckIndexStalenessTool,
  createRepairIndexBoundedTool,
  createDeduplicateContextTool,
  createEstimateContextTokensTool,
  createExpandScopeByDependencyTool,
  createReuseEvidenceTool,
  getActiveEngine,
  resetEngine,
} from './tools.ts'

export type {
  IndexType,
  NavigationStep,
  IndexNavigationPlan,
  StalenessCheckResult,
  BoundedDiscoveryResult,
  DeduplicationResult,
  TokenAccountingReport,
  IndexRepairReport,
  ScopeExpansionResult,
} from './types.ts'
