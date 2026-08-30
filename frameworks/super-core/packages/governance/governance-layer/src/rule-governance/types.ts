/**
 * Rule & Documentation Governance types — PHASE 10.
 *
 * Central rule registry: every Constitution, Security, Architecture, Folder,
 * URL, Workflow, Pipeline, and Module rule lives here.
 *
 * Documentation is not passive — every RULE has a VALIDATOR and a HARD GATE.
 *
 * @module @deepseek-ai/dsh-governance-layer/rule-governance/types
 */

// ---------------------------------------------------------------------------
// Rule Categories
// ---------------------------------------------------------------------------

/** The 8 recognised rule categories. */
export type RuleCategory =
  | 'constitution'
  | 'security'
  | 'architecture'
  | 'folder'
  | 'url'
  | 'workflow'
  | 'pipeline'
  | 'module'

/** Short prefix codes for rule IDs per category. */
export const RULE_CATEGORY_PREFIXES: Record<RuleCategory, string> = {
  'constitution': 'CON',
  'security': 'SEC',
  'architecture': 'ARCH',
  'folder': 'FDR',
  'url': 'URL',
  'workflow': 'WFL',
  'pipeline': 'PIP',
  'module': 'MOD',
}

/** Human-readable labels. */
export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = {
  'constitution': 'Constitution',
  'security': 'Security',
  'architecture': 'Architecture',
  'folder': 'Folder',
  'url': 'URL',
  'workflow': 'Workflow',
  'pipeline': 'Pipeline',
  'module': 'Module',
}

/** Icons per category. */
export const RULE_CATEGORY_ICONS: Record<RuleCategory, string> = {
  'constitution': '📜',
  'security': '🛡️',
  'architecture': '🏗️',
  'folder': '📁',
  'url': '🌐',
  'workflow': '🔄',
  'pipeline': '🔀',
  'module': '📦',
}

/** All categories in registration order. */
export const ALL_CATEGORIES: readonly RuleCategory[] = [
  'constitution', 'security', 'architecture', 'folder',
  'url', 'workflow', 'pipeline', 'module',
]

// ---------------------------------------------------------------------------
// Severity
// ---------------------------------------------------------------------------

/** Rule severity — determines gate behaviour. */
export type RuleSeverity = 'error' | 'warning' | 'info'

/** Severity labels. */
export const RULE_SEVERITY_LABELS: Record<RuleSeverity, string> = {
  'error': 'Error (Hard Gate)',
  'warning': 'Warning (Soft Gate)',
  'info': 'Info (Advisory)',
}

/** Severity icons. */
export const RULE_SEVERITY_ICONS: Record<RuleSeverity, string> = {
  'error': '🔴',
  'warning': '🟡',
  'info': '🔵',
}

// ---------------------------------------------------------------------------
// Validation Types
// ---------------------------------------------------------------------------

/** How a rule is validated. */
export type ValidationType = 'pattern' | 'contains' | 'absent' | 'list' | 'custom'

/** A serialisable rule validator definition. */
export interface RuleValidator {
  /** Validation strategy. */
  readonly type: ValidationType
  /** For 'pattern': regex string. For 'list': allowed values JSON. */
  readonly value?: string
  /** For 'contains'/'absent': the substring to match or forbid. */
  readonly match?: string
  /** For 'list': array of allowed values. */
  readonly allowed?: readonly string[]
  /** Human-readable check description. */
  readonly description: string
}

// ---------------------------------------------------------------------------
// Rule Entry
// ---------------------------------------------------------------------------

/** Status of a rule. */
export type RuleStatus = 'active' | 'deprecated' | 'disabled' | 'superseded'

/** Status labels. */
export const RULE_STATUS_LABELS: Record<RuleStatus, string> = {
  'active': 'Active',
  'deprecated': 'Deprecated',
  'disabled': 'Disabled',
  'superseded': 'Superseded',
}

/** Status icons. */
export const RULE_STATUS_ICONS: Record<RuleStatus, string> = {
  'active': '✅',
  'deprecated': '🗑️',
  'disabled': '🚫',
  'superseded': '🔄',
}

/** A single rule in the central registry. */
export interface RuleEntry {
  /** Unique rule ID (e.g. 'CON-R001'). */
  readonly ruleId: string
  /** Category. */
  readonly category: RuleCategory
  /** Short human-readable title. */
  readonly title: string
  /** Full description of the rule. */
  readonly description: string
  /** Severity. */
  readonly severity: RuleSeverity
  /** Validator definition. */
  readonly validator: RuleValidator
  /** Rule source reference (e.g. file path, document title). */
  readonly source?: string
  /** Current status. */
  status: RuleStatus
  /** Module prefix this rule applies to (empty = global). */
  readonly moduleScope?: string
  /** Rule tags for filtering. */
  readonly tags?: readonly string[]
  /** Creation timestamp (ISO-8601). */
  readonly createdAt: string
  /** Last update timestamp (ISO-8601). */
  updatedAt: string
  /** Superseded-by rule ID, if status is 'superseded'. */
  readonly supersededBy?: string
}

// ---------------------------------------------------------------------------
// Validation Result
// ---------------------------------------------------------------------------

/** Result of validating one target against one rule. */
export interface RuleValidationResult {
  /** Rule that was checked. */
  readonly ruleId: string
  /** Category. */
  readonly category: RuleCategory
  /** Severity. */
  readonly severity: RuleSeverity
  /** Did the target pass the rule? */
  readonly passed: boolean
  /** Human-readable result message. */
  readonly message: string
  /** The value that was checked (optional). */
  readonly checkedValue?: string
}

// ---------------------------------------------------------------------------
// Gate Result
// ---------------------------------------------------------------------------

/** Result of enforcing a hard gate for a set of rules. */
export interface RuleGateResult {
  /** Whether the gate passes (no error-level violations). */
  readonly allowed: boolean
  /** All validation results. */
  readonly results: readonly RuleValidationResult[]
  /** Only the error-level violations. */
  readonly errors: readonly RuleValidationResult[]
  /** Only the warning-level violations. */
  readonly warnings: readonly RuleValidationResult[]
  /** Total rules checked. */
  readonly totalChecked: number
  /** Rules that passed. */
  readonly passed: number
  /** Rules that failed. */
  readonly failed: number
  /** Human-readable summary. */
  readonly summary: string
}

// ---------------------------------------------------------------------------
// Registry Validation Report
// ---------------------------------------------------------------------------

/** Internal consistency report for the rule registry itself. */
export interface RegistryHealthReport {
  /** Whether the registry is healthy. */
  readonly healthy: boolean
  /** Issues found. */
  readonly issues: readonly RegistryIssue[]
  /** Total active rules. */
  readonly activeRules: number
  /** Total deprecated rules. */
  readonly deprecatedRules: number
  /** Duplicate rule IDs. */
  readonly duplicates: readonly string[]
}

/** One internal issue. */
export interface RegistryIssue {
  /** Issue type. */
  readonly type: 'duplicate-id' | 'orphan-supersede' | 'missing-validator' | 'empty-category'
  /** Severity. */
  readonly severity: 'error' | 'warning'
  /** Human-readable message. */
  readonly message: string
  /** Related rule ID. */
  readonly ruleId?: string
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/** Query filter for rule lookup. */
export interface RuleQuery {
  /** Filter by category. */
  readonly category?: RuleCategory
  /** Filter by severity. */
  readonly severity?: RuleSeverity
  /** Filter by status. */
  readonly status?: RuleStatus
  /** Filter by module scope. */
  readonly moduleScope?: string
  /** Search title/description (case-insensitive). */
  readonly search?: string
  /** Filter by tag. */
  readonly tag?: string
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

/** Summary statistics for the rule registry. */
export interface RuleRegistrySummary {
  /** Total rules. */
  readonly totalRules: number
  /** Count by category. */
  readonly byCategory: Record<RuleCategory, number>
  /** Count by severity. */
  readonly bySeverity: Record<RuleSeverity, number>
  /** Count by status. */
  readonly byStatus: Record<RuleStatus, number>
  /** Active hard-gate rules (error severity + active status). */
  readonly hardGateRules: number
}

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

/**
 * Generate a rule ID.
 * Format: `{PREFIX}-R{SEQ}` where SEQ is zero-padded to 3 digits.
 */
export function generateRuleId(category: RuleCategory, sequence: number): string {
  return `${RULE_CATEGORY_PREFIXES[category]}-R${String(sequence).padStart(3, '0')}`
}

/**
 * Parse a rule ID into components.
 * Returns undefined if format is invalid.
 */
export function parseRuleId(ruleId: string): { prefix: string; sequence: number } | undefined {
  const match = ruleId.match(/^([A-Z]{2,4})-R(\d{1,6})$/)
  if (!match) return undefined
  return { prefix: match[1] ?? '', sequence: parseInt(match[2] ?? '0', 10) }
}

/**
 * Sequence key for category.
 */
export function categorySequenceKey(category: RuleCategory): string {
  return `seq:${category}`
}
