/**
 * PHASE 13 — Pre-Coding Audit Engine
 *
 * Final quality gate before implementation begins.
 *
 * Coding से पहले verify:
 *   1. Requirement clear?   → requirements check
 *   2. Blueprint complete?  → blueprint check
 *   3. Files known?         → files check
 *   4. Rules loaded?        → rules check
 *   5. Dependencies known?  → dependencies check
 *   6. Tests defined?       → tests check
 *   7. Conflict exists?     → conflicts check
 *
 * सब PASS होने पर ही coding।
 */

import type {
  AuditCategory,
  AuditCheckStatus,
  CheckSeverity,
  AuditCheck,
  AuditVerdict,
  AuditConfig,
  PreCodingAuditResult,
} from './types.ts'

// ---------------------------------------------------------------------------
// Check ID generator
// ---------------------------------------------------------------------------

let checkSeq = 0

function makeCheckId(category: string): string {
  checkSeq++
  return `PC-${category.toUpperCase()}-${String(checkSeq).padStart(3, '0')}`
}

function resetSeq(): void {
  checkSeq = 0
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class PreCodingAuditEngine {
  /**
   * Run a full pre-coding audit based on the given configuration.
   *
   * Verdict rules:
   * - `pass`: 0 critical failures
   * - `conditional`: ≤2 critical failures, 0 non-critical failures
   * - `fail`: any non-critical failure, or >2 critical failures
   */
  audit(config: AuditConfig): PreCodingAuditResult {
    resetSeq()
    const checks: AuditCheck[] = []

    // =====================================================================
    // 1. Requirement clear?
    // =====================================================================
    if (config.hasRequirements) {
      checks.push(this.check('REQ', 'Requirements captured', 'requirements', 'pass', 'critical',
        `Requirement ledger has ${config.requirementCount} entry/entries`))
      if (config.requirementCount >= 3) {
        checks.push(this.check('REQ', 'Sufficient requirements', 'requirements', 'pass', 'critical',
          `${config.requirementCount} requirements provide good coverage`))
      } else {
        checks.push(this.check('REQ', 'Few requirements', 'requirements', 'warn', 'advisory',
          `Only ${config.requirementCount} requirement(s) — consider capturing more`))
      }
    } else {
      checks.push(this.check('REQ', 'Requirements missing', 'requirements', 'fail', 'critical',
        'No requirements captured — coding without clear requirements is forbidden'))
    }

    // =====================================================================
    // 2. Goals breakdown
    // =====================================================================
    if (config.hasGoals) {
      checks.push(this.check('GOAL', 'Goals defined', 'goals', 'pass', 'critical',
        'Goal breakdown phase is complete'))
      if (config.goalCount > 0) {
        checks.push(this.check('GOAL', 'Goals count > 0', 'goals', 'pass', 'critical',
          `${config.goalCount} goal(s) defined`))
      } else {
        checks.push(this.check('GOAL', 'No goals defined', 'goals', 'fail', 'critical',
          'Goal count is 0'))
      }
    } else {
      checks.push(this.check('GOAL', 'Goals phase incomplete', 'goals', 'fail', 'critical',
        'Goal breakdown has not been run'))
    }

    // =====================================================================
    // 3. Blueprint complete?
    // =====================================================================
    if (config.hasFileBlueprint) {
      checks.push(this.check('BPLN', 'File blueprint exists', 'blueprint', 'pass', 'critical',
        'File/folder blueprint is defined'))
      if (config.blueprintCompleteness >= 80) {
        checks.push(this.check('BPLN', 'Blueprint complete', 'blueprint', 'pass', 'critical',
          `Blueprint completeness: ${config.blueprintCompleteness}%`))
      } else if (config.blueprintCompleteness >= 50) {
        checks.push(this.check('BPLN', 'Blueprint partial', 'blueprint', 'warn', 'important',
          `Blueprint completeness: ${config.blueprintCompleteness}% — below 80% target`))
      } else {
        checks.push(this.check('BPLN', 'Blueprint incomplete', 'blueprint', 'fail', 'critical',
          `Blueprint completeness: ${config.blueprintCompleteness}% — below 50% minimum`))
      }
    } else {
      checks.push(this.check('BPLN', 'Missing file blueprint', 'blueprint', 'fail', 'critical',
        'No file/folder blueprint — coding gate blocks implementation'))
    }

    // =====================================================================
    // 4. Files known?
    // =====================================================================
    if (config.hasFileBlueprint) {
      checks.push(this.check('FILE', 'Files known', 'files', 'pass', 'critical',
        'File/folder blueprint defines target files'))
    } else {
      checks.push(this.check('FILE', 'Files unknown', 'files', 'fail', 'critical',
        'No file blueprint — target files are not defined'))
    }

    // =====================================================================
    // 5. Elements registered
    // =====================================================================
    if (config.elementCount > 0) {
      checks.push(this.check('ELEM', 'Elements registered', 'elements', 'pass', 'important',
        `${config.elementCount} element(s) in registry`))
    } else {
      checks.push(this.check('ELEM', 'No elements registered', 'elements', 'warn', 'advisory',
        'Element registry is empty — may need UI elements'))
    }

    // =====================================================================
    // 6. Rules loaded?
    // =====================================================================
    if (config.ruleCount > 0) {
      checks.push(this.check('RULE', 'Rules loaded', 'rules', 'pass', 'important',
        `${config.ruleCount} rule(s) in governance registry`))
    } else {
      checks.push(this.check('RULE', 'No rules loaded', 'rules', 'warn', 'advisory',
        'Rule governance is empty — consider adding rules'))
    }

    // =====================================================================
    // 7. Dependencies known?
    // =====================================================================
    if (config.dependencyEdgeCount > 0) {
      checks.push(this.check('DEP', 'Dependencies mapped', 'dependencies', 'pass', 'important',
        `${config.dependencyEdgeCount} dependency edge(s)`))
    } else {
      checks.push(this.check('DEP', 'No dependencies mapped', 'dependencies', 'warn', 'advisory',
        'No dependency edges — module may be standalone'))
    }

    if (config.hasDependencyCycles) {
      checks.push(this.check('DEP', 'Dependency cycles detected', 'dependencies', 'fail', 'critical',
        'Circular dependencies must be resolved'))
    }

    // =====================================================================
    // 8. Tasks decomposed
    // =====================================================================
    if (config.taskCount > 0) {
      checks.push(this.check('TASK', 'Tasks decomposed', 'tasks', 'pass', 'critical',
        `${config.taskCount} task(s) defined`))
    } else {
      checks.push(this.check('TASK', 'No tasks decomposed', 'tasks', 'fail', 'critical',
        'Task decomposition has not been run'))
    }

    if (config.hasTaskCycles) {
      checks.push(this.check('TASK', 'Task dependency cycles', 'tasks', 'fail', 'critical',
        'Circular task dependencies must be resolved'))
    }

    // =====================================================================
    // 9. Tests defined?
    // =====================================================================
    if (config.testTaskCount > 0) {
      checks.push(this.check('TEST', 'Tests defined', 'tests', 'pass', 'critical',
        `${config.testTaskCount} test task(s) defined`))
    } else if (config.taskCount > 0) {
      checks.push(this.check('TEST', 'No tests defined', 'tests', 'fail', 'critical',
        'No test tasks — coding without test plan is forbidden'))
    } else {
      checks.push(this.check('TEST', 'No tasks for test check', 'tests', 'skip', 'advisory',
        'No tasks decomposed yet — test check skipped'))
    }

    // =====================================================================
    // 10. Conflict exists?
    // =====================================================================
    if (config.conflictCount === 0) {
      checks.push(this.check('CONF', 'No conflicts detected', 'conflicts', 'pass', 'critical',
        'No naming, dependency, or rule conflicts'))
    } else {
      checks.push(this.check('CONF', 'Conflicts detected', 'conflicts', 'fail', 'critical',
        `${config.conflictCount} conflict(s) detected — resolve before coding`))
    }

    if (config.dependencyConflictCount > 0) {
      checks.push(this.check('CONF', 'Dependency conflicts', 'conflicts', 'fail', 'critical',
        `${config.dependencyConflictCount} dependency conflict(s)`))
    }

    // =====================================================================
    // 11. Coverage — goal-to-task
    // =====================================================================
    if (config.allGoalsHaveTasks) {
      checks.push(this.check('COV', 'All goals covered', 'coverage', 'pass', 'important',
        'Every goal has at least one associated task'))
    } else if (config.taskCount > 0 && config.goalCount > 0) {
      checks.push(this.check('COV', 'Incomplete goal-task coverage', 'coverage', 'warn', 'important',
        'Some goals have no associated tasks'))
    }

    if (config.tasksWithoutGoals > 0) {
      checks.push(this.check('COV', 'Tasks without goals', 'coverage', 'warn', 'advisory',
        `${config.tasksWithoutGoals} task(s) have no goal association`))
    }

    // =====================================================================
    // 12. Consistency — all critical phases
    // =====================================================================
    const criticalMissing: string[] = []
    if (!config.hasRequirements) criticalMissing.push('requirements')
    if (!config.hasGoals) criticalMissing.push('goals')
    if (!config.hasFileBlueprint) criticalMissing.push('file blueprint')
    if (config.taskCount === 0) criticalMissing.push('tasks')

    if (criticalMissing.length === 0) {
      checks.push(this.check('CONS', 'All critical phases complete', 'consistency', 'pass', 'critical',
        'Requirements, goals, blueprint, and tasks are all defined'))
    } else {
      checks.push(this.check('CONS', 'Incomplete planning', 'consistency', 'fail', 'critical',
        `Missing: ${criticalMissing.join(', ')}`))
    }

    // =====================================================================
    // Verdict
    // =====================================================================
    const criticalFails = checks.filter(c => c.status === 'fail' && c.severity === 'critical')
    const importantFails = checks.filter(c => c.status === 'fail' && c.severity === 'important')
    const advisoryFails = checks.filter(c => c.status === 'fail' && c.severity === 'advisory')
    const totalFails = criticalFails.length + importantFails.length + advisoryFails.length
    const warnCount = checks.filter(c => c.status === 'warn').length

    let verdict: AuditVerdict
    if (criticalFails.length === 0 && importantFails.length === 0) {
      verdict = 'pass'
    } else if (criticalFails.length <= 2 && importantFails.length === 0) {
      verdict = 'conditional'
    } else {
      verdict = 'fail'
    }

    // Readiness score: 100 - (critical*15 + important*5 + advisory*1 + warn*0.5)
    const rawScore = 100
      - criticalFails.length * 15
      - importantFails.length * 5
      - advisoryFails.length * 1
      - Math.ceil(warnCount * 0.5)
    const readinessScore = Math.max(0, Math.min(100, rawScore))

    return {
      moduleId: config.moduleId,
      verdict,
      checks,
      passCount: checks.filter(c => c.status === 'pass').length,
      failCount: totalFails,
      warnCount,
      skipCount: checks.filter(c => c.status === 'skip').length,
      criticalFailures: criticalFails.map(c => c.message),
      blockingIssues: checks.filter(c => c.status === 'fail').map(c => c.message),
      suggestions: checks.filter(c => c.status === 'warn').map(c => c.message),
      readinessScore,
      auditedAt: new Date().toISOString(),
    }
  }

  // -- Helpers -------------------------------------------------------------

  private check(
    _prefix: string,
    name: string,
    category: AuditCategory,
    status: AuditCheckStatus,
    severity: CheckSeverity,
    message: string,
  ): AuditCheck {
    return { id: makeCheckId(category), name, category, status, severity, message }
  }
}
