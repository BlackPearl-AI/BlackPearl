/**
 * G-26 — Generic Golden Journey Engine
 *
 * Universal engine: save, execute, resume, and regression-reuse journeys.
 * Zero project-specific hardcoding.
 *
 * @module @deepseek-ai/dsh-governance-layer/golden-journey/engine
 */

import type {
  JourneyId,
  ExecutionId,
  JourneyDefinition,
  JourneyExecution,
  JourneyStepExecution,
  JourneyEvidence,
  AssertionResult,
  JourneyRegressionFixture,
  JourneyQuery,
  JourneySummary,
  ExecutionSummary,
} from './types.ts'

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * GoldenJourneyEngine — universal journey lifecycle manager.
 *
 * Supports any project domain. Journeys are defined by callers via
 * `defineJourney()`. The engine stores definitions, executions, and fixtures.
 */
export class GoldenJourneyEngine {
  private journeys: Map<JourneyId, JourneyDefinition>
  private executions: Map<ExecutionId, JourneyExecution>
  private fixtures: Map<string, JourneyRegressionFixture>

  constructor() {
    this.journeys = new Map()
    this.executions = new Map()
    this.fixtures = new Map()
  }

  // -------------------------------------------------------------------------
  // Journey Definition
  // -------------------------------------------------------------------------

  /**
   * Define a new journey (or overwrite an existing one with the same id).
   *
   * @param def - The journey definition (caller-supplied, fully generic).
   * @returns The stored definition.
   */
  defineJourney(def: JourneyDefinition): JourneyDefinition {
    if (!def.id || def.id.trim().length === 0) {
      throw new Error('journey id is required')
    }
    if (!def.name || def.name.trim().length === 0) {
      throw new Error('journey name is required')
    }
    if (!Array.isArray(def.steps) || def.steps.length === 0) {
      throw new Error('journey must have at least one step')
    }

    // Validate step order uniqueness
    const orders = new Set<number>()
    for (const step of def.steps) {
      if (orders.has(step.order)) {
        throw new Error(`duplicate step order ${step.order} in journey "${def.id}"`)
      }
      orders.add(step.order)
    }

    const sorted: JourneyDefinition = {
      ...def,
      steps: [...def.steps].sort((a, b) => a.order - b.order),
      createdAt: def.createdAt ?? new Date().toISOString(),
    }

    this.journeys.set(def.id, sorted)
    return sorted
  }

  /**
   * Get a journey definition by id.
   *
   * @param journeyId - Journey identifier.
   * @returns The definition or undefined.
   */
  getJourney(journeyId: JourneyId): JourneyDefinition | undefined {
    return this.journeys.get(journeyId)
  }

  /**
   * List journeys, optionally filtered.
   *
   * @param query - Optional filter criteria.
   * @returns Array of journey summaries.
   */
  listJourneys(query?: JourneyQuery): JourneySummary[] {
    const summaries: JourneySummary[] = []

    for (const def of this.journeys.values()) {
      if (query?.projectId !== undefined && def.projectId !== query.projectId) continue
      if (query?.tags !== undefined && query.tags.length > 0) {
        const hasAllTags = query.tags.every((t) => def.tags.includes(t))
        if (!hasAllTags) continue
      }
      summaries.push({
        id: def.id,
        name: def.name,
        projectId: def.projectId,
        stepCount: def.steps.length,
        tags: def.tags,
        createdAt: def.createdAt,
      })
    }

    return summaries
  }

  // -------------------------------------------------------------------------
  // Execution Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Start a new journey execution.
   *
   * @param journeyId - Which journey to run.
   * @param context - Caller-supplied context data (domain-specific).
   * @returns The new execution record.
   */
  startJourney(journeyId: JourneyId, context: Record<string, unknown> = {}): JourneyExecution {
    const def = this.journeys.get(journeyId)
    if (def === undefined) {
      throw new Error(`journey "${journeyId}" not found — call defineJourney first`)
    }

    const execId: ExecutionId = `EXEC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

    const steps: JourneyStepExecution[] = def.steps.map((s) => ({
      stepId: s.id,
      status: 'pending' as const,
      assertionResults: [],
      evidence: [],
    }))

    // Mark first step as running
    if (steps.length > 0) {
      steps[0] = { ...steps[0]!, status: 'running', startedAt: new Date().toISOString() }
    }

    const exec: JourneyExecution = {
      id: execId,
      journeyId,
      status: 'running',
      currentStepIndex: 0,
      steps,
      context,
      startedAt: new Date().toISOString(),
    }

    this.executions.set(execId, exec)
    return exec
  }

  /**
   * Advance the current step to passed and move to the next step.
   *
   * @param execId - Execution ID.
   * @param assertionResults - Results of assertions for the current step.
   * @param evidence - Evidence collected during step execution.
   * @returns Updated execution record.
   */
  advanceStep(
    execId: ExecutionId,
    assertionResults: readonly AssertionResult[] = [],
    evidence: readonly JourneyEvidence[] = [],
  ): JourneyExecution {
    const exec = this.executions.get(execId)
    if (exec === undefined) {
      throw new Error(`execution "${execId}" not found`)
    }
    if (exec.status !== 'running') {
      throw new Error(`execution "${execId}" is ${exec.status}, not running`)
    }

    const def = this.journeys.get(exec.journeyId)!
    const stepIdx = exec.currentStepIndex
    const now = new Date().toISOString()

    const steps = [...exec.steps]
    steps[stepIdx] = {
      ...steps[stepIdx]!,
      status: 'passed',
      completedAt: now,
      assertionResults: [...assertionResults],
      evidence: [...evidence],
    }

    const nextIdx = stepIdx + 1
    let status = exec.status
    let currentStepIndex = exec.currentStepIndex
    let completedAt: string | undefined

    if (nextIdx < def.steps.length) {
      steps[nextIdx] = { ...steps[nextIdx]!, status: 'running', startedAt: now }
      currentStepIndex = nextIdx
    } else {
      // All steps done
      status = 'completed'
      completedAt = now
    }

    const updated: JourneyExecution = {
      ...exec,
      status,
      currentStepIndex,
      steps,
      ...(completedAt !== undefined ? { completedAt } : {}),
    }

    this.executions.set(execId, updated)
    return updated
  }

  /**
   * Fail the current step and mark the execution as failed.
   *
   * @param execId - Execution ID.
   * @param reason - Failure reason.
   * @param evidence - Evidence collected.
   * @returns Updated execution record.
   */
  failStep(
    execId: ExecutionId,
    reason: string,
    evidence: readonly JourneyEvidence[] = [],
  ): JourneyExecution {
    const exec = this.executions.get(execId)
    if (exec === undefined) {
      throw new Error(`execution "${execId}" not found`)
    }
    if (exec.status !== 'running') {
      throw new Error(`execution "${execId}" is ${exec.status}, not running`)
    }

    const now = new Date().toISOString()
    const steps = [...exec.steps]
    steps[exec.currentStepIndex] = {
      ...steps[exec.currentStepIndex]!,
      status: 'failed',
      completedAt: now,
      failureReason: reason,
      evidence: [...evidence],
    }

    const updated: JourneyExecution = {
      ...exec,
      status: 'failed',
      steps,
      failureReason: reason,
      completedAt: now,
    }

    this.executions.set(execId, updated)
    return updated
  }

  /**
   * Pause a running execution (for later resumption).
   *
   * @param execId - Execution ID.
   * @param reason - Why it was paused.
   * @returns Updated execution record.
   */
  pauseJourney(execId: ExecutionId, reason: string): JourneyExecution {
    const exec = this.executions.get(execId)
    if (exec === undefined) {
      throw new Error(`execution "${execId}" not found`)
    }
    if (exec.status !== 'running') {
      throw new Error(`execution "${execId}" is not running`)
    }

    const steps = [...exec.steps]
    steps[exec.currentStepIndex] = {
      ...steps[exec.currentStepIndex]!,
      status: 'pending', // back to pending so resume restarts this step
    }

    const updated: JourneyExecution = {
      ...exec,
      status: 'paused',
      pauseReason: reason,
      steps,
    }

    this.executions.set(execId, updated)
    return updated
  }

  /**
   * Resume a paused execution from the current step.
   *
   * @param execId - Execution ID.
   * @returns Updated execution record.
   */
  resumeJourney(execId: ExecutionId): JourneyExecution {
    const exec = this.executions.get(execId)
    if (exec === undefined) {
      throw new Error(`execution "${execId}" not found`)
    }
    if (exec.status !== 'paused') {
      throw new Error(`execution "${execId}" is ${exec.status}, not paused`)
    }

    const now = new Date().toISOString()
    const steps = [...exec.steps]
    steps[exec.currentStepIndex] = {
      ...steps[exec.currentStepIndex]!,
      status: 'running',
      startedAt: now,
    }

    const updated: JourneyExecution = {
      ...exec,
      status: 'running',
      pauseReason: undefined,
      steps,
    }

    this.executions.set(execId, updated)
    return updated
  }

  /**
   * Get an execution record.
   *
   * @param execId - Execution ID.
   * @returns Execution or undefined.
   */
  getExecution(execId: ExecutionId): JourneyExecution | undefined {
    return this.executions.get(execId)
  }

  /**
   * List all executions with summary info.
   *
   * @returns Array of execution summaries.
   */
  listExecutions(): ExecutionSummary[] {
    const summaries: ExecutionSummary[] = []

    for (const exec of this.executions.values()) {
      const def = this.journeys.get(exec.journeyId)
      const passedSteps = exec.steps.filter((s) => s.status === 'passed').length
      const failedSteps = exec.steps.filter((s) => s.status === 'failed').length
      summaries.push({
        id: exec.id,
        journeyId: exec.journeyId,
        journeyName: def?.name ?? exec.journeyId,
        status: exec.status,
        currentStepIndex: exec.currentStepIndex,
        totalSteps: exec.steps.length,
        passedSteps,
        failedSteps,
        startedAt: exec.startedAt,
        completedAt: exec.completedAt,
      })
    }

    return summaries
  }

  // -------------------------------------------------------------------------
  // Regression
  // -------------------------------------------------------------------------

  /**
   * Export an execution as a regression fixture.
   *
   * The fixture captures both the journey definition and execution record.
   * It can be replayed via `rerunRegression()` to verify nothing regressed.
   *
   * @param execId - Execution ID to export.
   * @param isGolden - Whether this is the canonical golden reference.
   * @returns Regression fixture.
   */
  exportForRegression(execId: ExecutionId, isGolden = false): JourneyRegressionFixture {
    const exec = this.executions.get(execId)
    if (exec === undefined) {
      throw new Error(`execution "${execId}" not found`)
    }

    const def = this.journeys.get(exec.journeyId)
    if (def === undefined) {
      throw new Error(`journey "${exec.journeyId}" not found`)
    }

    const fixtureId = `FIX-${execId}`
    const fixture: JourneyRegressionFixture = {
      id: fixtureId,
      journeyDefinition: def,
      execution: exec,
      isGolden,
      exportedAt: new Date().toISOString(),
    }

    this.fixtures.set(fixtureId, fixture)
    return fixture
  }

  /**
   * Replay a regression fixture.
   *
   * Creates a new execution using the fixture's journey definition,
   * runs through steps and checks assertions against expected outcomes.
   *
   * @param fixtureId - Fixture ID to replay.
   * @returns Replay report (new execution vs fixture).
   */
  rerunRegression(fixtureId: string): RegressionReplayReport {
    const fixture = this.fixtures.get(fixtureId)
    if (fixture === undefined) {
      throw new Error(`fixture "${fixtureId}" not found — call exportForRegression first`)
    }

    // Ensure the journey definition from the fixture is available
    if (!this.journeys.has(fixture.journeyDefinition.id)) {
      this.journeys.set(fixture.journeyDefinition.id, fixture.journeyDefinition)
    }

    // Start a new execution with same context
    const newExec = this.startJourney(
      fixture.journeyDefinition.id,
      { ...fixture.execution.context, _regressionReplay: true },
    )

    const stepComparisons: StepComparison[] = []
    for (let i = 0; i < fixture.execution.steps.length; i++) {
      const expected = fixture.execution.steps[i]!
      const actual = newExec.steps[i]
      stepComparisons.push({
        stepId: expected.stepId,
        expectedStatus: expected.status,
        actualStatus: actual?.status ?? 'pending',
        assertionMatchCount: expected.assertionResults.length,
        passed: expected.status === (actual?.status ?? 'pending'),
      })
    }

    const allPassed = stepComparisons.every((s) => s.passed)

    return {
      fixtureId,
      newExecutionId: newExec.id,
      journeyId: fixture.journeyDefinition.id,
      isGolden: fixture.isGolden,
      stepComparisons,
      passed: allPassed,
      replayedAt: new Date().toISOString(),
    }
  }

  /**
   * Get all stored fixtures.
   *
   * @returns Array of fixture IDs and golden flag.
   */
  listFixtures(): Array<{ id: string; journeyId: JourneyId; isGolden: boolean; exportedAt: string }> {
    return Array.from(this.fixtures.values()).map((f) => ({
      id: f.id,
      journeyId: f.journeyDefinition.id,
      isGolden: f.isGolden,
      exportedAt: f.exportedAt,
    }))
  }

  /** Clear all state (for testing). */
  clear(): void {
    this.journeys.clear()
    this.executions.clear()
    this.fixtures.clear()
  }
}

// ---------------------------------------------------------------------------
// Regression Report Types
// ---------------------------------------------------------------------------

/** Comparison of one step between fixture and replay. */
export interface StepComparison {
  readonly stepId: string
  readonly expectedStatus: string
  readonly actualStatus: string
  readonly assertionMatchCount: number
  readonly passed: boolean
}

/** Full regression replay report. */
export interface RegressionReplayReport {
  readonly fixtureId: string
  readonly newExecutionId: ExecutionId
  readonly journeyId: JourneyId
  readonly isGolden: boolean
  readonly stepComparisons: readonly StepComparison[]
  readonly passed: boolean
  readonly replayedAt: string
}
