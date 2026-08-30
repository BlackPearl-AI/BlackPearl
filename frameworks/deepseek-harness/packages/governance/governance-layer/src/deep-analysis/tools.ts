/**
 * Master Module Deep Analysis tools.
 *
 * - `analyze_module`: register data for a specific dimension
 * - `get_analysis`: get the full analysis for a module
 * - `validate_completeness`: compute completeness scores
 * - `get_deep_analysis_report`: generate comprehensive report
 *
 * @module @deepseek-ai/dsh-governance-layer/deep-analysis/tools
 */

import { HarnessError } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView, JsonValue } from '@deepseek-ai/dsh-tools'
import { MasterModuleDeepAnalysisEngine } from './engine.ts'

/** Active engine instance (per-session). */
let activeEngine: MasterModuleDeepAnalysisEngine | undefined

/** Get the active engine. */
export function getActiveEngine(): MasterModuleDeepAnalysisEngine | undefined {
  return activeEngine
}

/** Reset the active engine (for testing). */
export function resetEngine(): void {
  activeEngine = undefined
}

// ---------------------------------------------------------------------------
// Tool: analyze_module
// ---------------------------------------------------------------------------

/**
 * Create the `analyze_module` tool.
 */
export function createAnalyzeModuleTool() {
  return defineTool({
    name: 'analyze_module',
    description:
      'Register analysis data for a specific dimension of a master module. '
      + 'Supported dimensions: data, fields, ids, validation, database, api, ui, '
      + 'buttons, dropdowns, settings, permissions, print, workflow, dependencies, tests. '
      + 'Each call populates one dimension. Call multiple times to build a complete picture.',
    parameters: {
      module_id: {
        type: 'string',
        required: true,
        description: 'The module to analyze.',
      },
      dimension: {
        type: 'string',
        required: true,
        enum: [
          'data', 'fields', 'ids', 'validation', 'database',
          'api', 'ui', 'buttons', 'dropdowns', 'settings',
          'permissions', 'print', 'workflow', 'dependencies', 'tests',
        ] as const,
        description: 'The analysis dimension.',
      },
      data: {
        type: 'object',
        additionalProperties: true,
        required: true,
        description: 'Dimension-specific analysis data (shape varies by dimension).',
      },
      notes: {
        type: 'string',
        description: 'Optional notes for this analysis.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          moduleId: { type: 'string', required: true },
          dimension: { type: 'string', required: true },
          status: { type: 'string', required: true },
          message: { type: 'string', required: true },
        },
      } as const,
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const moduleId = args.module_id as string
      const dimension = args.dimension as string
      const data = args.data as Record<string, unknown>
      const notes = args.notes as string | undefined

      if (!moduleId || moduleId.trim().length === 0) {
        throw new HarnessError('analyze_module: module_id is required', 'MODULE_ID_REQUIRED')
      }
      if (!dimension || dimension.trim().length === 0) {
        throw new HarnessError('analyze_module: dimension is required', 'DIMENSION_REQUIRED')
      }
      if (!data) {
        throw new HarnessError('analyze_module: data is required', 'DATA_REQUIRED')
      }

      if (activeEngine === undefined) {
        activeEngine = new MasterModuleDeepAnalysisEngine()
      }

      // Dispatch to the appropriate dimension handler.
      dispatchDimension(activeEngine, moduleId, dimension, data, notes ?? '')

      return Promise.resolve({
        moduleId,
        dimension,
        status: 'registered',
        message: `📊 ${dimension} analysis registered for "${moduleId}"`,
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { module_id?: string; dimension?: string }
      return {
        card: 'generic',
        title: `Analyze: ${input.dimension ?? '?'} for ${input.module_id ?? '?'}`,
        kind: 'other',
        rawInput: 'Analyzing module dimension',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_analysis
// ---------------------------------------------------------------------------

/**
 * Create the `get_analysis` tool.
 */
export function createGetAnalysisTool() {
  return defineTool({
    name: 'get_analysis',
    description:
      'Get the full analysis for a master module across all 16 dimensions. '
      + 'Returns analyzed dimensions, findings, and completeness score.',
    parameters: {
      module_id: {
        type: 'string',
        required: true,
        description: 'The module to get analysis for.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          moduleId: { type: 'string', required: true },
          status: { type: 'string', required: true },
          dimensionsAnalyzed: { type: 'number', required: true },
          totalFindings: { type: 'number', required: true },
          analysis: { type: 'object', additionalProperties: true },
        },
      } as const,
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const moduleId = args.module_id as string

      if (!moduleId || moduleId.trim().length === 0) {
        throw new HarnessError('get_analysis: module_id is required', 'MODULE_ID_REQUIRED')
      }

      if (activeEngine === undefined) {
        return Promise.resolve({
          moduleId,
          status: 'not-found',
          dimensionsAnalyzed: 0,
          totalFindings: 0,
          message: 'No analysis engine initialized',
        })
      }

      const analysis = activeEngine.getAnalysis(moduleId)
      if (!analysis) {
        return Promise.resolve({
          moduleId,
          status: 'not-found',
          dimensionsAnalyzed: 0,
          totalFindings: 0,
          message: `No analysis found for module "${moduleId}"`,
        })
      }

      const dimensionsAnalyzed = [
        analysis.data, analysis.fields, analysis.ids,
        analysis.validation, analysis.database, analysis.api,
        analysis.ui, analysis.buttons, analysis.dropdowns,
        analysis.settings, analysis.permissions, analysis.print,
        analysis.workflow, analysis.dependencies, analysis.tests,
      ].filter(Boolean).length

      return Promise.resolve({
        moduleId: analysis.moduleId,
        status: analysis.status,
        dimensionsAnalyzed,
        totalFindings: analysis.findings.length,
        analysis: {
          notes: analysis.notes,
          status: analysis.status,
          ...(analysis.data !== undefined ? { data: analysis.data } : {}),
          ...(analysis.fields !== undefined ? { fields: analysis.fields } : {}),
          ...(analysis.ids !== undefined ? { ids: analysis.ids } : {}),
          ...(analysis.validation !== undefined ? { validation: analysis.validation } : {}),
          ...(analysis.database !== undefined ? { database: analysis.database } : {}),
          ...(analysis.api !== undefined ? { api: analysis.api } : {}),
          ...(analysis.ui !== undefined ? { ui: analysis.ui } : {}),
          ...(analysis.buttons !== undefined ? { buttons: analysis.buttons } : {}),
          ...(analysis.dropdowns !== undefined ? { dropdowns: analysis.dropdowns } : {}),
          ...(analysis.settings !== undefined ? { settings: analysis.settings } : {}),
          ...(analysis.permissions !== undefined ? { permissions: analysis.permissions } : {}),
          ...(analysis.print !== undefined ? { print: analysis.print } : {}),
          ...(analysis.workflow !== undefined ? { workflow: analysis.workflow } : {}),
          ...(analysis.dependencies !== undefined ? { dependencies: analysis.dependencies } : {}),
          ...(analysis.tests !== undefined ? { tests: analysis.tests } : {}),
          ...(analysis.completeness !== undefined ? { completeness: analysis.completeness } : {}),
          findings: analysis.findings.map(f => ({
            ...f,
            ...(f.field !== undefined ? { field: f.field } : {}),
            ...(f.suggestion !== undefined ? { suggestion: f.suggestion } : {}),
          })),
        } as unknown as Record<string, JsonValue>,
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { module_id?: string }
      return {
        card: 'generic',
        title: `Analysis: ${input.module_id ?? '?'}`,
        kind: 'other',
        rawInput: 'Getting module analysis',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: validate_completeness
// ---------------------------------------------------------------------------

/**
 * Create the `validate_completeness` tool.
 */
export function createValidateCompletenessTool() {
  return defineTool({
    name: 'validate_completeness',
    description:
      'Compute completeness scores for all analyzed modules or a specific module. '
      + 'Shows which dimensions are covered, which are missing, and critical gaps.',
    parameters: {
      module_id: {
        type: 'string',
        description: 'Module to validate (omit for all modules).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          moduleCount: { type: 'number', required: true },
          modules: { type: 'array', required: true },
        },
      } as const,
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      if (activeEngine === undefined) {
        return Promise.resolve({
          moduleCount: 0,
          modules: [],
          message: 'No analysis engine initialized',
        })
      }

      const moduleId = args.module_id as string | undefined

      if (moduleId) {
        const updated = activeEngine.validateCompleteness(moduleId)
        if (!updated) {
          return Promise.resolve({
            moduleCount: 0,
            modules: [],
            message: `No analysis found for module "${moduleId}"`,
          })
        }
        const score = activeEngine.computeCompleteness(moduleId)
        return Promise.resolve({
          moduleCount: 1,
          modules: [{
            moduleId,
            status: updated.status,
            overallScore: score?.overallScore ?? 0,
            analyzedCount: score?.analyzedCount ?? 0,
            missingCount: score?.missingCount ?? 0,
            criticalGaps: [...(score?.criticalDimensions ?? [])],
          }],
        })
      }

      // All modules.
      const analyses = activeEngine.getAnalyses()
      const results = analyses.map(a => {
        const updated = activeEngine!.validateCompleteness(a.moduleId)
        const score = activeEngine!.computeCompleteness(a.moduleId)
        return {
          moduleId: a.moduleId,
          status: updated?.status ?? a.status,
          overallScore: score?.overallScore ?? 0,
          analyzedCount: score?.analyzedCount ?? 0,
          missingCount: score?.missingCount ?? 0,
          criticalGaps: [...(score?.criticalDimensions ?? [])],
        }
      })

      return Promise.resolve({
        moduleCount: results.length,
        modules: results,
      })
    },
    presentCall(): GenericCallView {
      return {
        card: 'generic',
        title: 'Completeness Validation',
        kind: 'other',
        rawInput: 'Validating completeness',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_deep_analysis_report
// ---------------------------------------------------------------------------

/**
 * Create the `get_deep_analysis_report` tool.
 */
export function createDeepAnalysisReportTool() {
  return defineTool({
    name: 'get_deep_analysis_report',
    description:
      'Generate a comprehensive markdown report of the deep analysis for '
      + 'all modules or a specific module.',
    parameters: {
      module_id: {
        type: 'string',
        description: 'Module to report on (omit for all).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          report: { type: 'string', required: true },
          moduleCount: { type: 'number' },
        },
      } as const,
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: (value as { report: string }).report,
      }],
    },
    execute(args) {
      if (activeEngine === undefined) {
        return Promise.resolve({
          report: '## Master Module Deep Analysis Report\n\nNo modules analyzed.',
          moduleCount: 0,
        })
      }

      const moduleId = args.module_id as string | undefined
      const report = activeEngine.toMarkdown(moduleId)
      const count = moduleId ? 1 : activeEngine.getAnalyses().length

      return Promise.resolve({
        report,
        moduleCount: count,
      })
    },
    presentCall(): GenericCallView {
      return {
        card: 'generic',
        title: 'Deep Analysis Report',
        kind: 'other',
        rawInput: 'Generating report',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Dimension Dispatcher
// ---------------------------------------------------------------------------

/**
 * Dispatch analysis data to the appropriate engine method based on dimension.
 */
function dispatchDimension(
  engine: MasterModuleDeepAnalysisEngine,
  moduleId: string,
  dimension: string,
  data: Record<string, unknown>,
  notes: string,
): void {
  switch (dimension) {
    case 'data':
      engine.registerDataAnalysis({
        moduleId,
        entityCount: (data.entityCount as number) ?? 0,
        totalFields: (data.totalFields as number) ?? 0,
        requiredFields: (data.requiredFields as number) ?? 0,
        optionalFields: (data.optionalFields as number) ?? 0,
        computedFields: (data.computedFields as number) ?? 0,
        referenceFields: (data.referenceFields as number) ?? 0,
        notes,
      })
      break
    case 'fields':
      engine.registerFieldsAnalysis({
        moduleId,
        fields: (data.fields as Array<Record<string, unknown>>)?.map(f => ({
          name: (f.name as string) ?? '',
          displayName: (f.displayName as string) ?? '',
          type: (f.type as string) ?? 'string',
          required: (f.required as boolean) ?? false,
          unique: (f.unique as boolean) ?? false,
          isPrimaryKey: (f.isPrimaryKey as boolean) ?? false,
          hasValidation: (f.hasValidation as boolean) ?? false,
          hasDefault: (f.hasDefault as boolean) ?? false,
          hasIndex: (f.hasIndex as boolean) ?? false,
          hasForeignKey: (f.hasForeignKey as boolean) ?? false,
          validationRules: (f.validationRules as Array<Record<string, unknown>>)?.map(r => ({
            field: (r.field as string) ?? '',
            rule: (r.rule as string) ?? '',
            type: (r.type as 'required' | 'unique' | 'pattern' | 'range' | 'length' | 'enum' | 'cross-field' | 'custom') ?? 'custom',
            errorMessage: (r.errorMessage as string) ?? '',
          })) ?? [],
          notes: (f.notes as string) ?? '',
        })) ?? [],
        notes,
      })
      break
    case 'ids':
      engine.registerIdsAnalysis({
        moduleId,
        primaryKey: (data.primaryKey as string) ?? 'id',
        ...(data.secondaryKeys !== undefined ? { secondaryKeys: data.secondaryKeys as readonly string[] } : {}),
        ...(data.foreignKeys !== undefined ? { foreignKeys: data.foreignKeys as readonly { field: string; references: string }[] } : {}),
        ...(data.compositeKeys !== undefined ? { compositeKeys: data.compositeKeys as readonly string[] } : {}),
        ...(data.autoIncrement !== undefined ? { autoIncrement: data.autoIncrement as boolean } : {}),
        notes,
      })
      break
    case 'validation':
      engine.registerValidationAnalysis({
        moduleId,
        rules: (data.rules as Array<Record<string, unknown>>)?.map(r => ({
          field: (r.field as string) ?? '',
          rule: (r.rule as string) ?? '',
          type: (r.type as 'required' | 'unique' | 'pattern' | 'range' | 'length' | 'enum' | 'cross-field' | 'custom') ?? 'custom',
          errorMessage: (r.errorMessage as string) ?? '',
        })) ?? [],
        notes,
      })
      break
    case 'database':
      engine.registerDatabaseAnalysis({
        moduleId,
        ...(data.tableName !== undefined ? { tableName: data.tableName as string } : {}),
        ...(data.hasAutoIncrement !== undefined ? { hasAutoIncrement: data.hasAutoIncrement as boolean } : {}),
        ...(data.hasSoftDelete !== undefined ? { hasSoftDelete: data.hasSoftDelete as boolean } : {}),
        ...(data.hasTimestamps !== undefined ? { hasTimestamps: data.hasTimestamps as boolean } : {}),
        ...(data.indexes !== undefined ? { indexes: data.indexes as readonly string[] } : {}),
        ...(data.uniqueConstraints !== undefined ? { uniqueConstraints: data.uniqueConstraints as readonly string[] } : {}),
        ...(data.foreignKeyConstraints !== undefined ? { foreignKeyConstraints: data.foreignKeyConstraints as readonly { field: string; references: string }[] } : {}),
        notes,
      })
      break
    case 'api':
      engine.registerAPIAnalysis({
        moduleId,
        endpoints: (data.endpoints as Array<Record<string, unknown>>)?.map(e => ({
          method: (e.method as string) ?? 'GET',
          path: (e.path as string) ?? '',
          description: (e.description as string) ?? '',
          parameters: (e.parameters as string[]) ?? [],
          responseFields: (e.responseFields as string[]) ?? [],
          authRequired: (e.authRequired as boolean) ?? true,
        })) ?? [],
        notes,
      })
      break
    case 'ui':
      engine.registerUIAnalysis({
        moduleId,
        components: (data.components as Array<Record<string, unknown>>)?.map(c => ({
          type: (c.type as 'form' | 'list' | 'detail' | 'modal' | 'card' | 'page' | 'sidebar' | 'tab') ?? 'form',
          name: (c.name as string) ?? '',
          description: (c.description as string) ?? '',
          fields: (c.fields as string[]) ?? [],
          actions: (c.actions as string[]) ?? [],
          responsive: (c.responsive as boolean) ?? true,
        })) ?? [],
        notes,
      })
      break
    case 'buttons':
      engine.registerButtonsAnalysis({
        moduleId,
        buttons: (data.buttons as Array<Record<string, unknown>>)?.map(b => ({
          label: (b.label as string) ?? '',
          action: (b.action as string) ?? '',
          context: (b.context as 'list' | 'detail' | 'form' | 'global') ?? 'form',
          requiresConfirmation: (b.requiresConfirmation as boolean) ?? false,
          permissions: (b.permissions as string[]) ?? [],
          enabled: (b.enabled as boolean) ?? true,
        })) ?? [],
        notes,
      })
      break
    case 'dropdowns':
      engine.registerDropdownsAnalysis({
        moduleId,
        dropdowns: (data.dropdowns as Array<Record<string, unknown>>)?.map(d => ({
          field: (d.field as string) ?? '',
          options: ((d.options as Array<Record<string, unknown>>) ?? []).map(o => ({
            value: (o.value as string) ?? '',
            label: (o.label as string) ?? '',
            enabled: (o.enabled as boolean) ?? true,
            sortOrder: (o.sortOrder as number) ?? 0,
          })),
          allowCustom: (d.allowCustom as boolean) ?? false,
          searchable: (d.searchable as boolean) ?? false,
        })) ?? [],
        notes,
      })
      break
    case 'settings':
      engine.registerSettingsAnalysis({
        moduleId,
        settings: (data.settings as Array<Record<string, unknown>>)?.map(s => ({
          key: (s.key as string) ?? '',
          label: (s.label as string) ?? '',
          type: (s.type as 'string' | 'number' | 'boolean' | 'enum' | 'json') ?? 'string',
          defaultValue: (s.defaultValue as string) ?? '',
          description: (s.description as string) ?? '',
          scope: (s.scope as 'module' | 'global' | 'per-user') ?? 'module',
          required: (s.required as boolean) ?? false,
          ...(s.dependsOn !== undefined ? { dependsOn: s.dependsOn as string } : {}),
        })) ?? [],
        notes,
      })
      break
    case 'permissions':
      engine.registerPermissionsAnalysis({
        moduleId,
        permissions: (data.permissions as Array<Record<string, unknown>>)?.map(p => ({
          role: (p.role as string) ?? '',
          actions: (p.actions as string[]) ?? [],
          fields: (p.fields as string[]) ?? [],
          conditions: (p.conditions as string[]) ?? [],
        })) ?? [],
        notes,
      })
      break
    case 'print':
      engine.registerPrintAnalysis({
        moduleId,
        templates: (data.templates as Array<Record<string, unknown>>)?.map(t => ({
          name: (t.name as string) ?? '',
          format: (t.format as 'pdf' | 'html' | 'csv') ?? 'pdf',
          description: (t.description as string) ?? '',
          fields: (t.fields as string[]) ?? [],
          header: (t.header as string) ?? '',
          footer: (t.footer as string) ?? '',
          orientation: (t.orientation as 'portrait' | 'landscape') ?? 'portrait',
        })) ?? [],
        notes,
      })
      break
    case 'workflow':
      engine.registerWorkflowAnalysis({
        moduleId,
        steps: (data.steps as Array<Record<string, unknown>>)?.map(s => ({
          name: (s.name as string) ?? '',
          fromStatus: (s.fromStatus as string) ?? '',
          toStatus: (s.toStatus as string) ?? '',
          requiredRole: (s.requiredRole as string) ?? '',
          description: (s.description as string) ?? '',
          notifications: (s.notifications as string[]) ?? [],
        })) ?? [],
        notes,
      })
      break
    case 'dependencies':
      engine.registerDependenciesAnalysis({
        moduleId,
        references: (data.references as Array<Record<string, unknown>>)?.map(r => ({
          targetModule: (r.targetModule as string) ?? '',
          targetEntity: (r.targetEntity as string) ?? '',
          type: (r.type as 'field-reference' | 'api-call' | 'shared-component' | 'workflow-trigger') ?? 'field-reference',
          description: (r.description as string) ?? '',
          required: (r.required as boolean) ?? true,
        })) ?? [],
        notes,
      })
      break
    case 'tests':
      engine.registerTestsAnalysis({
        moduleId,
        coverage: {
          totalTests: (data.totalTests as number) ?? 0,
          passingTests: (data.passingTests as number) ?? 0,
          failingTests: (data.failingTests as number) ?? 0,
          coveragePercent: (data.coveragePercent as number) ?? 0,
          untestedFields: (data.untestedFields as string[]) ?? [],
          untestedScenarios: (data.untestedScenarios as string[]) ?? [],
        },
        ...(data.hasUnitTests !== undefined ? { hasUnitTests: data.hasUnitTests as boolean } : {}),
        ...(data.hasIntegrationTests !== undefined ? { hasIntegrationTests: data.hasIntegrationTests as boolean } : {}),
        ...(data.hasEdgeCaseTests !== undefined ? { hasEdgeCaseTests: data.hasEdgeCaseTests as boolean } : {}),
        ...(data.missingScenarios !== undefined ? { missingScenarios: data.missingScenarios as readonly string[] } : {}),
        notes,
      })
      break
    default:
      throw new HarnessError(
        `analyze_module: unknown dimension "${dimension}"`,
        'UNKNOWN_DIMENSION',
      )
  }
}
