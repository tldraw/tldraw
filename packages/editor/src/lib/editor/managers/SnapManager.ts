import { atom, computed, EMPTY_ARRAY } from '@tldraw/state'
import { TLGroupShape, TLParentId, TLShape, TLShapeId, Vec2dModel } from '@tldraw/tlschema'
import { dedupe, deepCopy, warnDeprecatedGetter } from '@tldraw/utils'
import {
	Box2d,
	flipSelectionHandleX,
	flipSelectionHandleY,
	isSelectionCorner,
	SelectionCorner,
	SelectionEdge,
} from '../../primitives/Box2d'
import { Matrix2d } from '../../primitives/Matrix2d'
import { rangeIntersection, rangesOverlap } from '../../primitives/utils'
import { Vec2d, VecLike } from '../../primitives/Vec2d'
import { uniqueId } from '../../utils/uniqueId'
import type { Editor } from '../Editor'

/** @public */
export type PointsSnapLine = {
	id: string
	type: 'points'
	points: VecLike[]
}

/** @public */
export type GapsSnapLine = {
	id: string
	type: 'gaps'
	direction: 'horizontal' | 'vertical'
	gaps: Array<{
		startEdge: [VecLike, VecLike]
		endEdge: [VecLike, VecLike]
	}>
}

/** @public */
export type SnapLine = PointsSnapLine | GapsSnapLine

export type SnapInteractionType =
	| {
			type: 'translate'
			lockedAxis: 'x' | 'y' | null
			initialSelectionSnapPoints: Vec2d[]
	  }
	| {
			type: 'resize'
	  }

/** @public */
export interface SnapPoint {
	id: string
	x: number
	y: number
	handle?: SelectionCorner
}

type SnapPair = { thisPoint: SnapPoint; otherPoint: SnapPoint }

type NearestPointsSnap = {
	// selection snaps to a nearby snap point
	type: 'points'
	points: SnapPair
	nudge: number
}

type NearestSnap =
	| NearestPointsSnap
	| {
			// selection snaps to the center of a gap
			type: 'gap_center'
			gap: Gap
			nudge: number
	  }
	| {
			// selection snaps to create a new gap of equal size to another gap
			// on the opposite side of some shape
			type: 'gap_duplicate'
			gap: Gap
			protrusionDirection: 'left' | 'right' | 'top' | 'bottom'
			nudge: number
	  }

type GapNode = {
	id: TLShapeId
	pageBounds: Box2d
	isClosed: boolean
}

type Gap = {
	// e.g.
	//      start
	//      edge     │         breadth
	//               │       intersection
	//               ▼        [40,100]           end
	//                            │            │ edge
	// ┌───────────┐ │ 100,0      │            │
	// │           │ │            ▼            ▼
	// │           │ │
	// │  start    │ │            │     200,40 │ ┌───────────┐
	// │  node     │ │            │            │ │           │
	// │           │ ├────────────┼────────────┤ │  end      │
	// │           │ │            │            │ │  node     │
	// └───────────┘ │ 100,100    │            │ │           │
	//                                         │ │           │
	//                                 200,120 │ └───────────┘
	//
	//                       length 100
	//               ◄─────────────────────────►
	startNode: GapNode
	endNode: GapNode
	startEdge: [Vec2d, Vec2d]
	endEdge: [Vec2d, Vec2d]
	length: number
	breadthIntersection: [number, number]
}

interface SnapData {
	nudge: Vec2d
}

const round = (x: number) => {
	// round numbers to avoid glitches for floating point rounding errors
	const decimalPlacesTolerance = 8
	return Math.round(x * 10 ** decimalPlacesTolerance) / 10 ** decimalPlacesTolerance
}

function findAdjacentGaps(
	gaps: Gap[],
	shapeId: TLShapeId,
	gapLength: number,
	direction: 'forward' | 'backward',
	intersection: [number, number]
): Gap[] {
	// TODO: take advantage of the fact that gaps is sorted by starting position?
	const matches = gaps.filter(
		(gap) =>
			(direction === 'forward' ? gap.startNode.id === shapeId : gap.endNode.id === shapeId) &&
			round(gap.length) === round(gapLength) &&
			rangeIntersection(
				gap.breadthIntersection[0],
				gap.breadthIntersection[1],
				intersection[0],
				intersection[1]
			)
	)

	if (matches.length === 0) return []

	const nextNodes = new Set<TLShapeId>()

	matches.forEach((match) => {
		const node = direction === 'forward' ? match.endNode.id : match.startNode.id
		if (!nextNodes.has(node)) {
			nextNodes.add(node)
			const foundGaps = findAdjacentGaps(
				gaps,
				node,
				gapLength,
				direction,
				rangeIntersection(
					match.breadthIntersection[0],
					match.breadthIntersection[1],
					intersection[0],
					intersection[1]
				)!
			)

			matches.push(...foundGaps)
		}
	})

	return matches
}

function dedupeGapSnaps(snaps: Array<Extract<SnapLine, { type: 'gaps' }>>) {
	// sort by descending order of number of gaps
	snaps.sort((a, b) => b.gaps.length - a.gaps.length)
	// pop off any that are included already
	for (let i = snaps.length - 1; i > 0; i--) {
		const snap = snaps[i]
		for (let j = i - 1; j >= 0; j--) {
			const otherSnap = snaps[j]
			// if every edge in this snap is included in the other snap somewhere, then it's redundant
			if (
				otherSnap.direction === snap.direction &&
				snap.gaps.every(
					(gap) =>
						otherSnap.gaps.some(
							(otherGap) =>
								round(gap.startEdge[0].x) === round(otherGap.startEdge[0].x) &&
								round(gap.startEdge[0].y) === round(otherGap.startEdge[0].y) &&
								round(gap.startEdge[1].x) === round(otherGap.startEdge[1].x) &&
								round(gap.startEdge[1].y) === round(otherGap.startEdge[1].y)
						) &&
						otherSnap.gaps.some(
							(otherGap) =>
								round(gap.endEdge[0].x) === round(otherGap.endEdge[0].x) &&
								round(gap.endEdge[0].y) === round(otherGap.endEdge[0].y) &&
								round(gap.endEdge[1].x) === round(otherGap.endEdge[1].x) &&
								round(gap.endEdge[1].y) === round(otherGap.endEdge[1].y)
						)
				)
			) {
				snaps.splice(i, 1)
				break
			}
		}
	}
}

/** @public */
export class SnapManager {
	private _snapLines = atom<SnapLine[] | undefined>('snapLines', undefined)

	getLines() {
		return this._snapLines.get() ?? (EMPTY_ARRAY as SnapLine[])
	}

	/**
	 * @deprecated use `getLines` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get lines() {
		warnDeprecatedGetter('lines')
		return this.getLines()
	}

	clear() {
		if (this.getLines().length) {
			this._snapLines.set(undefined)
		}
	}

	setLines(lines: SnapLine[]) {
		this._snapLines.set(lines)
	}

	constructor(public readonly editor: Editor) {}

	@computed getSnapPointsCache() {
		const { editor } = this
		return editor.store.createComputedCache<SnapPoint[], TLShape>('snapPoints', (shape) => {
			const pageTransfrorm = editor.getShapePageTransform(shape.id)
			if (!pageTransfrorm) return undefined
			const snapPoints = this.editor.getShapeGeometry(shape).snapPoints
			return snapPoints.map((point, i) => {
				const { x, y } = Matrix2d.applyToPoint(pageTransfrorm, point)
				return { x, y, id: `${shape.id}:${i}` }
			})
		})
	}

	/**
	 * @deprecated use `getSnapPointsCache` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get snapPointsCache() {
		warnDeprecatedGetter('snapPointsCache')
		return this.getSnapPointsCache()
	}

	@computed getSnapThreshold() {
		return 8 / this.editor.getZoomLevel()
	}

	/**
	 * @deprecated use `getSnapThreshold` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get snapThreshold() {
		warnDeprecatedGetter('snapThreshold')
		return this.getSnapThreshold()
	}

	// TODO: make this an incremental derivation
	@computed getSnappableShapes(): GapNode[] {
		const { editor } = this
		const renderingBounds = editor.getRenderingBounds()
		const selectedShapeIds = editor.getSelectedShapeIds()

		const snappableShapes: GapNode[] = []

		const collectSnappableShapesFromParent = (parentId: TLParentId) => {
			const sortedChildIds = editor.getSortedChildIdsForParent(parentId)
			for (const childId of sortedChildIds) {
				// Skip any selected ids
				if (selectedShapeIds.includes(childId)) continue
				const childShape = editor.getShape(childId)
				if (!childShape) continue
				const util = editor.getShapeUtil(childShape)
				// Skip any shapes that don't allow snapping
				if (!util.canSnap(childShape)) continue
				// Only consider shapes if they're inside of the viewport page bounds
				const pageBounds = editor.getShapePageBounds(childId)
				if (!(pageBounds && renderingBounds.includes(pageBounds))) continue
				// Snap to children of groups but not group itself
				if (editor.isShapeOfType<TLGroupShape>(childShape, 'group')) {
					collectSnappableShapesFromParent(childId)
					continue
				}
				snappableShapes.push({
					id: childId,
					pageBounds,
					isClosed: editor.getShapeGeometry(childShape).isClosed,
				})
			}
		}

		collectSnappableShapesFromParent(this.getCurrentCommonAncestor() ?? editor.getCurrentPageId())

		return snappableShapes
	}

	/**
	 * @deprecated use `getSnappableShapes` instead
	 */

	// eslint-disable-next-line no-restricted-syntax
	get snappableShapes() {
		warnDeprecatedGetter('snappableShapes')
		return this.getSnappableShapes()
	}

	// This needs to be external from any expensive work
	@computed getCurrentCommonAncestor() {
		return this.editor.findCommonAncestor(this.editor.getSelectedShapes())
	}

	/**
	 * @deprecated use `getCurrentCommonAncestor` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get currentCommonAncestor() {
		warnDeprecatedGetter('currentCommonAncestor')
		return this.getCurrentCommonAncestor()
	}

	// Points which belong to snappable shapes
	@computed getSnappablePoints() {
		const snapPointsCache = this.getSnapPointsCache()
		const snappableShapes = this.getSnappableShapes()
		const result: SnapPoint[] = []

		snappableShapes.forEach((shape) => {
			const snapPoints = snapPointsCache.get(shape.id)
			if (snapPoints) {
				result.push(...snapPoints)
			}
		})

		return result
	}

	/**
	 * @deprecated use `getSnappablePoints` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get snappablePoints() {
		warnDeprecatedGetter('snappablePoints')
		return this.getSnappablePoints()
	}

	@computed getVisibleGaps(): { horizontal: Gap[]; vertical: Gap[] } {
		const horizontal: Gap[] = []
		const vertical: Gap[] = []

		let startNode: GapNode, endNode: GapNode

		const sortedShapesOnCurrentPageHorizontal = this.getSnappableShapes().sort((a, b) => {
			return a.pageBounds.minX - b.pageBounds.minX
		})

		// Collect horizontal gaps
		for (let i = 0; i < sortedShapesOnCurrentPageHorizontal.length; i++) {
			startNode = sortedShapesOnCurrentPageHorizontal[i]
			for (let j = i + 1; j < sortedShapesOnCurrentPageHorizontal.length; j++) {
				endNode = sortedShapesOnCurrentPageHorizontal[j]

				if (
					// is there space between the boxes
					startNode.pageBounds.maxX < endNode.pageBounds.minX &&
					// and they overlap in the y axis
					rangesOverlap(
						startNode.pageBounds.minY,
						startNode.pageBounds.maxY,
						endNode.pageBounds.minY,
						endNode.pageBounds.maxY
					)
				) {
					horizontal.push({
						startNode,
						endNode,
						startEdge: [
							new Vec2d(startNode.pageBounds.maxX, startNode.pageBounds.minY),
							new Vec2d(startNode.pageBounds.maxX, startNode.pageBounds.maxY),
						],
						endEdge: [
							new Vec2d(endNode.pageBounds.minX, endNode.pageBounds.minY),
							new Vec2d(endNode.pageBounds.minX, endNode.pageBounds.maxY),
						],
						length: endNode.pageBounds.minX - startNode.pageBounds.maxX,
						breadthIntersection: rangeIntersection(
							startNode.pageBounds.minY,
							startNode.pageBounds.maxY,
							endNode.pageBounds.minY,
							endNode.pageBounds.maxY
						)!,
					})
				}
			}
		}

		// Collect vertical gaps
		const sortedShapesOnCurrentPageVertical = sortedShapesOnCurrentPageHorizontal.sort((a, b) => {
			return a.pageBounds.minY - b.pageBounds.minY
		})

		for (let i = 0; i < sortedShapesOnCurrentPageVertical.length; i++) {
			startNode = sortedShapesOnCurrentPageVertical[i]
			for (let j = i + 1; j < sortedShapesOnCurrentPageVertical.length; j++) {
				endNode = sortedShapesOnCurrentPageVertical[j]

				if (
					// is there space between the boxes
					startNode.pageBounds.maxY < endNode.pageBounds.minY &&
					// do they overlap in the x axis
					rangesOverlap(
						startNode.pageBounds.minX,
						startNode.pageBounds.maxX,
						endNode.pageBounds.minX,
						endNode.pageBounds.maxX
					)
				) {
					vertical.push({
						startNode,
						endNode,
						startEdge: [
							new Vec2d(startNode.pageBounds.minX, startNode.pageBounds.maxY),
							new Vec2d(startNode.pageBounds.maxX, startNode.pageBounds.maxY),
						],
						endEdge: [
							new Vec2d(endNode.pageBounds.minX, endNode.pageBounds.minY),
							new Vec2d(endNode.pageBounds.maxX, endNode.pageBounds.minY),
						],
						length: endNode.pageBounds.minY - startNode.pageBounds.maxY,
						breadthIntersection: rangeIntersection(
							startNode.pageBounds.minX,
							startNode.pageBounds.maxX,
							endNode.pageBounds.minX,
							endNode.pageBounds.maxX
						)!,
					})
				}
			}
		}

		return { horizontal, vertical }
	}

	/**
	 * @deprecated use `getVisibleGaps` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get visibleGaps() {
		warnDeprecatedGetter('visibleGaps')
		return this.getVisibleGaps()
	}

	snapTranslate({
		lockedAxis,
		initialSelectionPageBounds,
		initialSelectionSnapPoints,
		dragDelta,
	}: {
		lockedAxis: 'x' | 'y' | null
		initialSelectionSnapPoints: SnapPoint[]
		initialSelectionPageBounds: Box2d
		dragDelta: Vec2d
	}): SnapData {
		const snapThreshold = this.getSnapThreshold()
		const visibleSnapPointsNotInSelection = this.getSnappablePoints()

		const selectionPageBounds = initialSelectionPageBounds.clone().translate(dragDelta)

		const selectionSnapPoints: SnapPoint[] = initialSelectionSnapPoints.map(({ x, y }, i) => ({
			id: 'selection:' + i,
			x: x + dragDelta.x,
			y: y + dragDelta.y,
		}))

		const otherNodeSnapPoints = visibleSnapPointsNotInSelection

		const nearestSnapsX: NearestSnap[] = []
		const nearestSnapsY: NearestSnap[] = []
		const minOffset = new Vec2d(snapThreshold, snapThreshold)

		this.collectPointSnaps({
			minOffset,
			nearestSnapsX,
			nearestSnapsY,
			otherNodeSnapPoints,
			selectionSnapPoints,
		})

		this.collectGapSnaps({
			selectionPageBounds,
			nearestSnapsX,
			nearestSnapsY,
			minOffset,
		})

		// at the same time, calculate how far we need to nudge the shape to 'snap' to the target point(s)
		const nudge = new Vec2d(
			lockedAxis === 'x' ? 0 : nearestSnapsX[0]?.nudge ?? 0,
			lockedAxis === 'y' ? 0 : nearestSnapsY[0]?.nudge ?? 0
		)

		// ok we've figured out how much the box should be nudged, now let's find all the snap points
		// that are exact after making that translation, so we can render all of them.
		// first reset everything and adjust the original shapes to conform to the nudge
		minOffset.x = 0
		minOffset.y = 0
		nearestSnapsX.length = 0
		nearestSnapsY.length = 0
		selectionSnapPoints.forEach((s) => {
			s.x += nudge.x
			s.y += nudge.y
		})
		selectionPageBounds.translate(nudge)

		this.collectPointSnaps({
			minOffset,
			nearestSnapsX,
			nearestSnapsY,
			otherNodeSnapPoints,
			selectionSnapPoints,
		})

		this.collectGapSnaps({
			selectionPageBounds,
			nearestSnapsX,
			nearestSnapsY,
			minOffset,
		})

		const pointSnapsLines = this.getPointSnapLines({
			nearestSnapsX,
			nearestSnapsY,
		})

		const gapSnapLines = this.getGapSnapLines({
			selectionPageBounds,
			nearestSnapsX,
			nearestSnapsY,
		})

		this._snapLines.set([...gapSnapLines, ...pointSnapsLines])

		return { nudge }
	}

	@computed getOutlinesInPageSpace() {
		return this.getSnappableShapes().map(({ id, isClosed }) => {
			const outline = deepCopy(this.editor.getShapeGeometry(id).vertices)
			if (isClosed) outline.push(outline[0])
			const pageTransform = this.editor.getShapePageTransform(id)
			if (!pageTransform) throw Error('No page transform')
			return Matrix2d.applyToPoints(pageTransform, outline)
		})
	}

	/**
	 * @deprecated use `getOutlinesInPageSpace` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get outlinesInPageSpace() {
		warnDeprecatedGetter('outlinesInPageSpace')
		return this.getOutlinesInPageSpace()
	}

	getSnappingHandleDelta({
		handlePoint,
		additionalSegments,
	}: {
		handlePoint: Vec2d
		additionalSegments: Vec2d[][]
	}): Vec2d | null {
		const snapThreshold = this.getSnapThreshold()
		const outlinesInPageSpace = this.getOutlinesInPageSpace()

		// Find the nearest point that is within the snap threshold
		let minDistance = snapThreshold
		let nearestPoint: Vec2d | null = null
		let C: Vec2dModel, D: Vec2dModel, nearest: Vec2d, distance: number

		const allSegments = [...outlinesInPageSpace, ...additionalSegments]
		for (const outline of allSegments) {
			for (let i = 0; i < outline.length - 1; i++) {
				C = outline[i]
				D = outline[i + 1]

				nearest = Vec2d.NearestPointOnLineSegment(C, D, handlePoint)
				distance = Vec2d.Dist(handlePoint, nearest)

				if (isNaN(distance)) continue
				if (distance < minDistance) {
					minDistance = distance
					nearestPoint = nearest
				}
			}
		}

		// If we found a point, display snap lines, and return the nudge
		if (nearestPoint) {
			this._snapLines.set([
				{
					id: uniqueId(),
					type: 'points',
					points: [nearestPoint],
				},
			])

			return Vec2d.Sub(nearestPoint, handlePoint)
		}

		return null
	}

	snapResize({
		initialSelectionPageBounds,
		dragDelta,
		handle: originalHandle,
		isAspectRatioLocked,
		isResizingFromCenter,
	}: {
		// the page bounds when the pointer went down, before any dragging
		initialSelectionPageBounds: Box2d
		// how far the pointer has been dragged
		dragDelta: Vec2d

		handle: SelectionCorner | SelectionEdge
		isAspectRatioLocked: boolean
		isResizingFromCenter: boolean
	}): SnapData {
		const snapThreshold = this.getSnapThreshold()

		// first figure out the new bounds of the selection
		const {
			box: unsnappedResizedPageBounds,
			scaleX,
			scaleY,
		} = Box2d.Resize(
			initialSelectionPageBounds,
			originalHandle,
			isResizingFromCenter ? dragDelta.x * 2 : dragDelta.x,
			isResizingFromCenter ? dragDelta.y * 2 : dragDelta.y,
			isAspectRatioLocked
		)

		let handle = originalHandle

		if (scaleX < 0) {
			handle = flipSelectionHandleX(handle)
		}
		if (scaleY < 0) {
			handle = flipSelectionHandleY(handle)
		}

		if (isResizingFromCenter) {
			// reposition if resizing from center
			unsnappedResizedPageBounds.center = initialSelectionPageBounds.center
		}

		const isXLocked = handle === 'top' || handle === 'bottom'
		const isYLocked = handle === 'left' || handle === 'right'

		const selectionSnapPoints = getResizeSnapPointsForHandle(handle, unsnappedResizedPageBounds)

		const otherNodeSnapPoints = this.getSnappablePoints()

		const nearestSnapsX: NearestPointsSnap[] = []
		const nearestSnapsY: NearestPointsSnap[] = []
		const minOffset = new Vec2d(snapThreshold, snapThreshold)

		this.collectPointSnaps({
			minOffset,
			nearestSnapsX,
			nearestSnapsY,
			otherNodeSnapPoints,
			selectionSnapPoints,
		})

		// at the same time, calculate how far we need to nudge the shape to 'snap' to the target point(s)
		const nudge = new Vec2d(
			isXLocked ? 0 : nearestSnapsX[0]?.nudge ?? 0,
			isYLocked ? 0 : nearestSnapsY[0]?.nudge ?? 0
		)

		if (isAspectRatioLocked && isSelectionCorner(handle) && nudge.len() !== 0) {
			// if the aspect ratio is locked we need to make the nudge diagonal rather than independent in each axis
			// so we use the aspect ratio along with one axis value to set the other axis value, but which axis we use
			// as a source of truth depends what we have snapped to and how far.

			// if we found a snap in both axes, pick the closest one and discard the other
			const primaryNudgeAxis: 'x' | 'y' =
				nearestSnapsX.length && nearestSnapsY.length
					? Math.abs(nudge.x) < Math.abs(nudge.y)
						? 'x'
						: 'y'
					: nearestSnapsX.length
					? 'x'
					: 'y'

			const ratio = initialSelectionPageBounds.aspectRatio

			if (primaryNudgeAxis === 'x') {
				nearestSnapsY.length = 0
				nudge.y = nudge.x / ratio
				if (handle === 'bottom_left' || handle === 'top_right') {
					nudge.y = -nudge.y
				}
			} else {
				nearestSnapsX.length = 0
				nudge.x = nudge.y * ratio
				if (handle === 'bottom_left' || handle === 'top_right') {
					nudge.x = -nudge.x
				}
			}
		}

		// now resize the box after nudging, calculate the snaps again, and return the snap lines to match
		// the fully resized box
		const snappedDelta = Vec2d.Add(dragDelta, nudge)

		// first figure out the new bounds of the selection
		const { box: snappedResizedPageBounds } = Box2d.Resize(
			initialSelectionPageBounds,
			originalHandle,
			isResizingFromCenter ? snappedDelta.x * 2 : snappedDelta.x,
			isResizingFromCenter ? snappedDelta.y * 2 : snappedDelta.y,
			isAspectRatioLocked
		)

		if (isResizingFromCenter) {
			// reposition if resizing from center
			snappedResizedPageBounds.center = initialSelectionPageBounds.center
		}

		const snappedSelectionPoints = getResizeSnapPointsForHandle('any', snappedResizedPageBounds)
		// calculate snaps again using all points
		nearestSnapsX.length = 0
		nearestSnapsY.length = 0
		minOffset.x = 0
		minOffset.y = 0

		this.collectPointSnaps({
			minOffset,
			nearestSnapsX,
			nearestSnapsY,
			otherNodeSnapPoints,
			selectionSnapPoints: snappedSelectionPoints,
		})
		const pointSnaps = this.getPointSnapLines({
			nearestSnapsX,
			nearestSnapsY,
		})

		this._snapLines.set([...pointSnaps])

		return { nudge }
	}

	private collectPointSnaps({
		selectionSnapPoints,
		otherNodeSnapPoints,
		minOffset,
		nearestSnapsX,
		nearestSnapsY,
	}: {
		selectionSnapPoints: SnapPoint[]
		otherNodeSnapPoints: SnapPoint[]
		minOffset: Vec2d
		nearestSnapsX: NearestSnap[]
		nearestSnapsY: NearestSnap[]
	}) {
		// for each snap point on the bounding box of the selection, find the set of points
		// which are closest to it in each axis
		for (const thisSnapPoint of selectionSnapPoints) {
			for (const otherSnapPoint of otherNodeSnapPoints) {
				const offset = Vec2d.Sub(thisSnapPoint, otherSnapPoint)
				const offsetX = Math.abs(offset.x)
				const offsetY = Math.abs(offset.y)

				if (round(offsetX) <= round(minOffset.x)) {
					if (round(offsetX) < round(minOffset.x)) {
						// we found a point that is significantly closer than all previous points
						// so wipe the slate clean and start over
						nearestSnapsX.length = 0
					}

					nearestSnapsX.push({
						type: 'points',
						points: { thisPoint: thisSnapPoint, otherPoint: otherSnapPoint },
						nudge: otherSnapPoint.x - thisSnapPoint.x,
					})
					minOffset.x = offsetX
				}

				if (round(offsetY) <= round(minOffset.y)) {
					if (round(offsetY) < round(minOffset.y)) {
						// we found a point that is significantly closer than all previous points
						// so wipe the slate clean and start over
						nearestSnapsY.length = 0
					}
					nearestSnapsY.push({
						type: 'points',
						points: { thisPoint: thisSnapPoint, otherPoint: otherSnapPoint },
						nudge: otherSnapPoint.y - thisSnapPoint.y,
					})
					minOffset.y = offsetY
				}
			}
		}
	}

	private collectGapSnaps({
		selectionPageBounds,
		minOffset,
		nearestSnapsX,
		nearestSnapsY,
	}: {
		selectionPageBounds: Box2d
		minOffset: Vec2d
		nearestSnapsX: NearestSnap[]
		nearestSnapsY: NearestSnap[]
	}) {
		const { horizontal, vertical } = this.getVisibleGaps()

		for (const gap of horizontal) {
			// ignore this gap if the selection doesn't overlap with it in the y axis
			if (
				!rangesOverlap(
					gap.breadthIntersection[0],
					gap.breadthIntersection[1],
					selectionPageBounds.minY,
					selectionPageBounds.maxY
				)
			) {
				continue
			}

			// check for center match
			const gapMidX = gap.startEdge[0].x + gap.length / 2
			const centerNudge = gapMidX - selectionPageBounds.center.x
			const gapIsLargerThanSelection = gap.length > selectionPageBounds.width

			if (gapIsLargerThanSelection && round(Math.abs(centerNudge)) <= round(minOffset.x)) {
				if (round(Math.abs(centerNudge)) < round(minOffset.x)) {
					// reset if we found a closer snap
					nearestSnapsX.length = 0
				}
				minOffset.x = Math.abs(centerNudge)

				const snap: NearestSnap = {
					type: 'gap_center',
					gap,
					nudge: centerNudge,
				}

				// we need to avoid creating visual noise with too many center snaps in situations
				// where there are lots of adjacent items with even spacing
				// so let's only show other center snaps where the gap's breadth does not overlap with this one
				// i.e.
				//                ┌───────────────┐
				//                │               │
				//                └──────┬────┬───┘
				//                       ┼    │
				//                 ┌─────┴┐   │
				//                 │      │   ┼
				//                 └─────┬┘   │
				//                       ┼    │
				//                   ┌───┴────┴───────┐
				//                   │                │  ◄────  i'm dragging this one
				//                   └───┬────┬───────┘
				//            ─────►     ┼    │
				//                 ┌─────┴┐   │                don't show these
				// show these      │      │   ┼                larger gaps since
				// smaller         └─────┬┘   │ ◄───────────── the smaller ones
				// gaps                  ┼    │                cover the same
				//              ─────►  ┌┴────┴─────┐          information
				//                      │           │
				//                      └───────────┘
				//
				// but we want to show all of these ones since the gap breadths don't overlap
				//            ┌─────────────┐
				//            │             │
				// ┌────┐     └───┬─────────┘
				// │    │         │
				// └──┬─┘         ┼
				//    ┼           │
				// ┌──┴───────────┴─┐
				// │                │ ◄───── i'm dragging this one
				// └──┬───────────┬─┘
				//    ┼           │
				// ┌──┴────┐      ┼
				// │       │      │
				// └───────┘    ┌─┴───────┐
				//              │         │
				//              └─────────┘

				const otherCenterSnap = nearestSnapsX.find(({ type }) => type === 'gap_center') as
					| Extract<NearestSnap, { type: 'gap_center' }>
					| undefined

				const gapBreadthsOverlap =
					otherCenterSnap &&
					rangeIntersection(
						gap.breadthIntersection[0],
						gap.breadthIntersection[1],
						otherCenterSnap.gap.breadthIntersection[0],
						otherCenterSnap.gap.breadthIntersection[1]
					)

				// if there is another center snap and it's bigger than this one, and it overlaps with this one, replace it
				if (otherCenterSnap && otherCenterSnap.gap.length > gap.length && gapBreadthsOverlap) {
					nearestSnapsX[nearestSnapsX.indexOf(otherCenterSnap)] = snap
				} else if (!otherCenterSnap || !gapBreadthsOverlap) {
					nearestSnapsX.push(snap)
				}
			}

			// check for duplication left match
			const duplicationLeftX = gap.startNode.pageBounds.minX - gap.length
			const selectionRightX = selectionPageBounds.maxX

			const duplicationLeftNudge = duplicationLeftX - selectionRightX
			if (round(Math.abs(duplicationLeftNudge)) <= round(minOffset.x)) {
				if (round(Math.abs(duplicationLeftNudge)) < round(minOffset.x)) {
					// reset if we found a closer snap
					nearestSnapsX.length = 0
				}
				minOffset.x = Math.abs(duplicationLeftNudge)

				nearestSnapsX.push({
					type: 'gap_duplicate',
					gap,
					protrusionDirection: 'left',
					nudge: duplicationLeftNudge,
				})
			}

			// check for duplication right match
			const duplicationRightX = gap.endNode.pageBounds.maxX + gap.length
			const selectionLeftX = selectionPageBounds.minX

			const duplicationRightNudge = duplicationRightX - selectionLeftX
			if (round(Math.abs(duplicationRightNudge)) <= round(minOffset.x)) {
				if (round(Math.abs(duplicationRightNudge)) < round(minOffset.x)) {
					// reset if we found a closer snap
					nearestSnapsX.length = 0
				}
				minOffset.x = Math.abs(duplicationRightNudge)

				nearestSnapsX.push({
					type: 'gap_duplicate',
					gap,
					protrusionDirection: 'right',
					nudge: duplicationRightNudge,
				})
			}
		}

		for (const gap of vertical) {
			// ignore this gap if the selection doesn't overlap with it in the y axis
			if (
				!rangesOverlap(
					gap.breadthIntersection[0],
					gap.breadthIntersection[1],
					selectionPageBounds.minX,
					selectionPageBounds.maxX
				)
			) {
				continue
			}

			// check for center match
			const gapMidY = gap.startEdge[0].y + gap.length / 2
			const centerNudge = gapMidY - selectionPageBounds.center.y

			const gapIsLargerThanSelection = gap.length > selectionPageBounds.height

			if (gapIsLargerThanSelection && round(Math.abs(centerNudge)) <= round(minOffset.y)) {
				if (round(Math.abs(centerNudge)) < round(minOffset.y)) {
					// reset if we found a closer snap
					nearestSnapsY.length = 0
				}
				minOffset.y = Math.abs(centerNudge)

				const snap: NearestSnap = {
					type: 'gap_center',
					gap,
					nudge: centerNudge,
				}

				// we need to avoid creating visual noise with too many center snaps in situations
				// where there are lots of adjacent items with even spacing
				// so let's only show other center snaps where the gap's breadth does not overlap with this one
				// i.e.
				//                ┌───────────────┐
				//                │               │
				//                └──────┬────┬───┘
				//                       ┼    │
				//                 ┌─────┴┐   │
				//                 │      │   ┼
				//                 └─────┬┘   │
				//                       ┼    │
				//                   ┌───┴────┴───────┐
				//                   │                │  ◄────  i'm dragging this one
				//                   └───┬────┬───────┘
				//            ─────►     ┼    │
				//                 ┌─────┴┐   │                don't show these
				// show these      │      │   ┼                larger gaps since
				// smaller         └─────┬┘   │ ◄───────────── the smaller ones
				// gaps                  ┼    │                cover the same
				//              ─────►  ┌┴────┴─────┐          information
				//                      │           │
				//                      └───────────┘
				//
				// but we want to show all of these ones since the gap breadths don't overlap
				//            ┌─────────────┐
				//            │             │
				// ┌────┐     └───┬─────────┘
				// │    │         │
				// └──┬─┘         ┼
				//    ┼           │
				// ┌──┴───────────┴─┐
				// │                │ ◄───── i'm dragging this one
				// └──┬───────────┬─┘
				//    ┼           │
				// ┌──┴────┐      ┼
				// │       │      │
				// └───────┘    ┌─┴───────┐
				//              │         │
				//              └─────────┘

				const otherCenterSnap = nearestSnapsY.find(({ type }) => type === 'gap_center') as
					| Extract<NearestSnap, { type: 'gap_center' }>
					| undefined

				const gapBreadthsOverlap =
					otherCenterSnap &&
					rangesOverlap(
						otherCenterSnap.gap.breadthIntersection[0],
						otherCenterSnap.gap.breadthIntersection[1],
						gap.breadthIntersection[0],
						gap.breadthIntersection[1]
					)

				// if there is another center snap and it's bigger than this one, and it overlaps with this one, replace it
				if (otherCenterSnap && otherCenterSnap.gap.length > gap.length && gapBreadthsOverlap) {
					nearestSnapsY[nearestSnapsY.indexOf(otherCenterSnap)] = snap
				} else if (!otherCenterSnap || !gapBreadthsOverlap) {
					nearestSnapsY.push(snap)
				}
				continue
			}

			// check for duplication top match
			const duplicationTopY = gap.startNode.pageBounds.minY - gap.length
			const selectionBottomY = selectionPageBounds.maxY

			const duplicationTopNudge = duplicationTopY - selectionBottomY
			if (round(Math.abs(duplicationTopNudge)) <= round(minOffset.y)) {
				if (round(Math.abs(duplicationTopNudge)) < round(minOffset.y)) {
					// reset if we found a closer snap
					nearestSnapsY.length = 0
				}
				minOffset.y = Math.abs(duplicationTopNudge)

				nearestSnapsY.push({
					type: 'gap_duplicate',
					gap,
					protrusionDirection: 'top',
					nudge: duplicationTopNudge,
				})
			}

			// check for duplication bottom match
			const duplicationBottomY = gap.endNode.pageBounds.maxY + gap.length
			const selectionTopY = selectionPageBounds.minY

			const duplicationBottomNudge = duplicationBottomY - selectionTopY
			if (round(Math.abs(duplicationBottomNudge)) <= round(minOffset.y)) {
				if (round(Math.abs(duplicationBottomNudge)) < round(minOffset.y)) {
					// reset if we found a closer snap
					nearestSnapsY.length = 0
				}
				minOffset.y = Math.abs(duplicationBottomNudge)

				nearestSnapsY.push({
					type: 'gap_duplicate',
					gap,
					protrusionDirection: 'bottom',
					nudge: duplicationBottomNudge,
				})
			}
		}
	}

	private getPointSnapLines({
		nearestSnapsX,
		nearestSnapsY,
	}: {
		nearestSnapsX: NearestSnap[]
		nearestSnapsY: NearestSnap[]
	}): PointsSnapLine[] {
		// point snaps may align on multiple parallel lines so we need to split the pairs
		// into groups based on where they are in their their snap axes
		const snapGroupsX = {} as { [key: string]: SnapPair[] }
		const snapGroupsY = {} as { [key: string]: SnapPair[] }

		if (nearestSnapsX.length > 0) {
			for (const snap of nearestSnapsX) {
				if (snap.type === 'points') {
					const key = round(snap.points.otherPoint.x)
					if (!snapGroupsX[key]) {
						snapGroupsX[key] = []
					}
					snapGroupsX[key].push(snap.points)
				}
			}
		}

		if (nearestSnapsY.length > 0) {
			for (const snap of nearestSnapsY) {
				if (snap.type === 'points') {
					const key = round(snap.points.otherPoint.y)
					if (!snapGroupsY[key]) {
						snapGroupsY[key] = []
					}
					snapGroupsY[key].push(snap.points)
				}
			}
		}

		// and finally create all the snap lines for the UI to render
		return Object.values(snapGroupsX)
			.concat(Object.values(snapGroupsY))
			.map((snapGroup) => ({
				id: uniqueId(),
				type: 'points',
				points: dedupe(
					snapGroup
						.map((snap) => Vec2d.From(snap.otherPoint))
						// be sure to nudge over the selection snap points
						.concat(snapGroup.map((snap) => Vec2d.From(snap.thisPoint))),
					(a: Vec2d, b: Vec2d) => a.equals(b)
				),
			}))
	}

	private getGapSnapLines({
		selectionPageBounds,
		nearestSnapsX,
		nearestSnapsY,
	}: {
		selectionPageBounds: Box2d
		nearestSnapsX: NearestSnap[]
		nearestSnapsY: NearestSnap[]
	}): GapsSnapLine[] {
		const { vertical, horizontal } = this.getVisibleGaps()

		const selectionSides: Record<SelectionEdge, [Vec2d, Vec2d]> = {
			top: selectionPageBounds.sides[0],
			right: selectionPageBounds.sides[1],
			// need bottom and left to be sorted asc, which .sides is not.
			bottom: [selectionPageBounds.corners[3], selectionPageBounds.corners[2]],
			left: [selectionPageBounds.corners[0], selectionPageBounds.corners[3]],
		}

		const result: GapsSnapLine[] = []

		if (nearestSnapsX.length > 0) {
			for (const snap of nearestSnapsX) {
				if (snap.type === 'points') continue

				const {
					gap: { breadthIntersection, startEdge, startNode, endNode, length, endEdge },
				} = snap

				switch (snap.type) {
					case 'gap_center': {
						// create
						const newGapsLength = (length - selectionPageBounds.width) / 2
						const gapBreadthIntersection = rangeIntersection(
							breadthIntersection[0],
							breadthIntersection[1],
							selectionPageBounds.minY,
							selectionPageBounds.maxY
						)!
						result.push({
							type: 'gaps',
							direction: 'horizontal',
							id: uniqueId(),
							gaps: [
								...findAdjacentGaps(
									horizontal,
									startNode.id,
									newGapsLength,
									'backward',
									gapBreadthIntersection
								),
								{
									startEdge,
									endEdge: selectionSides.left,
								},
								{
									startEdge: selectionSides.right,
									endEdge,
								},
								...findAdjacentGaps(
									horizontal,
									endNode.id,
									newGapsLength,
									'forward',
									gapBreadthIntersection
								),
							],
						})
						break
					}
					case 'gap_duplicate': {
						// create
						const gapBreadthIntersection = rangeIntersection(
							breadthIntersection[0],
							breadthIntersection[1],
							selectionPageBounds.minY,
							selectionPageBounds.maxY
						)!
						result.push({
							type: 'gaps',
							direction: 'horizontal',
							id: uniqueId(),
							gaps:
								snap.protrusionDirection === 'left'
									? [
											{
												startEdge: selectionSides.right,
												endEdge: startEdge.map((v) =>
													v.clone().addXY(-startNode.pageBounds.width, 0)
												) as [Vec2d, Vec2d],
											},
											{ startEdge, endEdge },
											...findAdjacentGaps(
												horizontal,
												endNode.id,
												length,
												'forward',
												gapBreadthIntersection
											),
									  ]
									: [
											...findAdjacentGaps(
												horizontal,
												startNode.id,
												length,
												'backward',
												gapBreadthIntersection
											),
											{ startEdge, endEdge },
											{
												startEdge: endEdge.map((v) =>
													v.clone().addXY(snap.gap.endNode.pageBounds.width, 0)
												) as [Vec2d, Vec2d],
												endEdge: selectionSides.left,
											},
									  ],
						})

						break
					}
				}
			}
		}

		if (nearestSnapsY.length > 0) {
			for (const snap of nearestSnapsY) {
				if (snap.type === 'points') continue

				const {
					gap: { breadthIntersection, startEdge, startNode, endNode, length, endEdge },
				} = snap

				switch (snap.type) {
					case 'gap_center': {
						const newGapsLength = (length - selectionPageBounds.height) / 2
						const gapBreadthIntersection = rangeIntersection(
							breadthIntersection[0],
							breadthIntersection[1],
							selectionPageBounds.minX,
							selectionPageBounds.maxX
						)!

						result.push({
							type: 'gaps',
							direction: 'vertical',
							id: uniqueId(),
							gaps: [
								...findAdjacentGaps(
									vertical,
									startNode.id,
									newGapsLength,
									'backward',
									gapBreadthIntersection
								),
								{
									startEdge,
									endEdge: selectionSides.top,
								},
								{
									startEdge: selectionSides.bottom,
									endEdge,
								},
								...findAdjacentGaps(
									vertical,
									snap.gap.endNode.id,
									newGapsLength,
									'forward',
									gapBreadthIntersection
								),
							],
						})
						break
					}
					case 'gap_duplicate':
						{
							const gapBreadthIntersection = rangeIntersection(
								breadthIntersection[0],
								breadthIntersection[1],
								selectionPageBounds.minX,
								selectionPageBounds.maxX
							)!

							result.push({
								type: 'gaps',
								direction: 'vertical',
								id: uniqueId(),
								gaps:
									snap.protrusionDirection === 'top'
										? [
												{
													startEdge: selectionSides.bottom,
													endEdge: startEdge.map((v) =>
														v.clone().addXY(0, -startNode.pageBounds.height)
													) as [Vec2d, Vec2d],
												},
												{ startEdge, endEdge },
												...findAdjacentGaps(
													vertical,
													endNode.id,
													length,
													'forward',
													gapBreadthIntersection
												),
										  ]
										: [
												...findAdjacentGaps(
													vertical,
													startNode.id,
													length,
													'backward',
													gapBreadthIntersection
												),
												{ startEdge, endEdge },
												{
													startEdge: endEdge.map((v) =>
														v.clone().addXY(0, endNode.pageBounds.height)
													) as [Vec2d, Vec2d],
													endEdge: selectionSides.top,
												},
										  ],
							})
						}
						break
				}
			}
		}

		dedupeGapSnaps(result)
		return result
	}
}

function getResizeSnapPointsForHandle(
	handle: SelectionCorner | SelectionEdge | 'any',
	selectionPageBounds: Box2d
): SnapPoint[] {
	const { minX, maxX, minY, maxY } = selectionPageBounds
	const result: SnapPoint[] = []

	// top left corner
	switch (handle) {
		case 'top':
		case 'left':
		case 'top_left':
		case 'any':
			result.push({
				id: 'top_left',
				handle: 'top_left',
				x: minX,
				y: minY,
			})
	}

	// top right corner
	switch (handle) {
		case 'top':
		case 'right':
		case 'top_right':
		case 'any':
			result.push({
				id: 'top_right',
				handle: 'top_right',
				x: maxX,
				y: minY,
			})
	}

	// bottom right corner
	switch (handle) {
		case 'bottom':
		case 'right':
		case 'bottom_right':
		case 'any':
			result.push({
				id: 'bottom_right',
				handle: 'bottom_right',
				x: maxX,
				y: maxY,
			})
	}

	// bottom left corner
	switch (handle) {
		case 'bottom':
		case 'left':
		case 'bottom_left':
		case 'any':
			result.push({
				id: 'bottom_left',
				handle: 'bottom_left',
				x: minX,
				y: maxY,
			})
	}

	return result
}
