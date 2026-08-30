import { describe, expect, it, beforeEach } from 'vitest'
import { ModuleIdentificationEngine } from '../src/module-identification/engine.ts'
import { resetEngine } from '../src/module-identification/tools.ts'
import type { FieldDefinition } from '../src/module-identification/types.ts'

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

function studentMasterFields(): FieldDefinition[] {
  return [
    { name: 'studentId', displayName: 'Student ID', type: 'string', required: true, unique: true, isPrimaryKey: true, description: 'Unique student identifier', keywords: ['id', 'enrollment number'] },
    { name: 'firstName', displayName: 'First Name', type: 'string', required: true, unique: false, isPrimaryKey: false, description: 'Student first name', keywords: ['name'] },
    { name: 'lastName', displayName: 'Last Name', type: 'string', required: true, unique: false, isPrimaryKey: false, description: 'Student last name', keywords: ['surname'] },
    { name: 'dateOfBirth', displayName: 'Date of Birth', type: 'date', required: true, unique: false, isPrimaryKey: false, description: 'Student date of birth', keywords: ['dob', 'birthday'] },
    { name: 'email', displayName: 'Email', type: 'email', required: false, unique: true, isPrimaryKey: false, description: 'Student email address', keywords: ['email', 'mail'] },
    { name: 'phone', displayName: 'Phone', type: 'phone', required: false, unique: false, isPrimaryKey: false, description: 'Student phone number', keywords: ['phone', 'mobile'] },
  ]
}

function enrollmentFields(): FieldDefinition[] {
  return [
    { name: 'enrollmentId', displayName: 'Enrollment ID', type: 'string', required: true, unique: true, isPrimaryKey: true, description: 'Unique enrollment identifier', keywords: ['id'] },
    { name: 'studentId', displayName: 'Student ID', type: 'reference', required: true, unique: false, isPrimaryKey: false, references: 'student-master', description: 'Reference to student', keywords: ['student'] },
    { name: 'classId', displayName: 'Class ID', type: 'string', required: true, unique: false, isPrimaryKey: false, description: 'Class identifier', keywords: ['class'] },
    { name: 'enrollmentDate', displayName: 'Enrollment Date', type: 'datetime', required: true, unique: false, isPrimaryKey: false, description: 'Date of enrollment', keywords: ['date'] },
    { name: 'status', displayName: 'Status', type: 'enum', required: true, unique: false, isPrimaryKey: false, enumValues: ['active', 'inactive', 'transferred'], description: 'Enrollment status', keywords: ['status'] },
  ]
}

function feeFields(): FieldDefinition[] {
  return [
    { name: 'feeId', displayName: 'Fee ID', type: 'string', required: true, unique: true, isPrimaryKey: true, description: 'Unique fee identifier', keywords: ['id'] },
    { name: 'studentId', displayName: 'Student ID', type: 'reference', required: true, unique: false, isPrimaryKey: false, references: 'student-master', description: 'Reference to student', keywords: ['student'] },
    { name: 'amount', displayName: 'Amount', type: 'number', required: true, unique: false, isPrimaryKey: false, description: 'Fee amount', keywords: ['amount', 'price'] },
    { name: 'paymentDate', displayName: 'Payment Date', type: 'date', required: false, unique: false, isPrimaryKey: false, description: 'Date of payment', keywords: ['date'] },
  ]
}

// ---------------------------------------------------------------------------
// ModuleIdentificationEngine Tests
// ---------------------------------------------------------------------------

describe('ModuleIdentificationEngine', () => {
  let engine: ModuleIdentificationEngine

  beforeEach(() => {
    resetEngine()
    engine = new ModuleIdentificationEngine()
  })

  // -----------------------------------------------------------------------
  // Module Registration
  // -----------------------------------------------------------------------

  describe('registerModule', () => {
    it('registers a foundation module', () => {
      const m = engine.registerModule({
        id: 'student-master',
        name: 'Student Master',
        description: 'Student registration and profile management',
      })
      expect(m.id).toBe('student-master')
      expect(m.type).toBe('foundation')
      expect(m.dependsOn).toHaveLength(0)
      expect(m.completionStatus).toBe('not-started')
    })

    it('registers a dependent module', () => {
      engine.registerModule({ id: 'student-master', name: 'Student Master', description: 'Student management' })
      const m = engine.registerModule({
        id: 'enrollment',
        name: 'Enrollment',
        description: 'Student enrollment',
        dependsOn: ['student-master'],
      })
      expect(m.type).toBe('dependent')
      expect(m.dependsOn).toEqual(['student-master'])
    })

    it('updates reverse dependencies', () => {
      engine.registerModule({ id: 'student-master', name: 'Student Master', description: 'Student management' })
      engine.registerModule({ id: 'enrollment', name: 'Enrollment', description: 'Enrollment', dependsOn: ['student-master'] })
      engine.registerModule({ id: 'fees', name: 'Fees', description: 'Fee management', dependsOn: ['student-master'] })

      const sm = engine.getModule('student-master')!
      expect(sm.dependedBy).toContain('enrollment')
      expect(sm.dependedBy).toContain('fees')
    })

    it('throws on duplicate ID', () => {
      engine.registerModule({ id: 'sm', name: 'SM', description: 'desc' })
      expect(() => engine.registerModule({ id: 'sm', name: 'SM2', description: 'desc2' })).toThrow('already registered')
    })

    it('throws on non-existent dependency', () => {
      expect(() => engine.registerModule({
        id: 'enrollment',
        name: 'Enrollment',
        description: 'desc',
        dependsOn: ['non-existent'],
      })).toThrow('not found')
    })

    it('getFoundationModules returns foundation modules', () => {
      engine.registerModule({ id: 'sm', name: 'SM', description: 'Student Master' })
      engine.registerModule({ id: 'en', name: 'EN', description: 'Enrollment', dependsOn: ['sm'] })

      const foundations = engine.getFoundationModules()
      expect(foundations).toHaveLength(1)
      expect(foundations[0]!.id).toBe('sm')
    })

    it('getModules returns all modules', () => {
      engine.registerModule({ id: 'sm', name: 'SM', description: 'Student Master' })
      engine.registerModule({ id: 'en', name: 'EN', description: 'Enrollment', dependsOn: ['sm'] })

      expect(engine.getModules()).toHaveLength(2)
    })
  })

  // -----------------------------------------------------------------------
  // Module Status
  // -----------------------------------------------------------------------

  describe('updateModuleStatus', () => {
    it('updates completion status', () => {
      engine.registerModule({ id: 'sm', name: 'SM', description: 'Student Master' })
      const updated = engine.updateModuleStatus('sm', 'in-progress')
      expect(updated.completionStatus).toBe('in-progress')
    })

    it('throws on non-existent module', () => {
      expect(() => engine.updateModuleStatus('non-existent', 'completed')).toThrow('not found')
    })
  })

  // -----------------------------------------------------------------------
  // Master Data Registration
  // -----------------------------------------------------------------------

  describe('registerMasterData', () => {
    beforeEach(() => {
      engine.registerModule({ id: 'student-master', name: 'Student Master', description: 'Student management' })
    })

    it('registers a master data entity', () => {
      const entity = engine.registerMasterData({
        id: 'student-master',
        name: 'Student Master',
        description: 'Student data entity',
        moduleId: 'student-master',
        fields: studentMasterFields(),
        keywords: ['student', 'pupil'],
      })
      expect(entity.id).toBe('student-master')
      expect(entity.fields).toHaveLength(6)
    })

    it('updates module masterDataEntities', () => {
      engine.registerMasterData({
        id: 'student-master',
        name: 'Student Master',
        description: 'Student data',
        moduleId: 'student-master',
        fields: studentMasterFields(),
      })
      const m = engine.getModule('student-master')!
      expect(m.masterDataEntities).toContain('student-master')
    })

    it('registers field names in naming registry', () => {
      engine.registerMasterData({
        id: 'student-master',
        name: 'Student Master',
        description: 'Student data',
        moduleId: 'student-master',
        fields: studentMasterFields(),
      })

      expect(engine.resolveCanonical('studentId')).toBe('studentId')
      expect(engine.resolveCanonical('Student ID')).toBe('studentId')
      expect(engine.resolveCanonical('firstName')).toBe('firstName')
    })

    it('registers entity name in naming registry', () => {
      engine.registerMasterData({
        id: 'student-master',
        name: 'Student Master',
        description: 'Student data',
        moduleId: 'student-master',
        fields: studentMasterFields(),
        keywords: ['student', 'pupil'],
      })

      expect(engine.resolveCanonical('Student Master')).toBe('Student Master')
      // 'student' is a keyword of the Student Master entity — resolves here.
      expect(engine.resolveCanonical('student')).toBe('Student Master')
      expect(engine.resolveCanonical('pupil')).toBe('Student Master')
    })

    it('throws on duplicate entity ID', () => {
      engine.registerMasterData({
        id: 'sm', name: 'SM', description: 'desc', moduleId: 'student-master', fields: studentMasterFields(),
      })
      expect(() => engine.registerMasterData({
        id: 'sm', name: 'SM2', description: 'desc2', moduleId: 'student-master', fields: studentMasterFields(),
      })).toThrow('already registered')
    })

    it('throws on non-existent module', () => {
      expect(() => engine.registerMasterData({
        id: 'sm', name: 'SM', description: 'desc', moduleId: 'non-existent', fields: studentMasterFields(),
      })).toThrow('not found')
    })

    it('getModuleMasterData returns entities for a module', () => {
      engine.registerMasterData({
        id: 'student-master', name: 'Student Master', description: 'Student data',
        moduleId: 'student-master', fields: studentMasterFields(),
      })
      const entities = engine.getModuleMasterData('student-master')
      expect(entities).toHaveLength(1)
    })

    it('findField returns field and owning entity', () => {
      engine.registerMasterData({
        id: 'student-master', name: 'Student Master', description: 'Student data',
        moduleId: 'student-master', fields: studentMasterFields(),
      })
      const result = engine.findField('firstName')
      expect(result).toBeDefined()
      expect(result!.entity.id).toBe('student-master')
      expect(result!.field.displayName).toBe('First Name')
    })

    it('findField returns undefined for unknown field', () => {
      expect(engine.findField('nonExistent')).toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // Naming Registry
  // -----------------------------------------------------------------------

  describe('naming registry', () => {
    it('resolveCanonical finds canonical name', () => {
      engine.registerNaming({
        canonical: 'studentId',
        variants: ['studentId', 'Student ID', 'student_id', 'REG ID'],
        category: 'field',
        description: 'Student identifier',
      })

      expect(engine.resolveCanonical('studentId')).toBe('studentId')
      expect(engine.resolveCanonical('Student ID')).toBe('studentId')
      expect(engine.resolveCanonical('student_id')).toBe('studentId')
      expect(engine.resolveCanonical('REG ID')).toBe('studentId')
    })

    it('resolveCanonical is case-insensitive', () => {
      engine.registerNaming({
        canonical: 'Student Master',
        variants: ['Student Master', 'student master', 'STUDENT MASTER'],
        category: 'entity',
        description: 'Student entity',
      })

      expect(engine.resolveCanonical('student master')).toBe('Student Master')
      expect(engine.resolveCanonical('STUDENT MASTER')).toBe('Student Master')
    })

    it('resolveCanonical returns undefined for unknown', () => {
      expect(engine.resolveCanonical('unknown')).toBeUndefined()
    })

    it('isKnownVariant checks existence', () => {
      engine.registerNaming({
        canonical: 'feeId',
        variants: ['feeId', 'Fee ID'],
        category: 'field',
        description: 'Fee identifier',
      })

      expect(engine.isKnownVariant('feeId')).toBe(true)
      expect(engine.isKnownVariant('Fee ID')).toBe(true)
      expect(engine.isKnownVariant('unknown')).toBe(false)
    })

    it('merges variants on duplicate canonical', () => {
      engine.registerNaming({
        canonical: 'x',
        variants: ['x', 'X'],
        category: 'field',
        description: 'test',
      })
      engine.registerNaming({
        canonical: 'x',
        variants: ['x', 'X', 'extra'],
        category: 'field',
        description: 'test',
      })

      const entry = engine.getMap().namingRegistry.find(e => e.canonical === 'x')!
      expect(entry.variants).toContain('extra')
    })
  })

  // -----------------------------------------------------------------------
  // Foundation Gate
  // -----------------------------------------------------------------------

  describe('foundation gate', () => {
    beforeEach(() => {
      engine.registerModule({ id: 'student-master', name: 'Student Master', description: 'Student management' })
      engine.registerModule({ id: 'enrollment', name: 'Enrollment', description: 'Enrollment', dependsOn: ['student-master'] })
      engine.registerModule({ id: 'fees', name: 'Fees', description: 'Fee management', dependsOn: ['student-master', 'enrollment'] })
    })

    it('fails when foundation modules are incomplete', () => {
      const gate = engine.checkFoundationGate()
      expect(gate.passed).toBe(false)
      expect(gate.blockedModules).toContain('enrollment')
      expect(gate.blockedModules).toContain('fees')
    })

    it('passes when all foundation modules are complete', () => {
      engine.updateModuleStatus('student-master', 'completed')
      engine.updateModuleStatus('enrollment', 'completed')

      const gate = engine.checkFoundationGate()
      expect(gate.passed).toBe(true)
      expect(gate.blockedModules).toHaveLength(0)
    })

    it('reports foundation module statuses', () => {
      engine.updateModuleStatus('student-master', 'in-progress')

      const gate = engine.checkFoundationGate()
      expect(gate.foundationModules).toHaveLength(1)
      expect(gate.foundationModules[0]!.status).toBe('in-progress')
    })

    it('isModuleReady returns true when deps are complete', () => {
      engine.updateModuleStatus('student-master', 'completed')
      engine.updateModuleStatus('enrollment', 'completed')

      expect(engine.isModuleReady('fees')).toBe(true)
    })

    it('isModuleReady returns false when deps are incomplete', () => {
      expect(engine.isModuleReady('fees')).toBe(false)
    })

    it('isModuleReady returns false for non-existent module', () => {
      expect(engine.isModuleReady('non-existent')).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // Consistency Validation
  // -----------------------------------------------------------------------

  describe('validateConsistency', () => {
    beforeEach(() => {
      engine.registerModule({ id: 'student-master', name: 'Student Master', description: 'Student management' })
      engine.registerModule({ id: 'enrollment', name: 'Enrollment', description: 'Enrollment', dependsOn: ['student-master'] })
    })

    it('passes for consistent data', () => {
      engine.registerMasterData({
        id: 'student-master', name: 'Student Master', description: 'Student data',
        moduleId: 'student-master', fields: studentMasterFields(),
      })

      const result = engine.validateConsistency()
      expect(result.consistent).toBe(true)
      expect(result.fieldsChecked).toBe(6)
      expect(result.entitiesChecked).toBe(1)
    })

    it('detects non-camelCase field names', () => {
      engine.registerMasterData({
        id: 'test', name: 'Test', description: 'Test',
        moduleId: 'student-master',
        fields: [
          { name: 'First_Name', displayName: 'First Name', type: 'string', required: true, unique: false, isPrimaryKey: false, description: 'test', keywords: [] },
        ],
      })

      const result = engine.validateConsistency()
      expect(result.consistent).toBe(false)
      expect(result.inconsistencies.some(i => i.severity === 'error')).toBe(true)
    })

    it('detects non-Title Case display names', () => {
      engine.registerMasterData({
        id: 'test', name: 'Test', description: 'Test',
        moduleId: 'student-master',
        fields: [
          { name: 'firstName', displayName: 'first name', type: 'string', required: true, unique: false, isPrimaryKey: false, description: 'test', keywords: [] },
        ],
      })

      const result = engine.validateConsistency()
      // warning, not error — consistent is still true
      expect(result.consistent).toBe(true)
      expect(result.inconsistencies.some(i => i.severity === 'warning')).toBe(true)
    })

    it('detects unresolved references', () => {
      engine.registerMasterData({
        id: 'test', name: 'Test', description: 'Test',
        moduleId: 'student-master',
        fields: [
          { name: 'studentId', displayName: 'Student ID', type: 'reference', required: true, unique: false, isPrimaryKey: false, references: 'non-existent', description: 'test', keywords: [] },
        ],
      })

      const result = engine.validateConsistency()
      expect(result.consistent).toBe(false)
      expect(result.inconsistencies.some(i => i.severity === 'error' && i.variant === 'non-existent')).toBe(true)
    })

    it('allows same field name in different entities with reference type', () => {
      engine.registerMasterData({
        id: 'student-master', name: 'Student Master', description: 'Student data',
        moduleId: 'student-master', fields: studentMasterFields(),
      })
      engine.registerMasterData({
        id: 'enrollment', name: 'Enrollment', description: 'Enrollment data',
        moduleId: 'enrollment', fields: enrollmentFields(),
      })

      const result = engine.validateConsistency()
      expect(result.consistent).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // toMarkdown
  // -----------------------------------------------------------------------

  describe('toMarkdown', () => {
    it('generates markdown for empty map', () => {
      const md = engine.toMarkdown()
      expect(md).toContain('Module Identification Map')
      expect(md).toContain('Foundation Modules')
    })

    it('generates markdown with modules and data', () => {
      engine.registerModule({ id: 'student-master', name: 'Student Master', description: 'Student management' })
      engine.registerModule({ id: 'enrollment', name: 'Enrollment', description: 'Enrollment', dependsOn: ['student-master'] })
      engine.registerMasterData({
        id: 'student-master', name: 'Student Master', description: 'Student data',
        moduleId: 'student-master', fields: studentMasterFields(),
      })

      const md = engine.toMarkdown()
      expect(md).toContain('Student Master')
      expect(md).toContain('Enrollment')
      expect(md).toContain('studentId')
      expect(md).toContain('Foundation Gate')
    })
  })

  // -----------------------------------------------------------------------
  // Full lifecycle — School ERP scenario
  // -----------------------------------------------------------------------

  describe('full lifecycle — School ERP', () => {
    it('builds a complete module identification system', () => {
      // 1. Register foundation modules.
      engine.registerModule({ id: 'student-master', name: 'Student Master', description: 'Student registration and profiles' })
      engine.registerModule({ id: 'enrollment', name: 'Enrollment', description: 'Student enrollment', dependsOn: ['student-master'] })

      // 2. Register dependent modules.
      engine.registerModule({ id: 'fees', name: 'Fees', description: 'Fee management', dependsOn: ['student-master', 'enrollment'] })
      engine.registerModule({ id: 'attendance', name: 'Attendance', description: 'Attendance tracking', dependsOn: ['student-master', 'enrollment'] })
      engine.registerModule({ id: 'exam', name: 'Exam', description: 'Exam management', dependsOn: ['student-master', 'enrollment'] })
      engine.registerModule({ id: 'documents', name: 'Documents', description: 'Document generation', dependsOn: ['student-master'] })

      // 3. Register master data.
      engine.registerMasterData({
        id: 'student-master', name: 'Student Master', description: 'Student data',
        moduleId: 'student-master', fields: studentMasterFields(), keywords: ['student', 'pupil'],
      })
      engine.registerMasterData({
        id: 'enrollment', name: 'Enrollment', description: 'Enrollment data',
        moduleId: 'enrollment', fields: enrollmentFields(), keywords: ['enrollment', 'admission'],
      })
      engine.registerMasterData({
        id: 'fees', name: 'Fee', description: 'Fee data',
        moduleId: 'fees', fields: feeFields(), keywords: ['fee', 'payment'],
      })

      // 4. Verify foundation gate fails initially.
      let gate = engine.checkFoundationGate()
      expect(gate.passed).toBe(false)
      expect(gate.blockedModules).toContain('fees')
      expect(gate.blockedModules).toContain('attendance')

      // 5. Verify naming consistency.
      const validation = engine.validateConsistency()
      expect(validation.consistent).toBe(true)
      expect(validation.fieldsChecked).toBe(15) // 6 + 5 + 4
      expect(validation.entitiesChecked).toBe(3)

      // 6. Verify naming registry works.
      expect(engine.resolveCanonical('studentId')).toBe('studentId')
      expect(engine.resolveCanonical('Student ID')).toBe('studentId')
      // 'student' is also a keyword on enrollment's studentId field, so it resolves there first.
      expect(engine.resolveCanonical('student')).toBe('studentId')
      expect(engine.resolveCanonical('fee')).toBe('Fee')

      // 7. Complete foundation modules.
      engine.updateModuleStatus('student-master', 'completed')
      engine.updateModuleStatus('enrollment', 'completed')

      // 8. Verify dependent modules are now ready.
      expect(engine.isModuleReady('fees')).toBe(true) // sm + en are completed, so fees is unblocked.
      gate = engine.checkFoundationGate()
      expect(gate.passed).toBe(true)
      expect(gate.blockedModules).toHaveLength(0)

      // 9. Verify module map.
      const map = engine.getMap()
      expect(Object.keys(map.modules)).toHaveLength(6)
      expect(Object.keys(map.masterData)).toHaveLength(3)
      expect(map.foundationModuleIds).toContain('student-master')
      // enrollment has dependsOn ['student-master'], so it is NOT a foundation module.

      // 10. Verify markdown.
      const md = engine.toMarkdown()
      expect(md).toContain('Student Master')
      expect(md).toContain('Enrollment')
      expect(md).toContain('Fees')
    })
  })

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles empty engine gracefully', () => {
      expect(engine.getModules()).toHaveLength(0)
      expect(engine.getFoundationModules()).toHaveLength(0)
      expect(engine.getMasterDataEntities()).toHaveLength(0)
      expect(engine.resolveCanonical('anything')).toBeUndefined()
      expect(engine.isKnownVariant('anything')).toBe(false)
    })

    it('getMap returns independent snapshot', () => {
      engine.registerModule({ id: 'sm', name: 'SM', description: 'desc' })
      const map1 = engine.getMap()
      engine.registerModule({ id: 'en', name: 'EN', description: 'desc' })
      const map2 = engine.getMap()
      expect(Object.keys(map1.modules)).toHaveLength(1)
      expect(Object.keys(map2.modules)).toHaveLength(2)
    })

    it('foundation gate with no modules passes', () => {
      const gate = engine.checkFoundationGate()
      expect(gate.passed).toBe(true)
      expect(gate.foundationModules).toHaveLength(0)
      expect(gate.blockedModules).toHaveLength(0)
    })

    it('multiple foundation modules all must complete', () => {
      engine.registerModule({ id: 'sm', name: 'SM', description: 'Student Master' })
      engine.registerModule({ id: 'en', name: 'EN', description: 'Enrollment' })

      engine.updateModuleStatus('sm', 'completed')
      let gate = engine.checkFoundationGate()
      expect(gate.passed).toBe(false)

      engine.updateModuleStatus('en', 'completed')
      gate = engine.checkFoundationGate()
      expect(gate.passed).toBe(true)
    })
  })
})
