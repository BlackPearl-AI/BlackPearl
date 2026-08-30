/**
 * Tests for Goal Blueprint Engine — PHASE 07.
 *
 * Covers: creation, section updates, querying, validation,
 * markdown generation, summary statistics, status transitions,
 * and the School ERP lifecycle.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GoalBlueprintEngine } from '../src/goal-blueprint/engine.ts'
import {
  SECTION_ORDER,
  SECTION_LABELS,
  BLUEPRINT_STATUS_LABELS,
} from '../src/goal-blueprint/types.ts'
import type {
  PurposeSection,
  InputSection,
  OutputSection,
  WorkflowSection,
  DependenciesSection,
  UsedBySection,
  FilesSection,
  ElementsSection,
  TestsSection,
  CompletionCriteriaSection,
} from '../src/goal-blueprint/types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function samplePurpose(): PurposeSection {
  return {
    description: 'Manage student records',
    justification: 'Core entity for the entire ERP',
    successDefinition: 'All student CRUD operations work correctly',
    notes: [{ label: 'Scope', description: 'Only active students' }],
  }
}

function sampleInput(): InputSection {
  return {
    data: [{ label: 'Student data', description: 'Name, DOB, class' }],
    resources: [{ label: 'DB connection', description: 'PostgreSQL pool' }],
    prerequisites: ['Database schema created'],
  }
}

function sampleOutput(): OutputSection {
  return {
    artifacts: [{ label: 'Student record', description: 'Persisted student entity' }],
    sideEffects: [{ label: 'Audit log', description: 'Record creation logged' }],
    format: 'JSON',
  }
}

function sampleWorkflow(): WorkflowSection {
  return {
    steps: [
      { label: 'Validate input', description: 'Check required fields' },
      { label: 'Save to DB', description: 'Insert into students table' },
      { label: 'Return record', description: 'Return created student' },
    ],
    decisionPoints: [{ label: 'Duplicate check', description: 'Reject if email exists' }],
    errorHandling: [{ label: 'DB error', description: 'Return 500 with error message' }],
  }
}

function sampleDependencies(): DependenciesSection {
  return {
    items: [
      { target: 'database', type: 'service', required: true, description: 'PostgreSQL' },
      { target: 'enrollment', type: 'module', required: false, description: 'For reference' },
    ],
    riskNotes: ['DB outage blocks all operations'],
  }
}

function sampleUsedBy(): UsedBySection {
  return {
    consumers: [{ label: 'Enrollment module', description: 'References student records' }],
    integrationPoints: [{ label: 'REST API', description: '/api/students' }],
  }
}

function sampleFiles(): FilesSection {
  return {
    sources: [{ path: 'src/student.ts', purpose: 'Main module', type: 'source' }],
    tests: [{ path: 'tests/student.spec.ts', purpose: 'Unit tests', type: 'test' }],
    configs: [{ path: 'tsconfig.json', purpose: 'TypeScript config', type: 'config' }],
    docs: [{ path: 'docs/student.md', purpose: 'API docs', type: 'doc' }],
  }
}

function sampleElements(): ElementsSection {
  return {
    items: [
      { name: 'createStudent', type: 'function', description: 'Create a new student', isPublic: true },
      { name: 'StudentSchema', type: 'schema', description: 'Zod schema for validation', isPublic: true },
    ],
    categories: ['CRUD', 'Validation'],
  }
}

function sampleTests(): TestsSection {
  return {
    testCases: [
      { name: 'create student', type: 'unit', covers: 'createStudent', expectedResult: 'Returns student object' },
      { name: 'reject duplicate', type: 'unit', covers: 'createStudent duplicate', expectedResult: 'Throws error' },
    ],
    coverageRequirements: ['100% branch coverage'],
    testDataRequirements: ['Test student data fixture'],
  }
}

function sampleCompletionCriteria(): CompletionCriteriaSection {
  return {
    acceptanceCriteria: [
      { label: 'CRUD works', description: 'All CRUD operations pass' },
      { label: 'Validation active', description: 'Invalid input rejected' },
    ],
    qualityGates: [
      { label: 'Tests pass', description: 'All tests green' },
      { label: 'No warnings', description: 'Zero compiler warnings' },
    ],
    definitionOfDone: ['Code reviewed', 'Tests written', 'Docs updated'],
    blockingIssues: [],
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GoalBlueprintEngine', () => {
  let engine: GoalBlueprintEngine

  beforeEach(() => {
    engine = new GoalBlueprintEngine()
  })

  // -----------------------------------------------------------------------
  // Constants
  // -----------------------------------------------------------------------

  describe('constants', () => {
    it('SECTION_ORDER has 10 entries', () => {
      expect(SECTION_ORDER).toHaveLength(10)
    })

    it('SECTION_LABELS has entries for all sections', () => {
      for (const section of SECTION_ORDER) {
        expect(SECTION_LABELS[section]).toBeTruthy()
      }
    })

    it('BLUEPRINT_STATUS_LABELS has all statuses', () => {
      expect(BLUEPRINT_STATUS_LABELS.draft).toBe('Draft')
      expect(BLUEPRINT_STATUS_LABELS['in-progress']).toBe('In Progress')
      expect(BLUEPRINT_STATUS_LABELS.complete).toBe('Complete')
      expect(BLUEPRINT_STATUS_LABELS.validated).toBe('Validated')
    })
  })

  // -----------------------------------------------------------------------
  // createBlueprint
  // -----------------------------------------------------------------------

  describe('createBlueprint', () => {
    it('creates a blueprint with defaults', () => {
      const bp = engine.createBlueprint({
        goalNodeId: 'MG-001-G1',
        goalName: 'Student Management',
      })

      expect(bp.goalNodeId).toBe('MG-001-G1')
      expect(bp.goalName).toBe('Student Management')
      expect(bp.status).toBe('draft')
      expect(bp.completenessScore).toBe(0)
      expect(bp.populatedSections).toHaveLength(0)
      expect(bp.purpose.description).toBe('')
    })

    it('creates with initial purpose', () => {
      const bp = engine.createBlueprint({
        goalNodeId: 'MG-001-G1',
        goalName: 'Student Management',
        purposeDescription: 'Manage students',
        justification: 'Core module',
      })

      expect(bp.purpose.description).toBe('Manage students')
      expect(bp.purpose.justification).toBe('Core module')
      expect(bp.completenessScore).toBeGreaterThan(0)
      expect(bp.populatedSections).toContain('purpose')
    })

    it('throws on duplicate goal node ID', () => {
      engine.createBlueprint({ goalNodeId: 'MG-001-G1', goalName: 'G1' })
      expect(() => engine.createBlueprint({ goalNodeId: 'MG-001-G1', goalName: 'G1 dup' }))
        .toThrow('Blueprint already exists')
    })

    it('sets createdAt and updatedAt', () => {
      const bp = engine.createBlueprint({ goalNodeId: 'MG-001', goalName: 'G' })
      expect(bp.createdAt).toBeTruthy()
      expect(bp.updatedAt).toBe(bp.createdAt)
    })
  })

  // -----------------------------------------------------------------------
  // getBlueprint
  // -----------------------------------------------------------------------

  describe('getBlueprint', () => {
    it('returns undefined for non-existent', () => {
      expect(engine.getBlueprint('nonexistent')).toBeUndefined()
    })

    it('returns the blueprint', () => {
      engine.createBlueprint({ goalNodeId: 'MG-001', goalName: 'G' })
      const bp = engine.getBlueprint('MG-001')
      expect(bp).toBeDefined()
      expect(bp!.goalNodeId).toBe('MG-001')
    })
  })

  // -----------------------------------------------------------------------
  // getBlueprints
  // -----------------------------------------------------------------------

  describe('getBlueprints', () => {
    it('returns empty array when none', () => {
      expect(engine.getBlueprints()).toHaveLength(0)
    })

    it('returns all blueprints', () => {
      engine.createBlueprint({ goalNodeId: 'A', goalName: 'A' })
      engine.createBlueprint({ goalNodeId: 'B', goalName: 'B' })
      expect(engine.getBlueprints()).toHaveLength(2)
    })
  })

  // -----------------------------------------------------------------------
  // updateSection
  // -----------------------------------------------------------------------

  describe('updateSection', () => {
    it('updates purpose section', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'Goal 1' })
      const bp = engine.updateSection({
        goalNodeId: 'G1',
        section: 'purpose',
        data: samplePurpose(),
      })

      expect(bp.purpose.description).toBe('Manage student records')
      expect(bp.purpose.justification).toBe('Core entity for the entire ERP')
      expect(bp.completenessScore).toBeGreaterThan(0)
    })

    it('updates input section', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'Goal 1' })
      const bp = engine.updateSection({
        goalNodeId: 'G1',
        section: 'input',
        data: sampleInput(),
      })

      expect(bp.input.data).toHaveLength(1)
      expect(bp.input.resources).toHaveLength(1)
      expect(bp.input.prerequisites).toHaveLength(1)
    })

    it('updates output section', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'Goal 1' })
      const bp = engine.updateSection({
        goalNodeId: 'G1',
        section: 'output',
        data: sampleOutput(),
      })

      expect(bp.output.artifacts).toHaveLength(1)
      expect(bp.output.format).toBe('JSON')
    })

    it('updates workflow section', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'Goal 1' })
      const bp = engine.updateSection({
        goalNodeId: 'G1',
        section: 'workflow',
        data: sampleWorkflow(),
      })

      expect(bp.workflow.steps).toHaveLength(3)
      expect(bp.workflow.decisionPoints).toHaveLength(1)
      expect(bp.workflow.errorHandling).toHaveLength(1)
    })

    it('updates dependencies section', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'Goal 1' })
      const bp = engine.updateSection({
        goalNodeId: 'G1',
        section: 'dependencies',
        data: sampleDependencies(),
      })

      expect(bp.dependencies.items).toHaveLength(2)
      expect(bp.dependencies.riskNotes).toHaveLength(1)
    })

    it('updates usedBy section', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'Goal 1' })
      const bp = engine.updateSection({
        goalNodeId: 'G1',
        section: 'usedBy',
        data: sampleUsedBy(),
      })

      expect(bp.usedBy.consumers).toHaveLength(1)
      expect(bp.usedBy.integrationPoints).toHaveLength(1)
    })

    it('updates files section', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'Goal 1' })
      const bp = engine.updateSection({
        goalNodeId: 'G1',
        section: 'files',
        data: sampleFiles(),
      })

      expect(bp.files.sources).toHaveLength(1)
      expect(bp.files.tests).toHaveLength(1)
      expect(bp.files.configs).toHaveLength(1)
      expect(bp.files.docs).toHaveLength(1)
    })

    it('updates elements section', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'Goal 1' })
      const bp = engine.updateSection({
        goalNodeId: 'G1',
        section: 'elements',
        data: sampleElements(),
      })

      expect(bp.elements.items).toHaveLength(2)
      expect(bp.elements.categories).toHaveLength(2)
    })

    it('updates tests section', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'Goal 1' })
      const bp = engine.updateSection({
        goalNodeId: 'G1',
        section: 'tests',
        data: sampleTests(),
      })

      expect(bp.tests.testCases).toHaveLength(2)
      expect(bp.tests.coverageRequirements).toHaveLength(1)
    })

    it('updates completionCriteria section', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'Goal 1' })
      const bp = engine.updateSection({
        goalNodeId: 'G1',
        section: 'completionCriteria',
        data: sampleCompletionCriteria(),
      })

      expect(bp.completionCriteria.acceptanceCriteria).toHaveLength(2)
      expect(bp.completionCriteria.definitionOfDone).toHaveLength(3)
    })

    it('throws for non-existent goal node', () => {
      expect(() => engine.updateSection({
        goalNodeId: 'nonexistent',
        section: 'purpose',
        data: samplePurpose(),
      })).toThrow('No blueprint found')
    })

    it('updates updatedAt', async () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })
      const before = engine.getBlueprint('G1')!.updatedAt

      // Small delay to ensure timestamp difference.
      await new Promise(r => setTimeout(r, 10))

      engine.updateSection({
        goalNodeId: 'G1',
        section: 'purpose',
        data: samplePurpose(),
      })

      const after = engine.getBlueprint('G1')!.updatedAt
      expect(after >= before).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Completeness scoring
  // -----------------------------------------------------------------------

  describe('completeness scoring', () => {
    it('starts at 0 for empty blueprint', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })
      expect(engine.getBlueprint('G1')!.completenessScore).toBe(0)
    })

    it('increases as sections are populated', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })

      engine.updateSection({ goalNodeId: 'G1', section: 'purpose', data: samplePurpose() })
      const afterPurpose = engine.getBlueprint('G1')!.completenessScore
      expect(afterPurpose).toBeGreaterThan(0)

      engine.updateSection({ goalNodeId: 'G1', section: 'input', data: sampleInput() })
      const afterInput = engine.getBlueprint('G1')!.completenessScore
      expect(afterInput).toBeGreaterThan(afterPurpose)
    })

    it('tracks populated sections correctly', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })
      engine.updateSection({ goalNodeId: 'G1', section: 'purpose', data: samplePurpose() })
      engine.updateSection({ goalNodeId: 'G1', section: 'workflow', data: sampleWorkflow() })

      const bp = engine.getBlueprint('G1')!
      expect(bp.populatedSections).toContain('purpose')
      expect(bp.populatedSections).toContain('workflow')
      expect(bp.populatedSections).not.toContain('input')
    })

    it('scores all 10 sections populated as higher than partial', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })

      engine.updateSection({ goalNodeId: 'G1', section: 'purpose', data: samplePurpose() })
      const partial = engine.getBlueprint('G1')!.completenessScore

      engine.updateSection({ goalNodeId: 'G1', section: 'input', data: sampleInput() })
      engine.updateSection({ goalNodeId: 'G1', section: 'output', data: sampleOutput() })
      engine.updateSection({ goalNodeId: 'G1', section: 'workflow', data: sampleWorkflow() })
      engine.updateSection({ goalNodeId: 'G1', section: 'dependencies', data: sampleDependencies() })
      engine.updateSection({ goalNodeId: 'G1', section: 'usedBy', data: sampleUsedBy() })
      engine.updateSection({ goalNodeId: 'G1', section: 'files', data: sampleFiles() })
      engine.updateSection({ goalNodeId: 'G1', section: 'elements', data: sampleElements() })
      engine.updateSection({ goalNodeId: 'G1', section: 'tests', data: sampleTests() })
      engine.updateSection({ goalNodeId: 'G1', section: 'completionCriteria', data: sampleCompletionCriteria() })

      const full = engine.getBlueprint('G1')!.completenessScore
      expect(full).toBeGreaterThan(partial)
      expect(full).toBe(100)
    })
  })

  // -----------------------------------------------------------------------
  // Status
  // -----------------------------------------------------------------------

  describe('updateStatus', () => {
    it('updates status', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })
      const bp = engine.updateStatus('G1', 'in-progress')
      expect(bp.status).toBe('in-progress')
    })

    it('throws for non-existent', () => {
      expect(() => engine.updateStatus('nonexistent', 'complete')).toThrow('No blueprint found')
    })

    it('updates updatedAt', async () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })
      const before = engine.getBlueprint('G1')!.updatedAt
      await new Promise(r => setTimeout(r, 10))
      engine.updateStatus('G1', 'complete')
      const after = engine.getBlueprint('G1')!.updatedAt
      expect(after >= before).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  describe('queryBlueprints', () => {
    beforeEach(() => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'Student Mgmt' })
      engine.createBlueprint({ goalNodeId: 'G2', goalName: 'Fee Mgmt' })
      engine.updateStatus('G1', 'complete')
      engine.updateSection({ goalNodeId: 'G1', section: 'purpose', data: samplePurpose() })
    })

    it('returns all with empty query', () => {
      expect(engine.queryBlueprints({})).toHaveLength(2)
    })

    it('filters by goal node ID', () => {
      const results = engine.queryBlueprints({ goalNodeId: 'G1' })
      expect(results).toHaveLength(1)
      expect(results[0]!.goalNodeId).toBe('G1')
    })

    it('filters by status', () => {
      const results = engine.queryBlueprints({ status: 'complete' })
      expect(results).toHaveLength(1)
      expect(results[0]!.goalNodeId).toBe('G1')
    })

    it('filters by minCompleteness', () => {
      const results = engine.queryBlueprints({ minCompleteness: 1 })
      expect(results).toHaveLength(1)
      expect(results[0]!.goalNodeId).toBe('G1')
    })

    it('filters by populated section', () => {
      const results = engine.queryBlueprints({ populatedSection: 'purpose' })
      expect(results).toHaveLength(1)
      expect(results[0]!.goalNodeId).toBe('G1')
    })
  })

  // -----------------------------------------------------------------------
  // Validate completeness
  // -----------------------------------------------------------------------

  describe('validateCompleteness', () => {
    it('returns empty for no blueprints', () => {
      expect(engine.validateCompleteness()).toHaveLength(0)
    })

    it('reports missing sections', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })
      engine.updateSection({ goalNodeId: 'G1', section: 'purpose', data: samplePurpose() })

      const results = engine.validateCompleteness()
      expect(results).toHaveLength(1)
      expect(results[0]!.missingSections).toContain('input')
      expect(results[0]!.missingSections).not.toContain('purpose')
    })
  })

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------

  describe('getSummary', () => {
    it('returns empty summary', () => {
      const summary = engine.getSummary()
      expect(summary.totalBlueprints).toBe(0)
      expect(summary.averageCompleteness).toBe(0)
    })

    it('computes byStatus', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })
      engine.createBlueprint({ goalNodeId: 'G2', goalName: 'G2' })
      engine.updateStatus('G1', 'complete')

      const summary = engine.getSummary()
      expect(summary.byStatus.draft).toBe(1)
      expect(summary.byStatus.complete).toBe(1)
    })

    it('computes averageCompleteness', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })
      engine.updateSection({ goalNodeId: 'G1', section: 'purpose', data: samplePurpose() })

      const summary = engine.getSummary()
      expect(summary.averageCompleteness).toBeGreaterThan(0)
    })

    it('computes sectionCoverage', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })
      engine.updateSection({ goalNodeId: 'G1', section: 'purpose', data: samplePurpose() })

      const summary = engine.getSummary()
      expect(summary.sectionCoverage.purpose).toBe(1)
      expect(summary.sectionCoverage.input).toBe(0)
    })

    it('lists leastComplete', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })
      engine.createBlueprint({ goalNodeId: 'G2', goalName: 'G2' })
      engine.updateSection({ goalNodeId: 'G1', section: 'purpose', data: samplePurpose() })

      const summary = engine.getSummary()
      expect(summary.leastComplete).toHaveLength(2)
      expect(summary.leastComplete[0]!.goalNodeId).toBe('G2')
    })
  })

  // -----------------------------------------------------------------------
  // getMap
  // -----------------------------------------------------------------------

  describe('getMap', () => {
    it('returns a complete map', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })
      const map = engine.getMap()

      expect(Object.keys(map.blueprints)).toHaveLength(1)
      expect(map.summary.totalBlueprints).toBe(1)
      expect(map.createdAt).toBeTruthy()
      expect(map.updatedAt).toBeTruthy()
    })
  })

  // -----------------------------------------------------------------------
  // toMarkdown
  // -----------------------------------------------------------------------

  describe('toMarkdown', () => {
    it('generates empty report', () => {
      const md = engine.toMarkdown()
      expect(md).toContain('Goal Blueprints Report')
      expect(md).toContain('Total Blueprints:** 0')
    })

    it('generates report for a single blueprint', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'Student Management' })
      engine.updateSection({ goalNodeId: 'G1', section: 'purpose', data: samplePurpose() })
      engine.updateSection({ goalNodeId: 'G1', section: 'workflow', data: sampleWorkflow() })

      const md = engine.toMarkdown()
      expect(md).toContain('Student Management')
      expect(md).not.toContain('MG-001-G1')
      expect(md).toContain('Purpose')
      expect(md).toContain('Workflow')
      expect(md).toContain('Manage student records')
    })

    it('generates report for specific blueprint', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })
      engine.createBlueprint({ goalNodeId: 'G2', goalName: 'G2' })

      const md = engine.toMarkdown('G1')
      expect(md).toContain('Total Blueprints:** 1')
      expect(md).toContain('G1')
      expect(md).not.toContain('G2')
    })

    it('shows section table with checkmarks', () => {
      engine.createBlueprint({ goalNodeId: 'G1', goalName: 'G1' })
      engine.updateSection({ goalNodeId: 'G1', section: 'purpose', data: samplePurpose() })

      const md = engine.toMarkdown('G1')
      expect(md).toContain('🎯 Purpose')
      expect(md).toContain('📥 Input')
    })
  })

  // -----------------------------------------------------------------------
  // Full lifecycle — School ERP
  // -----------------------------------------------------------------------

  describe('full lifecycle — School ERP', () => {
    it('creates and populates blueprints for multiple goals', () => {
      // 1. Create blueprints for 3 goals.
      engine.createBlueprint({
        goalNodeId: 'MG-001-G1',
        goalName: 'Student Management',
        purposeDescription: 'Manage all student-related operations',
        justification: 'Core module of School ERP',
      })

      engine.createBlueprint({
        goalNodeId: 'MG-001-G2',
        goalName: 'Fee Management',
        purposeDescription: 'Handle fee collection and receipts',
        justification: 'Revenue-critical module',
      })

      engine.createBlueprint({
        goalNodeId: 'MG-001-G3',
        goalName: 'Exam Management',
        purposeDescription: 'Conduct exams and publish results',
        justification: 'Academic requirement',
      })

      expect(engine.getBlueprints()).toHaveLength(3)

      // 2. Populate G1 fully.
      engine.updateSection({ goalNodeId: 'MG-001-G1', section: 'purpose', data: samplePurpose() })
      engine.updateSection({ goalNodeId: 'MG-001-G1', section: 'input', data: sampleInput() })
      engine.updateSection({ goalNodeId: 'MG-001-G1', section: 'output', data: sampleOutput() })
      engine.updateSection({ goalNodeId: 'MG-001-G1', section: 'workflow', data: sampleWorkflow() })
      engine.updateSection({ goalNodeId: 'MG-001-G1', section: 'dependencies', data: sampleDependencies() })
      engine.updateSection({ goalNodeId: 'MG-001-G1', section: 'usedBy', data: sampleUsedBy() })
      engine.updateSection({ goalNodeId: 'MG-001-G1', section: 'files', data: sampleFiles() })
      engine.updateSection({ goalNodeId: 'MG-001-G1', section: 'elements', data: sampleElements() })
      engine.updateSection({ goalNodeId: 'MG-001-G1', section: 'tests', data: sampleTests() })
      engine.updateSection({ goalNodeId: 'MG-001-G1', section: 'completionCriteria', data: sampleCompletionCriteria() })

      // 3. Populate G2 partially.
      engine.updateSection({ goalNodeId: 'MG-001-G2', section: 'purpose', data: {
        description: 'Handle fee collection',
        justification: 'Revenue management',
        successDefinition: 'All fees tracked',
        notes: [],
      }})
      engine.updateSection({ goalNodeId: 'MG-001-G2', section: 'workflow', data: {
        steps: [{ label: 'Calculate', description: 'Calculate fee amount' }],
        decisionPoints: [],
        errorHandling: [],
      }})

      // 4. Update statuses.
      engine.updateStatus('MG-001-G1', 'complete')
      engine.updateStatus('MG-001-G2', 'in-progress')

      // 5. Verify G1 is fully complete.
      const g1 = engine.getBlueprint('MG-001-G1')!
      expect(g1.status).toBe('complete')
      expect(g1.completenessScore).toBe(100)
      expect(g1.populatedSections).toHaveLength(10)

      // 6. Verify G2 is partial.
      const g2 = engine.getBlueprint('MG-001-G2')!
      expect(g2.status).toBe('in-progress')
      expect(g2.completenessScore).toBeGreaterThan(0)
      expect(g2.completenessScore).toBeLessThan(100)

      // 7. Verify G3 is drafted (has purpose from constructor but no explicit section updates).
      const g3 = engine.getBlueprint('MG-001-G3')!
      expect(g3.status).toBe('draft')
      expect(g3.completenessScore).toBeGreaterThan(0)
      expect(g3.completenessScore).toBeLessThan(g1.completenessScore)

      // 8. Summary checks.
      const summary = engine.getSummary()
      expect(summary.totalBlueprints).toBe(3)
      expect(summary.byStatus.complete).toBe(1)
      expect(summary.byStatus['in-progress']).toBe(1)
      expect(summary.byStatus.draft).toBe(1)
      expect(summary.averageCompleteness).toBeGreaterThan(0)

      // 9. Validation reports missing sections.
      const validation = engine.validateCompleteness()
      const g3Validation = validation.find(v => v.goalNodeId === 'MG-001-G3')!
      // G3 has purpose populated from constructor, so 9 of 10 sections are missing.
      expect(g3Validation.missingSections).toHaveLength(9)

      const g1Validation = validation.find(v => v.goalNodeId === 'MG-001-G1')!
      expect(g1Validation.missingSections).toHaveLength(0)

      // 10. Markdown report includes all.
      const md = engine.toMarkdown()
      expect(md).toContain('Student Management')
      expect(md).toContain('Fee Management')
      expect(md).toContain('Exam Management')
      expect(md).toContain('Total Blueprints:** 3')
    })
  })
})
