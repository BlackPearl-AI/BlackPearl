/**
 * Types for the 20-phase MASTER RECOVERY & DEVELOPMENT BLUEPRINT.
 * @module @deepseek-ai/dsh-governance-layer/blueprint/types
 */

// ---------------------------------------------------------------------------
// Phase Identifiers
// ---------------------------------------------------------------------------

/** All 20 phases of the blueprint lifecycle. */
export type BlueprintPhase =
  | 'project-onboarding'
  | 'master-goal-capture'
  | 'conversation-ledger'
  | 'goal-breakdown'
  | 'module-identification'
  | 'module-deep-analysis'
  | 'goal-blueprint'
  | 'file-folder-blueprint'
  | 'element-registry'
  | 'rule-document-governance'
  | 'dependency-mapping'
  | 'task-decomposition'
  | 'pre-coding-audit'
  | 'implementation'
  | 'test-evidence'
  | 'independent-audit'
  | 'module-exit-gate'
  | 'next-module-linking'
  | 'direct-repair-index'
  | 'golden-journey'

/** Status of a phase execution. */
export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

// ---------------------------------------------------------------------------
// Phase 01 — Project Onboarding
// ---------------------------------------------------------------------------

export interface ProjectMap {
  readonly rootPath: string
  readonly topLevel: readonly DirectoryEntry[]
  readonly packages: readonly PackageEntry[]
}

export interface DirectoryEntry {
  readonly name: string
  readonly path: string
  readonly purpose?: string
}

export interface PackageEntry {
  readonly name: string
  readonly group: string
  readonly path: string
  readonly capabilities: readonly string[]
}

export interface ModuleMap {
  readonly modules: readonly ModuleMapEntry[]
}

export interface ModuleMapEntry {
  readonly name: string
  readonly path: string
  readonly services: readonly string[]
  readonly dependencies: readonly string[]
}

export interface DocumentationMap {
  readonly entries: readonly DocEntry[]
}

export interface DocEntry {
  readonly path: string
  readonly title: string
  readonly category: string
}

export interface RulesMap {
  readonly rules: readonly RuleMapEntry[]
}

export interface RuleMapEntry {
  readonly id: string
  readonly text: string
  readonly source: string
  readonly category: 'architecture' | 'security' | 'folders' | 'workflows' | 'testing' | 'conventions'
}

export interface ArchitectureMap {
  readonly patterns: readonly string[]
  readonly extensionPoints: readonly string[]
  readonly pluginSystem: string
}

export interface TestMap {
  readonly entries: readonly TestEntry[]
}

export interface TestEntry {
  readonly path: string
  readonly framework: string
  readonly testCount?: number
}

export interface OnboardingOutput {
  readonly projectMap: ProjectMap
  readonly moduleMap: ModuleMap
  readonly documentationMap: DocumentationMap
  readonly rulesMap: RulesMap
  readonly architectureMap: ArchitectureMap
  readonly testMap: TestMap
}

// ---------------------------------------------------------------------------
// Phase 02 — Master Goal Capture
// ---------------------------------------------------------------------------

export interface GoalCaptureInput {
  readonly objective: string
  readonly context?: string
  readonly onboarding: OnboardingOutput
}

export interface CapturedGoal {
  readonly id: string
  readonly objective: string
  readonly intent: readonly string[]
  readonly domains: readonly string[]
  readonly constraints: readonly string[]
  readonly confidence: number
  readonly capturedAt: string
}

// ---------------------------------------------------------------------------
// Phase 03 — Conversation Requirement Ledger
// ---------------------------------------------------------------------------

export interface LedgerEntry {
  readonly seq: number
  readonly timestamp: string
  readonly role: 'user' | 'assistant' | 'system'
  readonly content: string
  readonly requirements: readonly string[]
}

export interface ConversationLedger {
  readonly entries: readonly LedgerEntry[]
  readonly totalRequirements: number
}

// ---------------------------------------------------------------------------
// Phases 04-06 — Goal Breakdown, Module ID, Deep Analysis
// ---------------------------------------------------------------------------

export interface GoalBreakdownOutput {
  readonly goalId: string
  readonly domains: readonly string[]
  readonly modules: readonly string[]
  readonly activeModule?: string
  readonly lockedModules: readonly string[]
  readonly breakdown: unknown
}

export interface ModuleIdentificationOutput {
  readonly activeModuleId: string
  readonly activeModuleName: string
  readonly reason: string
  readonly prerequisitesMet: readonly string[]
  readonly prerequisitesPending: readonly string[]
}

export interface DeepAnalysisOutput {
  readonly moduleId: string
  readonly services: readonly string[]
  readonly extensionPoints: readonly string[]
  readonly files: readonly string[]
  readonly patterns: readonly string[]
  readonly testFiles: readonly string[]
  readonly docFiles: readonly string[]
}

// ---------------------------------------------------------------------------
// Phases 07-12 — Blueprint Engines
// ---------------------------------------------------------------------------

export interface GoalBlueprintOutput {
  readonly moduleId: string
  readonly steps: readonly BlueprintStep[]
  readonly tools: readonly string[]
  readonly expectedFiles: readonly string[]
}

export interface BlueprintStep {
  readonly name: string
  readonly description: string
  readonly order: number
}

export interface FileFolderBlueprintOutput {
  readonly moduleId: string
  readonly files: readonly FileBlueprint[]
  readonly folders: readonly FolderBlueprint[]
}

export interface FileBlueprint {
  readonly path: string
  readonly purpose: string
  readonly elements: readonly string[]
}

export interface FolderBlueprint {
  readonly path: string
  readonly purpose: string
}

export interface ElementRegistryOutput {
  readonly moduleId: string
  readonly elements: readonly BlueprintElement[]
}

export interface BlueprintElement {
  readonly type: 'BTN' | 'DD' | 'SET' | 'API' | 'PERM' | 'TOOL' | 'SERVICE' | 'CONFIG'
  readonly id: string
  readonly description: string
  readonly files: readonly string[]
}

export interface RuleGovernanceOutput {
  readonly moduleId: string
  readonly applicableRules: readonly string[]
  readonly newRulesNeeded: readonly string[]
}

export interface DependencyMappingOutput {
  readonly moduleId: string
  readonly internalDeps: readonly string[]
  readonly externalDeps: readonly string[]
  readonly reverseDeps: readonly string[]
}

export interface TaskDecompositionOutput {
  readonly moduleId: string
  readonly tasks: readonly TaskEntry[]
}

export interface TaskEntry {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly order: number
  readonly estimatedEffort: 'small' | 'medium' | 'large'
}

// ---------------------------------------------------------------------------
// Phases 13-17 — Implementation Gates
// ---------------------------------------------------------------------------

export interface PreCodingAuditOutput {
  readonly moduleId: string
  readonly passed: boolean
  readonly checks: readonly AuditCheck[]
}

export interface AuditCheck {
  readonly name: string
  readonly passed: boolean
  readonly reason?: string
}

export interface ImplementationOutput {
  readonly moduleId: string
  readonly filesChanged: readonly string[]
  readonly status: 'completed' | 'partial' | 'failed'
}

export interface TestEvidenceOutput {
  readonly moduleId: string
  readonly testFiles: readonly string[]
  readonly passed: number
  readonly failed: number
  readonly skipped: number
  readonly coverage?: number
}

export interface IndependentAuditOutput {
  readonly moduleId: string
  readonly passed: boolean
  readonly findings: readonly AuditFinding[]
}

export interface AuditFinding {
  readonly severity: 'info' | 'warning' | 'error'
  readonly message: string
  readonly file?: string
  readonly line?: number
}

export interface ModuleExitGateOutput {
  readonly moduleId: string
  readonly passed: boolean
  readonly checks: readonly ExitCheck[]
  readonly readyForNext: boolean
}

export interface ExitCheck {
  readonly name: string
  readonly passed: boolean
  readonly reason?: string
}

// ---------------------------------------------------------------------------
// Phases 18-20 — Next Module, Repair, Golden Journey
// ---------------------------------------------------------------------------

export interface NextModuleLinkingOutput {
  readonly nextModuleId: string
  readonly reason: string
  readonly unlockedBy: readonly string[]
}

export interface RepairEntry {
  readonly id: string
  readonly moduleId: string
  readonly description: string
  readonly severity: 'low' | 'medium' | 'high' | 'critical'
  readonly status: 'pending' | 'in-progress' | 'completed'
  readonly file?: string
  readonly line?: number
}

export interface RepairIndexOutput {
  readonly repairs: readonly RepairEntry[]
  readonly pendingCount: number
  readonly completedCount: number
}

export interface GoldenJourneyOutput {
  readonly objective: string
  readonly modulesCompleted: readonly string[]
  readonly modulesRemaining: readonly string[]
  readonly totalTests: number
  readonly passedTests: number
  readonly totalRepairs: number
  readonly completedRepairs: number
  readonly allPhasesCompleted: boolean
}

// ---------------------------------------------------------------------------
// Phase Execution Record
// ---------------------------------------------------------------------------

export interface PhaseExecutionRecord {
  readonly phase: BlueprintPhase
  readonly status: PhaseStatus
  readonly startedAt?: string
  readonly completedAt?: string
  readonly input: unknown
  readonly output?: unknown
  readonly error?: string
}

// ---------------------------------------------------------------------------
// Complete Blueprint State
// ---------------------------------------------------------------------------

export interface BlueprintState {
  readonly goalId: string
  readonly objective: string
  readonly currentPhase: BlueprintPhase
  readonly phases: Readonly<Record<BlueprintPhase, PhaseExecutionRecord>>
  readonly onboarding?: OnboardingOutput
  readonly capturedGoal?: CapturedGoal
  readonly ledger?: ConversationLedger
  readonly goalBreakdown?: GoalBreakdownOutput
  readonly moduleIdentification?: ModuleIdentificationOutput
  readonly deepAnalysis?: DeepAnalysisOutput
  readonly goalBlueprint?: GoalBlueprintOutput
  readonly fileBlueprint?: FileFolderBlueprintOutput
  readonly elementRegistry?: ElementRegistryOutput
  readonly ruleGovernance?: RuleGovernanceOutput
  readonly dependencyMapping?: DependencyMappingOutput
  readonly taskDecomposition?: TaskDecompositionOutput
  readonly preCodingAudit?: PreCodingAuditOutput
  readonly implementation?: ImplementationOutput
  readonly testEvidence?: TestEvidenceOutput
  readonly independentAudit?: IndependentAuditOutput
  readonly moduleExitGate?: ModuleExitGateOutput
  readonly nextModuleLinking?: NextModuleLinkingOutput
  readonly repairIndex?: RepairIndexOutput
  readonly goldenJourney?: GoldenJourneyOutput
}
