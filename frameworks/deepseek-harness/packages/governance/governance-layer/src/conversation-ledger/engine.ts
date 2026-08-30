/**
 * Conversation Requirement Ledger Engine.
 *
 * Captures every significant user utterance, assigns a permanent CR-ID,
 * generates a verification question, and maintains a queryable ledger.
 *
 * @module @deepseek-ai/dsh-governance-layer/conversation-ledger/engine
 */

import type {
  CRId,
  CaptureInput,
  CaptureResult,
  ConversationLedger,
  InteractionType,
  LedgerEntry,
  LedgerQuery,
  LedgerSummary,
  VerificationQuestion,
} from './types.ts'
import { createCRId, INTERACTION_LABELS } from './types.ts'

// ---------------------------------------------------------------------------
// Verification Question Templates
// ---------------------------------------------------------------------------

/**
 * Verification question templates per interaction type.
 *
 * Each template uses `{content}` as a placeholder for the original utterance.
 * The engine generates a concrete question from these templates.
 */
const VERIFICATION_TEMPLATES: Record<InteractionType, string[]> = {
  prompt: [
    'क्या यह सही ढंग से कैप्चर किया गया है: "{content}"?',
    'क्या आपका मुख्य निर्देश यही था?',
  ],
  question: [
    'क्या यह प्रश्न सही ढंग से रिकॉर्ड किया गया है: "{content}"?',
    'क्या आपका प्रश्न यही था?',
  ],
  answer: [
    'क्या यह उत्तर सही ढंग से कैप्चर किया गया है: "{content}"?',
    'क्या यही आपका उत्तर था?',
  ],
  correction: [
    'क्या यह सुधार सही ढंग से रिकॉर्ड किया गया है: "{content}"?',
    'क्या आप यह पुष्टि करते हैं कि यह सुधार सही है?',
  ],
  approval: [
    'क्या आपकी स्वीकृति इसके लिए है: "{content}"?',
    'क्या यही आपकी स्वीकृति का विषय था?',
  ],
  rejection: [
    'क्या आपका अस्वीकरण इसके लिए है: "{content}"?',
    'क्या आप यह पुष्टि करते हैं कि यह अस्वीकरण सही है?',
  ],
  change: [
    'क्या यह बदलाव सही ढंग से रिकॉर्ड किया गया है: "{content}"?',
    'क्या आप इस बदलाव की पुष्टि करते हैं?',
  ],
  exception: [
    'क्या यह अप्रत्याशित परिस्थिति सही ढंग से कैप्चर की गई है: "{content}"?',
    'क्या यही अपवाद का विवरण है?',
  ],
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * The Conversation Requirement Ledger Engine.
 *
 * Responsibilities:
 * 1. Capture significant utterances and assign permanent CR-IDs.
 * 2. Generate verification questions for each entry.
 * 3. Support superseding (correction/change replaces an earlier entry).
 * 4. Query entries by type, role, tag, content, or verification status.
 * 5. Provide summary statistics.
 */
export class ConversationLedgerEngine {
  private ledger: ConversationLedger
  private entries: LedgerEntry[]

  constructor(modulePrefix: string) {
    if (modulePrefix.length < 2 || modulePrefix.length > 4) {
      throw new Error(`Module prefix must be 2-4 characters, got "${modulePrefix}"`)
    }
    if (!/^[A-Z]{2,4}$/.test(modulePrefix)) {
      throw new Error(`Module prefix must be uppercase A-Z, got "${modulePrefix}"`)
    }

    this.entries = []
    this.ledger = {
      entries: [],
      totalRequirements: 0,
      verifiedCount: 0,
      pendingCount: 0,
      modulePrefix,
      nextSeq: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  /** Get the current ledger snapshot. */
  getLedger(): ConversationLedger {
    return { ...this.ledger, entries: [...this.entries] }
  }

  /**
   * Capture a new conversation requirement.
   *
   * Assigns a permanent CR-ID, generates a verification question, and
   * appends the entry to the ledger.
   */
  capture(input: CaptureInput): CaptureResult {
    const seq = this.ledger.nextSeq
    const crId = createCRId(this.ledger.modulePrefix, seq)

    const verification = this.generateVerification(input.interactionType, input.content)

    const entry: LedgerEntry = {
      crId,
      seq,
      timestamp: new Date().toISOString(),
      interactionType: input.interactionType,
      content: input.content,
      role: input.role,
      modulePrefix: this.ledger.modulePrefix,
      tags: input.tags ?? [],
      verification,
      relatedCrIds: input.relatedCrIds ?? [],
      metadata: input.metadata ?? {},
      superseded: false,
    }

    this.entries.push(entry)
    this.ledger = {
      ...this.ledger,
      entries: [...this.entries],
      totalRequirements: this.entries.length,
      pendingCount: this.entries.filter(e => !e.verification.verified).length,
      nextSeq: seq + 1,
      updatedAt: new Date().toISOString(),
    }

    return {
      entry,
      verification,
      message: `✅ CR-ID ${crId} assigned — ${INTERACTION_LABELS[input.interactionType]}`,
    }
  }

  /**
   * Supersede an existing entry with a correction or change.
   *
   * The original entry is marked as superseded, and a new entry is created
   * with the correction/change, linked back to the original via `relatedCrIds`.
   */
  supersede(originalCrId: CRId, newContent: string, newInteractionType: InteractionType): CaptureResult {
    const original = this.findEntry(originalCrId)
    if (!original) {
      throw new Error(`CR-ID ${originalCrId} not found`)
    }
    if (original.superseded) {
      throw new Error(`CR-ID ${originalCrId} is already superseded by ${original.supersededBy}`)
    }

    // Mark the original as superseded.
    const idx = this.entries.findIndex(e => e.crId === originalCrId)
    if (idx === -1) {
      throw new Error(`CR-ID ${originalCrId} not found in entries`)
    }
    this.entries[idx] = { ...original, superseded: true }

    // Capture the new entry linked to the original.
    const result = this.capture({
      content: newContent,
      interactionType: newInteractionType,
      role: original.role,
      relatedCrIds: [originalCrId],
      tags: [...original.tags],
      metadata: { ...original.metadata, supersededFrom: originalCrId as string },
    })

    // Update the original's supersededBy.
    this.entries[idx] = { ...original, superseded: true, supersededBy: result.entry.crId }

    // Refresh ledger snapshot.
    this.ledger = {
      ...this.ledger,
      entries: [...this.entries],
      verifiedCount: this.entries.filter(e => e.verification.verified).length,
      pendingCount: this.entries.filter(e => !e.verification.verified).length,
      updatedAt: new Date().toISOString(),
    }

    return result
  }

  /**
   * Answer a verification question.
   *
   * Updates the entry's verification status. The `verified` flag is set
   * to true if the answer is non-empty (simple heuristic; the model or
   * human reviewer makes the final determination).
   */
  answerVerification(crId: CRId, answer: string): LedgerEntry {
    const idx = this.entries.findIndex(e => e.crId === crId)
    if (idx === -1) {
      throw new Error(`CR-ID ${crId} not found`)
    }

    const entry = this.entries[idx]!
    const verified = answer.trim().length > 0

    const updated: LedgerEntry = {
      ...entry,
      verification: {
        ...entry.verification,
        answered: true,
        answer,
        verified,
      },
    }

    this.entries[idx] = updated
    this.ledger = {
      ...this.ledger,
      entries: [...this.entries],
      verifiedCount: this.entries.filter(e => e.verification.verified).length,
      pendingCount: this.entries.filter(e => !e.verification.verified).length,
      updatedAt: new Date().toISOString(),
    }

    return updated
  }

  /**
   * Find an entry by CR-ID.
   */
  findEntry(crId: CRId): LedgerEntry | undefined {
    return this.entries.find(e => e.crId === crId)
  }

  /**
   * Query entries based on filter criteria.
   */
  query(filter: LedgerQuery): readonly LedgerEntry[] {
    let results = [...this.entries]

    if (filter.interactionType) {
      results = results.filter(e => e.interactionType === filter.interactionType)
    }
    if (filter.role) {
      results = results.filter(e => e.role === filter.role)
    }
    if (filter.tag) {
      results = results.filter(e => e.tags.includes(filter.tag!))
    }
    if (filter.verificationStatus) {
      results = results.filter(e => {
        switch (filter.verificationStatus) {
          case 'pending': return !e.verification.answered
          case 'verified': return e.verification.verified
          case 'failed': return e.verification.answered && !e.verification.verified
          default: return true
        }
      })
    }
    if (filter.includeSuperseded === false) {
      results = results.filter(e => !e.superseded)
    }
    if (filter.contentSearch) {
      const search = filter.contentSearch.toLowerCase()
      results = results.filter(e => e.content.toLowerCase().includes(search))
    }
    if (filter.limit !== undefined && filter.limit > 0) {
      results = results.slice(0, filter.limit)
    }

    return results
  }

  /**
   * Get summary statistics for the ledger.
   */
  getSummary(): LedgerSummary {
    const byType: Record<InteractionType, number> = {
      prompt: 0, question: 0, answer: 0, correction: 0,
      approval: 0, rejection: 0, change: 0, exception: 0,
    }
    const byRole: Record<'user' | 'assistant' | 'system', number> = {
      user: 0, assistant: 0, system: 0,
    }

    for (const entry of this.entries) {
      byType[entry.interactionType]++
      byRole[entry.role]++
    }

    const verified = this.entries.filter(e => e.verification.verified).length
    const pending = this.entries.filter(e => !e.verification.answered).length
    const failed = this.entries.filter(e => e.verification.answered && !e.verification.verified).length

    return {
      totalEntries: this.entries.length,
      activeEntries: this.entries.filter(e => !e.superseded).length,
      supersededEntries: this.entries.filter(e => e.superseded).length,
      byType,
      byRole,
      verification: {
        total: this.entries.length,
        verified,
        pending,
        failed,
      },
    }
  }

  /**
   * Generate the ledger as a formatted markdown string.
   */
  toMarkdown(): string {
    const lines: string[] = []
    const summary = this.getSummary()

    lines.push(`## Conversation Requirement Ledger — ${this.ledger.modulePrefix}`)
    lines.push('')
    lines.push(`**Total:** ${summary.totalEntries} | **Active:** ${summary.activeEntries} | **Superseded:** ${summary.supersededEntries}`)
    lines.push(`**Verified:** ${summary.verification.verified} | **Pending:** ${summary.verification.pending} | **Failed:** ${summary.verification.failed}`)
    lines.push('')
    lines.push('| CR-ID | Type | Role | Content | Verified |')
    lines.push('|-------|------|------|---------|----------|')

    for (const entry of this.entries) {
      const content = entry.content.length > 60
        ? entry.content.slice(0, 57) + '...'
        : entry.content
      const icon = entry.superseded ? '⛔' : entry.verification.verified ? '✅' : entry.verification.answered ? '❌' : '⏳'
      lines.push(`| ${entry.crId} | ${entry.interactionType} | ${entry.role} | ${content} | ${icon} |`)
    }

    return lines.join('\n')
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  /**
   * Generate a verification question for an interaction type.
   *
   * Uses a deterministic template based on the type and content.
   */
  private generateVerification(type: InteractionType, content: string): VerificationQuestion {
    const templates = VERIFICATION_TEMPLATES[type]
    // Use the first template (deterministic; the model can refine later).
    const template = templates[0]!
    const question = template.replace('{content}', content.slice(0, 100))

    return {
      question,
      answered: false,
      verified: false,
    }
  }
}
