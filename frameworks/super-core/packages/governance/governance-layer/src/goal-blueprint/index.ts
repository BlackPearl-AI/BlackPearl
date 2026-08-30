/**
 * Goal Blueprint — PHASE 07.
 *
 * Each goal in the breakdown tree gets its own structured blueprint
 * covering 10 sections: Purpose, Input, Output, Workflow, Dependencies,
 * Used By, Files, Elements, Tests, Completion Criteria.
 *
 * @module @deepseek-ai/dsh-governance-layer/goal-blueprint
 */

export { GoalBlueprintEngine } from './engine.ts'

export {
  createCreateGoalBlueprintTool,
  createGetGoalBlueprintTool,
  createUpdateBlueprintSectionTool,
  createValidateBlueprintsTool,
  createBlueprintReportTool,
  getActiveEngine,
  resetEngine,
} from './tools.ts'

export {
  SECTION_ORDER,
  SECTION_LABELS,
  SECTION_ICONS,
  BLUEPRINT_STATUS_LABELS,
  BLUEPRINT_STATUS_ICONS,
} from './types.ts'

export type {
  BlueprintSectionKey,
  BlueprintStatus,
  BlueprintItem,
  PurposeSection,
  InputSection,
  OutputSection,
  WorkflowSection,
  BlueprintDependency,
  DependenciesSection,
  UsedBySection,
  FileReference,
  FilesSection,
  ElementReference,
  ElementsSection,
  TestCaseReference,
  TestsSection,
  CompletionCriteriaSection,
  GoalBlueprint,
  GoalBlueprintMap,
  CreateBlueprintInput,
  UpdateBlueprintInput,
  BlueprintQuery,
  BlueprintSummary,
} from './types.ts'
