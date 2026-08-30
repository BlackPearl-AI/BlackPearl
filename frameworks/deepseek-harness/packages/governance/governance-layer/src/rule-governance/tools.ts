/**
 * Rule & Documentation Governance tools — PHASE 10.
 *
 * - `register_rule`: register a rule in the central registry
 * - `validate_against_rules`: validate a value against all active rules
 * - `enforce_rule_gate`: hard-gate check — blocks if error-level rules fail
 * - `get_rule_registry_report`: markdown report of all rules + health
 * - `query_rules`: find rules by category, severity, status, search
 * - `deactivate_rule`: disable or deprecate a rule
 *
 * @module @deepseek-ai/dsh-governance-layer/rule-governance/tools
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { RuleGovernanceEngine } from './engine.ts'
import {
  ALL_CATEGORIES,
} from './types.ts'
import type { RuleCategory, RuleSeverity, RuleStatus, ValidationType } from './types.ts'

/** Active engine instance (per-session). */
let activeEngine: RuleGovernanceEngine | undefined

/** Get the active engine. */
export function getActiveEngine(): RuleGovernanceEngine | undefined {
  return activeEngine
}

/** Reset the active engine (for testing). */
export function resetEngine(): void {
  activeEngine = undefined
}

function ensureEngine(): RuleGovernanceEngine {
  if (activeEngine === undefined) {
    activeEngine = new RuleGovernanceEngine()
  }
  return activeEngine
}

// ---------------------------------------------------------------------------
// Tool: register_rule
// ---------------------------------------------------------------------------

export function createRegisterRuleTool() {
  return defineTool({
    name: 'register_rule',
    description:
      'Register a rule in the central governance registry. '
      + 'Every RULE has a VALIDATOR and a HARD GATE. '
      + 'Categories: constitution, security, architecture, folder, url, workflow, pipeline, module. '
      + 'Severity: error (hard gate), warning (soft gate), info (advisory).',
    parameters: {
      category: {
        type: 'string',
        required: true,
        description: `Rule category: ${ALL_CATEGORIES.join(', ')}.`,
      },
      title: {
        type: 'string',
        required: true,
        description: 'Short human-readable rule title.',
      },
      description: {
        type: 'string',
        required: true,
        description: 'Full description of what this rule enforces.',
      },
      severity: {
        type: 'string',
        required: true,
        description: 'Rule severity: error (hard gate), warning (soft gate), info (advisory).',
      },
      validation_type: {
        type: 'string',
        required: true,
        description: 'Validator type: pattern (regex), contains (substring), absent (forbidden substring), list (allowed values), custom.',
      },
      validation_value: {
        type: 'string',
        description: 'For pattern: regex string. For contains/absent: substring. For list: JSON array of allowed values.',
      },
      validation_description: {
        type: 'string',
        required: true,
        description: 'Human-readable description of what the validator checks.',
      },
      source: {
        type: 'string',
        description: 'Rule source reference (file path, document title).',
      },
      module_scope: {
        type: 'string',
        description: 'Module prefix this rule applies to (empty = global).',
      },
      tags: {
        type: 'string',
        description: 'Comma-separated tags.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ruleId: { type: 'string' },
          category: { type: 'string' },
          title: { type: 'string' },
          severity: { type: 'string' },
          status: { type: 'string' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>

      // Parse validator.
      let parsedValue: string | string[] | undefined
      if (input.validation_value) {
        try {
          parsedValue = JSON.parse(input.validation_value)
        } catch {
          parsedValue = input.validation_value
        }
      }

      const entry = engine.register({
        category: (input.category ?? '') as RuleCategory,
        title: input.title ?? '',
        description: input.description ?? '',
        severity: (input.severity ?? '') as RuleSeverity,
        validator: {
          type: (input.validation_type ?? '') as ValidationType,
          ...(typeof parsedValue === 'string' ? { value: parsedValue } : {}),
          ...(typeof parsedValue === 'string' ? { match: parsedValue } : {}),
          ...(Array.isArray(parsedValue) ? { allowed: parsedValue } : {}),
          description: input.validation_description ?? '',
        },
        ...(input.source !== undefined ? { source: input.source } : {}),
        ...(input.module_scope !== undefined ? { moduleScope: input.module_scope } : {}),
        ...(input.tags !== undefined ? { tags: input.tags.split(',').map(t => t.trim()) } : {}),
      })

      return Promise.resolve({
        ruleId: entry.ruleId,
        category: entry.category,
        title: entry.title,
        severity: entry.severity,
        status: entry.status,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: validate_against_rules
// ---------------------------------------------------------------------------

export function createValidateAgainstRulesTool() {
  return defineTool({
    name: 'validate_against_rules',
    description:
      'Validate a value string against all active governance rules. '
      + 'Returns pass/fail for each rule.',
    parameters: {
      value: {
        type: 'string',
        required: true,
        description: 'The value to validate (e.g. file path, URL, code snippet).',
      },
      categories: {
        type: 'string',
        description: 'Comma-separated categories to check (empty = all).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          totalChecked: { type: 'number' },
          passed: { type: 'number' },
          failed: { type: 'number' },
          results: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as { value: string; categories?: string }

      const cats = input.categories
        ? input.categories.split(',').map(c => c.trim()) as RuleCategory[]
        : undefined

      const results = engine.validate(input.value, cats)
      const passed = results.filter(r => r.passed).length
      const failed = results.filter(r => !r.passed).length

      return Promise.resolve({
        totalChecked: results.length,
        passed,
        failed,
        results: results.map(r => ({
          ruleId: r.ruleId,
          category: r.category,
          severity: r.severity,
          passed: r.passed,
          message: r.message,
          ...(r.checkedValue !== undefined ? { checkedValue: r.checkedValue } : {}),
        })),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: enforce_rule_gate
// ---------------------------------------------------------------------------

export function createEnforceRuleGateTool() {
  return defineTool({
    name: 'enforce_rule_gate',
    description:
      'Enforce hard gate: validate a value and BLOCK if any error-level rule fails. '
      + 'Returns allowed: true/false with full details.',
    parameters: {
      value: {
        type: 'string',
        required: true,
        description: 'The value to validate against the gate.',
      },
      categories: {
        type: 'string',
        description: 'Comma-separated categories to enforce (empty = all).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          allowed: { type: 'boolean' },
          totalChecked: { type: 'number' },
          passed: { type: 'number' },
          failed: { type: 'number' },
          errorCount: { type: 'number' },
          warningCount: { type: 'number' },
          summary: { type: 'string' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as { value: string; categories?: string }

      const cats = input.categories
        ? input.categories.split(',').map(c => c.trim()) as RuleCategory[]
        : undefined

      const gate = engine.enforceGate(input.value, cats)

      return Promise.resolve({
        allowed: gate.allowed,
        totalChecked: gate.totalChecked,
        passed: gate.passed,
        failed: gate.failed,
        errorCount: gate.errors.length,
        warningCount: gate.warnings.length,
        summary: gate.summary,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_rule_registry_report
// ---------------------------------------------------------------------------

export function createRuleRegistryReportTool() {
  return defineTool({
    name: 'get_rule_registry_report',
    description:
      'Generate a markdown report of the entire rule registry '
      + 'showing all rules, hard gates, categories, and health issues.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          totalRules: { type: 'number' },
          report: { type: 'string' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute() {
      const engine = ensureEngine()
      const report = engine.toMarkdown()
      const sm = engine.summary()
      return Promise.resolve({
        totalRules: sm.totalRules,
        report,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: query_rules
// ---------------------------------------------------------------------------

export function createQueryRulesTool() {
  return defineTool({
    name: 'query_rules',
    description: 'Find governance rules by category, severity, status, or text search.',
    parameters: {
      category: {
        type: 'string',
        description: `Filter by category: ${ALL_CATEGORIES.join(', ')}.`,
      },
      severity: {
        type: 'string',
        description: 'Filter by severity: error, warning, info.',
      },
      status: {
        type: 'string',
        description: 'Filter by status: active, deprecated, disabled, superseded.',
      },
      search: {
        type: 'string',
        description: 'Search title and description (case-insensitive).',
      },
      tag: {
        type: 'string',
        description: 'Filter by tag.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          count: { type: 'number' },
          rules: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>

      const results = engine.query({
        ...(input.category !== undefined ? { category: input.category as RuleCategory } : {}),
        ...(input.severity !== undefined ? { severity: input.severity as RuleSeverity } : {}),
        ...(input.status !== undefined ? { status: input.status as RuleStatus } : {}),
        ...(input.search !== undefined ? { search: input.search } : {}),
        ...(input.tag !== undefined ? { tag: input.tag } : {}),
      })

      return Promise.resolve({
        count: results.length,
        rules: results.map(r => ({
          ruleId: r.ruleId,
          category: r.category,
          title: r.title,
          severity: r.severity,
          status: r.status,
          validatorType: r.validator.type,
        })),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: deactivate_rule
// ---------------------------------------------------------------------------

export function createDeactivateRuleTool() {
  return defineTool({
    name: 'deactivate_rule',
    description: 'Disable, deprecate, or supersede a rule by ID.',
    parameters: {
      rule_id: {
        type: 'string',
        required: true,
        description: 'Rule ID to deactivate (e.g. CON-R001).',
      },
      status: {
        type: 'string',
        required: true,
        description: 'New status: disabled, deprecated, superseded.',
      },
      superseded_by: {
        type: 'string',
        description: 'If superseded: the rule ID that replaces this one.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ruleId: { type: 'string' },
          oldStatus: { type: 'string' },
          newStatus: { type: 'string' },
          success: { type: 'boolean' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as { rule_id: string; status: string; superseded_by?: string }

      const rule = engine.get(input.rule_id)
      if (!rule) {
        return Promise.resolve({
          ruleId: input.rule_id,
          oldStatus: 'unknown',
          newStatus: 'unknown',
          success: false,
        })
      }

      const oldStatus = rule.status
      engine.update(input.rule_id, {
        status: input.status as RuleStatus,
        ...(input.superseded_by !== undefined ? { supersededBy: input.superseded_by } : {}),
      })

      return Promise.resolve({
        ruleId: input.rule_id,
        oldStatus,
        newStatus: input.status,
        success: true,
      })
    },
  })
}
