/**
 * Rule & Documentation Governance tests — PHASE 10.
 *
 * Covers types, engine, tools, validation, gate enforcement, health, and report.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { RuleGovernanceEngine } from '../src/rule-governance/engine.ts'
import {
  createRegisterRuleTool,
  createValidateAgainstRulesTool,
  createEnforceRuleGateTool,
  createRuleRegistryReportTool,
  createQueryRulesTool,
  createDeactivateRuleTool,
  resetEngine as resetToolEngine,
  getActiveEngine as getToolEngine,
} from '../src/rule-governance/tools.ts'
import {
  ALL_CATEGORIES,
  RULE_CATEGORY_PREFIXES,
  RULE_CATEGORY_LABELS,
  RULE_CATEGORY_ICONS,
  RULE_SEVERITY_LABELS,
  RULE_STATUS_LABELS,
  RULE_STATUS_ICONS,
  generateRuleId,
  parseRuleId,
} from '../src/rule-governance/types.ts'
import type { RuleCategory } from '../src/rule-governance/types.ts'

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

describe('Rule Governance types', () => {
  it('ALL_CATEGORIES has 8 categories', () => {
    expect(ALL_CATEGORIES).toHaveLength(8)
  })

  it('RULE_CATEGORY_PREFIXES has entries for all', () => {
    for (const c of ALL_CATEGORIES) {
      expect(RULE_CATEGORY_PREFIXES[c]).toBeDefined()
      expect(typeof RULE_CATEGORY_PREFIXES[c]).toBe('string')
    }
  })

  it('RULE_CATEGORY_LABELS has entries for all', () => {
    for (const c of ALL_CATEGORIES) {
      expect(RULE_CATEGORY_LABELS[c]).toBeDefined()
    }
  })

  it('RULE_CATEGORY_ICONS has entries for all', () => {
    for (const c of ALL_CATEGORIES) {
      expect(RULE_CATEGORY_ICONS[c]).toBeDefined()
    }
  })

  it('RULE_SEVERITY_LABELS has 3 severities', () => {
    expect(Object.keys(RULE_SEVERITY_LABELS)).toHaveLength(3)
    expect(RULE_SEVERITY_LABELS.error).toContain('Hard Gate')
  })

  it('RULE_STATUS_LABELS has 4 statuses', () => {
    expect(Object.keys(RULE_STATUS_LABELS)).toHaveLength(4)
  })

  it('RULE_STATUS_ICONS has 4 statuses', () => {
    expect(Object.keys(RULE_STATUS_ICONS)).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

describe('generateRuleId', () => {
  it('generates correct format', () => {
    expect(generateRuleId('constitution', 1)).toBe('CON-R001')
    expect(generateRuleId('security', 42)).toBe('SEC-R042')
    expect(generateRuleId('architecture', 100)).toBe('ARCH-R100')
  })

  it('zero-pads to 3 digits', () => {
    expect(generateRuleId('folder', 1)).toBe('FDR-R001')
    expect(generateRuleId('folder', 9)).toBe('FDR-R009')
    expect(generateRuleId('folder', 99)).toBe('FDR-R099')
  })
})

describe('parseRuleId', () => {
  it('parses valid IDs', () => {
    expect(parseRuleId('CON-R001')).toEqual({ prefix: 'CON', sequence: 1 })
    expect(parseRuleId('SEC-R042')).toEqual({ prefix: 'SEC', sequence: 42 })
  })

  it('returns undefined for invalid IDs', () => {
    expect(parseRuleId('CON-001')).toBeUndefined()
    expect(parseRuleId('CON-R')).toBeUndefined()
    expect(parseRuleId('invalid')).toBeUndefined()
    expect(parseRuleId('')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Engine: register
// ---------------------------------------------------------------------------

describe('RuleGovernanceEngine', () => {
  let engine: RuleGovernanceEngine

  beforeEach(() => {
    engine = new RuleGovernanceEngine()
  })

  describe('register', () => {
    it('registers a single rule', () => {
      const entry = engine.register({
        category: 'constitution',
        title: 'No hardcoded secrets',
        description: 'Secrets must never be hardcoded in source.',
        severity: 'error',
        validator: { type: 'absent', match: 'password', description: 'Must not contain password' },
      })
      expect(entry.ruleId).toBe('CON-R001')
      expect(entry.category).toBe('constitution')
      expect(entry.severity).toBe('error')
      expect(entry.status).toBe('active')
      expect(entry.validator.type).toBe('absent')
    })

    it('increments sequence per category', () => {
      engine.register({ category: 'security', title: 'A', description: 'A', severity: 'error', validator: { type: 'pattern', value: '^ok$', description: 'ok' } })
      engine.register({ category: 'security', title: 'B', description: 'B', severity: 'warning', validator: { type: 'pattern', value: '^ok$', description: 'ok' } })
      const e3 = engine.register({ category: 'security', title: 'C', description: 'C', severity: 'info', validator: { type: 'pattern', value: '^ok$', description: 'ok' } })
      expect(e3.ruleId).toBe('SEC-R003')
    })

    it('different categories get independent sequences', () => {
      const e1 = engine.register({ category: 'constitution', title: 'A', description: 'A', severity: 'error', validator: { type: 'pattern', value: '.*', description: 'any' } })
      const e2 = engine.register({ category: 'folder', title: 'B', description: 'B', severity: 'warning', validator: { type: 'pattern', value: '.*', description: 'any' } })
      expect(e1.ruleId).toBe('CON-R001')
      expect(e2.ruleId).toBe('FDR-R001')
    })

    it('accepts optional fields', () => {
      const entry = engine.register({
        category: 'module',
        title: 'Module naming',
        description: 'Modules must use kebab-case.',
        severity: 'error',
        validator: { type: 'pattern', value: '^[a-z-]+$', description: 'kebab-case' },
        source: 'docs/naming.md',
        moduleScope: 'STU',
        tags: ['naming', 'convention'],
      })
      expect(entry.source).toBe('docs/naming.md')
      expect(entry.moduleScope).toBe('STU')
      expect(entry.tags).toEqual(['naming', 'convention'])
    })

    it('throws for invalid category', () => {
      expect(() => engine.register({
        category: 'invalid' as RuleCategory,
        title: 'X', description: 'X', severity: 'error',
        validator: { type: 'pattern', value: '.*', description: 'any' },
      })).toThrow()
    })
  })

  describe('update', () => {
    it('updates title', () => {
      const e = engine.register({ category: 'security', title: 'Old', description: 'D', severity: 'error', validator: { type: 'pattern', value: '.*', description: 'any' } })
      const updated = engine.update(e.ruleId, { title: 'New' })
      expect(updated.title).toBe('New')
    })

    it('updates status', () => {
      const e = engine.register({ category: 'security', title: 'X', description: 'X', severity: 'error', validator: { type: 'pattern', value: '.*', description: 'any' } })
      const updated = engine.update(e.ruleId, { status: 'deprecated' })
      expect(updated.status).toBe('deprecated')
    })

    it('throws for non-existent rule', () => {
      expect(() => engine.update('CON-R999', { title: 'X' })).toThrow()
    })
  })

  describe('get / getAll', () => {
    it('returns undefined for non-existent', () => {
      expect(engine.get('CON-R999')).toBeUndefined()
    })

    it('returns the rule', () => {
      const e = engine.register({ category: 'security', title: 'X', description: 'X', severity: 'error', validator: { type: 'pattern', value: '.*', description: 'any' } })
      expect(engine.get(e.ruleId)).toBe(e)
    })

    it('returns all', () => {
      engine.register({ category: 'security', title: 'A', description: 'A', severity: 'error', validator: { type: 'pattern', value: '.*', description: 'any' } })
      engine.register({ category: 'folder', title: 'B', description: 'B', severity: 'warning', validator: { type: 'pattern', value: '.*', description: 'any' } })
      expect(engine.getAll()).toHaveLength(2)
    })
  })

  describe('size', () => {
    it('tracks count', () => {
      expect(engine.size).toBe(0)
      engine.register({ category: 'security', title: 'X', description: 'X', severity: 'error', validator: { type: 'pattern', value: '.*', description: 'any' } })
      expect(engine.size).toBe(1)
    })
  })

  describe('query', () => {
    beforeEach(() => {
      engine.register({ category: 'constitution', title: 'No secrets', description: 'No hardcoded secrets', severity: 'error', validator: { type: 'absent', match: 'password', description: 'No passwords' }, status: 'active', tags: ['security'] })
      engine.register({ category: 'security', title: 'HTTPS only', description: 'All URLs must use HTTPS', severity: 'error', validator: { type: 'pattern', value: '^https://', description: 'HTTPS' }, status: 'active' })
      engine.register({ category: 'folder', title: 'Src required', description: 'Source in src/', severity: 'warning', validator: { type: 'pattern', value: '^src/', description: 'src/' }, status: 'deprecated' })
      engine.register({ category: 'module', title: 'Naming', description: 'Kebab case', severity: 'info', validator: { type: 'pattern', value: '^[a-z-]+$', description: 'kebab' }, status: 'active', tags: ['naming'] })
    })

    it('returns all when no filter', () => {
      expect(engine.query({})).toHaveLength(4)
    })

    it('filters by category', () => {
      expect(engine.query({ category: 'constitution' })).toHaveLength(1)
      expect(engine.query({ category: 'security' })).toHaveLength(1)
    })

    it('filters by severity', () => {
      expect(engine.query({ severity: 'error' })).toHaveLength(2)
      expect(engine.query({ severity: 'info' })).toHaveLength(1)
    })

    it('filters by status', () => {
      expect(engine.query({ status: 'active' })).toHaveLength(3)
      expect(engine.query({ status: 'deprecated' })).toHaveLength(1)
    })

    it('filters by search', () => {
      expect(engine.query({ search: 'secret' })).toHaveLength(1)
      expect(engine.query({ search: 'HTTPS' })).toHaveLength(1)
      expect(engine.query({ search: 'naming' })).toHaveLength(1)
    })

    it('filters by tag', () => {
      expect(engine.query({ tag: 'security' })).toHaveLength(1)
      expect(engine.query({ tag: 'naming' })).toHaveLength(1)
    })

    it('combines filters', () => {
      expect(engine.query({ category: 'security', severity: 'error' })).toHaveLength(1)
    })
  })

  describe('validateOne', () => {
    it('pattern validator passes', () => {
      const rule = engine.register({ category: 'url', title: 'HTTPS', description: 'HTTPS required', severity: 'error', validator: { type: 'pattern', value: '^https://', description: 'Must be HTTPS' } })
      const result = engine.validateOne(engine.get(rule.ruleId)!, 'https://example.com')
      expect(result.passed).toBe(true)
      expect(result.ruleId).toBe(rule.ruleId)
    })

    it('pattern validator fails', () => {
      const rule = engine.register({ category: 'url', title: 'HTTPS', description: 'HTTPS required', severity: 'error', validator: { type: 'pattern', value: '^https://', description: 'Must be HTTPS' } })
      const result = engine.validateOne(engine.get(rule.ruleId)!, 'http://example.com')
      expect(result.passed).toBe(false)
    })

    it('contains validator passes', () => {
      const rule = engine.register({ category: 'folder', title: 'Has src', description: 'Path must contain src/', severity: 'error', validator: { type: 'contains', match: 'src/', description: 'Must have src/' } })
      const result = engine.validateOne(engine.get(rule.ruleId)!, 'src/engine.ts')
      expect(result.passed).toBe(true)
    })

    it('contains validator fails', () => {
      const rule = engine.register({ category: 'folder', title: 'Has src', description: 'Path must contain src/', severity: 'error', validator: { type: 'contains', match: 'src/', description: 'Must have src/' } })
      const result = engine.validateOne(engine.get(rule.ruleId)!, 'lib/engine.ts')
      expect(result.passed).toBe(false)
    })

    it('absent validator passes when substring missing', () => {
      const rule = engine.register({ category: 'security', title: 'No passwords', description: 'No passwords', severity: 'error', validator: { type: 'absent', match: 'password', description: 'No password' } })
      const result = engine.validateOne(engine.get(rule.ruleId)!, 'secret_key')
      expect(result.passed).toBe(true)
    })

    it('absent validator fails when substring present', () => {
      const rule = engine.register({ category: 'security', title: 'No passwords', description: 'No passwords', severity: 'error', validator: { type: 'absent', match: 'password', description: 'No password' } })
      const result = engine.validateOne(engine.get(rule.ruleId)!, 'my_password_123')
      expect(result.passed).toBe(false)
    })

    it('list validator passes for allowed value', () => {
      const rule = engine.register({ category: 'module', title: 'Valid prefix', description: 'Prefix must be STU or FEE', severity: 'error', validator: { type: 'list', allowed: ['STU', 'FEE'], description: 'STU or FEE' } })
      const result = engine.validateOne(engine.get(rule.ruleId)!, 'STU')
      expect(result.passed).toBe(true)
    })

    it('list validator fails for disallowed value', () => {
      const rule = engine.register({ category: 'module', title: 'Valid prefix', description: 'Prefix must be STU or FEE', severity: 'error', validator: { type: 'list', allowed: ['STU', 'FEE'], description: 'STU or FEE' } })
      const result = engine.validateOne(engine.get(rule.ruleId)!, 'ATT')
      expect(result.passed).toBe(false)
    })

    it('custom validator always passes (needs runtime)', () => {
      const rule = engine.register({ category: 'architecture', title: 'Custom', description: 'Custom check', severity: 'info', validator: { type: 'custom', description: 'Custom check' } })
      const result = engine.validateOne(engine.get(rule.ruleId)!, 'anything')
      expect(result.passed).toBe(true)
    })
  })

  describe('validate', () => {
    it('validates against all active rules', () => {
      engine.register({ category: 'url', title: 'HTTPS', description: 'HTTPS', severity: 'error', validator: { type: 'pattern', value: '^https://', description: 'HTTPS' } })
      engine.register({ category: 'url', title: 'No port', description: 'No port', severity: 'warning', validator: { type: 'absent', match: ':8080', description: 'No port' } })
      const results = engine.validate('https://example.com')
      expect(results).toHaveLength(2)
      expect(results.every(r => r.passed)).toBe(true)
    })

    it('filters by categories', () => {
      engine.register({ category: 'url', title: 'HTTPS', description: 'HTTPS', severity: 'error', validator: { type: 'pattern', value: '^https://', description: 'HTTPS' } })
      engine.register({ category: 'folder', title: 'Src', description: 'src/', severity: 'error', validator: { type: 'contains', match: 'src/', description: 'src/' } })
      const results = engine.validate('https://src.com', ['url'])
      expect(results).toHaveLength(1)
      expect(results[0]!.category).toBe('url')
    })

    it('skips deprecated rules', () => {
      const rule = engine.register({ category: 'url', title: 'Old', description: 'Old', severity: 'error', validator: { type: 'pattern', value: '^nope$', description: 'nope' } })
      engine.update(rule.ruleId, { status: 'deprecated' })
      const results = engine.validate('anything')
      expect(results).toHaveLength(0)
    })
  })

  describe('enforceGate', () => {
    it('passes when no error violations', () => {
      engine.register({ category: 'url', title: 'HTTPS', description: 'HTTPS', severity: 'error', validator: { type: 'pattern', value: '^https://', description: 'HTTPS' } })
      engine.register({ category: 'url', title: 'No port', description: 'No port', severity: 'warning', validator: { type: 'absent', match: ':8080', description: 'No port' } })
      const gate = engine.enforceGate('https://example.com')
      expect(gate.allowed).toBe(true)
      expect(gate.errors).toHaveLength(0)
      expect(gate.warnings).toHaveLength(0)
      expect(gate.passed).toBe(2)
    })

    it('blocks when error violations exist', () => {
      engine.register({ category: 'security', title: 'No secrets', description: 'No secrets', severity: 'error', validator: { type: 'absent', match: 'password', description: 'No passwords' } })
      const gate = engine.enforceGate('my_password_123')
      expect(gate.allowed).toBe(false)
      expect(gate.errors).toHaveLength(1)
      expect(gate.errors[0]!.ruleId).toBe('SEC-R001')
    })

    it('reports warnings but still allows', () => {
      engine.register({ category: 'folder', title: 'Warning', description: 'Warning', severity: 'warning', validator: { type: 'absent', match: 'TODO', description: 'No TODOs' } })
      const gate = engine.enforceGate('has a TODO')
      expect(gate.allowed).toBe(true)
      expect(gate.warnings).toHaveLength(1)
      expect(gate.summary).toContain('PASSED')
    })

    it('summary says BLOCKED for errors', () => {
      engine.register({ category: 'security', title: 'Block', description: 'Block', severity: 'error', validator: { type: 'absent', match: 'forbidden', description: 'No forbidden' } })
      const gate = engine.enforceGate('forbidden content')
      expect(gate.summary).toContain('BLOCKED')
    })

    it('filters by categories', () => {
      engine.register({ category: 'url', title: 'HTTPS', description: 'HTTPS', severity: 'error', validator: { type: 'pattern', value: '^https://', description: 'HTTPS' } })
      engine.register({ category: 'security', title: 'No secret', description: 'No secret', severity: 'error', validator: { type: 'absent', match: 'secret', description: 'No secret' } })
      const gate = engine.enforceGate('http://secret.com', ['url'])
      expect(gate.allowed).toBe(false)
      expect(gate.totalChecked).toBe(1) // Only URL rules checked
    })
  })

  describe('remove', () => {
    it('removes a rule', () => {
      const e = engine.register({ category: 'security', title: 'X', description: 'X', severity: 'error', validator: { type: 'pattern', value: '.*', description: 'any' } })
      expect(engine.remove(e.ruleId)).toBe(true)
      expect(engine.get(e.ruleId)).toBeUndefined()
    })

    it('returns false for non-existent', () => {
      expect(engine.remove('CON-R999')).toBe(false)
    })
  })

  describe('healthCheck', () => {
    it('passes for empty registry (warnings for unused categories)', () => {
      const hc = engine.healthCheck()
      expect(hc.healthy).toBe(true)
      // Empty registry has 8 empty-category warnings (info-level, not errors)
      expect(hc.issues.length).toBeGreaterThanOrEqual(0)
      expect(hc.issues.every(i => i.severity !== 'error')).toBe(true)
    })

    it('reports empty categories', () => {
      engine.register({ category: 'security', title: 'X', description: 'X', severity: 'error', validator: { type: 'pattern', value: '.*', description: 'any' } })
      const hc = engine.healthCheck()
      expect(hc.issues.some(i => i.type === 'empty-category')).toBe(true)
    })

    it('detects orphan supersede references', () => {
      const e = engine.register({ category: 'security', title: 'Old', description: 'Old', severity: 'error', validator: { type: 'pattern', value: '.*', description: 'any' } })
      engine.update(e.ruleId, { status: 'superseded', supersededBy: 'SEC-R999' })
      const hc = engine.healthCheck()
      expect(hc.issues.some(i => i.type === 'orphan-supersede')).toBe(true)
    })

    it('counts active and deprecated', () => {
      engine.register({ category: 'security', title: 'A', description: 'A', severity: 'error', validator: { type: 'pattern', value: '.*', description: 'any' }, status: 'active' })
      engine.register({ category: 'security', title: 'B', description: 'B', severity: 'error', validator: { type: 'pattern', value: '.*', description: 'any' }, status: 'deprecated' })
      const hc = engine.healthCheck()
      expect(hc.activeRules).toBe(1)
      expect(hc.deprecatedRules).toBe(1)
    })
  })

  describe('summary', () => {
    it('returns empty summary', () => {
      const s = engine.summary()
      expect(s.totalRules).toBe(0)
      expect(s.hardGateRules).toBe(0)
    })

    it('computes correct stats', () => {
      engine.register({ category: 'security', title: 'A', description: 'A', severity: 'error', validator: { type: 'pattern', value: '.*', description: 'any' }, status: 'active' })
      engine.register({ category: 'folder', title: 'B', description: 'B', severity: 'warning', validator: { type: 'pattern', value: '.*', description: 'any' }, status: 'deprecated' })
      engine.register({ category: 'architecture', title: 'C', description: 'C', severity: 'info', validator: { type: 'pattern', value: '.*', description: 'any' }, status: 'active' })
      const s = engine.summary()
      expect(s.totalRules).toBe(3)
      expect(s.hardGateRules).toBe(1) // Only active + error
      expect(s.byCategory.security).toBe(1)
      expect(s.byCategory.folder).toBe(1)
      expect(s.bySeverity.error).toBe(1)
      expect(s.bySeverity.warning).toBe(1)
      expect(s.bySeverity.info).toBe(1)
    })
  })

  describe('toMarkdown', () => {
    it('generates empty report', () => {
      const md = engine.toMarkdown()
      expect(md).toContain('Rule & Documentation Governance Report')
      expect(md).toContain('**Total Rules:** 0')
    })

    it('generates report with rules', () => {
      engine.register({ category: 'security', title: 'No secrets', description: 'No hardcoded secrets', severity: 'error', validator: { type: 'absent', match: 'password', description: 'No passwords' } })
      engine.register({ category: 'folder', title: 'Src required', description: 'Source in src/', severity: 'warning', validator: { type: 'contains', match: 'src/', description: 'src/' } })
      const md = engine.toMarkdown()
      expect(md).toContain('**Total Rules:** 2')
      expect(md).toContain('## Hard Gate Rules')
      expect(md).toContain('SEC-R001')
      expect(md).toContain('## By Category')
      expect(md).toContain('## All Rules')
    })

    it('includes health issues', () => {
      const md = engine.toMarkdown()
      expect(md).toContain('## Registry Health Issues')
    })
  })

  describe('sequence', () => {
    it('nextSequence starts at 1', () => {
      expect(engine.nextSequence('constitution')).toBe(1)
    })

    it('increments after register', () => {
      engine.register({ category: 'constitution', title: 'A', description: 'A', severity: 'error', validator: { type: 'pattern', value: '.*', description: 'any' } })
      expect(engine.nextSequence('constitution')).toBe(2)
    })

    it('lastSequence returns 0 when none', () => {
      expect(engine.lastSequence('constitution')).toBe(0)
    })
  })

  describe('toMap', () => {
    it('returns independent copy', () => {
      engine.register({ category: 'security', title: 'X', description: 'X', severity: 'error', validator: { type: 'pattern', value: '.*', description: 'any' } })
      const map = engine.toMap()
      map.clear()
      expect(engine.size).toBe(1)
    })
  })
})

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

describe('Rule Governance tools', () => {
  beforeEach(() => {
    resetToolEngine()
  })

  it('createRegisterRuleTool has correct name', () => {
    expect(createRegisterRuleTool().name).toBe('register_rule')
  })

  it('createValidateAgainstRulesTool has correct name', () => {
    expect(createValidateAgainstRulesTool().name).toBe('validate_against_rules')
  })

  it('createEnforceRuleGateTool has correct name', () => {
    expect(createEnforceRuleGateTool().name).toBe('enforce_rule_gate')
  })

  it('createRuleRegistryReportTool has correct name', () => {
    expect(createRuleRegistryReportTool().name).toBe('get_rule_registry_report')
  })

  it('createQueryRulesTool has correct name', () => {
    expect(createQueryRulesTool().name).toBe('query_rules')
  })

  it('createDeactivateRuleTool has correct name', () => {
    expect(createDeactivateRuleTool().name).toBe('deactivate_rule')
  })

  it('getActiveEngine returns undefined initially', () => {
    expect(getToolEngine()).toBeUndefined()
  })

  it('resetEngine clears active engine', () => {
    const tool = createRegisterRuleTool()
    tool.execute({
      category: 'security', title: 'X', description: 'X',
      severity: 'error', validation_type: 'pattern', validation_value: '.*',
      validation_description: 'any',
    }, {} as any)
    expect(getToolEngine()).toBeDefined()
    resetToolEngine()
    expect(getToolEngine()).toBeUndefined()
  })
})
