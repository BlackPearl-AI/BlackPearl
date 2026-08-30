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
import type { Context } from '@deepseek-ai/cordis';
import type { CapturedRequirement } from './requirement';
/**
 * Unique Module ID format: MOD-YYYYMMDD-sequence
 * Example: MOD-20250129-001
 */
export type ModuleId = `MOD-${string}-${string}`;
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
    readonly id: ModuleId;
    /** Human-readable name */
    readonly name: string;
    /** Description/purpose of the module */
    readonly description: string;
    /** Which goal owns this module (null if unowned/orphan) */
    readonly ownerGoalId: string | null;
    /** Which modules depend on this module */
    readonly dependentModules: ModuleId[];
    /** Which elements belong to this module */
    readonly relatedElements: string[];
    /** Which APIs are provided by this module */
    readonly relatedApis: string[];
    /** Which DB entities are used by this module */
    readonly relatedDbEntities: string[];
    /** Which workflow steps are implemented by this module */
    readonly workflowSteps: string[];
    /** Priority level for scheduling and resource allocation */
    readonly priority: 'high' | 'medium' | 'low';
    /** Current status of the module */
    readonly status: 'planned' | 'in-progress' | 'completed' | 'deprecated';
    /** When the module was created */
    readonly created: Date;
    /** Last time the module was modified */
    readonly lastModified: Date;
    /** Which captured requirement created this module */
    readonly creatingRequirement: string | null;
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
declare class ModuleRegistry {
    /** Internal storage of all modules */
    private modules;
    /**
     * Get all modules in the registry.
     */
    getAll(): ModuleInfo[];
    /**
     * Get a module by its ID.
     * @throws If module not found
     */
    getById(id: ModuleId): ModuleInfo;
    /**
     * Get modules owned by a specific goal.
     * @param goalId The goal ID to filter by
     * @returns Array of modules owned by the goal
     */
    getByOwnerGoal(goalId: string): ModuleInfo[];
    /**
     * Get modules that are depended upon by a specific module.
     * @param moduleId The module whose dependents we want
     * @returns Array of modules that depend on the given module
     * @throws If module not found
     */
    getDependents(moduleId: ModuleId): ModuleInfo[];
    /**
     * Get all modules that depend on ANY module.
     * Useful for impact analysis.
     */
    getAllDependents(): Map<ModuleId, ModuleInfo[]>;
    /**
     * Add a new module to the registry.
     * @param module The module info to add
     * @throws If a module with the same ID already exists
     */
    addModule(module: ModuleInfo): void;
    /**
     * Update an existing module's metadata.
     * Only certain fields can be updated; the ID and core metadata are immutable.
     * @param moduleId The module to update
     * @param updates The fields to update
     * @throws If module not found
     */
    updateModule(moduleId: ModuleId, updates: Partial<Omit<ModuleInfo, 'id' | 'creatingRequirement' | 'created'>>): void;
    /**
     * Remove a module from the registry.
     * @param moduleId The module to remove
     * @throws If module not found
     */
    removeModule(moduleId: ModuleId): void;
    /**
     * Get modules by priority level.
     * @param priority 'high' | 'medium' | 'low'
     * @returns Array of modules with the given priority
     */
    getByPriority(priority: 'high' | 'medium' | 'low'): ModuleInfo[];
    /**
     * Get modules by status.
     * @param status 'planned' | 'in-progress' | 'completed' | 'deprecated'
     * @returns Array of modules with the given status
     */
    getByStatus(status: 'planned' | 'in-progress' | 'completed' | 'deprecated'): ModuleInfo[];
    /**
     * Get modules that are in planning state (not yet started).
     */
    getPlannedModules(): ModuleInfo[];
    /**
     * Get modules that are completed.
     */
    getCompletedModules(): ModuleInfo[];
    /**
     * Check if a module ID exists in the registry.
     */
    hasModule(id: ModuleId): boolean;
    /**
     * Get the number of modules in the registry.
     */
    getCount(): number;
    /**
     * Get modules that need attention — either in-progress but not completed,
     * or planned but stuck.
     */
    getStuckModules(): ModuleInfo[];
    /**
     * Find modules related to a specific requirement.
     * A requirement is related to a module if:
     * - The requirement's creatingRequirement matches the module ID, OR
     * - The requirement's relatedElements overlap with the module's relatedElements, OR
     * - The requirement's domain matches the module's purpose
     */
    findRelatedToRequirement(requirementId: string): ModuleInfo[];
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
declare function getModuleRegistry(ctx: Context): ModuleRegistry;
/**
 * Generate a new unique Module ID.
 *
 * Format: MOD-YYYYMMDD-sequence where sequence is zero-padded to 3 digits.
 * The sequence is stored in ctx to ensure uniqueness across sessions.
 */
declare function generateModuleId(ctx: Context): ModuleId;
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
declare function createModule(ctx: Context, name: string, description: string, options?: {
    ownerGoalId?: string;
    relatedElements?: string[];
    relatedApis?: string[];
    relatedDbEntities?: string[];
    workflowSteps?: string[];
    priority?: 'high' | 'medium' | 'low';
    status?: 'planned' | 'in-progress' | 'completed' | 'deprecated';
    creatingRequirement?: string;
}): ModuleInfo;
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
declare function registerModulesForGoal(ctx: Context, goalId: string, requirements?: CapturedRequirement[]): ModuleInfo[];
/**
 * Export the module registry functions for use in the goal tool apply().
 *
 * These are typically called from the goal tool's apply function to
 * integrate module tracking with goal creation and requirement capture.
 */
export { ModuleInfo, ModuleId, ModuleRegistry, generateModuleId, createModule, registerModulesForGoal, getModuleRegistry };
export type { ModuleInfo, ModuleId };
//# sourceMappingURL=module.d.ts.map