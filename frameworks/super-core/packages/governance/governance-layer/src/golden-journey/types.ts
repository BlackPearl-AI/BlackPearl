/**
 * G-26 — Generic Golden Journey Engine: Types
 *
 * Universal journey system — किसी भी project पर काम करे:
 * ERP, CRM, Pathology, Factory, E-commerce, Desktop App, etc.
 *
 * Engine UNIVERSAL है। कोई project-specific hardcode नहीं।
 * हर project अपने Golden Journeys define करता है।
 *
 * @module @deepseek-ai/dsh-governance-layer/golden-journey/types
 */

// ---------------------------------------------------------------------------
// Journey Definition
// ---------------------------------------------------------------------------

/** Unique branded journey identifier. */
export type JourneyId = string

/** Unique branded execution identifier. */
export type ExecutionId = string

/** Current status of a journey execution. */
export type JourneyStatus =
  | 'not-started'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'

/** Current status of a single step within an execution. */
export type JourneyStepStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'

// ---------------------------------------------------------------------------
// Journey Assertion
// ---------------------------------------------------------------------------

/**
 * A verifiable assertion attached to a journey or step.
 * Generic — caller defines what to assert.
 */
export interface JourneyAssertion {
  /** Assertion ID within this journey. */
  readonly id: string
  /** Human-readable description. */
  readonly description: string
  /** Type of assertion (functional, performance, data-integrity, ui, etc.). */
  readonly type: string
  /** Expected value or condition (domain-specific). */
  readonly expected: unknown
}

// ---------------------------------------------------------------------------
// Journey Step Definition
// ---------------------------------------------------------------------------

/**
 * One step in a journey definition.
 * Completely generic — domain is set by the project.
 */
export interface JourneyStepDefinition {
  /** Step ID within this journey (e.g. "step-01"). */
  readonly id: string
  /** Human-readable step name (e.g. "Enrollment", "Payment", "Invoice Print"). */
  readonly name: string
  /** Description of what this step does. */
  readonly description: string
  /** Modules required to be active for this step. */
  readonly requiredModules: readonly string[]
  /** Data required as input for this step. */
  readonly requiredData: readonly string[]
  /** Expected state after this step completes. */
  readonly expectedState: string
  /** Assertions to verify after step execution. */
  readonly assertions: readonly JourneyAssertion[]
  /** Known failure points to watch for. */
  readonly failurePoints: readonly string[]
  /** Order index (0-based). */
  readonly order: number
}

// ---------------------------------------------------------------------------
// Journey Definition (the template)
// ---------------------------------------------------------------------------

/**
 * A complete Golden Journey definition.
 *
 * Example (Student ERP):
 *   id: "journey-student-enrollment"
 *   name: "Student Full Lifecycle"
 *   startState: "No students exist"
 *   steps: [Enrollment, Fee, Attendance, Results, Certificate]
 *
 * Example (E-commerce):
 *   id: "journey-checkout"
 *   name: "Checkout Flow"
 *   startState: "Cart has items"
 *   steps: [Address, Payment, Confirmation, Email, Dispatch]
 *
 * Engine is the same — only the definition differs.
 */
export interface JourneyDefinition {
  /** Unique journey identifier. */
  readonly id: JourneyId
  /** Human-readable journey name. */
  readonly name: string
  /** Description of what this journey validates. */
  readonly description: string
  /** Required starting state (domain-specific, free text). */
  readonly startState: string
  /** Expected final state after all steps. */
  readonly finalState: string
  /** Ordered steps to execute. */
  readonly steps: readonly JourneyStepDefinition[]
  /** Tags for filtering/grouping (e.g. ["smoke", "regression", "critical-path"]). */
  readonly tags: readonly string[]
  /** Project/domain identifier (e.g. "erp", "crm", "ecommerce"). */
  readonly projectId: string
  /** Creation timestamp. */
  readonly createdAt: string
}

// ---------------------------------------------------------------------------
// Journey Step Execution (runtime record)
// ---------------------------------------------------------------------------

/** Evidence attached to a step execution. */
export interface JourneyEvidence {
  /** Evidence ID. */
  readonly id: string
  /** Type (screenshot, log, api-response, test-output, etc.). */
  readonly type: string
  /** Human-readable description. */
  readonly description: string
  /** Optional artifact path or URL. */
  readonly artifactPath?: string
  /** Timestamp. */
  readonly capturedAt: string
}

/** Assertion result after step execution. */
export interface AssertionResult {
  readonly assertionId: string
  readonly passed: boolean
  readonly actual: unknown
  readonly error?: string
}

/** Runtime state of one step in an execution. */
export interface JourneyStepExecution {
  readonly stepId: string
  readonly status: JourneyStepStatus
  readonly startedAt?: string
  readonly completedAt?: string
  readonly assertionResults: readonly AssertionResult[]
  readonly evidence: readonly JourneyEvidence[]
  readonly failureReason?: string
}

// ---------------------------------------------------------------------------
// Journey Execution (runtime record)
// ---------------------------------------------------------------------------

/**
 * A running or completed journey execution.
 * Saved so it can be resumed or replayed as regression.
 */
export interface JourneyExecution {
  /** Unique execution ID. */
  readonly id: ExecutionId
  /** Which journey this executes. */
  readonly journeyId: JourneyId
  /** Overall status. */
  readonly status: JourneyStatus
  /** Index of the current step (0-based). */
  readonly currentStepIndex: number
  /** Per-step runtime records. */
  readonly steps: readonly JourneyStepExecution[]
  /** Context data provided at start (project-specific). */
  readonly context: Record<string, unknown>
  /** Started at timestamp. */
  readonly startedAt: string
  /** Completed at timestamp. */
  readonly completedAt?: string
  /** Pause reason (if paused). */
  readonly pauseReason?: string
  /** Overall failure reason (if failed). */
  readonly failureReason?: string
}

// ---------------------------------------------------------------------------
// Regression Fixture
// ---------------------------------------------------------------------------

/**
 * A saved regression fixture for replay.
 * Contains the full journey definition + execution record.
 */
export interface JourneyRegressionFixture {
  /** Fixture ID. */
  readonly id: string
  /** Journey definition at time of export. */
  readonly journeyDefinition: JourneyDefinition
  /** Execution record to replay. */
  readonly execution: JourneyExecution
  /** Whether this fixture is the canonical "golden" reference. */
  readonly isGolden: boolean
  /** Export timestamp. */
  readonly exportedAt: string
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/** In-memory registry of all defined journeys. */
export interface JourneyRegistry {
  readonly journeys: ReadonlyMap<JourneyId, JourneyDefinition>
  readonly executions: ReadonlyMap<ExecutionId, JourneyExecution>
  readonly fixtures: ReadonlyMap<string, JourneyRegressionFixture>
}

// ---------------------------------------------------------------------------
// Query / Summary
// ---------------------------------------------------------------------------

/** Query filter for listing journeys. */
export interface JourneyQuery {
  readonly projectId?: string
  readonly tags?: readonly string[]
  readonly status?: JourneyStatus
}

/** Summary view of one journey for listing. */
export interface JourneySummary {
  readonly id: JourneyId
  readonly name: string
  readonly projectId: string
  readonly stepCount: number
  readonly tags: readonly string[]
  readonly createdAt: string
}

/** Summary of an execution for listing. */
export interface ExecutionSummary {
  readonly id: ExecutionId
  readonly journeyId: JourneyId
  readonly journeyName: string
  readonly status: JourneyStatus
  readonly currentStepIndex: number
  readonly totalSteps: number
  readonly passedSteps: number
  readonly failedSteps: number
  readonly startedAt: string
  readonly completedAt?: string
}
