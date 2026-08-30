/**
 * Types for the Goal Blueprint Engine (PHASE 07).
 *
 * Each goal in the breakdown tree gets its own blueprint — a structured
 * specification document covering 10 sections:
 *   Purpose, Input, Output, Workflow, Dependencies, Used By,
 *   Files, Elements, Tests, Completion Criteria.
 *
 * The engine tracks blueprints per goal node, validates completeness,
 * and generates markdown summaries.
 *
 * @module @deepseek-ai/dsh-governance-layer/goal-blueprint/types
 */

// ---------------------------------------------------------------------------
// Blueprint Section Keys
// ---------------------------------------------------------------------------

/** The 10 blueprint section identifiers. */
export type BlueprintSectionKey =
  | 'purpose'
  | 'input'
  | 'output'
  | 'workflow'
  | 'dependencies'
  | 'usedBy'
  | 'files'
  | 'elements'
  | 'tests'
  | 'completionCriteria'

/** Canonical section order. */
export const SECTION_ORDER: readonly BlueprintSectionKey[] = [
  'purpose', 'input', 'output', 'workflow', 'dependencies',
  'usedBy', 'files', 'elements', 'tests', 'completionCriteria',
]

/** Human-readable labels for each section. */
export const SECTION_LABELS: Record<BlueprintSectionKey, string> = {
  purpose: 'Purpose',
  input: 'Input',
  output: 'Output',
  workflow: 'Workflow',
  dependencies: 'Dependencies',
  usedBy: 'Used By',
  files: 'Files',
  elements: 'Elements',
  tests: 'Tests',
  completionCriteria: 'Completion Criteria',
}

/** Icons for each section. */
export const SECTION_ICONS: Record<BlueprintSectionKey, string> = {
  purpose: '🎯',
  input: '📥',
  output: '📤',
  workflow: '🔄',
  dependencies: '🔗',
  usedBy: '👆',
  files: '📁',
  elements: '🧩',
  tests: '🧪',
  completionCriteria: '✅',
}

// ---------------------------------------------------------------------------
// Section Content Types
// ---------------------------------------------------------------------------

/** A single text item within a section. */
export interface BlueprintItem {
  /** Short label for the item. */
  readonly label: string
  /** Detailed description. */
  readonly description: string
  /** Optional tags for filtering/search. */
  readonly tags?: readonly string[]
}

/** Purpose section: why this goal exists. */
export interface PurposeSection {
  /** High-level description of the goal's purpose. */
  readonly description: string
  /** Business justification. */
  readonly justification: string
  /** Success definition. */
  readonly successDefinition: string
  /** Additional notes. */
  readonly notes: readonly BlueprintItem[]
}

/** Input section: what this goal consumes. */
export interface InputSection {
  /** Input data items. */
  readonly data: readonly BlueprintItem[]
  /** Required resources (APIs, services, etc.). */
  readonly resources: readonly BlueprintItem[]
  /** Prerequisites that must be satisfied. */
  readonly prerequisites: readonly string[]
}

/** Output section: what this goal produces. */
export interface OutputSection {
  /** Output artifacts (files, records, etc.). */
  readonly artifacts: readonly BlueprintItem[]
  /** Side effects (notifications, events, etc.). */
  readonly sideEffects: readonly BlueprintItem[]
  /** Expected result format. */
  readonly format: string
}

/** Workflow section: the sequence of operations. */
export interface WorkflowSection {
  /** Ordered workflow steps. */
  readonly steps: readonly BlueprintItem[]
  /** Decision points / branches. */
  readonly decisionPoints: readonly BlueprintItem[]
  /** Error handling procedures. */
  readonly errorHandling: readonly BlueprintItem[]
}

/** Dependencies section: what this goal depends on. */
export interface BlueprintDependency {
  /** Target module or component. */
  readonly target: string
  /** Dependency type. */
  readonly type: 'module' | 'service' | 'api' | 'data' | 'config'
  /** Is this dependency required or optional. */
  readonly required: boolean
  /** Description of the dependency. */
  readonly description: string
}

/** Dependencies section. */
export interface DependenciesSection {
  /** All dependencies. */
  readonly items: readonly BlueprintDependency[]
  /** Dependency risk notes. */
  readonly riskNotes: readonly string[]
}

/** Used By section: what consumes this goal's output. */
export interface UsedBySection {
  /** Consumers (modules, goals, components). */
  readonly consumers: readonly BlueprintItem[]
  /** Integration points. */
  readonly integrationPoints: readonly BlueprintItem[]
}

/** File reference. */
export interface FileReference {
  /** Relative path. */
  readonly path: string
  /** File purpose. */
  readonly purpose: string
  /** File type. */
  readonly type: 'source' | 'test' | 'config' | 'doc' | 'data' | 'asset'
}

/** Files section: which files are involved. */
export interface FilesSection {
  /** Source files. */
  readonly sources: readonly FileReference[]
  /** Test files. */
  readonly tests: readonly FileReference[]
  /** Config files. */
  readonly configs: readonly FileReference[]
  /** Doc files. */
  readonly docs: readonly FileReference[]
}

/** Element reference. */
export interface ElementReference {
  /** Element name. */
  readonly name: string
  /** Element type. */
  readonly type: 'function' | 'class' | 'interface' | 'type' | 'tool' | 'component' | 'endpoint' | 'schema'
  /** Element description. */
  readonly description: string
  /** Is this element exported/public. */
  readonly isPublic: boolean
}

/** Elements section: what code/design elements are involved. */
export interface ElementsSection {
  /** All elements. */
  readonly items: readonly ElementReference[]
  /** Element categories. */
  readonly categories: readonly string[]
}

/** Test case reference. */
export interface TestCaseReference {
  /** Test name. */
  readonly name: string
  /** Test type. */
  readonly type: 'unit' | 'integration' | 'e2e' | 'snapshot' | 'manual'
  /** What the test covers. */
  readonly covers: string
  /** Expected result. */
  readonly expectedResult: string
}

/** Tests section: test coverage. */
export interface TestsSection {
  /** Planned/executed test cases. */
  readonly testCases: readonly TestCaseReference[]
  /** Coverage requirements. */
  readonly coverageRequirements: readonly string[]
  /** Test data requirements. */
  readonly testDataRequirements: readonly string[]
}

/** Completion Criteria section. */
export interface CompletionCriteriaSection {
  /** Acceptance criteria — must all be true. */
  readonly acceptanceCriteria: readonly BlueprintItem[]
  /** Quality gates. */
  readonly qualityGates: readonly BlueprintItem[]
  /** Definition of done. */
  readonly definitionOfDone: readonly string[]
  /** Blocking issues (if any). */
  readonly blockingIssues: readonly string[]
}

// ---------------------------------------------------------------------------
// Goal Blueprint
// ---------------------------------------------------------------------------

/** Status of a blueprint. */
export type BlueprintStatus = 'draft' | 'in-progress' | 'complete' | 'validated'

/** Human-readable status labels. */
export const BLUEPRINT_STATUS_LABELS: Record<BlueprintStatus, string> = {
  draft: 'Draft',
  'in-progress': 'In Progress',
  complete: 'Complete',
  validated: 'Validated',
}

/** Status icons. */
export const BLUEPRINT_STATUS_ICONS: Record<BlueprintStatus, string> = {
  draft: '📝',
  'in-progress': '🔄',
  complete: '✅',
  validated: '🏆',
}

/**
 * Complete blueprint for a single goal node.
 *
 * Each goal gets exactly one blueprint with all 10 sections.
 * Sections start as empty defaults and are populated incrementally.
 */
export interface GoalBlueprint {
  /** The goal node ID this blueprint is for. */
  readonly goalNodeId: string
  /** The goal name (denormalized for display). */
  readonly goalName: string
  /** Current status. */
  readonly status: BlueprintStatus
  /** When the blueprint was created. */
  readonly createdAt: string
  /** When the blueprint was last updated. */
  readonly updatedAt: string
  /** Completeness score 0–100. */
  readonly completenessScore: number
  /** Which sections have been populated (non-default). */
  readonly populatedSections: readonly BlueprintSectionKey[]

  /** Purpose section. */
  readonly purpose: PurposeSection
  /** Input section. */
  readonly input: InputSection
  /** Output section. */
  readonly output: OutputSection
  /** Workflow section. */
  readonly workflow: WorkflowSection
  /** Dependencies section. */
  readonly dependencies: DependenciesSection
  /** Used By section. */
  readonly usedBy: UsedBySection
  /** Files section. */
  readonly files: FilesSection
  /** Elements section. */
  readonly elements: ElementsSection
  /** Tests section. */
  readonly tests: TestsSection
  /** Completion Criteria section. */
  readonly completionCriteria: CompletionCriteriaSection
}

// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------

/** Input for creating a new blueprint. */
export interface CreateBlueprintInput {
  /** Goal node ID. */
  readonly goalNodeId: string
  /** Goal name. */
  readonly goalName: string
  /** Optional initial purpose description. */
  readonly purposeDescription?: string
  /** Optional initial justification. */
  readonly justification?: string
}

/** Input for updating a blueprint section. */
export interface UpdateBlueprintInput {
  /** Goal node ID. */
  readonly goalNodeId: string
  /** Section to update. */
  readonly section: BlueprintSectionKey
  /** Section data (type must match the section). */
  readonly data: Record<string, unknown> | PurposeSection | InputSection | OutputSection | WorkflowSection | DependenciesSection | UsedBySection | FilesSection | ElementsSection | TestsSection | CompletionCriteriaSection
}

// ---------------------------------------------------------------------------
// Query & Summary
// ---------------------------------------------------------------------------

/** Query for blueprints. */
export interface BlueprintQuery {
  /** Filter by goal node ID. */
  readonly goalNodeId?: string
  /** Filter by status. */
  readonly status?: BlueprintStatus
  /** Filter by minimum completeness. */
  readonly minCompleteness?: number
  /** Filter by populated section. */
  readonly populatedSection?: BlueprintSectionKey
}

/** Summary statistics for all blueprints. */
export interface BlueprintSummary {
  /** Total blueprints. */
  readonly totalBlueprints: number
  /** By status. */
  readonly byStatus: Readonly<Record<BlueprintStatus, number>>
  /** Average completeness score. */
  readonly averageCompleteness: number
  /** Least complete blueprints (for prioritization). */
  readonly leastComplete: readonly { goalNodeId: string; goalName: string; completenessScore: number }[]
  /** Section coverage across all blueprints. */
  readonly sectionCoverage: Readonly<Record<BlueprintSectionKey, number>>
}

// ---------------------------------------------------------------------------
// Blueprint Map
// ---------------------------------------------------------------------------

/**
 * Complete map of all goal blueprints.
 */
export interface GoalBlueprintMap {
  /** Blueprints keyed by goal node ID. */
  readonly blueprints: Readonly<Record<string, GoalBlueprint>>
  /** Summary statistics. */
  readonly summary: BlueprintSummary
  /** When the map was created. */
  readonly createdAt: string
  /** When the map was last updated. */
  readonly updatedAt: string
}
