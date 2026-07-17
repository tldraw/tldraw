import { ArrowBindingHintOverlayUtil } from './overlays/ArrowBindingHintOverlayUtil'
import { ArrowHintOverlayUtil } from './overlays/ArrowHintOverlayUtil'
import { BrushOverlayUtil } from './overlays/BrushOverlayUtil'
import { CollaboratorBrushOverlayUtil } from './overlays/CollaboratorBrushOverlayUtil'
import { CollaboratorCursorOverlayUtil } from './overlays/CollaboratorCursorOverlayUtil'
import { CollaboratorHintOverlayUtil } from './overlays/CollaboratorHintOverlayUtil'
import { CollaboratorScribbleOverlayUtil } from './overlays/CollaboratorScribbleOverlayUtil'
import { CollaboratorShapeIndicatorOverlayUtil } from './overlays/CollaboratorShapeIndicatorOverlayUtil'
import { ScribbleOverlayUtil } from './overlays/ScribbleOverlayUtil'
import { SelectionForegroundOverlayUtil } from './overlays/SelectionForegroundOverlayUtil'
import { ShapeHandleOverlayUtil } from './overlays/ShapeHandleOverlayUtil'
import { ShapeIndicatorOverlayUtil } from './overlays/ShapeIndicatorOverlayUtil'
import { SnapIndicatorOverlayUtil } from './overlays/SnapIndicatorOverlayUtil'
import { ZoomBrushOverlayUtil } from './overlays/ZoomBrushOverlayUtil'

/** @public */
export const defaultOverlayUtils = [
	ArrowBindingHintOverlayUtil,
	ArrowHintOverlayUtil,
	BrushOverlayUtil,
	CollaboratorBrushOverlayUtil,
	CollaboratorCursorOverlayUtil,
	CollaboratorHintOverlayUtil,
	CollaboratorScribbleOverlayUtil,
	CollaboratorShapeIndicatorOverlayUtil,
	ScribbleOverlayUtil,
	SelectionForegroundOverlayUtil,
	ShapeHandleOverlayUtil,
	ShapeIndicatorOverlayUtil,
	SnapIndicatorOverlayUtil,
	ZoomBrushOverlayUtil,
] as const
