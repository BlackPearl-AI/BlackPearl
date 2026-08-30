/**
 * Conversation Requirement Ledger tools.
 *
 * - `capture_requirement`: capture a significant utterance, get a CR-ID
 * - `get_ledger`: view the full ledger with summary stats
 * - `query_cr`: query entries by type, role, tag, or content
 * - `answer_verification`: answer a verification question
 * - `supersede_cr`: supersede an entry with a correction/change
 *
 * @module @deepseek-ai/dsh-governance-layer/conversation-ledger/tools
 */

import { HarnessError } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { ConversationLedgerEngine } from './engine.ts'
import type { CRId, InteractionType, LedgerQuery } from './types.ts'

/** Active engine instance (per-session). */
let activeEngine: ConversationLedgerEngine | undefined

/** Get the active engine (for other modules to read). */
export function getActiveEngine(): ConversationLedgerEngine | undefined {
  return activeEngine
}

/** Reset the active engine (for testing). */
export function resetEngine(): void {
  activeEngine = undefined
}

// ---------------------------------------------------------------------------
// Tool: capture_requirement
// ---------------------------------------------------------------------------

/**
 * Create the `capture_requirement` tool.
 *
 * Captures a significant user/assistant/system utterance and assigns
 * a permanent CR-ID with a verification question.
 */
export function createCaptureRequirementTool() {
  return defineTool({
    name: 'capture_requirement',
    description:
      'Capture a significant conversation utterance and assign a permanent CR-ID. '
      + 'Use this for every important prompt, question, answer, correction, approval, '
      + 'rejection, change, or exception. Each entry gets a verification question.',
    parameters: {
      content: {
        type: 'string',
        required: true,
        description: 'The utterance content to capture.',
      },
      interaction_type: {
        type: 'string',
        required: true,
        enum: ['prompt', 'question', 'answer', 'correction', 'approval', 'rejection', 'change', 'exception'] as const,
        description: 'The type of interaction.',
      },
      role: {
        type: 'string',
        required: true,
        enum: ['user', 'assistant', 'system'] as const,
        description: 'Who said it.',
      },
      tags: {
        type: 'array',
        description: 'Tags for categorization.',
      },
      related_cr_ids: {
        type: 'array',
        description: 'CR-IDs of related entries (e.g., correction relates to the original).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          crId: { type: 'string', required: true },
          interactionType: { type: 'string', required: true },
          verificationQuestion: { type: 'string', required: true },
          message: { type: 'string', required: true },
        },
      } as const,
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      const content = args.content as string
      const interactionType = args.interaction_type as InteractionType
      const role = args.role as 'user' | 'assistant' | 'system'
      const tags = args.tags as string[] | undefined
      const relatedCrIds = args.related_cr_ids as string[] | undefined

      if (!content || content.trim().length === 0) {
        throw new HarnessError(
          'capture_requirement: content is required',
          'LEDGER_CONTENT_REQUIRED',
        )
      }

      // Initialize engine if needed.
      if (activeEngine === undefined) {
        activeEngine = new ConversationLedgerEngine('CON')
      }

      const result = activeEngine.capture({
        content,
        interactionType,
        role,
        ...(tags !== undefined ? { tags } : {}),
        ...(relatedCrIds !== undefined ? { relatedCrIds: relatedCrIds as CRId[] } : {}),
      })

      return Promise.resolve({
        crId: result.entry.crId as string,
        interactionType: result.entry.interactionType,
        verificationQuestion: result.verification.question,
        message: result.message,
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { content?: string; interaction_type?: string }
      return {
        card: 'generic',
        title: `Capture: ${input.interaction_type ?? '?'}`,
        kind: 'other',
        rawInput: input.content?.slice(0, 80) ?? '',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_ledger
// ---------------------------------------------------------------------------

/**
 * Create the `get_ledger` tool.
 *
 * Returns the full ledger with summary statistics and formatted markdown.
 */
export function createGetLedgerTool() {
  return defineTool({
    name: 'get_ledger',
    description:
      'Get the full Conversation Requirement Ledger with summary statistics. '
      + 'Shows all captured CR-IDs, their types, verification status, and overall stats.',
    parameters: {
      format: {
        type: 'string',
        enum: ['json', 'markdown'] as const,
        description: 'Output format (default: json).',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          summary: {
            type: 'object',
            additionalProperties: false,
            properties: {
              totalEntries: { type: 'number', required: true },
              activeEntries: { type: 'number', required: true },
              supersededEntries: { type: 'number', required: true },
              verified: { type: 'number', required: true },
              pending: { type: 'number', required: true },
            },
          },
          entries: { type: 'array', required: true },
          markdown: { type: 'string' },
        },
      } as const,
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      if (activeEngine === undefined) {
        return Promise.resolve({
          summary: { totalEntries: 0, activeEntries: 0, supersededEntries: 0, verified: 0, pending: 0 },
          entries: [],
        })
      }

      const ledger = activeEngine.getLedger()
      const summary = activeEngine.getSummary()
      const format = args.format as string | undefined

      return Promise.resolve({
        summary: {
          totalEntries: summary.totalEntries,
          activeEntries: summary.activeEntries,
          supersededEntries: summary.supersededEntries,
          verified: summary.verification.verified,
          pending: summary.verification.pending,
        },
        entries: ledger.entries.map(e => ({
          crId: e.crId as string,
          seq: e.seq,
          interactionType: e.interactionType,
          role: e.role,
          content: e.content,
          verified: e.verification.verified,
          superseded: e.superseded,
          tags: [...e.tags],
        })),
        ...(format === 'markdown' ? { markdown: activeEngine.toMarkdown() } : {}),
      })
    },
    presentCall(): GenericCallView {
      return {
        card: 'generic',
        title: 'Conversation Ledger',
        kind: 'other',
        rawInput: 'Viewing ledger',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: query_cr
// ---------------------------------------------------------------------------

/**
 * Create the `query_cr` tool.
 *
 * Query entries by type, role, tag, content search, or verification status.
 */
export function createQueryCrTool() {
  return defineTool({
    name: 'query_cr',
    description:
      'Query the Conversation Requirement Ledger by type, role, tag, content search, '
      + 'or verification status. Returns matching entries with their CR-IDs.',
    parameters: {
      interaction_type: {
        type: 'string',
        enum: ['prompt', 'question', 'answer', 'correction', 'approval', 'rejection', 'change', 'exception'] as const,
        description: 'Filter by interaction type.',
      },
      role: {
        type: 'string',
        enum: ['user', 'assistant', 'system'] as const,
        description: 'Filter by role.',
      },
      tag: {
        type: 'string',
        description: 'Filter by tag.',
      },
      verification_status: {
        type: 'string',
        enum: ['pending', 'verified', 'failed'] as const,
        description: 'Filter by verification status.',
      },
      content_search: {
        type: 'string',
        description: 'Search content by substring.',
      },
      limit: {
        type: 'number',
        description: 'Maximum entries to return.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          count: { type: 'number', required: true },
          entries: { type: 'array', required: true },
        },
      } as const,
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      if (activeEngine === undefined) {
        return Promise.resolve({ count: 0, entries: [] })
      }

      const results = activeEngine.query({
        interactionType: args.interaction_type as InteractionType,
        role: args.role as 'user' | 'assistant' | 'system',
        tag: args.tag as string,
        verificationStatus: args.verification_status as 'pending' | 'verified' | 'failed',
        contentSearch: args.content_search as string,
        limit: args.limit as number,
      } as LedgerQuery)

      return Promise.resolve({
        count: results.length,
        entries: results.map(e => ({
          crId: e.crId as string,
          seq: e.seq,
          interactionType: e.interactionType,
          role: e.role,
          content: e.content,
          verified: e.verification.verified,
          superseded: e.superseded,
          tags: [...e.tags],
        })),
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { interaction_type?: string; content_search?: string }
      return {
        card: 'generic',
        title: `Query CR: ${input.interaction_type ?? input.content_search ?? 'all'}`,
        kind: 'other',
        rawInput: 'Searching ledger',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: answer_verification
// ---------------------------------------------------------------------------

/**
 * Create the `answer_verification` tool.
 *
 * Answer a verification question for a specific CR-ID.
 */
export function createAnswerVerificationTool() {
  return defineTool({
    name: 'answer_verification',
    description:
      'Answer the verification question for a specific CR-ID. '
      + 'This confirms the requirement was correctly captured and understood.',
    parameters: {
      cr_id: {
        type: 'string',
        required: true,
        description: 'The CR-ID to answer verification for (e.g., "CR-CON-0001").',
      },
      answer: {
        type: 'string',
        required: true,
        description: 'The answer to the verification question.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          crId: { type: 'string', required: true },
          verified: { type: 'boolean', required: true },
          question: { type: 'string', required: true },
          answer: { type: 'string', required: true },
        },
      } as const,
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      if (activeEngine === undefined) {
        throw new HarnessError(
          'answer_verification: no active ledger — capture a requirement first',
          'LEDGER_NOT_INITIALIZED',
        )
      }

      const crId = args.cr_id as CRId
      const answer = args.answer as string

      const entry = activeEngine.answerVerification(crId, answer)

      return Promise.resolve({
        crId: entry.crId as string,
        verified: entry.verification.verified,
        question: entry.verification.question,
        answer,
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { cr_id?: string }
      return {
        card: 'generic',
        title: `Verify: ${input.cr_id ?? '?'}`,
        kind: 'other',
        rawInput: 'Answering verification',
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: supersede_cr
// ---------------------------------------------------------------------------

/**
 * Create the `supersede_cr` tool.
 *
 * Supersede an existing entry with a correction or change.
 */
export function createSupersedeCrTool() {
  return defineTool({
    name: 'supersede_cr',
    description:
      'Supersede an existing CR-ID with a correction or change. '
      + 'The original entry is marked superseded and a new entry is created '
      + 'linked back to the original.',
    parameters: {
      original_cr_id: {
        type: 'string',
        required: true,
        description: 'The CR-ID to supersede.',
      },
      new_content: {
        type: 'string',
        required: true,
        description: 'The corrected/changed content.',
      },
      new_interaction_type: {
        type: 'string',
        required: true,
        enum: ['correction', 'change'] as const,
        description: 'The interaction type for the new entry.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          originalCrId: { type: 'string', required: true },
          newCrId: { type: 'string', required: true },
          message: { type: 'string', required: true },
        },
      } as const,
      render: (_args: unknown, value: unknown) => [{
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      }],
    },
    execute(args) {
      if (activeEngine === undefined) {
        throw new HarnessError(
          'supersede_cr: no active ledger — capture a requirement first',
          'LEDGER_NOT_INITIALIZED',
        )
      }

      const originalCrId = args.original_cr_id as CRId
      const newContent = args.new_content as string
      const newInteractionType = args.new_interaction_type as 'correction' | 'change'

      if (!newContent || newContent.trim().length === 0) {
        throw new HarnessError(
          'supersede_cr: new_content is required',
          'LEDGER_CONTENT_REQUIRED',
        )
      }

      const result = activeEngine.supersede(originalCrId, newContent, newInteractionType)

      return Promise.resolve({
        originalCrId: originalCrId as string,
        newCrId: result.entry.crId as string,
        message: result.message,
      })
    },
    presentCall(args): GenericCallView {
      const input = args as { original_cr_id?: string; new_interaction_type?: string }
      return {
        card: 'generic',
        title: `Supersede: ${input.original_cr_id ?? '?'}`,
        kind: 'other',
        rawInput: input.new_interaction_type ?? 'Superseding entry',
      }
    },
  })
}
