/**
 * PHASE 11 — Dependency Mapping
 *
 * Builds and validates a dependency graph connecting modules, goals, files,
 * and elements. Provides impact analysis, cycle detection, topological ordering,
 * and health reporting.
 */

export type {
  DepNodeKind,
  DepNode,
  DepEdgeKind,
  DepEdge,
  GraphIssueSeverity,
  GraphIssue,
  ImpactResult,
  GraphHealth,
  DependencyMappingResult,
} from './types.ts'

export { MODULE_ID_PATTERN, SCHOOL_ERP_PREFIXES } from './types.ts'

export { DependencyMappingEngine } from './engine.ts'

export {
  createBuildDependencyGraphTool,
  createValidateDependencyGraphTool,
  createAnalyzeImpactTool,
  createGetExecutionOrderTool,
  createGetDependencyHealthTool,
  createExportDependencyGraphTool,
  resetEngine,
  getActiveEngine,
} from './tools.ts'
