/**
 * Master Module Deep Analysis — PHASE 06.
 *
 * Provides comprehensive 16-dimension analysis of each master module:
 * Data, Fields, IDs, Validation, Database, API, UI, Buttons, Dropdowns,
 * Settings, Permissions, Print, Workflow, Dependencies, Tests, Completeness.
 *
 * @module @deepseek-ai/dsh-governance-layer/deep-analysis
 */

export { MasterModuleDeepAnalysisEngine } from './engine.ts'

export {
  createAnalyzeModuleTool,
  createGetAnalysisTool,
  createValidateCompletenessTool,
  createDeepAnalysisReportTool,
  getActiveEngine,
  resetEngine,
} from './tools.ts'

export {
  DIMENSION_ORDER,
  DIMENSION_LABELS,
  DIMENSION_ICONS,
  SEVERITY_LABELS,
  SEVERITY_ICONS,
  STATUS_LABELS,
} from './types.ts'

export type {
  AnalysisDimension,
  AnalysisStatus,
  FindingSeverity,
  AnalysisFinding,
  FieldAnalysis,
  ValidationRule,
  APIEndpoint,
  UIComponent,
  ButtonDefinition,
  DropdownOption,
  DropdownDefinition,
  SettingDefinition,
  PermissionDefinition,
  PrintTemplate,
  WorkflowStep,
  DependencyReference,
  TestCoverage,
  DataAnalysis,
  FieldsAnalysis,
  IdsAnalysis,
  ValidationAnalysis,
  DatabaseAnalysis,
  APIAnalysis,
  UIAnalysis,
  ButtonsAnalysis,
  DropdownsAnalysis,
  SettingsAnalysis,
  PermissionsAnalysis,
  PrintAnalysis,
  WorkflowAnalysis,
  DependenciesAnalysis,
  TestsAnalysis,
  CompletenessAnalysis,
  ModuleDimensionAnalysis,
  CompletenessScore,
  DeepAnalysisMap,
  DeepAnalysisQuery,
  DeepAnalysisInput,
  RegisterDataAnalysisInput,
  RegisterFieldsAnalysisInput,
  RegisterIdsAnalysisInput,
  RegisterValidationAnalysisInput,
  RegisterDatabaseAnalysisInput,
  RegisterAPIAnalysisInput,
  RegisterUIAnalysisInput,
  RegisterButtonsAnalysisInput,
  RegisterDropdownsAnalysisInput,
  RegisterSettingsAnalysisInput,
  RegisterPermissionsAnalysisInput,
  RegisterPrintAnalysisInput,
  RegisterWorkflowAnalysisInput,
  RegisterDependenciesAnalysisInput,
  RegisterTestsAnalysisInput,
  RegisterFindingInput,
} from './types.ts'
