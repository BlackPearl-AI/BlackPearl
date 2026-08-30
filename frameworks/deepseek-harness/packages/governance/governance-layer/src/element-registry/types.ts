/**
 * Element Registry types — PHASE 09.
 *
 * Every UI element, API, print template, permission, workflow, and integration
 * receives a unique ID: `{PREFIX}-{MODULE}-{SEQ}`.
 *
 * Examples:
 *   BTN-STU-001   Button
 *   DD-STU-003    Dropdown
 *   FLD-STU-002   Field
 *   TAB-STU-001   Tab
 *   SET-STU-007   Setting
 *   MNU-STU-004   Menu
 *   API-STU-004   API endpoint
 *   PRN-STU-002   Print template
 *   PRM-STU-005   Permission
 *   WFL-STU-001   Workflow
 *   INT-STU-003   Integration
 *
 * @module @deepseek-ai/dsh-governance-layer/element-registry/types
 */

// ---------------------------------------------------------------------------
// Element Type
// ---------------------------------------------------------------------------

/** Recognised element types with their short prefix codes. */
export type ElementType =
  | 'button'
  | 'dropdown'
  | 'field'
  | 'tab'
  | 'setting'
  | 'menu'
  | 'api'
  | 'print'
  | 'permission'
  | 'workflow'
  | 'integration'

/** Prefix code for each element type (used in the unique ID). */
export const ELEMENT_TYPE_PREFIXES: Record<ElementType, string> = {
  'button': 'BTN',
  'dropdown': 'DD',
  'field': 'FLD',
  'tab': 'TAB',
  'setting': 'SET',
  'menu': 'MNU',
  'api': 'API',
  'print': 'PRN',
  'permission': 'PRM',
  'workflow': 'WFL',
  'integration': 'INT',
}

/** Human-readable labels for each element type. */
export const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  'button': 'Button',
  'dropdown': 'Dropdown',
  'field': 'Field',
  'tab': 'Tab',
  'setting': 'Setting',
  'menu': 'Menu',
  'api': 'API Endpoint',
  'print': 'Print Template',
  'permission': 'Permission',
  'workflow': 'Workflow',
  'integration': 'Integration',
}

/** Icons for each element type. */
export const ELEMENT_TYPE_ICONS: Record<ElementType, string> = {
  'button': '🔘',
  'dropdown': '📋',
  'field': '📝',
  'tab': '📑',
  'setting': '⚙️',
  'menu': '🍔',
  'api': '🔌',
  'print': '🖨️',
  'permission': '🔒',
  'workflow': '🔄',
  'integration': '🔗',
}

/** All element types in registration order. */
export const ALL_ELEMENT_TYPES: readonly ElementType[] = [
  'button', 'dropdown', 'field', 'tab', 'setting', 'menu',
  'api', 'print', 'permission', 'workflow', 'integration',
]

// ---------------------------------------------------------------------------
// Element Entry
// ---------------------------------------------------------------------------

/** Status of a registered element. */
export type ElementStatus = 'active' | 'deprecated' | 'disabled' | 'planned'

/** Status labels. */
export const ELEMENT_STATUS_LABELS: Record<ElementStatus, string> = {
  'active': 'Active',
  'deprecated': 'Deprecated',
  'disabled': 'Disabled',
  'planned': 'Planned',
}

/** Status icons. */
export const ELEMENT_STATUS_ICONS: Record<ElementStatus, string> = {
  'active': '✅',
  'deprecated': '🗑️',
  'disabled': '🚫',
  'planned': '📝',
}

/** A single registered element. */
export interface ElementEntry {
  /** Unique element ID (e.g. 'BTN-STU-001'). */
  readonly elementId: string
  /** Element type. */
  readonly type: ElementType
  /** Module prefix code (e.g. 'STU'). */
  readonly modulePrefix: string
  /** Sequential number within type+module (e.g. 1). */
  readonly sequence: number
  /** Human-readable name. */
  readonly name: string
  /** Purpose or description. */
  readonly purpose: string
  /** Current status. */
  status: ElementStatus
  /** Screen or page this element belongs to (optional). */
  readonly screen?: string
  /** Parent element ID if nested (optional). */
  readonly parentId?: string
  /** Dependencies on other element IDs. */
  readonly dependsOn?: readonly string[]
  /** Free-form metadata tags. */
  readonly tags?: readonly string[]
  /** Creation timestamp (ISO-8601). */
  readonly createdAt: string
  /** Last update timestamp (ISO-8601). */
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Element Registry
// ---------------------------------------------------------------------------

/** A complete element registry for one or more modules. */
export interface ElementRegistry {
  /** All registered elements, keyed by elementId. */
  readonly elements: Map<string, ElementEntry>
  /** Sequence counters per modulePrefix+type key. */
  readonly sequences: Map<string, number>
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/** Query filter for element lookup. */
export interface ElementQuery {
  /** Filter by module prefix (e.g. 'STU'). */
  readonly modulePrefix?: string
  /** Filter by element type. */
  readonly type?: ElementType
  /** Filter by status. */
  readonly status?: ElementStatus
  /** Search name/purpose by substring (case-insensitive). */
  readonly search?: string
  /** Filter by screen. */
  readonly screen?: string
  /** Filter by tag. */
  readonly tag?: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** A single registry violation. */
export interface RegistryViolation {
  /** Rule name. */
  readonly rule: string
  /** Severity. */
  readonly severity: 'error' | 'warning' | 'info'
  /** Human-readable message. */
  readonly message: string
  /** Element ID involved. */
  readonly elementId?: string
}

/** Validation report for the entire registry. */
export interface RegistryValidationReport {
  /** Whether the registry passes all checks. */
  readonly valid: boolean
  /** All violations. */
  readonly violations: readonly RegistryViolation[]
  /** Total elements. */
  readonly totalElements: number
  /** Elements by type. */
  readonly byType: Record<ElementType, number>
  /** Elements by status. */
  readonly byStatus: Record<ElementStatus, number>
  /** Duplicate IDs detected. */
  readonly duplicates: readonly string[]
  /** Missing dependency targets. */
  readonly missingDeps: readonly string[]
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

/** Summary statistics for the element registry. */
export interface ElementRegistrySummary {
  /** Total elements registered. */
  readonly totalElements: number
  /** Count by type. */
  readonly byType: Record<ElementType, number>
  /** Count by status. */
  readonly byStatus: Record<ElementStatus, number>
  /** Count by module prefix. */
  readonly byModule: Record<string, number>
  /** Last generated sequence per module+type. */
  readonly sequences: readonly (readonly [string, number])[]
}

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique element ID.
 *
 * Format: `{PREFIX}-{MODULE}-{SEQ}` where SEQ is zero-padded to 3 digits.
 */
export function generateElementId(prefix: string, modulePrefix: string, sequence: number): string {
  return `${prefix}-${modulePrefix}-${String(sequence).padStart(3, '0')}`
}

/**
 * Parse an element ID into its components.
 * Returns undefined if the ID does not match the expected format.
 */
export function parseElementId(elementId: string): { prefix: string; modulePrefix: string; sequence: number } | undefined {
  const match = elementId.match(/^([A-Z]{2,4})-([A-Z]{2,10})-(\d{1,6})$/)
  if (!match) return undefined
  return {
    prefix: match[1]!,
    modulePrefix: match[2]!,
    sequence: parseInt(match[3]!, 10),
  }
}

/**
 * Get the sequence key for a module prefix + element type combination.
 */
export function sequenceKey(modulePrefix: string, type: ElementType): string {
  return `${modulePrefix}:${type}`
}
