import { describe, expect, it, beforeEach } from 'vitest'
import { ConversationLedgerEngine } from '../src/conversation-ledger/engine.ts'
import { resetEngine } from '../src/conversation-ledger/tools.ts'
import { createCRId, parseCRId, INTERACTION_LABELS } from '../src/conversation-ledger/types.ts'
import type { CRId, InteractionType } from '../src/conversation-ledger/types.ts'

// ---------------------------------------------------------------------------
// CR-ID Tests
// ---------------------------------------------------------------------------

describe('CR-ID utilities', () => {
  describe('createCRId', () => {
    it('creates a valid CR-ID', () => {
      const crId = createCRId('SCH', 1)
      expect(crId).toBe('CR-SCH-0001')
    })

    it('pads sequence to 4 digits', () => {
      expect(createCRId('AI', 42)).toBe('CR-AI-0042')
    })

    it('handles max sequence', () => {
      expect(createCRId('ERP', 9999)).toBe('CR-ERP-9999')
    })

    it('throws on prefix too short', () => {
      expect(() => createCRId('A', 1)).toThrow('2-4 characters')
    })

    it('throws on prefix too long', () => {
      expect(() => createCRId('ABCDE', 1)).toThrow('2-4 characters')
    })

    it('throws on lowercase prefix', () => {
      expect(() => createCRId('sch', 1)).toThrow('uppercase A-Z')
    })

    it('throws on zero sequence', () => {
      expect(() => createCRId('SCH', 0)).toThrow('1-9999')
    })

    it('throws on sequence over 9999', () => {
      expect(() => createCRId('SCH', 10000)).toThrow('1-9999')
    })

    it('accepts 2-char prefix', () => {
      expect(createCRId('AI', 1)).toBe('CR-AI-0001')
    })

    it('accepts 4-char prefix', () => {
      expect(createCRId('ERPS', 1)).toBe('CR-ERPS-0001')
    })
  })

  describe('parseCRId', () => {
    it('parses a valid CR-ID', () => {
      const parsed = parseCRId('CR-SCH-0001' as CRId)
      expect(parsed.modulePrefix).toBe('SCH')
      expect(parsed.seq).toBe(1)
    })

    it('parses high sequence', () => {
      const parsed = parseCRId('CR-ERP-9999' as CRId)
      expect(parsed.modulePrefix).toBe('ERP')
      expect(parsed.seq).toBe(9999)
    })

    it('throws on invalid format', () => {
      expect(() => parseCRId('invalid' as CRId)).toThrow('Invalid CR-ID format')
    })

    it('throws on wrong prefix case', () => {
      expect(() => parseCRId('CR-sch-0001' as CRId)).toThrow('Invalid CR-ID format')
    })
  })

  describe('INTERACTION_LABELS', () => {
    it('has labels for all 8 types', () => {
      expect(Object.keys(INTERACTION_LABELS)).toHaveLength(8)
    })

    it('includes Hindi text', () => {
      expect(INTERACTION_LABELS.prompt).toContain('उपयोगकर्ता')
      expect(INTERACTION_LABELS.correction).toContain('सुधार')
      expect(INTERACTION_LABELS.approval).toContain('स्वीकृति')
      expect(INTERACTION_LABELS.rejection).toContain('अस्वीकरण')
    })
  })
})

// ---------------------------------------------------------------------------
// ConversationLedgerEngine Tests
// ---------------------------------------------------------------------------

describe('ConversationLedgerEngine', () => {
  let engine: ConversationLedgerEngine

  beforeEach(() => {
    resetEngine()
    engine = new ConversationLedgerEngine('SCH')
  })

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------

  describe('constructor', () => {
    it('creates an empty ledger', () => {
      const ledger = engine.getLedger()
      expect(ledger.entries).toHaveLength(0)
      expect(ledger.totalRequirements).toBe(0)
      expect(ledger.modulePrefix).toBe('SCH')
      expect(ledger.nextSeq).toBe(1)
    })

    it('throws on prefix too short', () => {
      expect(() => new ConversationLedgerEngine('A')).toThrow('2-4 characters')
    })

    it('throws on lowercase prefix', () => {
      expect(() => new ConversationLedgerEngine('sch')).toThrow('uppercase A-Z')
    })
  })

  // -----------------------------------------------------------------------
  // capture
  // -----------------------------------------------------------------------

  describe('capture', () => {
    it('assigns a permanent CR-ID', () => {
      const result = engine.capture({
        content: 'School ERP बनाओ',
        interactionType: 'prompt',
        role: 'user',
      })
      expect(result.entry.crId).toBe('CR-SCH-0001')
      expect(result.entry.seq).toBe(1)
    })

    it('increments sequence', () => {
      engine.capture({ content: 'First', interactionType: 'prompt', role: 'user' })
      engine.capture({ content: 'Second', interactionType: 'question', role: 'user' })
      engine.capture({ content: 'Third', interactionType: 'answer', role: 'assistant' })

      const ledger = engine.getLedger()
      expect(ledger.entries).toHaveLength(3)
      expect(ledger.entries[0]!.crId).toBe('CR-SCH-0001')
      expect(ledger.entries[1]!.crId).toBe('CR-SCH-0002')
      expect(ledger.entries[2]!.crId).toBe('CR-SCH-0003')
      expect(ledger.nextSeq).toBe(4)
    })

    it('records interaction type', () => {
      const result = engine.capture({
        content: 'Test',
        interactionType: 'correction',
        role: 'user',
      })
      expect(result.entry.interactionType).toBe('correction')
    })

    it('records role', () => {
      const result = engine.capture({
        content: 'Test',
        interactionType: 'answer',
        role: 'assistant',
      })
      expect(result.entry.role).toBe('assistant')
    })

    it('records tags', () => {
      const result = engine.capture({
        content: 'Test',
        interactionType: 'prompt',
        role: 'user',
        tags: ['fees', 'module'],
      })
      expect(result.entry.tags).toEqual(['fees', 'module'])
    })

    it('defaults tags to empty array', () => {
      const result = engine.capture({
        content: 'Test',
        interactionType: 'prompt',
        role: 'user',
      })
      expect(result.entry.tags).toEqual([])
    })

    it('records related CR-IDs', () => {
      const first = engine.capture({
        content: 'Original',
        interactionType: 'prompt',
        role: 'user',
      })
      const second = engine.capture({
        content: 'Follow-up',
        interactionType: 'question',
        role: 'user',
        relatedCrIds: [first.entry.crId],
      })
      expect(second.entry.relatedCrIds).toEqual([first.entry.crId])
    })

    it('records metadata', () => {
      const result = engine.capture({
        content: 'Test',
        interactionType: 'prompt',
        role: 'user',
        metadata: { source: 'voice', priority: 'high' },
      })
      expect(result.entry.metadata).toEqual({ source: 'voice', priority: 'high' })
    })

    it('generates a verification question', () => {
      const result = engine.capture({
        content: 'School ERP बनाओ',
        interactionType: 'prompt',
        role: 'user',
      })
      expect(result.verification.question).toContain('School ERP बनाओ')
      expect(result.verification.answered).toBe(false)
      expect(result.verification.verified).toBe(false)
    })

    it('includes success message with CR-ID', () => {
      const result = engine.capture({
        content: 'Test',
        interactionType: 'prompt',
        role: 'user',
      })
      expect(result.message).toContain('CR-SCH-0001')
      expect(result.message).toContain('✅')
    })

    it('updates ledger snapshot', () => {
      engine.capture({ content: 'A', interactionType: 'prompt', role: 'user' })
      engine.capture({ content: 'B', interactionType: 'answer', role: 'assistant' })

      const ledger = engine.getLedger()
      expect(ledger.totalRequirements).toBe(2)
      expect(ledger.pendingCount).toBe(2)
      expect(ledger.verifiedCount).toBe(0)
    })

    it('is not superseded by default', () => {
      const result = engine.capture({
        content: 'Test',
        interactionType: 'prompt',
        role: 'user',
      })
      expect(result.entry.superseded).toBe(false)
      expect(result.entry.supersededBy).toBeUndefined()
    })

    it('sets timestamp', () => {
      const before = Date.now()
      const result = engine.capture({
        content: 'Test',
        interactionType: 'prompt',
        role: 'user',
      })
      const after = Date.now()
      const ts = new Date(result.entry.timestamp).getTime()
      expect(ts).toBeGreaterThanOrEqual(before)
      expect(ts).toBeLessThanOrEqual(after)
    })
  })

  // -----------------------------------------------------------------------
  // supersede
  // -----------------------------------------------------------------------

  describe('supersede', () => {
    it('marks original as superseded', () => {
      const first = engine.capture({
        content: 'Original content',
        interactionType: 'prompt',
        role: 'user',
      })
      engine.supersede(first.entry.crId, 'Corrected content', 'correction')

      const ledger = engine.getLedger()
      const original = ledger.entries.find(e => e.seq === 1)!
      expect(original.superseded).toBe(true)
      expect(original.supersededBy).toBeDefined()
    })

    it('creates a new entry linked to original', () => {
      const first = engine.capture({
        content: 'Original',
        interactionType: 'prompt',
        role: 'user',
      })
      const result = engine.supersede(first.entry.crId, 'Corrected', 'correction')

      expect(result.entry.crId).toBe('CR-SCH-0002')
      expect(result.entry.relatedCrIds).toEqual([first.entry.crId])
      expect(result.entry.interactionType).toBe('correction')
    })

    it('inherits tags from original', () => {
      const first = engine.capture({
        content: 'Original',
        interactionType: 'prompt',
        role: 'user',
        tags: ['fees', 'important'],
      })
      const result = engine.supersede(first.entry.crId, 'Corrected', 'change')

      expect(result.entry.tags).toEqual(['fees', 'important'])
    })

    it('throws on non-existent CR-ID', () => {
      expect(() => engine.supersede('CR-SCH-9999' as CRId, 'Test', 'correction'))
        .toThrow('not found')
    })

    it('throws on already superseded entry', () => {
      const first = engine.capture({
        content: 'Original',
        interactionType: 'prompt',
        role: 'user',
      })
      engine.supersede(first.entry.crId, 'First correction', 'correction')

      expect(() => engine.supersede(first.entry.crId, 'Second correction', 'correction'))
        .toThrow('already superseded')
    })

    it('superseded entry still appears in ledger', () => {
      const first = engine.capture({
        content: 'Original',
        interactionType: 'prompt',
        role: 'user',
      })
      engine.supersede(first.entry.crId, 'Corrected', 'correction')

      const ledger = engine.getLedger()
      expect(ledger.entries).toHaveLength(2)
    })
  })

  // -----------------------------------------------------------------------
  // answerVerification
  // -----------------------------------------------------------------------

  describe('answerVerification', () => {
    it('marks entry as answered', () => {
      const first = engine.capture({
        content: 'Test',
        interactionType: 'prompt',
        role: 'user',
      })
      const updated = engine.answerVerification(first.entry.crId, 'हाँ, यह सही है')

      expect(updated.verification.answered).toBe(true)
      expect(updated.verification.answer).toBe('हाँ, यह सही है')
      expect(updated.verification.verified).toBe(true)
    })

    it('marks as verified when answer is non-empty', () => {
      const first = engine.capture({
        content: 'Test',
        interactionType: 'prompt',
        role: 'user',
      })
      const updated = engine.answerVerification(first.entry.crId, 'yes')
      expect(updated.verification.verified).toBe(true)
    })

    it('marks as not verified when answer is empty', () => {
      const first = engine.capture({
        content: 'Test',
        interactionType: 'prompt',
        role: 'user',
      })
      const updated = engine.answerVerification(first.entry.crId, '')
      expect(updated.verification.verified).toBe(false)
      expect(updated.verification.answered).toBe(true)
    })

    it('throws on non-existent CR-ID', () => {
      expect(() => engine.answerVerification('CR-SCH-9999' as CRId, 'yes'))
        .toThrow('not found')
    })

    it('updates ledger counts', () => {
      const first = engine.capture({
        content: 'Test',
        interactionType: 'prompt',
        role: 'user',
      })
      engine.answerVerification(first.entry.crId, 'yes')

      const ledger = engine.getLedger()
      expect(ledger.verifiedCount).toBe(1)
      expect(ledger.pendingCount).toBe(0)
    })

    it('allows overwriting an answer', () => {
      const first = engine.capture({
        content: 'Test',
        interactionType: 'prompt',
        role: 'user',
      })
      engine.answerVerification(first.entry.crId, 'first answer')
      const updated = engine.answerVerification(first.entry.crId, 'second answer')

      expect(updated.verification.answer).toBe('second answer')
      expect(updated.verification.verified).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // findEntry
  // -----------------------------------------------------------------------

  describe('findEntry', () => {
    it('finds an existing entry', () => {
      const first = engine.capture({
        content: 'Test',
        interactionType: 'prompt',
        role: 'user',
      })
      const found = engine.findEntry(first.entry.crId)
      expect(found).toBeDefined()
      expect(found!.content).toBe('Test')
    })

    it('returns undefined for non-existent entry', () => {
      const found = engine.findEntry('CR-SCH-9999' as CRId)
      expect(found).toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // query
  // -----------------------------------------------------------------------

  describe('query', () => {
    beforeEach(() => {
      engine.capture({ content: 'School ERP बनाओ', interactionType: 'prompt', role: 'user', tags: ['erp'] })
      engine.capture({ content: 'Student module कैसा होगा?', interactionType: 'question', role: 'user', tags: ['student'] })
      engine.capture({ content: 'Student module React से बनेगा', interactionType: 'answer', role: 'assistant', tags: ['student'] })
      engine.capture({ content: 'React नहीं, Vue use करो', interactionType: 'correction', role: 'user', tags: ['student', 'correction'] })
      engine.capture({ content: 'OK, approved', interactionType: 'approval', role: 'user', tags: ['erp'] })
    })

    it('filters by interaction type', () => {
      const results = engine.query({ interactionType: 'question' })
      expect(results).toHaveLength(1)
      expect(results[0]!.interactionType).toBe('question')
    })

    it('filters by role', () => {
      const results = engine.query({ role: 'assistant' })
      expect(results).toHaveLength(1)
      expect(results[0]!.role).toBe('assistant')
    })

    it('filters by tag', () => {
      const results = engine.query({ tag: 'student' })
      expect(results).toHaveLength(3) // question, answer, correction
    })

    it('filters by content search', () => {
      const results = engine.query({ contentSearch: 'React' })
      expect(results).toHaveLength(2) // answer + correction
    })

    it('filters by verification status', () => {
      const first = engine.findEntry('CR-SCH-0001' as CRId)!
      engine.answerVerification(first.crId, 'yes')

      const verified = engine.query({ verificationStatus: 'verified' })
      expect(verified).toHaveLength(1)
      expect(verified[0]!.crId).toBe('CR-SCH-0001')

      const pending = engine.query({ verificationStatus: 'pending' })
      expect(pending).toHaveLength(4)
    })

    it('excludes superseded by default', () => {
      engine.supersede('CR-SCH-0002' as CRId, 'Updated question', 'correction')

      const active = engine.query({ includeSuperseded: false })
      // 5 original + 1 new correction entry = 6 total, 1 superseded = 5 active
      expect(active).toHaveLength(5)
    })

    it('applies limit', () => {
      const results = engine.query({ limit: 2 })
      expect(results).toHaveLength(2)
    })

    it('combines filters', () => {
      const results = engine.query({
        role: 'user',
        tag: 'student',
        interactionType: 'question',
      })
      expect(results).toHaveLength(1)
      expect(results[0]!.content).toContain('Student module')
    })

    it('returns all when no filter', () => {
      const results = engine.query({})
      expect(results).toHaveLength(5)
    })
  })

  // -----------------------------------------------------------------------
  // getSummary
  // -----------------------------------------------------------------------

  describe('getSummary', () => {
    it('returns empty summary for empty ledger', () => {
      const summary = engine.getSummary()
      expect(summary.totalEntries).toBe(0)
      expect(summary.activeEntries).toBe(0)
      expect(summary.supersededEntries).toBe(0)
    })

    it('counts by type', () => {
      engine.capture({ content: 'A', interactionType: 'prompt', role: 'user' })
      engine.capture({ content: 'B', interactionType: 'question', role: 'user' })
      engine.capture({ content: 'C', interactionType: 'prompt', role: 'assistant' })

      const summary = engine.getSummary()
      expect(summary.byType.prompt).toBe(2)
      expect(summary.byType.question).toBe(1)
      expect(summary.byType.answer).toBe(0)
    })

    it('counts by role', () => {
      engine.capture({ content: 'A', interactionType: 'prompt', role: 'user' })
      engine.capture({ content: 'B', interactionType: 'answer', role: 'assistant' })
      engine.capture({ content: 'C', interactionType: 'answer', role: 'assistant' })

      const summary = engine.getSummary()
      expect(summary.byRole.user).toBe(1)
      expect(summary.byRole.assistant).toBe(2)
      expect(summary.byRole.system).toBe(0)
    })

    it('counts superseded', () => {
      const first = engine.capture({ content: 'A', interactionType: 'prompt', role: 'user' })
      engine.capture({ content: 'B', interactionType: 'answer', role: 'assistant' })
      engine.supersede(first.entry.crId, 'A corrected', 'correction')

      const summary = engine.getSummary()
      expect(summary.totalEntries).toBe(3)
      expect(summary.activeEntries).toBe(2)
      expect(summary.supersededEntries).toBe(1)
    })

    it('counts verification status', () => {
      const first = engine.capture({ content: 'A', interactionType: 'prompt', role: 'user' })
      engine.capture({ content: 'B', interactionType: 'answer', role: 'assistant' })
      engine.answerVerification(first.entry.crId, 'yes')

      const summary = engine.getSummary()
      expect(summary.verification.verified).toBe(1)
      expect(summary.verification.pending).toBe(1)
      expect(summary.verification.failed).toBe(0)
    })

    it('counts failed verifications', () => {
      const first = engine.capture({ content: 'A', interactionType: 'prompt', role: 'user' })
      engine.answerVerification(first.entry.crId, '')

      const summary = engine.getSummary()
      expect(summary.verification.failed).toBe(1)
    })
  })

  // -----------------------------------------------------------------------
  // toMarkdown
  // -----------------------------------------------------------------------

  describe('toMarkdown', () => {
    it('generates markdown for empty ledger', () => {
      const md = engine.toMarkdown()
      expect(md).toContain('Conversation Requirement Ledger')
      expect(md).toContain('SCH')
      expect(md).toContain('**Total:** 0')
    })

    it('generates markdown with entries', () => {
      engine.capture({ content: 'School ERP बनाओ', interactionType: 'prompt', role: 'user' })
      engine.capture({ content: 'Student module', interactionType: 'question', role: 'user' })

      const md = engine.toMarkdown()
      expect(md).toContain('CR-SCH-0001')
      expect(md).toContain('CR-SCH-0002')
      expect(md).toContain('prompt')
      expect(md).toContain('question')
    })

    it('truncates long content', () => {
      const longContent = 'A'.repeat(100)
      engine.capture({ content: longContent, interactionType: 'prompt', role: 'user' })

      const md = engine.toMarkdown()
      expect(md).toContain('...')
    })

    it('shows superseded icon for superseded entries', () => {
      const first = engine.capture({ content: 'Original', interactionType: 'prompt', role: 'user' })
      engine.supersede(first.entry.crId, 'Corrected', 'correction')

      const md = engine.toMarkdown()
      expect(md).toContain('⛔')
    })

    it('shows verified icon for verified entries', () => {
      const first = engine.capture({ content: 'Test', interactionType: 'prompt', role: 'user' })
      engine.answerVerification(first.entry.crId, 'yes')

      const md = engine.toMarkdown()
      expect(md).toContain('✅')
    })

    it('shows pending icon for unverified entries', () => {
      engine.capture({ content: 'Test', interactionType: 'prompt', role: 'user' })

      const md = engine.toMarkdown()
      expect(md).toContain('⏳')
    })
  })

  // -----------------------------------------------------------------------
  // Full lifecycle scenario
  // -----------------------------------------------------------------------

  describe('full lifecycle — School ERP scenario', () => {
    it('captures a complete conversation flow', () => {
      // 1. User prompt
      const p1 = engine.capture({
        content: 'School ERP बनाओ जिसमें student management हो',
        interactionType: 'prompt',
        role: 'user',
        tags: ['erp', 'student'],
      })
      expect(p1.entry.crId).toBe('CR-SCH-0001')

      // 2. Assistant answer
      const a1 = engine.capture({
        content: 'Student module React + Node.js से बनेगा',
        interactionType: 'answer',
        role: 'assistant',
        tags: ['student', 'tech'],
        relatedCrIds: [p1.entry.crId],
      })
      expect(a1.entry.crId).toBe('CR-SCH-0002')

      // 3. User correction
      const c1 = engine.capture({
        content: 'React नहीं, Vue.js use करो',
        interactionType: 'correction',
        role: 'user',
        tags: ['student', 'tech'],
        relatedCrIds: [a1.entry.crId],
      })
      expect(c1.entry.crId).toBe('CR-SCH-0003')

      // 4. Supersede the original answer
      const sup = engine.supersede(a1.entry.crId, 'Student module Vue.js + Node.js से बनेगा', 'correction')
      expect(sup.entry.crId).toBe('CR-SCH-0004')

      // 5. Verify
      engine.answerVerification(p1.entry.crId, 'हाँ, यह सही है')
      engine.answerVerification(c1.entry.crId, 'correct')

      // 6. Check state
      const ledger = engine.getLedger()
      expect(ledger.entries).toHaveLength(4)
      expect(ledger.verifiedCount).toBe(2)
      expect(ledger.pendingCount).toBe(2) // superseded original + new correction entry

      // 7. Check superseded
      const originalAnswer = ledger.entries.find(e => e.seq === 2)!
      expect(originalAnswer.superseded).toBe(true)
      expect(originalAnswer.supersededBy).toBe('CR-SCH-0004')

      // 8. Summary
      const summary = engine.getSummary()
      expect(summary.totalEntries).toBe(4)
      expect(summary.activeEntries).toBe(3)
      expect(summary.supersededEntries).toBe(1)
      expect(summary.byType.prompt).toBe(1)
      expect(summary.byType.answer).toBe(1)
      expect(summary.byType.correction).toBe(2) // c1 + sup

      // 9. Markdown
      const md = engine.toMarkdown()
      expect(md).toContain('CR-SCH-0001')
      expect(md).toContain('CR-SCH-0004')
    })
  })

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles all 8 interaction types', () => {
      const types: InteractionType[] = [
        'prompt', 'question', 'answer', 'correction',
        'approval', 'rejection', 'change', 'exception',
      ]
      for (const type of types) {
        engine.capture({ content: `Test ${type}`, interactionType: type, role: 'user' })
      }
      expect(engine.getLedger().entries).toHaveLength(8)
    })

    it('handles all 3 roles', () => {
      engine.capture({ content: 'User', interactionType: 'prompt', role: 'user' })
      engine.capture({ content: 'Assistant', interactionType: 'answer', role: 'assistant' })
      engine.capture({ content: 'System', interactionType: 'exception', role: 'system' })
      expect(engine.getLedger().entries).toHaveLength(3)
    })

    it('handles empty tags and metadata', () => {
      const result = engine.capture({
        content: 'Minimal',
        interactionType: 'prompt',
        role: 'user',
      })
      expect(result.entry.tags).toEqual([])
      expect(result.entry.metadata).toEqual({})
      expect(result.entry.relatedCrIds).toEqual([])
    })

    it('query returns empty for non-matching filters', () => {
      engine.capture({ content: 'Test', interactionType: 'prompt', role: 'user' })
      const results = engine.query({ interactionType: 'exception' })
      expect(results).toHaveLength(0)
    })

    it('supersede preserves all original metadata', () => {
      const first = engine.capture({
        content: 'Original',
        interactionType: 'prompt',
        role: 'user',
        tags: ['test'],
        metadata: { key: 'value' },
      })
      engine.supersede(first.entry.crId, 'Corrected', 'correction')

      const ledger = engine.getLedger()
      const original = ledger.entries.find(e => e.seq === 1)!
      expect(original.tags).toEqual(['test'])
      expect(original.metadata).toEqual({ key: 'value' })
    })
  })
})
