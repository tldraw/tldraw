import { BrushOverlayUtil } from './overlays/BrushOverlayUtil'
import { CollaboratorBrushOverlayUtil } from './overlays/CollaboratorBrushOverlayUtil'
import { CollaboratorHintOverlayUtil } from './overlays/CollaboratorHintOverlayUtil'
import { CollaboratorScribbleOverlayUtil } from './overlays/CollaboratorScribbleOverlayUtil'
import { ScribbleOverlayUtil } from './overlays/ScribbleOverlayUtil'
import { SelectionForegroundOverlayUtil } from './overlays/SelectionForegroundOverlayUtil'
import { ShapeHandleOverlayUtil } from './overlays/ShapeHandleOverlayUtil'
import { SnapIndicatorOverlayUtil } from './overlays/SnapIndicatorOverlayUtil'
import { ZoomBrushOverlayUtil } from './overlays/ZoomBrushOverlayUtil'

/** @public */
export const defaultOverlayUtils = [
	SelectionForegroundOverlayUtil,
	ShapeHandleOverlayUtil,
	BrushOverlayUtil,
	ZoomBrushOverlayUtil,
	SnapIndicatorOverlayUtil,
	ScribbleOverlayUtil,
	CollaboratorBrushOverlayUtil,
	CollaboratorScribbleOverlayUtil,
	CollaboratorHintOverlayUtil,
] as const
