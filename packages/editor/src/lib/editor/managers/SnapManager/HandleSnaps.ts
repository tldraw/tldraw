import { computed } from '@tldraw/state'
import { TLShape } from '@tldraw/tlschema'
import { assertExists } from '@tldraw/utils'
import { Vec } from '../../../primitives/Vec'
import { Geometry2d } from '../../../primitives/geometry/Geometry2d'
import { uniqueId } from '../../../utils/uniqueId'
import { Editor } from '../../Editor'
import { SnapData, SnapManager } from './SnapManager'

/**
 * When dragging a handle, users can snap the handle to key geometry on other nearby shapes.
 * Customize how handles snap to a shape by returning this from
 * {@link ShapeUtil.getHandleSnapGeometry}.
 *
 * @public
 */
export interface HandleSnapGeometry {
	/**
	 * A `Geometry2d` that describe the outline of the shape that the handle will snap to - fills
	 * are ignored. By default, this is the same geometry returned by {@link ShapeUtil.getGeometry}.
	 * Set this to `null` to disable handle snapping to this shape's outline.
	 */
	outline?: Geometry2d | null
}

export class HandleSnaps {
	readonly editor: Editor
	constructor(readonly manager: SnapManager) {
		this.editor = manager.editor
	}

	@computed private getSnapGeometryCache() {
		const { editor } = this
		return editor.store.createComputedCache('handle snap geometry', (shape: TLShape) => {
			const snapGeometry = editor.getShapeUtil(shape).getHandleSnapGeometry(shape)

			return {
				outline:
					snapGeometry.outline === undefined
						? editor.getShapeGeometry(shape)
						: snapGeometry.outline,
			}
		})
	}

	snapHandle({
		handlePoint,
		additionalSegments,
	}: {
		handlePoint: Vec
		additionalSegments: Vec[][]
	}): SnapData | null {
		const snapThreshold = this.manager.getSnapThreshold()

		// Find the nearest point that is within the snap threshold
		let minDistance = snapThreshold
		let nearestPoint: Vec | null = null

		for (const shapeId of this.manager.getSnappableShapes()) {
			const handleSnapOutline = this.getSnapGeometryCache().get(shapeId)?.outline
			if (!handleSnapOutline) continue

			const shapePageTransform = assertExists(this.editor.getShapePageTransform(shapeId))
			const pointInShapeSpace = this.editor.getPointInShapeSpace(shapeId, handlePoint)
			const nearestShapePointInShapeSpace = handleSnapOutline.nearestPoint(pointInShapeSpace)
			const nearestInPageSpace = shapePageTransform.applyToPoint(nearestShapePointInShapeSpace)
			const distance = Vec.Dist(handlePoint, nearestInPageSpace)

			if (distance < minDistance) {
				minDistance = distance
				nearestPoint = nearestInPageSpace
			}
		}

		// handle additional segments:
		for (const segment of additionalSegments) {
			const nearestOnSegment = Vec.NearestPointOnLineSegment(segment[0], segment[1], handlePoint)
			const distance = Vec.Dist(handlePoint, nearestOnSegment)

			if (distance < minDistance) {
				minDistance = distance
				nearestPoint = nearestOnSegment
			}
		}

		// If we found a point, display snap lines, and return the nudge
		if (nearestPoint) {
			this.manager.setIndicators([
				{
					id: uniqueId(),
					type: 'points',
					points: [nearestPoint],
				},
			])

			return { nudge: Vec.Sub(nearestPoint, handlePoint) }
		}

		return null
	}
}
