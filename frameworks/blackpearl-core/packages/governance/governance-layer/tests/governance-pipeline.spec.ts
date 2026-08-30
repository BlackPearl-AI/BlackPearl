import { describe, expect, it } from 'vitest'
import {
  createCaptureRequirementTool,
  createCaptureMasterGoalTool,
  createAddBreakdownNodeTool,
  createRegisterModuleTool,
  createCreateGoalBlueprintTool,
  createRegisterElementTool,
  createRegisterRuleTool,
  createBuildDependencyGraphTool,
  createBuildContextPackTool,
  createCreateTaskTool,
  createCreateVerticalSliceTool,
  createRunPreCodingAuditTool,
  createCheckModuleExitGateTool,
  createDefineJourneyTool,
  createStartJourneyTool,
  createAdvanceJourneyStepTool,
  createExportJourneyRegressionTool,
  createInitiateRepairTool,
  createNavigateIndexesTool,
  createCompleteRepairTool,
} from '../src/index.ts'

describe('Final Integration — Full Governance Pipeline & Repair Mode', () => {
  it('executes the full forward governance pipeline end-to-end', async () => {
    // 1. User Request → CR Ledger
    const crTool = createCaptureRequirementTool()
    const cr = await crTool.execute({
      content: 'Build universal payment gateway connector with audit trails',
      interaction_type: 'prompt',
      role: 'user',
      tags: ['feature', 'payment'],
    }, {} as any)
    expect(cr.crId).toBeDefined()

    // 2. Master Goal Capture
    const goalTool = createCaptureMasterGoalTool()
    const goal = await goalTool.execute({
      id: 'MG-PAY-001',
      identity: 'Universal Payment Gateway Connector',
      description: 'Handle credit cards, UPI, wallets securely with audit trails.',
      included: [
        { id: 'inc-01', name: 'Card Charge', description: 'Charge cards securely', priority: 'must-have' },
      ],
      functional_criteria: [
        { id: 'AC-01', statement: 'Zero double billing', verification_method: 'test' },
      ],
    }, {} as any)
    expect(goal.goalId).toBe('MG-PAY-001')

    // 3. Goal Decomposition
    const nodeTool = createAddBreakdownNodeTool()
    const node = await nodeTool.execute({
      level: 'goal',
      name: 'Card Payment Processing',
      description: 'Process card charges securely',
      parent_id: goal.goalId,
    }, {} as any)
    expect(node.nodeId).toBeDefined()

    // 4. Master Module Registration
    const modTool = createRegisterModuleTool()
    const mod = await modTool.execute({
      id: 'PAY',
      name: 'payment-core',
      description: 'Core payment gateway module',
    }, {} as any)
    expect(mod.moduleId).toBe('PAY')

    // 5. Blueprint Creation
    const bpTool = createCreateGoalBlueprintTool()
    const bp = await bpTool.execute({
      goal_node_id: goal.goalId,
      goal_name: 'Card Charge Goal',
      purpose_description: 'Secure card charge dispatching',
    }, {} as any)
    expect(bp.goalNodeId).toBe(goal.goalId)

    // 6. Element Registry
    const elTool = createRegisterElementTool()
    const el = await elTool.execute({
      module_prefix: 'PAY',
      type: 'api',
      name: 'Charge Card API Endpoint',
      purpose: 'Process card charges',
    }, {} as any)
    expect(el.elementId).toBeDefined()

    // 7. Rule Resolution
    const ruleTool = createRegisterRuleTool()
    const rule = await ruleTool.execute({
      category: 'security',
      title: 'PCI-DSS Tokenization Mandate',
      description: 'Never log raw card numbers',
      severity: 'error',
      validation_type: 'absent',
      validation_value: 'cardNumber',
      validation_description: 'Forbid card number in plain logs',
      module_scope: 'PAY',
    }, {} as any)
    expect(rule.ruleId).toBeDefined()

    // 8. Dependency Resolution
    const depTool = createBuildDependencyGraphTool()
    const dep = await depTool.execute({
      nodes_json: JSON.stringify([
        { id: 'PAY', label: 'payment-core', kind: 'module' },
      ]),
      edges_json: JSON.stringify([]),
    }, {} as any)
    expect(dep.success).toBe(true)
    expect(dep.nodeCount).toBe(1)

    // 9. Context Pack Assembly (G-28)
    const packTool = createBuildContextPackTool()
    const pack = await packTool.execute({
      task_id: 'TASK-PAY-01',
      module_id: 'PAY',
      query: 'Charge card',
    }, {} as any)
    expect(pack.manifest.packId).toBeDefined()
    expect(pack.manifest.totalTokenEstimate).toBeGreaterThan(0)

    // 10. Task Creation
    const taskTool = createCreateTaskTool()
    const task = await taskTool.execute({
      name: 'Implement secure card token charge',
      description: 'Charge card securely',
      module_id: 'PAY',
      category: 'feature',
      level: 'feature',
    }, {} as any)
    expect(task.taskId).toBeDefined()

    // 11. Vertical Implementation Slice
    const sliceTool = createCreateVerticalSliceTool()
    const slice = await sliceTool.execute({
      name: 'Card Tokenizer Slice',
      module_id: 'PAY',
      cr_id: cr.crId,
      goal_id: goal.goalId,
      task_id: task.taskId,
      element_id: el.elementId,
    }, {} as any)
    expect(slice.sliceId).toBeDefined()

    // 12. Pre-Coding Audit
    const auditTool = createRunPreCodingAuditTool()
    const audit = await auditTool.execute({
      module_id: 'PAY',
      has_requirements: 'true',
      requirement_count: '1',
      has_goals: 'true',
      goal_count: '1',
      has_file_blueprint: 'true',
      blueprint_completeness: '100',
    }, {} as any)
    expect(audit.verdict).toBeDefined()

    // 13. Module Exit Gate
    const exitTool = createCheckModuleExitGateTool()
    const exit = await exitTool.execute({
      moduleId: 'PAY',
      hasRequirements: 'true',
      hasGoals: 'true',
      hasFileBlueprint: 'true',
    }, {} as any)
    expect(exit.checks).toBeDefined()

    // 14. Golden Journey Verification (G-26)
    const journeyTool = createDefineJourneyTool()
    const journey = await journeyTool.execute({
      journey_id: 'journey-payment-test',
      name: 'Payment Tokenization Journey',
      description: 'End to end payment flow',
      project_id: 'fintech',
      start_state: 'Token generated',
      final_state: 'Charge settled',
      steps: [{ id: 'step-01', name: 'Charge', order: 0 }],
    }, {} as any)
    expect(journey.id).toBe('journey-payment-test')

    const startJourneyTool = createStartJourneyTool()
    const journeyExec = await startJourneyTool.execute({
      journey_id: 'journey-payment-test',
    }, {} as any)
    expect(journeyExec.status).toBe('running')

    const advanceJourneyTool = createAdvanceJourneyStepTool()
    const finishedJourney = await advanceJourneyTool.execute({
      execution_id: journeyExec.id,
    }, {} as any)
    expect(finishedJourney.status).toBe('completed')

    // 15. Export for Golden Regression
    const exportTool = createExportJourneyRegressionTool()
    const fixture = await exportTool.execute({
      execution_id: finishedJourney.id,
      is_golden: true,
    }, {} as any)
    expect(fixture.isGolden).toBe(true)
  })

  it('executes the full Repair Mode pipeline end-to-end', async () => {
    // 1. User Repair Request → Repair Index (G-21)
    const repairTool = createInitiateRepairTool()
    const repairTask = await repairTool.execute({
      repair_target: 'Card Charge Button Error',
    }, {} as any)
    expect(repairTask.taskId).toBeDefined()
    expect(repairTask.scope).toBe('minimum')

    // 2. Navigation Priority & Dependency Impact (G-29)
    const navTool = createNavigateIndexesTool()
    const navPlan = await navTool.execute({
      task_id: repairTask.taskId,
      query: 'Card Charge',
    }, {} as any)
    expect(navPlan.steps.length).toBe(7)

    // 3. Compact Context Pack (G-28)
    const packTool = createBuildContextPackTool()
    const repairPack = await packTool.execute({
      task_id: repairTask.taskId,
      query: 'Card Charge Button Error',
    }, {} as any)
    expect(repairPack.manifest.packId).toBeDefined()

    // 4. Scoped Repair Completion & Index Sync
    const completeRepairTool = createCompleteRepairTool()
    const repairComplete = await completeRepairTool.execute({
      repair_task_id: repairTask.taskId,
      changes: ['packages/payment/core/src/charge.ts'],
    }, {} as any)
    expect(repairComplete.status).toBe('completed')
    expect(repairComplete.indexSync?.elementRegistry).toBeDefined()
    expect(repairComplete.indexSync?.blueprint).toBeDefined()
    expect(repairComplete.indexSync?.dependencyGraph).toBeDefined()
  })
})
