/**
 * MASTER-GOAL: The single, authoritative definition of what the product is,
 * what it does, what it does NOT do, and how success is measured.
 *
 * Every decision, every module, every line of code is verified against
 * this definition. It is the source of truth for the entire lifecycle.
 *
 * @module @deepseek-ai/dsh-governance-layer/master-goal/types
 */

// ---------------------------------------------------------------------------
// Core Definition
// ---------------------------------------------------------------------------

/**
 * The MASTER-GOAL: an authoritative product definition.
 *
 * This is NOT a task list. It is a statement of WHAT the product is
 * and HOW we know it is done.
 */
export interface MasterGoalDefinition {
  /** Unique goal id. */
  readonly id: string
  /** One-sentence product identity: what IS this product? */
  readonly identity: string
  /** Detailed product description (2-5 sentences). */
  readonly description: string
  /** What the product DOES — core capabilities. */
  readonly scope: ProductScope
  /** How we know the product is complete. */
  readonly acceptanceCriteria: AcceptanceCriteria
  /** Non-functional requirements. */
  readonly qualityAttributes: QualityAttributes
  /** Version of this definition. */
  readonly version: string
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string
  /** ISO-8601 last update timestamp. */
  readonly updatedAt: string
}

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

/**
 * Product scope: what is IN and what is OUT.
 */
export interface ProductScope {
  /** Core capabilities the product MUST have. */
  readonly included: readonly ScopeItem[]
  /** Capabilities the product MUST NOT have (scope boundaries). */
  readonly excluded: readonly ScopeItem[]
  /** Capabilities deferred to a future version. */
  readonly deferred: readonly ScopeItem[]
}

/**
 * One scope item: a named capability with a brief description.
 */
export interface ScopeItem {
  /** Unique capability id (e.g. "student-management", "fee-collection"). */
  readonly id: string
  /** Human-readable capability name. */
  readonly name: string
  /** Brief description of what this capability means. */
  readonly description: string
  /** Priority: must-have, should-have, nice-to-have. */
  readonly priority: 'must-have' | 'should-have' | 'nice-to-have'
}

// ---------------------------------------------------------------------------
// Acceptance Criteria
// ---------------------------------------------------------------------------

/**
 * How we know the product is complete and correct.
 */
export interface AcceptanceCriteria {
  /** Functional criteria: what the product must DO. */
  readonly functional: readonly Criterion[]
  /** Integration criteria: how modules must work together. */
  readonly integration: readonly Criterion[]
  /** User experience criteria: how the product must FEEL. */
  readonly userExperience: readonly Criterion[]
}

/**
 * One acceptance criterion.
 */
export interface Criterion {
  /** Unique criterion id. */
  readonly id: string
  /** What must be true (human-readable). */
  readonly statement: string
  /** How to verify this criterion (test method). */
  readonly verificationMethod: 'test' | 'manual' | 'audit' | 'observation'
  /** Module id this criterion applies to (if any). */
  readonly moduleId?: string
  /** Current verification status. */
  readonly status: 'unverified' | 'verified' | 'failed'
}

// ---------------------------------------------------------------------------
// Quality Attributes
// ---------------------------------------------------------------------------

/**
 * Non-functional requirements the product must meet.
 */
export interface QualityAttributes {
  /** Performance requirements. */
  readonly performance?: readonly string[]
  /** Security requirements. */
  readonly security?: readonly string[]
  /** Scalability requirements. */
  readonly scalability?: readonly string[]
  /** Usability requirements. */
  readonly usability?: readonly string[]
  /** Reliability requirements. */
  readonly reliability?: readonly string[]
  /** Maintainability requirements. */
  readonly maintainability?: readonly string[]
}

// ---------------------------------------------------------------------------
// Progress Tracking
// ---------------------------------------------------------------------------

/**
 * Progress against the MASTER-GOAL.
 */
export interface MasterGoalProgress {
  /** Total included scope items. */
  readonly totalScopeItems: number
  /** Scope items implemented (module completed). */
  readonly implementedScopeItems: number
  /** Total acceptance criteria. */
  readonly totalCriteria: number
  /** Criteria verified. */
  readonly verifiedCriteria: number
  /** Criteria failed. */
  readonly failedCriteria: number
  /** Overall progress score (0-100). */
  readonly score: number
  /** Module completion status. */
  readonly modules: readonly ModuleProgressEntry[]
}

/**
 * Progress for one module against the MASTER-GOAL.
 */
export interface ModuleProgressEntry {
  /** Module id. */
  readonly moduleId: string
  /** Module name. */
  readonly moduleName: string
  /** Status. */
  readonly status: 'pending' | 'in-progress' | 'completed' | 'failed'
  /** Scope items covered by this module. */
  readonly scopeItems: readonly string[]
  /** Acceptance criteria covered by this module. */
  readonly criteria: readonly string[]
}

// ---------------------------------------------------------------------------
// Verification Result
// ---------------------------------------------------------------------------

/**
 * Result of verifying a decision or implementation against the MASTER-GOAL.
 */
export interface GoalVerificationResult {
  /** Whether the decision/implementation is consistent with the goal. */
  readonly consistent: boolean
  /** Score: how well it aligns (0-100). */
  readonly alignmentScore: number
  /** Reasons for the score. */
  readonly reasons: readonly string[]
  /** Any scope violations (doing something OUT of scope). */
  readonly scopeViolations: readonly string[]
  /** Any missing criteria (not doing something IN scope). */
  readonly missingCriteria: readonly string[]
}
