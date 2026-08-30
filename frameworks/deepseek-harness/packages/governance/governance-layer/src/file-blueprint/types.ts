/**
 * File / Folder Blueprint types — PHASE 08.
 *
 * Defines the exact file/folder structure for a module before coding begins.
 * Universal folder rules are mandatory: NO FILE BLUEPRINT = NO CODING.
 *
 * @module @deepseek-ai/dsh-governance-layer/file-blueprint/types
 */

// ---------------------------------------------------------------------------
// File / Folder Entry
// ---------------------------------------------------------------------------

/** File type classification. */
export type FileEntryType =
  | 'source'
  | 'test'
  | 'config'
  | 'doc'
  | 'data'
  | 'asset'
  | 'barrel'
  | 'schema'
  | 'migration'
  | 'fixture'

/** A single file entry in the blueprint. */
export interface FileEntry {
  /** Relative path from the module root (e.g. 'src/engine.ts'). */
  readonly path: string
  /** Classification. */
  readonly type: FileEntryType
  /** Purpose description. */
  readonly purpose: string
  /** Expected max size in bytes (0 = no limit). */
  readonly maxBytes?: number
  /** Required exports this file must expose. */
  readonly requiredExports?: readonly string[]
  /** Dependencies on other files in this blueprint (relative paths). */
  readonly dependsOn?: readonly string[]
}

/** Folder rule enforcement mode. */
export type FolderRuleMode = 'required' | 'forbidden' | 'pattern'

/** A folder-level rule that applies to all modules. */
export interface FolderRule {
  /** Glob pattern for the folder path (e.g. 'src/star-star/star.ts'). */
  readonly pattern: string
  /** Enforcement mode. */
  readonly mode: FolderRuleMode
  /** Human-readable description. */
  readonly description: string
  /** If pattern mode: regex that filenames must match (e.g. '.*\\.ts$'). */
  readonly filenamePattern?: string
}

/** A folder entry in the blueprint. */
export interface FolderEntry {
  /** Relative path from the module root (e.g. 'src/domain'). */
  readonly path: string
  /** Purpose description. */
  readonly purpose: string
  /** Expected contents (file globs or subfolder names). */
  readonly expectedContents?: readonly string[]
  /** Maximum number of files allowed in this folder (0 = no limit). */
  readonly maxFiles?: number
}

// ---------------------------------------------------------------------------
// Blueprint Status
// ---------------------------------------------------------------------------

/** Blueprint approval status. */
export type BlueprintApprovalStatus =
  | 'draft'
  | 'pending-review'
  | 'approved'
  | 'rejected'
  | 'superseded'

/** Status labels. */
export const BLUEPRINT_APPROVAL_LABELS: Record<BlueprintApprovalStatus, string> = {
  'draft': 'Draft',
  'pending-review': 'Pending Review',
  'approved': 'Approved',
  'rejected': 'Rejected',
  'superseded': 'Superseded',
}

/** Status icons. */
export const BLUEPRINT_APPROVAL_ICONS: Record<BlueprintApprovalStatus, string> = {
  'draft': '📝',
  'pending-review': '👀',
  'approved': '✅',
  'rejected': '❌',
  'superseded': '🔄',
}

// ---------------------------------------------------------------------------
// File Blueprint
// ---------------------------------------------------------------------------

/** A complete file/folder blueprint for a single module. */
export interface FileBlueprint {
  /** Module ID this blueprint belongs to. */
  readonly moduleId: string
  /** Module display name. */
  readonly moduleName: string
  /** Approval status. */
  status: BlueprintApprovalStatus
  /** All planned files. */
  files: readonly FileEntry[]
  /** All planned folders. */
  folders: readonly FolderEntry[]
  /** Creation timestamp. */
  readonly createdAt: string
  /** Last update timestamp. */
  updatedAt: string
  /** Reviewer notes (set during approval/rejection). */
  reviewNotes?: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** A single validation violation. */
export interface BlueprintViolation {
  /** Rule or check that failed. */
  readonly rule: string
  /** Severity of the violation. */
  readonly severity: 'error' | 'warning' | 'info'
  /** Human-readable message. */
  readonly message: string
  /** The file or folder path involved. */
  readonly path?: string
}

/** Gate check result — determines if coding may begin. */
export interface CodingGateResult {
  /** Whether coding is allowed. */
  readonly allowed: boolean
  /** Blueprint status. */
  readonly status: BlueprintApprovalStatus
  /** Violations blocking coding (empty = allowed). */
  readonly violations: readonly BlueprintViolation[]
  /** Human-readable summary. */
  readonly summary: string
}

/** Validation report for a single module. */
export interface BlueprintValidationReport {
  /** Module ID. */
  readonly moduleId: string
  /** Whether the blueprint passes all checks. */
  readonly valid: boolean
  /** All violations. */
  readonly violations: readonly BlueprintViolation[]
  /** Number of files planned. */
  readonly fileCount: number
  /** Number of folders planned. */
  readonly folderCount: number
  /** Missing universal rule compliance. */
  readonly ruleViolations: readonly BlueprintViolation[]
  /** Internal consistency issues (duplicate paths, missing deps). */
  readonly internalIssues: readonly BlueprintViolation[]
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/** Query filter for file blueprints. */
export interface FileBlueprintQuery {
  /** Filter by module ID. */
  readonly moduleId?: string
  /** Filter by approval status. */
  readonly status?: BlueprintApprovalStatus
  /** Filter by file type present in blueprint. */
  readonly hasFileType?: FileEntryType
}

/** Summary statistics for all blueprints. */
export interface FileBlueprintSummary {
  /** Total blueprints. */
  readonly totalBlueprints: number
  /** Count by status. */
  readonly byStatus: Record<BlueprintApprovalStatus, number>
  /** Total planned files across all blueprints. */
  readonly totalFiles: number
  /** Total planned folders across all blueprints. */
  readonly totalFolders: number
  /** Blueprints not yet approved. */
  readonly pendingApproval: readonly string[]
  /** Average files per blueprint. */
  readonly averageFilesPerBlueprint: number
}

// ---------------------------------------------------------------------------
// Universal Folder Rules (defaults)
// ---------------------------------------------------------------------------

/** Default universal folder rules for all modules. */
export const UNIVERSAL_FOLDER_RULES: readonly FolderRule[] = [
  {
    pattern: 'src/**',
    mode: 'required',
    description: 'All source code must reside under src/.',
  },
  {
    pattern: 'tests/**',
    mode: 'required',
    description: 'All tests must reside under tests/.',
  },
  {
    pattern: 'src/**/*.test.ts',
    mode: 'forbidden',
    description: 'Test files must not be mixed with source files.',
  },
  {
    pattern: 'src/**/*.spec.ts',
    mode: 'forbidden',
    description: 'Spec files must not be mixed with source files.',
  },
  {
    pattern: 'tests/**',
    mode: 'pattern',
    description: 'Test files must follow the *.spec.ts naming convention.',
    filenamePattern: '.*\\.spec\\.ts$',
  },
  {
    pattern: 'src/index.ts',
    mode: 'required',
    description: 'Module must have a barrel export (src/index.ts).',
  },
]

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All recognized file entry types. */
export const FILE_ENTRY_TYPES: readonly FileEntryType[] = [
  'source', 'test', 'config', 'doc', 'data', 'asset', 'barrel', 'schema', 'migration', 'fixture',
]

/** Labels for file entry types. */
export const FILE_ENTRY_TYPE_LABELS: Record<FileEntryType, string> = {
  'source': 'Source',
  'test': 'Test',
  'config': 'Config',
  'doc': 'Documentation',
  'data': 'Data',
  'asset': 'Asset',
  'barrel': 'Barrel Export',
  'schema': 'Schema',
  'migration': 'Migration',
  'fixture': 'Fixture',
}

/** Icons for file entry types. */
export const FILE_ENTRY_TYPE_ICONS: Record<FileEntryType, string> = {
  'source': '📄',
  'test': '🧪',
  'config': '⚙️',
  'doc': '📖',
  'data': '💾',
  'asset': '🖼️',
  'barrel': '📦',
  'schema': '🔑',
  'migration': '🔄',
  'fixture': '🔧',
}
