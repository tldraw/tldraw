import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { compact, exhaustiveSwitchError } from '@tldraw/utils'
import { Box } from '../../../primitives/Box'
import { Group2d } from '../../../primitives/geometry/Group2d'
import { pointInPolygon } from '../../../primitives/utils'
import { Vec, VecLike } from '../../../primitives/Vec'
import {
	classifyClosedShapeHit,
	classifyFrameLikeHit,
	createHitRanking,
	getBestHit,
	getBestOpenShapeHit,
	getDistanceToGeometry,
	offerHollowHit,
	offerMarginHit,
} from '../../kernels/hitTest'
import { TLGetShapeAtPointOptions } from '../../types/misc-types'
import { EditorManager } from '../EditorManager'

/**
 * Finding shapes at a point or inside bounds.
 *
 * @public
 */
export class HitTestManager extends EditorManager {
	/**
	 * Get the top-most selected shape at the given point, ignoring groups.
	 *
	 * @param point - The point to check.
	 *
	 * @returns The top-most selected shape at the given point, or undefined if there is no shape at the point.
	 */
	getSelectedShapeAtPoint(point: VecLike): TLShape | undefined {
		const selectedShapeIds = this.editor.getSelectedShapeIds()
		if (selectedShapeIds.length === 0) return undefined
		const selectedShapeIdSet = new Set(selectedShapeIds)
		const margin = this.editor.getHitTestMargin()
		const sortedShapes = this.editor.getCurrentPageShapesSorted()

		// iterate from the top (highest z-index) to find the top-most matching shape
		for (let i = sortedShapes.length - 1; i >= 0; i--) {
			const shape = sortedShapes[i]
			if (shape.type === 'group') continue
			if (!selectedShapeIdSet.has(shape.id)) continue
			if (
				this.editor
					.getShapeGeometry(shape)
					.hitTestPoint(this.editor.getPointInShapeSpace(shape, point), margin, true)
			) {
				return shape
			}
		}

		return undefined
	}

	/**
	 * Get the shape at the current point.
	 *
	 * @param point - The point to check.
	 * @param opts - Options for the check: `hitInside` to check if the point is inside the shape, `margin` to check if the point is within a margin of the shape, `hitFrameInside` to check if the point is inside the frame, and `filter` to filter the shapes to check.
	 *
	 * @returns The shape at the given point, or undefined if there is no shape at the point.
	 */
	getShapeAtPoint(point: VecLike, opts: TLGetShapeAtPointOptions = {}): TLShape | undefined {
		const viewportPageBounds = this.editor.getViewportPageBounds()
		const {
			filter,
			margin = 0,
			hitLocked = false,
			hitLabels = false,
			hitInside = false,
			hitFrameInside = false,
		} = opts

		const [innerMargin, outerMargin] = Array.isArray(margin) ? margin : [margin, margin]

		const ranking = createHitRanking<TLShape>()

		// Use larger margin for spatial search to account for edge distance checks
		const searchMargin = Math.max(innerMargin, outerMargin, this.editor.getHitTestMargin())
		const candidateIds = this.editor._spatialIndex.getShapeIdsAtPoint(point, searchMargin)

		const shapesToCheck = opts.renderingOnly
			? this.editor.getCurrentPageRenderingShapesSorted()
			: this.editor.getCurrentPageShapesSorted()

		for (let i = shapesToCheck.length - 1; i >= 0; i--) {
			const shape = shapesToCheck[i]
			// Frame-like shapes have labels positioned above the shape (outside bounds), so always include them
			if (!candidateIds.has(shape.id) && !this.editor.isShapeFrameLike(shape)) continue
			if (
				(shape.isLocked && !hitLocked) ||
				this.editor.isShapeHidden(shape) ||
				this.editor.isShapeOfType(shape, 'group')
			) {
				continue
			}
			const pageMask = this.editor.getShapeMask(shape)
			if (pageMask && !pointInPolygon(point, pageMask)) continue
			if (filter && !filter(shape)) continue

			const geometry = this.editor.getShapeGeometry(shape)
			const isGroup = geometry instanceof Group2d

			const pointInShapeSpace = this.editor.getPointInShapeSpace(shape, point)

			// Check labels first. Only group geometries can carry a label child; a frame-like
			// shape util may still return a plain geometry.
			const shapeUtil = this.editor.getShapeUtil(shape)
			const isShapeFrameLike = this.editor.isShapeFrameLike(shape)
			if (
				isGroup &&
				(isShapeFrameLike ||
					((this.editor.isShapeOfType(shape, 'note') ||
						this.editor.isShapeOfType(shape, 'arrow') ||
						(this.editor.isShapeOfType(shape, 'geo') && shape.props.fill === 'none')) &&
						shapeUtil.getText(shape)?.trim()))
			) {
				for (const childGeometry of geometry.children) {
					if (childGeometry.isLabel && childGeometry.isPointInBounds(pointInShapeSpace)) {
						return shape
					}
				}
			}

			if (isShapeFrameLike) {
				// On the rare case that we've hit a frame-like shape (not its label), test again hitInside to be forced true;
				// this prevents clicks from passing through the body of a frame to shapes behind it.
				const frameHit = classifyFrameLikeHit(geometry, pointInShapeSpace, {
					innerMargin,
					outerMargin,
					hitFrameInside,
				})

				// If the hit is within the frame's outer margin, then select the frame
				if (frameHit === 'in-margin') return ranking.marginHit || shape

				if (frameHit === 'body') {
					// Once we've hit a frame, we want to end the search. If we have hit a shape
					// already, then this would either be above the frame or a child of the frame,
					// so we want to return that. Otherwise, the point is in the empty space of the
					// frame. If `hitFrameInside` is true (e.g. used drawing an arrow into the
					// frame) we the frame itself; other wise, (e.g. when hovering or pointing)
					// we would want to return null.
					return getBestHit(ranking) || (hitFrameInside ? shape : undefined)
				}

				continue
			}

			const distance = getDistanceToGeometry(geometry, pointInShapeSpace, {
				isGroup,
				hitLabels,
				hitInside,
				outerMargin,
			})

			if (geometry.isClosed) {
				const hit = classifyClosedShapeHit(geometry, pointInShapeSpace, distance, {
					innerMargin,
					outerMargin,
					hitInside,
					isGroup,
					hasMarginHit: !!ranking.marginHit,
				})

				switch (hit.type) {
					case 'filled': {
						return ranking.marginHit || shape
					}
					case 'ignored': {
						continue
					}
					case 'in-margin': {
						offerMarginHit(ranking, shape, hit.distance)
						break
					}
					case 'hollow': {
						// If the shape is bigger than the viewport, then skip it. (Only here: its
						// edges should still be hittable within the margin.)
						if (this.editor.getShapePageBounds(shape)!.contains(viewportPageBounds)) continue
						offerHollowHit(ranking, shape, geometry.area)
						break
					}
					case 'miss': {
						break
					}
					default: {
						throw exhaustiveSwitchError(hit, 'type')
					}
				}
			} else {
				// For open shapes (e.g. lines or draw shapes) always use the margin.
				// If the distance is less than the margin, return the shape as the hit.
				// Use the editor's configurable hit test margin.
				if (distance < this.editor.getHitTestMargin()) {
					return getBestOpenShapeHit(ranking, shape, distance)
				}
			}
		}

		return getBestHit(ranking)
	}

	/**
	 * Get the shapes, if any, at a given page point.
	 *
	 * @example
	 * ```ts
	 * editor.getShapesAtPoint({ x: 100, y: 100 })
	 * editor.getShapesAtPoint({ x: 100, y: 100 }, { hitInside: true, margin: 8 })
	 * ```
	 *
	 * @param point - The page point to test.
	 * @param opts - The options for the hit point testing.
	 *
	 * @returns An array of shapes at the given point, sorted in reverse order of their absolute z-index (top-most shape first).
	 *
	 * @public
	 */
	getShapesAtPoint(
		point: VecLike,
		opts = {} as { margin?: number; hitInside?: boolean }
	): TLShape[] {
		const margin = opts.margin ?? 0
		const candidateIds = this.editor._spatialIndex.getShapeIdsAtPoint(point, margin)

		// Get all page shapes in z-index order and filter to candidates that pass isPointInShape.
		// Frame-like shapes are always checked because their labels can be outside their bounds.
		// Iterate backwards so the result is pre-sorted in reverse z-index order (top-most first).
		const sorted = this.editor.getCurrentPageShapesSorted()
		const result: TLShape[] = []
		for (let i = sorted.length - 1; i >= 0; i--) {
			const shape = sorted[i]
			if (this.editor.isShapeHidden(shape)) continue
			if (!candidateIds.has(shape.id) && !this.editor.isShapeFrameLike(shape)) continue
			if (this.editor.isPointInShape(shape, point, opts)) result.push(shape)
		}
		return result
	}

	/**
	 * Get shape IDs within the given bounds.
	 *
	 * Note: Uses shape page bounds only. Frames with labels outside their bounds
	 * may not be included even if the label is within the search bounds.
	 *
	 * Note: Results are unordered. If you need z-order, combine with sorted shapes:
	 * ```ts
	 * const candidates = editor.getShapeIdsInsideBounds(bounds)
	 * const sorted = editor.getCurrentPageShapesSorted().filter(s => candidates.has(s.id))
	 * ```
	 *
	 * @param bounds - The bounds to search within.
	 * @returns Unordered set of shape IDs within the given bounds.
	 *
	 * @public
	 */
	getShapeIdsInsideBounds(bounds: Box): Set<TLShapeId> {
		return this.editor._spatialIndex.getShapeIdsInsideBounds(bounds)
	}

	/**
	 * Test whether a point (in the current page space) will will a shape. This method takes into account masks,
	 * such as when a shape is the child of a frame and is partially clipped by the frame.
	 *
	 * @example
	 * ```ts
	 * editor.isPointInShape({ x: 100, y: 100 }, myShape)
	 * ```
	 *
	 * @param shape - The shape to test against.
	 * @param point - The page point to test (in the current page space).
	 * @param opts - The options for the hit point testing.
	 *
	 * @public
	 */
	isPointInShape(
		shape: TLShape | TLShapeId,
		point: VecLike,
		opts = {} as {
			margin?: number
			hitInside?: boolean
		}
	): boolean {
		const { hitInside = false, margin = 0 } = opts
		const id = typeof shape === 'string' ? shape : shape.id
		// If the shape is masked, and if the point falls outside of that
		// mask, then it's definitely a miss—we don't need to test further.
		const pageMask = this.editor.getShapeMask(id)
		if (pageMask && !pointInPolygon(point, pageMask)) return false

		return this.editor
			.getShapeGeometry(id)
			.hitTestPoint(this.editor.getPointInShapeSpace(shape, point), margin, hitInside)
	}

	/**
	 * Get the shape that some shapes should be dropped on at a given point.
	 *
	 * @param point - The point to find the parent for.
	 * @param droppingShapes - The shapes that are being dropped.
	 *
	 * @returns The shape to drop on.
	 *
	 * @public
	 */
	getDraggingOverShape(point: Vec, droppingShapes: TLShape[]): TLShape | undefined {
		// get fresh moving shapes
		const draggingShapes = compact(droppingShapes.map((s) => this.editor.getShape(s))).filter(
			(s) => !s.isLocked && !this.editor.isShapeHidden(s)
		)
		// Descendants of the dragged shapes can't be the target, otherwise dragging a frame out of
		// its parent reports a nested child as the target and the parent never sees the drag leave
		const excludedIds = this.editor.getShapeAndDescendantIds(draggingShapes.map((s) => s.id))

		const maybeDraggingOverShapes = this.editor
			.getShapesAtPoint(point, {
				hitInside: true,
				margin: 0,
			})
			.filter(
				(s) =>
					!droppingShapes.includes(s) &&
					!s.isLocked &&
					!this.editor.isShapeHidden(s) &&
					!excludedIds.has(s.id)
			)

		for (const maybeDraggingOverShape of maybeDraggingOverShapes) {
			const shapeUtil = this.editor.getShapeUtil(maybeDraggingOverShape)
			// Any shape that can handle any dragging interactions is a valid target
			if (
				shapeUtil.onDragShapesOver ||
				shapeUtil.onDragShapesIn ||
				shapeUtil.onDragShapesOut ||
				shapeUtil.onDropShapesOver
			) {
				return maybeDraggingOverShape
			}
		}
	}
}
