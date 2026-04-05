import { BrushOverlayUtil } from './overlays/BrushOverlayUtil'
import { SelectionForegroundOverlayUtil } from './overlays/SelectionForegroundOverlayUtil'

/** @public */
export const defaultOverlayUtils = [SelectionForegroundOverlayUtil, BrushOverlayUtil] as const
