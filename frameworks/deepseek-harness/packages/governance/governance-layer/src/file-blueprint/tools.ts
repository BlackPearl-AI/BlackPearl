/**
 * File / Folder Blueprint tools — PHASE 08.
 *
 * - `create_file_blueprint`: create a blueprint for a module
 * - `add_files_to_blueprint`: add files to a module's blueprint
 * - `add_folders_to_blueprint`: add folders to a module's blueprint
 * - `validate_file_blueprint`: validate a blueprint against rules
 * - `check_coding_gate`: check if coding may begin for a module
 *
 * @module @deepseek-ai/dsh-governance-layer/file-blueprint/tools
 */

import { HarnessError } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { FileBlueprintEngine } from './engine.ts'
import type { FileEntryType } from './types.ts'
import { FILE_ENTRY_TYPES } from './types.ts'

/** Active engine instance (per-session). */
let activeEngine: FileBlueprintEngine | undefined

/** Get the active engine. */
export function getActiveEngine(): FileBlueprintEngine | undefined {
  return activeEngine
}

/** Reset the active engine (for testing). */
export function resetEngine(): void {
  activeEngine = undefined
}

function ensureEngine(): FileBlueprintEngine {
  if (activeEngine === undefined) {
    activeEngine = new FileBlueprintEngine()
  }
  return activeEngine
}

// ---------------------------------------------------------------------------
// Tool: create_file_blueprint
// ---------------------------------------------------------------------------

/**
 * Create the `create_file_blueprint` tool.
 */
export function createCreateFileBlueprintTool() {
  return defineTool({
    name: 'create_file_blueprint',
    description:
      'Create a file/folder blueprint for a module. '
      + 'This defines the exact file structure before coding begins. '
      + 'NO FILE BLUEPRINT = NO CODING.',
    parameters: {
      module_id: {
        type: 'string',
        required: true,
        description: 'Module ID to create the blueprint for.',
      },
      module_name: {
        type: 'string',
        required: true,
        description: 'Display name for the module.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          moduleId: { type: 'string', required: true },
          moduleName: { type: 'string', required: true },
          status: { type: 'string', required: true },
          fileCount: { type: 'number', required: true },
          folderCount: { type: 'number', required: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const moduleId = args.module_id as string
      const moduleName = args.module_name as string

      const bp = engine.createBlueprint({ moduleId, moduleName })
      return Promise.resolve({
        moduleId: bp.moduleId,
        moduleName: bp.moduleName,
        status: bp.status,
        fileCount: bp.files.length,
        folderCount: bp.folders.length,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: add_files_to_blueprint
// ---------------------------------------------------------------------------

/**
 * Create the `add_files_to_blueprint` tool.
 */
export function createAddFilesToBlueprintTool() {
  return defineTool({
    name: 'add_files_to_blueprint',
    description:
      'Add files to a module\'s file blueprint. '
      + 'Each file must have a path, type, and purpose.',
    parameters: {
      module_id: {
        type: 'string',
        required: true,
        description: 'Module ID to add files to.',
      },
      files: {
        type: 'string',
        required: true,
        description: 'JSON array of files: [{ "path": "src/engine.ts", "type": "source", "purpose": "Main engine logic" }]',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          moduleId: { type: 'string', required: true },
          fileCount: { type: 'number', required: true },
          files: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                path: { type: 'string' },
                type: { type: 'string' },
                purpose: { type: 'string' },
              },
            },
          },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const moduleId = args.module_id as string

      let parsed: unknown[]
      try {
        parsed = JSON.parse(args.files as string) as unknown[]
      } catch {
        throw new HarnessError('files must be a valid JSON array', 'GOVERNANCE_INVALID_JSON')
      }

      const files = parsed.map((f: unknown) => {
        const entry = f as Record<string, unknown>
        const type = entry.type as FileEntryType
        if (!FILE_ENTRY_TYPES.includes(type)) {
          throw new HarnessError(`Invalid file type "${type}". Valid types: ${FILE_ENTRY_TYPES.join(', ')}`, 'GOVERNANCE_INVALID_FILE_TYPE')
        }
        return {
          path: entry.path as string,
          type,
          purpose: entry.purpose as string,
          ...(typeof entry.maxBytes === 'number' ? { maxBytes: entry.maxBytes } : {}),
          ...(Array.isArray(entry.requiredExports) ? { requiredExports: [...entry.requiredExports] as readonly string[] } : {}),
          ...(Array.isArray(entry.dependsOn) ? { dependsOn: [...entry.dependsOn] as readonly string[] } : {}),
        }
      })

      const updated = engine.addFiles(moduleId, files)
      return Promise.resolve({
        moduleId: updated.moduleId,
        fileCount: updated.files.length,
        files: updated.files.map(f => ({ path: f.path, type: f.type, purpose: f.purpose })),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: add_folders_to_blueprint
// ---------------------------------------------------------------------------

/**
 * Create the `add_folders_to_blueprint` tool.
 */
export function createAddFoldersToBlueprintTool() {
  return defineTool({
    name: 'add_folders_to_blueprint',
    description:
      'Add folders to a module\'s file blueprint.',
    parameters: {
      module_id: {
        type: 'string',
        required: true,
        description: 'Module ID to add folders to.',
      },
      folders: {
        type: 'string',
        required: true,
        description: 'JSON array of folders: [{ "path": "src/domain", "purpose": "Domain logic" }]',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          moduleId: { type: 'string', required: true },
          folderCount: { type: 'number', required: true },
          folders: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                path: { type: 'string' },
                purpose: { type: 'string' },
              },
            },
          },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const moduleId = args.module_id as string

      let parsed: unknown[]
      try {
        parsed = JSON.parse(args.folders as string) as unknown[]
      } catch {
        throw new HarnessError('folders must be a valid JSON array', 'GOVERNANCE_INVALID_JSON')
      }

      const folders = parsed.map((f: unknown) => {
        const entry = f as Record<string, unknown>
        return {
          path: entry.path as string,
          purpose: entry.purpose as string,
          ...(Array.isArray(entry.expectedContents) ? { expectedContents: [...entry.expectedContents] as readonly string[] } : {}),
          ...(typeof entry.maxFiles === 'number' ? { maxFiles: entry.maxFiles } : {}),
        }
      })

      const updated = engine.addFolders(moduleId, folders)
      return Promise.resolve({
        moduleId: updated.moduleId,
        folderCount: updated.folders.length,
        folders: updated.folders.map(f => ({ path: f.path, purpose: f.purpose })),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: validate_file_blueprint
// ---------------------------------------------------------------------------

/**
 * Create the `validate_file_blueprint` tool.
 */
export function createValidateFileBlueprintTool() {
  return defineTool({
    name: 'validate_file_blueprint',
    description:
      'Validate a file blueprint against universal folder rules and internal consistency. '
      + 'Returns violations and whether the blueprint is valid.',
    parameters: {
      module_id: {
        type: 'string',
        required: true,
        description: 'Module ID to validate.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          moduleId: { type: 'string', required: true },
          valid: { type: 'boolean', required: true },
          fileCount: { type: 'number', required: true },
          folderCount: { type: 'number', required: true },
          violationCount: { type: 'number', required: true },
          violations: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                rule: { type: 'string' },
                severity: { type: 'string' },
                message: { type: 'string' },
                path: { type: 'string' },
              },
            },
          },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const moduleId = args.module_id as string
      const report = engine.validate(moduleId)

      return Promise.resolve({
        moduleId: report.moduleId,
        valid: report.valid,
        fileCount: report.fileCount,
        folderCount: report.folderCount,
        violationCount: report.violations.length,
        violations: report.violations.map(v => ({
          rule: v.rule,
          severity: v.severity,
          message: v.message,
          path: v.path,
        })),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: check_coding_gate
// ---------------------------------------------------------------------------

/**
 * Create the `check_coding_gate` tool.
 */
export function createCheckCodingGateTool() {
  return defineTool({
    name: 'check_coding_gate',
    description:
      'Check if coding may begin for a module. '
      + 'RULE: NO FILE BLUEPRINT = NO CODING. '
      + 'Blueprint must exist, be approved, and pass validation.',
    parameters: {
      module_id: {
        type: 'string',
        required: true,
        description: 'Module ID to check.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          moduleId: { type: 'string', required: true },
          allowed: { type: 'boolean', required: true },
          status: { type: 'string', required: true },
          summary: { type: 'string', required: true },
          violationCount: { type: 'number', required: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const moduleId = args.module_id as string
      const gate = engine.checkCodingGate(moduleId)

      return Promise.resolve({
        moduleId,
        allowed: gate.allowed,
        status: gate.status,
        summary: gate.summary,
        violationCount: gate.violations.length,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_file_blueprint_report
// ---------------------------------------------------------------------------

/**
 * Create the `get_file_blueprint_report` tool.
 */
export function createFileBlueprintReportTool() {
  return defineTool({
    name: 'get_file_blueprint_report',
    description:
      'Generate a markdown report of file/folder blueprints for one or all modules.',
    parameters: {
      module_id: {
        type: 'string',
        description: 'Optional module ID to report on. If omitted, reports on all.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          report: { type: 'string', required: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const moduleId = args.module_id as string | undefined
      const report = engine.toMarkdown(moduleId)
      return Promise.resolve({ report })
    },
  })
}
