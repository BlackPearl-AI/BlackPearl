/**
 * PHASE 13 — Pre-Coding Audit
 *
 * Final quality gate before implementation begins.
 * Checks 7 critical areas:
 *   1. Requirement clear?
 *   2. Blueprint complete?
 *   3. Files known?
 *   4. Rules loaded?
 *   5. Dependencies known?
 *   6. Tests defined?
 *   7. Conflict exists?
 *
 * सब PASS होने पर ही coding।
 */

export type {
  AuditCategory,
  AuditCheckStatus,
  CheckSeverity,
  AuditCheck,
  AuditVerdict,
  AuditConfig,
  PreCodingAuditResult,
} from './types.ts'

export { PreCodingAuditEngine } from './engine.ts'

export {
  createRunPreCodingAuditTool,
  createCheckCodingReadinessTool,
  resetEngine,
  getActiveEngine,
} from './tools.ts'
