/**
 * Prompt rendering for the Master Goal Gate: produces compact status
 * text showing module states, active/locked counts, and critical-path
 * highlights.
 *
 * @module @deepseek-ai/dsh-governance-layer/master-goal-gate/status
 */

import type {
  MasterGoalBreakdown,
  ModuleStatus,
  ModuleStatusText,
} from './types.ts'

/**
 * Status emoji for compact rendering.
 */
const STATUS_ICON: Record<ModuleStatus, string> = {
  active: '🟢',
  locked: '🔴',
  completed: '✅',
  skipped: '⬜',
}

/**
 * Format the master-goal breakdown as compact status text for the prompt.
 *
 * Output format:
 * ```
 * ## Master Goal: School ERP बनाओ
 * Goal ID: MG-ABC123
 *
 * ### Domains & Modules
 *
 * **Student**
 *   🟢 active   student-master      (0 deps, unlocks 2)
 *   🔴 locked   enrollment          (depends: student-master)
 *
 * **Fees**
 *   🔴 locked   fees                (depends: enrollment)
 *
 * ### Summary
 * 🟢 1 active  |  🔴 4 locked  |  ✅ 0 completed
 *
 * ### Critical Path
 * student-master → enrollment → fees
 * ```
 */
export function formatModuleStatus(breakdown: MasterGoalBreakdown): string {
  const lines: string[] = []

  // Header.
  lines.push(`## Master Goal: ${breakdown.objective}`)
  lines.push(`Goal ID: ${breakdown.goalId}`)
  lines.push('')

  // Domains & Modules.
  lines.push('### Domains & Modules')
  lines.push('')

  for (const domain of breakdown.domains) {
    lines.push(`**${domain.name}**`)

    for (const moduleId of domain.moduleIds) {
      const mod = breakdown.moduleMap[moduleId]
      if (mod === undefined) continue

      const icon = STATUS_ICON[mod.status]
      const statusPad = mod.status.padEnd(10)
      const depsInfo = mod.dependsOn.length === 0
        ? 'no deps'
        : `depends: ${mod.dependsOn.join(', ')}`
      const unlocksInfo = mod.dependents.length > 0
        ? ` (unlocks ${mod.dependents.length})`
        : ''

      lines.push(`  ${icon} ${statusPad} ${mod.id.padEnd(22)} ${depsInfo}${unlocksInfo}`)
    }

    lines.push('')
  }

  // Summary.
  const active = breakdown.activeModules.length
  const locked = breakdown.lockedModules.length
  const completed = Object.values(breakdown.moduleMap).filter(m => m.status === 'completed').length
  const skipped = Object.values(breakdown.moduleMap).filter(m => m.status === 'skipped').length

  const parts: string[] = []
  if (active > 0) parts.push(`🟢 ${active} active`)
  if (locked > 0) parts.push(`🔴 ${locked} locked`)
  if (completed > 0) parts.push(`✅ ${completed} completed`)
  if (skipped > 0) parts.push(`⬜ ${skipped} skipped`)

  lines.push('### Summary')
  lines.push(parts.join('  |  '))
  lines.push('')

  // Critical Path.
  if (breakdown.criticalPath.length > 0) {
    lines.push('### Critical Path')
    lines.push(breakdown.criticalPath.join(' → '))
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Get compact module status text as structured data.
 */
export function getModuleStatusText(breakdown: MasterGoalBreakdown): ModuleStatusText {
  const lines: string[] = []
  const totalModules = breakdown.topologicalOrder.length

  for (const domain of breakdown.domains) {
    lines.push(`── ${domain.name} ──`)
    for (const moduleId of domain.moduleIds) {
      const mod = breakdown.moduleMap[moduleId]
      if (mod === undefined) continue

      const icon = STATUS_ICON[mod.status]
      const depCount = mod.dependsOn.length
      const depStr = depCount === 0 ? 'no deps' : `${depCount} deps`
      lines.push(`  ${icon} ${mod.id} [${depStr}]`)
    }
  }

  const active = breakdown.activeModules.length
  const locked = breakdown.lockedModules.length
  const completed = Object.values(breakdown.moduleMap).filter(m => m.status === 'completed').length

  return {
    lines,
    summary: `${active} active, ${locked} locked, ${completed} completed (${totalModules} total)`,
  }
}
