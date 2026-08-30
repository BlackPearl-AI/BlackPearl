import { describe, expect, it, beforeEach } from 'vitest'
import {
  GoldenJourneyEngine,
  createDefineJourneyTool,
  createStartJourneyTool,
  createAdvanceJourneyStepTool,
  createFailJourneyStepTool,
  createPauseJourneyTool,
  createResumeJourneyTool,
  createGetJourneyStatusTool,
  createListJourneysTool,
  createExportJourneyRegressionTool,
  createRerunJourneyRegressionTool,
  resetEngine,
} from '../src/golden-journey/index.ts'

describe('G-26 — Generic Golden Journey Engine', () => {
  beforeEach(() => {
    resetEngine()
  })

  it('defines a universal journey for any domain (e.g. E-Commerce Checkout)', async () => {
    const defineTool = createDefineJourneyTool()
    const def = await defineTool.execute({
      journey_id: 'journey-ecommerce-checkout',
      name: 'E-commerce Checkout Flow',
      description: 'End-to-end checkout validation',
      project_id: 'ecommerce',
      start_state: 'Cart contains 2 items',
      final_state: 'Order confirmed and inventory deducted',
      steps: [
        {
          id: 'step-01',
          name: 'Select Delivery Address',
          description: 'User enters or selects shipping address',
          required_modules: ['address-book', 'shipping-calc'],
          required_data: ['address_id'],
          expected_state: 'Address validated and delivery fee calculated',
          order: 0,
        },
        {
          id: 'step-02',
          name: 'Process Payment',
          description: 'Payment gateway transaction',
          required_modules: ['payment-gateway'],
          required_data: ['payment_method_id', 'amount'],
          expected_state: 'Payment successful, transaction ID generated',
          order: 1,
        },
      ],
      tags: ['smoke', 'checkout', 'critical'],
    }, {} as any)

    expect(def.id).toBe('journey-ecommerce-checkout')
    expect(def.steps.length).toBe(2)
    expect(def.projectId).toBe('ecommerce')
  })

  it('defines a universal journey for Pathology Lab workflow', async () => {
    const defineTool = createDefineJourneyTool()
    const def = await defineTool.execute({
      journey_id: 'journey-pathology-sample-test',
      name: 'Pathology Sample Collection to Report',
      description: 'Patient sample test lifecycle',
      project_id: 'pathology-lab',
      start_state: 'Patient registered',
      final_state: 'Report verified and sent to doctor',
      steps: [
        {
          id: 'step-01',
          name: 'Sample Barcode Scanning',
          description: 'Barcode assigned to vial',
          required_modules: ['sample-tracker'],
          required_data: ['barcode_id', 'vial_type'],
          expected_state: 'Sample logged in centrifuge batch',
          order: 0,
        },
      ],
      tags: ['pathology', 'clinical'],
    }, {} as any)

    expect(def.id).toBe('journey-pathology-sample-test')
    expect(def.projectId).toBe('pathology-lab')
  })

  it('executes full journey: start → advance → complete', async () => {
    const defineTool = createDefineJourneyTool()
    await defineTool.execute({
      journey_id: 'journey-factory-qc',
      name: 'Factory QC Inspection',
      description: 'Batch inspection flow',
      project_id: 'factory',
      start_state: 'Batch produced',
      final_state: 'Batch certified',
      steps: [
        { id: 'step-01', name: 'Dimension Check', order: 0 },
        { id: 'step-02', name: 'Stress Test', order: 1 },
      ],
    }, {} as any)

    const startTool = createStartJourneyTool()
    const exec = await startTool.execute({
      journey_id: 'journey-factory-qc',
      context: { batch_id: 'B-9941' },
    }, {} as any)

    expect(exec.status).toBe('running')
    expect(exec.currentStepIndex).toBe(0)
    expect(exec.steps[0].status).toBe('running')

    const advanceTool = createAdvanceJourneyStepTool()
    const step1Result = await advanceTool.execute({
      execution_id: exec.id,
      assertion_results: [{ assertion_id: 'dim-tolerance', passed: true }],
      evidence: [{ description: 'Calibrated micrometers log', type: 'sensor-log' }],
    }, {} as any)

    expect(step1Result.status).toBe('running')
    expect(step1Result.currentStepIndex).toBe(1)
    expect(step1Result.steps[0].status).toBe('passed')
    expect(step1Result.steps[1].status).toBe('running')

    const step2Result = await advanceTool.execute({
      execution_id: exec.id,
      assertion_results: [{ assertion_id: 'load-bearing', passed: true }],
      evidence: [{ description: 'Pressure test hydraulic graph', type: 'graph' }],
    }, {} as any)

    expect(step2Result.status).toBe('completed')
    expect(step2Result.completedAt).toBeDefined()
    expect(step2Result.steps.every((s: any) => s.status === 'passed')).toBe(true)
  })

  it('handles journey pause and resume', async () => {
    const defineTool = createDefineJourneyTool()
    await defineTool.execute({
      journey_id: 'journey-crm-lead',
      name: 'CRM Lead Conversion',
      description: 'Lead to customer flow',
      project_id: 'crm',
      start_state: 'New lead',
      final_state: 'Customer onboarded',
      steps: [
        { id: 'step-01', name: 'Qualification Call', order: 0 },
        { id: 'step-02', name: 'Contract Signing', order: 1 },
      ],
    }, {} as any)

    const startTool = createStartJourneyTool()
    const exec = await startTool.execute({ journey_id: 'journey-crm-lead' }, {} as any)

    const pauseTool = createPauseJourneyTool()
    const paused = await pauseTool.execute({
      execution_id: exec.id,
      reason: 'Awaiting client callback',
    }, {} as any)

    expect(paused.status).toBe('paused')
    expect(paused.pauseReason).toBe('Awaiting client callback')

    const resumeTool = createResumeJourneyTool()
    const resumed = await resumeTool.execute({ execution_id: exec.id }, {} as any)

    expect(resumed.status).toBe('running')
    expect(resumed.pauseReason).toBeUndefined()
  })

  it('handles step failure gracefully', async () => {
    const defineTool = createDefineJourneyTool()
    await defineTool.execute({
      journey_id: 'journey-fail-test',
      name: 'Failure Test',
      description: 'Testing fail step',
      project_id: 'generic',
      start_state: 'Ready',
      final_state: 'Done',
      steps: [{ id: 'step-01', name: 'Unstable Step', order: 0 }],
    }, {} as any)

    const startTool = createStartJourneyTool()
    const exec = await startTool.execute({ journey_id: 'journey-fail-test' }, {} as any)

    const failTool = createFailJourneyStepTool()
    const failed = await failTool.execute({
      execution_id: exec.id,
      reason: 'External service 503 unavailable',
    }, {} as any)

    expect(failed.status).toBe('failed')
    expect(failed.failureReason).toBe('External service 503 unavailable')
    expect(failed.steps[0].status).toBe('failed')
  })

  it('exports execution as regression fixture and replays it', async () => {
    const defineTool = createDefineJourneyTool()
    await defineTool.execute({
      journey_id: 'journey-regression-target',
      name: 'Regression Target Flow',
      description: 'Flow for regression testing',
      project_id: 'erp',
      start_state: 'Zero state',
      final_state: 'Verified',
      steps: [{ id: 'step-01', name: 'Step 1', order: 0 }],
    }, {} as any)

    const startTool = createStartJourneyTool()
    const exec = await startTool.execute({ journey_id: 'journey-regression-target' }, {} as any)

    const advanceTool = createAdvanceJourneyStepTool()
    const completedExec = await advanceTool.execute({ execution_id: exec.id }, {} as any)

    const exportTool = createExportJourneyRegressionTool()
    const fixture = await exportTool.execute({
      execution_id: completedExec.id,
      is_golden: true,
    }, {} as any)

    expect(fixture.id).toBe(`FIX-${completedExec.id}`)
    expect(fixture.isGolden).toBe(true)

    const rerunTool = createRerunJourneyRegressionTool()
    const replayReport = await rerunTool.execute({ fixture_id: fixture.id }, {} as any)

    expect(replayReport.fixtureId).toBe(fixture.id)
    expect(replayReport.journeyId).toBe('journey-regression-target')
    expect(replayReport.replayedAt).toBeDefined()
    expect(Array.isArray(replayReport.stepComparisons)).toBe(true)
  })
})
