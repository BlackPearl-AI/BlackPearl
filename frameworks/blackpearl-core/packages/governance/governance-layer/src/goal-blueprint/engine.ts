/**
 * Goal Blueprint Engine.
 *
 * Creates and manages structured blueprints for each goal in the breakdown tree.
 * Each goal gets exactly one blueprint with 10 sections:
 *   Purpose, Input, Output, Workflow, Dependencies, Used By,
 *   Files, Elements, Tests, Completion Criteria.
 *
 * The engine tracks blueprints, validates completeness, and generates reports.
 *
 * @module @deepseek-ai/dsh-governance-layer/goal-blueprint/engine
 */

import {
  SECTION_ORDER,
  SECTION_LABELS,
  SECTION_ICONS,
  BLUEPRINT_STATUS_LABELS,
  BLUEPRINT_STATUS_ICONS,
} from './types.ts'
import type {
  BlueprintSectionKey,
  BlueprintStatus,
  BlueprintSummary,
  BlueprintQuery,
  CompletionCriteriaSection,
  CreateBlueprintInput,
  DependenciesSection,
  ElementsSection,
  FilesSection,
  GoalBlueprint,
  GoalBlueprintMap,
  InputSection,
  OutputSection,
  PurposeSection,
  TestsSection,
  UpdateBlueprintInput,
  UsedBySection,
  WorkflowSection,
} from './types.ts'

// ---------------------------------------------------------------------------
// Default Empty Sections
// ---------------------------------------------------------------------------

function emptyInput(): InputSection {
  return { data: [], resources: [], prerequisites: [] }
}

function emptyOutput(): OutputSection {
  return { artifacts: [], sideEffects: [], format: '' }
}

function emptyWorkflow(): WorkflowSection {
  return { steps: [], decisionPoints: [], errorHandling: [] }
}

function emptyDependencies(): DependenciesSection {
  return { items: [], riskNotes: [] }
}

function emptyUsedBy(): UsedBySection {
  return { consumers: [], integrationPoints: [] }
}

function emptyFiles(): FilesSection {
  return { sources: [], tests: [], configs: [], docs: [] }
}

function emptyElements(): ElementsSection {
  return { items: [], categories: [] }
}

function emptyTests(): TestsSection {
  return { testCases: [], coverageRequirements: [], testDataRequirements: [] }
}

function emptyCompletionCriteria(): CompletionCriteriaSection {
  return { acceptanceCriteria: [], qualityGates: [], definitionOfDone: [], blockingIssues: [] }
}

// ---------------------------------------------------------------------------
// Section Content Scoring
// ---------------------------------------------------------------------------

/**
 * Compute the completeness score for a blueprint.
 * Each section contributes up to 10 points (total 100).
 */
function computeScore(blueprint: GoalBlueprint): number {
  let score = 0

  // Purpose: description + justification + successDefinition = 3 points, notes = 1
  if (blueprint.purpose.description.length > 0) score += 1
  if (blueprint.purpose.justification.length > 0) score += 1
  if (blueprint.purpose.successDefinition.length > 0) score += 1
  if (blueprint.purpose.notes.length > 0) score += 1

  // Input: data + resources + prerequisites = 3 points
  if (blueprint.input.data.length > 0) score += 1
  if (blueprint.input.resources.length > 0) score += 1
  if (blueprint.input.prerequisites.length > 0) score += 1

  // Output: artifacts + sideEffects + format = 3 points
  if (blueprint.output.artifacts.length > 0) score += 1
  if (blueprint.output.sideEffects.length > 0) score += 1
  if (blueprint.output.format.length > 0) score += 1

  // Workflow: steps + decisionPoints + errorHandling = 3 points
  if (blueprint.workflow.steps.length > 0) score += 1
  if (blueprint.workflow.decisionPoints.length > 0) score += 1
  if (blueprint.workflow.errorHandling.length > 0) score += 1

  // Dependencies: items + riskNotes = 2 points
  if (blueprint.dependencies.items.length > 0) score += 1
  if (blueprint.dependencies.riskNotes.length > 0) score += 1

  // Used By: consumers + integrationPoints = 2 points
  if (blueprint.usedBy.consumers.length > 0) score += 1
  if (blueprint.usedBy.integrationPoints.length > 0) score += 1

  // Files: sources + tests + configs + docs = 4 points
  if (blueprint.files.sources.length > 0) score += 1
  if (blueprint.files.tests.length > 0) score += 1
  if (blueprint.files.configs.length > 0) score += 1
  if (blueprint.files.docs.length > 0) score += 1

  // Elements: items + categories = 2 points
  if (blueprint.elements.items.length > 0) score += 1
  if (blueprint.elements.categories.length > 0) score += 1

  // Tests: testCases + coverageRequirements + testDataRequirements = 3 points
  if (blueprint.tests.testCases.length > 0) score += 1
  if (blueprint.tests.coverageRequirements.length > 0) score += 1
  if (blueprint.tests.testDataRequirements.length > 0) score += 1

  // Completion Criteria: acceptanceCriteria + qualityGates + definitionOfDone = 3 points (blockingIssues is informational, not scored)
  if (blueprint.completionCriteria.acceptanceCriteria.length > 0) score += 1
  if (blueprint.completionCriteria.qualityGates.length > 0) score += 1
  if (blueprint.completionCriteria.definitionOfDone.length > 0) score += 1

  // Max raw score = 29, scale to 0–100.
  return Math.round((score / 29) * 100)
}

/**
 * Determine which sections are "populated" (have non-default content).
 */
function detectPopulatedSections(blueprint: GoalBlueprint): BlueprintSectionKey[] {
  const populated: BlueprintSectionKey[] = []

  if (blueprint.purpose.description.length > 0) populated.push('purpose')
  if (blueprint.input.data.length > 0 || blueprint.input.resources.length > 0) populated.push('input')
  if (blueprint.output.artifacts.length > 0 || blueprint.output.format.length > 0) populated.push('output')
  if (blueprint.workflow.steps.length > 0) populated.push('workflow')
  if (blueprint.dependencies.items.length > 0) populated.push('dependencies')
  if (blueprint.usedBy.consumers.length > 0) populated.push('usedBy')
  if (blueprint.files.sources.length > 0 || blueprint.files.tests.length > 0) populated.push('files')
  if (blueprint.elements.items.length > 0) populated.push('elements')
  if (blueprint.tests.testCases.length > 0) populated.push('tests')
  if (blueprint.completionCriteria.acceptanceCriteria.length > 0) populated.push('completionCriteria')

  return populated
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Goal Blueprint Engine — manages structured blueprints for each goal.
 */
export class GoalBlueprintEngine {
  private blueprints: Map<string, GoalBlueprint>

  constructor() {
    this.blueprints = new Map()
  }

  // -----------------------------------------------------------------------
  // Create
  // -----------------------------------------------------------------------

  /**
   * Create a new blueprint for a goal node.
   * Throws if a blueprint already exists for the given goal node ID.
   */
  createBlueprint(input: CreateBlueprintInput): GoalBlueprint {
    if (this.blueprints.has(input.goalNodeId)) {
      throw new Error(`Blueprint already exists for goal "${input.goalNodeId}"`)
    }

    const now = new Date().toISOString()
    const purpose: PurposeSection = {
      description: input.purposeDescription ?? '',
      justification: input.justification ?? '',
      successDefinition: '',
      notes: [],
    }

    const blueprint: GoalBlueprint = {
      goalNodeId: input.goalNodeId,
      goalName: input.goalName,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      completenessScore: 0,
      populatedSections: [],
      purpose,
      input: emptyInput(),
      output: emptyOutput(),
      workflow: emptyWorkflow(),
      dependencies: emptyDependencies(),
      usedBy: emptyUsedBy(),
      files: emptyFiles(),
      elements: emptyElements(),
      tests: emptyTests(),
      completionCriteria: emptyCompletionCriteria(),
    }

    // Compute initial score.
    const score = computeScore(blueprint)
    const populated = detectPopulatedSections(blueprint)
    const updated: GoalBlueprint = { ...blueprint, completenessScore: score, populatedSections: populated }
    this.blueprints.set(input.goalNodeId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Get
  // -----------------------------------------------------------------------

  /**
   * Get a blueprint by goal node ID.
   */
  getBlueprint(goalNodeId: string): GoalBlueprint | undefined {
    return this.blueprints.get(goalNodeId)
  }

  /**
   * Get all blueprints.
   */
  getBlueprints(): readonly GoalBlueprint[] {
    return Array.from(this.blueprints.values())
  }

  // -----------------------------------------------------------------------
  // Update Section
  // -----------------------------------------------------------------------

  /**
   * Update a specific section of a blueprint.
   * Throws if the goal node ID has no blueprint.
   */
  updateSection(input: UpdateBlueprintInput): GoalBlueprint {
    const existing = this.blueprints.get(input.goalNodeId)
    if (!existing) {
      throw new Error(`No blueprint found for goal "${input.goalNodeId}"`)
    }

    const now = new Date().toISOString()

    // Apply section update.
    let updated: GoalBlueprint
    switch (input.section) {
      case 'purpose':
        updated = { ...existing, purpose: input.data as unknown as PurposeSection, updatedAt: now }
        break
      case 'input':
        updated = { ...existing, input: input.data as unknown as InputSection, updatedAt: now }
        break
      case 'output':
        updated = { ...existing, output: input.data as unknown as OutputSection, updatedAt: now }
        break
      case 'workflow':
        updated = { ...existing, workflow: input.data as unknown as WorkflowSection, updatedAt: now }
        break
      case 'dependencies':
        updated = { ...existing, dependencies: input.data as unknown as DependenciesSection, updatedAt: now }
        break
      case 'usedBy':
        updated = { ...existing, usedBy: input.data as unknown as UsedBySection, updatedAt: now }
        break
      case 'files':
        updated = { ...existing, files: input.data as unknown as FilesSection, updatedAt: now }
        break
      case 'elements':
        updated = { ...existing, elements: input.data as unknown as ElementsSection, updatedAt: now }
        break
      case 'tests':
        updated = { ...existing, tests: input.data as unknown as TestsSection, updatedAt: now }
        break
      case 'completionCriteria':
        updated = { ...existing, completionCriteria: input.data as unknown as CompletionCriteriaSection, updatedAt: now }
        break
      default:
        throw new Error(`Unknown section: ${input.section}`)
    }

    // Recompute score and populated sections.
    const score = computeScore(updated)
    const populated = detectPopulatedSections(updated)
    const final: GoalBlueprint = { ...updated, completenessScore: score, populatedSections: populated }
    this.blueprints.set(input.goalNodeId, final)
    return final
  }

  // -----------------------------------------------------------------------
  // Status
  // -----------------------------------------------------------------------

  /**
   * Update the status of a blueprint.
   */
  updateStatus(goalNodeId: string, status: BlueprintStatus): GoalBlueprint {
    const existing = this.blueprints.get(goalNodeId)
    if (!existing) {
      throw new Error(`No blueprint found for goal "${goalNodeId}"`)
    }

    const updated: GoalBlueprint = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    }
    this.blueprints.set(goalNodeId, updated)
    return updated
  }

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  /**
   * Query blueprints by criteria.
   */
  queryBlueprints(query: BlueprintQuery): readonly GoalBlueprint[] {
    let results = Array.from(this.blueprints.values())

    if (query.goalNodeId) {
      results = results.filter(b => b.goalNodeId === query.goalNodeId)
    }
    if (query.status) {
      results = results.filter(b => b.status === query.status)
    }
    if (query.minCompleteness !== undefined) {
      results = results.filter(b => b.completenessScore >= query.minCompleteness!)
    }
    if (query.populatedSection) {
      results = results.filter(b => b.populatedSections.includes(query.populatedSection!))
    }

    return results
  }

  // -----------------------------------------------------------------------
  // Validate
  // -----------------------------------------------------------------------

  /**
   * Validate the completeness of all blueprints.
   * Returns the summary of validation results.
   */
  validateCompleteness(): readonly { goalNodeId: string; goalName: string; completenessScore: number; missingSections: readonly BlueprintSectionKey[] }[] {
    const results: { goalNodeId: string; goalName: string; completenessScore: number; missingSections: readonly BlueprintSectionKey[] }[] = []

    for (const blueprint of this.blueprints.values()) {
      const missing = SECTION_ORDER.filter(s => !blueprint.populatedSections.includes(s))
      results.push({
        goalNodeId: blueprint.goalNodeId,
        goalName: blueprint.goalName,
        completenessScore: blueprint.completenessScore,
        missingSections: missing,
      })
    }

    return results
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------

  /**
   * Compute summary statistics across all blueprints.
   */
  getSummary(): BlueprintSummary {
    const all = Array.from(this.blueprints.values())

    const byStatus: Record<BlueprintStatus, number> = {
      draft: 0,
      'in-progress': 0,
      complete: 0,
      validated: 0,
    }
    for (const b of all) {
      byStatus[b.status]++
    }

    const averageCompleteness = all.length > 0
      ? Math.round(all.reduce((sum, b) => sum + b.completenessScore, 0) / all.length)
      : 0

    const leastComplete = all
      .slice()
      .sort((a, b) => a.completenessScore - b.completenessScore)
      .slice(0, 5)
      .map(b => ({ goalNodeId: b.goalNodeId, goalName: b.goalName, completenessScore: b.completenessScore }))

    const sectionCoverage: Record<BlueprintSectionKey, number> = {} as Record<BlueprintSectionKey, number>
    for (const section of SECTION_ORDER) {
      sectionCoverage[section] = all.filter(b => b.populatedSections.includes(section)).length
    }

    return {
      totalBlueprints: all.length,
      byStatus,
      averageCompleteness,
      leastComplete,
      sectionCoverage,
    }
  }

  // -----------------------------------------------------------------------
  // Map
  // -----------------------------------------------------------------------

  /**
   * Get the complete blueprint map.
   */
  getMap(): GoalBlueprintMap {
    return {
      blueprints: Object.fromEntries(this.blueprints),
      summary: this.getSummary(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  // -----------------------------------------------------------------------
  // Markdown
  // -----------------------------------------------------------------------

  /**
   * Generate markdown report for one or all blueprints.
   */
  toMarkdown(goalNodeId?: string): string {
    const lines: string[] = []
    const targets = goalNodeId
      ? [this.blueprints.get(goalNodeId)].filter(Boolean) as GoalBlueprint[]
      : Array.from(this.blueprints.values())

    lines.push('## Goal Blueprints Report')
    lines.push('')
    lines.push(`**Total Blueprints:** ${targets.length}`)
    lines.push('')

    for (const bp of targets) {
      const statusIcon = BLUEPRINT_STATUS_ICONS[bp.status]
      const scoreIcon = bp.completenessScore >= 80 ? '🟢'
        : bp.completenessScore >= 50 ? '🟡'
        : '🔴'

      lines.push(`### ${bp.goalName} (${bp.goalNodeId})`)
      lines.push('')
      lines.push(`**Status:** ${statusIcon} ${BLUEPRINT_STATUS_LABELS[bp.status]} | **Completeness:** ${scoreIcon} ${bp.completenessScore}%`)
      lines.push('')

      // Section summary table.
      lines.push('| Section | Status |')
      lines.push('|---------|--------|')
      for (const section of SECTION_ORDER) {
        const icon = SECTION_ICONS[section]
        const label = SECTION_LABELS[section]
        const populated = bp.populatedSections.includes(section)
        const statusMark = populated ? '✅' : '⬜'
        lines.push(`| ${icon} ${label} | ${statusMark} |`)
      }
      lines.push('')

      // Detailed sections (only populated ones).
      if (bp.purpose.description.length > 0) {
        lines.push('#### 🎯 Purpose')
        lines.push('')
        lines.push(bp.purpose.description)
        if (bp.purpose.justification) {
          lines.push('')
          lines.push(`**Justification:** ${bp.purpose.justification}`)
        }
        if (bp.purpose.successDefinition) {
          lines.push(`**Success:** ${bp.purpose.successDefinition}`)
        }
        lines.push('')
      }

      if (bp.workflow.steps.length > 0) {
        lines.push('#### 🔄 Workflow')
        lines.push('')
        for (let i = 0; i < bp.workflow.steps.length; i++) {
          lines.push(`${i + 1}. **${bp.workflow.steps[i]!.label}** — ${bp.workflow.steps[i]!.description}`)
        }
        lines.push('')
      }

      if (bp.dependencies.items.length > 0) {
        lines.push('#### 🔗 Dependencies')
        lines.push('')
        for (const dep of bp.dependencies.items) {
          const req = dep.required ? '🔒' : ' optional'
          lines.push(`- **${dep.target}** (${dep.type}) ${req} — ${dep.description}`)
        }
        lines.push('')
      }

      if (bp.files.sources.length > 0 || bp.files.tests.length > 0) {
        lines.push('#### 📁 Files')
        lines.push('')
        for (const f of bp.files.sources) {
          lines.push(`- \`${f.path}\` — ${f.purpose}`)
        }
        for (const f of bp.files.tests) {
          lines.push(`- \`${f.path}\` — ${f.purpose} (test)`)
        }
        lines.push('')
      }

      if (bp.elements.items.length > 0) {
        lines.push('#### 🧩 Elements')
        lines.push('')
        for (const el of bp.elements.items) {
          const vis = el.isPublic ? '🌐' : '🔒'
          lines.push(`- ${vis} \`${el.name}\` (${el.type}) — ${el.description}`)
        }
        lines.push('')
      }

      if (bp.completionCriteria.acceptanceCriteria.length > 0) {
        lines.push('#### ✅ Completion Criteria')
        lines.push('')
        for (const ac of bp.completionCriteria.acceptanceCriteria) {
          lines.push(`- ☐ ${ac.label}: ${ac.description}`)
        }
        lines.push('')
      }

      lines.push('---')
      lines.push('')
    }

    return lines.join('\n')
  }
}
