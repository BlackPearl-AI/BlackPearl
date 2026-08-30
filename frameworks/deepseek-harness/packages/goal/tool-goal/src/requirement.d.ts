/**
 * Requirement capture and ID generation for Universal Mapping.
 *
 * Every meaningful user requirement gets a traceable CR-ID that links it
 * to goals, modules, elements, files, dependencies, tests, and evidence.
 * No requirement stays isolated — it always has a chain back to source.
 */
/**
 * Unique Requirement ID format: CR-YYYYMMDD-sequence
 * Example: CR-20250129-001
 *
 * Ensures every requirement is globally unique and traceable.
 */
export type RequirementId = `CR-${string}-${string}`;

/**
 * Captured requirement with full mapping metadata.
 *
 * This is the entry point into the Universal Mapping chain:
 * REQUIREMENT → GOAL → MODULE → ELEMENT → FILE → DEPENDENCY → TEST → EVIDENCE → COMPLETION
 */
export interface CapturedRequirement {
  /** Unique requirement identifier */
  readonly id: RequirementId
  /** The original objective text */
  readonly objective: string
  /** Source context (project name, feature, etc.) */
  readonly source: string
  /** Creation timestamp */
  readonly created: Date
  /** Link to the master goal (if already created) */
  readonly goalId: string | null
  /** Link to parent requirement (if this is a sub-requirement) */
  readonly parentId: RequirementId | null
  /** Domain/category for filtering */
  readonly domain: string
  /** Priority level */
  readonly priority: 'high' | 'medium' | 'low'
  /** Related elements (fields, buttons, routes, etc.) */
  readonly relatedElements: string[]
  /** Related files (already identified) */
  readonly relatedFiles: string[]
}

/**
 * Generate a new unique Requirement ID.
 *
 * Format: CR-YYYYMMDD-sequence where sequence is zero-padded.
 * The sequence is stored in ctx to ensure uniqueness across sessions.
 */
function generateRequirementId(ctx: Context): RequirementId {
  const today = new Date()
  const datePart = today.toISOString().split('T')[0].replace(/-/g, '')
  const prefix = `;
//# sourceMappingURL=requirement.d.ts.map