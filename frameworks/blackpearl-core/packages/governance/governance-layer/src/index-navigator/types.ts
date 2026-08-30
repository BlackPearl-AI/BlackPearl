/**
 * G-29 — Token / Context Efficiency Engine: Types
 *
 * Enforces mandatory navigation priority (1 to 7) and token efficiency:
 * 1. Requirement/Goal Index
 * 2. Element Index
 * 3. Blueprint Index
 * 4. Dependency Graph
 * 5. File Index
 * 6. Repair Index
 * 7. Raw Source File (Permitted ONLY when indexes prove relevance)
 *
 * @module @deepseek-ai/dsh-governance-layer/index-navigator/types
 */

export type IndexType =
  | 'requirement_goal'
  | 'element'
  | 'blueprint'
  | 'dependency'
  | 'file'
  | 'repair'
  | 'raw_source'

export interface NavigationStep {
  readonly level: number
  readonly indexType: IndexType
  readonly name: string
  readonly status: 'verified' | 'matched' | 'empty' | 'stale' | 'skipped'
  readonly matches: readonly string[]
  readonly explanation: string
}

export interface IndexNavigationPlan {
  readonly taskId: string
  readonly targetModule?: string
  readonly query?: string
  readonly steps: readonly NavigationStep[]
  /** True ONLY when higher-level indexes explicitly confirm file relevance. */
  readonly rawSourceAllowed: boolean
  readonly approvedSourceFiles: readonly string[]
  readonly forbiddenFiles: readonly string[]
  readonly totalTokensEstimated: number
}

export interface StalenessCheckResult {
  readonly indexType: IndexType
  readonly isStale: boolean
  readonly missingCount: number
  readonly lastSyncedAt?: string
  readonly recommendedAction: string
}

export interface BoundedDiscoveryResult {
  readonly scope: string
  readonly discoveredItems: readonly string[]
  readonly scannedCount: number
  readonly isBounded: boolean
  readonly executionTimeMs: number
}

export interface DeduplicationResult {
  readonly originalCount: number
  readonly uniqueCount: number
  readonly duplicatesRemoved: number
  readonly deduplicatedEntries: readonly string[]
  readonly tokenSavings: number
}

export interface TokenAccountingReport {
  readonly totalTokens: number
  readonly totalBytes: number
  readonly breakdownByType: Record<string, number>
  readonly deduplicationSavingsTokens: number
  readonly efficiencyRatio: number
}

export interface IndexRepairReport {
  readonly indexType: IndexType
  readonly scope: string
  readonly repairedCount: number
  readonly success: boolean
  readonly completedAt: string
}

export interface ScopeExpansionResult {
  readonly startModule: string
  readonly maxHops: number
  readonly expandedModules: readonly string[]
  readonly totalDependencies: number
  readonly hopsTraversed: number
}
