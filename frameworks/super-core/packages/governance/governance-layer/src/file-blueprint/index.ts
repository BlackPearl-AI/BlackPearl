/**
 * File / Folder Blueprint — barrel exports.
 *
 * @module @deepseek-ai/dsh-governance-layer/file-blueprint
 */

export { FileBlueprintEngine } from './engine.ts'

export {
  createCreateFileBlueprintTool,
  createAddFilesToBlueprintTool,
  createAddFoldersToBlueprintTool,
  createValidateFileBlueprintTool,
  createCheckCodingGateTool,
  createFileBlueprintReportTool,
  getActiveEngine,
  resetEngine,
} from './tools.ts'

export {
  UNIVERSAL_FOLDER_RULES,
  FILE_ENTRY_TYPES,
  FILE_ENTRY_TYPE_LABELS,
  FILE_ENTRY_TYPE_ICONS,
  BLUEPRINT_APPROVAL_LABELS,
  BLUEPRINT_APPROVAL_ICONS,
} from './types.ts'

export type {
  FileEntryType,
  FileEntry,
  FolderRuleMode,
  FolderRule,
  FolderEntry,
  BlueprintApprovalStatus,
  FileBlueprint,
  BlueprintViolation,
  CodingGateResult,
  BlueprintValidationReport,
  FileBlueprintQuery,
  FileBlueprintSummary,
} from './types.ts'
