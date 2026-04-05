import { BrushOverlayUtil } from './overlays/BrushOverlayUtil'
import { SelectionForegroundOverlayUtil } from './overlays/SelectionForegroundOverlayUtil'
import { ZoomBrushOverlayUtil } from './overlays/ZoomBrushOverlayUtil'

/** @public */
export const defaultOverlayUtils = [
	SelectionForegroundOverlayUtil,
	BrushOverlayUtil,
	ZoomBrushOverlayUtil,
] as const
