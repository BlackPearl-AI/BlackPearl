/**
 * G-28 — Task-Specific Context Pack Engine: Implementation
 *
 * Assembles compact, minimal context packs containing ONLY task-relevant items.
 *
 * @module @deepseek-ai/dsh-governance-layer/context-pack/engine
 */

import type {
  ContextPackRequest,
  ContextPackManifest,
  ContextPackSection,
  ContextPack,
  ContextPackSummary,
  ManifestItemMeta,
} from './types.ts'

import { getActiveEngine as getCrEngine } from '../conversation-ledger/tools.ts'
import { getActiveGoal } from '../master-goal/tools.ts'
import { getActiveEngine as getBreakdownEngine } from '../goal-breakdown/tools.ts'
import { getActiveEngine as getGoalBpEngine } from '../goal-blueprint/tools.ts'
import { getActiveEngine as getFileBpEngine } from '../file-blueprint/tools.ts'
import { getActiveEngine as getElementEngine } from '../element-registry/tools.ts'
import { getActiveEngine as getRuleEngine } from '../rule-governance/tools.ts'
import { getActiveEngine as getDepEngine } from '../dependency-mapping/tools.ts'
import { getActiveEngine as getTaskEngine } from '../task-decomposition/tools.ts'
import { getRepairCache } from '../repair-engine/tools.ts'

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function computeChecksum(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

export class ContextPackEngine {
  private packs: Map<string, ContextPack> = new Map()

  /**
   * Build a compact, task-specific context pack.
   */
  buildContextPack(request: ContextPackRequest): ContextPack {
    const packId = `CPACK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const targetModule = request.moduleId
    const targetGoal = request.goalId
    const query = request.query?.toLowerCase()
    const targetElementIds = new Set(request.elementIds ?? [])

    const manifestItems: ManifestItemMeta[] = []
    const sections: ContextPackSection[] = []

    // 1. Relevant CR Requirements
    const crEngine = getCrEngine()
    const relevantCrIds: string[] = []
    const crEntries: string[] = []

    if (crEngine !== undefined) {
      const allCrs = crEngine.getLedger().entries
      for (const cr of allCrs) {
        let isRelevant = false
        if (query && (cr.content.toLowerCase().includes(query) || cr.summary?.toLowerCase().includes(query))) {
          isRelevant = true
        }
        if (targetModule && cr.moduleScope?.includes(targetModule)) {
          isRelevant = true
        }
        if (isRelevant || (!targetModule && !query && relevantCrIds.length < 3)) {
          relevantCrIds.push(cr.crId)
          const text = `[${cr.crId}] (${cr.type}) ${cr.summary || cr.content}`
          crEntries.push(text)
          manifestItems.push({
            id: cr.crId,
            type: 'cr',
            name: cr.summary || cr.content.slice(0, 50),
            tokenEstimate: estimateTokens(text),
            byteSize: Buffer.byteLength(text, 'utf8'),
          })
        }
      }
    }

    if (crEntries.length > 0) {
      sections.push({
        title: 'Relevant Requirements (CRs)',
        type: 'requirements',
        entries: crEntries,
        tokenEstimate: estimateTokens(crEntries.join('\n')),
      })
    }

    // 2. Active Goal & Acceptance Criteria
    const activeGoal = getActiveGoal()
    let activeGoalId: string | undefined
    const goalEntries: string[] = []

    if (activeGoal !== undefined) {
      activeGoalId = activeGoal.id
      goalEntries.push(`Goal ID: ${activeGoal.id} - ${activeGoal.description || activeGoal.identity}`)
      const criteria = activeGoal.acceptanceCriteria?.functional ?? []
      for (const crit of criteria) {
        goalEntries.push(`- Criterion [${crit.id}]: ${crit.description}`)
      }
      const goalText = goalEntries.join('\n')
      manifestItems.push({
        id: activeGoal.id,
        type: 'goal',
        name: activeGoal.description || activeGoal.identity,
        tokenEstimate: estimateTokens(goalText),
        byteSize: Buffer.byteLength(goalText, 'utf8'),
      })
      sections.push({
        title: 'Active Goal & Acceptance Criteria',
        type: 'goal',
        entries: goalEntries,
        tokenEstimate: estimateTokens(goalText),
      })
    }

    // 3. Subgoals
    const breakdownEngine = getBreakdownEngine()
    const activeSubgoalIds: string[] = []
    const subgoalEntries: string[] = []

    if (breakdownEngine !== undefined) {
      const tree = breakdownEngine.getTree()
      for (const [nodeId, node] of Object.entries(tree.nodes)) {
        if (node.level === 'SUB-MODULE' || node.level === 'FEATURE' || node.level === 'GOAL') {
          if (!targetModule || nodeId.includes(targetModule) || (node.parentId && node.parentId.includes(targetModule))) {
            activeSubgoalIds.push(nodeId)
            const text = `[${node.level}] ${node.id}: ${node.name} (${node.status})`
            subgoalEntries.push(text)
            manifestItems.push({
              id: node.id,
              type: 'subgoal',
              name: node.name,
              tokenEstimate: estimateTokens(text),
              byteSize: Buffer.byteLength(text, 'utf8'),
            })
          }
        }
      }
    }

    if (subgoalEntries.length > 0) {
      sections.push({
        title: 'Active Subgoals & Features',
        type: 'subgoals',
        entries: subgoalEntries,
        tokenEstimate: estimateTokens(subgoalEntries.join('\n')),
      })
    }

    // 4. Applicable Rules ONLY
    const ruleEngine = getRuleEngine()
    const applicableRuleIds: string[] = []
    const ruleEntries: string[] = []

    if (ruleEngine !== undefined) {
      const rules = ruleEngine.query({
        ...(targetModule ? { moduleScope: targetModule } : {}),
      })
      for (const rule of rules) {
        applicableRuleIds.push(rule.ruleId)
        const text = `[${rule.ruleId}] (${rule.category}/${rule.severity}) ${rule.title}: ${rule.description}`
        ruleEntries.push(text)
        manifestItems.push({
          id: rule.ruleId,
          type: 'rule',
          name: rule.title,
          tokenEstimate: estimateTokens(text),
          byteSize: Buffer.byteLength(text, 'utf8'),
        })
      }
    }

    if (ruleEntries.length > 0) {
      sections.push({
        title: 'Applicable Rules (Filtered)',
        type: 'rules',
        entries: ruleEntries,
        tokenEstimate: estimateTokens(ruleEntries.join('\n')),
      })
    }

    // 5. Relevant Blueprint Section
    const goalBpEngine = getGoalBpEngine()
    const bpEntries: string[] = []

    if (goalBpEngine !== undefined) {
      const targetBpKey = targetGoal || (activeGoal ? activeGoal.id : undefined)
      if (targetBpKey) {
        const bp = goalBpEngine.getBlueprint(targetBpKey)
        if (bp) {
          bpEntries.push(`Purpose: ${bp.purpose.description || bp.purpose.justification}`)
          bpEntries.push(`Expected Workflow: ${bp.workflow.steps.map(s => s.name).join(' → ')}`)
          bpEntries.push(`Target Elements: ${bp.elements.items.join(', ')}`)
          const bpText = bpEntries.join('\n')
          manifestItems.push({
            id: bp.goalId,
            type: 'blueprint',
            name: `Blueprint ${bp.goalId}`,
            tokenEstimate: estimateTokens(bpText),
            byteSize: Buffer.byteLength(bpText, 'utf8'),
          })
          sections.push({
            title: 'Relevant Blueprint Section',
            type: 'blueprint',
            entries: bpEntries,
            tokenEstimate: estimateTokens(bpText),
          })
        }
      }
    }

    // 6. Relevant Element IDs
    const elementEngine = getElementEngine()
    const matchedElementIds: string[] = []
    const elementEntries: string[] = []

    if (elementEngine !== undefined) {
      const elements = elementEngine.query({
        ...(targetModule ? { modulePrefix: targetModule } : {}),
      })
      for (const el of elements) {
        let match = false
        if (targetElementIds.has(el.elementId)) match = true
        if (query && (el.name.toLowerCase().includes(query) || el.elementId.toLowerCase().includes(query))) match = true
        if (!query && targetElementIds.size === 0 && (!targetModule || el.elementId.includes(targetModule))) match = true

        if (match) {
          matchedElementIds.push(el.elementId)
          const text = `[${el.elementId}] (${el.type}) ${el.name} -> DependsOn: ${(el.dependsOn || []).join(', ')}`
          elementEntries.push(text)
          manifestItems.push({
            id: el.elementId,
            type: 'element',
            name: el.name,
            tokenEstimate: estimateTokens(text),
            byteSize: Buffer.byteLength(text, 'utf8'),
          })
        }
      }
    }

    if (elementEntries.length > 0) {
      sections.push({
        title: 'Relevant Elements',
        type: 'elements',
        entries: elementEntries,
        tokenEstimate: estimateTokens(elementEntries.join('\n')),
      })
    }

    // 7. Exact Files
    const fileBpEngine = getFileBpEngine()
    const sourceFiles: string[] = []
    const fileEntries: string[] = []

    if (fileBpEngine !== undefined) {
      const blueprints = fileBpEngine.getBlueprints()
      for (const bp of blueprints) {
        if (!targetModule || bp.moduleId === targetModule || bp.moduleId.includes(targetModule)) {
          for (const f of bp.files) {
            sourceFiles.push(f.path)
            const text = `${f.path} (${f.type}) - ${f.purpose}`
            fileEntries.push(text)
            manifestItems.push({
              id: f.path,
              type: 'file',
              name: f.path,
              referencePath: f.path,
              tokenEstimate: estimateTokens(text),
              byteSize: Buffer.byteLength(text, 'utf8'),
            })
          }
        }
      }
    }

    if (fileEntries.length > 0) {
      sections.push({
        title: 'Exact Source Files',
        type: 'files',
        entries: fileEntries,
        tokenEstimate: estimateTokens(fileEntries.join('\n')),
      })
    }

    // 8. Direct Dependencies
    const depEngine = getDepEngine()
    const directDependencies: string[] = []
    const depEntries: string[] = []

    if (depEngine !== undefined && targetModule) {
      const deps = depEngine.getDirectDependencies(targetModule)
      for (const d of deps) {
        directDependencies.push(d)
        const text = `Direct Dep: ${targetModule} -> ${d}`
        depEntries.push(text)
        manifestItems.push({
          id: d,
          type: 'dependency',
          name: d,
          tokenEstimate: estimateTokens(text),
          byteSize: Buffer.byteLength(text, 'utf8'),
        })
      }
    }

    if (depEntries.length > 0) {
      sections.push({
        title: 'Direct Dependencies',
        type: 'dependencies',
        entries: depEntries,
        tokenEstimate: estimateTokens(depEntries.join('\n')),
      })
    }

    // 9. Relevant Tests
    const taskEngine = getTaskEngine()
    const testTaskIds: string[] = []
    const testEntries: string[] = []

    if (taskEngine !== undefined) {
      const tasks = targetModule ? taskEngine.getByModule(targetModule) : taskEngine.getAll()
      for (const t of tasks) {
        testTaskIds.push(t.id)
        const text = `Task/Test [${t.id}]: ${t.name} (Status: ${t.status}, Category: ${t.category})`
        testEntries.push(text)
        manifestItems.push({
          id: t.id,
          type: 'test',
          name: t.name,
          tokenEstimate: estimateTokens(text),
          byteSize: Buffer.byteLength(text, 'utf8'),
        })
      }
    }

    if (testEntries.length > 0) {
      sections.push({
        title: 'Relevant Tests & Tasks',
        type: 'tests',
        entries: testEntries,
        tokenEstimate: estimateTokens(testEntries.join('\n')),
      })
    }

    // 10. Previous Repair Records & Evidence
    const previousRepairIds: string[] = []
    const repairEntries: string[] = []
    const repairCache = getRepairCache()

    for (const [repId, rep] of repairCache.entries()) {
      if (!targetModule || rep.moduleId === targetModule || rep.target.toLowerCase().includes(query || '')) {
        previousRepairIds.push(repId)
        const text = `Previous Repair [${repId}]: Target="${rep.target}", Scope=${rep.scope}, Status=${rep.status}`
        repairEntries.push(text)
        manifestItems.push({
          id: repId,
          type: 'repair_evidence',
          name: rep.target,
          tokenEstimate: estimateTokens(text),
          byteSize: Buffer.byteLength(text, 'utf8'),
        })
      }
    }

    if (repairEntries.length > 0) {
      sections.push({
        title: 'Previous Repair Records & Evidence',
        type: 'repair_evidence',
        entries: repairEntries,
        tokenEstimate: estimateTokens(repairEntries.join('\n')),
      })
    }

    // Assemble Prompt Payload
    const promptLines: string[] = [
      `# TASK CONTEXT PACK [${packId}]`,
      `Target Task: ${request.taskId}`,
      ...(targetModule ? [`Module: ${targetModule}`] : []),
      '',
    ]

    for (const sec of sections) {
      promptLines.push(`## ${sec.title}`)
      for (const e of sec.entries) {
        promptLines.push(e)
      }
      promptLines.push('')
    }

    const promptPayload = promptLines.join('\n')
    const totalBytes = Buffer.byteLength(promptPayload, 'utf8')
    const totalTokens = estimateTokens(promptPayload)

    // Build Item Counts
    const itemCounts: Record<string, number> = {}
    for (const item of manifestItems) {
      itemCounts[item.type] = (itemCounts[item.type] || 0) + 1
    }

    const manifest: ContextPackManifest = {
      packId,
      taskId: request.taskId,
      moduleId: targetModule,
      goalId: targetGoal || activeGoalId,
      generatedAt: new Date().toISOString(),
      totalTokenEstimate: totalTokens,
      totalSizeBytes: totalBytes,
      itemCounts,
      items: manifestItems,
      checksum: computeChecksum(promptPayload),
    }

    const pack: ContextPack = {
      manifest,
      promptPayload,
      sections,
      relevantCrIds,
      activeGoalId,
      activeSubgoalIds,
      applicableRuleIds,
      elementIds: matchedElementIds,
      sourceFiles,
      directDependencies,
      testTaskIds,
      previousRepairIds,
    }

    this.packs.set(packId, pack)
    return pack
  }

  getManifest(packId: string): ContextPackManifest | undefined {
    return this.packs.get(packId)?.manifest
  }

  getContextPack(packId: string): ContextPack | undefined {
    return this.packs.get(packId)
  }

  listPacks(): ContextPackSummary[] {
    const list: ContextPackSummary[] = []
    for (const p of this.packs.values()) {
      list.push({
        packId: p.manifest.packId,
        taskId: p.manifest.taskId,
        moduleId: p.manifest.moduleId,
        totalTokens: p.manifest.totalTokenEstimate,
        totalBytes: p.manifest.totalSizeBytes,
        generatedAt: p.manifest.generatedAt,
      })
    }
    return list
  }

  clear(): void {
    this.packs.clear()
  }
}
