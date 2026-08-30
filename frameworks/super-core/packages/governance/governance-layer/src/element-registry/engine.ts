/**
 * Element Registry Engine — PHASE 09.
 *
 * Registers every UI element, API, print template, permission, workflow,
 * and integration with a unique ID: `{PREFIX}-{MODULE}-{SEQ}`.
 *
 * @module @deepseek-ai/dsh-governance-layer/element-registry/engine
 */

import {
  ALL_ELEMENT_TYPES,
  ELEMENT_TYPE_LABELS,
  ELEMENT_STATUS_LABELS,
  ELEMENT_STATUS_ICONS,
  ELEMENT_TYPE_PREFIXES,
} from './types.ts'
import type {
  ElementEntry,
  ElementQuery,
  ElementRegistrySummary,
  ElementStatus,
  ElementType,
  RegistryValidationReport,
  RegistryViolation,
} from './types.ts'
import { generateElementId, sequenceKey } from './types.ts'

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Element Registry Engine — manages unique element IDs across modules.
 */
export class ElementRegistryEngine {
  private elements: Map<string, ElementEntry>
  private sequences: Map<string, number>

  constructor() {
    this.elements = new Map()
    this.sequences = new Map()
  }

  // -----------------------------------------------------------------------
  // Register
  // -----------------------------------------------------------------------

  /**
   * Register a single element and return the generated entry.
   *
   * @throws If an element with the same ID already exists, or modulePrefix/type is invalid.
   */
  register(params: {
    readonly modulePrefix: string
    readonly type: ElementType
    readonly name: string
    readonly purpose: string
    readonly screen?: string
    readonly parentId?: string
    readonly dependsOn?: readonly string[]
    readonly tags?: readonly string[]
    readonly status?: ElementStatus
  }): ElementEntry {
    const { modulePrefix, type, name, purpose } = params

    const mp = modulePrefix.toUpperCase()
    this.validateModulePrefix(mp)
    this.validateType(type)

    const seq = this.nextSequence(mp, type)
    const prefix = ELEMENT_TYPE_PREFIXES[type]
    const elementId = generateElementId(prefix, mp, seq)
    const now = new Date().toISOString()

    const entry: ElementEntry = {
      elementId,
      type,
      modulePrefix: mp,
      sequence: seq,
      name,
      purpose,
      status: params.status ?? 'planned',
      ...(params.screen != null ? { screen: params.screen } : {}),
      ...(params.parentId != null ? { parentId: params.parentId } : {}),
      ...(params.dependsOn != null ? { dependsOn: params.dependsOn } : {}),
      ...(params.tags != null ? { tags: params.tags } : {}),
      createdAt: now,
      updatedAt: now,
    }

    this.elements.set(elementId, entry)
    this.sequences.set(sequenceKey(modulePrefix, type), seq)

    return entry
  }

  /**
   * Register multiple elements in bulk.
   * Returns all created entries.
   */
  registerBulk(entries: readonly {
    readonly modulePrefix: string
    readonly type: ElementType
    readonly name: string
    readonly purpose: string
    readonly screen?: string
    readonly parentId?: string
    readonly dependsOn?: readonly string[]
    readonly tags?: readonly string[]
    readonly status?: ElementStatus
  }[]): ElementEntry[] {
    return entries.map(e => this.register(e))
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  /**
   * Update mutable fields on an existing element.
   */
  update(elementId: string, changes: {
    readonly name?: string
    readonly purpose?: string
    readonly status?: ElementStatus
    readonly screen?: string
    readonly parentId?: string
    readonly tags?: readonly string[]
  }): ElementEntry {
    const entry = this.elements.get(elementId)
    if (!entry) {
      throw new Error(`Element not found: ${elementId}`)
    }

    const updated: ElementEntry = {
      ...entry,
      ...(changes.name !== undefined ? { name: changes.name } : {}),
      ...(changes.purpose !== undefined ? { purpose: changes.purpose } : {}),
      ...(changes.status !== undefined ? { status: changes.status } : {}),
      ...(changes.screen !== undefined ? { screen: changes.screen } : {}),
      ...(changes.parentId !== undefined ? { parentId: changes.parentId } : {}),
      ...(changes.tags !== undefined ? { tags: changes.tags } : {}),
      updatedAt: new Date().toISOString(),
    }

    this.elements.set(elementId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  /** Get an element by ID. */
  get(elementId: string): ElementEntry | undefined {
    return this.elements.get(elementId)
  }

  /** Get all elements. */
  getAll(): ElementEntry[] {
    return Array.from(this.elements.values())
  }

  /** Query elements with filters. */
  query(filter: ElementQuery): ElementEntry[] {
    let results = Array.from(this.elements.values())

    if (filter.modulePrefix) {
      const mp = filter.modulePrefix.toUpperCase()
      results = results.filter(e => e.modulePrefix === mp)
    }
    if (filter.type) {
      results = results.filter(e => e.type === filter.type)
    }
    if (filter.status) {
      results = results.filter(e => e.status === filter.status)
    }
    if (filter.search) {
      const s = filter.search.toLowerCase()
      results = results.filter(e =>
        e.name.toLowerCase().includes(s)
        || e.purpose.toLowerCase().includes(s)
        || e.elementId.toLowerCase().includes(s)
      )
    }
    if (filter.screen) {
      results = results.filter(e => e.screen === filter.screen)
    }
    if (filter.tag) {
      results = results.filter(e => e.tags?.includes(filter.tag!))
    }

    return results
  }

  /** Find an element by name within a module (exact, case-insensitive). */
  findByName(modulePrefix: string, name: string): ElementEntry | undefined {
    const mp = modulePrefix.toUpperCase()
    const lower = name.toLowerCase()
    return Array.from(this.elements.values())
      .find(e => e.modulePrefix === mp && e.name.toLowerCase() === lower)
  }

  /** Get the next sequence number for a module+type. */
  nextSequence(modulePrefix: string, type: ElementType): number {
    const key = sequenceKey(modulePrefix, type)
    return (this.sequences.get(key) ?? 0) + 1
  }

  /** Get the last used sequence for a module+type. */
  lastSequence(modulePrefix: string, type: ElementType): number {
    return this.sequences.get(sequenceKey(modulePrefix, type)) ?? 0
  }

  // -----------------------------------------------------------------------
  // Remove
  // -----------------------------------------------------------------------

  /** Remove an element by ID. Returns true if it existed. */
  remove(elementId: string): boolean {
    return this.elements.delete(elementId)
  }

  /** Count total elements. */
  get size(): number {
    return this.elements.size
  }

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  /**
   * Validate the entire registry.
   */
  validate(): RegistryValidationReport {
    const violations: RegistryViolation[] = []
    const all = Array.from(this.elements.values())

    // 1. Check for duplicate IDs (defensive — should never happen with register()).
    const idCounts = new Map<string, number>()
    for (const e of all) {
      idCounts.set(e.elementId, (idCounts.get(e.elementId) ?? 0) + 1)
    }
    const duplicates: string[] = []
    for (const [id, count] of idCounts) {
      if (count > 1) {
        duplicates.push(id)
        violations.push({
          rule: 'no-duplicate-ids',
          severity: 'error',
          message: `Duplicate element ID "${id}" found ${count} times`,
          elementId: id,
        })
      }
    }

    // 2. Check for missing dependency targets.
    const missingDeps: string[] = []
    const allIds = new Set(all.map(e => e.elementId))
    for (const e of all) {
      if (e.dependsOn) {
        for (const dep of e.dependsOn) {
          if (!allIds.has(dep)) {
            missingDeps.push(dep)
            violations.push({
              rule: 'deps-exist',
              severity: 'error',
              message: `Element "${e.elementId}" depends on "${dep}" which does not exist`,
              elementId: e.elementId,
            })
          }
        }
      }
    }

    // 3. Check for missing parent targets.
    for (const e of all) {
      if (e.parentId && !allIds.has(e.parentId)) {
        violations.push({
          rule: 'parent-exists',
          severity: 'error',
          message: `Element "${e.elementId}" has parent "${e.parentId}" which does not exist`,
          elementId: e.elementId,
        })
      }
    }

    // 4. Check for self-referencing dependencies.
    for (const e of all) {
      if (e.dependsOn?.includes(e.elementId)) {
        violations.push({
          rule: 'no-self-ref',
          severity: 'error',
          message: `Element "${e.elementId}" depends on itself`,
          elementId: e.elementId,
        })
      }
    }

    // 5. Compute summary stats.
    const byType = {} as Record<ElementType, number>
    const byStatus = {} as Record<ElementStatus, number>
    for (const t of ALL_ELEMENT_TYPES) byType[t] = 0
    for (const s of ['active', 'deprecated', 'disabled', 'planned'] as ElementStatus[]) byStatus[s] = 0

    for (const e of all) {
      byType[e.type]++
      byStatus[e.status]++
    }

    return {
      valid: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      totalElements: all.length,
      byType,
      byStatus,
      duplicates,
      missingDeps,
    }
  }

  // -----------------------------------------------------------------------
  // Summary & Report
  // -----------------------------------------------------------------------

  /** Compute summary statistics. */
  summary(): ElementRegistrySummary {
    const all = Array.from(this.elements.values())

    const byType = {} as Record<ElementType, number>
    const byStatus = {} as Record<ElementStatus, number>
    const byModule: Record<string, number> = {}

    for (const t of ALL_ELEMENT_TYPES) byType[t] = 0
    for (const s of ['active', 'deprecated', 'disabled', 'planned'] as ElementStatus[]) byStatus[s] = 0

    for (const e of all) {
      byType[e.type]++
      byStatus[e.status]++
      byModule[e.modulePrefix] = (byModule[e.modulePrefix] ?? 0) + 1
    }

    const sequences: [string, number][] = []
    for (const [key, val] of this.sequences) {
      sequences.push([key, val])
    }

    return {
      totalElements: all.length,
      byType,
      byStatus,
      byModule,
      sequences,
    }
  }

  /**
   * Generate a markdown report for the registry.
   */
  toMarkdown(): string {
    const lines: string[] = []
    const all = this.getAll()
    const sm = this.summary()

    lines.push('# Element Registry Report')
    lines.push('')
    lines.push(`**Total Elements:** ${sm.totalElements}`)
    lines.push('')

    // By type
    lines.push('## By Type')
    lines.push('')
    for (const t of ALL_ELEMENT_TYPES) {
      if (sm.byType[t] > 0) {
        lines.push(`- **${ELEMENT_TYPE_LABELS[t]}** (${ELEMENT_TYPE_PREFIXES[t]}): ${sm.byType[t]}`)
      }
    }
    lines.push('')

    // By module
    lines.push('## By Module')
    lines.push('')
    for (const [mod, count] of Object.entries(sm.byModule).sort()) {
      lines.push(`- **${mod}**: ${count} elements`)
    }
    lines.push('')

    // Element list
    lines.push('## Elements')
    lines.push('')
    lines.push('| ID | Type | Module | Name | Status | Screen |')
    lines.push('|---|---|---|---|---|---|')
    for (const e of all) {
      const icon = ELEMENT_STATUS_ICONS[e.status]
      const label = ELEMENT_STATUS_LABELS[e.status]
      lines.push(`| \`${e.elementId}\` | ${ELEMENT_TYPE_PREFIXES[e.type]} | ${e.modulePrefix} | ${e.name} | ${icon} ${label} | ${e.screen ?? '-'} |`)
    }

    // Validation
    const vr = this.validate()
    if (vr.violations.length > 0) {
      lines.push('')
      lines.push('## Violations')
      lines.push('')
      for (const v of vr.violations) {
        const sev = v.severity === 'error' ? '🔴' : v.severity === 'warning' ? '🟡' : '🔵'
        lines.push(`- ${sev} **${v.rule}**: ${v.message}`)
      }
    }

    return lines.join('\n')
  }

  // -----------------------------------------------------------------------
  // Snapshot
  // -----------------------------------------------------------------------

  /** Get a copy of the registry map (for external persistence). */
  toMap(): Map<string, ElementEntry> {
    return new Map(this.elements)
  }

  /** Get a snapshot of the sequence counters. */
  sequenceSnapshot(): Map<string, number> {
    return new Map(this.sequences)
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private validateModulePrefix(modulePrefix: string): void {
    if (!/^[A-Z]{2,10}$/i.test(modulePrefix)) {
      throw new Error(`Invalid module prefix "${modulePrefix}": must be 2-10 uppercase letters`)
    }
  }

  private validateType(type: string): void {
    if (!ALL_ELEMENT_TYPES.includes(type as ElementType)) {
      throw new Error(`Invalid element type "${type}": must be one of ${ALL_ELEMENT_TYPES.join(', ')}`)
    }
  }
}
