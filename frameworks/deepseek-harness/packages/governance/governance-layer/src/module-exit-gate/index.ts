/**
 * PHASE 17 — Module Exit Gate barrel exports.
 *
 * Validates a module against all 8 exit gate criteria before advancing
 * to the next module.
 *
 * @module @deepseek-ai/dsh-governance-layer/module-exit-gate
 */

export {
  createCheckModuleExitGateTool,
  resetExitGateEngine,
  getExitGateEngine,
} from './tools.ts'
