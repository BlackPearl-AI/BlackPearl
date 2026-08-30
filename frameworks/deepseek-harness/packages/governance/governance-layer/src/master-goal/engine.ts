/**
 * MASTER-GOAL Engine: validates decisions against the product definition,
 * scores progress, and enforces scope boundaries.
 *
 * @module @deepseek-ai/dsh-governance-layer/master-goal/engine
 */

import type {
  MasterGoalDefinition,
  MasterGoalProgress,
  ModuleProgressEntry,
  GoalVerificationResult,
} from './types.ts'

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a MASTER-GOAL definition. Throws on structural issues.
 */
export function validateDefinition(def: MasterGoalDefinition): void {
  if (!def.id || def.id.trim().length === 0) {
    throw new Error('master-goal: id is required')
  }
  if (!def.identity || def.identity.trim().length === 0) {
    throw new Error('master-goal: identity is required (what IS this product?)')
  }
  if (!def.description || def.description.trim().length === 0) {
    throw new Error('master-goal: description is required')
  }
  if (def.scope.included.length === 0) {
    throw new Error('master-goal: at least one included scope item is required')
  }
  if (def.acceptanceCriteria.functional.length === 0) {
    throw new Error('master-goal: at least one functional acceptance criterion is required')
  }
}

// ---------------------------------------------------------------------------
// Scope Checking
// ---------------------------------------------------------------------------

/**
 * Check if a capability is within the MASTER-GOAL scope.
 */
export function isInScope(goal: MasterGoalDefinition, capabilityId: string): 'included' | 'excluded' | 'deferred' | 'unknown' {
  if (goal.scope.included.some(s => s.id === capabilityId)) return 'included'
  if (goal.scope.excluded.some(s => s.id === capabilityId)) return 'excluded'
  if (goal.scope.deferred.some(s => s.id === capabilityId)) return 'deferred'
  return 'unknown'
}

/**
 * Check if a module's capabilities are all within scope.
 */
export function checkModuleScope(
  goal: MasterGoalDefinition,
  moduleCapabilities: readonly string[],
): { inScope: readonly string[]; outOfScope: readonly string[]; unknown: readonly string[] } {
  const inScope: string[] = []
  const outOfScope: string[] = []
  const unknown: string[] = []

  for (const cap of moduleCapabilities) {
    const status = isInScope(goal, cap)
    if (status === 'included') inScope.push(cap)
    else if (status === 'excluded') outOfScope.push(cap)
    else unknown.push(cap)
  }

  return { inScope, outOfScope, unknown }
}

// ---------------------------------------------------------------------------
// Progress Scoring
// ---------------------------------------------------------------------------

/**
 * Compute progress against the MASTER-GOAL.
 *
 * Score formula:
 * - 60% weight: scope items implemented
 * - 40% weight: acceptance criteria verified
 *
 * Score = 0.6 * (implemented / total) * 100 + 0.4 * (verified / total) * 100
 */
export function computeProgress(
  goal: MasterGoalDefinition,
  completedModules: ReadonlySet<string>,
  verifiedCriteria: ReadonlySet<string>,
  failedCriteria: ReadonlySet<string>,
): MasterGoalProgress {
  // Scope progress.
  const totalScope = goal.scope.included.length
  const implementedScope = goal.scope.included.filter(s =>
    completedModules.has(s.id),
  ).length

  // Criteria progress.
  const allCriteria = [
    ...goal.acceptanceCriteria.functional,
    ...goal.acceptanceCriteria.integration,
    ...goal.acceptanceCriteria.userExperience,
  ]
  const totalCriteria = allCriteria.length
  const verified = allCriteria.filter(c => verifiedCriteria.has(c.id)).length
  const failed = allCriteria.filter(c => failedCriteria.has(c.id)).length

  // Score.
  const scopeScore = totalScope > 0 ? (implementedScope / totalScope) * 100 : 0
  const criteriaScore = totalCriteria > 0 ? (verified / totalCriteria) * 100 : 0
  const score = Math.round(scopeScore * 0.6 + criteriaScore * 0.4)

  // Module progress.
  const modules: ModuleProgressEntry[] = []
  const seenModules = new Set<string>()

  for (const scopeItem of goal.scope.included) {
    // Find which module covers this scope item.
    // This is a simplified mapping — in practice, modules are linked to scope items.
    const moduleId = scopeItem.id // Use scope item id as proxy for module id.
    if (seenModules.has(moduleId)) continue
    seenModules.add(moduleId)

    const isCompleted = completedModules.has(moduleId)
    modules.push({
      moduleId,
      moduleName: scopeItem.name,
      status: isCompleted ? 'completed' : 'pending',
      scopeItems: [scopeItem.id],
      criteria: allCriteria
        .filter(c => c.moduleId === moduleId)
        .map(c => c.id),
    })
  }

  return {
    totalScopeItems: totalScope,
    implementedScopeItems: implementedScope,
    totalCriteria,
    verifiedCriteria: verified,
    failedCriteria: failed,
    score,
    modules,
  }
}

// ---------------------------------------------------------------------------
// Goal Verification
// ---------------------------------------------------------------------------

/**
 * Verify a proposed decision or implementation against the MASTER-GOAL.
 *
 * Checks:
 * 1. Is the capability within scope?
 * 2. Does it address any acceptance criteria?
 * 3. Does it conflict with excluded scope?
 */
export function verifyAgainstGoal(
  goal: MasterGoalDefinition,
  proposedCapabilities: readonly string[],
  coveredCriteria: readonly string[],
): GoalVerificationResult {
  const scopeViolations: string[] = []
  const missingCriteria: string[] = []
  const reasons: string[] = []
  let alignmentScore = 100

  // Check scope.
  for (const cap of proposedCapabilities) {
    const status = isInScope(goal, cap)
    if (status === 'excluded') {
      scopeViolations.push(cap)
      alignmentScore -= 25
      reasons.push(`"${cap}" is in the EXCLUDED scope — this capability must NOT be built`)
    } else if (status === 'included') {
      reasons.push(`"${cap}" is within the INCLUDED scope`)
    } else if (status === 'deferred') {
      reasons.push(`"${cap}" is DEFERRED — consider whether it should be built now`)
      alignmentScore -= 5
    } else {
      reasons.push(`"${cap}" is not explicitly in the scope definition`)
      alignmentScore -= 10
    }
  }

  // Check criteria coverage.
  const allCriteria = [
    ...goal.acceptanceCriteria.functional,
    ...goal.acceptanceCriteria.integration,
    ...goal.acceptanceCriteria.userExperience,
  ]

  const uncoveredCriteria = allCriteria.filter(c =>
    c.moduleId !== undefined
    && proposedCapabilities.includes(c.moduleId)
    && !coveredCriteria.includes(c.id)
    && c.status !== 'verified',
  )

  if (uncoveredCriteria.length > 0) {
    for (const c of uncoveredCriteria) {
      missingCriteria.push(c.id)
      alignmentScore -= 10
      reasons.push(`Criterion "${c.id}" is not covered by this implementation`)
    }
  }

  const consistent = scopeViolations.length === 0 && alignmentScore >= 50

  return {
    consistent,
    alignmentScore: Math.max(0, alignmentScore),
    reasons,
    scopeViolations,
    missingCriteria,
  }
}

// ---------------------------------------------------------------------------
// Goal Summary
// ---------------------------------------------------------------------------

/**
 * Generate a compact summary of the MASTER-GOAL for the prompt section.
 */
export function summarizeGoal(goal: MasterGoalDefinition): string {
  const lines: string[] = []
  lines.push(`## MASTER-GOAL: ${goal.identity}`)
  lines.push(`ID: ${goal.id}`)
  lines.push('')
  lines.push(goal.description)
  lines.push('')

  lines.push('### INCLUDED (must build)')
  for (const item of goal.scope.included) {
    const priority = item.priority === 'must-have' ? '🔴' : item.priority === 'should-have' ? '🟡' : '🟢'
    lines.push(`  ${priority} ${item.name}: ${item.description}`)
  }
  lines.push('')

  if (goal.scope.excluded.length > 0) {
    lines.push('### EXCLUDED (must NOT build)')
    for (const item of goal.scope.excluded) {
      lines.push(`  ⛔ ${item.name}: ${item.description}`)
    }
    lines.push('')
  }

  if (goal.scope.deferred.length > 0) {
    lines.push('### DEFERRED (future)')
    for (const item of goal.scope.deferred) {
      lines.push(`  ⏳ ${item.name}: ${item.description}`)
    }
    lines.push('')
  }

  lines.push('### Acceptance Criteria')
  for (const c of goal.acceptanceCriteria.functional) {
    const icon = c.status === 'verified' ? '✅' : c.status === 'failed' ? '❌' : '⬜'
    lines.push(`  ${icon} ${c.statement}`)
  }
  lines.push('')

  return lines.join('\n')
}
