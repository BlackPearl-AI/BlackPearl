/**
 * Rule & Documentation Governance — barrel exports.
 *
 * @module @deepseek-ai/dsh-governance-layer/rule-governance
 */

export { RuleGovernanceEngine } from './engine.ts'

export {
  createRegisterRuleTool,
  createValidateAgainstRulesTool,
  createEnforceRuleGateTool,
  createRuleRegistryReportTool,
  createQueryRulesTool,
  createDeactivateRuleTool,
  getActiveEngine,
  resetEngine,
} from './tools.ts'

export {
  ALL_CATEGORIES,
  RULE_CATEGORY_PREFIXES,
  RULE_CATEGORY_LABELS,
  RULE_CATEGORY_ICONS,
  RULE_SEVERITY_LABELS,
  RULE_SEVERITY_ICONS,
  RULE_STATUS_LABELS,
  RULE_STATUS_ICONS,
  generateRuleId,
  parseRuleId,
  categorySequenceKey,
} from './types.ts'

export type {
  RuleCategory,
  RuleSeverity,
  RuleStatus,
  ValidationType,
  RuleValidator,
  RuleEntry,
  RuleValidationResult,
  RuleGateResult,
  RegistryHealthReport,
  RegistryIssue,
  RuleQuery,
  RuleRegistrySummary,
} from './types.ts'
