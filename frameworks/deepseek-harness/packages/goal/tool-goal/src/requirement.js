/**
 * Requirement capture and ID generation for Universal Mapping.
 *
 * Every meaningful user requirement gets a traceable CR-ID that links it
 * to goals, modules, elements, files, dependencies, tests, and evidence.
 * No requirement stays isolated — it always has a chain back to source.
 */
CR - $;
{
    datePart;
}
`

  // Check if we already have a sequence counter in context
  let seq = ctx.environment.get<number>('requirement_seq') ?? 0
  seq++
  ctx.environment.set('requirement_seq', seq)

  const sequencePart = String(seq).padStart(3, '0')
  return `;
$;
{
    prefix;
}
-$;
{
    sequencePart;
}
` as RequirementId
}

/**
 * Capture a user requirement and link it to the universal mapping chain.
 *
 * This is the primary entry point for converting user speech/text into
 * structured, traceable requirements that feed into goal breakdown,
 * architecture design, implementation, and verification.
 *
 * @param ctx - Harness context that owns the requirement policy
 * @param objective - The user's requirement description
 * @param options - Additional context for mapping
 * @returns The captured requirement with its CR-ID and initial mappings
 *
 * Throws if objective is empty or missing.
 */
export function captureRequirement(
  ctx: Context,
  objective: string,
  options: {
    source?: string
    domain?: string
    priority?: 'high' | 'medium' | 'low'
    relatedElements?: string[]
    relatedFiles?: string[]
  } = {},
): CapturedRequirement {
  if (!objective || objective.trim().length === 0) {
    throw new HarnessError('Requirement objective cannot be empty', 'REQUIREMENT_EMPTY')
  }

  if (!options.source) {
    throw new HarnessError('Requirement source/project must be specified', 'REQUIREMENT_MISSING_SOURCE')
  }

  const id = generateRequirementId(ctx)
  const now = new Date()

  const requirement: CapturedRequirement = {
    id,
    objective: objective.trim(),
    source: options.source,
    created: now,
    goalId: null,
    parentId: null,
    domain: options.domain || 'general',
    priority: options.priority || 'medium',
    relatedElements: options.relatedElements || [],
    relatedFiles: options.relatedFiles || [],
  }

  // Register the requirement in the context for tracking
  // This ensures it persists and is accessible throughout the session
  const requirements = ctx.environment.get<CapturedRequirement[]>('capturedRequirements') ?? []
  requirements.push(requirement)
  ctx.environment.set('capturedRequirements', requirements)

  // Auto-create a goal if this is the first requirement for a project
  // The goal creation is handled separately, but we seed the linkage here
  // by setting goalId to null — the goal creation step will fill this in

  return requirement
}

/**
 * Link a captured requirement to a goal.
 *
 * Once a goal is created (or already exists), this function updates the
 * requirement's goalId to establish the full chain:
 * REQUIREMENT ID → GOAL → ...
 *
 * @param ctx - Harness context
 * @param requirementId - The CR-ID of the requirement to link
 * @param goalId - The goal ID to link to
 * @throws If the requirement doesn't exist
 */
export function linkRequirementToGoal(
  ctx: Context,
  requirementId: RequirementId,
  goalId: string,
): void {
  const requirements = ctx.environment.get<CapturedRequirement[]>('capturedRequirements') ?? []
  const req = requirements.find((r) => r.id === requirementId)

  if (!req) {
    throw new HarnessError(
      `;
Requirement;
$;
{
    requirementId;
}
not;
found in captured;
requirements `,
      'REQUIREMENT_NOT_FOUND',
    )
  }

  req.goalId = goalId
  ctx.environment.set('capturedRequirements', requirements)
}

/**
 * Get all captured requirements for the current context.
 *
 * Useful for audits, blueprint generation, and ensuring no requirement
 * is lost during project decomposition.
 *
 * @param ctx - Harness context
 * @returns Array of all captured requirements with full mapping metadata
 */
export function getCapturedRequirements(ctx: Context): CapturedRequirement[] {
  return ctx.environment.get<CapturedRequirement[]>('capturedRequirements') ?? []
}

/**
 * Validate that a requirement has complete mapping chain coverage.
 *
 * Checks that the requirement has:
 * - A valid CR-ID
 - A source project
 - A linked goal (or goal creation pending)
 - Related elements identified
 - A priority assigned
 *
 * @param ctx - Harness context
 * @param requirementId - The CR-ID to validate
 * @returns Validation result with any missing links
 */
export function validateRequirementChain(
  ctx: Context,
  requirementId: RequirementId,
): {
  valid: boolean
  missing: string[]
  warnings: string[]
} {
  const requirements = ctx.environment.get<CapturedRequirement[]>('capturedRequirements') ?? []
  const req = requirements.find((r) => r.id === requirementId)

  const missing: string[] = []
  const warnings: string[] = []

  if (!req) {
    return {
      valid: false,
      missing: ['requirement not found'],
      warnings: [],
    }
  }

  // Check CR-ID format
  if (!/^CR-\d{8}-\d{3}$/.test(req.id)) {
    missing.push('invalid CR-ID format')
  }

  // Check source is set
  if (!req.source) {
    missing.push('missing source/project')
  }

  // Check goal linkage
  if (!req.goalId) {
    missing.push('not linked to a goal')
    // This is a warning, not error — goal may be created later
    warnings.push('goal will be linked during goal creation step')
  }

  // Check related elements
  if (req.relatedElements.length === 0) {
    warnings.push('no related elements identified yet')
  }

  // Check priority
  if (!['high', 'medium', 'low'].includes(req.priority)) {
    missing.push('invalid priority level')
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}

/**
 * Export the requirement capture as a tool for the model-facing goal system.
 *
 * This tool can be registered via ctx.tools.register() and called by the
 * model to capture requirements during natural conversation.
 *
 * @param objective - The requirement text from user
 * @param source - Project/domain name
 * @param domain - Optional domain classification
 * @param priority - Optional priority level
 * @param relatedElements - Optional list of related element IDs
 * @param relatedFiles - Optional list of related file paths
 * @returns The captured requirement with CR-ID and mapping metadata
 */
export function requirementTool(
  objective: string,
  source: string,
  domain?: string,
  priority?: 'high' | 'medium' | 'low',
  relatedElements?: string[],
  relatedFiles?: string[],
): CapturedRequirement {
  // This would be called within a ctx.apply() context
  // For now, we throw to indicate it needs ctx context
  throw new HarnessError(
    'requirementTool requires a Context — use captureRequirement(ctx, objective, options) instead',
    'REQUIREMENT_NEEDS_CONTEXT',
  )
}

export { type CapturedRequirement, type RequirementId };
export {};
//# sourceMappingURL=requirement.js.map