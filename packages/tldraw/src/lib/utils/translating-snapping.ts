import type { Editor, MovingShapeSnapshot } from '@tldraw/editor'
import { BoundsSnapPoint, Box, TLNoteShape, Vec } from '@tldraw/editor'
import { NOTE_ADJACENT_POSITION_SNAP_RADIUS, NOTE_CENTER_OFFSET } from '../shapes/note/noteHelpers'

export interface SnapDeltaResult {
	snapDelta?: Vec
	skipGridSnap: boolean
}

export interface SnappableSnapshot {
	initialPageBounds: Box
	initialSnapPoints: BoundsSnapPoint[]
	noteAdjacentPositions?: Vec[]
	noteSnapshot?: (MovingShapeSnapshot & { shape: TLNoteShape }) | undefined
}

/**
 * Compute snap delta for a translate operation, handling both
 * standard shape-bounds snapping and sticky note pit snapping.
 */
export function computeTranslateSnapDelta(
	editor: Editor,
	snapshot: SnappableSnapshot
): SnapDeltaResult {
	const { inputs } = editor
	const shiftKey = inputs.getShiftKey()
	const accelKey = inputs.getAccelKey()

	const delta = Vec.Sub(inputs.getCurrentPagePoint(), inputs.getOriginPagePoint())

	const flatten: 'x' | 'y' | null = shiftKey
		? Math.abs(delta.x) < Math.abs(delta.y)
			? 'x'
			: 'y'
		: null

	if (flatten === 'x') {
		delta.x = 0
	} else if (flatten === 'y') {
		delta.y = 0
	}

	editor.snaps.clearIndicators()

	const isSnapping = editor.user.getIsSnapMode() ? !accelKey : accelKey
	if (isSnapping && inputs.getPointerVelocity().len() < 0.5) {
		const { nudge } = editor.snaps.shapeBounds.snapTranslateShapes({
			dragDelta: delta,
			initialSelectionPageBounds: snapshot.initialPageBounds,
			lockedAxis: flatten,
			initialSelectionSnapPoints: snapshot.initialSnapPoints,
		})
		return { snapDelta: Vec.From(nudge), skipGridSnap: false }
	} else {
		if (snapshot.noteSnapshot && snapshot.noteAdjacentPositions) {
			const { scale } = snapshot.noteSnapshot.shape.props
			const pageCenter = snapshot.noteSnapshot.pagePoint
				.clone()
				.add(delta)
				.add(NOTE_CENTER_OFFSET.clone().mul(scale).rot(snapshot.noteSnapshot.pageRotation))

			let min = NOTE_ADJACENT_POSITION_SNAP_RADIUS / editor.getZoomLevel()
			let offset = new Vec(0, 0)
			let snappedToPit = false
			for (const pit of snapshot.noteAdjacentPositions) {
				const deltaToPit = Vec.Sub(pageCenter, pit)
				const dist = deltaToPit.len()
				if (dist < min) {
					snappedToPit = true
					min = dist
					offset = deltaToPit
				}
			}

			if (snappedToPit) {
				return {
					snapDelta: new Vec(-offset.x, -offset.y),
					skipGridSnap: true,
				}
			}
		}
	}

	return { skipGridSnap: false }
}
