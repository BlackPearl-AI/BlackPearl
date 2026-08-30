/**
 * Types for the Master Module Deep Analysis Engine (PHASE 06).
 *
 * Provides comprehensive 16-dimension analysis of each master module:
 * Data, Fields, IDs, Validation, Database, API, UI, Buttons, Dropdowns,
 * Settings, Permissions, Print, Workflow, Dependencies, Tests, Completeness.
 *
 * Each dimension can be independently analyzed, queried, and scored.
 * The engine tracks what is known and what is missing.
 *
 * @module @deepseek-ai/dsh-governance-layer/deep-analysis/types
 */

// ---------------------------------------------------------------------------
// 16 Analysis Dimensions
// ---------------------------------------------------------------------------

/** The 16 analysis dimensions for a master module. */
export type AnalysisDimension =
  | 'data'
  | 'fields'
  | 'ids'
  | 'validation'
  | 'database'
  | 'api'
  | 'ui'
  | 'buttons'
  | 'dropdowns'
  | 'settings'
  | 'permissions'
  | 'print'
  | 'workflow'
  | 'dependencies'
  | 'tests'
  | 'completeness'

/** All dimensions in canonical order. */
export const DIMENSION_ORDER: readonly AnalysisDimension[] = [
  'data', 'fields', 'ids', 'validation', 'database',
  'api', 'ui', 'buttons', 'dropdowns', 'settings',
  'permissions', 'print', 'workflow', 'dependencies',
  'tests', 'completeness',
]

/** Human-readable labels for each dimension. */
export const DIMENSION_LABELS: Record<AnalysisDimension, string> = {
  data: 'Data Model',
  fields: 'Field Definitions',
  ids: 'IDs & Keys',
  validation: 'Validation Rules',
  database: 'Database Schema',
  api: 'API Endpoints',
  ui: 'UI Components',
  buttons: 'Buttons & Actions',
  dropdowns: 'Dropdowns & Enums',
  settings: 'Settings & Config',
  permissions: 'Permissions & Access',
  print: 'Print & PDF',
  workflow: 'Workflows & Status',
  dependencies: 'Dependencies',
  tests: 'Tests & Coverage',
  completeness: 'Completeness Score',
}

/** Icons for each dimension. */
export const DIMENSION_ICONS: Record<AnalysisDimension, string> = {
  data: '📊',
  fields: '📝',
  ids: '🔑',
  validation: '✅',
  database: '🗄️',
  api: '🌐',
  ui: '🖼️',
  buttons: '🔘',
  dropdowns: '📋',
  settings: '⚙️',
  permissions: '🔐',
  print: '🖨️',
  workflow: '🔄',
  dependencies: '🔗',
  tests: '🧪',
  completeness: '📈',
}

// ---------------------------------------------------------------------------
// Finding Severity
// ---------------------------------------------------------------------------

/** Severity of an analysis finding. */
export type FindingSeverity = 'info' | 'warning' | 'error' | 'critical'

/** Human-readable severity labels. */
export const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  info: 'Information',
  warning: 'Warning',
  error: 'Error',
  critical: 'Critical',
}

/** Severity icons. */
export const SEVERITY_ICONS: Record<FindingSeverity, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  critical: '🚨',
}

// ---------------------------------------------------------------------------
// Completeness Status
// ---------------------------------------------------------------------------

/** Analysis completeness status. */
export type AnalysisStatus = 'not-analyzed' | 'partial' | 'complete'

/** Status labels. */
export const STATUS_LABELS: Record<AnalysisStatus, string> = {
  'not-analyzed': 'Not Analyzed',
  partial: 'Partially Analyzed',
  complete: 'Fully Analyzed',
}

// ---------------------------------------------------------------------------
// Finding
// ---------------------------------------------------------------------------

/**
 * A single finding from the analysis.
 */
export interface AnalysisFinding {
  /** Dimension where the finding was found. */
  readonly dimension: AnalysisDimension
  /** Severity. */
  readonly severity: FindingSeverity
  /** Short title. */
  readonly title: string
  /** Detailed description. */
  readonly description: string
  /** Related field name (if applicable). */
  readonly field?: string
  /** Suggested fix. */
  readonly suggestion?: string
}

// ---------------------------------------------------------------------------
// Dimension-Specific Analysis Interfaces
// ---------------------------------------------------------------------------

/** Field-level analysis detail. */
export interface FieldAnalysis {
  readonly name: string
  readonly displayName: string
  readonly type: string
  readonly required: boolean
  readonly unique: boolean
  readonly isPrimaryKey: boolean
  readonly hasValidation: boolean
  readonly hasDefault: boolean
  readonly hasIndex: boolean
  readonly hasForeignKey: boolean
  readonly validationRules: readonly ValidationRule[]
  readonly notes: string
}

/** A validation rule. */
export interface ValidationRule {
  readonly field: string
  readonly rule: string
  readonly type: 'required' | 'unique' | 'pattern' | 'range' | 'length' | 'enum' | 'cross-field' | 'custom'
  readonly parameters?: string
  readonly errorMessage: string
}

/** API endpoint definition. */
export interface APIEndpoint {
  readonly method: string
  readonly path: string
  readonly description: string
  readonly parameters: readonly string[]
  readonly responseFields: readonly string[]
  readonly authRequired: boolean
  readonly rateLimit?: string
}

/** UI component definition. */
export interface UIComponent {
  readonly type: 'form' | 'list' | 'detail' | 'modal' | 'card' | 'page' | 'sidebar' | 'tab'
  readonly name: string
  readonly description: string
  readonly fields: readonly string[]
  readonly actions: readonly string[]
  readonly responsive: boolean
}

/** Button definition. */
export interface ButtonDefinition {
  readonly label: string
  readonly action: string
  readonly context: 'list' | 'detail' | 'form' | 'global'
  readonly requiresConfirmation: boolean
  readonly permissions: readonly string[]
  readonly enabled: boolean
}

/** Dropdown option. */
export interface DropdownOption {
  readonly value: string
  readonly label: string
  readonly enabled: boolean
  readonly sortOrder: number
}

/** Dropdown definition. */
export interface DropdownDefinition {
  readonly field: string
  readonly options: readonly DropdownOption[]
  readonly allowCustom: boolean
  readonly searchable: boolean
}

/** Setting definition. */
export interface SettingDefinition {
  readonly key: string
  readonly label: string
  readonly type: 'string' | 'number' | 'boolean' | 'enum' | 'json'
  readonly defaultValue: string
  readonly description: string
  readonly scope: 'module' | 'global' | 'per-user'
  readonly required: boolean
  readonly dependsOn?: string
}

/** Permission definition. */
export interface PermissionDefinition {
  readonly role: string
  readonly actions: readonly string[]
  readonly fields: readonly string[]
  readonly conditions: readonly string[]
}

/** Print template definition. */
export interface PrintTemplate {
  readonly name: string
  readonly format: 'pdf' | 'html' | 'csv'
  readonly description: string
  readonly fields: readonly string[]
  readonly header: string
  readonly footer: string
  readonly orientation: 'portrait' | 'landscape'
}

/** Workflow step definition. */
export interface WorkflowStep {
  readonly name: string
  readonly fromStatus: string
  readonly toStatus: string
  readonly requiredRole: string
  readonly description: string
  readonly notifications: readonly string[]
}

/** Dependency reference. */
export interface DependencyReference {
  readonly targetModule: string
  readonly targetEntity: string
  readonly type: 'field-reference' | 'api-call' | 'shared-component' | 'workflow-trigger'
  readonly description: string
  readonly required: boolean
}

/** Test coverage info. */
export interface TestCoverage {
  readonly totalTests: number
  readonly passingTests: number
  readonly failingTests: number
  readonly coveragePercent: number
  readonly untestedFields: readonly string[]
  readonly untestedScenarios: readonly string[]
}

// ---------------------------------------------------------------------------
// Dimension Analysis (per-dimension data)
// ---------------------------------------------------------------------------

/** Data dimension analysis. */
export interface DataAnalysis {
  readonly entityCount: number
  readonly totalFields: number
  readonly requiredFields: number
  readonly optionalFields: number
  readonly computedFields: number
  readonly referenceFields: number
  readonly notes: string
}

/** Fields dimension analysis. */
export interface FieldsAnalysis {
  readonly fields: readonly FieldAnalysis[]
  readonly totalWithValidation: number
  readonly totalWithDefaults: number
  readonly totalIndexed: number
  readonly totalForeignKeys: number
}

/** IDs dimension analysis. */
export interface IdsAnalysis {
  readonly primaryKey: string
  readonly secondaryKeys: readonly string[]
  readonly foreignKeys: readonly { field: string; references: string }[]
  readonly compositeKeys: readonly string[]
  readonly autoIncrement: boolean
}

/** Validation dimension analysis. */
export interface ValidationAnalysis {
  readonly rules: readonly ValidationRule[]
  readonly totalRules: number
  readonly fieldsWithValidation: number
  readonly crossFieldRules: number
  readonly customRules: number
}

/** Database dimension analysis. */
export interface DatabaseAnalysis {
  readonly tableName?: string
  readonly hasAutoIncrement: boolean
  readonly hasSoftDelete: boolean
  readonly hasTimestamps: boolean
  readonly indexes: readonly string[]
  readonly uniqueConstraints: readonly string[]
  readonly foreignKeyConstraints: readonly { field: string; references: string }[]
  readonly estimatedRows?: string
}

/** API dimension analysis. */
export interface APIAnalysis {
  readonly endpoints: readonly APIEndpoint[]
  readonly hasCreate: boolean
  readonly hasRead: boolean
  readonly hasUpdate: boolean
  readonly hasDelete: boolean
  readonly hasSearch: boolean
  readonly hasBatch: boolean
}

/** UI dimension analysis. */
export interface UIAnalysis {
  readonly components: readonly UIComponent[]
  readonly hasForm: boolean
  readonly hasList: boolean
  readonly hasDetail: boolean
  readonly hasSearch: boolean
  readonly hasFilters: boolean
  readonly hasPagination: boolean
}

/** Buttons dimension analysis. */
export interface ButtonsAnalysis {
  readonly buttons: readonly ButtonDefinition[]
  readonly totalButtons: number
  readonly destructiveButtons: number
  readonly confirmationRequired: number
}

/** Dropdowns dimension analysis. */
export interface DropdownsAnalysis {
  readonly dropdowns: readonly DropdownDefinition[]
  readonly totalDropdowns: number
  readonly totalOptions: number
  readonly allowCustomCount: number
}

/** Settings dimension analysis. */
export interface SettingsAnalysis {
  readonly settings: readonly SettingDefinition[]
  readonly totalSettings: number
  readonly globalSettings: number
  readonly moduleSettings: number
  readonly perUserSettings: number
}

/** Permissions dimension analysis. */
export interface PermissionsAnalysis {
  readonly permissions: readonly PermissionDefinition[]
  readonly roles: readonly string[]
  readonly totalPermissions: number
  readonly hasAdminOnly: boolean
  readonly hasReadOnly: boolean
}

/** Print dimension analysis. */
export interface PrintAnalysis {
  readonly templates: readonly PrintTemplate[]
  readonly totalTemplates: number
  readonly pdfTemplates: number
  readonly htmlTemplates: number
}

/** Workflow dimension analysis. */
export interface WorkflowAnalysis {
  readonly steps: readonly WorkflowStep[]
  readonly statuses: readonly string[]
  readonly totalTransitions: number
  readonly hasApprovalChain: boolean
  readonly hasNotifications: boolean
}

/** Dependencies dimension analysis. */
export interface DependenciesAnalysis {
  readonly references: readonly DependencyReference[]
  readonly incomingDependencies: number
  readonly outgoingDependencies: number
  readonly sharedComponents: readonly string[]
}

/** Tests dimension analysis. */
export interface TestsAnalysis {
  readonly coverage: TestCoverage
  readonly hasUnitTests: boolean
  readonly hasIntegrationTests: boolean
  readonly hasEdgeCaseTests: boolean
  readonly missingScenarios: readonly string[]
}

/** Completeness dimension analysis. */
export interface CompletenessAnalysis {
  readonly overallScore: number
  readonly dimensionScores: Readonly<Record<AnalysisDimension, number>>
  readonly analyzedDimensions: readonly AnalysisDimension[]
  readonly missingDimensions: readonly AnalysisDimension[]
  readonly criticalGaps: readonly string[]
}

// ---------------------------------------------------------------------------
// Full Dimension Analysis Record
// ---------------------------------------------------------------------------

/**
 * Complete analysis of a module across all 16 dimensions.
 */
export interface ModuleDimensionAnalysis {
  /** Module ID. */
  readonly moduleId: string
  /** Module name. */
  readonly moduleName: string
  /** When this analysis was performed. */
  readonly analyzedAt: string
  /** Analysis notes. */
  readonly notes: string
  /** Overall status. */
  readonly status: AnalysisStatus

  // Per-dimension data (optional — only populated when analyzed).
  readonly data?: DataAnalysis
  readonly fields?: FieldsAnalysis
  readonly ids?: IdsAnalysis
  readonly validation?: ValidationAnalysis
  readonly database?: DatabaseAnalysis
  readonly api?: APIAnalysis
  readonly ui?: UIAnalysis
  readonly buttons?: ButtonsAnalysis
  readonly dropdowns?: DropdownsAnalysis
  readonly settings?: SettingsAnalysis
  readonly permissions?: PermissionsAnalysis
  readonly print?: PrintAnalysis
  readonly workflow?: WorkflowAnalysis
  readonly dependencies?: DependenciesAnalysis
  readonly tests?: TestsAnalysis
  readonly completeness?: CompletenessAnalysis

  /** All findings across all dimensions. */
  readonly findings: readonly AnalysisFinding[]
}

// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------

/** Input to register or update a module analysis. */
export interface DeepAnalysisInput {
  /** Module ID. */
  readonly moduleId: string
  /** Analysis notes. */
  readonly notes?: string
}

/** Register a data dimension analysis. */
export interface RegisterDataAnalysisInput {
  readonly moduleId: string
  readonly entityCount: number
  readonly totalFields: number
  readonly requiredFields: number
  readonly optionalFields: number
  readonly computedFields: number
  readonly referenceFields: number
  readonly notes?: string
}

/** Register a fields dimension analysis. */
export interface RegisterFieldsAnalysisInput {
  readonly moduleId: string
  readonly fields: readonly FieldAnalysis[]
  readonly notes?: string
}

/** Register an IDs dimension analysis. */
export interface RegisterIdsAnalysisInput {
  readonly moduleId: string
  readonly primaryKey: string
  readonly secondaryKeys?: readonly string[]
  readonly foreignKeys?: readonly { field: string; references: string }[]
  readonly compositeKeys?: readonly string[]
  readonly autoIncrement?: boolean
  readonly notes?: string
}

/** Register a validation dimension analysis. */
export interface RegisterValidationAnalysisInput {
  readonly moduleId: string
  readonly rules: readonly ValidationRule[]
  readonly notes?: string
}

/** Register a database dimension analysis. */
export interface RegisterDatabaseAnalysisInput {
  readonly moduleId: string
  readonly tableName?: string
  readonly hasAutoIncrement?: boolean
  readonly hasSoftDelete?: boolean
  readonly hasTimestamps?: boolean
  readonly indexes?: readonly string[]
  readonly uniqueConstraints?: readonly string[]
  readonly foreignKeyConstraints?: readonly { field: string; references: string }[]
  readonly notes?: string
}

/** Register an API dimension analysis. */
export interface RegisterAPIAnalysisInput {
  readonly moduleId: string
  readonly endpoints: readonly APIEndpoint[]
  readonly notes?: string
}

/** Register a UI dimension analysis. */
export interface RegisterUIAnalysisInput {
  readonly moduleId: string
  readonly components: readonly UIComponent[]
  readonly notes?: string
}

/** Register a buttons dimension analysis. */
export interface RegisterButtonsAnalysisInput {
  readonly moduleId: string
  readonly buttons: readonly ButtonDefinition[]
  readonly notes?: string
}

/** Register a dropdowns dimension analysis. */
export interface RegisterDropdownsAnalysisInput {
  readonly moduleId: string
  readonly dropdowns: readonly DropdownDefinition[]
  readonly notes?: string
}

/** Register a settings dimension analysis. */
export interface RegisterSettingsAnalysisInput {
  readonly moduleId: string
  readonly settings: readonly SettingDefinition[]
  readonly notes?: string
}

/** Register a permissions dimension analysis. */
export interface RegisterPermissionsAnalysisInput {
  readonly moduleId: string
  readonly permissions: readonly PermissionDefinition[]
  readonly notes?: string
}

/** Register a print dimension analysis. */
export interface RegisterPrintAnalysisInput {
  readonly moduleId: string
  readonly templates: readonly PrintTemplate[]
  readonly notes?: string
}

/** Register a workflow dimension analysis. */
export interface RegisterWorkflowAnalysisInput {
  readonly moduleId: string
  readonly steps: readonly WorkflowStep[]
  readonly notes?: string
}

/** Register a dependencies dimension analysis. */
export interface RegisterDependenciesAnalysisInput {
  readonly moduleId: string
  readonly references: readonly DependencyReference[]
  readonly notes?: string
}

/** Register a tests dimension analysis. */
export interface RegisterTestsAnalysisInput {
  readonly moduleId: string
  readonly coverage: TestCoverage
  readonly hasUnitTests?: boolean
  readonly hasIntegrationTests?: boolean
  readonly hasEdgeCaseTests?: boolean
  readonly missingScenarios?: readonly string[]
  readonly notes?: string
}

/** Register a finding for a module. */
export interface RegisterFindingInput {
  readonly moduleId: string
  readonly dimension: AnalysisDimension
  readonly severity: FindingSeverity
  readonly title: string
  readonly description: string
  readonly field?: string
  readonly suggestion?: string
}

// ---------------------------------------------------------------------------
// Query Types
// ---------------------------------------------------------------------------

/** Query analyses by criteria. */
export interface DeepAnalysisQuery {
  readonly moduleId?: string
  readonly dimension?: AnalysisDimension
  readonly minScore?: number
  readonly hasFindings?: boolean
  readonly maxSeverity?: FindingSeverity
}

// ---------------------------------------------------------------------------
// Completeness Score
// ---------------------------------------------------------------------------

/** Computed completeness score for a module. */
export interface CompletenessScore {
  /** Overall score 0–100. */
  readonly overallScore: number
  /** Per-dimension score 0–100. */
  readonly dimensionScores: Readonly<Record<AnalysisDimension, number>>
  /** Number of analyzed dimensions. */
  readonly analyzedCount: number
  /** Number of missing dimensions. */
  readonly missingCount: number
  /** Dimensions with critical findings. */
  readonly criticalDimensions: readonly AnalysisDimension[]
}

// ---------------------------------------------------------------------------
// Deep Analysis Map
// ---------------------------------------------------------------------------

/**
 * Complete deep analysis map: all analyzed modules.
 */
export interface DeepAnalysisMap {
  /** Module analyses keyed by module ID. */
  readonly analyses: Readonly<Record<string, ModuleDimensionAnalysis>>
  /** Cross-module dependency map. */
  readonly crossModuleDependencies: Readonly<Record<string, readonly string[]>>
  /** When the map was created. */
  readonly createdAt: string
  /** When the map was last updated. */
  readonly updatedAt: string
}
