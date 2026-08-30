/**
 * Tests for File / Folder Blueprint Engine — PHASE 08.
 *
 * Covers: creation, file/folder management, validation,
 * coding gate, query, summary, markdown, and the School ERP lifecycle.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FileBlueprintEngine } from '../src/file-blueprint/engine.ts'
import {
  UNIVERSAL_FOLDER_RULES,
  FILE_ENTRY_TYPES,
  FILE_ENTRY_TYPE_LABELS,
  FILE_ENTRY_TYPE_ICONS,
  BLUEPRINT_APPROVAL_LABELS,
  BLUEPRINT_APPROVAL_ICONS,
} from '../src/file-blueprint/types.ts'
import type { FileEntry, FolderEntry } from '../src/file-blueprint/types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sampleFiles(): FileEntry[] {
  return [
    { path: 'src/engine.ts', type: 'source', purpose: 'Main engine logic', requiredExports: ['StudentEngine'] },
    { path: 'src/types.ts', type: 'source', purpose: 'Type definitions' },
    { path: 'src/index.ts', type: 'barrel', purpose: 'Barrel exports' },
    { path: 'tests/engine.spec.ts', type: 'test', purpose: 'Unit tests' },
    { path: 'package.json', type: 'config', purpose: 'Package config' },
    { path: 'README.md', type: 'doc', purpose: 'Documentation' },
  ]
}

function sampleFolders(): FolderEntry[] {
  return [
    { path: 'src', purpose: 'Source code root' },
    { path: 'src/domain', purpose: 'Domain logic' },
    { path: 'tests', purpose: 'Test files' },
  ]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FileBlueprintEngine', () => {
  let engine: FileBlueprintEngine

  beforeEach(() => {
    engine = new FileBlueprintEngine()
  })

  // -----------------------------------------------------------------------
  // Constants
  // -----------------------------------------------------------------------

  describe('constants', () => {
    it('UNIVERSAL_FOLDER_RULES has rules', () => {
      expect(UNIVERSAL_FOLDER_RULES.length).toBeGreaterThan(0)
    })

    it('FILE_ENTRY_TYPES has all types', () => {
      expect(FILE_ENTRY_TYPES).toContain('source')
      expect(FILE_ENTRY_TYPES).toContain('test')
      expect(FILE_ENTRY_TYPES).toContain('config')
      expect(FILE_ENTRY_TYPES).toContain('barrel')
    })

    it('FILE_ENTRY_TYPE_LABELS has entries for all types', () => {
      for (const type of FILE_ENTRY_TYPES) {
        expect(FILE_ENTRY_TYPE_LABELS[type]).toBeTruthy()
      }
    })

    it('FILE_ENTRY_TYPE_ICONS has entries for all types', () => {
      for (const type of FILE_ENTRY_TYPES) {
        expect(FILE_ENTRY_TYPE_ICONS[type]).toBeTruthy()
      }
    })

    it('BLUEPRINT_APPROVAL_LABELS has all statuses', () => {
      expect(BLUEPRINT_APPROVAL_LABELS.draft).toBe('Draft')
      expect(BLUEPRINT_APPROVAL_LABELS.approved).toBe('Approved')
      expect(BLUEPRINT_APPROVAL_LABELS.rejected).toBe('Rejected')
    })

    it('BLUEPRINT_APPROVAL_ICONS has all statuses', () => {
      expect(BLUEPRINT_APPROVAL_ICONS.draft).toBeTruthy()
      expect(BLUEPRINT_APPROVAL_ICONS.approved).toBeTruthy()
    })
  })

  // -----------------------------------------------------------------------
  // createBlueprint
  // -----------------------------------------------------------------------

  describe('createBlueprint', () => {
    it('creates a blueprint with defaults', () => {
      const bp = engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      expect(bp.moduleId).toBe('mod1')
      expect(bp.moduleName).toBe('Module 1')
      expect(bp.status).toBe('draft')
      expect(bp.files).toHaveLength(0)
      expect(bp.folders).toHaveLength(0)
    })

    it('creates blueprint with initial files', () => {
      const bp = engine.createBlueprint({
        moduleId: 'mod1',
        moduleName: 'Module 1',
        files: sampleFiles(),
      })
      expect(bp.files).toHaveLength(6)
    })

    it('creates blueprint with initial folders', () => {
      const bp = engine.createBlueprint({
        moduleId: 'mod1',
        moduleName: 'Module 1',
        folders: sampleFolders(),
      })
      expect(bp.folders).toHaveLength(3)
    })

    it('throws for duplicate module ID', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      expect(() => engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1 dup' })).toThrow('already exists')
    })

    it('sets createdAt and updatedAt', () => {
      const bp = engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      expect(bp.createdAt).toBeTruthy()
      expect(bp.updatedAt).toBeTruthy()
    })
  })

  // -----------------------------------------------------------------------
  // getBlueprint / getBlueprints
  // -----------------------------------------------------------------------

  describe('getBlueprint', () => {
    it('returns undefined for non-existent', () => {
      expect(engine.getBlueprint('nonexistent')).toBeUndefined()
    })

    it('returns the blueprint', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      expect(engine.getBlueprint('mod1')?.moduleId).toBe('mod1')
    })
  })

  describe('getBlueprints', () => {
    it('returns empty for no blueprints', () => {
      expect(engine.getBlueprints()).toHaveLength(0)
    })

    it('returns all blueprints', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      engine.createBlueprint({ moduleId: 'mod2', moduleName: 'Module 2' })
      expect(engine.getBlueprints()).toHaveLength(2)
    })
  })

  // -----------------------------------------------------------------------
  // addFiles
  // -----------------------------------------------------------------------

  describe('addFiles', () => {
    it('adds files to blueprint', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      const updated = engine.addFiles('mod1', sampleFiles())
      expect(updated.files).toHaveLength(6)
    })

    it('throws for non-existent module', () => {
      expect(() => engine.addFiles('nonexistent', sampleFiles())).toThrow('No file blueprint found')
    })

    it('throws for duplicate file path', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      engine.addFiles('mod1', [{ path: 'src/a.ts', type: 'source', purpose: 'A' }])
      expect(() => engine.addFiles('mod1', [{ path: 'src/a.ts', type: 'source', purpose: 'A dup' }])).toThrow('already exists')
    })

    it('updates the blueprint in-place', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      const before = engine.getBlueprint('mod1')!.updatedAt
      engine.addFiles('mod1', sampleFiles())
      const after = engine.getBlueprint('mod1')!.updatedAt
      expect(after >= before).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // addFolders
  // -----------------------------------------------------------------------

  describe('addFolders', () => {
    it('adds folders to blueprint', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      const updated = engine.addFolders('mod1', sampleFolders())
      expect(updated.folders).toHaveLength(3)
    })

    it('throws for non-existent module', () => {
      expect(() => engine.addFolders('nonexistent', sampleFolders())).toThrow('No file blueprint found')
    })

    it('throws for duplicate folder path', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      engine.addFolders('mod1', [{ path: 'src', purpose: 'Source root' }])
      expect(() => engine.addFolders('mod1', [{ path: 'src', purpose: 'Source root dup' }])).toThrow('already exists')
    })
  })

  // -----------------------------------------------------------------------
  // removeFile
  // -----------------------------------------------------------------------

  describe('removeFile', () => {
    it('removes a file', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1', files: sampleFiles() })
      const updated = engine.removeFile('mod1', 'src/types.ts')
      expect(updated.files.find(f => f.path === 'src/types.ts')).toBeUndefined()
      expect(updated.files).toHaveLength(5)
    })

    it('throws for non-existent module', () => {
      expect(() => engine.removeFile('nonexistent', 'src/a.ts')).toThrow('No file blueprint found')
    })

    it('silently ignores non-existent file', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1', files: sampleFiles() })
      const updated = engine.removeFile('mod1', 'nonexistent.ts')
      expect(updated.files).toHaveLength(6)
    })
  })

  // -----------------------------------------------------------------------
  // updateStatus
  // -----------------------------------------------------------------------

  describe('updateStatus', () => {
    it('updates status', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      const updated = engine.updateStatus('mod1', 'approved')
      expect(updated.status).toBe('approved')
    })

    it('updates status with notes', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      const updated = engine.updateStatus('mod1', 'rejected', 'Missing barrel export')
      expect(updated.status).toBe('rejected')
      expect(updated.reviewNotes).toBe('Missing barrel export')
    })

    it('throws for non-existent module', () => {
      expect(() => engine.updateStatus('nonexistent', 'approved')).toThrow('No file blueprint found')
    })
  })

  // -----------------------------------------------------------------------
  // queryBlueprints
  // -----------------------------------------------------------------------

  describe('queryBlueprints', () => {
    beforeEach(() => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1', files: sampleFiles() })
      engine.createBlueprint({ moduleId: 'mod2', moduleName: 'Module 2' })
      engine.updateStatus('mod1', 'approved')
    })

    it('returns all when no filter', () => {
      expect(engine.queryBlueprints({})).toHaveLength(2)
    })

    it('filters by moduleId', () => {
      const results = engine.queryBlueprints({ moduleId: 'mod1' })
      expect(results).toHaveLength(1)
      expect(results[0]!.moduleId).toBe('mod1')
    })

    it('filters by status', () => {
      const results = engine.queryBlueprints({ status: 'approved' })
      expect(results).toHaveLength(1)
      expect(results[0]!.moduleId).toBe('mod1')
    })

    it('filters by hasFileType', () => {
      const results = engine.queryBlueprints({ hasFileType: 'test' })
      expect(results).toHaveLength(1)
      expect(results[0]!.moduleId).toBe('mod1')
    })
  })

  // -----------------------------------------------------------------------
  // validate
  // -----------------------------------------------------------------------

  describe('validate', () => {
    it('returns error for non-existent module', () => {
      const report = engine.validate('nonexistent')
      expect(report.valid).toBe(false)
      expect(report.violations.length).toBeGreaterThan(0)
    })

    it('validates a valid blueprint', () => {
      engine.createBlueprint({
        moduleId: 'mod1',
        moduleName: 'Module 1',
        files: sampleFiles(),
        folders: sampleFolders(),
      })
      const report = engine.validate('mod1')
      expect(report.valid).toBe(true)
      expect(report.fileCount).toBe(6)
      expect(report.folderCount).toBe(3)
    })

    it('detects missing src/ folder rule', () => {
      // Blueprint with no files → violates required 'src/**' rule.
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      const report = engine.validate('mod1')
      expect(report.valid).toBe(false)
      expect(report.ruleViolations.some(v => v.message.includes('source code must reside under src/'))).toBe(true)
    })

    it('detects forbidden test files in src/', () => {
      engine.createBlueprint({
        moduleId: 'mod1',
        moduleName: 'Module 1',
        files: [
          { path: 'src/engine.ts', type: 'source', purpose: 'Engine' },
          { path: 'src/index.ts', type: 'barrel', purpose: 'Barrel' },
          { path: 'tests/engine.spec.ts', type: 'test', purpose: 'Tests' },
          { path: 'src/engine.test.ts', type: 'test', purpose: 'Test in src (forbidden)' },
        ],
      })
      const report = engine.validate('mod1')
      expect(report.ruleViolations.some(v => v.path === 'src/engine.test.ts')).toBe(true)
    })

    it('detects duplicate file paths', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      // We can't add duplicates via addFiles since it throws, but the validation should still work.
      // Let's create a blueprint with initial duplicates (bypassing addFiles).
      engine.createBlueprint({
        moduleId: 'mod2',
        moduleName: 'Module 2',
        files: [
          { path: 'src/a.ts', type: 'source', purpose: 'A' },
          { path: 'src/a.ts', type: 'source', purpose: 'A dup' },
        ],
      })
      const report = engine.validate('mod2')
      expect(report.internalIssues.some(v => v.rule === 'no-duplicate-paths')).toBe(true)
    })

    it('detects missing folder entries', () => {
      engine.createBlueprint({
        moduleId: 'mod1',
        moduleName: 'Module 1',
        files: [
          { path: 'src/engine.ts', type: 'source', purpose: 'Engine' },
          { path: 'src/index.ts', type: 'barrel', purpose: 'Barrel' },
          { path: 'tests/engine.spec.ts', type: 'test', purpose: 'Tests' },
        ],
        // No folders defined.
      })
      const report = engine.validate('mod1')
      // Should warn about missing folder entries for 'src' and 'tests'.
      expect(report.internalIssues.some(v => v.rule === 'folder-entry-exists')).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // checkCodingGate
  // -----------------------------------------------------------------------

  describe('checkCodingGate', () => {
    it('blocks coding when no blueprint exists', () => {
      const gate = engine.checkCodingGate('mod1')
      expect(gate.allowed).toBe(false)
      expect(gate.summary).toContain('NO FILE BLUEPRINT')
    })

    it('blocks coding when blueprint is draft', () => {
      engine.createBlueprint({
        moduleId: 'mod1',
        moduleName: 'Module 1',
        files: sampleFiles(),
        folders: sampleFolders(),
      })
      const gate = engine.checkCodingGate('mod1')
      expect(gate.allowed).toBe(false)
      expect(gate.status).toBe('draft')
      expect(gate.summary).toContain('Draft')
    })

    it('blocks coding when blueprint is rejected', () => {
      engine.createBlueprint({
        moduleId: 'mod1',
        moduleName: 'Module 1',
        files: sampleFiles(),
        folders: sampleFolders(),
      })
      engine.updateStatus('mod1', 'rejected')
      const gate = engine.checkCodingGate('mod1')
      expect(gate.allowed).toBe(false)
      expect(gate.status).toBe('rejected')
    })

    it('allows coding when blueprint is approved and valid', () => {
      engine.createBlueprint({
        moduleId: 'mod1',
        moduleName: 'Module 1',
        files: sampleFiles(),
        folders: sampleFolders(),
      })
      engine.updateStatus('mod1', 'approved')
      const gate = engine.checkCodingGate('mod1')
      expect(gate.allowed).toBe(true)
      expect(gate.violations).toHaveLength(0)
      expect(gate.summary).toContain('✅')
    })

    it('blocks coding when approved but has validation errors', () => {
      engine.createBlueprint({
        moduleId: 'mod1',
        moduleName: 'Module 1',
        files: [
          { path: 'src/engine.ts', type: 'source', purpose: 'Engine' },
          { path: 'src/engine.test.ts', type: 'test', purpose: 'Forbidden test' },
          { path: 'tests/engine.spec.ts', type: 'test', purpose: 'Tests' },
        ],
      })
      engine.updateStatus('mod1', 'approved')
      const gate = engine.checkCodingGate('mod1')
      expect(gate.allowed).toBe(false)
      expect(gate.violations.length).toBeGreaterThan(0)
    })
  })

  // -----------------------------------------------------------------------
  // getSummary
  // -----------------------------------------------------------------------

  describe('getSummary', () => {
    it('returns empty summary', () => {
      const summary = engine.getSummary()
      expect(summary.totalBlueprints).toBe(0)
      expect(summary.totalFiles).toBe(0)
    })

    it('computes summary across blueprints', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1', files: sampleFiles() })
      engine.createBlueprint({ moduleId: 'mod2', moduleName: 'Module 2' })
      engine.updateStatus('mod1', 'approved')

      const summary = engine.getSummary()
      expect(summary.totalBlueprints).toBe(2)
      expect(summary.byStatus.approved).toBe(1)
      expect(summary.byStatus.draft).toBe(1)
      expect(summary.totalFiles).toBe(6)
      expect(summary.averageFilesPerBlueprint).toBe(3)
      expect(summary.pendingApproval).toContain('mod2')
    })
  })

  // -----------------------------------------------------------------------
  // toMarkdown
  // -----------------------------------------------------------------------

  describe('toMarkdown', () => {
    it('generates empty report', () => {
      const md = engine.toMarkdown()
      expect(md).toContain('File / Folder Blueprint Report')
      expect(md).toContain('Total Blueprints:** 0')
    })

    it('generates report for a single blueprint', () => {
      engine.createBlueprint({
        moduleId: 'mod1',
        moduleName: 'Module 1',
        files: sampleFiles(),
        folders: sampleFolders(),
      })
      engine.updateStatus('mod1', 'approved')

      const md = engine.toMarkdown('mod1')
      expect(md).toContain('Module 1')
      expect(md).toContain('mod1')
      expect(md).toContain('Coding Allowed')
      expect(md).toContain('Files')
      expect(md).toContain('Folders')
      expect(md).toContain('src/engine.ts')
    })

    it('shows coding blocked for non-approved blueprint', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      const md = engine.toMarkdown('mod1')
      expect(md).toContain('Coding Blocked')
    })

    it('shows violations in report', () => {
      engine.createBlueprint({
        moduleId: 'mod1',
        moduleName: 'Module 1',
        files: [
          { path: 'src/engine.ts', type: 'source', purpose: 'Engine' },
          { path: 'src/engine.test.ts', type: 'test', purpose: 'Forbidden' },
        ],
      })
      const md = engine.toMarkdown('mod1')
      expect(md).toContain('Violations')
    })

    it('generates full report for multiple modules', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1', files: sampleFiles() })
      engine.createBlueprint({ moduleId: 'mod2', moduleName: 'Module 2' })
      const md = engine.toMarkdown()
      expect(md).toContain('Module 1')
      expect(md).toContain('Module 2')
    })
  })

  // -----------------------------------------------------------------------
  // getMap
  // -----------------------------------------------------------------------

  describe('getMap', () => {
    it('returns blueprint map', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1', files: sampleFiles() })
      const map = engine.getMap()
      expect(Object.keys(map.blueprints)).toHaveLength(1)
      expect(map.summary.totalBlueprints).toBe(1)
    })

    it('returns independent snapshot', () => {
      engine.createBlueprint({ moduleId: 'mod1', moduleName: 'Module 1' })
      const map1 = engine.getMap()
      engine.createBlueprint({ moduleId: 'mod2', moduleName: 'Module 2' })
      const map2 = engine.getMap()
      expect(Object.keys(map1.blueprints)).toHaveLength(1)
      expect(Object.keys(map2.blueprints)).toHaveLength(2)
    })
  })

  // -----------------------------------------------------------------------
  // Full Lifecycle — School ERP
  // -----------------------------------------------------------------------

  describe('full lifecycle — School ERP', () => {
    it('creates, validates, approves, and gates coding for student-master', () => {
      // 1. Create blueprint.
      engine.createBlueprint({
        moduleId: 'student-master',
        moduleName: 'Student Master',
      })

      // 2. Initially blocked by gate.
      let gate = engine.checkCodingGate('student-master')
      expect(gate.allowed).toBe(false)
      expect(gate.summary).toContain('Draft')

      // 3. Add files.
      engine.addFiles('student-master', [
        { path: 'src/engine.ts', type: 'source', purpose: 'Student CRUD engine', requiredExports: ['StudentEngine'] },
        { path: 'src/types.ts', type: 'source', purpose: 'Student type definitions' },
        { path: 'src/index.ts', type: 'barrel', purpose: 'Barrel exports' },
        { path: 'tests/engine.spec.ts', type: 'test', purpose: 'Student unit tests' },
        { path: 'package.json', type: 'config', purpose: 'Package configuration' },
        { path: 'README.md', type: 'doc', purpose: 'Student module docs' },
      ])

      // 4. Add folders.
      engine.addFolders('student-master', [
        { path: 'src', purpose: 'Source code root' },
        { path: 'tests', purpose: 'Test files' },
      ])

      // 5. Validate — should pass.
      const report = engine.validate('student-master')
      expect(report.valid).toBe(true)
      expect(report.fileCount).toBe(6)
      expect(report.folderCount).toBe(2)

      // 6. Submit for review.
      engine.updateStatus('student-master', 'pending-review')

      // 7. Approve.
      engine.updateStatus('student-master', 'approved', 'Structure approved')

      // 8. Gate passes.
      gate = engine.checkCodingGate('student-master')
      expect(gate.allowed).toBe(true)
      expect(gate.violations).toHaveLength(0)
      expect(gate.summary).toContain('✅')

      // 9. Summary.
      const summary = engine.getSummary()
      expect(summary.totalBlueprints).toBe(1)
      expect(summary.byStatus.approved).toBe(1)
      expect(summary.totalFiles).toBe(6)

      // 10. Markdown report.
      const md = engine.toMarkdown('student-master')
      expect(md).toContain('Student Master')
      expect(md).toContain('Coding Allowed')
      expect(md).toContain('src/engine.ts')
    })

    it('rejects blueprint with violations and blocks coding', () => {
      // 1. Create blueprint with forbidden test in src/.
      engine.createBlueprint({
        moduleId: 'enrollment',
        moduleName: 'Enrollment',
        files: [
          { path: 'src/engine.ts', type: 'source', purpose: 'Engine' },
          { path: 'src/index.ts', type: 'barrel', purpose: 'Barrel' },
          { path: 'src/utils.test.ts', type: 'test', purpose: 'Forbidden test in src' },
          { path: 'tests/engine.spec.ts', type: 'test', purpose: 'Proper tests' },
        ],
        folders: [
          { path: 'src', purpose: 'Source' },
          { path: 'tests', purpose: 'Tests' },
        ],
      })

      // 2. Validate — should fail.
      const report = engine.validate('enrollment')
      expect(report.valid).toBe(false)
      expect(report.ruleViolations.some(v => v.path === 'src/utils.test.ts')).toBe(true)

      // 3. Reject.
      engine.updateStatus('enrollment', 'rejected', 'Test file in src/')

      // 4. Gate blocks.
      const gate = engine.checkCodingGate('enrollment')
      expect(gate.allowed).toBe(false)
      expect(gate.summary).toContain('❌')
    })
  })
})
