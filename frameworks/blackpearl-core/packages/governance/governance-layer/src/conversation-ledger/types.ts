/**
 * Types for the Conversation Requirement Ledger (PHASE 03).
 *
 * Every significant user utterance — prompt, question, answer, correction,
 * approval, rejection, change, or exception — receives a permanent CR-ID
 * and a verification question for traceability.
 *
 * @module @deepseek-ai/dsh-governance-layer/conversation-ledger/types
 */

// ---------------------------------------------------------------------------
// Interaction Types
// ---------------------------------------------------------------------------

/**
 * The 8 interaction types that the ledger captures.
 *
 * Each type maps to a specific user/assistant behavior that carries
 * requirement-level significance.
 */
export type InteractionType =
  | 'prompt'
  | 'question'
  | 'answer'
  | 'correction'
  | 'approval'
  | 'rejection'
  | 'change'
  | 'exception'

/**
 * Human-readable labels for interaction types (Hindi + English).
 */
export const INTERACTION_LABELS: Record<InteractionType, string> = {
  prompt: 'Prompt — उपयोगकर्ता का प्रारंभिक निर्देश',
  question: 'Question — उपयोगकर्ता का प्रश्न',
  answer: 'Answer — सहायक का उत्तर',
  correction: 'Correction — उपयोगकर्ता का सुधार',
  approval: 'Approval — उपयोगकर्ता की स्वीकृति',
  rejection: 'Rejection — उपयोगकर्ता का अस्वीकरण',
  change: 'Change — उपयोगकर्ता की बदलाव माँग',
  exception: 'Exception — अप्रत्याशित परिस्थिति',
}

// ---------------------------------------------------------------------------
// CR-ID
// ---------------------------------------------------------------------------

/**
 * A globally unique, permanent Conversation Requirement identifier.
 *
 * Format: `CR-{modulePrefix}-{seq}` where:
 * - `modulePrefix` = 2-4 uppercase letters identifying the domain
 * - `seq` = zero-padded sequence number (4 digits)
 *
 * Examples: `CR-SCH-0001`, `CR-ERP-0042`, `CR-AI-0003`
 */
export type CRId = string & { readonly __crId: unique symbol }

/**
 * Create a validated CR-ID string.
 */
export function createCRId(modulePrefix: string, seq: number): CRId {
  if (modulePrefix.length < 2 || modulePrefix.length > 4) {
    throw new Error(`CR-ID module prefix must be 2-4 characters, got "${modulePrefix}"`)
  }
  if (!/^[A-Z]{2,4}$/.test(modulePrefix)) {
    throw new Error(`CR-ID module prefix must be uppercase A-Z, got "${modulePrefix}"`)
  }
  if (seq < 1 || seq > 9999) {
    throw new Error(`CR-ID sequence must be 1-9999, got ${seq}`)
  }
  return `CR-${modulePrefix}-${seq.toString().padStart(4, '0')}` as CRId
}

/**
 * Parse a CR-ID into its components.
 */
export function parseCRId(crId: CRId): { modulePrefix: string; seq: number } {
  const match = (crId as string).match(/^CR-([A-Z]{2,4})-(\d{4})$/)
  if (!match) {
    throw new Error(`Invalid CR-ID format: "${crId}"`)
  }
  return { modulePrefix: match[1]!, seq: parseInt(match[2]!, 10) }
}

// ---------------------------------------------------------------------------
// Verification Question
// ---------------------------------------------------------------------------

/**
 * A verification question generated for each ledger entry.
 *
 * The model (or human) must answer this question to confirm the requirement
 * was correctly captured and understood.
 */
export interface VerificationQuestion {
  /** The question text. */
  readonly question: string
  /** The expected answer pattern (regex or exact match). */
  readonly expectedPattern?: string
  /** Whether the question has been answered. */
  readonly answered: boolean
  /** The answer provided (if any). */
  readonly answer?: string
  /** Whether the answer was verified correct. */
  readonly verified: boolean
}

// ---------------------------------------------------------------------------
// Ledger Entry
// ---------------------------------------------------------------------------

/**
 * A single captured conversation requirement entry.
 *
 * Every significant user utterance gets one of these with a permanent CR-ID.
 */
export interface LedgerEntry {
  /** The permanent CR-ID. */
  readonly crId: CRId
  /** Sequence number (monotonically increasing within a module). */
  readonly seq: number
  /** ISO-8601 timestamp of when the entry was captured. */
  readonly timestamp: string
  /** The interaction type classification. */
  readonly interactionType: InteractionType
  /** The original content/utterance. */
  readonly content: string
  /** Who said it: user, assistant, or system. */
  readonly role: 'user' | 'assistant' | 'system'
  /** Module prefix for this ledger. */
  readonly modulePrefix: string
  /** Tags for categorization/filtering. */
  readonly tags: readonly string[]
  /** The verification question for this entry. */
  readonly verification: VerificationQuestion
  /** Related CR-IDs (e.g., correction relates to the original). */
  readonly relatedCrIds: readonly CRId[]
  /** Additional metadata (key-value pairs). */
  readonly metadata: Readonly<Record<string, string>>
  /** Whether this entry has been superseded by a later correction/change. */
  readonly superseded: boolean
  /** The CR-ID that superseded this one (if superseded). */
  readonly supersededBy?: CRId
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

/**
 * The complete Conversation Requirement Ledger.
 *
 * Maintains a chronological record of all captured requirements with
 * permanent CR-IDs and verification status.
 */
export interface ConversationLedger {
  /** All ledger entries, in capture order. */
  readonly entries: readonly LedgerEntry[]
  /** Total requirements captured (may differ from entries.length if some are superseded). */
  readonly totalRequirements: number
  /** Number of requirements with verified answers. */
  readonly verifiedCount: number
  /** Number of requirements pending verification. */
  readonly pendingCount: number
  /** The module prefix for this ledger. */
  readonly modulePrefix: string
  /** Next sequence number to assign. */
  readonly nextSeq: number
  /** When the ledger was created. */
  readonly createdAt: string
  /** When the ledger was last updated. */
  readonly updatedAt: string
}

// ---------------------------------------------------------------------------
// Capture Input
// ---------------------------------------------------------------------------

/**
 * Input for capturing a new conversation requirement.
 */
export interface CaptureInput {
  /** The content/utterance to capture. */
  readonly content: string
  /** The interaction type. */
  readonly interactionType: InteractionType
  /** Who said it. */
  readonly role: 'user' | 'assistant' | 'system'
  /** Optional tags for categorization. */
  readonly tags?: readonly string[]
  /** CR-IDs of related entries. */
  readonly relatedCrIds?: readonly CRId[]
  /** Additional metadata. */
  readonly metadata?: Readonly<Record<string, string>>
}

/**
 * Result of capturing a new requirement.
 */
export interface CaptureResult {
  /** The newly created entry. */
  readonly entry: LedgerEntry
  /** The verification question generated for this entry. */
  readonly verification: VerificationQuestion
  /** Summary message. */
  readonly message: string
}

// ---------------------------------------------------------------------------
// Query Types
// ---------------------------------------------------------------------------

/**
 * Filter criteria for querying the ledger.
 */
export interface LedgerQuery {
  /** Filter by interaction type. */
  readonly interactionType?: InteractionType
  /** Filter by role. */
  readonly role?: 'user' | 'assistant' | 'system'
  /** Filter by tag (entries must contain this tag). */
  readonly tag?: string
  /** Filter by verification status. */
  readonly verificationStatus?: 'pending' | 'verified' | 'failed'
  /** Filter by superseded status. */
  readonly includeSuperseded?: boolean
  /** Search content by substring. */
  readonly contentSearch?: string
  /** Maximum entries to return (default: all). */
  readonly limit?: number
}

/**
 * Summary statistics for the ledger.
 */
export interface LedgerSummary {
  /** Total entries. */
  readonly totalEntries: number
  /** Active (non-superseded) entries. */
  readonly activeEntries: number
  /** Superseded entries. */
  readonly supersededEntries: number
  /** Breakdown by interaction type. */
  readonly byType: Readonly<Record<InteractionType, number>>
  /** Breakdown by role. */
  readonly byRole: Readonly<Record<'user' | 'assistant' | 'system', number>>
  /** Verification stats. */
  readonly verification: {
    readonly total: number
    readonly verified: number
    readonly pending: number
    readonly failed: number
  }
}
