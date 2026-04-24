import { ShapeIndicatorOverlayUtil } from '@tldraw/editor'
import { ArrowHintOverlayUtil } from './overlays/ArrowHintOverlayUtil'
import { BrushOverlayUtil } from './overlays/BrushOverlayUtil'
import { ScribbleOverlayUtil } from './overlays/ScribbleOverlayUtil'
import { SelectionForegroundOverlayUtil } from './overlays/SelectionForegroundOverlayUtil'
import { ShapeHandleOverlayUtil } from './overlays/ShapeHandleOverlayUtil'
import { SnapIndicatorOverlayUtil } from './overlays/SnapIndicatorOverlayUtil'
import { ZoomBrushOverlayUtil } from './overlays/ZoomBrushOverlayUtil'

/** @public */
export const defaultOverlayUtils = [
	ShapeIndicatorOverlayUtil,
	SelectionForegroundOverlayUtil,
	ShapeHandleOverlayUtil,
	BrushOverlayUtil,
	ZoomBrushOverlayUtil,
	SnapIndicatorOverlayUtil,
	ScribbleOverlayUtil,
	ArrowHintOverlayUtil,
] as const
