/**
 * Conversation Requirement Ledger — PHASE 03.
 *
 * Every significant user utterance receives a permanent CR-ID and a
 * verification question for traceability.
 *
 * @module @deepseek-ai/dsh-governance-layer/conversation-ledger
 */

export { ConversationLedgerEngine } from './engine.ts'

export {
  createCaptureRequirementTool,
  createGetLedgerTool,
  createQueryCrTool,
  createAnswerVerificationTool,
  createSupersedeCrTool,
  getActiveEngine,
  resetEngine,
} from './tools.ts'

export type {
  CRId,
  InteractionType,
  VerificationQuestion,
  LedgerEntry,
  ConversationLedger,
  CaptureInput,
  CaptureResult,
  LedgerQuery,
  LedgerSummary,
} from './types.ts'

export {
  createCRId,
  parseCRId,
  INTERACTION_LABELS,
} from './types.ts'
