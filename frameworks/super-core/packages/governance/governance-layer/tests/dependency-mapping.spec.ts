/**
 * PHASE 11 — Dependency Mapping Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  DependencyMappingEngine,
  resetEngine,
  getActiveEngine,
  createBuildDependencyGraphTool,
  createValidateDependencyGraphTool,
  createAnalyzeImpactTool,
  createGetExecutionOrderTool,
  createGetDependencyHealthTool,
  createExportDependencyGraphTool,
} from '../src/dependency-mapping/index.ts'
import type { DepNode, DepEdge } from '../src/dependency-mapping/types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(id: string, kind: DepNode['kind'] = 'module', moduleId?: string): DepNode {
  const base: DepNode = { id, label: `${id}-label`, kind, ...(moduleId !== undefined ? { moduleId } : {}) }
  // Module nodes need ownership to pass validation
  if (kind === 'module') {
    return { ...base, owner: 'team-alpha', reviewer: 'team-beta', ownershipConfirmed: true }
  }
  return base
}

function makeEdge(from: string, to: string, kind: DepEdge['kind'] = 'requires', reason?: string): DepEdge {
  return { from, to, kind, ...(reason !== undefined ? { reason } : {}) }
}

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

describe('Dependency Mapping types', () => {
  it('creates valid DepNode', () => {
    const n: DepNode = { id: 'M1', label: 'Module 1', kind: 'module' }
    expect(n.id).toBe('M1')
  })

  it('creates valid DepEdge', () => {
    const e: DepEdge = { from: 'A', to: 'B', kind: 'requires' }
    expect(e.from).toBe('A')
  })
})

// ---------------------------------------------------------------------------
// Engine: Node Operations
// ---------------------------------------------------------------------------

describe('DependencyMappingEngine', () => {
  let engine: DependencyMappingEngine

  beforeEach(() => {
    engine = new DependencyMappingEngine()
  })

  describe('node operations', () => {
    it('adds a node', () => {
      engine.addNode(makeNode('M1'))
      expect(engine.nodeCount).toBe(1)
      expect(engine.getNode('M1')?.label).toBe('M1-label')
    })

    it('overwrites node with same id', () => {
      engine.addNode(makeNode('M1'))
      engine.addNode({ id: 'M1', label: 'Updated', kind: 'goal' })
      expect(engine.nodeCount).toBe(1)
      expect(engine.getNode('M1')?.label).toBe('Updated')
    })

    it('bulk-adds nodes', () => {
      engine.addNodes([makeNode('M1'), makeNode('M2'), makeNode('M3')])
      expect(engine.nodeCount).toBe(3)
    })

    it('removes a node and its edges', () => {
      engine.addNodes([makeNode('M1'), makeNode('M2')])
      engine.addEdge(makeEdge('M1', 'M2'))
      expect(engine.removeNode('M1')).toBe(true)
      expect(engine.nodeCount).toBe(1)
      expect(engine.edgeCount).toBe(0)
    })

    it('returns false for removing non-existent node', () => {
      expect(engine.removeNode('MISSING')).toBe(false)
    })

    it('filters nodes by kind', () => {
      engine.addNodes([
        makeNode('M1', 'module'),
        makeNode('G1', 'goal'),
        makeNode('M2', 'module'),
        makeNode('F1', 'file'),
      ])
      expect(engine.getNodesByKind('module')).toHaveLength(2)
      expect(engine.getNodesByKind('goal')).toHaveLength(1)
    })

    it('filters nodes by module', () => {
      engine.addNodes([
        makeNode('F1', 'file', 'MOD-A'),
        makeNode('F2', 'file', 'MOD-A'),
        makeNode('F3', 'file', 'MOD-B'),
      ])
      expect(engine.getNodesByModule('MOD-A')).toHaveLength(2)
    })
  })

  // -- Edge operations -----------------------------------------------------

  describe('edge operations', () => {
    it('adds an edge and creates implicit nodes', () => {
      engine.addEdge(makeEdge('A', 'B'))
      expect(engine.nodeCount).toBe(2)
      expect(engine.edgeCount).toBe(1)
    })

    it('prevents self-dependency', () => {
      engine.addNode(makeNode('A'))
      engine.addEdge(makeEdge('A', 'A'))
      expect(engine.edgeCount).toBe(0)
    })

    it('prevents duplicate edges', () => {
      engine.addEdge(makeEdge('A', 'B'))
      engine.addEdge(makeEdge('A', 'B'))
      expect(engine.edgeCount).toBe(1)
    })

    it('allows same from/to with different kind', () => {
      engine.addEdge(makeEdge('A', 'B', 'requires'))
      engine.addEdge(makeEdge('A', 'B', 'data-flow'))
      expect(engine.edgeCount).toBe(2)
    })

    it('tracks outgoing and incoming', () => {
      engine.addEdge(makeEdge('A', 'B'))
      engine.addEdge(makeEdge('C', 'A'))
      expect(engine.getOutgoing('A')).toEqual(['B'])
      expect(engine.getIncoming('A')).toEqual(['C'])
    })

    it('removes an edge', () => {
      engine.addEdge(makeEdge('A', 'B'))
      expect(engine.removeEdge('A', 'B')).toBe(true)
      expect(engine.edgeCount).toBe(0)
    })

    it('returns false for removing non-existent edge', () => {
      expect(engine.removeEdge('X', 'Y')).toBe(false)
    })

    it('gets edges from a node', () => {
      engine.addEdge(makeEdge('A', 'B'))
      engine.addEdge(makeEdge('A', 'C'))
      expect(engine.getEdgesFrom('A')).toHaveLength(2)
    })

    it('gets edges to a node', () => {
      engine.addEdge(makeEdge('A', 'B'))
      engine.addEdge(makeEdge('C', 'B'))
      expect(engine.getEdgesTo('B')).toHaveLength(2)
    })

    it('bulk-adds edges', () => {
      engine.addEdges([
        makeEdge('A', 'B'),
        makeEdge('B', 'C'),
        makeEdge('A', 'C'),
      ])
      expect(engine.edgeCount).toBe(3)
    })
  })

  // -- Graph algorithms ----------------------------------------------------

  describe('topologicalSort', () => {
    it('sorts a linear chain', () => {
      engine.addEdges([
        makeEdge('A', 'B'),
        makeEdge('B', 'C'),
        makeEdge('C', 'D'),
      ])
      const order = engine.topologicalSort()
      expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'))
      expect(order.indexOf('B')).toBeLessThan(order.indexOf('C'))
      expect(order.indexOf('C')).toBeLessThan(order.indexOf('D'))
    })

    it('sorts a diamond graph', () => {
      engine.addEdges([
        makeEdge('A', 'B'),
        makeEdge('A', 'C'),
        makeEdge('B', 'D'),
        makeEdge('C', 'D'),
      ])
      const order = engine.topologicalSort()
      expect(order.indexOf('A')).toBeLessThan(order.indexOf('D'))
      expect(order.indexOf('B')).toBeLessThan(order.indexOf('D'))
      expect(order.indexOf('C')).toBeLessThan(order.indexOf('D'))
    })

    it('throws on cycle', () => {
      engine.addEdges([
        makeEdge('A', 'B'),
        makeEdge('B', 'C'),
        makeEdge('C', 'A'),
      ])
      expect(() => engine.topologicalSort()).toThrow('Dependency cycle')
    })

    it('ignores conflicts and replaces in sort order', () => {
      engine.addEdges([
        makeEdge('A', 'B', 'conflicts'),
        makeEdge('A', 'B', 'replaces'),
      ])
      const order = engine.topologicalSort()
      expect(order).toContain('A')
      expect(order).toContain('B')
    })
  })

  describe('findCycles', () => {
    it('finds no cycles in DAG', () => {
      engine.addEdges([makeEdge('A', 'B'), makeEdge('B', 'C')])
      expect(engine.findCycles()).toHaveLength(0)
    })

    it('finds a simple cycle', () => {
      engine.addEdges([
        makeEdge('A', 'B'),
        makeEdge('B', 'C'),
        makeEdge('C', 'A'),
      ])
      const cycles = engine.findCycles()
      expect(cycles.length).toBeGreaterThanOrEqual(1)
    })

    it('finds multiple disjoint cycles', () => {
      engine.addEdges([
        makeEdge('A', 'B'),
        makeEdge('B', 'A'),
        makeEdge('C', 'D'),
        makeEdge('D', 'C'),
      ])
      expect(engine.findCycles()).toHaveLength(2)
    })
  })

  // -- Impact Analysis -----------------------------------------------------

  describe('computeImpact', () => {
    it('reports no impact for leaf node', () => {
      engine.addNodes([makeNode('A'), makeNode('B')])
      engine.addEdge(makeEdge('A', 'B'))
      const impact = engine.computeImpact('B')
      expect(impact.totalAffected).toBe(0)
    })

    it('reports direct impact', () => {
      engine.addEdges([makeEdge('A', 'B'), makeEdge('A', 'C')])
      const impact = engine.computeImpact('A')
      expect(impact.directImpact).toContain('B')
      expect(impact.directImpact).toContain('C')
      expect(impact.totalAffected).toBe(2)
    })

    it('reports transitive impact', () => {
      engine.addEdges([
        makeEdge('A', 'B'),
        makeEdge('B', 'C'),
        makeEdge('C', 'D'),
      ])
      const impact = engine.computeImpact('A')
      expect(impact.directImpact).toContain('B')
      expect(impact.transitiveImpact).toContain('C')
      expect(impact.transitiveImpact).toContain('D')
      expect(impact.totalAffected).toBe(3)
    })

    it('respects maxDepth', () => {
      engine.addEdges([
        makeEdge('A', 'B'),
        makeEdge('B', 'C'),
        makeEdge('C', 'D'),
      ])
      const impact = engine.computeImpact('A', 1)
      expect(impact.totalAffected).toBe(1)
    })
  })

  // -- Validation ----------------------------------------------------------

  describe('validate', () => {
    it('returns no errors for clean DAG', () => {
      // Use explicit nodes with ownership and valid IDs (2-4 uppercase letters)
      engine.addNodes([
        makeNode('MOD-ALF', 'module'),
        makeNode('MOD-BET', 'module'),
        makeNode('MOD-GAM', 'module'),
      ])
      engine.addEdge(makeEdge('MOD-ALF', 'MOD-BET'))
      engine.addEdge(makeEdge('MOD-BET', 'MOD-GAM'))
      const issues = engine.validate()
      expect(issues.filter(i => i.severity === 'error')).toHaveLength(0)
    })

    it('detects cycles as errors', () => {
      engine.addEdges([makeEdge('A', 'B'), makeEdge('B', 'A')])
      const issues = engine.validate()
      expect(issues.some(i => i.type === 'cycle' && i.severity === 'error')).toBe(true)
    })

    it('detects orphan nodes', () => {
      engine.addNode(makeNode('ORPHAN'))
      const issues = engine.validate()
      expect(issues.some(i => i.type === 'orphan-node')).toBe(true)
    })

    it('detects mutual conflicts', () => {
      engine.addEdge(makeEdge('A', 'B', 'conflicts'))
      engine.addEdge(makeEdge('B', 'A', 'conflicts'))
      const issues = engine.validate()
      expect(issues.some(i => i.type === 'conflict-pair')).toBe(true)
    })
  })

  // -- Health Report -------------------------------------------------------

  describe('healthReport', () => {
    it('reports healthy for clean graph', () => {
      engine.addNodes([makeNode('MOD-ALF', 'module'), makeNode('MOD-BET', 'module')])
      engine.addEdge(makeEdge('MOD-ALF', 'MOD-BET'))
      const health = engine.healthReport()
      expect(health.healthy).toBe(true)
      expect(health.components).toBeGreaterThanOrEqual(1)
      expect(health.ownershipCoverage).toBe(1)
    })

    it('reports unhealthy for cycles', () => {
      engine.addEdge(makeEdge('A', 'B', 'requires'))
      engine.addEdge(makeEdge('B', 'A', 'requires'))
      const health = engine.healthReport()
      expect(health.healthy).toBe(false)
    })

    it('counts nodes and edges by kind', () => {
      engine.addNode(makeNode('M1', 'module'))
      engine.addNode(makeNode('G1', 'goal'))
      engine.addEdge(makeEdge('M1', 'G1', 'data-flow'))
      const health = engine.healthReport()
      expect(health.nodeCounts.module).toBe(1)
      expect(health.nodeCounts.goal).toBe(1)
      expect(health.edgeCounts['data-flow']).toBe(1)
    })
  })

  // -- Build Result --------------------------------------------------------

  describe('buildResult', () => {
    it('builds full result', () => {
      engine.addEdges([
        makeEdge('A', 'B'),
        makeEdge('B', 'C'),
      ])
      const result = engine.buildResult()
      expect(result.nodes).toHaveLength(3)
      expect(result.edges).toHaveLength(2)
      expect(result.executionOrder).toContain('A')
      expect(result.health).toBeDefined()
      expect(result.generatedAt).toBeDefined()
      expect(result.impactMap['A']!.totalAffected).toBe(2)
    })
  })

  // -- Serialization -------------------------------------------------------

  describe('serialization', () => {
    it('exports and imports JSON', () => {
      engine.addEdges([makeEdge('A', 'B'), makeEdge('B', 'C')])
      const json = engine.toJSON()
      expect(json.nodes).toHaveLength(3)

      const engine2 = new DependencyMappingEngine()
      engine2.fromJSON(json)
      expect(engine2.nodeCount).toBe(3)
      expect(engine2.edgeCount).toBe(2)
    })
  })

  describe('clear', () => {
    it('clears everything', () => {
      engine.addEdges([makeEdge('A', 'B')])
      engine.clear()
      expect(engine.nodeCount).toBe(0)
      expect(engine.edgeCount).toBe(0)
    })
  })
})

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

describe('Dependency Mapping tools', () => {
  beforeEach(() => {
    resetEngine()
  })

  it('createBuildDependencyGraphTool has correct name', () => {
    const tool = createBuildDependencyGraphTool()
    expect(tool.name).toBe('build_dependency_graph')
  })

  it('createValidateDependencyGraphTool has correct name', () => {
    const tool = createValidateDependencyGraphTool()
    expect(tool.name).toBe('validate_dependency_graph')
  })

  it('createAnalyzeImpactTool has correct name', () => {
    const tool = createAnalyzeImpactTool()
    expect(tool.name).toBe('analyze_impact')
  })

  it('createGetExecutionOrderTool has correct name', () => {
    const tool = createGetExecutionOrderTool()
    expect(tool.name).toBe('get_execution_order')
  })

  it('createGetDependencyHealthTool has correct name', () => {
    const tool = createGetDependencyHealthTool()
    expect(tool.name).toBe('get_dependency_health')
  })

  it('createExportDependencyGraphTool has correct name', () => {
    const tool = createExportDependencyGraphTool()
    expect(tool.name).toBe('export_dependency_graph')
  })
})

describe('Tool lifecycle', () => {
  beforeEach(() => {
    resetEngine()
  })

  it('getActiveEngine returns undefined initially', () => {
    expect(getActiveEngine()).toBeUndefined()
  })

  it('resetEngine clears active engine', () => {
    // Trigger engine creation via validate tool (no params)
    const tool = createValidateDependencyGraphTool()
    tool.execute({}, {} as any)
    expect(getActiveEngine()).toBeDefined()
    resetEngine()
    expect(getActiveEngine()).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Full lifecycle — School ERP scenario
// ---------------------------------------------------------------------------

describe('full lifecycle — School ERP dependency mapping', () => {
  let engine: DependencyMappingEngine

  beforeEach(() => {
    engine = new DependencyMappingEngine()
  })

  it('maps exact module chains: Student → Enrollment → Accounts, Student → Enrollment → Attendance', () => {
    // 1. Register all modules with IDs and ownership
    engine.addNodes([
      { id: 'MOD-STU', label: 'Student Master', kind: 'module', owner: 'Rajesh', reviewer: 'Priya', ownershipConfirmed: true },
      { id: 'MOD-ENR', label: 'Enrollment', kind: 'module', owner: 'Amit', reviewer: 'Sunita', ownershipConfirmed: true },
      { id: 'MOD-FEE', label: 'Fees / Accounts', kind: 'module', owner: 'Vikram', reviewer: 'Neha', ownershipConfirmed: true },
      { id: 'MOD-ATT', label: 'Attendance', kind: 'module', owner: 'Deepak', reviewer: 'Kavita', ownershipConfirmed: true },
      { id: 'MOD-EXM', label: 'Examinations', kind: 'module', owner: 'Sanjay', reviewer: 'Riya', ownershipConfirmed: true },
      { id: 'MOD-DOC', label: 'Documents', kind: 'module', owner: 'Pooja', reviewer: 'Arun', ownershipConfirmed: true },
    ])

    // 2. Map exact dependency chains
    engine.addEdges([
      // Student → Enrollment (enrollment needs student record)
      { from: 'MOD-STU', to: 'MOD-ENR', kind: 'requires', reason: 'Enrollment reads student master data' },
      // Enrollment → Accounts (fees depend on enrollment)
      { from: 'MOD-ENR', to: 'MOD-FEE', kind: 'requires', reason: 'Fee calculation requires enrollment record' },
      // Student → Accounts (accounts references student directly)
      { from: 'MOD-STU', to: 'MOD-FEE', kind: 'data-flow', reason: 'Fee receipts display student name' },
      // Enrollment → Attendance (attendance needs enrollment)
      { from: 'MOD-ENR', to: 'MOD-ATT', kind: 'requires', reason: 'Attendance tracks enrolled students' },
      // Student → Attendance (attendance references student)
      { from: 'MOD-STU', to: 'MOD-ATT', kind: 'data-flow', reason: 'Attendance displays student info' },
      // Enrollment → Examinations
      { from: 'MOD-ENR', to: 'MOD-EXM', kind: 'requires', reason: 'Exams require active enrollment' },
      // Student → Documents (documents reference student)
      { from: 'MOD-STU', to: 'MOD-DOC', kind: 'soft-requires', reason: 'Documents optionally attach to student records' },
    ])

    // 3. Validate — must be clean
    const issues = engine.validate()
    expect(issues.filter(i => i.severity === 'error')).toHaveLength(0)

    // 4. Verify exact chain: Student → Enrollment → Accounts
    const stuOutgoing = engine.getOutgoing('MOD-STU')
    expect(stuOutgoing).toContain('MOD-ENR')
    expect(stuOutgoing).toContain('MOD-FEE')
    expect(stuOutgoing).toContain('MOD-ATT')

    const enrOutgoing = engine.getOutgoing('MOD-ENR')
    expect(enrOutgoing).toContain('MOD-FEE')
    expect(enrOutgoing).toContain('MOD-ATT')
    expect(enrOutgoing).toContain('MOD-EXM')

    // 5. Verify incoming: Enrollment receives from Student only
    const enrIncoming = engine.getIncoming('MOD-ENR')
    expect(enrIncoming).toEqual(['MOD-STU'])

    // 6. Verify incoming: Accounts receives from Student and Enrollment
    const feeIncoming = engine.getIncoming('MOD-FEE')
    expect(feeIncoming).toContain('MOD-STU')
    expect(feeIncoming).toContain('MOD-ENR')

    // 7. Verify incoming: Attendance receives from Student and Enrollment
    const attIncoming = engine.getIncoming('MOD-ATT')
    expect(attIncoming).toContain('MOD-STU')
    expect(attIncoming).toContain('MOD-ENR')
  })

  it('topological order respects dependency chains', () => {
    engine.addNodes([
      { id: 'MOD-STU', label: 'Student', kind: 'module', owner: 'Rajesh', ownershipConfirmed: true },
      { id: 'MOD-ENR', label: 'Enrollment', kind: 'module', owner: 'Amit', ownershipConfirmed: true },
      { id: 'MOD-FEE', label: 'Accounts', kind: 'module', owner: 'Vikram', ownershipConfirmed: true },
      { id: 'MOD-ATT', label: 'Attendance', kind: 'module', owner: 'Deepak', ownershipConfirmed: true },
    ])
    engine.addEdges([
      { from: 'MOD-STU', to: 'MOD-ENR', kind: 'requires' },
      { from: 'MOD-ENR', to: 'MOD-FEE', kind: 'requires' },
      { from: 'MOD-ENR', to: 'MOD-ATT', kind: 'requires' },
    ])

    const order = engine.topologicalSort()
    // Student must come first
    expect(order[0]).toBe('MOD-STU')
    // Enrollment must come before Fees and Attendance
    expect(order.indexOf('MOD-ENR')).toBeLessThan(order.indexOf('MOD-FEE'))
    expect(order.indexOf('MOD-ENR')).toBeLessThan(order.indexOf('MOD-ATT'))
  })

  it('impact analysis: changing Student affects all downstream modules', () => {
    engine.addNodes([
      { id: 'MOD-STU', label: 'Student', kind: 'module', owner: 'Rajesh', ownershipConfirmed: true },
      { id: 'MOD-ENR', label: 'Enrollment', kind: 'module', owner: 'Amit', ownershipConfirmed: true },
      { id: 'MOD-FEE', label: 'Accounts', kind: 'module', owner: 'Vikram', ownershipConfirmed: true },
      { id: 'MOD-ATT', label: 'Attendance', kind: 'module', owner: 'Deepak', ownershipConfirmed: true },
      { id: 'MOD-EXM', label: 'Exams', kind: 'module', owner: 'Sanjay', ownershipConfirmed: true },
    ])
    engine.addEdges([
      { from: 'MOD-STU', to: 'MOD-ENR', kind: 'requires' },
      { from: 'MOD-ENR', to: 'MOD-FEE', kind: 'requires' },
      { from: 'MOD-ENR', to: 'MOD-ATT', kind: 'requires' },
      { from: 'MOD-ENR', to: 'MOD-EXM', kind: 'requires' },
    ])

    const impact = engine.computeImpact('MOD-STU')
    // Direct: Enrollment
    expect(impact.directImpact).toContain('MOD-ENR')
    // Transitive: Fees, Attendance, Exams
    expect(impact.transitiveImpact).toContain('MOD-FEE')
    expect(impact.transitiveImpact).toContain('MOD-ATT')
    expect(impact.transitiveImpact).toContain('MOD-EXM')
    expect(impact.totalAffected).toBe(4)
  })

  it('rejects module without ownership', () => {
    engine.addNode({ id: 'MOD-STU', label: 'Student', kind: 'module' })
    const issues = engine.validate()
    expect(issues.some(i => i.type === 'missing-ownership' && i.severity === 'error')).toBe(true)
  })

  it('rejects invalid module ID format', () => {
    engine.addNode({ id: 'MOD-student', label: 'Student', kind: 'module', owner: 'X', ownershipConfirmed: true })
    const issues = engine.validate()
    expect(issues.some(i => i.type === 'invalid-module-id' && i.severity === 'error')).toBe(true)
  })

  it('health report shows 100% ownership coverage when all modules owned', () => {
    engine.addNodes([
      { id: 'MOD-STU', label: 'Student', kind: 'module', owner: 'Rajesh', ownershipConfirmed: true },
      { id: 'MOD-ENR', label: 'Enrollment', kind: 'module', owner: 'Amit', ownershipConfirmed: true },
    ])
    engine.addEdge(makeEdge('MOD-STU', 'MOD-ENR'))
    const health = engine.healthReport()
    expect(health.ownershipCoverage).toBe(1)
  })

  it('health report shows partial ownership when some modules lack owner', () => {
    engine.addNode({ id: 'MOD-STU', label: 'Student', kind: 'module', owner: 'Rajesh', ownershipConfirmed: true })
    engine.addNode({ id: 'MOD-ENR', label: 'Enrollment', kind: 'module' })
    const health = engine.healthReport()
    expect(health.ownershipCoverage).toBe(0.5)
  })

  it('full buildResult with School ERP graph', () => {
    engine.addNodes([
      { id: 'MOD-STU', label: 'Student', kind: 'module', owner: 'Rajesh', reviewer: 'Priya', ownershipConfirmed: true },
      { id: 'MOD-ENR', label: 'Enrollment', kind: 'module', owner: 'Amit', reviewer: 'Sunita', ownershipConfirmed: true },
      { id: 'MOD-FEE', label: 'Accounts', kind: 'module', owner: 'Vikram', reviewer: 'Neha', ownershipConfirmed: true },
      { id: 'MOD-ATT', label: 'Attendance', kind: 'module', owner: 'Deepak', reviewer: 'Kavita', ownershipConfirmed: true },
    ])
    engine.addEdges([
      { from: 'MOD-STU', to: 'MOD-ENR', kind: 'requires', reason: 'Enrollment needs student' },
      { from: 'MOD-ENR', to: 'MOD-FEE', kind: 'requires', reason: 'Fees need enrollment' },
      { from: 'MOD-ENR', to: 'MOD-ATT', kind: 'requires', reason: 'Attendance needs enrollment' },
      { from: 'MOD-STU', to: 'MOD-FEE', kind: 'data-flow', reason: 'Fee receipts show student name' },
    ])

    const result = engine.buildResult()
    expect(result.nodes).toHaveLength(4)
    expect(result.edges).toHaveLength(4)
    expect(result.health.healthy).toBe(true)
    expect(result.health.ownershipCoverage).toBe(1)
    expect(result.executionOrder[0]).toBe('MOD-STU')
    expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0)
    expect(result.impactMap['MOD-STU']!.totalAffected).toBe(3)
  })
})
