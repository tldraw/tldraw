import { ShapeIndicatorOverlayUtil } from '@tldraw/editor'
import { BrushOverlayUtil } from './overlays/BrushOverlayUtil'
import { ScribbleOverlayUtil } from './overlays/ScribbleOverlayUtil'
import { SnapIndicatorOverlayUtil } from './overlays/SnapIndicatorOverlayUtil'
import { ZoomBrushOverlayUtil } from './overlays/ZoomBrushOverlayUtil'

/** @public */
export const defaultOverlayUtils = [
	ShapeIndicatorOverlayUtil,
	BrushOverlayUtil,
	ZoomBrushOverlayUtil,
	SnapIndicatorOverlayUtil,
	ScribbleOverlayUtil,
] as const
