import { computed } from '@tldraw/state'
import { TLHandle, TLShape, VecModel } from '@tldraw/tlschema'
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
 * Any co-ordinates here should be in the shape's local space.
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
	/**
	 * Key points on the shape that the handle will snap to. For example, the corners of a
	 * rectangle, or the centroid of a triangle. By default, no points are used.
	 */
	points?: VecModel[]
	/**
	 * By default, handles can't snap to their own shape because moving the handle might change the
	 * snapping location which can cause feedback loops. You can override this by returning a
	 * version of `outline` that won't be affected by the current handle's position to use for
	 * self-snapping.
	 */
	getSelfSnapOutline?(handle: TLHandle): Geometry2d | null
	/**
	 * By default, handles can't snap to their own shape because moving the handle might change the
	 * snapping location which can cause feedback loops. You can override this by returning a
	 * version of `points` that won't be affected by the current handle's position to use for
	 * self-snapping.
	 */
	getSelfSnapPoints?(handle: TLHandle): VecModel[]
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

				points: snapGeometry.points,
			}
		})
	}

	private getHandleSnapPosition({
		handlePoint,
		additionalSegments,
	}: {
		handlePoint: Vec
		additionalSegments: Vec[][]
	}): Vec | null {
		const snapThreshold = this.manager.getSnapThreshold()

		// We snap to two different parts of the shape's handle snap geometry:
		// 1. The `points`. These are handles or other key points that we want to snap to with a
		//    higher priority than the normal outline snapping.
		// 2. The `outline`. This describes the outline of the shape, and we just snap to the
		//    nearest point on that outline.

		// Start with the points:
		let minDistanceForSnapPoint = snapThreshold
		let nearestSnapPoint: Vec | null = null
		for (const shapeId of this.manager.getSnappableShapes()) {
			const snapPoints = this.getSnapGeometryCache().get(shapeId)?.points
			if (!snapPoints) continue

			const shapePageTransform = assertExists(this.editor.getShapePageTransform(shapeId))

			for (const snapPointInShapeSpace of snapPoints) {
				const snapPointInPageSpace = shapePageTransform.applyToPoint(snapPointInShapeSpace)
				const distance = Vec.Dist(handlePoint, snapPointInPageSpace)

				if (distance < minDistanceForSnapPoint) {
					minDistanceForSnapPoint = distance
					nearestSnapPoint = snapPointInPageSpace
				}
			}
		}

		// if we found a snap point, return it - we don't need to check the outlines because points
		// have a higher priority
		if (nearestSnapPoint) return nearestSnapPoint

		let minDistanceForOutline = snapThreshold
		let nearestPointOnOutline: Vec | null = null

		for (const shapeId of this.manager.getSnappableShapes()) {
			const snapOutline = this.getSnapGeometryCache().get(shapeId)?.outline
			if (!snapOutline) continue

			const shapePageTransform = assertExists(this.editor.getShapePageTransform(shapeId))
			const pointInShapeSpace = this.editor.getPointInShapeSpace(shapeId, handlePoint)

			const nearestShapePointInShapeSpace = snapOutline.nearestPoint(pointInShapeSpace)
			const nearestInPageSpace = shapePageTransform.applyToPoint(nearestShapePointInShapeSpace)
			const distance = Vec.Dist(handlePoint, nearestInPageSpace)

			if (distance < minDistanceForOutline) {
				minDistanceForOutline = distance
				nearestPointOnOutline = nearestInPageSpace
			}
		}

		// We also allow passing "additionSegments" for self-snapping.
		// TODO(alex): replace this with a proper self-snapping solution
		for (const segment of additionalSegments) {
			const nearestOnSegment = Vec.NearestPointOnLineSegment(segment[0], segment[1], handlePoint)
			const distance = Vec.Dist(handlePoint, nearestOnSegment)

			if (distance < minDistanceForOutline) {
				minDistanceForOutline = distance
				nearestPointOnOutline = nearestOnSegment
			}
		}

		// if we found a point on the outline, return it
		if (nearestPointOnOutline) return nearestPointOnOutline

		// if not, there's no nearby snap point
		return null
	}

	snapHandle(opts: { handlePoint: Vec; additionalSegments: Vec[][] }): SnapData | null {
		const snapPosition = this.getHandleSnapPosition(opts)

		// If we found a point, display snap lines, and return the nudge
		if (snapPosition) {
			this.manager.setIndicators([
				{
					id: uniqueId(),
					type: 'points',
					points: [snapPosition],
				},
			])

			return { nudge: Vec.Sub(snapPosition, opts.handlePoint) }
		}

		return null
	}
}
