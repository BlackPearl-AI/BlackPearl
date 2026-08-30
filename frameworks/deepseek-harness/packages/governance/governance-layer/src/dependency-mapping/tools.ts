/**
 * PHASE 11 — Dependency Mapping Tools
 *
 * Tools exposing the dependency graph: build, validate, impact analysis,
 * topological ordering, and reporting.
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { DependencyMappingEngine } from './engine.ts'
import type { DepNode, DepEdge } from './types.ts'

let activeEngine: DependencyMappingEngine | undefined

/** Get or create the active engine. */
function ensureEngine(): DependencyMappingEngine {
  if (!activeEngine) {
    activeEngine = new DependencyMappingEngine()
  }
  return activeEngine
}

/** Reset the active engine (for tests). */
export function resetEngine(): void {
  activeEngine = undefined
}

/** Get the active engine (for tests). */
export function getActiveEngine(): DependencyMappingEngine | undefined {
  return activeEngine
}

// ---------------------------------------------------------------------------
// Tool: build_dependency_graph
// ---------------------------------------------------------------------------

/**
 * Create the `build_dependency_graph` tool.
 */
export function createBuildDependencyGraphTool() {
  return defineTool({
    name: 'build_dependency_graph',
    description:
      'Build a dependency graph from nodes and edges. Returns the full graph result '
      + 'including validation, impact analysis, and execution order.',
    parameters: {
      nodes_json: {
        type: 'string',
        required: true,
        description:
          'JSON array of nodes: [{ id, label, kind (module/goal/file/element/rule/external-package), moduleId? }]',
      },
      edges_json: {
        type: 'string',
        required: true,
        description:
          'JSON array of edges: [{ from, to, kind (requires/soft-requires/conflicts/replaces/data-flow/calls), reason? }]',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          nodeCount: { type: 'number' },
          edgeCount: { type: 'number' },
          healthy: { type: 'boolean' },
          issueCount: { type: 'number' },
          executionOrder: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const { nodes_json, edges_json } = args as { nodes_json: string; edges_json: string }
      const nodes = JSON.parse(nodes_json) as readonly DepNode[]
      const edges = JSON.parse(edges_json) as readonly DepEdge[]
      engine.clear()
      engine.addNodes(nodes)
      engine.addEdges(edges)
      const result = engine.buildResult()
      return Promise.resolve({
        success: true,
        nodeCount: result.nodes.length,
        edgeCount: result.edges.length,
        healthy: result.health.healthy,
        issueCount: result.issues.length,
        executionOrder: [...result.executionOrder],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: validate_dependency_graph
// ---------------------------------------------------------------------------

/**
 * Create the `validate_dependency_graph` tool.
 */
export function createValidateDependencyGraphTool() {
  return defineTool({
    name: 'validate_dependency_graph',
    description:
      'Validate the current dependency graph for cycles, missing targets, orphans, '
      + 'and other issues.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          healthy: { type: 'boolean' },
          issueCount: { type: 'number' },
          errors: { type: 'number' },
          warnings: { type: 'number' },
          issues: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute() {
      const engine = ensureEngine()
      const issues = engine.validate()
      return Promise.resolve({
        healthy: !issues.some(i => i.severity === 'error'),
        issueCount: issues.length,
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        issues: issues.map(i => ({
          ...i,
          involved: [...i.involved],
        })),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: analyze_impact
// ---------------------------------------------------------------------------

/**
 * Create the `analyze_impact` tool.
 */
export function createAnalyzeImpactTool() {
  return defineTool({
    name: 'analyze_impact',
    description:
      'Analyze downstream impact of changing a node — all directly and '
      + 'transitively affected nodes.',
    parameters: {
      node_id: {
        type: 'string',
        required: true,
        description: 'Node id to analyze impact for',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          nodeId: { type: 'string' },
          directImpact: { type: 'array' },
          transitiveImpact: { type: 'array' },
          totalAffected: { type: 'number' },
          criticalPath: { type: 'array' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      const engine = ensureEngine()
      const { node_id } = args as { node_id: string }
      const result = engine.computeImpact(node_id)
      return Promise.resolve({
        ...result,
        directImpact: [...result.directImpact],
        transitiveImpact: [...result.transitiveImpact],
        criticalPath: [...result.criticalPath],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_execution_order
// ---------------------------------------------------------------------------

/**
 * Create the `get_execution_order` tool.
 */
export function createGetExecutionOrderTool() {
  return defineTool({
    name: 'get_execution_order',
    description:
      'Get the topological execution order for all nodes — the safe order '
      + 'to implement without breaking dependencies.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          order: { type: 'array' },
          nodeCount: { type: 'number' },
          valid: { type: 'boolean' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute() {
      const engine = ensureEngine()
      try {
        const order = engine.topologicalSort()
        return Promise.resolve({ order, nodeCount: order.length, valid: true })
      } catch {
        return Promise.resolve({
          order: engine.getNodes().map(n => n.id),
          nodeCount: engine.nodeCount,
          valid: false,
        })
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: get_dependency_health
// ---------------------------------------------------------------------------

/**
 * Create the `get_dependency_health` tool.
 */
export function createGetDependencyHealthTool() {
  return defineTool({
    name: 'get_dependency_health',
    description:
      'Get the overall dependency graph health report including node/edge counts, '
      + 'issues, components, and max depth.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          healthy: { type: 'boolean' },
          components: { type: 'number' },
          maxDepth: { type: 'number' },
          issueCount: { type: 'number' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute() {
      const engine = ensureEngine()
      return Promise.resolve(engine.healthReport())
    },
  })
}

// ---------------------------------------------------------------------------
// Tool: export_dependency_graph
// ---------------------------------------------------------------------------

/**
 * Create the `export_dependency_graph` tool.
 */
export function createExportDependencyGraphTool() {
  return defineTool({
    name: 'export_dependency_graph',
    description:
      'Export the current dependency graph as JSON for persistence or '
      + 'cross-tool consumption.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          nodes: { type: 'array' },
          edges: { type: 'array' },
          nodeCount: { type: 'number' },
          edgeCount: { type: 'number' },
        },
      },
      render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute() {
      const engine = ensureEngine()
      const data = engine.toJSON()
      return Promise.resolve({
        ...data,
        nodes: data.nodes.map(n => ({ ...n })),
        edges: data.edges.map(e => ({
          ...e,
          ...(e.reason !== undefined ? { reason: e.reason } : {}),
        })),
        nodeCount: data.nodes.length,
        edgeCount: data.edges.length,
      })
    },
  })
}
