import { Geometry2d, OverlayUtil, Rectangle2d, TLOverlay, TLPointerEventInfo } from 'tldraw'
import { clearUnitSelection } from '../command'
import { dragSelect$, selectedBuildingId$ } from '../game-state'
import { MAP_BOUNDS } from '../map'

interface TLGroundOverlay extends TLOverlay {
	props: Record<string, never>
}

// Catch-all overlay underneath everything else. It owns:
//   - left-click on empty ground → start drag-select (window pointermove/up
//     listeners in the React `InputHandler` finalize)
//   - right-click on empty ground → move the selected units, or clear selection
//   - placement is handled by PlacementPreviewOverlayUtil at a higher zIndex,
//     which always wins when armed; this util never sees those clicks.
//
// We only need the geometry to cover the playable area plus a generous border
// so panning a bit beyond the map still lets the player click. The border is
// chosen large enough to feel infinite without being absurd.
const GROUND_PAD = 4000
export class GroundOverlayUtil extends OverlayUtil<TLGroundOverlay> {
	static override type = 'tlc-ground'
	override options = { zIndex: 0 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLGroundOverlay[] {
		return [{ id: 'tlc-ground:main', type: 'tlc-ground', props: {} }]
	}

	override getGeometry(): Geometry2d {
		return new Rectangle2d({
			x: MAP_BOUNDS.minX - GROUND_PAD,
			y: MAP_BOUNDS.minY - GROUND_PAD,
			width: MAP_BOUNDS.maxX - MAP_BOUNDS.minX + GROUND_PAD * 2,
			height: MAP_BOUNDS.maxY - MAP_BOUNDS.minY + GROUND_PAD * 2,
			isFilled: true,
		})
	}

	override onPointerDown(_overlay: TLGroundOverlay, info: TLPointerEventInfo): boolean {
		// Only left-click — right-clicks are routed through the contextmenu
		// listener in TlcraftExample.
		if (info.button !== 0) return false
		const point = this.editor.inputs.getCurrentPagePoint()
		// Left-click on empty ground starts a drag-select (or, if released
		// without movement, clears selection). The window-level pointermove
		// and pointerup handlers in DragSelectListener take it from here.
		selectedBuildingId$.set(null)
		if (!info.shiftKey) clearUnitSelection()
		dragSelect$.set({ x1: point.x, y1: point.y, x2: point.x, y2: point.y })
		return true
	}
}
