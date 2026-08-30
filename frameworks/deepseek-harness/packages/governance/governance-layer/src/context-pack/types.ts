/**
 * G-28 — Task-Specific Context Pack Engine: Types
 *
 * Automatically creates minimal, compact context for any given task.
 * Contains ONLY task-relevant items:
 * - Relevant CR requirements
 * - Active goal/subgoal
 * - Applicable rules
 * - Relevant blueprint section
 * - Relevant element IDs
 * - Exact files
 * - Direct dependencies
 * - Required contracts
 * - Acceptance criteria
 * - Relevant tests
 * - Previous repair / evidence (if applicable)
 *
 * Generates a machine-readable JSON manifest.
 *
 * @module @deepseek-ai/dsh-governance-layer/context-pack/types
 */

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export interface ContextPackRequest {
  /** Target task ID or repair ID. */
  readonly taskId: string
  /** Module ID (if known or targeted). */
  readonly moduleId?: string
  /** Specific element IDs relevant to the task. */
  readonly elementIds?: readonly string[]
  /** Goal ID (if specific goal). */
  readonly goalId?: string
  /** Natural language focus or query (e.g. "Fee receipt print fix"). */
  readonly query?: string
  /** Maximum token budget (default 8192). */
  readonly maxTokens?: number
}

// ---------------------------------------------------------------------------
// Manifest (Machine-readable)
// ---------------------------------------------------------------------------

export interface ManifestItemMeta {
  readonly id: string
  readonly type: 'cr' | 'goal' | 'subgoal' | 'rule' | 'blueprint' | 'element' | 'file' | 'dependency' | 'test' | 'repair_evidence' | 'contract'
  readonly name: string
  readonly referencePath?: string
  readonly tokenEstimate: number
  readonly byteSize: number
}

export interface ContextPackManifest {
  /** Unique context pack identifier. */
  readonly packId: string
  /** The original task ID. */
  readonly taskId: string
  /** Target module ID (if any). */
  readonly moduleId?: string
  /** Target goal ID (if any). */
  readonly goalId?: string
  /** Timestamp when the pack was built. */
  readonly generatedAt: string
  /** Total token estimate. */
  readonly totalTokenEstimate: number
  /** Total payload size in bytes. */
  readonly totalSizeBytes: number
  /** Number of included items by type. */
  readonly itemCounts: Record<string, number>
  /** Detailed metadata of all included items. */
  readonly items: readonly ManifestItemMeta[]
  /** SHA-256 or pseudo hash checksum for cache/invalidation. */
  readonly checksum: string
}

// ---------------------------------------------------------------------------
// Context Pack Body & Sections
// ---------------------------------------------------------------------------

export interface ContextPackSection {
  readonly title: string
  readonly type: string
  readonly entries: readonly string[]
  readonly tokenEstimate: number
}

export interface ContextPack {
  /** Machine-readable manifest. */
  readonly manifest: ContextPackManifest
  /** Raw markdown prompt payload for LLM injection. */
  readonly promptPayload: string
  /** Structured sections for targeted consumer extraction. */
  readonly sections: readonly ContextPackSection[]
  /** Specific relevant CRs. */
  readonly relevantCrIds: readonly string[]
  /** Active goal and subgoals. */
  readonly activeGoalId?: string
  readonly activeSubgoalIds: readonly string[]
  /** Applicable rule IDs. */
  readonly applicableRuleIds: readonly string[]
  /** Relevant element IDs. */
  readonly elementIds: readonly string[]
  /** Exact source file paths. */
  readonly sourceFiles: readonly string[]
  /** Direct dependencies. */
  readonly directDependencies: readonly string[]
  /** Relevant test task IDs. */
  readonly testTaskIds: readonly string[]
  /** Previous repair records (if applicable). */
  readonly previousRepairIds: readonly string[]
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface ContextPackSummary {
  readonly packId: string
  readonly taskId: string
  readonly moduleId?: string
  readonly totalTokens: number
  readonly totalBytes: number
  readonly generatedAt: string
}
