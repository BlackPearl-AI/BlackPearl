/**
 * Master Module Identification tools.
 *
 * - `register_module`: register a module with dependencies
 * - `register_master_data`: register master data entity with canonical fields
 * - `resolve_foundation`: check foundation gate status
 * - `validate_naming`: validate naming consistency
 * - `get_module_map`: view the full module map
 *
 * @module @deepseek-ai/dsh-governance-layer/module-identification/tools
 */

import { HarnessError } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { ModuleIdentificationEngine } from './engine.ts'
import type { FieldDefinition, ModuleCompletionStatus } from './types.ts'

/** Active engine instance (per-session). */
let activeEngine: ModuleIdentificationEngine | undefined

/** Get the active engine. */
export function getActiveEngine(): ModuleIdentificationEngine | undefined {
  return activeEngine
}

/** Reset the active engine (for testing). */
export function resetEngine(): void {
  activeEngine = undefined
}

// ---------------------------------------------------------------------------
// Tool: register_module
// ---------------------------------------------------------------------------

/**
 * Create the `register_module` tool.
 */
export function createRegisterModuleTool() {
  return defineTool({
    name: 'register_module',
    description:
      'Register a module in the module identification system. '
      + 'Modules with no dependencies are classified as "foundation" — they must '
      + 'complete before dependent modules can start. '
      + 'Register dependencies first, then the modules that depend on them.',
    parameters: {
      id: {
        type: 'string',
        required: true,
        description: 'Unique module ID (e.g., "student-master", "enrollment").',
      },
      name: {
        type: 'string',
        required: true,
        description: 'Human-readable module name.',
      },
      description: {
        type: 'string',
        required: true,
        description: 'Module description.',
      },
      depends_on: {
        type: 'array',
        description: 'Module IDs this depends on (empty = foundation module).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          moduleId: { type: 'string', required: true },
          name: { type: 'string', required: true },
          type: { type: 'string', required: true },
          message: { type: 'string', required: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const id = args.id as string
      const name = args.name as string
      const description = args.description as string
      const dependsOn = args.depends_on as string[] | undefined

      if (!id || id.trim().length === 0) {
        throw new HarnessError('register_module: id is required', 'MODULE_ID_REQUIRED')
      }
      if (!name || name.trim().length === 0) {
        throw new HarnessError('register_module: name is required', 'MODULE_NAME_REQUIRED')
      }

      if (activeEngine === undefined) {
        activeEngine = new ModuleIdentificationEngine()
      }

      const module = activeEngine.registerModule({
        id, name, description,
        ...(dependsOn !== undefined ? { dependsOn } : {}),
      })

      return Promise.resolve({
        moduleId: module.id,
        name: module.name,
        type: module.type,
        message: `📦 Module "${name}" registered as ${module.type}`,
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { name?: string; id?: string }
      return {
        card: 'generic',
        title: `Register Module: ${input.name ?? input.id ?? '?'}`,
        kind: 'other',
        rawInput: 'Registering module',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: register_master_data
// ---------------------------------------------------------------------------

/**
 * Create the `register_master_data` tool.
 */
export function createRegisterMasterDataTool() {
  return defineTool({
    name: 'register_master_data',
    description:
      'Register a master data entity with canonical field definitions. '
      + 'All fields get registered in the naming registry for consistency. '
      + 'Field names MUST be camelCase. Display names MUST be Title Case. '
      + 'This creates the "memory" that prevents naming inconsistencies.',
    parameters: {
      id: {
        type: 'string',
        required: true,
        description: 'Unique entity ID (e.g., "student-master", "enrollment").',
      },
      name: {
        type: 'string',
        required: true,
        description: 'Human-readable entity name.',
      },
      description: {
        type: 'string',
        required: true,
        description: 'Entity description.',
      },
      module_id: {
        type: 'string',
        required: true,
        description: 'The module this entity belongs to.',
      },
      fields: {
        type: 'array',
        required: true,
        description: 'Field definitions (name, displayName, type, required, unique, isPrimaryKey, description, keywords).',
      },
      keywords: {
        type: 'array',
        description: 'Keywords for this entity.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          entityId: { type: 'string', required: true },
          name: { type: 'string', required: true },
          moduleId: { type: 'string', required: true },
          fieldCount: { type: 'number', required: true },
          message: { type: 'string', required: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const id = args.id as string
      const name = args.name as string
      const description = args.description as string
      const moduleId = args.module_id as string
      const fields = (args.fields as unknown as FieldDefinition[]) ?? []
      const keywords = args.keywords as string[] | undefined

      if (!id || !name || !description || !moduleId) {
        throw new HarnessError(
          'register_master_data: id, name, description, and module_id are required',
          'MASTER_DATA_FIELDS_REQUIRED',
        )
      }
      if (fields.length === 0) {
        throw new HarnessError(
          'register_master_data: at least one field is required',
          'MASTER_DATA_FIELDS_REQUIRED',
        )
      }

      if (activeEngine === undefined) {
        activeEngine = new ModuleIdentificationEngine()
      }

      const entity = activeEngine.registerMasterData({
        id, name, description, moduleId, fields,
        ...(keywords !== undefined ? { keywords } : {}),
      })

      return Promise.resolve({
        entityId: entity.id,
        name: entity.name,
        moduleId: entity.moduleId,
        fieldCount: entity.fields.length,
        message: `📋 Master data "${name}" registered with ${entity.fields.length} fields`,
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { name?: string; id?: string }
      return {
        card: 'generic',
        title: `Master Data: ${input.name ?? input.id ?? '?'}`,
        kind: 'other',
        rawInput: 'Registering master data',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: resolve_foundation
// ---------------------------------------------------------------------------

/**
 * Create the `resolve_foundation` tool.
 */
export function createResolveFoundationTool() {
  return defineTool({
    name: 'resolve_foundation',
    description:
      'Check the foundation gate: are all foundation modules complete? '
      + 'Shows which modules are foundation, their status, and which '
      + 'dependent modules are blocked.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          passed: { type: 'boolean', required: true },
          foundationModules: { type: 'array', required: true },
          blockedModules: { type: 'array', required: true },
          message: { type: 'string', required: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute() {
      if (activeEngine === undefined) {
        return Promise.resolve({
          passed: false,
          foundationModules: [],
          blockedModules: [],
          message: 'No modules registered',
        })
      }

      const result = activeEngine.checkFoundationGate()
      return Promise.resolve({
        passed: result.passed,
        foundationModules: result.foundationModules.map(m => ({
          moduleId: m.moduleId,
          moduleName: m.moduleName,
          status: m.status,
        })),
        blockedModules: [...result.blockedModules],
        message: result.message,
      })
    },
    presentCall(): GenericCallView {
      return {
        card: 'generic',
        title: 'Foundation Gate Check',
        kind: 'other',
        rawInput: 'Checking foundation status',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: validate_naming
// ---------------------------------------------------------------------------

/**
 * Create the `validate_naming` tool.
 */
export function createValidateNamingTool() {
  return defineTool({
    name: 'validate_naming',
    description:
      'Validate naming consistency across all registered master data. '
      + 'Checks camelCase field names, Title Case display names, '
      + 'duplicate fields across entities, and unresolved references.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          consistent: { type: 'boolean', required: true },
          fieldsChecked: { type: 'number', required: true },
          entitiesChecked: { type: 'number', required: true },
          inconsistencies: { type: 'array', required: true },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute() {
      if (activeEngine === undefined) {
        return Promise.resolve({
          consistent: true,
          fieldsChecked: 0,
          entitiesChecked: 0,
          inconsistencies: [],
        })
      }

      const result = activeEngine.validateConsistency()
      return Promise.resolve({
        consistent: result.consistent,
        fieldsChecked: result.fieldsChecked,
        entitiesChecked: result.entitiesChecked,
        inconsistencies: result.inconsistencies.map(i => ({
          variant: i.variant,
          canonical: i.canonical,
          location: i.location,
        })),
      })
    },
    presentCall(): GenericCallView {
      return {
        card: 'generic',
        title: 'Naming Validation',
        kind: 'other',
        rawInput: 'Validating consistency',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: update_module_status
// ---------------------------------------------------------------------------

/**
 * Create the `update_module_status` tool.
 */
export function createUpdateModuleStatusTool() {
  return defineTool({
    name: 'update_module_status',
    description:
      'Update a module\'s completion status. '
      + 'Use this when a module finishes work to unblock dependent modules.',
    parameters: {
      module_id: {
        type: 'string',
        required: true,
        description: 'The module ID to update.',
      },
      status: {
        type: 'string',
        required: true,
        enum: ['not-started', 'in-progress', 'completed', 'blocked'] as const,
        description: 'The new status.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          moduleId: { type: 'string', required: true },
          name: { type: 'string', required: true },
          oldStatus: { type: 'string', required: true },
          newStatus: { type: 'string', required: true },
          message: { type: 'string', required: true },
        },
      } as const,
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      if (activeEngine === undefined) {
        throw new HarnessError(
          'update_module_status: no active module map — register modules first',
          'MODULE_MAP_NOT_INITIALIZED',
        )
      }

      const moduleId = args.module_id as string
      const status = args.status as ModuleCompletionStatus
      const module = activeEngine.getModule(moduleId)
      if (!module) {
        throw new HarnessError(
          `update_module_status: module "${moduleId}" not found`,
          'MODULE_NOT_FOUND',
        )
      }

      const oldStatus = module.completionStatus
      const updated = activeEngine.updateModuleStatus(moduleId, status)

      const gate = activeEngine.checkFoundationGate()
      const message = status === 'completed'
        ? `✅ Module "${updated.name}" completed — ${gate.message}`
        : `🔄 Module "${updated.name}" status: ${oldStatus} → ${status}`

      return Promise.resolve({
        moduleId: updated.id,
        name: updated.name,
        oldStatus,
        newStatus: updated.completionStatus,
        message,
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { module_id?: string; status?: string }
      return {
        card: 'generic',
        title: `Module Status: ${input.module_id ?? '?'}`,
        kind: 'other',
        rawInput: input.status ?? '',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_module_map
// ---------------------------------------------------------------------------

/**
 * Create the `get_module_map` tool.
 */
export function createGetModuleMapTool() {
  return defineTool({
    name: 'get_module_map',
    description:
      'Get the full module identification map with all modules, master data, '
      + 'naming registry, and foundation gate status.',
    parameters: {
      format: {
        type: 'string',
        enum: ['json', 'markdown'] as const,
        description: 'Output format (default json).',
      },
    },
    output: {
      schema: {
        type: 'object' as const,
        additionalProperties: false as const,
        properties: {
          modules: { type: 'array' as const, required: true as const },
          masterDataEntities: { type: 'array' as const, required: true as const },
          namingRegistryCount: { type: 'number' as const },
          foundationGate: {
            type: 'object' as const,
            additionalProperties: false as const,
            properties: {
              passed: { type: 'boolean' as const, required: true as const },
              message: { type: 'string' as const, required: true as const },
            },
          },
          markdown: { type: 'string' as const },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      if (activeEngine === undefined) {
        return Promise.resolve({
          modules: [],
          masterDataEntities: [],
          namingRegistryCount: 0,
          foundationGate: { passed: false, message: 'No modules registered' },
        })
      }

      const map = activeEngine.getMap()
      const gate = activeEngine.checkFoundationGate()
      const format = args.format as string | undefined

      const modules = Object.values(map.modules).map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          completionStatus: m.completionStatus,
          dependsOn: [...m.dependsOn],
          masterDataEntities: [...m.masterDataEntities],
        }))
        const masterDataEntities = Object.values(map.masterData).map(e => ({
          id: e.id,
          name: e.name,
          moduleId: e.moduleId,
          fieldCount: e.fields.length,
          fields: e.fields.map(f => f.name),
        }))

        return Promise.resolve({
          modules,
          masterDataEntities,
          namingRegistryCount: map.namingRegistry.length,
          foundationGate: { passed: gate.passed, message: gate.message },
          ...(format === 'markdown' ? { markdown: activeEngine.toMarkdown() } : {}),
        })
    },
    presentCall(): GenericCallView {
      return {
        card: 'generic',
        title: 'Module Identification Map',
        kind: 'other',
        rawInput: 'Viewing module map',
      }
    },
  })
}
