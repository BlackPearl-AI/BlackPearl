/**
 * PHASE 14 — Vertical Slice Implementation
 *
 * One slice at a time. No confusion.
 *
 * हर slice = UI + API + DB + Business Logic + Mapping + Permission + Print + Integration
 * Complete hota hai tabhi next.
 */

export type {
  SliceStatus,
  LayerStatus,
  LayerId,
  SliceLayer,
  SliceValidation,
  SliceTraceability,
  VerticalSlice,
  SliceSummary,
  SliceIssue,
  SliceValidationResult,
} from './types.ts'

export { LAYER_LABELS, LAYER_ORDER } from './types.ts'

export { VerticalSliceEngine } from './engine.ts'

export {
  createCreateVerticalSliceTool,
  createStartSliceLayerTool,
  createCompleteSliceLayerTool,
  createFailSliceLayerTool,
  createSkipSliceLayerTool,
  createValidateSliceTool,
  createGetSliceStatusTool,
  createGetSliceSummaryTool,
  createBlockSliceTool,
  createUnblockSliceTool,
  createCompleteVerticalSliceTool,
  createGetModuleSlicesTool,
  resetEngine,
  getActiveEngine,
} from './tools.ts'
