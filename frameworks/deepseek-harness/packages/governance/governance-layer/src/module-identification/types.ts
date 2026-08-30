/**
 * Types for the Master Module Identification Engine (PHASE 05).
 *
 * Responsibilities:
 * 1. Identify foundation modules that must be completed first.
 * 2. Register master data definitions (canonical field names, types, keywords).
 * 3. Maintain a naming registry to prevent inconsistencies.
 * 4. Enforce dependency gates — dependent modules cannot start until
 *    foundation modules are complete.
 *
 * Example: School ERP
 *   Foundation: Student Master + Enrollment
 *   Dependent:  Fees, Attendance, Exam, Documents
 *   Rule:       Fees cannot start until Student Master + Enrollment are complete.
 *
 * @module @deepseek-ai/dsh-governance-layer/module-identification/types
 */

// ---------------------------------------------------------------------------
// Field Types
// ---------------------------------------------------------------------------

/** Canonical field data types. */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'enum'
  | 'json'
  | 'reference'
  | 'computed'

/** Human-readable labels for field types. */
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  string: 'Text',
  number: 'Number',
  boolean: 'Boolean',
  date: 'Date',
  datetime: 'Date + Time',
  email: 'Email',
  phone: 'Phone',
  enum: 'Enum (dropdown)',
  json: 'JSON (structured)',
  reference: 'Reference (FK)',
  computed: 'Computed (derived)',
}

// ---------------------------------------------------------------------------
// Field Definition
// ---------------------------------------------------------------------------

/**
 * A canonical field definition within a master data entity.
 *
 * Every field gets a canonical name, display name, type, and keywords
 * to ensure consistency across the entire system.
 */
export interface FieldDefinition {
  /** Canonical field name (e.g., "studentId", "registrationDate"). */
  readonly name: string
  /** Display label (e.g., "Student ID", "Registration Date"). */
  readonly displayName: string
  /** Data type. */
  readonly type: FieldType
  /** Whether the field is required. */
  readonly required: boolean
  /** Whether the field is unique. */
  readonly unique: boolean
  /** Primary key flag. */
  readonly isPrimaryKey: boolean
  /** Foreign key reference (entity name if type is 'reference'). */
  readonly references?: string
  /** Allowed values for enum type. */
  readonly enumValues?: readonly string[]
  /** Default value (as string). */
  readonly defaultValue?: string
  /** Validation regex pattern. */
  readonly pattern?: string
  /** Minimum length / minimum value. */
  readonly min?: number
  /** Maximum length / maximum value. */
  readonly max?: number
  /** Human-readable description. */
  readonly description: string
  /** Keywords for search and matching. */
  readonly keywords: readonly string[]
}

// ---------------------------------------------------------------------------
// Master Data Entity
// ---------------------------------------------------------------------------

/**
 * A master data entity definition.
 *
 * Represents the canonical data model for a module's core entity.
 * All code, APIs, UI, and tests must reference these exact names.
 */
export interface MasterDataEntity {
  /** Unique entity ID (e.g., "student-master", "enrollment"). */
  readonly id: string
  /** Human-readable entity name. */
  readonly name: string
  /** Entity description. */
  readonly description: string
  /** The module this entity belongs to. */
  readonly moduleId: string
  /** All fields in this entity. */
  readonly fields: readonly FieldDefinition[]
  /** Keywords for this entity. */
  readonly keywords: readonly string[]
  /** When this entity was registered. */
  readonly registeredAt: string
}

// ---------------------------------------------------------------------------
// Naming Registry
// ---------------------------------------------------------------------------

/**
 * A canonical name entry in the naming registry.
 *
 * Maps all acceptable variants to one canonical form.
 */
export interface NamingEntry {
  /** The canonical (normalized) form. */
  readonly canonical: string
  /** All known variants (including the canonical). */
  readonly variants: readonly string[]
  /** Category (e.g., "field", "entity", "api", "ui"). */
  readonly category: string
  /** Description of what this name refers to. */
  readonly description: string
}

// ---------------------------------------------------------------------------
// Module Definition
// ---------------------------------------------------------------------------

/** Module type classification. */
export type ModuleType =
  | 'foundation'   // Must be completed before dependent modules
  | 'dependent'    // Requires foundation modules
  | 'standalone'   // No dependencies

/** Module completion status. */
export type ModuleCompletionStatus =
  | 'not-started'
  | 'in-progress'
  | 'completed'
  | 'blocked'

/**
 * A module definition with its dependencies and status.
 */
export interface ModuleDefinition {
  /** Unique module ID. */
  readonly id: string
  /** Human-readable module name. */
  readonly name: string
  /** Module description. */
  readonly description: string
  /** Module type. */
  readonly type: ModuleType
  /** IDs of modules this depends on. */
  readonly dependsOn: readonly string[]
  /** IDs of modules that depend on this module. */
  readonly dependedBy: readonly string[]
  /** Master data entity IDs owned by this module. */
  readonly masterDataEntities: readonly string[]
  /** Current completion status. */
  readonly completionStatus: ModuleCompletionStatus
  /** When the module was defined. */
  readonly definedAt: string
}

// ---------------------------------------------------------------------------
// Foundation Gate
// ---------------------------------------------------------------------------

/** Result of a foundation gate check. */
export interface FoundationGateResult {
  /** Whether the gate is passed (all foundation modules complete). */
  readonly passed: boolean
  /** Foundation module IDs and their status. */
  readonly foundationModules: readonly FoundationModuleStatus[]
  /** Module IDs that are blocked. */
  readonly blockedModules: readonly string[]
  /** Message describing the gate result. */
  readonly message: string
}

/** Status of a foundation module in the gate. */
export interface FoundationModuleStatus {
  readonly moduleId: string
  readonly moduleName: string
  readonly status: ModuleCompletionStatus
}

// ---------------------------------------------------------------------------
// Consistency Validation
// ---------------------------------------------------------------------------

/** A naming inconsistency found during validation. */
export interface NamingInconsistency {
  /** The variant found in code/docs. */
  readonly variant: string
  /** The canonical name it should be. */
  readonly canonical: string
  /** Where the inconsistency was found. */
  readonly location: string
  /** Severity: error (must fix), warning (should fix). */
  readonly severity: 'error' | 'warning'
}

/** Result of a consistency validation. */
export interface ConsistencyResult {
  /** Whether the system is consistent. */
  readonly consistent: boolean
  /** Found inconsistencies. */
  readonly inconsistencies: readonly NamingInconsistency[]
  /** Total fields checked. */
  readonly fieldsChecked: number
  /** Total entities checked. */
  readonly entitiesChecked: number
}

// ---------------------------------------------------------------------------
// Module Map
// ---------------------------------------------------------------------------

/**
 * The complete module map: all modules, their master data, dependencies,
 * and the naming registry.
 */
export interface ModuleMap {
  /** All modules. */
  readonly modules: Readonly<Record<string, ModuleDefinition>>
  /** All master data entities. */
  readonly masterData: Readonly<Record<string, MasterDataEntity>>
  /** The naming registry. */
  readonly namingRegistry: readonly NamingEntry[]
  /** Foundation module IDs. */
  readonly foundationModuleIds: readonly string[]
  /** When the map was created. */
  readonly createdAt: string
  /** When the map was last updated. */
  readonly updatedAt: string
}
