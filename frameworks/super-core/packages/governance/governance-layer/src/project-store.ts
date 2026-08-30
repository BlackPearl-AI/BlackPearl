/**
 * File-based persistence for the `.project/` directory structure.
 * Scaffolds the directory tree on initialization and reads/writes
 * JSON files for governance state, goals, blueprints, and evidence.
 * @module @deepseek-ai/dsh-governance-layer/project-store
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import type {
  GovernanceState,
  GovernanceTransition,
  RuntimeState,
  MasterGoal,
  GoalIndexEntry,
  GoalMetadata,
  RuleIndex,
  BlueprintElementIndex,
  BlueprintFileIndex,
  DependencyMap,
  RepairIndex,
} from './types.ts'

// ---------------------------------------------------------------------------
// Directory Structure
// ---------------------------------------------------------------------------

/** All subdirectories that must exist under `.project/`. */
const REQUIRED_DIRECTORIES = [
  'requirements',
  'goals',
  'constitution/architecture',
  'constitution/security',
  'constitution/folders',
  'constitution/workflows',
  'blueprints',
  'runtime',
  'evidence/tests',
  'evidence/integration',
  'evidence/audit',
  'evidence/completion',
  'repairs',
] as const

/** All files that must exist (created with defaults if absent). */
const REQUIRED_FILES: ReadonlyArray<{ path: string; default: unknown }> = [
  {
    path: 'MASTER-GOAL.json',
    default: {
      id: 'master-001',
      objective: '',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies MasterGoal,
  },
  {
    path: 'goals/goal-index.json',
    default: { goals: [] } satisfies { goals: GoalIndexEntry[] },
  },
  {
    path: 'constitution/rule-index.json',
    default: { rules: [] } satisfies RuleIndex,
  },
  {
    path: 'blueprints/element-index.json',
    default: { elements: [] } satisfies BlueprintElementIndex,
  },
  {
    path: 'blueprints/file-index.json',
    default: { files: [] } satisfies BlueprintFileIndex,
  },
  {
    path: 'blueprints/dependency-map.json',
    default: { edges: [] } satisfies DependencyMap,
  },
  {
    path: 'blueprints/repair-index.json',
    default: { repairs: [] } satisfies RepairIndex,
  },
  {
    path: 'runtime/state.json',
    default: {
      phase: 'idle',
      revision: 0,
      lastTransitionAt: new Date().toISOString(),
      history: [],
    } satisfies RuntimeState,
  },
]

// ---------------------------------------------------------------------------
// Project Store
// ---------------------------------------------------------------------------

/**
 * File-based governance store backed by `.project/` directory.
 * Implements the same interface as the in-memory `GovernanceStore`
 * but persists to disk on every transition.
 */
export class ProjectStore {
  private readonly root: string
  private readonly cache = new Map<string, GovernanceState>()

  /** @param projectRoot - Absolute path to the `.project/` directory. */
  constructor(projectRoot: string) {
    this.root = projectRoot
  }

  // -----------------------------------------------------------------------
  // Scaffold
  // -----------------------------------------------------------------------

  /** Create the `.project/` directory tree if it doesn't exist. */
  scaffold(): void {
    // Create all directories.
    for (const dir of REQUIRED_DIRECTORIES) {
      mkdirSync(join(this.root, dir), { recursive: true })
    }

    // Create all required files with defaults if absent.
    for (const file of REQUIRED_FILES) {
      const filePath = join(this.root, file.path)
      if (!existsSync(filePath)) {
        writeFileSync(filePath, JSON.stringify(file.default, null, 2), 'utf8')
      }
    }
  }

  // -----------------------------------------------------------------------
  // State Operations (mirrors in-memory GovernanceStore)
  // -----------------------------------------------------------------------

  /** Get the current governance state for an agent. */
  get(agentId: string): GovernanceState | undefined {
    // Check cache first.
    const cached = this.cache.get(agentId)
    if (cached !== undefined) return cached

    // Try to read from disk.
    const statePath = this.statePath(agentId)
    if (existsSync(statePath)) {
      const raw = readFileSync(statePath, 'utf8')
      const state = JSON.parse(raw) as GovernanceState
      this.cache.set(agentId, state)
      return state
    }

    return undefined
  }

  /** Set the governance state for an agent (writes to disk). */
  set(agentId: string, state: GovernanceState): void {
    this.cache.set(agentId, state)
    this.writeState(agentId, state)
  }

  /** Delete the governance state for an agent. */
  delete(agentId: string): void {
    this.cache.delete(agentId)
    // Remove the file if it exists (best-effort).
    try {
      const statePath = this.statePath(agentId)
      if (existsSync(statePath)) {
        unlinkSync(statePath)
      }
    } catch {
      // Best-effort: file removal is not critical.
    }
  }

  /** Clear the entire cache. */
  clear(): void {
    this.cache.clear()
  }

  /** Iterate all cached entries. */
  entries(): IterableIterator<[string, GovernanceState]> {
    return this.cache.entries()
  }

  // -----------------------------------------------------------------------
  // Runtime State
  // -----------------------------------------------------------------------

  /** Read the runtime/state.json file. */
  readRuntimeState(): RuntimeState {
    const path = join(this.root, 'runtime', 'state.json')
    if (!existsSync(path)) {
      const defaultState: RuntimeState = {
        phase: 'idle',
        revision: 0,
        lastTransitionAt: new Date().toISOString(),
        history: [],
      }
      writeFileSync(path, JSON.stringify(defaultState, null, 2), 'utf8')
      return defaultState
    }
    return JSON.parse(readFileSync(path, 'utf8') as string) as RuntimeState
  }

  /** Write the runtime/state.json file. */
  writeRuntimeState(state: RuntimeState): void {
    const path = join(this.root, 'runtime', 'state.json')
    writeFileSync(path, JSON.stringify(state, null, 2), 'utf8')
  }

  // -----------------------------------------------------------------------
  // Goal Operations
  // -----------------------------------------------------------------------

  /** Read the goal index. */
  readGoalIndex(): GoalIndexEntry[] {
    const path = join(this.root, 'goals', 'goal-index.json')
    if (!existsSync(path)) return []
    const raw = JSON.parse(readFileSync(path, 'utf8') as string) as { goals: GoalIndexEntry[] }
    return raw.goals ?? []
  }

  /** Write the goal index. */
  writeGoalIndex(goals: GoalIndexEntry[]): void {
    const path = join(this.root, 'goals', 'goal-index.json')
    writeFileSync(path, JSON.stringify({ goals }, null, 2), 'utf8')
  }

  /** Read a specific goal's metadata. */
  readGoal(goalDir: string): GoalMetadata | undefined {
    const path = join(this.root, 'goals', goalDir, 'goal.json')
    if (!existsSync(path)) return undefined
    return JSON.parse(readFileSync(path, 'utf8') as string) as GoalMetadata
  }

  /** Write a specific goal's metadata. */
  writeGoal(goalDir: string, goal: GoalMetadata): void {
    const goalPath = join(this.root, 'goals', goalDir)
    mkdirSync(goalPath, { recursive: true })
    writeFileSync(join(goalPath, 'goal.json'), JSON.stringify(goal, null, 2), 'utf8')
  }

  // -----------------------------------------------------------------------
  // Transition History
  // -----------------------------------------------------------------------

  /** Append a transition to the runtime state history. */
  appendTransition(transition: GovernanceTransition): void {
    const state = this.readRuntimeState()
    const history = [...state.history, transition]
    // Keep only the last 100 transitions to bound file size.
    const bounded = history.slice(-100)
    this.writeRuntimeState({
      ...state,
      phase: transition.to,
      revision: state.revision + 1,
      lastTransitionAt: transition.timestamp,
      history: bounded,
    })
  }

  // -----------------------------------------------------------------------
  // Constitution
  // -----------------------------------------------------------------------

  /** Read the rule index. */
  readRuleIndex(): RuleIndex {
    const path = join(this.root, 'constitution', 'rule-index.json')
    if (!existsSync(path)) return { rules: [] }
    return JSON.parse(readFileSync(path, 'utf8') as string) as RuleIndex
  }

  /** Write the rule index. */
  writeRuleIndex(index: RuleIndex): void {
    const path = join(this.root, 'constitution', 'rule-index.json')
    writeFileSync(path, JSON.stringify(index, null, 2), 'utf8')
  }

  // -----------------------------------------------------------------------
  // Blueprints
  // -----------------------------------------------------------------------

  /** Read the element index. */
  readElementIndex(): BlueprintElementIndex {
    const path = join(this.root, 'blueprints', 'element-index.json')
    if (!existsSync(path)) return { elements: [] }
    return JSON.parse(readFileSync(path, 'utf8') as string) as BlueprintElementIndex
  }

  /** Write the element index. */
  writeElementIndex(index: BlueprintElementIndex): void {
    const path = join(this.root, 'blueprints', 'element-index.json')
    writeFileSync(path, JSON.stringify(index, null, 2), 'utf8')
  }

  /** Read the file index. */
  readFileIndex(): BlueprintFileIndex {
    const path = join(this.root, 'blueprints', 'file-index.json')
    if (!existsSync(path)) return { files: [] }
    return JSON.parse(readFileSync(path, 'utf8') as string) as BlueprintFileIndex
  }

  /** Write the file index. */
  writeFileIndex(index: BlueprintFileIndex): void {
    const path = join(this.root, 'blueprints', 'file-index.json')
    writeFileSync(path, JSON.stringify(index, null, 2), 'utf8')
  }

  /** Read the dependency map. */
  readDependencyMap(): DependencyMap {
    const path = join(this.root, 'blueprints', 'dependency-map.json')
    if (!existsSync(path)) return { edges: [] }
    return JSON.parse(readFileSync(path, 'utf8') as string) as DependencyMap
  }

  /** Write the dependency map. */
  writeDependencyMap(map: DependencyMap): void {
    const path = join(this.root, 'blueprints', 'dependency-map.json')
    writeFileSync(path, JSON.stringify(map, null, 2), 'utf8')
  }

  /** Read the repair index. */
  readRepairIndex(): RepairIndex {
    const path = join(this.root, 'blueprints', 'repair-index.json')
    if (!existsSync(path)) return { repairs: [] }
    return JSON.parse(readFileSync(path, 'utf8') as string) as RepairIndex
  }

  /** Write the repair index. */
  writeRepairIndex(index: RepairIndex): void {
    const path = join(this.root, 'blueprints', 'repair-index.json')
    writeFileSync(path, JSON.stringify(index, null, 2), 'utf8')
  }

  // -----------------------------------------------------------------------
  // Private Helpers
  // -----------------------------------------------------------------------

  private statePath(agentId: string): string {
    return join(this.root, 'runtime', `state-${agentId}.json`)
  }

  private writeState(agentId: string, state: GovernanceState): void {
    const path = this.statePath(agentId)
    writeFileSync(path, JSON.stringify(state, null, 2), 'utf8')
  }
}

// ---------------------------------------------------------------------------
// In-Memory Store (for tests and lightweight usage)
// ---------------------------------------------------------------------------

/**
 * In-memory governance store. Same interface as `ProjectStore` but
 * without file I/O. Used in tests and when `.project/` persistence
 * is not needed.
 */
export class MemoryStore {
  private readonly cache = new Map<string, GovernanceState>()

  get(agentId: string): GovernanceState | undefined {
    return this.cache.get(agentId)
  }

  set(agentId: string, state: GovernanceState): void {
    this.cache.set(agentId, state)
  }

  delete(agentId: string): void {
    this.cache.delete(agentId)
  }

  clear(): void {
    this.cache.clear()
  }

  entries(): IterableIterator<[string, GovernanceState]> {
    return this.cache.entries()
  }
}

/** Store interface shared by ProjectStore and MemoryStore. */
export interface GovernanceStoreAdapter {
  get(agentId: string): GovernanceState | undefined
  set(agentId: string, state: GovernanceState): void
  delete(agentId: string): void
  clear(): void
  /** Iterate all entries (for prompt section dynamic rendering). */
  entries(): IterableIterator<[string, GovernanceState]>
}
