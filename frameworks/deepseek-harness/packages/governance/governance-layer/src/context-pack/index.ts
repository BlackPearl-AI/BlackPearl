/**
 * G-28 — Task-Specific Context Pack Engine: barrel exports.
 *
 * @module @deepseek-ai/dsh-governance-layer/context-pack
 */

export { ContextPackEngine } from './engine.ts'

export {
  createBuildContextPackTool,
  createGetContextPackManifestTool,
  createEstimateContextSizeTool,
  getActiveEngine,
  resetEngine,
} from './tools.ts'

export type {
  ContextPackRequest,
  ManifestItemMeta,
  ContextPackManifest,
  ContextPackSection,
  ContextPack,
  ContextPackSummary,
} from './types.ts'
