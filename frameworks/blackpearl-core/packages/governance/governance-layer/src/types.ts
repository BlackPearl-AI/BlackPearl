/**
 * Governance Layer types: state machine, config, pre-execution decisions, and
 * completion gate contracts.
 * @module @deepseek-ai/dsh-governance-layer/types
 */

import type { Agent } from '@deepseek-ai/dsh-agent'
import type { GoalView } from '@deepseek-ai/dsh-goal'

// ---------------------------------------------------------------------------
// State Machine
// ---------------------------------------------------------------------------

/**
 * Governance phases for a goal-driven session.
 *
 * `IDLE` is the resting state: no governance policy is active. Transitions
 * happen only through explicit actions — the model's tool calls or direct
 * human commands.
 */
export type GovernancePhase =
  | 'idle'
  | 'capturing'
  | 'planning'
  | 'implementing'
  | 'testing'
  | 'auditing'
  | 'verified'

/**
 * Valid transitions: each key lists the phases it may move TO.
 */
export const VALID_TRANSITIONS: Record<GovernancePhase, readonly GovernancePhase[]> = {
  idle: ['capturing'],
  capturing: ['planning', 'idle'],
  planning: ['implementing', 'capturing'],
  implementing: ['testing', 'planning'],
  testing: ['auditing', 'implementing'],
  auditing: ['verified', 'testing'],
  verified: ['idle'],
} as const

/**
 * One governance state record, stored per-agent.
 */
export interface GovernanceState {
  /** Current phase. */
  phase: GovernancePhase
  /** Goal id governing this session, if any. */
  goalId?: string
  /** Monotonic counter of transitions for optimistic concurrency. */
  revision: number
  /** ISO-8601 timestamp of last transition. */
  lastTransitionAt: string
}

/**
 * A transition request with an audit trail.
 */
export interface GovernanceTransition {
  readonly from: GovernancePhase
  readonly to: GovernancePhase
  readonly reason: string
  readonly agentId: string
  readonly timestamp: string
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Plugin config schema. */
export interface GovernanceLayerConfig {
  /** Enable the governance prompt section (default true). */
  promptEnabled?: boolean
  /** Enable the pre-execution gate (default true). */
  preExecutionEnabled?: boolean
  /** Enable the completion gate (default true). */
  completionEnabled?: boolean
  /** Phases that allow unrestricted tool execution (default ['implementing', 'testing']). */
  unrestrictedPhases?: GovernancePhase[]
  /**
   * Tool names blocked during non-unrestricted phases. When absent, a
   * sensible default covers common state-changing tools. The list is
   * config-driven so `cordis.yml` can extend or override it.
   */
  restrictedTools?: string[]
  /**
   * Tool names always allowed regardless of phase (informational / read-only).
   * When absent, a sensible default covers common read-only tools.
   */
  exemptTools?: string[]
}

// ---------------------------------------------------------------------------
// Pre-Execution
// ---------------------------------------------------------------------------

/**
 * Pre-execution decision returned by the governance gate.
 * Mirrors the tool-runtime `PreToolDecision` shape so a listener can
 * delegate, block, or ask.
 */
export type GovernancePreDecision =
  | { kind: 'allow' }
  | { kind: 'deny'; reason: string }
  | { kind: 'ask'; reason?: string }

// ---------------------------------------------------------------------------
// Completion Gate
// ---------------------------------------------------------------------------

/**
 * One completion gate function.
 *
 * Returning `undefined` means this gate allows completion.
 * Returning a non-empty string denies completion with that reason.
 *
 * The governance gate enforces: the state machine must be in the
 * `auditing` phase for autonomous goal completion to proceed.
 */
export type GovernanceCompletionGate = (
  execution: { readonly agent: Agent; readonly goal: GoalView },
) => string | undefined

// ---------------------------------------------------------------------------
// Session Events
// ---------------------------------------------------------------------------

/** A governance phase-change event for the session log. */
export interface GovernancePhaseEvent {
  readonly type: 'governance/phase-change'
  readonly data: {
    readonly from: GovernancePhase
    readonly to: GovernancePhase
    readonly reason: string
  }
}

// ---------------------------------------------------------------------------
// .project/ Directory Structure
// ---------------------------------------------------------------------------

/**
 * Authoritative `.project/` directory structure for each target project.
 * All governance state, goals, blueprints, and evidence persist here.
 */
export interface ProjectDirectory {
  /** The root path of the .project/ directory. */
  readonly root: string
}

/** Top-level MASTER-GOAL.json contents. */
export interface MasterGoal {
  /** Unique identifier for the master goal. */
  readonly id: string
  /** The high-level objective. */
  readonly objective: string
  /** Current status. */
  readonly status: 'active' | 'completed' | 'paused'
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string
  /** ISO-8601 last update timestamp. */
  readonly updatedAt: string
}

/** One entry in conversation-ledger.jsonl. */
export interface ConversationLedgerEntry {
  /** ISO-8601 timestamp. */
  readonly timestamp: string
  /** The role (user, assistant, system). */
  readonly role: 'user' | 'assistant' | 'system'
  /** The message content. */
  readonly content: string
  /** Optional metadata. */
  readonly meta?: Record<string, unknown>
}

/** Goal index entry (goal-index.json). */
export interface GoalIndexEntry {
  /** Goal directory name (e.g. "G-001"). */
  readonly dir: string
  /** Goal objective summary. */
  readonly objective: string
  /** Current phase. */
  readonly phase: GovernancePhase
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string
}

/** Goal metadata (goal.json). */
export interface GoalMetadata {
  /** Goal id. */
  readonly id: string
  /** Goal objective. */
  readonly objective: string
  /** Current governance phase. */
  readonly phase: GovernancePhase
  /** Goal revision counter. */
  readonly revision: number
  /** Subgoals. */
  readonly subgoals: SubGoal[]
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string
  /** ISO-8601 last update timestamp. */
  readonly updatedAt: string
}

/** One subgoal within a goal. */
export interface SubGoal {
  /** Subgoal id. */
  readonly id: string
  /** Subgoal description. */
  readonly description: string
  /** Completion status. */
  readonly status: 'pending' | 'in-progress' | 'completed'
}

/** Workflow definition (workflow.json). */
export interface WorkflowDefinition {
  /** Workflow steps. */
  readonly steps: WorkflowStep[]
  /** Current step index. */
  readonly currentStep: number
}

/** One workflow step. */
export interface WorkflowStep {
  /** Step name. */
  readonly name: string
  /** Step description. */
  readonly description: string
  /** Expected tools for this step. */
  readonly tools: string[]
}

/** Elements mapped to a goal (elements.json). */
export interface GoalElements {
  /** Element registry entries. */
  readonly elements: ElementEntry[]
}

/** One element entry. */
export interface ElementEntry {
  /** Element type (BTN, DD, SET, API, PERM, TOOL). */
  readonly type: string
  /** Element id. */
  readonly id: string
  /** Element description. */
  readonly description: string
  /** Source file paths. */
  readonly files: string[]
}

/** Files mapped to a goal (files.json). */
export interface GoalFiles {
  /** File paths involved in this goal. */
  readonly paths: string[]
}

/** Dependencies for a goal (dependencies.json). */
export interface GoalDependencies {
  /** Package dependencies. */
  readonly packages: string[]
  /** Inter-goal dependencies. */
  readonly goals: string[]
}

/** Constitution rule index (rule-index.json). */
export interface RuleIndex {
  /** Rule entries. */
  readonly rules: RuleEntry[]
}

/** One rule entry. */
export interface RuleEntry {
  /** Rule category (architecture, security, folders, workflows). */
  readonly category: string
  /** Rule id. */
  readonly id: string
  /** Rule description. */
  readonly description: string
  /** Rule file path. */
  readonly file: string
}

/** Blueprint element index (element-index.json). */
export interface BlueprintElementIndex {
  /** Element entries. */
  readonly elements: BlueprintElementEntry[]
}

/** One blueprint element entry. */
export interface BlueprintElementEntry {
  /** Element type. */
  readonly type: string
  /** Element id. */
  readonly id: string
  /** Target file. */
  readonly file: string
  /** Line range. */
  readonly lines: { start: number; end: number }
}

/** Blueprint file index (file-index.json). */
export interface BlueprintFileIndex {
  /** File entries. */
  readonly files: BlueprintFileEntry[]
}

/** One blueprint file entry. */
export interface BlueprintFileEntry {
  /** File path. */
  readonly path: string
  /** Purpose description. */
  readonly purpose: string
  /** Associated goal ids. */
  readonly goals: string[]
}

/** Dependency map (dependency-map.json). */
export interface DependencyMap {
  /** Package dependency edges. */
  readonly edges: DependencyEdge[]
}

/** One dependency edge. */
export interface DependencyEdge {
  /** Source package. */
  readonly from: string
  /** Target package. */
  readonly to: string
  /** Relationship type. */
  readonly kind: 'peer' | 'dev' | 'runtime'
}

/** Repair index (repair-index.json). */
export interface RepairIndex {
  /** Repair entries. */
  readonly repairs: RepairEntry[]
}

/** One repair entry. */
export interface RepairEntry {
  /** Repair id. */
  readonly id: string
  /** Goal id that triggered the repair. */
  readonly goalId: string
  /** Description of the repair. */
  readonly description: string
  /** Status. */
  readonly status: 'pending' | 'in-progress' | 'completed'
  /** ISO-8601 timestamp. */
  readonly timestamp: string
}

/** Runtime state (runtime/state.json). */
export interface RuntimeState {
  /** Current governance phase. */
  readonly phase: GovernancePhase
  /** Active goal id, if any. */
  readonly activeGoalId?: string
  /** Monotonic revision counter. */
  readonly revision: number
  /** ISO-8601 last transition timestamp. */
  readonly lastTransitionAt: string
  /** Transition history (last N entries). */
  readonly history: GovernanceTransition[]
}

/** Evidence directory structure. */
export interface EvidenceDirectory {
  /** Test evidence files. */
  readonly tests: string[]
  /** Integration evidence files. */
  readonly integration: string[]
  /** Audit evidence files. */
  readonly audit: string[]
  /** Completion evidence files. */
  readonly completion: string[]
}
