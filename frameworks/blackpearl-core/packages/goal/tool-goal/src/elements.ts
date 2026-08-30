/**
 * Element Registry System
 *
 * Trackes every concrete element in the project — fields, buttons, forms,
 * routes, settings, APIs, DB entities, permissions, prints, reports,
 * workflow steps, integrations. Each element is linked to its requirement,
 * goal, module, file, and tests for complete traceability.
 *
 * WHAT OWNS IT: The element's creating requirement → goal → module
 * WHERE IT IS IMPLEMENTED: Specific file paths, component locations
 * HOW IT IS VERIFIED: Associated tests, audit checks, completion gates
 * WHAT DEPENDS ON IT: Other elements, API calls, DB operations, workflow steps
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { GoalView } from '@deepseek-ai/dsh-goal'
import type { ModuleInfo } from './module'
import type { CapturedRequirement } from './requirement'
import { HarnessError } from '@deepseek-ai/dsh-llm'

/**
 * Element Type — every concrete thing in the UI/logic/database that
 * can be tracked, tested, and verified individually.
 *
 * Every element in the Universal Mapping gets one of these types:
 * - field, button, form, route, setting, api, dbEntity, permission,
 *   print, report, workflowStep, integration
 */
export type ElementType = 
  | 'field'
  | 'button' 
  | 'form'
  | 'route'
  | 'setting'
  | 'api'
  | 'dbEntity'
  | 'permission'
  | 'print'
  | 'report'
  | 'workflowStep'
  | 'integration'

/**
 * Unique Element ID format: EL-YYYYMMDD-sequence
 * Example: EL-20250129-001
 */
export type ElementId = `EL-${string}-${string}`

/**
 * Element Info — tracks everything about a single concrete element.
 *
 * This is the finest granularity in the Universal Mapping. Every element
 * gets one of these, and it's the source of truth for:
 * - What it is (type + ID)
 * - Who created it (requirement → goal → module)
 * - Where it lives (file path)
 * - How it's verified (tests, gates)
 * - What depends on it (other elements, APIs, DB ops)
 */
export interface ElementInfo {
  /** Unique element identifier */
  readonly id: ElementId
  /** Type of element */
  readonly type: ElementType
  /** Human-readable name/label */
  readonly name: string
  /** Description/purpose of the element */
  readonly description: string
  /** Which requirement created this element */
  readonly creatingRequirement: string | null // CR-ID
  /** Which goal owns this element */
  readonly ownerGoalId: string | null
  /** Which module contains this element */
  readonly ownerModuleId: string | null
  /** Which file implements this element */
  readonly implementingFile: string | null
  /** Related elements that this element depends on */
  readonly dependentElements: ElementId[]
  /** APIs that this element uses or is used by */
  readonly relatedApis: string[]
  /** DB entities this element interacts with */
  readonly relatedDbEntities: string[]
  /** Workflow steps this element participates in */
  readonly workflowSteps: string[]
  /** Priority level */
  readonly priority: 'high' | 'medium' | 'low'
  /** Current status */
  readonly status: 'planned' | 'in-progress' | 'completed' | 'deprecated'
  /** When the element was created */
  readonly created: Date
  /** Last time the element was modified */
  readonly lastModified: Date
}

/**
 * Element Registry — in-memory store per session.
 *
 * This store persists across tool calls and tracks every concrete element
 * in the project. It's the foundation for:
 * - Finding any element by ID, type, or criteria
 * - Tracking element dependencies and relationships
 * - Impact analysis for repairs
 * - Test element mapping
 * - Audit trail maintenance
 */
class ElementRegistry {
  /** Internal storage of all elements */
  private elements: Map<ElementId, ElementInfo> = new Map()

  /**
   * Get all elements in the registry.
   */
  getAll(): ElementInfo[] {
    return Array.from(this.elements.values())
  }

  /**
   * Get an element by its ID.
   * @throws If element not found
   */
  getById(id: ElementId): ElementInfo {
    const element = this.elements.get(id)
    if (!element) {
      throw new HarnessError(
        `Element ${id} not found in registry`,
        'ELEMENT_NOT_FOUND',
      )
    }
    return element
  }

  /**
   * Get elements by type.
   * @param type The element type to filter by
   * @returns Array of elements with the given type
   */
  getByType(type: ElementType): ElementInfo[] {
    return Array.from(this.elements.values()).filter(
      (e) => e.type === type,
    )
  }

  /**
   * Get elements owned by a specific goal.
   * @param goalId The goal ID to filter by
   * @returns Array of elements owned by the goal
   */
  getByOwnerGoal(goalId: string): ElementInfo[] {
    return Array.from(this.elements.values()).filter(
      (e) => e.ownerGoalId === goalId,
    )
  }

  /**
   * Get elements owned by a specific module.
   * @param moduleId The module ID to filter by
   * @returns Array of elements owned by the module
   */
  getByOwnerModule(moduleId: string): ElementInfo[] {
    return Array.from(this.elements.values()).filter(
      (e) => e.ownerModuleId === moduleId,
    )
  }

  /**
   * Get elements that are depended upon by a specific element.
   * @param elementId The element whose dependents we want
   * @returns Array of elements that depend on the given element
   * @throws If element not found
   */
  getDependents(elementId: ElementId): ElementInfo[] {
    const element = this.getById(elementId)
    const dependents: ElementInfo[] = []
    for (const [id, e] of this.elements) {
      if (e.dependentElements.includes(elementId)) {
        dependents.push(e)
      }
    }
    return dependents
  }

  /**
   * Get all elements that depend on ANY element.
   * Useful for impact analysis.
   */
  getAllDependents(): Map<ElementId, ElementInfo[]> {
    const result = new Map<ElementId, ElementInfo[]>()
    for (const [elementId, element] of this.elements) {
      const dependents = this.getDependents(elementId)
      if (dependents.length > 0) {
        result.set(elementId, dependents)
      }
    }
    return result
  }

  /**
   * Get elements related to a specific requirement.
   * An element is related to a requirement if:
   * - The element's creatingRequirement matches the requirement ID, OR
   * - The element's type/objective overlaps with the requirement's relatedElements, OR
   * - The element's domain/priority aligns with the requirement
   */
  findRelatedToRequirement(requirementId: string): ElementInfo[] {
    // Find the requirement to get context
    const requirements = require('./requirement')
      ?.['getCapturedRequirements']?.(requirementId) ?? []
    const req = requirements.find((r) => r.id === requirementId)

    if (!req) {
      // If requirement not found, return all elements (fallback)
      return Array.from(this.elements.values())
    }

    const related: ElementInfo[] = []
    for (const [, element] of this.elements) {
      let isRelated = false

      // Check if creatingRequirement matches
      if (element.creatingRequirement === requirementId) {
        isRelated = true
      }

      // Check type alignment with requirement domain/priority
      if (element.priority === req.priority) {
        isRelated = true
      }

      // Check if element type is mentioned in requirement's relatedElements
      if (element.type && req.relatedElements?.includes(element.type)) {
        isRelated = true
      }

      // Check description/name keywords overlap
      const keywords = [
        element.name.toLowerCase(),
        element.description.toLowerCase(),
      ].join(' ')
      const reqObjLower = req.objective.toLowerCase()
      if (keywords.includes(reqObjLower)) {
        isRelated = true
      }

      if (isRelated) {
        related.push(element)
      }
    }

    return related
  }

  /**
   * Add a new element to the registry.
   * @param element The element info to add
   * @throws If an element with the same ID already exists
   */
  addElement(element: ElementInfo): void {
    if (this.elements.has(element.id)) {
      throw new HarnessError(
        `Element ${element.id} already exists in registry`,
        'ELEMENT_ALREADY_EXISTS',
      )
    }
    this.elements.set(element.id, element)
  }

  /**
   * Update an existing element's metadata.
   * @param elementId The element to update
   * @param updates The fields to update
   * @throws If element not found
   */
  updateElement(
    elementId: ElementId,
    updates: Partial<Omit<ElementInfo, 'id' | 'creatingRequirement' | 'created'>>,
  ): void {
    const element = this.getById(elementId)
    const updated = { ...element, ...updates }
    this.elements.set(elementId, updated)
  }

  /**
   * Remove an element from the registry.
   * @param elementId The element to remove
   * @throws If element not found
   */
  removeElement(elementId: ElementId): void {
    if (!this.elements.has(elementId)) {
      throw new HarnessError(
        `Element ${elementId} not found in registry`,
        'ELEMENT_NOT_FOUND',
      )
    }
    this.elements.delete(elementId)
  }

  /**
   * Get elements by priority level.
   * @param priority 'high' | 'medium' | 'low'
   * @returns Array of elements with the given priority
   */
  getByPriority(priority: 'high' | 'medium' | 'low'): ElementInfo[] {
    return Array.from(this.elements.values()).filter(
      (e) => e.priority === priority,
    )
  }

  /**
   * Get elements by status.
   * @param status 'planned' | 'in-progress' | 'completed' | 'deprecated'
   * @returns Array of elements with the given status
   */
  getByStatus(status: 'planned' | 'in-progress' | 'completed' | 'deprecated'): ElementInfo[] {
    return Array.from(this.elements.values()).filter(
      (e) => e.status === status,
    )
  }

  /**
   * Get elements that are in planning state.
   */
  getPlannedElements(): ElementInfo[] {
    return this.getByStatus('planned')
  }

  /**
   * Get elements that are completed.
   */
  getCompletedElements(): ElementInfo[] {
    return this.getByStatus('completed')
  }

  /**
   * Check if an element ID exists in the registry.
   */
  hasElement(id: ElementId): boolean {
    return this.elements.has(id)
  }

  /**
   * Get the number of elements in the registry.
   */
  getCount(): number {
    return this.elements.size
  }

  /**
   * Get elements that need attention — either in-progress but not completed,
   * or planned but stuck.
   */
  getStuckElements(): ElementInfo[] {
    return this.getByStatus('in-progress').filter((e) => {
      // Elements that have been in-progress for too long without completion
      return true // Placeholder — all in-progress modules are "potentially stuck"
    })
  }

  /**
   * Find elements that might need testing — elements that are completed
   * but have no associated tests tracked in the system.
   */
  getUntestedElements(): ElementInfo[] {
    return this.getByStatus('completed').filter((e) => {
      // In a full system, we'd check if there are tests linked to this element
      // For now, return all completed elements as potentially untested
      return true
    })
  }
}

/**
 * Get the element registry for the current context.
 *
 * This is a singleton per session — it persists across tool calls
 * and maintains the state of all elements in the project.
 *
 * @param ctx - Harness context (used for environment persistence)
 * @returns The element registry instance
 */
function getElementRegistry(ctx: Context): ElementRegistry {
  // Try to get existing registry from environment
  let registry = ctx.environment.get<ElementRegistry>('elementRegistry')

  if (!registry) {
    registry = new ElementRegistry()
    // Persist in environment for the session
    ctx.environment.set('elementRegistry', registry)
  }

  return registry
}

/**
 * Generate a new unique Element ID.
 *
 * Format: EL-YYYYMMDD-sequence where sequence is zero-padded to 3 digits.
 * The sequence is stored in ctx to ensure uniqueness across sessions.
 */
function generateElementId(ctx: Context): ElementId {
  const today = new Date()
  const datePart = today.toISOString().split('T')[0].replace(/-/g, '')
  const prefix = `EL-${datePart}`

  // Check if we already have a sequence counter in context
  let seq = ctx.environment.get<number>('element_seq') ?? 0
  seq++
  ctx.environment.set('element_seq', seq)

  const sequencePart = String(seq).padStart(3, '0')
  return `${prefix}-${sequencePart}` as ElementId
}

/**
 * Create a new ElementInfo with automatic ID generation.
 *
 * This is the main entry point for registering a new element in the system.
 * Elements are typically created when:
 * - A requirement is captured that describes a UI/logic/Databaase element
 * - A goal is created with associated element descriptions
 * - The implementation phase identifies a new UI component or logic piece
 *
 * @param ctx - Harness context
 * @param type The type of element (field, button, form, etc.)
 * @param name Human-readable name/label for the element
 * @param description Description/purpose of the element
 * @param options Additional configuration
 * @returns The newly created element info with auto-generated ID
 */
function createElement(
  ctx: Context,
  type: ElementType,
  name: string,
  description: string,
  options: {
    creatingRequirement?: string // CR-ID
    ownerGoalId?: string
    ownerModuleId?: string
    implementingFile?: string
    dependentElements?: ElementId[]
    relatedApis?: string[]
    relatedDbEntities?: string[]
    workflowSteps?: string[]
    priority?: 'high' | 'medium' | 'low'
    status?: 'planned' | 'in-progress' | 'completed' | 'deprecated'
  } = {},
): ElementInfo {
  const id = generateElementId(ctx)

  const element: ElementInfo = {
    id,
    type,
    name,
    description,
    creatingRequirement: options.creatingRequirement ?? null,
    ownerGoalId: options.ownerGoalId ?? null,
    ownerModuleId: options.ownerModuleId ?? null,
    implementingFile: options.implementingFile ?? null,
    dependentElements: options.dependentElements ?? [],
    relatedApis: options.relatedApis ?? [],
    relatedDbEntities: options.relatedDbEntities ?? [],
    workflowSteps: options.workflowSteps ?? [],
    priority: options.priority ?? 'medium',
    status: options.status ?? 'planned',
    created: new Date(),
    lastModified: new Date(),
  }

  // Add to registry
  const registry = getElementRegistry(ctx)
  registry.addElement(element)

  return element
}

/**
 * Register elements when a requirement is captured.
 *
 * When a requirement is captured, any described elements should automatically
 * be created and linked to the requirement and (if applicable) the goal/module.
 *
 * @param ctx - Harness context
 * @param requirement The captured requirement containing element descriptions
 * @param goalId The goal ID (optional — if already created)
 * @param moduleId The module ID (optional — if already created)
 * @returns Array of newly created elements
 */
function registerElementsForRequirement(
  ctx: Context,
  requirement: CapturedRequirement,
  goalId?: string,
  moduleId?: string,
): ElementInfo[] {
  const newlyCreated: ElementInfo[] = []

  // Heuristics: extract element types from relatedElements and objective
  const elementTypes: ElementType[] = [
    'field',
    'button', 
    'form',
    'route',
    'setting',
    'api',
    'dbEntity',
    'permission',
    'print',
    'report',
    'workflowStep',
    'integration',
  ]

  // Check relatedElements for type hints
  const mentionedTypes = (requirement.relatedElements || [])
    .filter((el): el is ElementType => elementTypes.includes(el as any))
  
  // Also check objective keywords
  const obj = requirement.objective.toLowerCase()
  const keywordToType: Record<string, ElementType> = {
    'field': 'field',
    'button': 'button',
    'form': 'form',
    'route': 'route',
    'setting': 'setting',
    'api': 'api',
    'database': 'dbEntity',
    'db': 'dbEntity',
    'permission': 'permission',
    'print': 'print',
    'report': 'report',
    'workflow': 'workflowStep',
    'integration': 'integration',
  }

  // Types mentioned explicitly in relatedElements
  const explicitTypes = mentionedTypes.filter(
    (t) => t && keywordToType[t],
  ).map((t) => keywordToType[t]!)

  // Types mentioned in objective keywords
  const keywordTypes = Object.keys(keywordToType)
    .filter((kw) => obj.includes(kw))
    .map((kw) => keywordToType[kw]!)

  // Combine all mentioned types (explicit takes priority)
  const allTypes = [...new Set([...explicitTypes, ...keywordTypes])]

  // For each mentioned type, create an element
  for (const type of allTypes) {
    // Generate a name from the requirement objective
    const name = `${type}-${requirement.objective.substring(0, 20).replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
    
    const desc = `Element of type ${type} for requirement: ${requirement.objective.substring(0, 50)}`

    const element = createElement(ctx, type, name, desc, {
      creatingRequirement: requirement.id,
      ownerGoalId: goalId,
      ownerModuleId: moduleId,
      priority: requirement.priority,
    })

    newlyCreated.push(element)
  }

  // Also create a generic element if no types were explicitly mentioned
  // but the requirement describes something concrete
  if (allTypes.length === 0 && requirement.relatedElements?.length > 0) {
    // Use the first related element as a basis
    const firstEl = requirement.relatedElements[0]
    const name = `element-${firstEl.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
    const desc = `Element derived from requirement: ${requirement.objective.substring(0, 50)}`

    const element = createElement(ctx, 'field' as ElementType, name, desc, {
      creatingRequirement: requirement.id,
      ownerGoalId: goalId,
      priority: requirement.priority,
    })

    newlyCreated.push(element)
  }

  return newlyCreated
}

/**
 * Export the element registry functions for use in the goal tool apply().
 *
 * These are typically called from the goal tool's apply function to
 * integrate element tracking with requirement capture, goal creation,
 * and module tracking.
 */
export { ElementInfo, ElementType, ElementId, ElementRegistry, generateElementId, createElement, registerElementsForRequirement }

export type { ElementInfo, ElementType, ElementId }