import { describe, expect, it, beforeEach } from 'vitest'
import { MasterModuleDeepAnalysisEngine } from '../src/deep-analysis/engine.ts'
import { resetEngine } from '../src/deep-analysis/tools.ts'
import { DIMENSION_ORDER, DIMENSION_LABELS } from '../src/deep-analysis/types.ts'
import type {
  FieldAnalysis,
  ValidationRule,
  APIEndpoint,
  UIComponent,
  ButtonDefinition,
  DropdownDefinition,
  SettingDefinition,
  PermissionDefinition,
  PrintTemplate,
  WorkflowStep,
  DependencyReference,
  TestCoverage,
} from '../src/deep-analysis/types.ts'

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

function studentFields(): FieldAnalysis[] {
  return [
    { name: 'studentId', displayName: 'Student ID', type: 'string', required: true, unique: true, isPrimaryKey: true, hasValidation: true, hasDefault: false, hasIndex: true, hasForeignKey: false, validationRules: [], notes: 'Primary key' },
    { name: 'firstName', displayName: 'First Name', type: 'string', required: true, unique: false, isPrimaryKey: false, hasValidation: false, hasDefault: false, hasIndex: false, hasForeignKey: false, validationRules: [], notes: '' },
    { name: 'lastName', displayName: 'Last Name', type: 'string', required: true, unique: false, isPrimaryKey: false, hasValidation: false, hasDefault: false, hasIndex: false, hasForeignKey: false, validationRules: [], notes: '' },
    { name: 'dateOfBirth', displayName: 'Date of Birth', type: 'date', required: true, unique: false, isPrimaryKey: false, hasValidation: true, hasDefault: false, hasIndex: false, hasForeignKey: false, validationRules: [{ field: 'dateOfBirth', rule: 'date in past', type: 'custom', errorMessage: 'DOB must be in the past' }], notes: '' },
    { name: 'email', displayName: 'Email', type: 'email', required: false, unique: true, isPrimaryKey: false, hasValidation: true, hasDefault: false, hasIndex: true, hasForeignKey: false, validationRules: [{ field: 'email', rule: 'valid email', type: 'pattern', errorMessage: 'Invalid email' }], notes: '' },
    { name: 'phone', displayName: 'Phone', type: 'phone', required: false, unique: false, isPrimaryKey: false, hasValidation: false, hasDefault: false, hasIndex: false, hasForeignKey: false, validationRules: [], notes: '' },
  ]
}

function studentValidationRules(): ValidationRule[] {
  return [
    { field: 'studentId', rule: 'required', type: 'required', errorMessage: 'Student ID is required' },
    { field: 'firstName', rule: 'min length 1', type: 'length', errorMessage: 'First name cannot be empty' },
    { field: 'dateOfBirth', rule: 'date in past', type: 'custom', errorMessage: 'DOB must be in the past' },
    { field: 'email', rule: 'valid email format', type: 'pattern', errorMessage: 'Invalid email' },
    { field: 'phone', rule: '10 digits', type: 'pattern', errorMessage: 'Phone must be 10 digits' },
  ]
}

function studentAPIEndpoints(): APIEndpoint[] {
  return [
    { method: 'POST', path: '/api/students', description: 'Create student', parameters: ['firstName', 'lastName', 'email'], responseFields: ['studentId'], authRequired: true },
    { method: 'GET', path: '/api/students', description: 'List students', parameters: ['page', 'limit'], responseFields: ['students', 'total'], authRequired: true },
    { method: 'GET', path: '/api/students/:id', description: 'Get student', parameters: ['id'], responseFields: ['student'], authRequired: true },
    { method: 'PUT', path: '/api/students/:id', description: 'Update student', parameters: ['id', 'firstName', 'lastName'], responseFields: ['student'], authRequired: true },
    { method: 'DELETE', path: '/api/students/:id', description: 'Delete student', parameters: ['id'], responseFields: [], authRequired: true },
    { method: 'GET', path: '/api/students/search', description: 'Search students', parameters: ['q', 'field'], responseFields: ['students'], authRequired: true },
  ]
}

function studentUIComponents(): UIComponent[] {
  return [
    { type: 'list', name: 'StudentList', description: 'List of all students', fields: ['studentId', 'firstName', 'lastName', 'email'], actions: ['search', 'filter', 'paginate'], responsive: true },
    { type: 'form', name: 'StudentForm', description: 'Create/edit student', fields: ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth'], actions: ['save', 'cancel'], responsive: true },
    { type: 'detail', name: 'StudentDetail', description: 'Student detail view', fields: ['studentId', 'firstName', 'lastName', 'email', 'phone', 'dateOfBirth'], actions: ['edit', 'delete', 'print'], responsive: true },
  ]
}

function studentButtons(): ButtonDefinition[] {
  return [
    { label: 'Save', action: 'save', context: 'form', requiresConfirmation: false, permissions: ['editor', 'admin'], enabled: true },
    { label: 'Delete', action: 'delete', context: 'detail', requiresConfirmation: true, permissions: ['admin'], enabled: true },
    { label: 'Print', action: 'print', context: 'detail', requiresConfirmation: false, permissions: ['viewer', 'editor', 'admin'], enabled: true },
    { label: 'Export CSV', action: 'export', context: 'list', requiresConfirmation: false, permissions: ['viewer', 'editor', 'admin'], enabled: true },
  ]
}

function studentDropdowns(): DropdownDefinition[] {
  return [
    { field: 'status', options: [{ value: 'active', label: 'Active', enabled: true, sortOrder: 1 }, { value: 'inactive', label: 'Inactive', enabled: true, sortOrder: 2 }, { value: 'graduated', label: 'Graduated', enabled: true, sortOrder: 3 }], allowCustom: false, searchable: false },
    { field: 'grade', options: [{ value: 'A', label: 'Grade A', enabled: true, sortOrder: 1 }, { value: 'B', label: 'Grade B', enabled: true, sortOrder: 2 }, { value: 'C', label: 'Grade C', enabled: true, sortOrder: 3 }], allowCustom: false, searchable: false },
  ]
}

function studentSettings(): SettingDefinition[] {
  return [
    { key: 'student.auto_generate_id', label: 'Auto-generate Student ID', type: 'boolean', defaultValue: 'true', description: 'Automatically generate student IDs', scope: 'module', required: false },
    { key: 'student.email_domain', label: 'Email Domain', type: 'string', defaultValue: 'school.edu', description: 'Default email domain', scope: 'global', required: false },
    { key: 'student.max_upload_size', label: 'Max Upload Size (MB)', type: 'number', defaultValue: '10', description: 'Max file upload size', scope: 'module', required: false },
  ]
}

function studentPermissions(): PermissionDefinition[] {
  return [
    { role: 'admin', actions: ['create', 'read', 'update', 'delete', '*'], fields: ['*'], conditions: [] },
    { role: 'editor', actions: ['create', 'read', 'update'], fields: ['firstName', 'lastName', 'email', 'phone'], conditions: [] },
    { role: 'viewer', actions: ['read'], fields: ['*'], conditions: [] },
  ]
}

function studentPrintTemplates(): PrintTemplate[] {
  return [
    { name: 'Student Profile', format: 'pdf', description: 'Print student profile', fields: ['studentId', 'firstName', 'lastName', 'email', 'phone'], header: 'Student Profile', footer: 'School ERP', orientation: 'portrait' },
    { name: 'Student List', format: 'html', description: 'Print student list', fields: ['studentId', 'firstName', 'lastName'], header: 'Student List', footer: '', orientation: 'landscape' },
  ]
}

function studentWorkflow(): WorkflowStep[] {
  return [
    { name: 'Enroll', fromStatus: 'draft', toStatus: 'active', requiredRole: 'admin', description: 'Activate a new student', notifications: ['email-student', 'notify-parent'] },
    { name: 'Graduate', fromStatus: 'active', toStatus: 'graduated', requiredRole: 'admin', description: 'Mark student as graduated', notifications: ['email-student', 'notify-parent'] },
    { name: 'Deactivate', fromStatus: 'active', toStatus: 'inactive', requiredRole: 'admin', description: 'Deactivate student', notifications: ['email-student'] },
  ]
}

function studentDependencies(): DependencyReference[] {
  return [
    { targetModule: 'enrollment', targetEntity: 'enrollment', type: 'field-reference', description: 'Student enrolled in classes', required: true },
    { targetModule: 'fees', targetEntity: 'fee', type: 'api-call', description: 'Student fee records', required: true },
    { targetModule: 'documents', targetEntity: 'document', type: 'shared-component', description: 'Student documents', required: false },
  ]
}

function studentTestCoverage(): TestCoverage {
  return {
    totalTests: 25,
    passingTests: 23,
    failingTests: 2,
    coveragePercent: 85,
    untestedFields: ['phone'],
    untestedScenarios: ['bulk import', 'international phone formats'],
  }
}

// ---------------------------------------------------------------------------
// MasterModuleDeepAnalysisEngine Tests
// ---------------------------------------------------------------------------

describe('MasterModuleDeepAnalysisEngine', () => {
  let engine: MasterModuleDeepAnalysisEngine

  beforeEach(() => {
    resetEngine()
    engine = new MasterModuleDeepAnalysisEngine()
  })

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------

  describe('initialization', () => {
    it('starts with empty map', () => {
      const map = engine.getMap()
      expect(Object.keys(map.analyses)).toHaveLength(0)
    })

    it('getAnalyses returns empty array', () => {
      expect(engine.getAnalyses()).toHaveLength(0)
    })

    it('getAnalysis returns undefined for unknown module', () => {
      expect(engine.getAnalysis('non-existent')).toBeUndefined()
    })

    it('initializeModule creates analysis entry', () => {
      const analysis = engine.initializeModule('student-master')
      expect(analysis.moduleId).toBe('student-master')
      expect(analysis.status).toBe('not-analyzed')
      expect(analysis.findings).toHaveLength(0)
    })

    it('initializeModule is idempotent', () => {
      const a1 = engine.initializeModule('sm', 'notes')
      const a2 = engine.initializeModule('sm')
      expect(a1.moduleId).toBe(a2.moduleId)
      // Second call returns existing without overwriting notes.
      expect(a2.notes).toBe('notes')
    })
  })

  // -----------------------------------------------------------------------
  // Data Dimension
  // -----------------------------------------------------------------------

  describe('data dimension', () => {
    it('registers data analysis', () => {
      engine.registerDataAnalysis({
        moduleId: 'student-master',
        entityCount: 1,
        totalFields: 6,
        requiredFields: 4,
        optionalFields: 2,
        computedFields: 0,
        referenceFields: 0,
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.data).toBeDefined()
      expect(analysis.data!.entityCount).toBe(1)
      expect(analysis.data!.totalFields).toBe(6)
    })

    it('auto-detects many reference fields', () => {
      engine.registerDataAnalysis({
        moduleId: 'sm',
        entityCount: 1,
        totalFields: 4,
        requiredFields: 4,
        optionalFields: 0,
        computedFields: 0,
        referenceFields: 3, // 3/4 = 75% — triggers warning
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('Many reference fields'))).toBe(true)
    })

    it('detects computed fields', () => {
      engine.registerDataAnalysis({
        moduleId: 'sm',
        entityCount: 1,
        totalFields: 5,
        requiredFields: 3,
        optionalFields: 2,
        computedFields: 2,
        referenceFields: 0,
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('Computed fields'))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Fields Dimension
  // -----------------------------------------------------------------------

  describe('fields dimension', () => {
    it('registers fields analysis', () => {
      engine.registerFieldsAnalysis({
        moduleId: 'student-master',
        fields: studentFields(),
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.fields).toBeDefined()
      expect(analysis.fields!.fields).toHaveLength(6)
      expect(analysis.fields!.totalWithValidation).toBe(3) // studentId, dob, email
      expect(analysis.fields!.totalIndexed).toBe(2) // studentId, email
    })

    it('warns about required fields without validation', () => {
      engine.registerFieldsAnalysis({
        moduleId: 'sm',
        fields: [{ name: 'name', displayName: 'Name', type: 'string', required: true, unique: false, isPrimaryKey: false, hasValidation: false, hasDefault: false, hasIndex: false, hasForeignKey: false, validationRules: [], notes: '' }],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('lacks validation'))).toBe(true)
    })

    it('errors on non-unique primary key', () => {
      engine.registerFieldsAnalysis({
        moduleId: 'sm',
        fields: [{ name: 'id', displayName: 'ID', type: 'string', required: true, unique: false, isPrimaryKey: true, hasValidation: true, hasDefault: false, hasIndex: true, hasForeignKey: false, validationRules: [], notes: '' }],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('Primary key') && f.severity === 'error')).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // IDs Dimension
  // -----------------------------------------------------------------------

  describe('ids dimension', () => {
    it('registers ids analysis', () => {
      engine.registerIdsAnalysis({
        moduleId: 'student-master',
        primaryKey: 'studentId',
        secondaryKeys: ['email'],
        foreignKeys: [],
        compositeKeys: [],
        autoIncrement: false,
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.ids).toBeDefined()
      expect(analysis.ids!.primaryKey).toBe('studentId')
      expect(analysis.ids!.secondaryKeys).toEqual(['email'])
    })

    it('warns about no secondary keys and no auto-increment', () => {
      engine.registerIdsAnalysis({
        moduleId: 'sm',
        primaryKey: 'id',
        secondaryKeys: [],
        foreignKeys: [],
        compositeKeys: [],
        autoIncrement: false,
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('No secondary keys'))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Validation Dimension
  // -----------------------------------------------------------------------

  describe('validation dimension', () => {
    it('registers validation analysis', () => {
      engine.registerValidationAnalysis({
        moduleId: 'student-master',
        rules: studentValidationRules(),
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.validation).toBeDefined()
      expect(analysis.validation!.totalRules).toBe(5)
      expect(analysis.validation!.fieldsWithValidation).toBe(5) // studentId, firstName, dateOfBirth, email, phone
      expect(analysis.validation!.customRules).toBe(1) // dateOfBirth
    })

    it('warns when no validation rules', () => {
      engine.registerValidationAnalysis({
        moduleId: 'sm',
        rules: [],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('No validation rules'))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Database Dimension
  // -----------------------------------------------------------------------

  describe('database dimension', () => {
    it('registers database analysis', () => {
      engine.registerDatabaseAnalysis({
        moduleId: 'student-master',
        tableName: 'students',
        hasAutoIncrement: false,
        hasSoftDelete: true,
        hasTimestamps: true,
        indexes: ['studentId', 'email'],
        uniqueConstraints: ['studentId', 'email'],
        foreignKeyConstraints: [],
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.database).toBeDefined()
      expect(analysis.database!.tableName).toBe('students')
      expect(analysis.database!.hasTimestamps).toBe(true)
      expect(analysis.database!.indexes).toHaveLength(2)
    })

    it('warns about missing timestamps', () => {
      engine.registerDatabaseAnalysis({
        moduleId: 'sm',
        hasTimestamps: false,
        indexes: ['id'],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('No timestamps'))).toBe(true)
    })

    it('errors about missing indexes', () => {
      engine.registerDatabaseAnalysis({
        moduleId: 'sm',
        indexes: [],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('No indexes') && f.severity === 'error')).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // API Dimension
  // -----------------------------------------------------------------------

  describe('api dimension', () => {
    it('registers api analysis', () => {
      engine.registerAPIAnalysis({
        moduleId: 'student-master',
        endpoints: studentAPIEndpoints(),
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.api).toBeDefined()
      expect(analysis.api!.endpoints).toHaveLength(6)
      expect(analysis.api!.hasCreate).toBe(true)
      expect(analysis.api!.hasRead).toBe(true)
      expect(analysis.api!.hasUpdate).toBe(true)
      expect(analysis.api!.hasDelete).toBe(true)
      expect(analysis.api!.hasSearch).toBe(true)
    })

    it('warns about missing CRUD operations', () => {
      engine.registerAPIAnalysis({
        moduleId: 'sm',
        endpoints: [
          { method: 'GET', path: '/api/sm', description: 'list', parameters: [], responseFields: [], authRequired: true },
        ],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('Missing CRUD'))).toBe(true)
    })

    it('criticizes unauthenticated endpoints', () => {
      engine.registerAPIAnalysis({
        moduleId: 'sm',
        endpoints: [
          { method: 'POST', path: '/api/sm', description: 'create', parameters: [], responseFields: [], authRequired: false },
        ],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('without authentication') && f.severity === 'critical')).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // UI Dimension
  // -----------------------------------------------------------------------

  describe('ui dimension', () => {
    it('registers ui analysis', () => {
      engine.registerUIAnalysis({
        moduleId: 'student-master',
        components: studentUIComponents(),
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.ui).toBeDefined()
      expect(analysis.ui!.components).toHaveLength(3)
      expect(analysis.ui!.hasForm).toBe(true)
      expect(analysis.ui!.hasList).toBe(true)
      expect(analysis.ui!.hasDetail).toBe(true)
      expect(analysis.ui!.hasSearch).toBe(true)
    })

    it('warns about missing form', () => {
      engine.registerUIAnalysis({
        moduleId: 'sm',
        components: [{ type: 'list', name: 'SMList', description: 'list', fields: [], actions: [], responsive: true }],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('No form'))).toBe(true)
    })

    it('warns about missing list', () => {
      engine.registerUIAnalysis({
        moduleId: 'sm',
        components: [{ type: 'form', name: 'SMForm', description: 'form', fields: [], actions: [], responsive: true }],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('No list'))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Buttons Dimension
  // -----------------------------------------------------------------------

  describe('buttons dimension', () => {
    it('registers buttons analysis', () => {
      engine.registerButtonsAnalysis({
        moduleId: 'student-master',
        buttons: studentButtons(),
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.buttons).toBeDefined()
      expect(analysis.buttons!.totalButtons).toBe(4)
      expect(analysis.buttons!.destructiveButtons).toBe(1) // Delete
      expect(analysis.buttons!.confirmationRequired).toBe(1) // Delete
    })

    it('errors on destructive buttons without confirmation', () => {
      engine.registerButtonsAnalysis({
        moduleId: 'sm',
        buttons: [{ label: 'Delete', action: 'delete', context: 'detail', requiresConfirmation: false, permissions: ['admin'], enabled: true }],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('without confirmation') && f.severity === 'error')).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Dropdowns Dimension
  // -----------------------------------------------------------------------

  describe('dropdowns dimension', () => {
    it('registers dropdowns analysis', () => {
      engine.registerDropdownsAnalysis({
        moduleId: 'student-master',
        dropdowns: studentDropdowns(),
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.dropdowns).toBeDefined()
      expect(analysis.dropdowns!.totalDropdowns).toBe(2)
      expect(analysis.dropdowns!.totalOptions).toBe(6) // 3 + 3
    })

    it('warns about empty dropdown', () => {
      engine.registerDropdownsAnalysis({
        moduleId: 'sm',
        dropdowns: [{ field: 'empty', options: [], allowCustom: false, searchable: false }],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('Empty dropdown'))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Settings Dimension
  // -----------------------------------------------------------------------

  describe('settings dimension', () => {
    it('registers settings analysis', () => {
      engine.registerSettingsAnalysis({
        moduleId: 'student-master',
        settings: studentSettings(),
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.settings).toBeDefined()
      expect(analysis.settings!.totalSettings).toBe(3)
      expect(analysis.settings!.globalSettings).toBe(1)
      expect(analysis.settings!.moduleSettings).toBe(2)
    })

    it('warns about required settings without defaults', () => {
      engine.registerSettingsAnalysis({
        moduleId: 'sm',
        settings: [{ key: 'x', label: 'X', type: 'string', defaultValue: '', description: '', scope: 'module', required: true }],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('no default'))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Permissions Dimension
  // -----------------------------------------------------------------------

  describe('permissions dimension', () => {
    it('registers permissions analysis', () => {
      engine.registerPermissionsAnalysis({
        moduleId: 'student-master',
        permissions: studentPermissions(),
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.permissions).toBeDefined()
      expect(analysis.permissions!.roles).toContain('admin')
      expect(analysis.permissions!.roles).toContain('editor')
      expect(analysis.permissions!.roles).toContain('viewer')
      expect(analysis.permissions!.hasAdminOnly).toBe(true)
    })

    it('warns about empty permissions', () => {
      engine.registerPermissionsAnalysis({
        moduleId: 'sm',
        permissions: [],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('No permission roles'))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Print Dimension
  // -----------------------------------------------------------------------

  describe('print dimension', () => {
    it('registers print analysis', () => {
      engine.registerPrintAnalysis({
        moduleId: 'student-master',
        templates: studentPrintTemplates(),
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.print).toBeDefined()
      expect(analysis.print!.totalTemplates).toBe(2)
      expect(analysis.print!.pdfTemplates).toBe(1)
      expect(analysis.print!.htmlTemplates).toBe(1)
    })

    it('notes when no print templates', () => {
      engine.registerPrintAnalysis({
        moduleId: 'sm',
        templates: [],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('No print templates'))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Workflow Dimension
  // -----------------------------------------------------------------------

  describe('workflow dimension', () => {
    it('registers workflow analysis', () => {
      engine.registerWorkflowAnalysis({
        moduleId: 'student-master',
        steps: studentWorkflow(),
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.workflow).toBeDefined()
      expect(analysis.workflow!.totalTransitions).toBe(3)
      expect(analysis.workflow!.hasApprovalChain).toBe(true)
      expect(analysis.workflow!.hasNotifications).toBe(true)
      expect(analysis.workflow!.statuses).toContain('draft')
      expect(analysis.workflow!.statuses).toContain('active')
      expect(analysis.workflow!.statuses).toContain('graduated')
      expect(analysis.workflow!.statuses).toContain('inactive')
    })

    it('warns when no approval chain', () => {
      engine.registerWorkflowAnalysis({
        moduleId: 'sm',
        steps: [{ name: 'Move', fromStatus: 'a', toStatus: 'b', requiredRole: '', description: '', notifications: [] }],
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('no approval chain'))).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Dependencies Dimension
  // -----------------------------------------------------------------------

  describe('dependencies dimension', () => {
    it('registers dependencies analysis', () => {
      engine.registerDependenciesAnalysis({
        moduleId: 'student-master',
        references: studentDependencies(),
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.dependencies).toBeDefined()
      expect(analysis.dependencies!.references).toHaveLength(3)
      expect(analysis.dependencies!.incomingDependencies).toBe(2) // required
      expect(analysis.dependencies!.outgoingDependencies).toBe(1) // optional
    })

    it('updates cross-module dependencies', () => {
      engine.registerDependenciesAnalysis({
        moduleId: 'sm',
        references: [{ targetModule: 'enrollment', targetEntity: 'enrollment', type: 'field-reference', description: 'test', required: true }],
      })

      const map = engine.getMap()
      expect(map.crossModuleDependencies['sm']).toContain('enrollment')
    })
  })

  // -----------------------------------------------------------------------
  // Tests Dimension
  // -----------------------------------------------------------------------

  describe('tests dimension', () => {
    it('registers tests analysis', () => {
      engine.registerTestsAnalysis({
        moduleId: 'student-master',
        coverage: studentTestCoverage(),
        hasUnitTests: true,
        hasIntegrationTests: false,
        hasEdgeCaseTests: false,
        missingScenarios: ['bulk import'],
      })

      const analysis = engine.getAnalysis('student-master')!
      expect(analysis.tests).toBeDefined()
      expect(analysis.tests!.coverage.totalTests).toBe(25)
      expect(analysis.tests!.coverage.passingTests).toBe(23)
      expect(analysis.tests!.coverage.failingTests).toBe(2)
      expect(analysis.tests!.hasUnitTests).toBe(true)
      expect(analysis.tests!.hasIntegrationTests).toBe(false)
    })

    it('warns about low coverage', () => {
      engine.registerTestsAnalysis({
        moduleId: 'sm',
        coverage: { totalTests: 10, passingTests: 10, failingTests: 0, coveragePercent: 30, untestedFields: ['a', 'b'], untestedScenarios: [] },
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('coverage at 30%') && f.severity === 'warning')).toBe(true)
    })

    it('errors on failing tests', () => {
      engine.registerTestsAnalysis({
        moduleId: 'sm',
        coverage: { totalTests: 10, passingTests: 8, failingTests: 2, coveragePercent: 85, untestedFields: [], untestedScenarios: [] },
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings.some(f => f.title.includes('failing test') && f.severity === 'error')).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Finding Registration
  // -----------------------------------------------------------------------

  describe('addFinding', () => {
    it('adds a finding to a module', () => {
      engine.addFinding({
        moduleId: 'sm',
        dimension: 'data',
        severity: 'info',
        title: 'Custom finding',
        description: 'This is a custom finding',
      })

      const findings = engine.getAnalysis('sm')!.findings
      expect(findings).toHaveLength(1)
      expect(findings[0]!.title).toBe('Custom finding')
      expect(findings[0]!.severity).toBe('info')
    })

    it('adds finding with optional fields', () => {
      engine.addFinding({
        moduleId: 'sm',
        dimension: 'ui',
        severity: 'warning',
        title: 'Field issue',
        description: 'Something wrong',
        field: 'email',
        suggestion: 'Fix it',
      })

      const finding = engine.getAnalysis('sm')!.findings[0]!
      expect(finding.field).toBe('email')
      expect(finding.suggestion).toBe('Fix it')
    })
  })

  // -----------------------------------------------------------------------
  // Completeness Computation
  // -----------------------------------------------------------------------

  describe('computeCompleteness', () => {
    it('returns undefined for unknown module', () => {
      expect(engine.computeCompleteness('non-existent')).toBeUndefined()
    })

    it('computes 0% for uninitialized module', () => {
      engine.initializeModule('sm')
      const score = engine.computeCompleteness('sm')!
      expect(score.overallScore).toBe(0)
      expect(score.analyzedCount).toBe(0)
      expect(score.missingCount).toBe(15) // 15 dimensions (excluding completeness)
    })

    it('computes scores with analyzed dimensions', () => {
      engine.registerDataAnalysis({
        moduleId: 'sm',
        entityCount: 1,
        totalFields: 5,
        requiredFields: 3,
        optionalFields: 2,
        computedFields: 0,
        referenceFields: 0,
      })
      engine.registerFieldsAnalysis({
        moduleId: 'sm',
        fields: studentFields(),
      })

      const score = engine.computeCompleteness('sm')!
      expect(score.overallScore).toBeGreaterThan(0)
      expect(score.analyzedCount).toBe(2)
      expect(score.missingCount).toBe(13) // 15 - 2
      expect(score.dimensionScores.data).toBe(100) // No findings = 100
      expect(score.dimensionScores.fields).toBeLessThan(100) // Warnings reduce score
    })

    it('deducts for critical findings', () => {
      engine.registerAPIAnalysis({
        moduleId: 'sm',
        endpoints: [
          { method: 'POST', path: '/api/sm', description: '', parameters: [], responseFields: [], authRequired: false }, // no auth = critical
        ],
      })

      const score = engine.computeCompleteness('sm')!
      // Critical (-40) should bring API score well below 100.
      expect(score.dimensionScores.api).toBeLessThan(60)
      expect(score.criticalDimensions).toContain('api')
    })
  })

  // -----------------------------------------------------------------------
  // Validate Completeness
  // -----------------------------------------------------------------------

  describe('validateCompleteness', () => {
    it('returns undefined for unknown module', () => {
      expect(engine.validateCompleteness('non-existent')).toBeUndefined()
    })

    it('marks module as complete when all dimensions covered', () => {
      // Register all 15 dimensions (completeness is computed, not registered).
      engine.registerDataAnalysis({ moduleId: 'sm', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 0, referenceFields: 0 })
      engine.registerFieldsAnalysis({ moduleId: 'sm', fields: studentFields() })
      engine.registerIdsAnalysis({ moduleId: 'sm', primaryKey: 'id', secondaryKeys: [], foreignKeys: [], compositeKeys: [], autoIncrement: true })
      engine.registerValidationAnalysis({ moduleId: 'sm', rules: studentValidationRules() })
      engine.registerDatabaseAnalysis({ moduleId: 'sm', tableName: 'students', indexes: ['id'] })
      engine.registerAPIAnalysis({ moduleId: 'sm', endpoints: studentAPIEndpoints() })
      engine.registerUIAnalysis({ moduleId: 'sm', components: studentUIComponents() })
      engine.registerButtonsAnalysis({ moduleId: 'sm', buttons: studentButtons() })
      engine.registerDropdownsAnalysis({ moduleId: 'sm', dropdowns: studentDropdowns() })
      engine.registerSettingsAnalysis({ moduleId: 'sm', settings: studentSettings() })
      engine.registerPermissionsAnalysis({ moduleId: 'sm', permissions: studentPermissions() })
      engine.registerPrintAnalysis({ moduleId: 'sm', templates: studentPrintTemplates() })
      engine.registerWorkflowAnalysis({ moduleId: 'sm', steps: studentWorkflow() })
      engine.registerDependenciesAnalysis({ moduleId: 'sm', references: studentDependencies() })
      engine.registerTestsAnalysis({ moduleId: 'sm', coverage: studentTestCoverage(), hasUnitTests: true, hasIntegrationTests: true, hasEdgeCaseTests: true })

      const updated = engine.validateCompleteness('sm')!
      expect(updated.status).toBe('complete')
      expect(updated.completeness).toBeDefined()
      expect(updated.completeness!.overallScore).toBeGreaterThan(50)
      expect(updated.completeness!.missingDimensions).toHaveLength(0)
    })

    it('marks module as partial when some dimensions covered', () => {
      engine.registerDataAnalysis({ moduleId: 'sm', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 0, referenceFields: 0 })

      const updated = engine.validateCompleteness('sm')!
      expect(updated.status).toBe('partial')
      expect(updated.completeness!.missingDimensions.length).toBeGreaterThan(0)
    })
  })

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  describe('queryAnalyses', () => {
    it('returns all when no filter', () => {
      engine.initializeModule('sm1')
      engine.initializeModule('sm2')
      expect(engine.queryAnalyses({})).toHaveLength(2)
    })

    it('filters by moduleId', () => {
      engine.initializeModule('sm1')
      engine.initializeModule('sm2')
      const results = engine.queryAnalyses({ moduleId: 'sm1' })
      expect(results).toHaveLength(1)
      expect(results[0]!.moduleId).toBe('sm1')
    })

    it('filters by dimension', () => {
      engine.registerDataAnalysis({ moduleId: 'sm1', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 0, referenceFields: 0 })
      engine.initializeModule('sm2')
      const results = engine.queryAnalyses({ dimension: 'data' })
      expect(results).toHaveLength(1)
      expect(results[0]!.moduleId).toBe('sm1')
    })

    it('filters by hasFindings', () => {
      engine.registerDataAnalysis({ moduleId: 'sm1', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 2, referenceFields: 0 }) // computed findings
      engine.initializeModule('sm2')
      const results = engine.queryAnalyses({ hasFindings: true })
      expect(results).toHaveLength(1)
    })

    it('filters by hasFindings false', () => {
      engine.registerDataAnalysis({ moduleId: 'sm1', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 2, referenceFields: 0 }) // has findings
      engine.registerDataAnalysis({ moduleId: 'sm2', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 0, referenceFields: 0 }) // no auto-generated findings
      const results = engine.queryAnalyses({ hasFindings: false })
      expect(results).toHaveLength(1)
      expect(results[0]!.moduleId).toBe('sm2')
    })

    it('filters by maxSeverity', () => {
      // sm1 has critical finding (unauthenticated endpoint).
      engine.registerAPIAnalysis({
        moduleId: 'sm1',
        endpoints: [
          { method: 'POST', path: '/api/sm', description: '', parameters: [], responseFields: [], authRequired: false },
        ],
      })
      // sm2 has only info findings (computed fields).
      engine.registerDataAnalysis({
        moduleId: 'sm2',
        entityCount: 1,
        totalFields: 5,
        requiredFields: 3,
        optionalFields: 2,
        computedFields: 1,
        referenceFields: 0,
      })

      // maxSeverity 'info' excludes modules with any finding above info.
      const infoOnly = engine.queryAnalyses({ maxSeverity: 'info' })
      expect(infoOnly.some(a => a.moduleId === 'sm1')).toBe(false)
      expect(infoOnly.some(a => a.moduleId === 'sm2')).toBe(true)

      // maxSeverity 'critical' includes all modules.
      const all = engine.queryAnalyses({ maxSeverity: 'critical' })
      expect(all).toHaveLength(2)
    })

    it('filters by minScore', () => {
      // sm1 has data analysis (will have a completeness score).
      engine.registerDataAnalysis({ moduleId: 'sm1', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 0, referenceFields: 0 })
      // sm2 has nothing.
      engine.initializeModule('sm2')

      // minScore 1 filters out sm2 (score 0).
      const results = engine.queryAnalyses({ minScore: 1 })
      expect(results).toHaveLength(1)
      expect(results[0]!.moduleId).toBe('sm1')
    })
  })

  // -----------------------------------------------------------------------
  // Markdown
  // -----------------------------------------------------------------------

  describe('toMarkdown', () => {
    it('generates markdown for empty engine', () => {
      const md = engine.toMarkdown()
      expect(md).toContain('Deep Analysis Report')
      expect(md).toContain('Modules Analyzed:** 0')
    })

    it('generates markdown for analyzed module', () => {
      engine.registerDataAnalysis({ moduleId: 'sm', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 0, referenceFields: 0 })
      engine.registerFieldsAnalysis({ moduleId: 'sm', fields: studentFields() })

      const md = engine.toMarkdown('sm')
      expect(md).toContain('sm')
      expect(md).toContain('Data Model')
      expect(md).toContain('Field Definitions')
    })

    it('generates full report for multiple modules', () => {
      engine.registerDataAnalysis({ moduleId: 'sm1', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 0, referenceFields: 0 })
      engine.registerDataAnalysis({ moduleId: 'sm2', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 0, referenceFields: 0 })

      const md = engine.toMarkdown()
      expect(md).toContain('sm1')
      expect(md).toContain('sm2')
    })

    it('renders critical findings section in markdown', () => {
      // sm has unauthenticated endpoint → critical finding.
      engine.registerAPIAnalysis({
        moduleId: 'sm',
        endpoints: [
          { method: 'POST', path: '/api/sm', description: '', parameters: [], responseFields: [], authRequired: false },
        ],
      })
      const md = engine.toMarkdown('sm')
      expect(md).toContain('Critical Findings')
      expect(md).toContain('endpoint(s) without authentication')
    })

    it('renders error findings section in markdown', () => {
      // sm has failing tests → error finding.
      engine.registerTestsAnalysis({
        moduleId: 'sm',
        coverage: {
          totalTests: 10,
          passingTests: 7,
          coveragePercent: 90,
          untestedFields: [],
          untestedScenarios: [],
          failingTests: 3,
        },
        hasUnitTests: true,
        hasIntegrationTests: true,
        hasEdgeCaseTests: true,
      })
      const md = engine.toMarkdown('sm')
      expect(md).toContain('Errors')
      expect(md).toContain('failing test(s)')
    })

    it('renders warning findings with suggestion in markdown', () => {
      // sm has low coverage → warning finding with suggestion.
      engine.registerTestsAnalysis({
        moduleId: 'sm',
        coverage: {
          totalTests: 10,
          passingTests: 10,
          coveragePercent: 40,
          untestedFields: ['field2', 'field3', 'field4'],
          untestedScenarios: [],
          failingTests: 0,
        },
        hasUnitTests: true,
        hasIntegrationTests: false,
        hasEdgeCaseTests: false,
      })
      const md = engine.toMarkdown('sm')
      expect(md).toContain('Warnings')
      expect(md).toContain('💡 Add tests to reach at least 80% coverage.')
    })

    it('renders missing dimensions section', () => {
      // sm has data only — many dimensions missing.
      engine.registerDataAnalysis({ moduleId: 'sm', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 0, referenceFields: 0 })
      engine.validateCompleteness('sm')
      const md = engine.toMarkdown('sm')
      expect(md).toContain('Missing Dimensions')
    })
  })

  // -----------------------------------------------------------------------
  // Full Lifecycle — School ERP Scenario
  // -----------------------------------------------------------------------

  describe('full lifecycle — School ERP', () => {
    it('analyzes a complete student-master module', () => {
      // 1. Data dimension.
      engine.registerDataAnalysis({
        moduleId: 'student-master',
        entityCount: 1,
        totalFields: 6,
        requiredFields: 4,
        optionalFields: 2,
        computedFields: 0,
        referenceFields: 0,
      })

      // 2. Fields dimension.
      engine.registerFieldsAnalysis({
        moduleId: 'student-master',
        fields: studentFields(),
      })

      // 3. IDs dimension.
      engine.registerIdsAnalysis({
        moduleId: 'student-master',
        primaryKey: 'studentId',
        secondaryKeys: ['email'],
        foreignKeys: [],
        compositeKeys: [],
        autoIncrement: false,
      })

      // 4. Validation dimension.
      engine.registerValidationAnalysis({
        moduleId: 'student-master',
        rules: studentValidationRules(),
      })

      // 5. Database dimension.
      engine.registerDatabaseAnalysis({
        moduleId: 'student-master',
        tableName: 'students',
        hasAutoIncrement: false,
        hasSoftDelete: true,
        hasTimestamps: true,
        indexes: ['studentId', 'email'],
        uniqueConstraints: ['studentId', 'email'],
        foreignKeyConstraints: [],
      })

      // 6. API dimension.
      engine.registerAPIAnalysis({
        moduleId: 'student-master',
        endpoints: studentAPIEndpoints(),
      })

      // 7. UI dimension.
      engine.registerUIAnalysis({
        moduleId: 'student-master',
        components: studentUIComponents(),
      })

      // 8. Buttons dimension.
      engine.registerButtonsAnalysis({
        moduleId: 'student-master',
        buttons: studentButtons(),
      })

      // 9. Dropdowns dimension.
      engine.registerDropdownsAnalysis({
        moduleId: 'student-master',
        dropdowns: studentDropdowns(),
      })

      // 10. Settings dimension.
      engine.registerSettingsAnalysis({
        moduleId: 'student-master',
        settings: studentSettings(),
      })

      // 11. Permissions dimension.
      engine.registerPermissionsAnalysis({
        moduleId: 'student-master',
        permissions: studentPermissions(),
      })

      // 12. Print dimension.
      engine.registerPrintAnalysis({
        moduleId: 'student-master',
        templates: studentPrintTemplates(),
      })

      // 13. Workflow dimension.
      engine.registerWorkflowAnalysis({
        moduleId: 'student-master',
        steps: studentWorkflow(),
      })

      // 14. Dependencies dimension.
      engine.registerDependenciesAnalysis({
        moduleId: 'student-master',
        references: studentDependencies(),
      })

      // 15. Tests dimension.
      engine.registerTestsAnalysis({
        moduleId: 'student-master',
        coverage: studentTestCoverage(),
        hasUnitTests: true,
        hasIntegrationTests: false,
        hasEdgeCaseTests: false,
        missingScenarios: ['bulk import', 'international phone formats'],
      })

      // 16. Validate completeness.
      const updated = engine.validateCompleteness('student-master')!
      expect(updated.status).toBe('complete')
      expect(updated.completeness!.missingDimensions).toHaveLength(0)

      // Verify score.
      const score = engine.computeCompleteness('student-master')!
      expect(score.overallScore).toBeGreaterThan(50)
      expect(score.analyzedCount).toBe(15)

      // Verify findings accumulated.
      expect(updated.findings.length).toBeGreaterThan(0)

      // Verify cross-module dependencies.
      const map = engine.getMap()
      expect(map.crossModuleDependencies['student-master']).toContain('enrollment')
      expect(map.crossModuleDependencies['student-master']).toContain('fees')
      expect(map.crossModuleDependencies['student-master']).toContain('documents')

      // Verify markdown report.
      const md = engine.toMarkdown('student-master')
      expect(md).toContain('student-master')
      expect(md).toContain('Data Model')
      expect(md).toContain('Completeness Score')
    })
  })

  // -----------------------------------------------------------------------
  // Edge Cases
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    it('multiple modules analyzed independently', () => {
      engine.registerDataAnalysis({ moduleId: 'sm1', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 0, referenceFields: 0 })
      engine.registerDataAnalysis({ moduleId: 'sm2', entityCount: 2, totalFields: 10, requiredFields: 7, optionalFields: 3, computedFields: 1, referenceFields: 2 })

      expect(engine.getAnalyses()).toHaveLength(2)
      const score1 = engine.computeCompleteness('sm1')!
      const score2 = engine.computeCompleteness('sm2')!
      expect(score1.overallScore).toBe(score2.overallScore)
    })

    it('dimensions can be registered in any order', () => {
      // Register tests first, then data.
      engine.registerTestsAnalysis({
        moduleId: 'sm',
        coverage: { totalTests: 10, passingTests: 10, failingTests: 0, coveragePercent: 90, untestedFields: [], untestedScenarios: [] },
      })
      engine.registerDataAnalysis({
        moduleId: 'sm',
        entityCount: 1,
        totalFields: 5,
        requiredFields: 3,
        optionalFields: 2,
        computedFields: 0,
        referenceFields: 0,
      })

      const score = engine.computeCompleteness('sm')!
      expect(score.analyzedCount).toBe(2)
    })

    it('getMap returns independent snapshot', () => {
      engine.registerDataAnalysis({ moduleId: 'sm1', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 0, referenceFields: 0 })
      const map1 = engine.getMap()
      engine.registerDataAnalysis({ moduleId: 'sm2', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 0, referenceFields: 0 })
      const map2 = engine.getMap()
      expect(Object.keys(map1.analyses)).toHaveLength(1)
      expect(Object.keys(map2.analyses)).toHaveLength(2)
    })

    it('dimension order is consistent', () => {
      expect(DIMENSION_ORDER).toHaveLength(16)
      expect(DIMENSION_ORDER[0]).toBe('data')
      expect(DIMENSION_ORDER[15]).toBe('completeness')
    })

    it('all dimension labels are defined', () => {
      for (const dim of DIMENSION_ORDER) {
        expect(DIMENSION_LABELS[dim]).toBeDefined()
      }
    })

    it('dimension score clamps to 0 when many critical findings', () => {
      // Register 5 separate API analyses on the same module, each with 1 unauthenticated endpoint.
      // Each call adds one critical finding → 5 total critical findings × -40 = -200 → clamped to 0.
      for (let i = 0; i < 5; i++) {
        engine.registerAPIAnalysis({
          moduleId: 'sm',
          endpoints: [
            { method: 'POST', path: `/api/${i}`, description: '', parameters: [], responseFields: [], authRequired: false },
          ],
        })
      }
      const score = engine.computeCompleteness('sm')!
      expect(score.dimensionScores.api).toBe(0)
    })

    it('criticalDimensions populated when critical findings exist', () => {
      engine.registerAPIAnalysis({
        moduleId: 'sm',
        endpoints: [
          { method: 'POST', path: '/api/sm', description: '', parameters: [], responseFields: [], authRequired: false },
        ],
      })
      const score = engine.computeCompleteness('sm')!
      expect(score.criticalDimensions).toContain('api')
    })

    it('criticalDimensions empty when no critical findings', () => {
      // sm has data only — no critical findings.
      engine.registerDataAnalysis({ moduleId: 'sm', entityCount: 1, totalFields: 5, requiredFields: 3, optionalFields: 2, computedFields: 0, referenceFields: 0 })
      const score = engine.computeCompleteness('sm')!
      expect(score.criticalDimensions).toHaveLength(0)
    })
  })
})
