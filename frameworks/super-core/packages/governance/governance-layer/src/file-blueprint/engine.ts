/**
 * File / Folder Blueprint Engine — PHASE 08.
 *
 * Manages structured file/folder blueprints for each module.
 * Enforces universal folder rules: NO FILE BLUEPRINT = NO CODING.
 *
 * @module @deepseek-ai/dsh-governance-layer/file-blueprint/engine
 */

import {
  BLUEPRINT_APPROVAL_ICONS,
  BLUEPRINT_APPROVAL_LABELS,
  FILE_ENTRY_TYPE_ICONS,
  FILE_ENTRY_TYPE_LABELS,
  UNIVERSAL_FOLDER_RULES,
} from './types.ts'
import type {
  BlueprintApprovalStatus,
  BlueprintValidationReport,
  BlueprintViolation,
  CodingGateResult,
  FileBlueprint,
  FileBlueprintQuery,
  FileBlueprintSummary,
  FileEntry,
  FolderEntry,
} from './types.ts'

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * File / Folder Blueprint Engine — manages structured blueprints
 * and enforces universal folder rules.
 */
export class FileBlueprintEngine {
  private blueprints: Map<string, FileBlueprint>

  constructor() {
    this.blueprints = new Map()
  }

  // -----------------------------------------------------------------------
  // Create
  // -----------------------------------------------------------------------

  /**
   * Create a new file blueprint for a module.
   */
  createBlueprint(input: {
    readonly moduleId: string
    readonly moduleName: string
    readonly files?: readonly FileEntry[]
    readonly folders?: readonly FolderEntry[]
  }): FileBlueprint {
    if (this.blueprints.has(input.moduleId)) {
      throw new Error(`File blueprint already exists for module "${input.moduleId}"`)
    }

    const now = new Date().toISOString()
    const blueprint: FileBlueprint = {
      moduleId: input.moduleId,
      moduleName: input.moduleName,
      status: 'draft',
      files: input.files ?? [],
      folders: input.folders ?? [],
      createdAt: now,
      updatedAt: now,
    }

    this.blueprints.set(input.moduleId, blueprint)
    return blueprint
  }

  // -----------------------------------------------------------------------
  // Get
  // -----------------------------------------------------------------------

  /**
   * Get a blueprint by module ID.
   */
  getBlueprint(moduleId: string): FileBlueprint | undefined {
    return this.blueprints.get(moduleId)
  }

  /**
   * Get all blueprints.
   */
  getBlueprints(): readonly FileBlueprint[] {
    return Array.from(this.blueprints.values())
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  /**
   * Add files to a blueprint.
   */
  addFiles(moduleId: string, files: readonly FileEntry[]): FileBlueprint {
    const bp = this.blueprints.get(moduleId)
    if (!bp) throw new Error(`No file blueprint found for module "${moduleId}"`)

    // Check for duplicate paths.
    const existingPaths = new Set(bp.files.map(f => f.path))
    for (const f of files) {
      if (existingPaths.has(f.path)) {
        throw new Error(`File "${f.path}" already exists in blueprint for "${moduleId}"`)
      }
    }

    const updated: FileBlueprint = {
      ...bp,
      files: [...bp.files, ...files],
      updatedAt: new Date().toISOString(),
    }
    this.blueprints.set(moduleId, updated)
    return updated
  }

  /**
   * Add folders to a blueprint.
   */
  addFolders(moduleId: string, folders: readonly FolderEntry[]): FileBlueprint {
    const bp = this.blueprints.get(moduleId)
    if (!bp) throw new Error(`No file blueprint found for module "${moduleId}"`)

    const existingPaths = new Set(bp.folders.map(f => f.path))
    for (const f of folders) {
      if (existingPaths.has(f.path)) {
        throw new Error(`Folder "${f.path}" already exists in blueprint for "${moduleId}"`)
      }
    }

    const updated: FileBlueprint = {
      ...bp,
      folders: [...bp.folders, ...folders],
      updatedAt: new Date().toISOString(),
    }
    this.blueprints.set(moduleId, updated)
    return updated
  }

  /**
   * Remove a file from a blueprint.
   */
  removeFile(moduleId: string, filePath: string): FileBlueprint {
    const bp = this.blueprints.get(moduleId)
    if (!bp) throw new Error(`No file blueprint found for module "${moduleId}"`)

    const updated: FileBlueprint = {
      ...bp,
      files: bp.files.filter(f => f.path !== filePath),
      updatedAt: new Date().toISOString(),
    }
    this.blueprints.set(moduleId, updated)
    return updated
  }

  /**
   * Update the approval status of a blueprint.
   */
  updateStatus(moduleId: string, status: BlueprintApprovalStatus, notes?: string): FileBlueprint {
    const bp = this.blueprints.get(moduleId)
    if (!bp) throw new Error(`No file blueprint found for module "${moduleId}"`)

    const updated: FileBlueprint = {
      ...bp,
      status,
      ...(notes !== undefined ? { reviewNotes: notes } : bp.reviewNotes !== undefined ? { reviewNotes: bp.reviewNotes } : {}),
      updatedAt: new Date().toISOString(),
    }
    this.blueprints.set(moduleId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  /**
   * Query blueprints by filter criteria.
   */
  queryBlueprints(query: FileBlueprintQuery): readonly FileBlueprint[] {
    let results = Array.from(this.blueprints.values())

    if (query.moduleId) {
      results = results.filter(b => b.moduleId === query.moduleId)
    }
    if (query.status) {
      results = results.filter(b => b.status === query.status)
    }
    if (query.hasFileType) {
      results = results.filter(b => b.files.some(f => f.type === query.hasFileType))
    }

    return results
  }

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  /**
   * Validate a blueprint against universal folder rules and internal consistency.
   */
  validate(moduleId: string): BlueprintValidationReport {
    const bp = this.blueprints.get(moduleId)
    if (!bp) {
      return {
        moduleId,
        valid: false,
        violations: [{ rule: 'blueprint-exists', severity: 'error', message: `No blueprint found for module "${moduleId}"` }],
        fileCount: 0,
        folderCount: 0,
        ruleViolations: [],
        internalIssues: [],
      }
    }

    const violations: BlueprintViolation[] = []
    const ruleViolations: BlueprintViolation[] = []
    const internalIssues: BlueprintViolation[] = []

    // Check universal folder rules.
    for (const rule of UNIVERSAL_FOLDER_RULES) {
      if (rule.mode === 'required') {
        // Check if the required pattern has at least one matching file/folder.
        const hasMatch = bp.files.some(f => this.matchesGlob(f.path, rule.pattern))
          || bp.folders.some(f => this.matchesGlob(f.path, rule.pattern))
        if (!hasMatch) {
          const v: BlueprintViolation = { rule: rule.pattern, severity: 'error', message: rule.description }
          ruleViolations.push(v)
          violations.push(v)
        }
      }
      if (rule.mode === 'forbidden') {
        const forbidden = bp.files.filter(f => this.matchesGlob(f.path, rule.pattern))
        for (const f of forbidden) {
          const v: BlueprintViolation = { rule: rule.pattern, severity: 'error', message: rule.description, path: f.path }
          ruleViolations.push(v)
          violations.push(v)
        }
      }
      if (rule.mode === 'pattern' && rule.filenamePattern) {
        const regex = new RegExp(rule.filenamePattern)
        const matchingFiles = bp.files.filter(f => this.matchesGlob(f.path, rule.pattern))
        for (const f of matchingFiles) {
          const filename = f.path.split('/').pop() ?? f.path
          if (!regex.test(filename)) {
            const v: BlueprintViolation = { rule: rule.pattern, severity: 'warning', message: rule.description, path: f.path }
            ruleViolations.push(v)
            violations.push(v)
          }
        }
      }
    }

    // Internal consistency: duplicate file paths.
    const pathCounts = new Map<string, number>()
    for (const f of bp.files) {
      pathCounts.set(f.path, (pathCounts.get(f.path) ?? 0) + 1)
    }
    for (const [path, count] of pathCounts) {
      if (count > 1) {
        const v: BlueprintViolation = { rule: 'no-duplicate-paths', severity: 'error', message: `Duplicate file path "${path}" (${count} entries)`, path }
        internalIssues.push(v)
        violations.push(v)
      }
    }

    // Internal consistency: file dependencies exist.
    const filePaths = new Set(bp.files.map(f => f.path))
    for (const f of bp.files) {
      if (f.dependsOn) {
        for (const dep of f.dependsOn) {
          if (!filePaths.has(dep)) {
            const v: BlueprintViolation = { rule: 'deps-exist', severity: 'error', message: `File "${f.path}" depends on "${dep}" which is not in the blueprint`, path: f.path }
            internalIssues.push(v)
            violations.push(v)
          }
        }
      }
    }

    // Internal consistency: folder paths should have corresponding FolderEntry.
    const folderPaths = new Set(bp.folders.map(f => f.path))
    const fileFolders = new Set(bp.files.map(f => {
      const parts = f.path.split('/')
      parts.pop()
      return parts.join('/')
    }).filter(p => p.length > 0))
    for (const ff of fileFolders) {
      if (!folderPaths.has(ff)) {
        const v: BlueprintViolation = { rule: 'folder-entry-exists', severity: 'warning', message: `Files exist in "${ff}" but no FolderEntry defined`, path: ff }
        internalIssues.push(v)
        violations.push(v)
      }
    }

    return {
      moduleId,
      valid: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      fileCount: bp.files.length,
      folderCount: bp.folders.length,
      ruleViolations,
      internalIssues,
    }
  }

  /**
   * Check the coding gate — can coding begin for a module?
   *
   * RULE: NO FILE BLUEPRINT = NO CODING.
   * Blueprint must exist AND be 'approved' AND pass validation.
   */
  checkCodingGate(moduleId: string): CodingGateResult {
    const bp = this.blueprints.get(moduleId)

    // Rule 1: Blueprint must exist.
    if (!bp) {
      return {
        allowed: false,
        status: 'draft',
        violations: [{ rule: 'blueprint-exists', severity: 'error', message: `No file blueprint exists for module "${moduleId}". Create a file blueprint before coding.` }],
        summary: `❌ NO FILE BLUEPRINT = NO CODING — Create a file blueprint for "${moduleId}" first.`,
      }
    }

    // Rule 2: Blueprint must be approved.
    if (bp.status !== 'approved') {
      return {
        allowed: false,
        status: bp.status,
        violations: [{ rule: 'blueprint-approved', severity: 'error', message: `File blueprint for "${moduleId}" is "${BLUEPRINT_APPROVAL_LABELS[bp.status]}" — must be "Approved" before coding.` }],
        summary: `❌ Blueprint "${moduleId}" is ${BLUEPRINT_APPROVAL_ICONS[bp.status]} ${BLUEPRINT_APPROVAL_LABELS[bp.status]} — approve it before coding.`,
      }
    }

    // Rule 3: Blueprint must pass validation (no errors).
    const validation = this.validate(moduleId)
    if (!validation.valid) {
      const errors = validation.violations.filter(v => v.severity === 'error')
      return {
        allowed: false,
        status: bp.status,
        violations: errors,
        summary: `❌ Blueprint "${moduleId}" has ${errors.length} validation error(s) — fix them before coding.`,
      }
    }

    return {
      allowed: true,
      status: bp.status,
      violations: [],
      summary: `✅ File blueprint "${moduleId}" is approved and valid — coding may begin.`,
    }
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------

  /**
   * Compute summary statistics.
   */
  getSummary(): FileBlueprintSummary {
    const all = Array.from(this.blueprints.values())

    const byStatus: Record<BlueprintApprovalStatus, number> = {
      'draft': 0,
      'pending-review': 0,
      'approved': 0,
      'rejected': 0,
      'superseded': 0,
    }

    let totalFiles = 0
    let totalFolders = 0
    const pendingApproval: string[] = []

    for (const b of all) {
      byStatus[b.status]++
      totalFiles += b.files.length
      totalFolders += b.folders.length
      if (b.status !== 'approved') {
        pendingApproval.push(b.moduleId)
      }
    }

    return {
      totalBlueprints: all.length,
      byStatus,
      totalFiles,
      totalFolders,
      pendingApproval,
      averageFilesPerBlueprint: all.length > 0 ? Math.round(totalFiles / all.length) : 0,
    }
  }

  // -----------------------------------------------------------------------
  // Markdown
  // -----------------------------------------------------------------------

  /**
   * Generate a markdown report for one or all blueprints.
   */
  toMarkdown(moduleId?: string): string {
    const lines: string[] = []
    const targets = moduleId
      ? [this.blueprints.get(moduleId)].filter(Boolean) as FileBlueprint[]
      : Array.from(this.blueprints.values())

    lines.push('## File / Folder Blueprint Report')
    lines.push('')
    lines.push(`**Total Blueprints:** ${targets.length}`)
    lines.push('')

    for (const bp of targets) {
      const gate = this.checkCodingGate(bp.moduleId)
      const gateIcon = gate.allowed ? '✅' : '❌'

      lines.push(`### ${bp.moduleName} (${bp.moduleId})`)
      lines.push('')
      lines.push(`**Status:** ${BLUEPRINT_APPROVAL_ICONS[bp.status]} ${BLUEPRINT_APPROVAL_LABELS[bp.status]} | **Gate:** ${gateIcon} ${gate.allowed ? 'Coding Allowed' : 'Coding Blocked'}`)
      lines.push('')

      // Files table.
      if (bp.files.length > 0) {
        lines.push('#### Files')
        lines.push('')
        lines.push('| Path | Type | Purpose |')
        lines.push('|------|------|---------|')
        for (const f of bp.files) {
          const icon = FILE_ENTRY_TYPE_ICONS[f.type]
          const typeLabel = FILE_ENTRY_TYPE_LABELS[f.type]
          lines.push(`| \`${f.path}\` | ${icon} ${typeLabel} | ${f.purpose} |`)
        }
        lines.push('')
      }

      // Folders table.
      if (bp.folders.length > 0) {
        lines.push('#### Folders')
        lines.push('')
        lines.push('| Path | Purpose |')
        lines.push('|------|---------|')
        for (const f of bp.folders) {
          lines.push(`| \`${f.path}\` | ${f.purpose} |`)
        }
        lines.push('')
      }

      // Violations (if any).
      if (gate.violations.length > 0) {
        lines.push('#### Violations')
        lines.push('')
        for (const v of gate.violations) {
          const icon = v.severity === 'error' ? '🚨' : v.severity === 'warning' ? '⚠️' : 'ℹ️'
          lines.push(`- ${icon} **${v.rule}**: ${v.message}`)
        }
        lines.push('')
      }

      // Review notes.
      if (bp.reviewNotes) {
        lines.push(`**Review Notes:** ${bp.reviewNotes}`)
        lines.push('')
      }

      lines.push('---')
      lines.push('')
    }

    return lines.join('\n')
  }

  // -----------------------------------------------------------------------
  // Map
  // -----------------------------------------------------------------------

  /**
   * Get the complete blueprint map.
   */
  getMap(): {
    readonly blueprints: Record<string, FileBlueprint>
    readonly summary: FileBlueprintSummary
    readonly createdAt: string
    readonly updatedAt: string
  } {
    return {
      blueprints: Object.fromEntries(this.blueprints),
      summary: this.getSummary(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  // -----------------------------------------------------------------------
  // Private Helpers
  // -----------------------------------------------------------------------

  /**
   * Simple glob matching (supports * and ** patterns).
   * ** matches zero or more directory segments.
   * * matches any characters except /.
   */
  private matchesGlob(path: string, pattern: string): boolean {
    // Step 1: Escape dots.
    let regexStr = pattern.replace(/\./g, '\\.')

    // Step 2: Replace **/ with (?:.+/)? to match zero or more directory segments.
    regexStr = regexStr.replace(/\*\*\//g, '(?:.+/)?')

    // Step 3: Handle trailing /** (slash + stars at end).
    // e.g. tests/** → tests(?:/.*)?
    regexStr = regexStr.replace(/\/\*\*$/g, '(?:/.*)?')

    // Step 4: Handle standalone trailing ** (no preceding slash).
    regexStr = regexStr.replace(/\*\*$/g, '.*')

    // Step 5: Replace remaining * with [^/]*.
    regexStr = regexStr.replace(/\*/g, '[^/]*')

    const regex = new RegExp(`^${regexStr}$`)
    return regex.test(path)
  }
}
