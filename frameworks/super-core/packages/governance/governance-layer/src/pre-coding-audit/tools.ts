/**
 * PHASE 13 — Pre-Coding Audit Tools
 *
 * Tools for running pre-coding audits and checking readiness.
 * सब PASS होने पर ही coding।
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { PreCodingAuditEngine } from './engine.ts'
import type { AuditConfig } from './types.ts'

let activeEngine: PreCodingAuditEngine | undefined

function ensureEngine(): PreCodingAuditEngine {
  if (!activeEngine) {
    activeEngine = new PreCodingAuditEngine()
  }
  return activeEngine
}

/** Reset engine (for tests). */
export function resetEngine(): void {
  activeEngine = undefined
}

/** Get active engine (for tests). */
export function getActiveEngine(): PreCodingAuditEngine | undefined {
  return activeEngine
}

// ---------------------------------------------------------------------------
// Tool: run_pre_coding_audit
// ---------------------------------------------------------------------------

/**
 * Create the `run_pre_coding_audit` tool.
 */
export function createRunPreCodingAuditTool() {
  return defineTool({
    name: 'run_pre_coding_audit',
    description:
      'Run comprehensive pre-coding audit. Checks 7 critical areas: '
      + '(1) Requirements clear? (2) Blueprint complete? (3) Files known? '
      + '(4) Rules loaded? (5) Dependencies known? (6) Tests defined? '
      + '(7) Conflict exists? '
      + 'Returns pass/fail/conditional verdict with readiness score.',
    parameters: {
      module_id: {
        type: 'string',
        required: true,
        description: 'Module id to audit.',
      },
      has_requirements: {
        type: 'string',
        required: true,
        description: 'Whether requirements are captured in CR ledger (true/false).',
      },
      requirement_count: {
        type: 'string',
        description: 'Number of captured requirements (default 0).',
      },
      has_goals: {
        type: 'string',
        required: true,
        description: 'Whether goal breakdown phase is complete (true/false).',
      },
      goal_count: {
        type: 'string',
        description: 'Number of goals defined (default 0).',
      },
      has_file_blueprint: {
        type: 'string',
        required: true,
        description: 'Whether file/folder blueprint exists (true/false).',
      },
      blueprint_completeness: {
        type: 'string',
        description: 'Blueprint completeness score 0-100 (default 0).',
      },
      element_count: {
        type: 'string',
        description: 'Number of registered elements (default 0).',
      },
      rule_count: {
        type: 'string',
        description: 'Number of active rules (default 0).',
      },
      dependency_edge_count: {
        type: 'string',
        description: 'Number of dependency edges (default 0).',
      },
      has_dependency_cycles: {
        type: 'string',
        description: 'Whether dependency graph has cycles (true/false).',
      },
      dependency_conflict_count: {
        type: 'string',
        description: 'Number of dependency conflicts (default 0).',
      },
      task_count: {
        type: 'string',
        description: 'Number of decomposed tasks (default 0).',
      },
      tasks_without_goals: {
        type: 'string',
        description: 'Number of tasks without goal association (default 0).',
      },
      test_task_count: {
        type: 'string',
        description: 'Number of test-category tasks (default 0).',
      },
      has_task_cycles: {
        type: 'string',
        description: 'Whether task graph has cycles (true/false).',
      },
      all_goals_have_tasks: {
        type: 'string',
        description: 'Whether all goals have at least one task (true/false).',
      },
      conflict_count: {
        type: 'string',
        description: 'Number of detected conflicts (default 0).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          moduleId: { type: 'string' },
          verdict: { type: 'string' },
          readinessScore: { type: 'number' },
          passCount: { type: 'number' },
          failCount: { type: 'number' },
          warnCount: { type: 'number' },
          checkCount: { type: 'number' },
          criticalFailures: { type: 'array' },
          blockingIssues: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>
      const config: AuditConfig = {
        moduleId: input.module_id!,
        hasRequirements: input.has_requirements === 'true',
        requirementCount: parseInt(input.requirement_count ?? '0', 10),
        hasGoals: input.has_goals === 'true',
        goalCount: parseInt(input.goal_count ?? '0', 10),
        hasFileBlueprint: input.has_file_blueprint === 'true',
        blueprintCompleteness: parseInt(input.blueprint_completeness ?? '0', 10),
        elementCount: parseInt(input.element_count ?? '0', 10),
        ruleCount: parseInt(input.rule_count ?? '0', 10),
        dependencyEdgeCount: parseInt(input.dependency_edge_count ?? '0', 10),
        hasDependencyCycles: input.has_dependency_cycles === 'true' ? 1 : 0,
        dependencyConflictCount: parseInt(input.dependency_conflict_count ?? '0', 10),
        taskCount: parseInt(input.task_count ?? '0', 10),
        tasksWithoutGoals: parseInt(input.tasks_without_goals ?? '0', 10),
        testTaskCount: parseInt(input.test_task_count ?? '0', 10),
        hasTaskCycles: input.has_task_cycles === 'true',
        allGoalsHaveTasks: input.all_goals_have_tasks === 'true',
        conflictCount: parseInt(input.conflict_count ?? '0', 10),
      }
      const result = engine.audit(config)
      return Promise.resolve({
        moduleId: result.moduleId,
        verdict: result.verdict,
        readinessScore: result.readinessScore,
        passCount: result.passCount,
        failCount: result.failCount,
        warnCount: result.warnCount,
        checkCount: result.checks.length,
        criticalFailures: [...result.criticalFailures],
        blockingIssues: [...result.blockingIssues],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: check_coding_readiness
// ---------------------------------------------------------------------------

/**
 * Create the `check_coding_readiness` tool.
 */
export function createCheckCodingReadinessTool() {
  return defineTool({
    name: 'check_coding_readiness',
    description:
      'Quick check if a module is ready for coding. Returns true only if ALL '
      + 'critical checks pass: requirements clear, blueprint complete, files known, '
      + 'rules loaded, dependencies mapped, tests defined, no conflicts.',
    parameters: {
      module_id: {
        type: 'string',
        required: true,
        description: 'Module id to check.',
      },
      has_requirements: {
        type: 'string',
        required: true,
        description: 'true/false.',
      },
      has_goals: {
        type: 'string',
        required: true,
        description: 'true/false.',
      },
      has_file_blueprint: {
        type: 'string',
        required: true,
        description: 'true/false.',
      },
      task_count: {
        type: 'string',
        description: 'Number of tasks (default 0).',
      },
      test_task_count: {
        type: 'string',
        description: 'Number of test tasks (default 0).',
      },
      conflict_count: {
        type: 'string',
        description: 'Number of conflicts (default 0).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ready: { type: 'boolean' },
          moduleId: { type: 'string' },
          verdict: { type: 'string' },
          readinessScore: { type: 'number' },
        },
      },
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const engine = ensureEngine()
      const input = args as Record<string, string>
      const config: AuditConfig = {
        moduleId: input.module_id!,
        hasRequirements: input.has_requirements === 'true',
        requirementCount: 0,
        hasGoals: input.has_goals === 'true',
        goalCount: 0,
        hasFileBlueprint: input.has_file_blueprint === 'true',
        blueprintCompleteness: 0,
        elementCount: 0,
        ruleCount: 0,
        dependencyEdgeCount: 0,
        hasDependencyCycles: 0,
        dependencyConflictCount: 0,
        taskCount: parseInt(input.task_count ?? '0', 10),
        tasksWithoutGoals: 0,
        testTaskCount: parseInt(input.test_task_count ?? '0', 10),
        hasTaskCycles: false,
        allGoalsHaveTasks: false,
        conflictCount: parseInt(input.conflict_count ?? '0', 10),
      }
      const result = engine.audit(config)
      return Promise.resolve({
        ready: result.verdict === 'pass',
        moduleId: result.moduleId,
        verdict: result.verdict,
        readinessScore: result.readinessScore,
      })
    },
  })
}
