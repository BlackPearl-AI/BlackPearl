/**
 * Master Module Deep Analysis Engine.
 *
 * Provides comprehensive 16-dimension analysis of each master module.
 * Each dimension can be independently registered, queried, and scored.
 * The engine automatically computes completeness scores and finds gaps.
 *
 * @module @deepseek-ai/dsh-governance-layer/deep-analysis/engine
 */

import {
  DIMENSION_ORDER,
  DIMENSION_LABELS,
  DIMENSION_ICONS,
} from './types.ts'
import type {
  AnalysisDimension,
  AnalysisFinding,
  AnalysisStatus,
  CompletenessScore,
  CompletenessAnalysis,
  DataAnalysis,
  DatabaseAnalysis,
  DependenciesAnalysis,
  DeepAnalysisMap,
  DeepAnalysisQuery,
  DropdownsAnalysis,
  FieldsAnalysis,
  ButtonsAnalysis,
  IdsAnalysis,
  ModuleDimensionAnalysis,
  PermissionsAnalysis,
  PrintAnalysis,
  APIAnalysis,
  SettingsAnalysis,
  TestsAnalysis,
  UIAnalysis,
  ValidationAnalysis,
  WorkflowAnalysis,
  RegisterDataAnalysisInput,
  RegisterFieldsAnalysisInput,
  RegisterIdsAnalysisInput,
  RegisterValidationAnalysisInput,
  RegisterDatabaseAnalysisInput,
  RegisterAPIAnalysisInput,
  RegisterUIAnalysisInput,
  RegisterButtonsAnalysisInput,
  RegisterDropdownsAnalysisInput,
  RegisterSettingsAnalysisInput,
  RegisterPermissionsAnalysisInput,
  RegisterPrintAnalysisInput,
  RegisterWorkflowAnalysisInput,
  RegisterDependenciesAnalysisInput,
  RegisterTestsAnalysisInput,
  RegisterFindingInput,
  FindingSeverity,
} from './types.ts'

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * The Master Module Deep Analysis Engine.
 */
export class MasterModuleDeepAnalysisEngine {
  private analyses: Map<string, ModuleDimensionAnalysis>
  private crossModuleDependencies: Map<string, string[]>

  constructor() {
    this.analyses = new Map()
    this.crossModuleDependencies = new Map()
  }

  /** Get the complete deep analysis map snapshot. */
  getMap(): DeepAnalysisMap {
    return {
      analyses: Object.fromEntries(this.analyses),
      crossModuleDependencies: Object.fromEntries(this.crossModuleDependencies),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  // -----------------------------------------------------------------------
  // Module Initialization
  // -----------------------------------------------------------------------

  /**
   * Initialize (or update) a module analysis entry.
   */
  initializeModule(moduleId: string, notes?: string): ModuleDimensionAnalysis {
    const existing = this.analyses.get(moduleId)
    if (existing) {
      return existing
    }

    const analysis: ModuleDimensionAnalysis = {
      moduleId,
      moduleName: moduleId,
      analyzedAt: new Date().toISOString(),
      notes: notes ?? '',
      status: 'not-analyzed',
      findings: [],
    }
    this.analyses.set(moduleId, analysis)
    return analysis
  }

  /**
   * Get the analysis for a module.
   */
  getAnalysis(moduleId: string): ModuleDimensionAnalysis | undefined {
    return this.analyses.get(moduleId)
  }

  /**
   * Get all analyses.
   */
  getAnalyses(): readonly ModuleDimensionAnalysis[] {
    return Array.from(this.analyses.values())
  }

  // -----------------------------------------------------------------------
  // Data Dimension
  // -----------------------------------------------------------------------

  registerDataAnalysis(input: RegisterDataAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const data: DataAnalysis = {
      entityCount: input.entityCount,
      totalFields: input.totalFields,
      requiredFields: input.requiredFields,
      optionalFields: input.optionalFields,
      computedFields: input.computedFields,
      referenceFields: input.referenceFields,
      notes: input.notes ?? '',
    }

    // Auto-generate findings.
    const findings: AnalysisFinding[] = [...module.findings]
    if (input.computedFields > 0) {
      findings.push({
        dimension: 'data',
        severity: 'info',
        title: 'Computed fields present',
        description: `${input.computedFields} computed/derived field(s) detected — ensure formulas are well-documented.`,
      })
    }
    if (input.referenceFields > input.totalFields * 0.5 && input.totalFields > 0) {
      findings.push({
        dimension: 'data',
        severity: 'warning',
        title: 'Many reference fields',
        description: `${input.referenceFields} of ${input.totalFields} fields are references — check for excessive coupling.`,
      })
    }

    const updated: ModuleDimensionAnalysis = { ...module, data, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Fields Dimension
  // -----------------------------------------------------------------------

  registerFieldsAnalysis(input: RegisterFieldsAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const fields: FieldsAnalysis = {
      fields: input.fields,
      totalWithValidation: input.fields.filter(f => f.hasValidation).length,
      totalWithDefaults: input.fields.filter(f => f.hasDefault).length,
      totalIndexed: input.fields.filter(f => f.hasIndex).length,
      totalForeignKeys: input.fields.filter(f => f.hasForeignKey).length,
    }

    const findings: AnalysisFinding[] = [...module.findings]

    // Check for fields without validation.
    for (const f of input.fields) {
      if (f.required && !f.hasValidation && f.type !== 'boolean') {
        findings.push({
          dimension: 'fields',
          severity: 'warning',
          title: `Field "${f.name}" lacks validation`,
          description: `Required field "${f.displayName}" has no explicit validation rule.`,
          field: f.name,
          suggestion: 'Add a validation rule to prevent invalid data entry.',
        })
      }
      if (f.isPrimaryKey && !f.unique) {
        findings.push({
          dimension: 'fields',
          severity: 'error',
          title: `Primary key "${f.name}" is not unique`,
          description: `Primary key field "${f.displayName}" should be unique.`,
          field: f.name,
        })
      }
    }

    const updated: ModuleDimensionAnalysis = { ...module, fields, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // IDs Dimension
  // -----------------------------------------------------------------------

  registerIdsAnalysis(input: RegisterIdsAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const ids: IdsAnalysis = {
      primaryKey: input.primaryKey,
      secondaryKeys: input.secondaryKeys ?? [],
      foreignKeys: input.foreignKeys ?? [],
      compositeKeys: input.compositeKeys ?? [],
      autoIncrement: input.autoIncrement ?? false,
    }

    const findings: AnalysisFinding[] = [...module.findings]

    if (ids.secondaryKeys.length === 0 && !ids.autoIncrement) {
      findings.push({
        dimension: 'ids',
        severity: 'warning',
        title: 'No secondary keys or auto-increment',
        description: 'Module has only a primary key and no auto-increment — ensure the PK generation strategy is defined.',
      })
    }

    if (ids.foreignKeys.length >= 3) {
      findings.push({
        dimension: 'ids',
        severity: 'info',
        title: 'Multiple foreign keys',
        description: `${ids.foreignKeys.length} foreign keys — verify referential integrity constraints are in place.`,
      })
    }

    const updated: ModuleDimensionAnalysis = { ...module, ids, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Validation Dimension
  // -----------------------------------------------------------------------

  registerValidationAnalysis(input: RegisterValidationAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const validation: ValidationAnalysis = {
      rules: input.rules,
      totalRules: input.rules.length,
      fieldsWithValidation: new Set(input.rules.map(r => r.field)).size,
      crossFieldRules: input.rules.filter(r => r.type === 'cross-field').length,
      customRules: input.rules.filter(r => r.type === 'custom').length,
    }

    const findings: AnalysisFinding[] = [...module.findings]

    if (validation.totalRules === 0) {
      findings.push({
        dimension: 'validation',
        severity: 'warning',
        title: 'No validation rules defined',
        description: 'Module has no explicit validation rules — data integrity may depend solely on the database layer.',
        suggestion: 'Define field-level validation rules for defense in depth.',
      })
    }

    if (validation.customRules > 0) {
      findings.push({
        dimension: 'validation',
        severity: 'info',
        title: `${validation.customRules} custom validation rule(s)`,
        description: 'Custom validation rules require careful testing — they cannot be auto-generated from the schema.',
      })
    }

    const updated: ModuleDimensionAnalysis = { ...module, validation, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Database Dimension
  // -----------------------------------------------------------------------

  registerDatabaseAnalysis(input: RegisterDatabaseAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const database: DatabaseAnalysis = {
      tableName: input.tableName ?? '',
      hasAutoIncrement: input.hasAutoIncrement ?? false,
      hasSoftDelete: input.hasSoftDelete ?? false,
      hasTimestamps: input.hasTimestamps ?? false,
      indexes: input.indexes ?? [],
      uniqueConstraints: input.uniqueConstraints ?? [],
      foreignKeyConstraints: input.foreignKeyConstraints ?? [],
    }

    const findings: AnalysisFinding[] = [...module.findings]

    if (!database.hasTimestamps) {
      findings.push({
        dimension: 'database',
        severity: 'warning',
        title: 'No timestamps column',
        description: 'Table lacks created_at/updated_at — audit trail and debugging will be harder.',
        suggestion: 'Add created_at and updated_at columns.',
      })
    }

    if (!database.hasSoftDelete) {
      findings.push({
        dimension: 'database',
        severity: 'info',
        title: 'No soft delete',
        description: 'Table uses hard deletes — consider soft delete for data recovery.',
      })
    }

    if (database.indexes.length === 0) {
      findings.push({
        dimension: 'database',
        severity: 'error',
        title: 'No indexes defined',
        description: 'Table has no indexes — queries may be slow on large datasets.',
        suggestion: 'Add indexes on frequently queried columns.',
      })
    }

    const updated: ModuleDimensionAnalysis = { ...module, database, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // API Dimension
  // -----------------------------------------------------------------------

  registerAPIAnalysis(input: RegisterAPIAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const methods = new Set(input.endpoints.map(e => e.method.toUpperCase()))

    const api: APIAnalysis = {
      endpoints: input.endpoints,
      hasCreate: methods.has('POST'),
      hasRead: methods.has('GET'),
      hasUpdate: methods.has('PUT') || methods.has('PATCH'),
      hasDelete: methods.has('DELETE'),
      hasSearch: input.endpoints.some(e => e.path.includes('search') || e.path.includes('filter')),
      hasBatch: input.endpoints.some(e => e.path.includes('batch') || e.path.includes('bulk')),
    }

    const findings: AnalysisFinding[] = [...module.findings]

    if (!api.hasCreate || !api.hasRead || !api.hasUpdate || !api.hasDelete) {
      const missing = [
        !api.hasCreate && 'Create',
        !api.hasRead && 'Read',
        !api.hasUpdate && 'Update',
        !api.hasDelete && 'Delete',
      ].filter(Boolean)
      findings.push({
        dimension: 'api',
        severity: 'warning',
        title: `Missing CRUD operations: ${missing.join(', ')}`,
        description: `API does not expose complete CRUD — ${missing.join(', ')} endpoint(s) missing.`,
        suggestion: 'Consider adding the missing operations for full data management.',
      })
    }

    // Check for endpoints without auth.
    const unauthed = input.endpoints.filter(e => !e.authRequired)
    if (unauthed.length > 0) {
      findings.push({
        dimension: 'api',
        severity: 'critical',
        title: `${unauthed.length} endpoint(s) without authentication`,
        description: `Endpoints without auth: ${unauthed.map(e => `${e.method} ${e.path}`).join(', ')}`,
        suggestion: 'Add authentication to all endpoints.',
      })
    }

    const updated: ModuleDimensionAnalysis = { ...module, api, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // UI Dimension
  // -----------------------------------------------------------------------

  registerUIAnalysis(input: RegisterUIAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const types = new Set(input.components.map(c => c.type))

    const ui: UIAnalysis = {
      components: input.components,
      hasForm: types.has('form'),
      hasList: types.has('list'),
      hasDetail: types.has('detail'),
      hasSearch: input.components.some(c => c.actions.includes('search')),
      hasFilters: input.components.some(c => c.actions.includes('filter')),
      hasPagination: input.components.some(c => c.actions.includes('paginate')),
    }

    const findings: AnalysisFinding[] = [...module.findings]

    if (!ui.hasForm) {
      findings.push({
        dimension: 'ui',
        severity: 'warning',
        title: 'No form component',
        description: 'Module has no form for data entry — users may not be able to create/edit records.',
      })
    }

    if (!ui.hasList) {
      findings.push({
        dimension: 'ui',
        severity: 'warning',
        title: 'No list component',
        description: 'Module has no list view — users may not be able to browse records.',
      })
    }

    if (!ui.hasDetail) {
      findings.push({
        dimension: 'ui',
        severity: 'info',
        title: 'No detail view',
        description: 'Module has no dedicated detail view — full record info may not be accessible.',
      })
    }

    const updated: ModuleDimensionAnalysis = { ...module, ui, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Buttons Dimension
  // -----------------------------------------------------------------------

  registerButtonsAnalysis(input: RegisterButtonsAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const buttons: ButtonsAnalysis = {
      buttons: input.buttons,
      totalButtons: input.buttons.length,
      destructiveButtons: input.buttons.filter(b => ['delete', 'remove', 'destroy'].includes(b.action)).length,
      confirmationRequired: input.buttons.filter(b => b.requiresConfirmation).length,
    }

    const findings: AnalysisFinding[] = [...module.findings]

    if (buttons.destructiveButtons > 0 && buttons.confirmationRequired === 0) {
      findings.push({
        dimension: 'buttons',
        severity: 'error',
        title: 'Destructive actions without confirmation',
        description: `${buttons.destructiveButtons} destructive button(s) but none require confirmation.`,
        suggestion: 'Add confirmation dialogs to destructive actions.',
      })
    }

    const updated: ModuleDimensionAnalysis = { ...module, buttons, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Dropdowns Dimension
  // -----------------------------------------------------------------------

  registerDropdownsAnalysis(input: RegisterDropdownsAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const dropdowns: DropdownsAnalysis = {
      dropdowns: input.dropdowns,
      totalDropdowns: input.dropdowns.length,
      totalOptions: input.dropdowns.reduce((sum, d) => sum + d.options.length, 0),
      allowCustomCount: input.dropdowns.filter(d => d.allowCustom).length,
    }

    const findings: AnalysisFinding[] = [...module.findings]

    // Check for empty dropdowns.
    for (const d of input.dropdowns) {
      if (d.options.length === 0) {
        findings.push({
          dimension: 'dropdowns',
          severity: 'warning',
          title: `Empty dropdown "${d.field}"`,
          description: `Dropdown for field "${d.field}" has no options defined.`,
          field: d.field,
        })
      }
    }

    const updated: ModuleDimensionAnalysis = { ...module, dropdowns, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Settings Dimension
  // -----------------------------------------------------------------------

  registerSettingsAnalysis(input: RegisterSettingsAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const settings: SettingsAnalysis = {
      settings: input.settings,
      totalSettings: input.settings.length,
      globalSettings: input.settings.filter(s => s.scope === 'global').length,
      moduleSettings: input.settings.filter(s => s.scope === 'module').length,
      perUserSettings: input.settings.filter(s => s.scope === 'per-user').length,
    }

    const findings: AnalysisFinding[] = [...module.findings]

    // Check for settings without defaults.
    for (const s of input.settings) {
      if (s.required && s.defaultValue === '') {
        findings.push({
          dimension: 'settings',
          severity: 'warning',
          title: `Required setting "${s.key}" has no default`,
          description: `Setting "${s.label}" is required but has no default value.`,
          suggestion: 'Provide a sensible default to prevent startup failures.',
        })
      }
    }

    const updated: ModuleDimensionAnalysis = { ...module, settings, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Permissions Dimension
  // -----------------------------------------------------------------------

  registerPermissionsAnalysis(input: RegisterPermissionsAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const roles = new Set(input.permissions.map(p => p.role))

    const permissions: PermissionsAnalysis = {
      permissions: input.permissions,
      roles: [...roles],
      totalPermissions: input.permissions.length,
      hasAdminOnly: input.permissions.some(p => p.role === 'admin' && p.actions.includes('*')),
      hasReadOnly: input.permissions.some(p => p.actions.length === 1 && p.actions.includes('read')),
    }

    const findings: AnalysisFinding[] = [...module.findings]

    if (!permissions.hasAdminOnly) {
      findings.push({
        dimension: 'permissions',
        severity: 'info',
        title: 'No admin wildcard permission',
        description: 'No role has full admin access — ensure the admin role is defined.',
      })
    }

    if (permissions.roles.length === 0) {
      findings.push({
        dimension: 'permissions',
        severity: 'warning',
        title: 'No permission roles defined',
        description: 'Module has no permission roles — access control may be absent.',
        suggestion: 'Define at least a viewer and editor role.',
      })
    }

    const updated: ModuleDimensionAnalysis = { ...module, permissions, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Print Dimension
  // -----------------------------------------------------------------------

  registerPrintAnalysis(input: RegisterPrintAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const print: PrintAnalysis = {
      templates: input.templates,
      totalTemplates: input.templates.length,
      pdfTemplates: input.templates.filter(t => t.format === 'pdf').length,
      htmlTemplates: input.templates.filter(t => t.format === 'html').length,
    }

    const findings: AnalysisFinding[] = [...module.findings]

    if (print.totalTemplates === 0) {
      findings.push({
        dimension: 'print',
        severity: 'info',
        title: 'No print templates defined',
        description: 'Module has no print templates — users may need printable reports.',
      })
    }

    const updated: ModuleDimensionAnalysis = { ...module, print, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Workflow Dimension
  // -----------------------------------------------------------------------

  registerWorkflowAnalysis(input: RegisterWorkflowAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const statuses = new Set<string>()
    for (const step of input.steps) {
      statuses.add(step.fromStatus)
      statuses.add(step.toStatus)
    }

    const workflow: WorkflowAnalysis = {
      steps: input.steps,
      statuses: [...statuses],
      totalTransitions: input.steps.length,
      hasApprovalChain: input.steps.some(s => s.requiredRole !== ''),
      hasNotifications: input.steps.some(s => s.notifications.length > 0),
    }

    const findings: AnalysisFinding[] = [...module.findings]

    if (workflow.totalTransitions === 0) {
      findings.push({
        dimension: 'workflow',
        severity: 'info',
        title: 'No workflow defined',
        description: 'Module has no workflow transitions — records may not have status progression.',
      })
    }

    if (!workflow.hasApprovalChain && workflow.totalTransitions > 0) {
      findings.push({
        dimension: 'workflow',
        severity: 'warning',
        title: 'Workflow has no approval chain',
        description: 'Transitions exist but none require approval — consider adding approval steps.',
      })
    }

    const updated: ModuleDimensionAnalysis = { ...module, workflow, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Dependencies Dimension
  // -----------------------------------------------------------------------

  registerDependenciesAnalysis(input: RegisterDependenciesAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const deps: DependenciesAnalysis = {
      references: input.references,
      incomingDependencies: input.references.filter(r => r.required).length,
      outgoingDependencies: input.references.filter(r => !r.required).length,
      sharedComponents: input.references.filter(r => r.type === 'shared-component').map(r => r.description),
    }

    // Update cross-module dependencies.
    const crossDeps = input.references
      .filter(r => r.targetModule !== input.moduleId)
      .map(r => r.targetModule)
    this.crossModuleDependencies.set(input.moduleId, [...new Set(crossDeps)])

    const findings: AnalysisFinding[] = [...module.findings]

    if (deps.incomingDependencies > 0) {
      findings.push({
        dimension: 'dependencies',
        severity: 'info',
        title: `${deps.incomingDependencies} required dependency(ies)`,
        description: `Module depends on ${deps.incomingDependencies} external module(s) — breaking changes may affect this module.`,
      })
    }

    if (deps.outgoingDependencies > 0) {
      findings.push({
        dimension: 'dependencies',
        severity: 'info',
        title: `${deps.outgoingDependencies} optional dependency(ies)`,
        description: `Module has ${deps.outgoingDependencies} optional dependency(ies) — changes may affect downstream modules.`,
      })
    }

    const updated: ModuleDimensionAnalysis = { ...module, dependencies: deps, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Tests Dimension
  // -----------------------------------------------------------------------

  registerTestsAnalysis(input: RegisterTestsAnalysisInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const tests: TestsAnalysis = {
      coverage: input.coverage,
      hasUnitTests: input.hasUnitTests ?? false,
      hasIntegrationTests: input.hasIntegrationTests ?? false,
      hasEdgeCaseTests: input.hasEdgeCaseTests ?? false,
      missingScenarios: input.missingScenarios ?? [],
    }

    const findings: AnalysisFinding[] = [...module.findings]

    if (tests.coverage.coveragePercent < 80) {
      findings.push({
        dimension: 'tests',
        severity: 'warning',
        title: `Test coverage at ${tests.coverage.coveragePercent}%`,
        description: `Coverage is below 80% — ${tests.coverage.untestedFields.length} untested field(s).`,
        suggestion: 'Add tests to reach at least 80% coverage.',
      })
    }

    if (tests.coverage.failingTests > 0) {
      findings.push({
        dimension: 'tests',
        severity: 'error',
        title: `${tests.coverage.failingTests} failing test(s)`,
        description: 'Failing tests indicate broken functionality.',
        suggestion: 'Fix failing tests before marking the module complete.',
      })
    }

    if (!tests.hasEdgeCaseTests) {
      findings.push({
        dimension: 'tests',
        severity: 'info',
        title: 'No edge case tests',
        description: 'Module lacks edge case tests — boundary conditions may not be covered.',
      })
    }

    const updated: ModuleDimensionAnalysis = { ...module, tests, findings, status: 'partial' }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Finding Registration
  // -----------------------------------------------------------------------

  /**
   * Add a finding to a module's analysis.
   */
  addFinding(input: RegisterFindingInput): ModuleDimensionAnalysis {
    const module = this.ensureModule(input.moduleId)

    const finding: AnalysisFinding = {
      dimension: input.dimension,
      severity: input.severity,
      title: input.title,
      description: input.description,
      ...(input.field !== undefined ? { field: input.field } : {}),
      ...(input.suggestion !== undefined ? { suggestion: input.suggestion } : {}),
    }

    const findings: AnalysisFinding[] = [...module.findings, finding]
    const updated: ModuleDimensionAnalysis = { ...module, findings }
    this.analyses.set(input.moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Completeness Computation
  // -----------------------------------------------------------------------

  /**
   * Compute the completeness score for a module.
   */
  computeCompleteness(moduleId: string): CompletenessScore | undefined {
    const analysis = this.analyses.get(moduleId)
    if (!analysis) return undefined

    const dimensionScores: Record<AnalysisDimension, number> = {} as Record<AnalysisDimension, number>
    const analyzedDimensions: AnalysisDimension[] = []
    const missingDimensions: AnalysisDimension[] = []
    const criticalDimensions: AnalysisDimension[] = []

    for (const dim of DIMENSION_ORDER) {
      if (dim === 'completeness') continue // Self-referencing — always last.

      const hasData = this.hasDimensionData(analysis, dim)
      const findings = analysis.findings.filter(f => f.dimension === dim)
      const hasCritical = findings.some(f => f.severity === 'critical')

      if (hasData) {
        analyzedDimensions.push(dim)
        // Score: 100 base, -20 per error, -40 per critical, -5 per warning.
        let score = 100
        for (const f of findings) {
          if (f.severity === 'critical') score -= 40
          else if (f.severity === 'error') score -= 20
          else if (f.severity === 'warning') score -= 5
        }
        dimensionScores[dim] = Math.max(0, Math.min(100, score))
        if (hasCritical) criticalDimensions.push(dim)
      } else {
        missingDimensions.push(dim)
        dimensionScores[dim] = 0
      }
    }

    // Overall = average of all non-completeness dimensions.
    const allScores = Object.values(dimensionScores)
    const overallScore = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0

    // Completeness dimension itself.
    dimensionScores.completeness = overallScore

    return {
      overallScore,
      dimensionScores,
      analyzedCount: analyzedDimensions.length,
      missingCount: missingDimensions.length,
      criticalDimensions,
    }
  }

  /**
   * Validate the overall completeness of a module.
   * Returns the analysis with completeness data filled in.
   */
  validateCompleteness(moduleId: string): ModuleDimensionAnalysis | undefined {
    const analysis = this.analyses.get(moduleId)
    if (!analysis) return undefined

    const score = this.computeCompleteness(moduleId)
    if (!score) return undefined

    const completeness: CompletenessAnalysis = {
      overallScore: score.overallScore,
      dimensionScores: score.dimensionScores,
      analyzedDimensions: DIMENSION_ORDER.filter(d =>
        d !== 'completeness' && this.hasDimensionData(analysis, d),
      ),
      missingDimensions: DIMENSION_ORDER.filter(d =>
        d !== 'completeness' && !this.hasDimensionData(analysis, d),
      ),
      criticalGaps: score.criticalDimensions.map(d => DIMENSION_LABELS[d]),
    }

    const status: AnalysisStatus =
      score.missingCount === 0 ? 'complete'
      : score.analyzedCount > 0 ? 'partial'
      : 'not-analyzed'

    const updated: ModuleDimensionAnalysis = { ...analysis, completeness, status }
    this.analyses.set(moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  /**
   * Query analyses by criteria.
   */
  queryAnalyses(query: DeepAnalysisQuery): readonly ModuleDimensionAnalysis[] {
    let results = Array.from(this.analyses.values())

    if (query.moduleId) {
      results = results.filter(a => a.moduleId === query.moduleId)
    }
    if (query.dimension) {
      results = results.filter(a => this.hasDimensionData(a, query.dimension!))
    }
    if (query.hasFindings !== undefined) {
      results = query.hasFindings
        ? results.filter(a => a.findings.length > 0)
        : results.filter(a => a.findings.length === 0)
    }
    if (query.maxSeverity) {
      const severityOrder: Record<FindingSeverity, number> = {
        info: 1, warning: 2, error: 3, critical: 4,
      }
      const maxLevel = severityOrder[query.maxSeverity]
      results = results.filter(a =>
        a.findings.every(f => severityOrder[f.severity] <= maxLevel),
      )
    }
    if (query.minScore !== undefined) {
      results = results.filter(a => {
        const score = this.computeCompleteness(a.moduleId)
        return score !== undefined && score.overallScore >= query.minScore!
      })
    }

    return results
  }

  // -----------------------------------------------------------------------
  // Markdown
  // -----------------------------------------------------------------------

  /**
   * Generate a comprehensive markdown report.
   */
  toMarkdown(moduleId?: string): string {
    const lines: string[] = []
    const targets = moduleId
      ? [this.analyses.get(moduleId)].filter(Boolean) as ModuleDimensionAnalysis[]
      : Array.from(this.analyses.values())

    lines.push('## Master Module Deep Analysis Report')
    lines.push('')
    lines.push(`**Modules Analyzed:** ${targets.length}`)
    lines.push('')

    for (const analysis of targets) {
      const score = this.computeCompleteness(analysis.moduleId)
      const scoreIcon = score && score.overallScore >= 80 ? '🟢'
        : score && score.overallScore >= 50 ? '🟡'
        : '🔴'
      const scoreText = score ? `${score.overallScore}%` : 'N/A'

      lines.push(`### ${DIMENSION_ICONS.data} ${analysis.moduleId} — ${analysis.status === 'complete' ? '✅ Complete' : analysis.status === 'partial' ? '🔄 Partial' : '⏳ Not Analyzed'} (${scoreIcon} ${scoreText})`)
      lines.push('')
      if (analysis.notes) {
        lines.push(analysis.notes)
        lines.push('')
      }

      // Per-dimension summary.
      lines.push('| Dimension | Status | Score | Findings |')
      lines.push('|-----------|--------|-------|----------|')
      for (const dim of DIMENSION_ORDER) {
        const icon = DIMENSION_ICONS[dim]
        const label = DIMENSION_LABELS[dim]
        const hasData = this.hasDimensionData(analysis, dim)
        const status = hasData ? '✅' : '⏳'
        const dimScore = score?.dimensionScores[dim]
        const scoreStr = dimScore !== undefined ? `${dimScore}%` : '—'
        const findingCount = analysis.findings.filter(f => f.dimension === dim).length
        const findingStr = findingCount > 0 ? `${findingCount}` : '0'
        lines.push(`| ${icon} ${label} | ${status} | ${scoreStr} | ${findingStr} |`)
      }
      lines.push('')

      // Findings.
      const criticalFindings = analysis.findings.filter(f => f.severity === 'critical')
      const errorFindings = analysis.findings.filter(f => f.severity === 'error')
      const warningFindings = analysis.findings.filter(f => f.severity === 'warning')

      if (criticalFindings.length > 0) {
        lines.push('#### 🚨 Critical Findings')
        lines.push('')
        for (const f of criticalFindings) {
          lines.push(`- **${f.title}** (${DIMENSION_LABELS[f.dimension]})`)
          lines.push(`  ${f.description}`)
          if (f.suggestion) lines.push(`  💡 ${f.suggestion}`)
        }
        lines.push('')
      }

      if (errorFindings.length > 0) {
        lines.push('#### ❌ Errors')
        lines.push('')
        for (const f of errorFindings) {
          lines.push(`- **${f.title}** (${DIMENSION_LABELS[f.dimension]})`)
          lines.push(`  ${f.description}`)
          if (f.suggestion) lines.push(`  💡 ${f.suggestion}`)
        }
        lines.push('')
      }

      if (warningFindings.length > 0) {
        lines.push('#### ⚠️ Warnings')
        lines.push('')
        for (const f of warningFindings) {
          lines.push(`- **${f.title}** (${DIMENSION_LABELS[f.dimension]})`)
          lines.push(`  ${f.description}`)
          if (f.suggestion) lines.push(`  💡 ${f.suggestion}`)
        }
        lines.push('')
      }

      // Missing dimensions.
      if (score && score.missingCount > 0) {
        lines.push('#### ⏳ Missing Dimensions')
        lines.push('')
        const missingDims = DIMENSION_ORDER.filter(d =>
          d !== 'completeness' && this.hasDimensionData(analysis, d) === false,
        )
        for (const dim of missingDims) {
          lines.push(`- ${DIMENSION_ICONS[dim]} ${DIMENSION_LABELS[dim]}`)
        }
        lines.push('')
      }

      lines.push('---')
      lines.push('')
    }

    return lines.join('\n')
  }

  // -----------------------------------------------------------------------
  // Private Helpers
  // -----------------------------------------------------------------------

  private ensureModule(moduleId: string): ModuleDimensionAnalysis {
    const existing = this.analyses.get(moduleId)
    if (existing) return existing
    return this.initializeModule(moduleId)
  }

  private hasDimensionData(
    analysis: ModuleDimensionAnalysis,
    dimension: AnalysisDimension,
  ): boolean {
    switch (dimension) {
      case 'data': return analysis.data !== undefined
      case 'fields': return analysis.fields !== undefined
      case 'ids': return analysis.ids !== undefined
      case 'validation': return analysis.validation !== undefined
      case 'database': return analysis.database !== undefined
      case 'api': return analysis.api !== undefined
      case 'ui': return analysis.ui !== undefined
      case 'buttons': return analysis.buttons !== undefined
      case 'dropdowns': return analysis.dropdowns !== undefined
      case 'settings': return analysis.settings !== undefined
      case 'permissions': return analysis.permissions !== undefined
      case 'print': return analysis.print !== undefined
      case 'workflow': return analysis.workflow !== undefined
      case 'dependencies': return analysis.dependencies !== undefined
      case 'tests': return analysis.tests !== undefined
      case 'completeness': return analysis.completeness !== undefined
      default: return false
    }
  }
}
