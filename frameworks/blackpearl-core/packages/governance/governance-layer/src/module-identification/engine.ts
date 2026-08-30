/**
 * Master Module Identification Engine.
 *
 * Responsibilities:
 * 1. Register modules and their dependencies.
 * 2. Register master data entities with canonical field definitions.
 * 3. Maintain a naming registry for consistency.
 * 4. Resolve foundation modules (entry points with no unmet dependencies).
 * 5. Check foundation gates (are all foundation modules complete?).
 * 6. Validate naming consistency across all entities and fields.
 *
 * @module @deepseek-ai/dsh-governance-layer/module-identification/engine
 */

import type {
  ConsistencyResult,
  FieldDefinition,
  FoundationGateResult,
  FoundationModuleStatus,
  MasterDataEntity,
  ModuleCompletionStatus,
  ModuleDefinition,
  ModuleMap,
  ModuleType,
  NamingEntry,
  NamingInconsistency,
} from './types.ts'

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * The Master Module Identification Engine.
 */
export class ModuleIdentificationEngine {
  private modules: Map<string, ModuleDefinition>
  private masterData: Map<string, MasterDataEntity>
  private namingRegistry: NamingEntry[]
  private foundationModuleIds: Set<string>

  constructor() {
    this.modules = new Map()
    this.masterData = new Map()
    this.namingRegistry = []
    this.foundationModuleIds = new Set()
  }

  /** Get the complete module map snapshot. */
  getMap(): ModuleMap {
    return {
      modules: Object.fromEntries(this.modules),
      masterData: Object.fromEntries(this.masterData),
      namingRegistry: [...this.namingRegistry],
      foundationModuleIds: [...this.foundationModuleIds],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  // -----------------------------------------------------------------------
  // Module Registration
  // -----------------------------------------------------------------------

  /**
   * Register a module.
   *
   * If no dependencies, it is classified as 'foundation'.
   * If it has dependencies, it is 'dependent'.
   * Foundation modules are tracked for gate checks.
   */
  registerModule(input: {
    id: string
    name: string
    description: string
    dependsOn?: readonly string[]
    masterDataEntities?: readonly string[]
  }): ModuleDefinition {
    if (this.modules.has(input.id)) {
      throw new Error(`Module "${input.id}" is already registered`)
    }

    // Validate all dependencies exist.
    for (const depId of input.dependsOn ?? []) {
      if (!this.modules.has(depId)) {
        throw new Error(`Dependency module "${depId}" not found. Register dependencies first.`)
      }
    }

    const type: ModuleType = (input.dependsOn ?? []).length === 0 ? 'foundation' : 'dependent'

    const now = new Date().toISOString()
    const module: ModuleDefinition = {
      id: input.id,
      name: input.name,
      description: input.description,
      type,
      dependsOn: input.dependsOn ?? [],
      dependedBy: [],
      masterDataEntities: input.masterDataEntities ?? [],
      completionStatus: 'not-started',
      definedAt: now,
    }

    // Update reverse dependencies.
    for (const depId of input.dependsOn ?? []) {
      const dep = this.modules.get(depId)!
      this.modules.set(depId, {
        ...dep,
        dependedBy: [...dep.dependedBy, input.id],
      })
    }

    this.modules.set(input.id, module)

    if (type === 'foundation') {
      this.foundationModuleIds.add(input.id)
    }

    return module
  }

  /**
   * Get a module by ID.
   */
  getModule(id: string): ModuleDefinition | undefined {
    return this.modules.get(id)
  }

  /**
   * Get all modules.
   */
  getModules(): readonly ModuleDefinition[] {
    return Array.from(this.modules.values())
  }

  /**
   * Get all foundation modules.
   */
  getFoundationModules(): readonly ModuleDefinition[] {
    return Array.from(this.foundationModuleIds)
      .map(id => this.modules.get(id)!)
      .filter(Boolean)
  }

  /**
   * Update a module's completion status.
   */
  updateModuleStatus(moduleId: string, status: ModuleCompletionStatus): ModuleDefinition {
    const module = this.modules.get(moduleId)
    if (!module) {
      throw new Error(`Module "${moduleId}" not found`)
    }

    const updated: ModuleDefinition = { ...module, completionStatus: status }
    this.modules.set(moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Master Data Registration
  // -----------------------------------------------------------------------

  /**
   * Register a master data entity with its fields.
   *
   * Automatically registers all field names in the naming registry.
   */
  registerMasterData(input: {
    id: string
    name: string
    description: string
    moduleId: string
    fields: readonly FieldDefinition[]
    keywords?: readonly string[]
  }): MasterDataEntity {
    if (this.masterData.has(input.id)) {
      throw new Error(`Master data entity "${input.id}" is already registered`)
    }

    if (!this.modules.has(input.moduleId)) {
      throw new Error(`Module "${input.moduleId}" not found`)
    }

    const now = new Date().toISOString()
    const entity: MasterDataEntity = {
      id: input.id,
      name: input.name,
      description: input.description,
      moduleId: input.moduleId,
      fields: input.fields,
      keywords: input.keywords ?? [],
      registeredAt: now,
    }

    this.masterData.set(input.id, entity)

    // Update module's master data entities list.
    const module = this.modules.get(input.moduleId)!
    this.modules.set(input.moduleId, {
      ...module,
      masterDataEntities: [...module.masterDataEntities, input.id],
    })

    // Register field names in naming registry.
    for (const field of input.fields) {
      this.registerNaming({
        canonical: field.name,
        variants: [field.name, field.displayName, ...field.keywords],
        category: 'field',
        description: `Field in ${input.name}: ${field.description}`,
      })
    }

    // Register entity name.
    this.registerNaming({
      canonical: input.name,
      variants: [input.name, input.id, ...entity.keywords],
      category: 'entity',
      description: input.description,
    })

    return entity
  }

  /**
   * Get a master data entity by ID.
   */
  getMasterData(id: string): MasterDataEntity | undefined {
    return this.masterData.get(id)
  }

  /**
   * Get all master data entities.
   */
  getMasterDataEntities(): readonly MasterDataEntity[] {
    return Array.from(this.masterData.values())
  }

  /**
   * Get master data entities for a module.
   */
  getModuleMasterData(moduleId: string): readonly MasterDataEntity[] {
    return Array.from(this.masterData.values())
      .filter(e => e.moduleId === moduleId)
  }

  /**
   * Find the canonical name for a field across all entities.
   */
  findField(fieldId: string): { entity: MasterDataEntity; field: FieldDefinition } | undefined {
    for (const entity of this.masterData.values()) {
      for (const field of entity.fields) {
        if (field.name === fieldId) {
          return { entity, field }
        }
      }
    }
    return undefined
  }

  // -----------------------------------------------------------------------
  // Naming Registry
  // -----------------------------------------------------------------------

  /**
   * Register a canonical name with its variants.
   *
   * If the canonical name already exists, variants are merged.
   */
  registerNaming(entry: NamingEntry): void {
    const existing = this.namingRegistry.find(e => e.canonical === entry.canonical)
    if (existing) {
      // Merge variants.
      const mergedVariants = new Set([...existing.variants, ...entry.variants])
      this.namingRegistry = this.namingRegistry.map(e =>
        e.canonical === entry.canonical
          ? { ...e, variants: [...mergedVariants] }
          : e,
      )
    } else {
      this.namingRegistry.push(entry)
    }
  }

  /**
   * Look up the canonical name for a variant.
   */
  resolveCanonical(variant: string): string | undefined {
    const normalized = variant.toLowerCase().trim()
    for (const entry of this.namingRegistry) {
      for (const v of entry.variants) {
        if (v.toLowerCase().trim() === normalized) {
          return entry.canonical
        }
      }
    }
    return undefined
  }

  /**
   * Check if a name is a known variant of a canonical name.
   */
  isKnownVariant(name: string): boolean {
    return this.resolveCanonical(name) !== undefined
  }

  // -----------------------------------------------------------------------
  // Foundation Gate
  // -----------------------------------------------------------------------

  /**
   * Check the foundation gate.
   *
   * Returns whether all foundation modules are complete, which modules
   * are blocked, and what needs to happen next.
   */
  checkFoundationGate(): FoundationGateResult {
    const foundationModules: FoundationModuleStatus[] = []
    const blockedModules: string[] = []

    for (const id of this.foundationModuleIds) {
      const module = this.modules.get(id)!
      foundationModules.push({
        moduleId: id,
        moduleName: module.name,
        status: module.completionStatus,
      })
    }

    // Find blocked modules (dependent modules with incomplete dependencies).
    for (const module of this.modules.values()) {
      if (module.type === 'dependent') {
        const depsComplete = module.dependsOn.every(depId => {
          const dep = this.modules.get(depId)
          return dep?.completionStatus === 'completed'
        })
        if (!depsComplete) {
          blockedModules.push(module.id)
        }
      }
    }

    const allFoundationComplete = foundationModules.every(f => f.status === 'completed')
    const passed = allFoundationComplete && blockedModules.length === 0

    let message: string
    if (passed) {
      message = '✅ Foundation gate PASSED — all foundation modules complete, no modules blocked'
    } else if (!allFoundationComplete) {
      const incomplete = foundationModules.filter(f => f.status !== 'completed')
      message = `🚫 Foundation gate FAILED — ${incomplete.length} foundation module(s) incomplete: ${incomplete.map(f => f.moduleName).join(', ')}`
    } else {
      message = `🚫 Foundation gate FAILED — ${blockedModules.length} module(s) still blocked`
    }

    return { passed, foundationModules, blockedModules, message }
  }

  /**
   * Check if a specific module is ready to start.
   *
   * A module is ready if all its dependencies are completed.
   */
  isModuleReady(moduleId: string): boolean {
    const module = this.modules.get(moduleId)
    if (!module) return false

    return module.dependsOn.every(depId => {
      const dep = this.modules.get(depId)
      return dep?.completionStatus === 'completed'
    })
  }

  // -----------------------------------------------------------------------
  // Consistency Validation
  // -----------------------------------------------------------------------

  /**
   * Validate naming consistency across all registered data.
   *
   * Checks that all field names, entity names, and keywords follow
   * the canonical naming conventions.
   */
  validateConsistency(): ConsistencyResult {
    const inconsistencies: NamingInconsistency[] = []
    let fieldsChecked = 0
    let entitiesChecked = 0

    // Check for duplicate field names across entities.
    const fieldOwners = new Map<string, { entityName: string; fieldName: string }>()
    for (const entity of this.masterData.values()) {
      entitiesChecked++
      for (const field of entity.fields) {
        fieldsChecked++
        const existing = fieldOwners.get(field.name)
        if (existing && existing.entityName !== entity.name) {
          // Same field name in different entities — check if intentional (FK reference).
          const isRef = field.type === 'reference' || field.references !== undefined
          if (!isRef) {
            inconsistencies.push({
              variant: field.name,
              canonical: field.name,
              location: `Entity "${entity.name}" and "${existing.entityName}"`,
              severity: 'warning',
            })
          }
        }
        fieldOwners.set(field.name, { entityName: entity.name, fieldName: field.name })
      }
    }

    // Check for naming convention violations (camelCase for fields).
    for (const entity of this.masterData.values()) {
      for (const field of entity.fields) {
        // Field names should be camelCase.
        if (!/^[a-z][a-zA-Z0-9]*$/.test(field.name)) {
          inconsistencies.push({
            variant: field.name,
            canonical: field.name,
            location: `Entity "${entity.name}" field "${field.name}"`,
            severity: 'error',
          })
        }
        // Display names should be Title Case.
        if (!/^[A-Z]/.test(field.displayName)) {
          inconsistencies.push({
            variant: field.displayName,
            canonical: field.displayName,
            location: `Entity "${entity.name}" field "${field.name}" displayName`,
            severity: 'warning',
          })
        }
      }
    }

    // Check for unresolved references.
    for (const entity of this.masterData.values()) {
      for (const field of entity.fields) {
        if (field.type === 'reference' && field.references) {
          if (!this.masterData.has(field.references)) {
            inconsistencies.push({
              variant: field.references,
              canonical: field.references,
              location: `Entity "${entity.name}" field "${field.name}" references "${field.references}"`,
              severity: 'error',
            })
          }
        }
      }
    }

    return {
      consistent: inconsistencies.filter(i => i.severity === 'error').length === 0,
      inconsistencies,
      fieldsChecked,
      entitiesChecked,
    }
  }

  // -----------------------------------------------------------------------
  // Markdown Output
  // -----------------------------------------------------------------------

  /**
   * Generate the module map as a formatted markdown string.
   */
  toMarkdown(): string {
    const lines: string[] = []

    lines.push('## Module Identification Map')
    lines.push('')
    lines.push(`**Modules:** ${this.modules.size} | **Master Data Entities:** ${this.masterData.size} | **Naming Entries:** ${this.namingRegistry.length}`)
    lines.push('')

    // Foundation modules.
    lines.push('### Foundation Modules (entry points)')
    lines.push('')
    for (const id of this.foundationModuleIds) {
      const m = this.modules.get(id)!
      const icon = m.completionStatus === 'completed' ? '✅' : m.completionStatus === 'in-progress' ? '🔄' : '⏳'
      lines.push(`${icon} **${m.name}** (${m.id}) — ${m.description}`)
    }
    lines.push('')

    // Dependent modules.
    lines.push('### Dependent Modules')
    lines.push('')
    for (const m of this.modules.values()) {
      if (m.type === 'dependent') {
        const icon = m.completionStatus === 'completed' ? '✅' : m.completionStatus === 'in-progress' ? '🔄' : '⏳'
        const deps = m.dependsOn.map(d => this.modules.get(d)?.name ?? d).join(', ')
        lines.push(`${icon} **${m.name}** (${m.id}) — depends on: ${deps}`)
      }
    }
    lines.push('')

    // Master data.
    lines.push('### Master Data Entities')
    lines.push('')
    for (const entity of this.masterData.values()) {
      lines.push(`#### ${entity.name} (${entity.id})`)
      lines.push(`Module: ${this.modules.get(entity.moduleId)?.name ?? entity.moduleId}`)
      lines.push('')
      lines.push('| Field | Type | Required | Unique | Description |')
      lines.push('|-------|------|----------|--------|-------------|')
      for (const field of entity.fields) {
        const pk = field.isPrimaryKey ? ' 🔑' : ''
        lines.push(`| ${field.name}${pk} | ${field.type} | ${field.required ? '✅' : '❌'} | ${field.unique ? '✅' : '❌'} | ${field.description} |`)
      }
      lines.push('')
    }

    // Foundation gate.
    const gate = this.checkFoundationGate()
    lines.push('### Foundation Gate')
    lines.push('')
    lines.push(gate.message)

    return lines.join('\n')
  }
}
