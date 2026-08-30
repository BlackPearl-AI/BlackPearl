/**
 * Master Module Identification — PHASE 05.
 *
 * Identifies foundation modules, registers master data with canonical
 * field definitions, maintains a naming registry, and enforces
 * dependency gates.
 *
 * @module @deepseek-ai/dsh-governance-layer/module-identification
 */

export { ModuleIdentificationEngine } from './engine.ts'

export {
  createRegisterModuleTool,
  createRegisterMasterDataTool,
  createResolveFoundationTool,
  createValidateNamingTool,
  createUpdateModuleStatusTool,
  createGetModuleMapTool,
  getActiveEngine,
  resetEngine,
} from './tools.ts'

export type {
  FieldType,
  FieldDefinition,
  MasterDataEntity,
  NamingEntry,
  ModuleType,
  ModuleCompletionStatus,
  ModuleDefinition,
  FoundationGateResult,
  FoundationModuleStatus,
  NamingInconsistency,
  ConsistencyResult,
  ModuleMap,
} from './types.ts'

export { FIELD_TYPE_LABELS } from './types.ts'
