/**
 * Module Registry System
 *
 * Trackes all modules in the project with their relationships to goals,
 * elements, APIs, databases, and workflows. This forms the backbone of
 * the Universal Mapping system — every module is findable, traceable, and
 * connected to the requirement that created it.
 *
 * WHAT OWNS IT: The goal that created this module
 * WHAT DEPENDS ON IT: Other modules, elements, APIs that this module provides
 * WHERE IT IS IMPLEMENTED: File paths, component locations
 * HOW IT IS VERIFIED: Tests, audit checks, completion gates
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { GoalView } from '@deepseek-ai/dsh-goal'
import type { CapturedRequirement } from './requirement'
import { HarnessError } from '@deepseek-ai/dsh-llm'

/**
 * Unique Module ID format: MOD-YYYYMMDD-sequence
 * Example: MOD-20250129-001
 */
export type ModuleId = `MOD-${string}-${string}`

/**
 * Module info — tracks everything about a module in the project.
 *
 * This is the central registry entry for Universal Mapping.
 * Every module gets one of these, and it's the source of truth for:
 * - Who owns it (goal)
 * - What depends on it
 * - Where it's implemented
 * - How it's verified
 * - What its priority and status are
 */
export interface ModuleInfo {
  /** Unique module identifier */
  readonly id: ModuleId
  /** Human-readable name */
  readonly name: string
  /** Description/purpose of the module */
  readonly description: string
  /** Which goal owns this module (null if unowned/orphan) */
  readonly ownerGoalId: string | null
  /** Which modules depend on this module */
  readonly dependentModules: ModuleId[]
  /** Which elements belong to this module */
  readonly relatedElements: string[]
  /** Which APIs are provided by this module */
  readonly relatedApis: string[]
  /** Which DB entities are used by this module */
  readonly relatedDbEntities: string[]
  /** Which workflow steps are implemented by this module */
  readonly workflowSteps: string[]
  /** Priority level for scheduling and resource allocation */
  readonly priority: 'high' | 'medium' | 'low'
  /** Current status of the module */
  readonly status: 'planned' | 'in-progress' | 'completed' | 'deprecated'
  /** When the module was created */
  readonly created: Date
  /** Last time the module was modified */
  readonly lastModified: Date
  /** Which captured requirement created this module */
  readonly creatingRequirement: string | null // CR-ID
}

/**
 * Module registry — in-memory store per session.
 *
 * This store persists across tool calls within a session and provides:
 * - Add/update modules
 * - Find modules by various criteria
 * - Get modules owned by a specific goal
 * - Get modules that are depended upon
 * - Get modules by priority/status
 */
class ModuleRegistry {
  /** Internal storage of all modules */
  private modules: Map<ModuleId, ModuleInfo> = new Map()

  /**
   * Get all modules in the registry.
   */
  getAll(): ModuleInfo[] {
    return Array.from(this.modules.values())
  }

  /**
   * Get a module by its ID.
   * @throws If module not found
   */
  getById(id: ModuleId): ModuleInfo {
    const module = this.modules.get(id)
    if (!module) {
      throw new HarnessError(
        `Module ${id} not found in registry`,
        'MODULE_NOT_FOUND',
      )
    }
    return module
  }

  /**
   * Get modules owned by a specific goal.
   * @param goalId The goal ID to filter by
   * @returns Array of modules owned by the goal
   */
  getByOwnerGoal(goalId: string): ModuleInfo[] {
    return Array.from(this.modules.values()).filter(
      (m) => m.ownerGoalId === goalId,
    )
  }

  /**
   * Get modules that are depended upon by a specific module.
   * @param moduleId The module whose dependents we want
   * @returns Array of modules that depend on the given module
   * @throws If module not found
   */
  getDependents(moduleId: ModuleId): ModuleInfo[] {
    const module = this.getById(moduleId)
    const dependents: ModuleInfo[] = []
    for (const [id, m] of this.modules) {
      if (m.dependentModules.includes(moduleId)) {
        dependents.push(m)
      }
    }
    return dependents
  }

  /**
   * Get all modules that depend on ANY module.
   * Useful for impact analysis.
   */
  getAllDependents(): Map<ModuleId, ModuleInfo[]> {
    const result = new Map<ModuleId, ModuleInfo[]>()
    for (const [moduleId, module] of this.modules) {
      const dependents = this.getDependents(moduleId)
      if (dependents.length > 0) {
        result.set(moduleId, dependents)
      }
    }
    return result
  }

  /**
   * Add a new module to the registry.
   * @param module The module info to add
   * @throws If a module with the same ID already exists
   */
  addModule(module: ModuleInfo): void {
    if (this.modules.has(module.id)) {
      throw new HarnessError(
        `Module ${module.id} already exists in registry`,
        'MODULE_ALREADY_EXISTS',
      )
    }
    this.modules.set(module.id, module)
  }

  /**
   * Update an existing module's metadata.
   * Only certain fields can be updated; the ID and core metadata are immutable.
   * @param moduleId The module to update
   * @param updates The fields to update
   * @throws If module not found
   */
  updateModule(
    moduleId: ModuleId,
    updates: Partial<Omit<ModuleInfo, 'id' | 'creatingRequirement' | 'created'>>,
  ): void {
    const module = this.getById(moduleId)
    const updated = { ...module, ...updates }
    this.modules.set(moduleId, updated)
  }

  /**
   * Remove a module from the registry.
   * @param moduleId The module to remove
   * @throws If module not found
   */
  removeModule(moduleId: ModuleId): void {
    if (!this.modules.has(moduleId)) {
      throw new HarnessError(
        `Module ${moduleId} not found in registry`,
        'MODULE_NOT_FOUND',
      )
    }
    this.modules.delete(moduleId)
  }

  /**
   * Get modules by priority level.
   * @param priority 'high' | 'medium' | 'low'
   * @returns Array of modules with the given priority
   */
  getByPriority(priority: 'high' | 'medium' | 'low'): ModuleInfo[] {
    return Array.from(this.modules.values()).filter(
      (m) => m.priority === priority,
    )
  }

  /**
   * Get modules by status.
   * @param status 'planned' | 'in-progress' | 'completed' | 'deprecated'
   * @returns Array of modules with the given status
   */
  getByStatus(status: 'planned' | 'in-progress' | 'completed' | 'deprecated'): ModuleInfo[] {
    return Array.from(this.modules.values()).filter(
      (m) => m.status === status,
    )
  }

  /**
   * Get modules that are in planning state (not yet started).
   */
  getPlannedModules(): ModuleInfo[] {
    return this.getByStatus('planned')
  }

  /**
   * Get modules that are completed.
   */
  getCompletedModules(): ModuleInfo[] {
    return this.getByStatus('completed')
  }

  /**
   * Check if a module ID exists in the registry.
   */
  hasModule(id: ModuleId): boolean {
    return this.modules.has(id)
  }

  /**
   * Get the number of modules in the registry.
   */
  getCount(): number {
    return this.modules.size
  }

  /**
   * Get modules that need attention — either in-progress but not completed,
   * or planned but stuck.
   */
  getStuckModules(): ModuleInfo[] {
    return this.getByStatus('in-progress').filter((m) => {
      // Modules that have been in-progress for too long without completion
      // This is a simple check — in a full system, we'd check timestamps
      return true // Placeholder — all in-progress modules are "potentially stuck"
    })
  }

  /**
   * Find modules related to a specific requirement.
   * A requirement is related to a module if:
   * - The requirement's creatingRequirement matches the module ID, OR
   * - The requirement's relatedElements overlap with the module's relatedElements, OR
   * - The requirement's domain matches the module's purpose
   */
  findRelatedToRequirement(requirementId: string): ModuleInfo[] {
    // Find the requirement to get context
    const requirements = require('./requirement')
      ?.['getCapturedRequirements']?.(requirementId) ?? []
    const req = requirements.find((r) => r.id === requirementId)

    if (!req) {
      // If requirement not found, return all modules (fallback)
      return Array.from(this.modules.values())
    }

    const related: ModuleInfo[] = []
    for (const [, module] of this.modules) {
      let isRelated = false

      // Check if creatingRequirement matches
      if (module.creatingRequirement === requirementId) {
        isRelated = true
      }

      // Check element overlap
      if (module.relatedElements.some((el) =>
        req.relatedElements?.includes(el) || el.includes(req.objective?.substring(0, 20) || ''),
      )) {
        isRelated = true
      }

      // Check priority alignment
      if (module.priority === req.priority) {
        isRelated = true
      }

      // Check domain alignment
      if (module.description.toLowerCase().includes(req.domain?.toLowerCase() || '')) {
        isRelated = true
      }

      if (isRelated) {
        related.push(module)
      }
    }

    return related
  }
}

/**
 * Get the module registry for the current context.
 *
 * This is a singleton per session — it persists across tool calls
 * and maintains the state of all modules in the project.
 *
 * @param ctx - Harness context (used for environment persistence)
 * @returns The module registry instance
 */
function getModuleRegistry(ctx: Context): ModuleRegistry {
  // Try to get existing registry from environment
  let registry = ctx.environment.get<ModuleRegistry>('moduleRegistry')

  if (!registry) {
    registry = new ModuleRegistry()
    // Persist in environment for the session
    ctx.environment.set('moduleRegistry', registry)
  }

  return registry
}

/**
 * Generate a new unique Module ID.
 *
 * Format: MOD-YYYYMMDD-sequence where sequence is zero-padded to 3 digits.
 * The sequence is stored in ctx to ensure uniqueness across sessions.
 */
function generateModuleId(ctx: Context): ModuleId {
  const today = new Date()
  const datePart = today.toISOString().split('T')[0].replace(/-/g, '')
  const prefix = `MOD-${datePart}`

  // Check if we already have a sequence counter in context
  let seq = ctx.environment.get<number>('module_seq') ?? 0
  seq++
  ctx.environment.set('module_seq', seq)

  const sequencePart = String(seq).padStart(3, '0')
  return `${prefix}-${sequencePart}` as ModuleId
}

/**
 * Create a new ModuleInfo with automatic ID generation.
 *
 * This is the main entry point for registering a new module in the system.
 * Modules are typically created when:
 * - A goal is created with associated requirements
 * - A requirement is captured that describes a module
 * - The implementation phase identifies a new module boundary
 *
 * @param ctx - Harness context
 * @param name Human-readable module name
 * @param description Module purpose/description
 * @param options Additional configuration
 * @returns The newly created module info with auto-generated ID
 */
function createModule(
  ctx: Context,
  name: string,
  description: string,
  options: {
    ownerGoalId?: string
    relatedElements?: string[]
    relatedApis?: string[]
    relatedDbEntities?: string[]
    workflowSteps?: string[]
    priority?: 'high' | 'medium' | 'low'
    status?: 'planned' | 'in-progress' | 'completed' | 'deprecated'
    creatingRequirement?: string // CR-ID
  } = {},
): ModuleInfo {
  const id = generateModuleId(ctx)

  const module: ModuleInfo = {
    id,
    name,
    description,
    ownerGoalId: options.ownerGoalId ?? null,
    dependentModules: [],
    relatedElements: options.relatedElements ?? [],
    relatedApis: options.relatedApis ?? [],
    relatedDbEntities: options.relatedDbEntities ?? [],
    workflowSteps: options.workflowSteps ?? [],
    priority: options.priority ?? 'medium',
    status: options.status ?? 'planned',
    created: new Date(),
    lastModified: new Date(),
    creatingRequirement: options.creatingRequirement ?? null,
  }

  // Add to registry
  const registry = getModuleRegistry(ctx)
  registry.addModule(module)

  return module
}

/**
 * Register a module when a goal is created.
 *
 * When a goal is created, any captured requirements that describe
 * module boundaries should automatically create modules linked to that goal.
 *
 * @param ctx - Harness context
 * @param goalId The goal ID just created
 * @param requirements The captured requirements to check for module creation
 * @returns Array of newly created modules
 */
function registerModulesForGoal(
  ctx: Context,
  goalId: string,
  requirements: CapturedRequirement[] = [],
): ModuleInfo[] {
  const newlyCreated: ModuleInfo[] = []

  for (const req of requirements) {
    // Check if this requirement describes a module boundary
    const domain = req.domain.toLowerCase()
    const objective = req.objective.toLowerCase()

    // Heuristics: if domain or objective mentions module-like concepts
    const moduleKeywords = [
      'module',
      'component',
      'service',
      'api',
      'controller',
      'handler',
      'feature',
      'section',
    ]

    const isModuleLike =
      moduleKeywords.some((kw) => objective.includes(kw)) ||
      (req.domain && moduleKeywords.some((kw) => req.domain.includes(kw))) ||
      req.relatedElements?.some(
        (el) =>
          el.toLowerCase().includes('module') ||
          el.toLowerCase().includes('component'),
      )

    if (isModuleLike) {
      const module = createModule(ctx, req.objective, req.objective, {
        ownerGoalId: goalId,
        relatedElements: req.relatedElements ?? [],
        priority: req.priority,
        creatingRequirement: req.id,
      })

      newlyCreated.push(module)
    }
  }

  return newlyCreated
}

/**
 * Export the module registry functions for use in the goal tool apply().
 *
 * These are typically called from the goal tool's apply function to
 * integrate module tracking with goal creation and requirement capture.
 */
export { ModuleInfo, ModuleId, ModuleRegistry, generateModuleId, createModule, registerModulesForGoal, getModuleRegistry }

export type { ModuleInfo, ModuleId }