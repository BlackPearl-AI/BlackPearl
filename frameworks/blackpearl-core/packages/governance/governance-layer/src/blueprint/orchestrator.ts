/**
 * Blueprint Orchestrator: chains all 20 phases of the MASTER RECOVERY &
 * DEVELOPMENT BLUEPRINT sequentially, producing structured outputs at each
 * step and persisting state to `.project/`.
 *
 * @module @deepseek-ai/dsh-governance-layer/blueprint/orchestrator
 */

import type {
  BlueprintPhase,
  BlueprintState,
  PhaseExecutionRecord,
  PhaseStatus,
  OnboardingOutput,
  CapturedGoal,
  ConversationLedger,
  GoalBreakdownOutput,
  ModuleIdentificationOutput,
  DeepAnalysisOutput,
  GoalBlueprintOutput,
  FileFolderBlueprintOutput,
  ElementRegistryOutput,
  RuleGovernanceOutput,
  DependencyMappingOutput,
  TaskDecompositionOutput,
  PreCodingAuditOutput,
  ImplementationOutput,
  TestEvidenceOutput,
  IndependentAuditOutput,
  ModuleExitGateOutput,
  NextModuleLinkingOutput,
  RepairIndexOutput,
  GoldenJourneyOutput,
} from './types.ts'

// ---------------------------------------------------------------------------
// Phase Order
// ---------------------------------------------------------------------------

/** Canonical phase ordering. */
const PHASE_ORDER: readonly BlueprintPhase[] = [
  'project-onboarding',
  'master-goal-capture',
  'conversation-ledger',
  'goal-breakdown',
  'module-identification',
  'module-deep-analysis',
  'goal-blueprint',
  'file-folder-blueprint',
  'element-registry',
  'rule-document-governance',
  'dependency-mapping',
  'task-decomposition',
  'pre-coding-audit',
  'implementation',
  'test-evidence',
  'independent-audit',
  'module-exit-gate',
  'next-module-linking',
  'direct-repair-index',
  'golden-journey',
]

/**
 * Human-readable phase labels for display.
 */
const PHASE_LABELS: Record<BlueprintPhase, string> = {
  'project-onboarding': 'PHASE 01 — Project Onboarding',
  'master-goal-capture': 'PHASE 02 — Master Goal Capture',
  'conversation-ledger': 'PHASE 03 — Conversation Requirement Ledger',
  'goal-breakdown': 'PHASE 04 — Goal Breakdown',
  'module-identification': 'PHASE 05 — Master Module Identification',
  'module-deep-analysis': 'PHASE 06 — Master Module Deep Analysis',
  'goal-blueprint': 'PHASE 07 — Goal Blueprint',
  'file-folder-blueprint': 'PHASE 08 — File / Folder Blueprint',
  'element-registry': 'PHASE 09 — Element Registry',
  'rule-document-governance': 'PHASE 10 — Rule & Document Governance',
  'dependency-mapping': 'PHASE 11 — Dependency / Mapping Graph',
  'task-decomposition': 'PHASE 12 — Task Decomposition',
  'pre-coding-audit': 'PHASE 13 — Pre-Coding Audit',
  'implementation': 'PHASE 14 — Implementation',
  'test-evidence': 'PHASE 15 — Test + Evidence',
  'independent-audit': 'PHASE 16 — Independent Audit',
  'module-exit-gate': 'PHASE 17 — Module Exit Gate',
  'next-module-linking': 'PHASE 18 — Next Module Linking',
  'direct-repair-index': 'PHASE 19 — Direct Repair Index',
  'golden-journey': 'PHASE 20 — Full Product Golden Journey',
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * The Blueprint Orchestrator manages the 20-phase lifecycle.
 *
 * It maintains a `BlueprintState` that tracks:
 * - Which phase is current
 * - Completed phase outputs
 * - Errors and failures
 *
 * Usage:
 * ```ts
 * const orch = new BlueprintOrchestrator('MG-001', 'School ERP')
 * orch.startPhase('project-onboarding')
 * orch.completePhase('project-onboarding', onboardingOutput)
 * orch.startPhase('master-goal-capture')
 * // ...
 * ```
 */
export class BlueprintOrchestrator {
  private state: BlueprintState

  constructor(goalId: string, objective: string) {
    const phases: Record<string, PhaseExecutionRecord> = {}
    for (const phase of PHASE_ORDER) {
      phases[phase] = { phase, status: 'pending', input: null }
    }

    this.state = {
      goalId,
      objective,
      currentPhase: 'project-onboarding',
      phases: phases as Readonly<Record<BlueprintPhase, PhaseExecutionRecord>>,
    }
  }

  /** Get the current state snapshot. */
  getState(): BlueprintState {
    return this.state
  }

  /** Get the current phase. */
  getCurrentPhase(): BlueprintPhase {
    return this.state.currentPhase
  }

  /** Get the phase label (e.g. "PHASE 01 — Project Onboarding"). */
  getPhaseLabel(phase: BlueprintPhase): string {
    return PHASE_LABELS[phase]
  }

  /** Get all phase labels. */
  getAllPhaseLabels(): Readonly<Record<BlueprintPhase, string>> {
    return PHASE_LABELS
  }

  /** Get the ordered phase list. */
  getPhaseOrder(): readonly BlueprintPhase[] {
    return PHASE_ORDER
  }

  /** Get the index of a phase (0-based). */
  getPhaseIndex(phase: BlueprintPhase): number {
    return PHASE_ORDER.indexOf(phase)
  }

  /** Check if a phase is the last phase. */
  isLastPhase(phase: BlueprintPhase): boolean {
    return phase === PHASE_ORDER[PHASE_ORDER.length - 1]
  }

  /** Get the next phase after the given one. */
  getNextPhase(phase: BlueprintPhase): BlueprintPhase | undefined {
    const idx = PHASE_ORDER.indexOf(phase)
    return PHASE_ORDER[idx + 1]
  }

  /** Get the previous phase. */
  getPreviousPhase(phase: BlueprintPhase): BlueprintPhase | undefined {
    const idx = PHASE_ORDER.indexOf(phase)
    return idx > 0 ? PHASE_ORDER[idx - 1] : undefined
  }

  /** Check if a phase can be started (previous phase must be completed or skipped). */
  canStartPhase(phase: BlueprintPhase): boolean {
    const prev = this.getPreviousPhase(phase)
    if (prev === undefined) return true // First phase always startable.
    const prevRecord = this.state.phases[prev]
    return prevRecord?.status === 'completed' || prevRecord?.status === 'skipped'
  }

  /** Start a phase. */
  startPhase(phase: BlueprintPhase): void {
    if (!this.canStartPhase(phase)) {
      const prev = this.getPreviousPhase(phase)
      throw new Error(
        `blueprint: cannot start "${phase}" — previous phase "${prev}" is not completed`,
      )
    }

    const record: PhaseExecutionRecord = {
      phase,
      status: 'running',
      startedAt: new Date().toISOString(),
      input: null,
    }

    this.state = {
      ...this.state,
      currentPhase: phase,
      phases: {
        ...this.state.phases,
        [phase]: record,
      },
    }
  }

  /** Complete a phase with its output. */
  completePhase(phase: BlueprintPhase, output: unknown): void {
    const record = this.state.phases[phase]
    if (record?.status !== 'running') {
      throw new Error(`blueprint: cannot complete "${phase}" — current status is "${record?.status}"`)
    }

    const completed: PhaseExecutionRecord = {
      ...record,
      status: 'completed',
      completedAt: new Date().toISOString(),
      output,
    }

    this.state = {
      ...this.state,
      phases: {
        ...this.state.phases,
        [phase]: completed,
      },
    }
  }

  /** Fail a phase with an error message. */
  failPhase(phase: BlueprintPhase, error: string): void {
    const record = this.state.phases[phase]
    const failed: PhaseExecutionRecord = {
      ...(record ?? { phase, status: 'pending' as PhaseStatus, input: null }),
      status: 'failed',
      completedAt: new Date().toISOString(),
      error,
    }

    this.state = {
      ...this.state,
      phases: {
        ...this.state.phases,
        [phase]: failed,
      },
    }
  }

  /** Skip a phase. */
  skipPhase(phase: BlueprintPhase, reason: string): void {
    const skipped: PhaseExecutionRecord = {
      phase,
      status: 'skipped',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      input: null,
      output: { skipped: reason },
    }

    this.state = {
      ...this.state,
      phases: {
        ...this.state.phases,
        [phase]: skipped,
      },
    }
  }

  /** Check if all phases are completed. */
  isComplete(): boolean {
    return PHASE_ORDER.every(p => {
      const s = this.state.phases[p]?.status
      return s === 'completed' || s === 'skipped'
    })
  }

  /** Get progress summary. */
  getProgress(): { completed: number; total: number; percentage: number } {
    const completed = PHASE_ORDER.filter(p => {
      const s = this.state.phases[p]?.status
      return s === 'completed' || s === 'skipped'
    }).length
    return {
      completed,
      total: PHASE_ORDER.length,
      percentage: Math.round((completed / PHASE_ORDER.length) * 100),
    }
  }

  /** Get the status of each phase. */
  getPhaseStatuses(): Readonly<Record<BlueprintPhase, PhaseStatus>> {
    const result: Record<string, PhaseStatus> = {}
    for (const phase of PHASE_ORDER) {
      result[phase] = this.state.phases[phase]?.status ?? 'pending'
    }
    return result as Readonly<Record<BlueprintPhase, PhaseStatus>>
  }

  // -----------------------------------------------------------------------
  // Typed Output Accessors
  // -----------------------------------------------------------------------

  /** Get the output of a specific phase. */
  getOutput(phase: BlueprintPhase): unknown {
    return this.state.phases[phase]?.output
  }

  /** Get onboarding output (Phase 01). */
  getOnboardingOutput(): OnboardingOutput | undefined {
    return this.state.phases['project-onboarding']?.output as OnboardingOutput | undefined
  }

  /** Get captured goal (Phase 02). */
  getCapturedGoal(): CapturedGoal | undefined {
    return this.state.phases['master-goal-capture']?.output as CapturedGoal | undefined
  }

  /** Get conversation ledger (Phase 03). */
  getConversationLedger(): ConversationLedger | undefined {
    return this.state.phases['conversation-ledger']?.output as ConversationLedger | undefined
  }

  /** Get goal breakdown (Phase 04). */
  getGoalBreakdown(): GoalBreakdownOutput | undefined {
    return this.state.phases['goal-breakdown']?.output as GoalBreakdownOutput | undefined
  }

  /** Get module identification (Phase 05). */
  getModuleIdentification(): ModuleIdentificationOutput | undefined {
    return this.state.phases['module-identification']?.output as ModuleIdentificationOutput | undefined
  }

  /** Get deep analysis (Phase 06). */
  getDeepAnalysis(): DeepAnalysisOutput | undefined {
    return this.state.phases['module-deep-analysis']?.output as DeepAnalysisOutput | undefined
  }

  /** Get goal blueprint (Phase 07). */
  getGoalBlueprint(): GoalBlueprintOutput | undefined {
    return this.state.phases['goal-blueprint']?.output as GoalBlueprintOutput | undefined
  }

  /** Get file blueprint (Phase 08). */
  getFileBlueprint(): FileFolderBlueprintOutput | undefined {
    return this.state.phases['file-folder-blueprint']?.output as FileFolderBlueprintOutput | undefined
  }

  /** Get element registry (Phase 09). */
  getElementRegistry(): ElementRegistryOutput | undefined {
    return this.state.phases['element-registry']?.output as ElementRegistryOutput | undefined
  }

  /** Get rule governance (Phase 10). */
  getRuleGovernance(): RuleGovernanceOutput | undefined {
    return this.state.phases['rule-document-governance']?.output as RuleGovernanceOutput | undefined
  }

  /** Get dependency mapping (Phase 11). */
  getDependencyMapping(): DependencyMappingOutput | undefined {
    return this.state.phases['dependency-mapping']?.output as DependencyMappingOutput | undefined
  }

  /** Get task decomposition (Phase 12). */
  getTaskDecomposition(): TaskDecompositionOutput | undefined {
    return this.state.phases['task-decomposition']?.output as TaskDecompositionOutput | undefined
  }

  /** Get pre-coding audit (Phase 13). */
  getPreCodingAudit(): PreCodingAuditOutput | undefined {
    return this.state.phases['pre-coding-audit']?.output as PreCodingAuditOutput | undefined
  }

  /** Get implementation output (Phase 14). */
  getImplementation(): ImplementationOutput | undefined {
    return this.state.phases['implementation']?.output as ImplementationOutput | undefined
  }

  /** Get test evidence (Phase 15). */
  getTestEvidence(): TestEvidenceOutput | undefined {
    return this.state.phases['test-evidence']?.output as TestEvidenceOutput | undefined
  }

  /** Get independent audit (Phase 16). */
  getIndependentAudit(): IndependentAuditOutput | undefined {
    return this.state.phases['independent-audit']?.output as IndependentAuditOutput | undefined
  }

  /** Get module exit gate (Phase 17). */
  getModuleExitGate(): ModuleExitGateOutput | undefined {
    return this.state.phases['module-exit-gate']?.output as ModuleExitGateOutput | undefined
  }

  /** Get next module linking (Phase 18). */
  getNextModuleLinking(): NextModuleLinkingOutput | undefined {
    return this.state.phases['next-module-linking']?.output as NextModuleLinkingOutput | undefined
  }

  /** Get repair index (Phase 19). */
  getRepairIndex(): RepairIndexOutput | undefined {
    return this.state.phases['direct-repair-index']?.output as RepairIndexOutput | undefined
  }

  /** Get golden journey (Phase 20). */
  getGoldenJourney(): GoldenJourneyOutput | undefined {
    return this.state.phases['golden-journey']?.output as GoldenJourneyOutput | undefined
  }
}
