/**
 * Element Registry — barrel exports.
 *
 * @module @deepseek-ai/dsh-governance-layer/element-registry
 */

export { ElementRegistryEngine } from './engine.ts'

export {
  createRegisterElementTool,
  createBulkRegisterElementsTool,
  createFindElementTool,
  createElementRegistryReportTool,
  createValidateElementRegistryTool,
  createGetNextSequenceTool,
  getActiveEngine,
  resetEngine,
} from './tools.ts'

export {
  ALL_ELEMENT_TYPES,
  ELEMENT_TYPE_PREFIXES,
  ELEMENT_TYPE_LABELS,
  ELEMENT_TYPE_ICONS,
  ELEMENT_STATUS_LABELS,
  ELEMENT_STATUS_ICONS,
  generateElementId,
  parseElementId,
  sequenceKey,
} from './types.ts'

export type {
  ElementType,
  ElementStatus,
  ElementEntry,
  ElementRegistry,
  ElementQuery,
  RegistryViolation,
  RegistryValidationReport,
  ElementRegistrySummary,
} from './types.ts'
