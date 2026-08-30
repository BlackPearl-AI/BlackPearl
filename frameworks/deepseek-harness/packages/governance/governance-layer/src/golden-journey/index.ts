/**
 * G-26 — Generic Golden Journey Engine: barrel exports.
 *
 * @module @deepseek-ai/dsh-governance-layer/golden-journey
 */

export { GoldenJourneyEngine } from './engine.ts'

export {
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
  getActiveEngine,
  resetEngine,
} from './tools.ts'

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
} from './types.ts'

export type {
  StepComparison,
  RegressionReplayReport,
} from './engine.ts'
