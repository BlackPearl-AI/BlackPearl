/**
 * PHASE 14 — Vertical Slice Types
 *
 * One slice at a time. No confusion.
 *
 * Every slice = UI + API + DB + Business Logic + Mapping + Permission + Print + Integration.
 * Complete hota hai tabhi next.
 */

// ---------------------------------------------------------------------------
// Slice Status
// ---------------------------------------------------------------------------

/** Status of a vertical slice. */
export type SliceStatus =
  | 'planned'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'skipped'

// ---------------------------------------------------------------------------
// Layer Status
// ---------------------------------------------------------------------------

/** Status of an individual layer within a slice. */
export type LayerStatus =
  | 'not-started'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'skipped'

// ---------------------------------------------------------------------------
// Layer IDs
// ---------------------------------------------------------------------------

/** All 8 layer types in a vertical slice. */
export type LayerId =
  | 'ui'
  | 'api'
  | 'db'
  | 'business-logic'
  | 'mapping'
  | 'permission'
  | 'print'
  | 'integration'

/** Layer display labels. */
export const LAYER_LABELS: Record<LayerId, string> = {
  ui: 'UI',
  api: 'API',
  db: 'Database',
  'business-logic': 'Business Logic',
  mapping: 'Mapping',
  permission: 'Permission',
  print: 'Print',
  integration: 'Integration',
}

/** Required layer order (enforced during implementation). */
export const LAYER_ORDER: readonly LayerId[] = [
  'db',
  'business-logic',
  'mapping',
  'api',
  'permission',
  'ui',
  'print',
  'integration',
]

// ---------------------------------------------------------------------------
// Individual Layer
// ---------------------------------------------------------------------------

/** One layer within a vertical slice. */
export interface SliceLayer {
  /** Layer identifier. */
  readonly id: LayerId
  /** Human-readable label. */
  readonly label: string
  /** Current status. */
  status: LayerStatus
  /** Description of what this layer does in the slice. */
  readonly description: string
  /** File paths this layer creates or modifies. */
  readonly files: string[]
  /** Element IDs this layer creates or modifies. */
  readonly elementIds: string[]
  /** Validation errors for this layer. */
  errors: readonly string[]
  /** Implementation notes. */
  notes: string
}

// ---------------------------------------------------------------------------
// Slice Validation
// ---------------------------------------------------------------------------

/** Validation result for a slice. */
export interface SliceValidation {
  /** Is the slice valid for coding? */
  readonly isValid: boolean
  /** Errors blocking implementation. */
  readonly errors: readonly string[]
  /** Warnings (non-blocking). */
  readonly warnings: readonly string[]
  /** Which layers are complete. */
  readonly completedLayers: readonly LayerId[]
  /** Which layers are incomplete. */
  readonly incompleteLayers: readonly LayerId[]
  /** Layer completion percentage. */
  readonly completionPct: number
}

// ---------------------------------------------------------------------------
// Slice Traceability
// ---------------------------------------------------------------------------

/** Traceability chain linking slice to planning phases. */
export interface SliceTraceability {
  /** Conversation Requirement ID. */
  readonly crId: string
  /** Goal ID this slice satisfies. */
  readonly goalId: string
  /** Task ID being implemented. */
  readonly taskId: string
  /** Element ID being created. */
  readonly elementId: string
  /** Module ID. */
  readonly moduleId: string
}

// ---------------------------------------------------------------------------
// Vertical Slice
// ---------------------------------------------------------------------------

/** A complete vertical slice with all 8 layers. */
export interface VerticalSlice {
  /** Unique slice ID (e.g. VS-STU-001). */
  readonly id: string
  /** Human-readable name. */
  readonly name: string
  /** Module this slice belongs to. */
  readonly moduleId: string
  /** Current status. */
  status: SliceStatus
  /** Priority. */
  readonly priority: 'critical' | 'high' | 'medium' | 'low'
  /** Execution order (lower = earlier). */
  readonly order: number
  /** All 8 layers. */
  readonly layers: Record<LayerId, SliceLayer>
  /** Traceability to planning phases. */
  readonly traceability: SliceTraceability
  /** Validation state. */
  validation: SliceValidation
  /** Files created/modified by this slice. */
  readonly files: readonly string[]
  /** Test files validating this slice. */
  readonly testFiles: readonly string[]
  /** Implementation notes. */
  notes: string
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string
  /** ISO-8601 last update timestamp. */
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Slice Summary
// ---------------------------------------------------------------------------

/** Summary statistics for all slices. */
export interface SliceSummary {
  /** Total slices. */
  readonly total: number
  /** Slices by status. */
  readonly byStatus: Record<SliceStatus, number>
  /** Slices by module. */
  readonly byModule: Record<string, number>
  /** Total layers across all slices. */
  readonly totalLayers: number
  /** Completed layers. */
  readonly completedLayers: number
  /** Layer completion percentage. */
  readonly layerCompletionPct: number
  /** Overall slice completion percentage. */
  readonly sliceCompletionPct: number
}

// ---------------------------------------------------------------------------
// Slice Issue
// ---------------------------------------------------------------------------

/** Issue found during slice validation. */
export interface SliceIssue {
  /** Issue type. */
  readonly type:
    | 'layer-not-started'
    | 'layer-failed'
    | 'missing-traceability'
    | 'incomplete-dependencies'
    | 'validation-error'
    | 'missing-files'
    | 'missing-elements'
    | 'layer-order-violation'
    | 'duplicate-slice-id'
  /** Severity. */
  readonly severity: 'error' | 'warning' | 'info'
  /** Human-readable message. */
  readonly message: string
  /** Involved layer id (if applicable). */
  readonly layerId?: LayerId
}

// ---------------------------------------------------------------------------
// Engine Output
// ---------------------------------------------------------------------------

/** Full result of slice validation. */
export interface SliceValidationResult {
  /** Slice ID. */
  readonly sliceId: string
  /** Whether coding can proceed. */
  readonly canCode: boolean
  /** Issues found. */
  readonly issues: readonly SliceIssue[]
  /** Validation details. */
  readonly validation: SliceValidation
  /** ISO-8601 validation timestamp. */
  readonly validatedAt: string
}
