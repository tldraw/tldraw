import { BrushOverlayUtil } from './overlays/BrushOverlayUtil'
import { ZoomBrushOverlayUtil } from './overlays/ZoomBrushOverlayUtil'

/** @public */
export const defaultOverlayUtils = [BrushOverlayUtil, ZoomBrushOverlayUtil] as const
