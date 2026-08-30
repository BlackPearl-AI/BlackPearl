/**
 * G-26 — Generic Golden Journey Engine: Cordis Tool Wrappers
 *
 * Tools:
 * - define_journey        → define a universal journey template
 * - start_journey         → start a journey execution
 * - advance_journey_step  → advance current step (pass)
 * - fail_journey_step     → fail current step
 * - pause_journey         → pause for later resumption
 * - resume_journey        → resume a paused execution
 * - get_journey_status    → query execution state
 * - list_journeys         → list defined journeys
 * - export_journey_regression → export execution as regression fixture
 * - rerun_journey_regression  → replay a regression fixture
 *
 * @module @deepseek-ai/dsh-governance-layer/golden-journey/tools
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { GoldenJourneyEngine } from './engine.ts'
import type {
  JourneyDefinition,
  JourneyStepDefinition,
  JourneyAssertion,
  JourneyEvidence,
  AssertionResult,
} from './types.ts'

// ---------------------------------------------------------------------------
// Active engine instance (per-session)
// ---------------------------------------------------------------------------

let activeEngine: GoldenJourneyEngine | undefined

/** Get active journey engine. */
export function getActiveEngine(): GoldenJourneyEngine | undefined {
  return activeEngine
}

/** Reset engine (for testing). */
export function resetEngine(): void {
  activeEngine = undefined
}

function ensureEngine(): GoldenJourneyEngine {
  if (activeEngine === undefined) {
    activeEngine = new GoldenJourneyEngine()
  }
  return activeEngine
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function presentCall(args: unknown): GenericCallView {
  const a = args as Record<string, unknown>
  const id = a['journey_id'] ?? a['execution_id'] ?? a['fixture_id'] ?? '?'
  return {
    card: 'generic',
    title: `Journey: ${String(id)}`,
    kind: 'other',
    rawInput: JSON.stringify(args),
  }
}

const JSON_OUTPUT = {
  schema: { type: 'object' as const, additionalProperties: true as const },
  render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
} as const

// ---------------------------------------------------------------------------
// Tool: define_journey
// ---------------------------------------------------------------------------

export function createDefineJourneyTool() {
  return defineTool({
    name: 'define_journey',
    description:
      'Define a Golden Journey template for any project (ERP, CRM, E-commerce, Factory, etc.). '
      + 'A journey has steps, required modules, assertions, and failure points. '
      + 'Once defined it can be started, saved, resumed, and reused for regression.',
    parameters: {
      journey_id: {
        type: 'string',
        required: true,
        description: 'Unique journey ID (e.g. "journey-student-lifecycle", "journey-checkout").',
      },
      name: {
        type: 'string',
        required: true,
        description: 'Human-readable journey name.',
      },
      description: {
        type: 'string',
        required: true,
        description: 'What this journey validates.',
      },
      project_id: {
        type: 'string',
        required: true,
        description: 'Project/domain identifier (e.g. "erp", "crm", "ecommerce", "factory").',
      },
      start_state: {
        type: 'string',
        required: true,
        description: 'Required starting state (e.g. "No students exist", "Cart has items").',
      },
      final_state: {
        type: 'string',
        required: true,
        description: 'Expected final state after all steps complete.',
      },
      steps: {
        type: 'array',
        required: true,
        description: 'Ordered steps to execute in this journey.',
        items: { type: 'object', additionalProperties: true },
      },
      tags: {
        type: 'array',
        description: 'Tags for filtering (e.g. ["smoke", "regression", "critical-path"]).',
        items: { type: 'string' },
      },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const rawSteps = (args.steps as Array<Record<string, unknown>>) ?? []

      const steps: JourneyStepDefinition[] = rawSteps.map((s, idx) => {
        const rawAssertions = (s['assertions'] as Array<Record<string, unknown>>) ?? []
        const assertions: JourneyAssertion[] = rawAssertions.map((a) => ({
          id: String(a['id'] ?? `a-${idx}`),
          description: String(a['description'] ?? ''),
          type: String(a['type'] ?? 'functional'),
          expected: a['expected'],
        }))
        return {
          id: String(s['id'] ?? `step-${String(idx).padStart(2, '0')}`),
          name: String(s['name'] ?? `Step ${idx + 1}`),
          description: String(s['description'] ?? ''),
          requiredModules: (s['required_modules'] as string[]) ?? [],
          requiredData: (s['required_data'] as string[]) ?? [],
          expectedState: String(s['expected_state'] ?? ''),
          assertions,
          failurePoints: (s['failure_points'] as string[]) ?? [],
          order: typeof s['order'] === 'number' ? s['order'] : idx,
        }
      })

      const def: JourneyDefinition = {
        id: args.journey_id as string,
        name: args.name as string,
        description: args.description as string,
        projectId: args.project_id as string,
        startState: args.start_state as string,
        finalState: args.final_state as string,
        steps,
        tags: (args.tags as string[]) ?? [],
        createdAt: new Date().toISOString(),
      }

      const stored = engine.defineJourney(def)
      return Promise.resolve(stored)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: start_journey
// ---------------------------------------------------------------------------

export function createStartJourneyTool() {
  return defineTool({
    name: 'start_journey',
    description: 'Start executing a defined journey. Returns an execution ID for subsequent calls.',
    parameters: {
      journey_id: {
        type: 'string',
        required: true,
        description: 'Journey ID to execute.',
      },
      context: {
        type: 'object',
        additionalProperties: true,
        description: 'Project-specific context data (e.g. student ID, cart ID, test data).',
      },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const exec = engine.startJourney(
        args.journey_id as string,
        (args.context as Record<string, unknown>) ?? {},
      )
      return Promise.resolve(exec)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: advance_journey_step
// ---------------------------------------------------------------------------

export function createAdvanceJourneyStepTool() {
  return defineTool({
    name: 'advance_journey_step',
    description:
      'Mark the current step as passed and advance to the next step. '
      + 'Provide assertion results and evidence for the completed step.',
    parameters: {
      execution_id: {
        type: 'string',
        required: true,
        description: 'Execution ID from start_journey.',
      },
      assertion_results: {
        type: 'array',
        description: 'Results of assertions for this step.',
        items: { type: 'object', additionalProperties: true },
      },
      evidence: {
        type: 'array',
        description: 'Evidence collected (screenshots, logs, API responses, etc.).',
        items: { type: 'object', additionalProperties: true },
      },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const rawAssertions = (args.assertion_results as Array<Record<string, unknown>>) ?? []
      const rawEvidence = (args.evidence as Array<Record<string, unknown>>) ?? []

      const assertionResults: AssertionResult[] = rawAssertions.map((a) => ({
        assertionId: String(a['assertion_id'] ?? ''),
        passed: Boolean(a['passed'] ?? true),
        actual: a['actual'],
        error: a['error'] as string | undefined,
      }))

      const evidence: JourneyEvidence[] = rawEvidence.map((e, idx) => ({
        id: String(e['id'] ?? `ev-${idx}`),
        type: String(e['type'] ?? 'log'),
        description: String(e['description'] ?? ''),
        artifactPath: e['artifact_path'] as string | undefined,
        capturedAt: String(e['captured_at'] ?? new Date().toISOString()),
      }))

      const updated = engine.advanceStep(args.execution_id as string, assertionResults, evidence)
      return Promise.resolve(updated)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: fail_journey_step
// ---------------------------------------------------------------------------

export function createFailJourneyStepTool() {
  return defineTool({
    name: 'fail_journey_step',
    description: 'Mark the current step as failed and terminate the journey execution.',
    parameters: {
      execution_id: {
        type: 'string',
        required: true,
        description: 'Execution ID.',
      },
      reason: {
        type: 'string',
        required: true,
        description: 'Failure reason.',
      },
      evidence: {
        type: 'array',
        description: 'Evidence collected at failure point.',
        items: { type: 'object', additionalProperties: true },
      },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const rawEvidence = (args.evidence as Array<Record<string, unknown>>) ?? []
      const evidence: JourneyEvidence[] = rawEvidence.map((e, idx) => ({
        id: String(e['id'] ?? `ev-${idx}`),
        type: String(e['type'] ?? 'log'),
        description: String(e['description'] ?? ''),
        artifactPath: e['artifact_path'] as string | undefined,
        capturedAt: new Date().toISOString(),
      }))
      const updated = engine.failStep(args.execution_id as string, args.reason as string, evidence)
      return Promise.resolve(updated)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: pause_journey
// ---------------------------------------------------------------------------

export function createPauseJourneyTool() {
  return defineTool({
    name: 'pause_journey',
    description: 'Pause a running journey execution for later resumption.',
    parameters: {
      execution_id: { type: 'string', required: true, description: 'Execution ID.' },
      reason: { type: 'string', required: true, description: 'Why it is being paused.' },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const updated = engine.pauseJourney(args.execution_id as string, args.reason as string)
      return Promise.resolve(updated)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: resume_journey
// ---------------------------------------------------------------------------

export function createResumeJourneyTool() {
  return defineTool({
    name: 'resume_journey',
    description: 'Resume a paused journey execution from the current step.',
    parameters: {
      execution_id: { type: 'string', required: true, description: 'Execution ID to resume.' },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const updated = engine.resumeJourney(args.execution_id as string)
      return Promise.resolve(updated)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: get_journey_status
// ---------------------------------------------------------------------------

export function createGetJourneyStatusTool() {
  return defineTool({
    name: 'get_journey_status',
    description: 'Query the current status of a journey execution.',
    parameters: {
      execution_id: { type: 'string', required: true, description: 'Execution ID.' },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const exec = engine.getExecution(args.execution_id as string)
      if (exec === undefined) {
        throw new Error(`execution "${String(args.execution_id)}" not found`)
      }
      return Promise.resolve(exec)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: list_journeys
// ---------------------------------------------------------------------------

export function createListJourneysTool() {
  return defineTool({
    name: 'list_journeys',
    description: 'List all defined journeys, optionally filtered by project or tags.',
    parameters: {
      project_id: { type: 'string', description: 'Filter by project ID.' },
      tags: { type: 'array', description: 'Filter by tags (must have all).', items: { type: 'string' } },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const summaries = engine.listJourneys({
        projectId: args.project_id as string | undefined,
        tags: args.tags as string[] | undefined,
      })
      return Promise.resolve({ journeys: summaries, count: summaries.length })
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: export_journey_regression
// ---------------------------------------------------------------------------

export function createExportJourneyRegressionTool() {
  return defineTool({
    name: 'export_journey_regression',
    description:
      'Export a completed journey execution as a regression fixture. '
      + 'The fixture captures the journey definition and execution record for replay.',
    parameters: {
      execution_id: { type: 'string', required: true, description: 'Execution ID to export.' },
      is_golden: { type: 'boolean', description: 'Mark as canonical golden reference (default false).' },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const fixture = engine.exportForRegression(
        args.execution_id as string,
        (args.is_golden as boolean | undefined) ?? false,
      )
      return Promise.resolve(fixture)
    },
    presentCall,
  })
}

// ---------------------------------------------------------------------------
// Tool: rerun_journey_regression
// ---------------------------------------------------------------------------

export function createRerunJourneyRegressionTool() {
  return defineTool({
    name: 'rerun_journey_regression',
    description:
      'Replay a regression fixture to verify nothing has regressed. '
      + 'Returns a comparison report showing expected vs actual step outcomes.',
    parameters: {
      fixture_id: { type: 'string', required: true, description: 'Fixture ID from export_journey_regression.' },
    },
    output: JSON_OUTPUT,
    execute(args) {
      const engine = ensureEngine()
      const report = engine.rerunRegression(args.fixture_id as string)
      return Promise.resolve(report)
    },
    presentCall,
  })
}
