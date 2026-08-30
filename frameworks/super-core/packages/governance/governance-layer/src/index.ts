/**
 * Governance Layer: universal state-machine, pre-execution gate, completion
 * gate, and prompt section for agent governance.
 *
 * This plugin does NOT modify any core package. It sits on top of existing
 * extension points:
 * - `tools/pre-execute` waterfall for pre-execution gating
 * - `systemPrompt.section()` for prompt injection
 * - `registerCompletionGate()` for completion policy
 * - `ctx.tools.register()` for the `governance_transition` tool
 *
 * State persists to `.project/` directory when a project root is configured.
 * @module @deepseek-ai/dsh-governance-layer
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { HarnessError } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { installPreExecutionGate } from './pre-execution.ts'
import { installCompletionGate } from './completion.ts'
import { installPromptSection } from './prompt-section.ts'
import { createStore, applyTransition, getState } from './state-machine.ts'
import { ProjectStore } from './project-store.ts'
import type { GovernanceStoreAdapter } from './project-store.ts'
import { createResolveMasterGoalTool } from './master-goal-gate/index.ts'
import {
  createStartBlueprintTool,
  createAdvanceBlueprintTool,
  createGetBlueprintStatusTool,
} from './blueprint/index.ts'
import {
  createCaptureMasterGoalTool,
  createVerifyAgainstGoalTool,
  createGetMasterGoalProgressTool,
} from './master-goal/index.ts'
import {
  createCaptureRequirementTool,
  createGetLedgerTool,
  createQueryCrTool,
  createAnswerVerificationTool,
  createSupersedeCrTool,
} from './conversation-ledger/index.ts'
import {
  createAddBreakdownNodeTool,
  createGetBreakdownTool,
  createQueryBreakdownTool,
  createUpdateNodeStatusTool,
} from './goal-breakdown/index.ts'
import {
  createRegisterModuleTool,
  createRegisterMasterDataTool,
  createResolveFoundationTool,
  createValidateNamingTool,
  createUpdateModuleStatusTool as createModuleIdentificationStatusTool,
  createGetModuleMapTool,
} from './module-identification/index.ts'
import {
  createAnalyzeModuleTool,
  createGetAnalysisTool,
  createValidateCompletenessTool,
  createDeepAnalysisReportTool,
} from './deep-analysis/index.ts'
import {
  createCreateGoalBlueprintTool,
  createGetGoalBlueprintTool,
  createUpdateBlueprintSectionTool,
  createValidateBlueprintsTool,
  createBlueprintReportTool,
} from './goal-blueprint/index.ts'
import {
  createCreateFileBlueprintTool,
  createAddFilesToBlueprintTool,
  createAddFoldersToBlueprintTool,
  createValidateFileBlueprintTool,
  createCheckCodingGateTool,
  createFileBlueprintReportTool,
} from './file-blueprint/index.ts'
import {
  createRegisterElementTool,
  createBulkRegisterElementsTool,
  createFindElementTool,
  createElementRegistryReportTool,
  createValidateElementRegistryTool,
  createGetNextSequenceTool,
} from './element-registry/index.ts'
import {
  createRegisterRuleTool,
  createValidateAgainstRulesTool,
  createEnforceRuleGateTool,
  createRuleRegistryReportTool,
  createQueryRulesTool,
  createDeactivateRuleTool,
} from './rule-governance/index.ts'
import {
  createBuildDependencyGraphTool,
  createValidateDependencyGraphTool,
  createAnalyzeImpactTool,
  createGetExecutionOrderTool,
  createGetDependencyHealthTool,
  createExportDependencyGraphTool,
} from './dependency-mapping/index.ts'
import {
  createCreateTaskTool,
  createDecomposeTaskTool,
  createUpdateTaskStatusTool,
  createValidateTasksTool,
  createGetTaskSummaryTool,
  createGetTaskExecutionOrderTool,
  createGetReadyTasksTool,
  createGetTaskTraceabilityTool,
  createGetTaskTreeTool,
} from './task-decomposition/index.ts'
import {
  createRunPreCodingAuditTool,
  createCheckCodingReadinessTool,
} from './pre-coding-audit/index.ts'
import {
  createCheckModuleExitGateTool,
} from './module-exit-gate/index.ts'
import {
  createCreateVerticalSliceTool,
  createStartSliceLayerTool,
  createCompleteSliceLayerTool,
  createFailSliceLayerTool,
  createSkipSliceLayerTool,
  createValidateSliceTool,
  createGetSliceStatusTool,
  createGetSliceSummaryTool,
  createBlockSliceTool,
  createUnblockSliceTool,
  createCompleteVerticalSliceTool,
  createGetModuleSlicesTool,
} from './vertical-slice/index.ts'
import {
  createInitiateRepairTool,
  createExpandRepairScopeTool,
  createCompleteRepairTool,
} from './repair-engine/index.ts'
import {
  createDefineJourneyTool,
  createStartJourneyTool,
  createAdvanceJourneyStepTool,
  createFailJourneyStepTool,
  createPauseJourneyTool,
  createResumeJourneyTool,
  createGetJourneyStatusTool,
  createListJourneysTool,
  createExportJourneyRegressionTool,
  createRerunJourneyRegressionTool,
} from './golden-journey/index.ts'
import {
  createBuildContextPackTool,
  createGetContextPackManifestTool,
  createEstimateContextSizeTool,
} from './context-pack/index.ts'
import {
  createNavigateIndexesTool,
  createCheckIndexStalenessTool,
  createRepairIndexBoundedTool,
  createDeduplicateContextTool,
  createEstimateContextTokensTool,
  createExpandScopeByDependencyTool,
  createReuseEvidenceTool,
} from './index-navigator/index.ts'
import type {
  GovernanceLayerConfig,
  GovernancePhase,
} from './types.ts'
import { VALID_TRANSITIONS } from './types.ts'
import { isValidTransition } from './state-machine.ts'

export const name = 'governance-layer'
export const inject = ['tools', 'systemPrompt']

/**
 * Plugin config, validated by schemastery.
 */
export interface Config {
  /** Enable the governance prompt section (default true). */
  promptEnabled?: boolean
  /** Enable the pre-execution gate (default true). */
  preExecutionEnabled?: boolean
  /** Enable the completion gate (default true). */
  completionEnabled?: boolean
  /** Phases that allow unrestricted tool execution (default ['implementing', 'testing']). */
  unrestrictedPhases?: GovernancePhase[]
  /** Tool names blocked during non-unrestricted phases. */
  restrictedTools?: string[]
  /** Tool names always allowed regardless of phase. */
  exemptTools?: string[]
  /**
   * Absolute path to the `.project/` directory for file-based persistence.
   * When absent, an in-memory store is used (no persistence).
   */
  projectRoot?: string
}

export const Config: z<Config> = z.object({
  promptEnabled: z.boolean().default(true),
  preExecutionEnabled: z.boolean().default(true),
  completionEnabled: z.boolean().default(true),
  unrestrictedPhases: z.array(z.union([
    z.const('idle'), z.const('capturing'), z.const('planning'),
    z.const('implementing'), z.const('testing'), z.const('auditing'), z.const('verified'),
  ])).default(['implementing', 'testing']),
  restrictedTools: z.array(z.string()).default(undefined as unknown as string[]),
  exemptTools: z.array(z.string()).default(undefined as unknown as string[]),
  projectRoot: z.string().default(undefined as unknown as string),
})

/** Canonical tool output shape for the governance_transition tool. */
const GOVERNANCE_OUTPUT = {
  schema: {
    type: 'object' as const,
    additionalProperties: false as const,
    properties: {
      state: {
        type: 'object' as const,
        additionalProperties: false as const,
        required: true as const,
        properties: {
          phase: { type: 'string' as const, required: true as const },
          goalId: { type: 'string' as const },
          revision: { type: 'integer' as const, required: true as const },
          lastTransitionAt: { type: 'string' as const, required: true as const },
        },
      },
    },
  },
  render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value) }],
}

/** Generic pending presentation for the governance tool. */
function presentCall(args: unknown): GenericCallView {
  const input = args as { to_phase?: string; reason?: string }
  return {
    card: 'generic',
    title: `Governance: ${input.to_phase ?? '?'}`,
    kind: 'other',
    rawInput: input.reason ?? '',
  }
}

/**
 * Install the Governance Layer plugin on a Cordis context.
 *
 * This is the main entry point. It:
 * 1. Creates or loads the governance store (file-backed or in-memory).
 * 2. Scaffolds `.project/` if projectRoot is configured.
 * 3. Installs the pre-execution gate (tools/pre-execute waterfall).
 * 4. Installs the completion gate (goal authority).
 * 5. Installs the prompt section (systemPrompt.section).
 * 6. Registers the `governance_transition` tool.
 * 7. Registers disposers for clean teardown.
 */
export function apply(ctx: Context, config: Config): void {
  const resolvedConfig: GovernanceLayerConfig = {
    ...(config.promptEnabled !== undefined ? { promptEnabled: config.promptEnabled } : {}),
    ...(config.preExecutionEnabled !== undefined ? { preExecutionEnabled: config.preExecutionEnabled } : {}),
    ...(config.completionEnabled !== undefined ? { completionEnabled: config.completionEnabled } : {}),
    ...(config.unrestrictedPhases !== undefined ? { unrestrictedPhases: config.unrestrictedPhases as GovernancePhase[] } : {}),
    ...(config.restrictedTools !== undefined ? { restrictedTools: config.restrictedTools } : {}),
    ...(config.exemptTools !== undefined ? { exemptTools: config.exemptTools } : {}),
  }

  // Create the store: file-backed if projectRoot is provided, in-memory otherwise.
  let store: GovernanceStoreAdapter
  if (config.projectRoot !== undefined && config.projectRoot !== '') {
    const projectStore = new ProjectStore(config.projectRoot)
    projectStore.scaffold()
    store = projectStore
  } else {
    store = createStore()
  }

  // Install the three governance mechanisms.
  const disposePreExecution = installPreExecutionGate(ctx, store, resolvedConfig)
  const disposeCompletion = installCompletionGate(ctx, store, resolvedConfig)
  const disposePrompt = installPromptSection(ctx, store, resolvedConfig)

  // Register the governance_transition tool.
  const disposeTool = ctx.tools.register(defineTool({
    name: 'governance_transition',
    description:
      'Transition the governance state machine to a new phase. '
      + 'Valid transitions are enforced by the state machine. '
      + 'During the planning phase, state-changing tools are restricted. '
      + 'Autonomous goal completion requires the auditing phase.',
    parameters: {
      to_phase: {
        type: 'string',
        required: true,
        enum: [
          'capturing', 'planning', 'implementing',
          'testing', 'auditing', 'verified', 'idle',
        ] as const,
        description: 'Target governance phase.',
      },
      reason: {
        type: 'string',
        required: true,
        description: 'Reason for the transition (will be logged).',
      },
    },
    output: GOVERNANCE_OUTPUT,
    execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) {
        throw new HarnessError(
          'governance_transition requires a calling agent',
          'GOVERNANCE_AGENT_REQUIRED',
        )
      }

      const toPhase = args.to_phase as GovernancePhase
      const reason = args.reason as string

      // Get or create the current state.
      let current = getState(store, agent.id)
      if (current === undefined) {
        current = { phase: 'idle', revision: 0, lastTransitionAt: new Date().toISOString() }
      }

      // Validate the transition.
      if (!isValidTransition(current.phase, toPhase)) {
        const valid = VALID_TRANSITIONS[current.phase]
        throw new HarnessError(
          `governance: invalid transition from "${current.phase}" to "${toPhase}" `
          + `(valid: ${valid?.join(', ') ?? 'none'})`,
          'GOVERNANCE_INVALID_TRANSITION',
        )
      }

      // Apply the transition.
      applyTransition(store, agent.id, toPhase, reason)

      // Return the new state.
      const newState = getState(store, agent.id)!
      return Promise.resolve({
        state: {
          phase: newState.phase,
          goalId: newState.goalId,
          revision: newState.revision,
          lastTransitionAt: newState.lastTransitionAt,
        },
      })
    },
    presentCall,
  }))

  // Register the resolve_master_goal tool.
  const disposeMasterGoalTool = ctx.tools.register(createResolveMasterGoalTool())

  // Register the 20-phase blueprint tools.
  const disposeStartBlueprint = ctx.tools.register(createStartBlueprintTool())
  const disposeAdvanceBlueprint = ctx.tools.register(createAdvanceBlueprintTool())
  const disposeBlueprintStatus = ctx.tools.register(createGetBlueprintStatusTool())

  // Register the MASTER-GOAL tools.
  const disposeCaptureGoal = ctx.tools.register(createCaptureMasterGoalTool())
  const disposeVerifyGoal = ctx.tools.register(createVerifyAgainstGoalTool())
  const disposeGoalProgress = ctx.tools.register(createGetMasterGoalProgressTool())

  // Register the Conversation Requirement Ledger tools.
  const disposeCaptureReq = ctx.tools.register(createCaptureRequirementTool())
  const disposeGetLedger = ctx.tools.register(createGetLedgerTool())
  const disposeQueryCr = ctx.tools.register(createQueryCrTool())
  const disposeAnswerVerification = ctx.tools.register(createAnswerVerificationTool())
  const disposeSupersedeCr = ctx.tools.register(createSupersedeCrTool())

  // Register the Goal Breakdown tools.
  const disposeAddBreakdown = ctx.tools.register(createAddBreakdownNodeTool())
  const disposeGetBreakdown = ctx.tools.register(createGetBreakdownTool())
  const disposeQueryBreakdown = ctx.tools.register(createQueryBreakdownTool())
  const disposeUpdateNodeStatus = ctx.tools.register(createUpdateNodeStatusTool())

  // Register the Master Module Identification tools.
  const disposeRegisterModule = ctx.tools.register(createRegisterModuleTool())
  const disposeRegisterMasterData = ctx.tools.register(createRegisterMasterDataTool())
  const disposeResolveFoundation = ctx.tools.register(createResolveFoundationTool())
  const disposeValidateNaming = ctx.tools.register(createValidateNamingTool())
  const disposeModuleStatus = ctx.tools.register(createModuleIdentificationStatusTool())
  const disposeModuleMap = ctx.tools.register(createGetModuleMapTool())

  // Register the Master Module Deep Analysis tools.
  const disposeAnalyzeModule = ctx.tools.register(createAnalyzeModuleTool())
  const disposeGetAnalysis = ctx.tools.register(createGetAnalysisTool())
  const disposeValidateCompleteness = ctx.tools.register(createValidateCompletenessTool())
  const disposeDeepAnalysisReport = ctx.tools.register(createDeepAnalysisReportTool())

  // Register the Goal Blueprint tools.
  const disposeCreateBlueprint = ctx.tools.register(createCreateGoalBlueprintTool())
  const disposeGetBlueprint = ctx.tools.register(createGetGoalBlueprintTool())
  const disposeUpdateBlueprintSection = ctx.tools.register(createUpdateBlueprintSectionTool())
  const disposeValidateBlueprints = ctx.tools.register(createValidateBlueprintsTool())
  const disposeBlueprintReport = ctx.tools.register(createBlueprintReportTool())

  // Register the File / Folder Blueprint tools (PHASE 08).
  const disposeCreateFileBlueprint = ctx.tools.register(createCreateFileBlueprintTool())
  const disposeAddFilesToBlueprint = ctx.tools.register(createAddFilesToBlueprintTool())
  const disposeAddFoldersToBlueprint = ctx.tools.register(createAddFoldersToBlueprintTool())
  const disposeValidateFileBlueprint = ctx.tools.register(createValidateFileBlueprintTool())
  const disposeCheckCodingGate = ctx.tools.register(createCheckCodingGateTool())
  const disposeFileBlueprintReport = ctx.tools.register(createFileBlueprintReportTool())

  // Element Registry — PHASE 09
  const disposeRegisterElement = ctx.tools.register(createRegisterElementTool())
  const disposeBulkRegisterElements = ctx.tools.register(createBulkRegisterElementsTool())
  const disposeFindElement = ctx.tools.register(createFindElementTool())
  const disposeElementRegistryReport = ctx.tools.register(createElementRegistryReportTool())
  const disposeValidateElementRegistry = ctx.tools.register(createValidateElementRegistryTool())
  const disposeGetNextSequence = ctx.tools.register(createGetNextSequenceTool())

  // Rule & Documentation Governance — PHASE 10
  const disposeRegisterRule = ctx.tools.register(createRegisterRuleTool())
  const disposeValidateAgainstRules = ctx.tools.register(createValidateAgainstRulesTool())
  const disposeEnforceRuleGate = ctx.tools.register(createEnforceRuleGateTool())
  const disposeRuleRegistryReport = ctx.tools.register(createRuleRegistryReportTool())
  const disposeQueryRules = ctx.tools.register(createQueryRulesTool())
  const disposeDeactivateRule = ctx.tools.register(createDeactivateRuleTool())

  // Dependency Mapping — PHASE 11
  const disposeBuildDepGraph = ctx.tools.register(createBuildDependencyGraphTool())
  const disposeValidateDepGraph = ctx.tools.register(createValidateDependencyGraphTool())
  const disposeAnalyzeImpact = ctx.tools.register(createAnalyzeImpactTool())
  const disposeGetExecOrder = ctx.tools.register(createGetExecutionOrderTool())
  const disposeGetDepHealth = ctx.tools.register(createGetDependencyHealthTool())
  const disposeExportDepGraph = ctx.tools.register(createExportDependencyGraphTool())

  // Task Decomposition — PHASE 12
  const disposeCreateTask = ctx.tools.register(createCreateTaskTool())
  const disposeDecomposeTask = ctx.tools.register(createDecomposeTaskTool())
  const disposeUpdateTaskStatus = ctx.tools.register(createUpdateTaskStatusTool())
  const disposeValidateTasks = ctx.tools.register(createValidateTasksTool())
  const disposeGetTaskSummary = ctx.tools.register(createGetTaskSummaryTool())
  const disposeGetTaskExecOrder = ctx.tools.register(createGetTaskExecutionOrderTool())
  const disposeGetReadyTasks = ctx.tools.register(createGetReadyTasksTool())
  const disposeGetTaskTraceability = ctx.tools.register(createGetTaskTraceabilityTool())
  const disposeGetTaskTree = ctx.tools.register(createGetTaskTreeTool())

  // Pre-Coding Audit — PHASE 13
  const disposeRunAudit = ctx.tools.register(createRunPreCodingAuditTool())
  const disposeCheckReadiness = ctx.tools.register(createCheckCodingReadinessTool())

  // Module Exit Gate — PHASE 17
  const disposeModuleExitGate = ctx.tools.register(createCheckModuleExitGateTool())

  // Vertical Slice — PHASE 14
  const disposeCreateSlice = ctx.tools.register(createCreateVerticalSliceTool())
  const disposeStartLayer = ctx.tools.register(createStartSliceLayerTool())
  const disposeCompleteLayer = ctx.tools.register(createCompleteSliceLayerTool())
  const disposeFailLayer = ctx.tools.register(createFailSliceLayerTool())
  const disposeSkipLayer = ctx.tools.register(createSkipSliceLayerTool())
  const disposeValidateSlice = ctx.tools.register(createValidateSliceTool())
  const disposeGetSliceStatus = ctx.tools.register(createGetSliceStatusTool())
  const disposeGetSliceSummary = ctx.tools.register(createGetSliceSummaryTool())
  const disposeBlockSlice = ctx.tools.register(createBlockSliceTool())
  const disposeUnblockSlice = ctx.tools.register(createUnblockSliceTool())
  const disposeCompleteSlice = ctx.tools.register(createCompleteVerticalSliceTool())
  const disposeGetModuleSlices = ctx.tools.register(createGetModuleSlicesTool())

  // G-21 — Direct Repair Engine
  const disposeInitiateRepair = ctx.tools.register(createInitiateRepairTool())
  const disposeExpandRepairScope = ctx.tools.register(createExpandRepairScopeTool())
  const disposeCompleteRepair = ctx.tools.register(createCompleteRepairTool())

  // G-26 — Generic Golden Journey Engine
  const disposeDefineJourney = ctx.tools.register(createDefineJourneyTool())
  const disposeStartJourney = ctx.tools.register(createStartJourneyTool())
  const disposeAdvanceJourneyStep = ctx.tools.register(createAdvanceJourneyStepTool())
  const disposeFailJourneyStep = ctx.tools.register(createFailJourneyStepTool())
  const disposePauseJourney = ctx.tools.register(createPauseJourneyTool())
  const disposeResumeJourney = ctx.tools.register(createResumeJourneyTool())
  const disposeGetJourneyStatus = ctx.tools.register(createGetJourneyStatusTool())
  const disposeListJourneys = ctx.tools.register(createListJourneysTool())
  const disposeExportJourneyRegression = ctx.tools.register(createExportJourneyRegressionTool())
  const disposeRerunJourneyRegression = ctx.tools.register(createRerunJourneyRegressionTool())

  // G-28 — Task-Specific Context Pack Engine
  const disposeBuildContextPack = ctx.tools.register(createBuildContextPackTool())
  const disposeGetContextPackManifest = ctx.tools.register(createGetContextPackManifestTool())
  const disposeEstimateContextSize = ctx.tools.register(createEstimateContextSizeTool())

  // G-29 — Token / Context Efficiency & Index Navigator Engine
  const disposeNavigateIndexes = ctx.tools.register(createNavigateIndexesTool())
  const disposeCheckIndexStaleness = ctx.tools.register(createCheckIndexStalenessTool())
  const disposeRepairIndexBounded = ctx.tools.register(createRepairIndexBoundedTool())
  const disposeDeduplicateContext = ctx.tools.register(createDeduplicateContextTool())
  const disposeEstimateContextTokens = ctx.tools.register(createEstimateContextTokensTool())
  const disposeExpandScopeByDependency = ctx.tools.register(createExpandScopeByDependencyTool())
  const disposeReuseEvidence = ctx.tools.register(createReuseEvidenceTool())

  // Clean teardown via effect scope.
  ctx.effect(() => {
    return () => {
      disposePreExecution()
      disposeCompletion()
      disposePrompt()
      disposeTool()
      disposeMasterGoalTool()
      disposeStartBlueprint()
      disposeAdvanceBlueprint()
      disposeBlueprintStatus()
      disposeCaptureGoal()
      disposeVerifyGoal()
      disposeGoalProgress()
      disposeCaptureReq()
      disposeGetLedger()
      disposeQueryCr()
      disposeAnswerVerification()
      disposeSupersedeCr()
      disposeAddBreakdown()
      disposeGetBreakdown()
      disposeQueryBreakdown()
      disposeUpdateNodeStatus()
      disposeRegisterModule()
      disposeRegisterMasterData()
      disposeResolveFoundation()
      disposeValidateNaming()
      disposeModuleStatus()
      disposeModuleMap()
      disposeAnalyzeModule()
      disposeGetAnalysis()
      disposeValidateCompleteness()
      disposeDeepAnalysisReport()
      disposeCreateBlueprint()
      disposeGetBlueprint()
      disposeUpdateBlueprintSection()
      disposeValidateBlueprints()
      disposeBlueprintReport()
      disposeCreateFileBlueprint()
      disposeAddFilesToBlueprint()
      disposeAddFoldersToBlueprint()
      disposeValidateFileBlueprint()
      disposeCheckCodingGate()
      disposeFileBlueprintReport()
      disposeRegisterElement()
      disposeBulkRegisterElements()
      disposeFindElement()
      disposeElementRegistryReport()
      disposeValidateElementRegistry()
      disposeGetNextSequence()
      disposeRegisterRule()
      disposeValidateAgainstRules()
      disposeEnforceRuleGate()
      disposeRuleRegistryReport()
      disposeQueryRules()
      disposeDeactivateRule()
      disposeBuildDepGraph()
      disposeValidateDepGraph()
      disposeAnalyzeImpact()
      disposeGetExecOrder()
      disposeGetDepHealth()
      disposeExportDepGraph()
      disposeCreateTask()
      disposeDecomposeTask()
      disposeUpdateTaskStatus()
      disposeValidateTasks()
      disposeGetTaskSummary()
      disposeGetTaskExecOrder()
      disposeGetReadyTasks()
      disposeGetTaskTraceability()
      disposeGetTaskTree()
      disposeRunAudit()
      disposeCheckReadiness()
      disposeModuleExitGate()
      disposeCreateSlice()
      disposeStartLayer()
      disposeCompleteLayer()
      disposeFailLayer()
      disposeSkipLayer()
      disposeValidateSlice()
      disposeGetSliceStatus()
      disposeGetSliceSummary()
      disposeBlockSlice()
      disposeUnblockSlice()
      disposeCompleteSlice()
      disposeGetModuleSlices()
      disposeInitiateRepair()
      disposeExpandRepairScope()
      disposeCompleteRepair()
      disposeDefineJourney()
      disposeStartJourney()
      disposeAdvanceJourneyStep()
      disposeFailJourneyStep()
      disposePauseJourney()
      disposeResumeJourney()
      disposeGetJourneyStatus()
      disposeListJourneys()
      disposeExportJourneyRegression()
      disposeRerunJourneyRegression()
      disposeBuildContextPack()
      disposeGetContextPackManifest()
      disposeEstimateContextSize()
      disposeNavigateIndexes()
      disposeCheckIndexStaleness()
      disposeRepairIndexBounded()
      disposeDeduplicateContext()
      disposeEstimateContextTokens()
      disposeExpandScopeByDependency()
      disposeReuseEvidence()
      store.clear()
    }
  }, 'governance-layer')
}

// Re-export all submodules for direct import.
export { createStore, getState, ensureState, applyTransition, removeState } from './state-machine.ts'
export { ProjectStore, MemoryStore } from './project-store.ts'
export type { GovernanceStoreAdapter } from './project-store.ts'
export { installPreExecutionGate } from './pre-execution.ts'
export { installCompletionGate } from './completion.ts'
export { installPromptSection } from './prompt-section.ts'
export type {
  GovernancePhase,
  GovernanceState,
  GovernanceTransition,
  GovernanceLayerConfig,
  GovernancePreDecision,
  GovernanceCompletionGate,
  GovernancePhaseEvent,
  MasterGoal,
  GoalIndexEntry,
  GoalMetadata,
  RuntimeState,
  RuleIndex,
  BlueprintElementIndex,
  BlueprintFileIndex,
  DependencyMap,
  RepairIndex,
} from './types.ts'
export { VALID_TRANSITIONS } from './types.ts'
export { isValidTransition } from './state-machine.ts'
export {
  MasterGoalEngine,
  createResolveMasterGoalTool,
  formatModuleStatus,
  getModuleStatusText,
} from './master-goal-gate/index.ts'
export type {
  GoalDecompositionInput,
  ModuleInput,
  MasterGoalBreakdown,
  ModuleDescriptor,
  ProductDomain,
  DependencyGraph,
  ModuleStatus,
  ModuleStatusText,
} from './master-goal-gate/index.ts'
export {
  BlueprintOrchestrator,
  createStartBlueprintTool,
  createAdvanceBlueprintTool,
  createGetBlueprintStatusTool,
} from './blueprint/index.ts'
export {
  validateDefinition,
  isInScope,
  checkModuleScope,
  computeProgress,
  verifyAgainstGoal,
  summarizeGoal,
  createCaptureMasterGoalTool,
  createVerifyAgainstGoalTool,
  createGetMasterGoalProgressTool,
} from './master-goal/index.ts'
export type {
  BlueprintPhase,
  PhaseStatus,
  BlueprintState,
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
} from './blueprint/index.ts'
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
} from './master-goal/index.ts'
export {
  ConversationLedgerEngine,
  createCaptureRequirementTool,
  createGetLedgerTool,
  createQueryCrTool,
  createAnswerVerificationTool,
  createSupersedeCrTool,
  createCRId,
  parseCRId,
  INTERACTION_LABELS,
} from './conversation-ledger/index.ts'
export type {
  CRId,
  InteractionType,
  VerificationQuestion,
  LedgerEntry,
  CaptureInput,
  CaptureResult,
  LedgerQuery,
  LedgerSummary,
} from './conversation-ledger/index.ts'
export {
  GoalBreakdownEngine,
  createAddBreakdownNodeTool,
  createGetBreakdownTool,
  createQueryBreakdownTool,
  createUpdateNodeStatusTool,
  LEVEL_ORDER,
  LEVEL_LABELS,
  LEVEL_ICONS,
  STATUS_LABELS,
} from './goal-breakdown/index.ts'
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
} from './goal-breakdown/index.ts'
export {
  ModuleIdentificationEngine,
  createRegisterModuleTool,
  createRegisterMasterDataTool,
  createResolveFoundationTool,
  createValidateNamingTool,
  createUpdateModuleStatusTool,
  createGetModuleMapTool,
  FIELD_TYPE_LABELS,
} from './module-identification/index.ts'
export type {
  FieldType,
  FieldDefinition,
  MasterDataEntity,
  NamingEntry,
  ModuleType,
  ModuleCompletionStatus,
  ModuleDefinition,
  FoundationGateResult,
  FoundationModuleStatus,
  NamingInconsistency,
  ConsistencyResult,
  ModuleMap,
} from './module-identification/index.ts'
export {
  MasterModuleDeepAnalysisEngine,
  createAnalyzeModuleTool,
  createGetAnalysisTool,
  createValidateCompletenessTool,
  createDeepAnalysisReportTool,
  DIMENSION_ORDER,
  DIMENSION_LABELS,
  DIMENSION_ICONS,
  SEVERITY_LABELS,
  SEVERITY_ICONS,
} from './deep-analysis/index.ts'
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
} from './deep-analysis/index.ts'
export {
  GoalBlueprintEngine,
  createCreateGoalBlueprintTool,
  createGetGoalBlueprintTool,
  createUpdateBlueprintSectionTool,
  createValidateBlueprintsTool,
  createBlueprintReportTool,
  SECTION_ORDER,
  SECTION_LABELS,
  SECTION_ICONS,
  BLUEPRINT_STATUS_LABELS,
  BLUEPRINT_STATUS_ICONS,
} from './goal-blueprint/index.ts'
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
} from './goal-blueprint/index.ts'
export {
  FileBlueprintEngine,
  createCreateFileBlueprintTool,
  createAddFilesToBlueprintTool,
  createAddFoldersToBlueprintTool,
  createValidateFileBlueprintTool,
  createCheckCodingGateTool,
  createFileBlueprintReportTool,
  UNIVERSAL_FOLDER_RULES,
  FILE_ENTRY_TYPES,
  FILE_ENTRY_TYPE_LABELS,
  FILE_ENTRY_TYPE_ICONS,
  BLUEPRINT_APPROVAL_LABELS,
  BLUEPRINT_APPROVAL_ICONS,
} from './file-blueprint/index.ts'
export type {
  FileEntryType,
  FileEntry,
  FolderRuleMode,
  FolderRule,
  FolderEntry,
  BlueprintApprovalStatus,
  FileBlueprint,
  BlueprintViolation,
  CodingGateResult,
  BlueprintValidationReport,
  FileBlueprintQuery,
  FileBlueprintSummary,
} from './file-blueprint/index.ts'
export {
  ElementRegistryEngine,
  createRegisterElementTool,
  createBulkRegisterElementsTool,
  createFindElementTool,
  createElementRegistryReportTool,
  createValidateElementRegistryTool,
  createGetNextSequenceTool,
  ALL_ELEMENT_TYPES,
  ELEMENT_TYPE_PREFIXES,
  ELEMENT_TYPE_LABELS,
  ELEMENT_TYPE_ICONS,
  ELEMENT_STATUS_LABELS,
  ELEMENT_STATUS_ICONS,
  generateElementId,
  parseElementId,
  sequenceKey,
} from './element-registry/index.ts'
export type {
  ElementType,
  ElementStatus,
  ElementEntry,
  ElementRegistry,
  ElementQuery,
  RegistryViolation,
  RegistryValidationReport,
  ElementRegistrySummary,
} from './element-registry/index.ts'
export {
  RuleGovernanceEngine,
  createRegisterRuleTool,
  createValidateAgainstRulesTool,
  createEnforceRuleGateTool,
  createRuleRegistryReportTool,
  createQueryRulesTool,
  createDeactivateRuleTool,
  ALL_CATEGORIES as ALL_RULE_CATEGORIES,
  RULE_CATEGORY_PREFIXES,
  RULE_CATEGORY_LABELS,
  RULE_CATEGORY_ICONS,
  RULE_SEVERITY_LABELS,
  RULE_SEVERITY_ICONS,
  RULE_STATUS_LABELS,
  RULE_STATUS_ICONS,
  generateRuleId,
  parseRuleId,
  categorySequenceKey,
} from './rule-governance/index.ts'
export type {
  RuleCategory,
  RuleSeverity,
  RuleStatus,
  ValidationType,
  RuleValidator,
  RuleEntry,
  RuleValidationResult,
  RuleGateResult,
  RegistryHealthReport,
  RegistryIssue,
  RuleQuery,
  RuleRegistrySummary,
} from './rule-governance/index.ts'
export {
  DependencyMappingEngine,
  createBuildDependencyGraphTool,
  createValidateDependencyGraphTool,
  createAnalyzeImpactTool,
  createGetExecutionOrderTool,
  createGetDependencyHealthTool,
  createExportDependencyGraphTool,
  MODULE_ID_PATTERN,
  SCHOOL_ERP_PREFIXES,
} from './dependency-mapping/index.ts'
export type {
  DepNodeKind,
  DepNode,
  DepEdgeKind,
  DepEdge,
  GraphIssueSeverity,
  GraphIssue,
  ImpactResult,
  GraphHealth,
  DependencyMappingResult,
} from './dependency-mapping/index.ts'
export {
  TaskDecompositionEngine,
  createCreateTaskTool,
  createDecomposeTaskTool,
  createUpdateTaskStatusTool,
  createValidateTasksTool,
  createGetTaskSummaryTool,
  createGetTaskExecutionOrderTool,
  createGetReadyTasksTool,
  createGetTaskTraceabilityTool,
  createGetTaskTreeTool,
} from './task-decomposition/index.ts'
export type {
  TaskLevel,
  TaskCategory,
  Effort,
  TaskStatus,
  TaskPriority,
  TraceabilityChain,
  Task,
  TaskIssue,
  TaskSummary,
  TaskTreeNode,
  TaskDecompositionResult,
} from './task-decomposition/index.ts'
export {
  PreCodingAuditEngine,
  createRunPreCodingAuditTool,
  createCheckCodingReadinessTool,
} from './pre-coding-audit/index.ts'
export type {
  AuditCategory,
  AuditCheckStatus,
  CheckSeverity,
  AuditCheck,
  AuditVerdict,
  AuditConfig,
  PreCodingAuditResult,
} from './pre-coding-audit/index.ts'
export {
  createCheckModuleExitGateTool,
  resetExitGateEngine,
  getExitGateEngine,
} from './module-exit-gate/index.ts'
export {
  VerticalSliceEngine,
  createCreateVerticalSliceTool,
  createStartSliceLayerTool,
  createCompleteSliceLayerTool,
  createFailSliceLayerTool,
  createSkipSliceLayerTool,
  createValidateSliceTool,
  createGetSliceStatusTool,
  createGetSliceSummaryTool,
  createBlockSliceTool,
  createUnblockSliceTool,
  createCompleteVerticalSliceTool,
  createGetModuleSlicesTool,
  LAYER_LABELS,
  LAYER_ORDER,
} from './vertical-slice/index.ts'
export type {
  SliceStatus,
  LayerStatus,
  LayerId,
  SliceLayer,
  SliceValidation,
  SliceTraceability,
  VerticalSlice,
  SliceSummary,
  SliceIssue,
  SliceValidationResult,
} from './vertical-slice/index.ts'
export {
  createInitiateRepairTool,
  createExpandRepairScopeTool,
  createCompleteRepairTool,
  getRepairCache,
  resetRepairEngine,
} from './repair-engine/index.ts'
export {
  GoldenJourneyEngine,
  createDefineJourneyTool,
  createStartJourneyTool,
  createAdvanceJourneyStepTool,
  createFailJourneyStepTool,
  createPauseJourneyTool,
  createResumeJourneyTool,
  createGetJourneyStatusTool,
  createListJourneysTool,
  createExportJourneyRegressionTool,
  createRerunJourneyRegressionTool,
  getActiveEngine as getActiveJourneyEngine,
  resetEngine as resetJourneyEngine,
} from './golden-journey/index.ts'
export type {
  JourneyId,
  ExecutionId,
  JourneyStatus,
  JourneyStepStatus,
  JourneyAssertion,
  JourneyStepDefinition,
  JourneyDefinition,
  JourneyEvidence,
  AssertionResult,
  JourneyStepExecution,
  JourneyExecution,
  JourneyRegressionFixture,
  JourneyRegistry,
  JourneyQuery,
  JourneySummary,
  ExecutionSummary,
  StepComparison,
  RegressionReplayReport,
} from './golden-journey/index.ts'
export {
  ContextPackEngine,
  createBuildContextPackTool,
  createGetContextPackManifestTool,
  createEstimateContextSizeTool,
  getActiveEngine as getActiveContextPackEngine,
  resetEngine as resetContextPackEngine,
} from './context-pack/index.ts'
export type {
  ContextPackRequest,
  ManifestItemMeta,
  ContextPackManifest,
  ContextPackSection,
  ContextPack,
  ContextPackSummary,
} from './context-pack/index.ts'
export {
  IndexNavigatorEngine,
  createNavigateIndexesTool,
  createCheckIndexStalenessTool,
  createRepairIndexBoundedTool,
  createDeduplicateContextTool,
  createEstimateContextTokensTool,
  createExpandScopeByDependencyTool,
  createReuseEvidenceTool,
  getActiveEngine as getActiveIndexNavigatorEngine,
  resetEngine as resetIndexNavigatorEngine,
} from './index-navigator/index.ts'
export type {
  IndexLevel,
  IndexType,
  IndexStatus,
  NavigationStep,
  IndexNavigationPlan,
  StalenessCheckResult,
  DeduplicationResult,
  TokenAccountingReport,
  IndexRepairReport,
  ScopeExpansionResult,
} from './index-navigator/index.ts'

