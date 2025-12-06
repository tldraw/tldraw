import { computed } from '@tldraw/state'
import { TLHandle, TLShape, TLShapeId, VecModel } from '@tldraw/tlschema'
import { assertExists, uniqueId } from '@tldraw/utils'
import { Vec } from '../../../primitives/Vec'
import { Geometry2d } from '../../../primitives/geometry/Geometry2d'
import { Editor } from '../../Editor'
import { PointsSnapIndicator, SnapData, SnapManager } from './SnapManager'

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

interface AlignPointsSnap {
	snaps: PointsSnapIndicator[]
	nudge: Vec
}

const defaultGetSelfSnapOutline = () => null
const defaultGetSelfSnapPoints = () => []
/** @public */
export class HandleSnaps {
	readonly editor: Editor
	constructor(readonly manager: SnapManager) {
		this.editor = manager.editor
	}

	@computed private getSnapGeometryCache() {
		const { editor } = this
		return editor.store.createComputedCache('handle snap geometry', (shape: TLShape) => {
			const snapGeometry = editor.getShapeUtil(shape).getHandleSnapGeometry(shape)
			const getSelfSnapOutline = snapGeometry.getSelfSnapOutline
				? snapGeometry.getSelfSnapOutline.bind(snapGeometry)
				: defaultGetSelfSnapOutline
			const getSelfSnapPoints = snapGeometry.getSelfSnapPoints
				? snapGeometry.getSelfSnapPoints.bind(snapGeometry)
				: defaultGetSelfSnapPoints

			return {
				outline:
					snapGeometry.outline === undefined
						? editor.getShapeGeometry(shape)
						: snapGeometry.outline,

				points: snapGeometry.points ?? [],
				getSelfSnapOutline,
				getSelfSnapPoints,
			}
		})
	}

	private *iterateSnapPointsInPageSpace(currentShapeId: TLShapeId, currentHandle: TLHandle) {
		const selfSnapPoints = this.getSnapGeometryCache()
			.get(currentShapeId)
			?.getSelfSnapPoints(currentHandle)
		if (selfSnapPoints && selfSnapPoints.length) {
			const shapePageTransform = assertExists(this.editor.getShapePageTransform(currentShapeId))
			for (const point of selfSnapPoints) {
				yield shapePageTransform.applyToPoint(point)
			}
		}

		for (const shapeId of this.manager.getSnappableShapes()) {
			if (shapeId === currentShapeId) continue
			const snapPoints = this.getSnapGeometryCache().get(shapeId)?.points
			if (!snapPoints || !snapPoints.length) continue

			const shapePageTransform = assertExists(this.editor.getShapePageTransform(shapeId))
			for (const point of snapPoints) {
				yield shapePageTransform.applyToPoint(point)
			}
		}
	}

	private *iterateSnapOutlines(currentShapeId: TLShapeId, currentHandle: TLHandle) {
		const selfSnapOutline = this.getSnapGeometryCache()
			.get(currentShapeId)
			?.getSelfSnapOutline(currentHandle)
		if (selfSnapOutline) {
			yield { shapeId: currentShapeId, outline: selfSnapOutline }
		}

		for (const shapeId of this.manager.getSnappableShapes()) {
			if (shapeId === currentShapeId) continue

			const snapOutline = this.getSnapGeometryCache().get(shapeId)?.outline
			if (!snapOutline) continue

			yield { shapeId, outline: snapOutline }
		}
	}

	private getHandleSnapPosition({
		currentShapeId,
		handle,
		handleInPageSpace,
	}: {
		currentShapeId: TLShapeId
		handle: TLHandle
		handleInPageSpace: Vec
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
		for (const snapPoint of this.iterateSnapPointsInPageSpace(currentShapeId, handle)) {
			if (Vec.DistMin(handleInPageSpace, snapPoint, minDistanceForSnapPoint)) {
				minDistanceForSnapPoint = Vec.Dist(handleInPageSpace, snapPoint)
				nearestSnapPoint = snapPoint
			}
		}

		// if we found a snap point, return it - we don't need to check the outlines because points
		// have a higher priority
		if (nearestSnapPoint) return nearestSnapPoint

		let minDistanceForOutline = snapThreshold
		let nearestPointOnOutline: Vec | null = null

		for (const { shapeId, outline } of this.iterateSnapOutlines(currentShapeId, handle)) {
			const shapePageTransform = assertExists(this.editor.getShapePageTransform(shapeId))
			const pointInShapeSpace = this.editor.getPointInShapeSpace(shapeId, handleInPageSpace)

			const nearestShapePointInShapeSpace = outline.nearestPoint(pointInShapeSpace)
			const nearestInPageSpace = shapePageTransform.applyToPoint(nearestShapePointInShapeSpace)

			if (Vec.DistMin(handleInPageSpace, nearestInPageSpace, minDistanceForOutline)) {
				minDistanceForOutline = Vec.Dist(handleInPageSpace, nearestInPageSpace)
				nearestPointOnOutline = nearestInPageSpace
			}
		}

		// if we found a point on the outline, return it
		if (nearestPointOnOutline) return nearestPointOnOutline

		// if not, there's no nearby snap point
		return null
	}

	private getHandleSnapData({
		handle,
		currentShapeId,
	}: {
		handle: TLHandle
		currentShapeId: TLShapeId
	}): AlignPointsSnap | null {
		const snapThreshold = this.manager.getSnapThreshold()
		const currentShapeTransform = assertExists(this.editor.getShapePageTransform(currentShapeId))
		const handleInPageSpace = currentShapeTransform.applyToPoint(handle)

		let nearestXSnap: Vec | null = null
		let nearestYSnap: Vec | null = null
		let minOffsetX = snapThreshold
		let minOffsetY = snapThreshold

		for (const snapPoint of this.iterateSnapPointsInPageSpace(currentShapeId, handle)) {
			const offsetX = Math.abs(handleInPageSpace.x - snapPoint.x)
			const offsetY = Math.abs(handleInPageSpace.y - snapPoint.y)
			if (offsetX < minOffsetX) {
				minOffsetX = offsetX
				nearestXSnap = snapPoint
			}
			if (offsetY < minOffsetY) {
				minOffsetY = offsetY
				nearestYSnap = snapPoint
			}
		}

		if (!nearestXSnap && !nearestYSnap) {
			return null
		}

		const nudge = new Vec(
			nearestXSnap ? nearestXSnap.x - handleInPageSpace.x : 0,
			nearestYSnap ? nearestYSnap.y - handleInPageSpace.y : 0
		)

		const snappedHandle = Vec.Add(handleInPageSpace, nudge)
		const snaps: PointsSnapIndicator[] = []

		if (nearestXSnap) {
			const snappedHandleOnX = new Vec(nearestXSnap.x, snappedHandle.y)
			snaps.push({
				id: uniqueId(),
				type: 'points',
				points: [nearestXSnap, snappedHandleOnX],
			})
		}
		if (nearestYSnap) {
			const snappedHandleOnY = new Vec(snappedHandle.x, nearestYSnap.y)
			snaps.push({
				id: uniqueId(),
				type: 'points',
				points: [nearestYSnap, snappedHandleOnY],
			})
		}

		return { snaps, nudge }
	}

	snapHandle({
		currentShapeId,
		handle,
	}: {
		currentShapeId: TLShapeId
		handle: TLHandle
	}): SnapData | null {
		const currentShapeTransform = assertExists(this.editor.getShapePageTransform(currentShapeId))
		const handleInPageSpace = currentShapeTransform.applyToPoint(handle)
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		const snapType = handle.canSnap ? 'point' : handle.snapType

		if (snapType === 'point') {
			const snapPosition = this.getHandleSnapPosition({ currentShapeId, handle, handleInPageSpace })

			if (!snapPosition) {
				return null
			}

			this.manager.setIndicators([
				{
					id: uniqueId(),
					type: 'points',
					points: [snapPosition],
				},
			])

			return { nudge: Vec.Sub(snapPosition, handleInPageSpace) }
		}

		if (snapType === 'align') {
			const snapData = this.getHandleSnapData({
				handle,
				currentShapeId,
			})

			if (!snapData) {
				return null
			}

			this.manager.setIndicators(snapData.snaps)

			return { nudge: snapData.nudge }
		}

		return null
	}
}
