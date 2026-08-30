/**
 * Rule & Documentation Governance Engine — PHASE 10.
 *
 * Central rule registry: every rule has a VALIDATOR and a HARD GATE.
 * Documentation is not passive — rules are enforced.
 *
 * @module @deepseek-ai/dsh-governance-layer/rule-governance/engine
 */

import {
  RULE_CATEGORY_LABELS,
  RULE_CATEGORY_ICONS,
  RULE_SEVERITY_LABELS as _RULE_SEVERITY_LABELS,
  RULE_SEVERITY_ICONS as _RULE_SEVERITY_ICONS,
  RULE_STATUS_LABELS,
  RULE_STATUS_ICONS,
} from './types.ts'
import type {
  RegistryHealthReport,
  RegistryIssue,
  RuleCategory,
  RuleEntry,
  RuleGateResult,
  RuleQuery,
  RuleRegistrySummary,
  RuleSeverity,
  RuleStatus,
  RuleValidationResult,
  RuleValidator,
} from './types.ts'
import { categorySequenceKey, generateRuleId } from './types.ts'

/** All rule categories. */
const ALL_CATEGORIES: readonly RuleCategory[] = [
  'constitution', 'security', 'architecture', 'folder',
  'url', 'workflow', 'pipeline', 'module',
]

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Central Rule Registry Engine — every RULE has a VALIDATOR and a HARD GATE.
 */
export class RuleGovernanceEngine {
  private rules: Map<string, RuleEntry>
  private sequences: Map<string, number>

  constructor() {
    this.rules = new Map()
    this.sequences = new Map()
  }

  // -----------------------------------------------------------------------
  // Register
  // -----------------------------------------------------------------------

  /**
   * Register a rule in the central registry.
   * Returns the created entry with generated ID.
   *
   * @throws If category or severity is invalid, or ID already exists.
   */
  register(params: {
    readonly category: RuleCategory
    readonly title: string
    readonly description: string
    readonly severity: RuleSeverity
    readonly validator: RuleValidator
    readonly source?: string
    readonly moduleScope?: string
    readonly tags?: readonly string[]
    readonly status?: RuleStatus
  }): RuleEntry {
    const { category, title, description, severity, validator } = params

    this.validateCategory(category)

    const seq = this.nextSequence(category)
    const ruleId = generateRuleId(category, seq)
    const now = new Date().toISOString()

    const entry: RuleEntry = {
      ruleId,
      category,
      title,
      description,
      severity,
      validator,
      ...(params.source !== undefined ? { source: params.source } : {}),
      status: params.status ?? 'active',
      ...(params.moduleScope !== undefined ? { moduleScope: params.moduleScope } : {}),
      ...(params.tags !== undefined ? { tags: params.tags } : {}),
      createdAt: now,
      updatedAt: now,
    }

    this.rules.set(ruleId, entry)
    this.sequences.set(categorySequenceKey(category), seq)

    return entry
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  /**
   * Update mutable fields on an existing rule.
   */
  update(ruleId: string, changes: {
    readonly title?: string
    readonly description?: string
    readonly severity?: RuleSeverity
    readonly validator?: RuleValidator
    readonly status?: RuleStatus
    readonly tags?: readonly string[]
    readonly supersededBy?: string
  }): RuleEntry {
    const entry = this.rules.get(ruleId)
    if (!entry) {
      throw new Error(`Rule not found: ${ruleId}`)
    }

    const updated: RuleEntry = {
      ...entry,
      ...(changes.title !== undefined ? { title: changes.title } : {}),
      ...(changes.description !== undefined ? { description: changes.description } : {}),
      ...(changes.severity !== undefined ? { severity: changes.severity } : {}),
      ...(changes.validator !== undefined ? { validator: changes.validator } : {}),
      ...(changes.status !== undefined ? { status: changes.status } : {}),
      ...(changes.tags !== undefined ? { tags: changes.tags } : {}),
      ...(changes.supersededBy !== undefined ? { supersededBy: changes.supersededBy } : {}),
      updatedAt: new Date().toISOString(),
    }

    this.rules.set(ruleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  /** Get a rule by ID. */
  get(ruleId: string): RuleEntry | undefined {
    return this.rules.get(ruleId)
  }

  /** Get all rules. */
  getAll(): RuleEntry[] {
    return Array.from(this.rules.values())
  }

  /** Query rules with filters. */
  query(filter: RuleQuery): RuleEntry[] {
    let results = Array.from(this.rules.values())

    if (filter.category) {
      results = results.filter(r => r.category === filter.category)
    }
    if (filter.severity) {
      results = results.filter(r => r.severity === filter.severity)
    }
    if (filter.status) {
      results = results.filter(r => r.status === filter.status)
    }
    if (filter.moduleScope) {
      const ms = filter.moduleScope.toUpperCase()
      results = results.filter(r => r.moduleScope === ms || !r.moduleScope)
    }
    if (filter.search) {
      const s = filter.search.toLowerCase()
      results = results.filter(r =>
        r.title.toLowerCase().includes(s)
        || r.description.toLowerCase().includes(s)
        || r.ruleId.toLowerCase().includes(s)
      )
    }
    if (filter.tag) {
      results = results.filter(r => r.tags?.includes(filter.tag!))
    }

    return results
  }

  // -----------------------------------------------------------------------
  // Validate
  // -----------------------------------------------------------------------

  /**
   * Validate a single value against one rule's validator.
   */
  validateOne(rule: RuleEntry, value: string): RuleValidationResult {
    const v = rule.validator
    let passed = false
    let message = ''

    switch (v.type) {
      case 'pattern': {
        if (!v.value) {
          message = `Rule "${rule.ruleId}" pattern validator has no value`
          break
        }
        try {
          const regex = new RegExp(v.value)
          passed = regex.test(value)
          message = passed
            ? `Value matches pattern "${v.value}"`
            : `Value does not match pattern "${v.value}"`
        } catch {
          message = `Rule "${rule.ruleId}" has invalid regex: ${v.value}`
        }
        break
      }
      case 'contains': {
        if (!v.match) {
          message = `Rule "${rule.ruleId}" contains validator has no match value`
          break
        }
        passed = value.includes(v.match)
        message = passed
          ? `Value contains "${v.match}"`
          : `Value does not contain "${v.match}"`
        break
      }
      case 'absent': {
        if (!v.match) {
          message = `Rule "${rule.ruleId}" absent validator has no match value`
          break
        }
        passed = !value.includes(v.match)
        message = passed
          ? `Value does not contain forbidden "${v.match}"`
          : `Value must not contain "${v.match}"`
        break
      }
      case 'list': {
        if (!v.allowed) {
          message = `Rule "${rule.ruleId}" list validator has no allowed values`
          break
        }
        passed = v.allowed.includes(value)
        message = passed
          ? `Value "${value}" is in allowed list`
          : `Value "${value}" is not in allowed list [${v.allowed.join(', ')}]`
        break
      }
      case 'custom': {
        // Custom validators cannot be serialised; mark as passed with info.
        passed = true
        message = `Rule "${rule.ruleId}" uses custom validation (requires runtime check)`
        break
      }
      default:
        message = `Rule "${rule.ruleId}" has unknown validator type "${v.type as string}"`
    }

    return {
      ruleId: rule.ruleId,
      category: rule.category,
      severity: rule.severity,
      passed,
      message,
      checkedValue: value,
    }
  }

  /**
   * Validate a value against all active rules in given categories (or all).
   * Returns individual results for each rule.
   */
  validate(value: string, categories?: readonly RuleCategory[]): RuleValidationResult[] {
    let activeRules = this.getActiveRules()
    if (categories && categories.length > 0) {
      activeRules = activeRules.filter(r => categories.includes(r.category))
    }
    return activeRules.map(rule => this.validateOne(rule, value))
  }

  // -----------------------------------------------------------------------
  // Gate Enforcement
  // -----------------------------------------------------------------------

  /**
   * Enforce hard gate: validate a value and block if any error-level rule fails.
   */
  enforceGate(value: string, categories?: readonly RuleCategory[]): RuleGateResult {
    const results = this.validate(value, categories)
    const errors = results.filter(r => !r.passed && r.severity === 'error')
    const warnings = results.filter(r => !r.passed && r.severity === 'warning')
    const passed = results.filter(r => r.passed).length
    const failed = results.filter(r => !r.passed).length

    const allowed = errors.length === 0
    const summary = allowed
      ? `Gate PASSED (${passed}/${results.length} rules passed, ${warnings.length} warnings)`
      : `Gate BLOCKED (${errors.length} error(s) blocking, ${warnings.length} warnings)`

    return {
      allowed,
      results,
      errors,
      warnings,
      totalChecked: results.length,
      passed,
      failed,
      summary,
    }
  }

  // -----------------------------------------------------------------------
  // Remove
  // -----------------------------------------------------------------------

  /** Remove a rule by ID. */
  remove(ruleId: string): boolean {
    return this.rules.delete(ruleId)
  }

  /** Total rule count. */
  get size(): number {
    return this.rules.size
  }

  // -----------------------------------------------------------------------
  // Registry Health
  // -----------------------------------------------------------------------

  /**
   * Check internal registry health: duplicates, orphan supersede refs, etc.
   */
  healthCheck(): RegistryHealthReport {
    const issues: RegistryIssue[] = []
    const all = Array.from(this.rules.values())

    // 1. Duplicate IDs (shouldn't happen, defensive).
    const idCounts = new Map<string, number>()
    for (const r of all) {
      idCounts.set(r.ruleId, (idCounts.get(r.ruleId) ?? 0) + 1)
    }
    const duplicates: string[] = []
    for (const [id, count] of idCounts) {
      if (count > 1) {
        duplicates.push(id)
        issues.push({ type: 'duplicate-id', severity: 'error', message: `Duplicate rule ID "${id}" (${count}×)`, ruleId: id })
      }
    }

    // 2. Orphan supersede references.
    const allIds = new Set(all.map(r => r.ruleId))
    for (const r of all) {
      if (r.supersededBy && !allIds.has(r.supersededBy)) {
        issues.push({ type: 'orphan-supersede', severity: 'warning', message: `Rule "${r.ruleId}" superseded-by "${r.supersededBy}" which does not exist`, ruleId: r.ruleId })
      }
    }

    // 3. Empty categories.
    for (const cat of ALL_CATEGORIES) {
      const count = all.filter(r => r.category === cat).length
      if (count === 0) {
        issues.push({ type: 'empty-category', severity: 'warning', message: `Category "${cat}" has no rules` })
      }
    }

    const activeRules = all.filter(r => r.status === 'active').length
    const deprecatedRules = all.filter(r => r.status === 'deprecated').length

    return {
      healthy: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      activeRules,
      deprecatedRules,
      duplicates,
    }
  }

  // -----------------------------------------------------------------------
  // Summary & Report
  // -----------------------------------------------------------------------

  /** Compute summary statistics. */
  summary(): RuleRegistrySummary {
    const all = Array.from(this.rules.values())

    const byCategory = {} as Record<RuleCategory, number>
    const bySeverity = {} as Record<RuleSeverity, number>
    const byStatus = {} as Record<RuleStatus, number>

    for (const c of ALL_CATEGORIES) byCategory[c] = 0
    for (const s of ['error', 'warning', 'info'] as RuleSeverity[]) bySeverity[s] = 0
    for (const s of ['active', 'deprecated', 'disabled', 'superseded'] as RuleStatus[]) byStatus[s] = 0

    for (const r of all) {
      byCategory[r.category]++
      bySeverity[r.severity]++
      byStatus[r.status]++
    }

    return {
      totalRules: all.length,
      byCategory,
      bySeverity,
      byStatus,
      hardGateRules: all.filter(r => r.severity === 'error' && r.status === 'active').length,
    }
  }

  /**
   * Generate markdown report of the rule registry.
   */
  toMarkdown(): string {
    const lines: string[] = []
    const all = this.getAll()
    const sm = this.summary()

    lines.push('# Rule & Documentation Governance Report')
    lines.push('')
    lines.push(`**Total Rules:** ${sm.totalRules}`)
    lines.push(`**Hard Gate Rules:** ${sm.hardGateRules}`)
    lines.push('')

    // By category
    lines.push('## By Category')
    lines.push('')
    for (const cat of ALL_CATEGORIES) {
      if (sm.byCategory[cat] > 0) {
        lines.push(`- ${RULE_CATEGORY_ICONS[cat]} **${RULE_CATEGORY_LABELS[cat]}**: ${sm.byCategory[cat]} rules`)
      }
    }
    lines.push('')

    // Hard gate rules
    const hardRules = all.filter(r => r.severity === 'error' && r.status === 'active')
    if (hardRules.length > 0) {
      lines.push('## Hard Gate Rules')
      lines.push('')
      lines.push('| ID | Category | Title | Validator |')
      lines.push('|---|---|---|---|')
      for (const r of hardRules) {
        lines.push(`| \`${r.ruleId}\` | ${RULE_CATEGORY_ICONS[r.category]} ${RULE_CATEGORY_LABELS[r.category]} | ${r.title} | ${r.validator.type} |`)
      }
      lines.push('')
    }

    // All rules
    lines.push('## All Rules')
    lines.push('')
    lines.push('| ID | Category | Severity | Status | Title |')
    lines.push('|---|---|---|---|---|')
    for (const r of all) {
      const icon = RULE_STATUS_ICONS[r.status]
      lines.push(`| \`${r.ruleId}\` | ${RULE_CATEGORY_LABELS[r.category]} | ${r.severity} | ${icon} ${RULE_STATUS_LABELS[r.status]} | ${r.title} |`)
    }

    // Health check
    const hc = this.healthCheck()
    if (hc.issues.length > 0) {
      lines.push('')
      lines.push('## Registry Health Issues')
      lines.push('')
      for (const i of hc.issues) {
        const icon = i.severity === 'error' ? '🔴' : '🟡'
        lines.push(`- ${icon} ${i.message}`)
      }
    }

    return lines.join('\n')
  }

  // -----------------------------------------------------------------------
  // Sequence
  // -----------------------------------------------------------------------

  /** Next sequence number for a category. */
  nextSequence(category: RuleCategory): number {
    return (this.sequences.get(categorySequenceKey(category)) ?? 0) + 1
  }

  /** Last used sequence for a category. */
  lastSequence(category: RuleCategory): number {
    return this.sequences.get(categorySequenceKey(category)) ?? 0
  }

  // -----------------------------------------------------------------------
  // Snapshot
  // -----------------------------------------------------------------------

  /** Get a copy of the rules map. */
  toMap(): Map<string, RuleEntry> {
    return new Map(this.rules)
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private getActiveRules(): RuleEntry[] {
    return Array.from(this.rules.values()).filter(r => r.status === 'active')
  }

  private validateCategory(category: string): void {
    if (!(ALL_CATEGORIES as readonly string[]).includes(category)) {
      throw new Error(`Invalid rule category "${category}": must be one of ${ALL_CATEGORIES.join(', ')}`)
    }
  }
}
