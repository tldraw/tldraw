import { sortByIndex } from '@tldraw/indices'
import {
	Box2d,
	flipSelectionHandleX,
	flipSelectionHandleY,
	isSelectionCorner,
	Matrix2d,
	rangeIntersection,
	rangesOverlap,
	SelectionCorner,
	SelectionEdge,
	Vec2d,
	VecLike,
} from '@tldraw/primitives'
import { TLLineShape, TLParentId, TLShape, TLShapeId, Vec2dModel } from '@tldraw/tlschema'
import { compact, dedupe, deepCopy } from '@tldraw/utils'
import { atom, computed, EMPTY_ARRAY } from 'signia'
import { uniqueId } from '../../utils/data'
import type { Editor } from '../Editor'
import { getSplineForLineShape, LineShapeUtil } from '../shapes/line/LineShapeUtil'

export type PointsSnapLine = {
	id: string
	type: 'points'
	points: VecLike[]
}
export type GapsSnapLine = {
	id: string
	type: 'gaps'
	direction: 'horizontal' | 'vertical'
	gaps: Array<{
		startEdge: [VecLike, VecLike]
		endEdge: [VecLike, VecLike]
	}>
}
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
			// on the opposide side of some shape
			type: 'gap_duplicate'
			gap: Gap
			protrusionDirection: 'left' | 'right' | 'top' | 'bottom'
			nudge: number
	  }

type GapNode = {
	id: TLShapeId
	pageBounds: Box2d
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

	for (const match of matches) {
		const node = direction === 'forward' ? match.endNode.id : match.startNode.id
		if (!nextNodes.has(node)) {
			nextNodes.add(node)
			matches.push(
				...findAdjacentGaps(
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
			)
		}
	}

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

export class SnapManager {
	private _snapLines = atom<SnapLine[] | undefined>('snapLines', undefined)

	get lines() {
		return this._snapLines.value ?? (EMPTY_ARRAY as SnapLine[])
	}

	clear() {
		if (this.lines.length) {
			this._snapLines.set(undefined)
		}
	}

	setLines(lines: SnapLine[]) {
		this._snapLines.set(lines)
	}

	constructor(public readonly editor: Editor) {}

	@computed get snapPointsCache() {
		return this.editor.store.createComputedCache<SnapPoint[], TLShape>('snapPoints', (shape) => {
			const pageTransfrorm = this.editor.getPageTransformById(shape.id)
			if (!pageTransfrorm) return undefined
			const util = this.editor.getShapeUtil(shape)
			const snapPoints = util.snapPoints(shape)
			return snapPoints.map((point, i) => {
				const { x, y } = Matrix2d.applyToPoint(pageTransfrorm, point)
				return { x, y, id: `${shape.id}:${i}` }
			})
		})
	}

	get snapThreshold() {
		return 8 / this.editor.zoomLevel
	}

	// TODO: make this an incremental derivation
	@computed get visibleShapesNotInSelection() {
		const selectedIds = this.editor.selectedIds

		const result: Set<{ id: TLShapeId; pageBounds: Box2d }> = new Set()

		const processParent = (parentId: TLParentId) => {
			const children = this.editor.getSortedChildIds(parentId)
			for (const id of children) {
				const shape = this.editor.getShapeById(id)
				if (!shape) continue
				if (shape.type === 'arrow') continue
				if (selectedIds.includes(id)) continue
				if (!this.editor.isShapeInViewport(shape.id)) continue

				if (shape.type === 'group') {
					// snap to children of group but not group itself
					processParent(id)
					continue
				}

				result.add({ id: shape.id, pageBounds: this.editor.getPageBoundsById(shape.id)! })

				// don't snap to children of frame
				if (shape.type !== 'frame') {
					processParent(id)
				}
			}
		}

		const commonFrameAncestor = this.editor.findCommonAncestor(
			compact(selectedIds.map((id) => this.editor.getShapeById(id))),
			(parent) => parent.type === 'frame'
		)

		processParent(commonFrameAncestor ?? this.editor.currentPageId)

		return result
	}

	@computed get visibleSnapPointsNotInSelection() {
		const result: SnapPoint[] = []
		for (const shape of this.visibleShapesNotInSelection) {
			const snapPoints = this.snapPointsCache.get(shape.id)
			if (snapPoints) {
				result.push(...snapPoints)
			}
		}
		return result
	}

	@computed get visibleGaps(): { horizontal: Gap[]; vertical: Gap[] } {
		const horizontal: Gap[] = []
		const vertical: Gap[] = []

		const sortedShapesHorizontal = [...this.visibleShapesNotInSelection].sort((a, b) => {
			return a.pageBounds.minX - b.pageBounds.minX
		})

		for (let i = 0; i < sortedShapesHorizontal.length; i++) {
			const startNode = sortedShapesHorizontal[i]
			for (let j = i + 1; j < sortedShapesHorizontal.length; j++) {
				const endNode = sortedShapesHorizontal[j]

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

		const sortedShapesVertical = sortedShapesHorizontal.slice(0).sort((a, b) => {
			return a.pageBounds.minY - b.pageBounds.minY
		})

		for (let i = 0; i < sortedShapesVertical.length; i++) {
			const startNode = sortedShapesVertical[i]
			for (let j = i + 1; j < sortedShapesVertical.length; j++) {
				const endNode = sortedShapesVertical[j]

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
		const isXLocked = lockedAxis === 'x'
		const isYLocked = lockedAxis === 'y'

		const selectionPageBounds = initialSelectionPageBounds.clone().translate(dragDelta)
		const selectionSnapPoints: SnapPoint[] = initialSelectionSnapPoints.map(({ x, y }, i) => ({
			id: 'selection:' + i,
			x: x + dragDelta.x,
			y: y + dragDelta.y,
		}))

		const otherNodeSnapPoints = this.visibleSnapPointsNotInSelection

		const nearestSnapsX: NearestSnap[] = []
		const nearestSnapsY: NearestSnap[] = []
		const minOffset = new Vec2d(this.snapThreshold, this.snapThreshold)

		this.findPointSnaps({
			minOffset,
			nearestSnapsX,
			nearestSnapsY,
			otherNodeSnapPoints,
			selectionSnapPoints,
		})

		this.findGapSnaps({ selectionPageBounds, nearestSnapsX, nearestSnapsY, minOffset })

		// at the same time, calculate how far we need to nudge the shape to 'snap' to the target point(s)
		const nudge = new Vec2d(
			isXLocked ? 0 : nearestSnapsX[0]?.nudge ?? 0,
			isYLocked ? 0 : nearestSnapsY[0]?.nudge ?? 0
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

		this.findPointSnaps({
			minOffset,
			nearestSnapsX,
			nearestSnapsY,
			otherNodeSnapPoints,
			selectionSnapPoints,
		})

		this.findGapSnaps({
			selectionPageBounds,
			nearestSnapsX,
			nearestSnapsY,
			minOffset,
		})

		const pointSnaps = this.getPointSnapLines({
			nearestSnapsX,
			nearestSnapsY,
		})

		const gapSnaps = this.getGapSnapLines({
			selectionPageBounds,
			nearestSnapsX,
			nearestSnapsY,
		})

		this._snapLines.set([...gapSnaps, ...pointSnaps])

		return { nudge }
	}

	// for a handle of a line:
	// - find the nearest snap point
	// - return the nudge vector to snap to that point
	// note: this happens within page space
	snapLineHandleTranslate({
		lineId,
		handleId,
		handlePoint,
	}: {
		lineId: TLShapeId
		handleId: string
		handlePoint: Vec2d
	}): SnapData {
		const line = this.editor.getShapeById<TLLineShape>(lineId)
		if (!line) {
			return { nudge: new Vec2d(0, 0) }
		}

		// We want the line to be able to snap to itself!
		// but we don't want it to snap to the current segment we're drawing
		// so let's get the splines of all segments except the current one
		// and then pass them to the snap function as 'additionalOutlines'

		// First, let's find which handle we're dragging
		const util = this.editor.getShapeUtil(LineShapeUtil)
		const handles = util.handles(line).sort(sortByIndex)
		if (handles.length < 3) return { nudge: new Vec2d(0, 0) }

		const handleNumber = handles.findIndex((h) => h.id === handleId)
		const handle = handles[handleNumber]

		// Now, let's figure out which segment this handle is on
		// So... there are two types of handles:
		// - vertex
		// - create

		// And this is how the handles of a line are arranged:
		// vertex --- create --- vertex -- create -- vertex

		// And we number them like this:
		// v --- c --- v --- c --- v
		// 0 --- 1 --- 2 --- 3 --- 4

		// We want to get the segments made by connecting the vertex handles:
		// v --- c --- v --- c --- v
		// 0 --- 1 --- 2 --- 3 --- 4
		// |-----------|-----------|
		// | segment 0 | segment 1 |
		// |-----------|-----------|

		// If we're dragging a vertex handle, we can get its segment number by dividing its handle number by 2
		// If we're dragging a create handle, we can get its segment number by adding 1 to its handle number, then dividing by 2
		const segmentNumber = handle.type === 'vertex' ? handleNumber / 2 : (handleNumber + 1) / 2

		// Then, get the splines of all segments except the current one
		// (and by the way - we want to get the splines in page space, not shape space)
		const spline = getSplineForLineShape(line)
		const ignoreCount = 1
		const pageTransform = this.editor.getPageTransform(line)!

		const pageHeadSegments = spline.segments
			.slice(0, Math.max(0, segmentNumber - ignoreCount))
			.map((s) => Matrix2d.applyToPoints(pageTransform, s.lut))

		const pageTailSegments = spline.segments
			.slice(segmentNumber + ignoreCount)
			.map((s) => Matrix2d.applyToPoints(pageTransform, s.lut))

		return this.snapHandleTranslate({
			handlePoint: handlePoint,
			additionalOutlines: [...pageHeadSegments, ...pageTailSegments],
		})
	}

	// for a handle:
	// - find the nearest snap point from all non-selected shapes
	// - return the nudge vector to snap to that point
	// note: this happens within page space
	snapHandleTranslate({
		handlePoint,
		additionalOutlines = [],
	}: {
		handlePoint: Vec2d
		additionalOutlines?: Vec2dModel[][]
	}): SnapData {
		// Get the (page-space) outlines of the shapes that are not in the selection
		const visibleShapesNotInSelection = this.visibleShapesNotInSelection
		const pageOutlines = []
		for (const visibleShape of visibleShapesNotInSelection) {
			const shape = this.editor.getShapeById(visibleShape.id)!

			if (shape.type === 'text' || shape.type === 'icon') {
				continue
			}

			const outline = deepCopy(this.editor.getOutlineById(visibleShape.id))

			const isClosed = this.editor.getShapeUtil(shape).isClosed?.(shape)

			if (isClosed) {
				outline.push(outline[0])
			}

			pageOutlines.push(
				Matrix2d.applyToPoints(this.editor.getPageTransformById(shape.id)!, outline)
			)
		}

		// Find the nearest point that is within the snap threshold
		let minDistance = this.snapThreshold
		let nearestPoint: Vec2d | null = null
		for (const outline of [...pageOutlines, ...additionalOutlines]) {
			for (let i = 0; i < outline.length - 1; i++) {
				const C = outline[i]
				const D = outline[i + 1]

				const distance = Vec2d.DistanceToLineSegment(C, D, handlePoint)
				if (isNaN(distance)) continue
				if (distance < minDistance) {
					minDistance = distance
					nearestPoint = Vec2d.NearestPointOnLineSegment(C, D, handlePoint)
				}
			}
		}

		// If we found a point, display snap lines, and return the nudge
		if (nearestPoint) {
			const snapLines: SnapLine[] = []

			snapLines.push({
				id: uniqueId(),
				type: 'points',
				points: [nearestPoint],
			})

			this._snapLines.set(snapLines)

			return {
				nudge: Vec2d.Sub(nearestPoint, handlePoint),
			}
		}

		return { nudge: new Vec2d(0, 0) }
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

		const otherNodeSnapPoints = this.visibleSnapPointsNotInSelection

		const nearestSnapsX: NearestPointsSnap[] = []
		const nearestSnapsY: NearestPointsSnap[] = []
		const minOffset = new Vec2d(this.snapThreshold, this.snapThreshold)

		this.findPointSnaps({
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

		this.findPointSnaps({
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

	private findPointSnaps({
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

	private findGapSnaps({
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
		for (const gap of this.visibleGaps.horizontal) {
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

		for (const gap of this.visibleGaps.vertical) {
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

	getPointSnapLines({
		nearestSnapsX,
		nearestSnapsY,
	}: {
		nearestSnapsX: NearestSnap[]
		nearestSnapsY: NearestSnap[]
	}) {
		// point snaps may align on multiple parallel lines so we need to split the pairs
		// into groups based on where they are in their their snap axes
		const snapGroupsX = {} as { [key: string]: SnapPair[] }
		const snapGroupsY = {} as { [key: string]: SnapPair[] }
		const result: PointsSnapLine[] = []

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
		for (const [_, snapGroup] of Object.entries(snapGroupsX).concat(Object.entries(snapGroupsY))) {
			result.push({
				id: uniqueId(),
				type: 'points',
				points: dedupe(
					snapGroup
						.map((snap) => Vec2d.From(snap.otherPoint))
						// be sure to nudge over the selection snap points
						.concat(snapGroup.map((snap) => Vec2d.From(snap.thisPoint))),
					(a: Vec2d, b: Vec2d) => a.equals(b)
				),
			})
		}

		return result
	}

	getGapSnapLines({
		selectionPageBounds,
		nearestSnapsX,
		nearestSnapsY,
	}: {
		selectionPageBounds: Box2d
		nearestSnapsX: NearestSnap[]
		nearestSnapsY: NearestSnap[]
	}): GapsSnapLine[] {
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
				if (snap.type === 'gap_center') {
					// create
					const newGapsLength = (snap.gap.length - selectionPageBounds.width) / 2
					const gapBreadthIntersection = rangeIntersection(
						snap.gap.breadthIntersection[0],
						snap.gap.breadthIntersection[1],
						selectionPageBounds.minY,
						selectionPageBounds.maxY
					)!
					result.push({
						type: 'gaps',
						direction: 'horizontal',
						id: uniqueId(),
						gaps: [
							...findAdjacentGaps(
								this.visibleGaps.horizontal,
								snap.gap.startNode.id,
								newGapsLength,
								'backward',
								gapBreadthIntersection
							),
							{
								startEdge: snap.gap.startEdge,
								endEdge: selectionSides.left,
							},
							{
								startEdge: selectionSides.right,
								endEdge: snap.gap.endEdge,
							},
							...findAdjacentGaps(
								this.visibleGaps.horizontal,
								snap.gap.endNode.id,
								newGapsLength,
								'forward',
								gapBreadthIntersection
							),
						],
					})
				}
				if (snap.type === 'gap_duplicate') {
					// create
					const gapBreadthIntersection = rangeIntersection(
						snap.gap.breadthIntersection[0],
						snap.gap.breadthIntersection[1],
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
											endEdge: [
												Vec2d.Add(snap.gap.startEdge[0], {
													x: -snap.gap.startNode.pageBounds.width,
													y: 0,
												}),
												Vec2d.Add(snap.gap.startEdge[1], {
													x: -snap.gap.startNode.pageBounds.width,
													y: 0,
												}),
											],
										},
										{
											startEdge: snap.gap.startEdge,
											endEdge: snap.gap.endEdge,
										},
										...findAdjacentGaps(
											this.visibleGaps.horizontal,
											snap.gap.endNode.id,
											snap.gap.length,
											'forward',
											gapBreadthIntersection
										),
								  ]
								: [
										...findAdjacentGaps(
											this.visibleGaps.horizontal,
											snap.gap.startNode.id,
											snap.gap.length,
											'backward',
											gapBreadthIntersection
										),
										{
											startEdge: snap.gap.startEdge,
											endEdge: snap.gap.endEdge,
										},
										{
											startEdge: [
												Vec2d.Add(snap.gap.endEdge[0], {
													x: snap.gap.endNode.pageBounds.width,
													y: 0,
												}),
												Vec2d.Add(snap.gap.endEdge[1], {
													x: snap.gap.endNode.pageBounds.width,
													y: 0,
												}),
											],
											endEdge: selectionSides.left,
										},
								  ],
					})
				}
			}
		}

		if (nearestSnapsY.length > 0) {
			for (const snap of nearestSnapsY) {
				if (snap.type === 'gap_center') {
					const newGapsLength = (snap.gap.length - selectionPageBounds.height) / 2
					const gapBreadthIntersection = rangeIntersection(
						snap.gap.breadthIntersection[0],
						snap.gap.breadthIntersection[1],
						selectionPageBounds.minX,
						selectionPageBounds.maxX
					)!
					result.push({
						type: 'gaps',
						direction: 'vertical',
						id: uniqueId(),
						gaps: [
							...findAdjacentGaps(
								this.visibleGaps.vertical,
								snap.gap.startNode.id,
								newGapsLength,
								'backward',
								gapBreadthIntersection
							),
							{
								startEdge: snap.gap.startEdge,
								endEdge: selectionSides.top,
							},
							{
								startEdge: selectionSides.bottom,
								endEdge: snap.gap.endEdge,
							},
							...findAdjacentGaps(
								this.visibleGaps.vertical,
								snap.gap.endNode.id,
								newGapsLength,
								'forward',
								gapBreadthIntersection
							),
						],
					})
				}

				if (snap.type === 'gap_duplicate') {
					const gapBreadthIntersection = rangeIntersection(
						snap.gap.breadthIntersection[0],
						snap.gap.breadthIntersection[1],
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
											endEdge: [
												Vec2d.Add(snap.gap.startEdge[0], {
													x: 0,
													y: -snap.gap.startNode.pageBounds.height,
												}),
												Vec2d.Add(snap.gap.startEdge[1], {
													x: 0,
													y: -snap.gap.startNode.pageBounds.height,
												}),
											],
										},
										{
											startEdge: snap.gap.startEdge,
											endEdge: snap.gap.endEdge,
										},
										...findAdjacentGaps(
											this.visibleGaps.vertical,
											snap.gap.endNode.id,
											snap.gap.length,
											'forward',
											gapBreadthIntersection
										),
								  ]
								: [
										...findAdjacentGaps(
											this.visibleGaps.vertical,
											snap.gap.startNode.id,
											snap.gap.length,
											'backward',
											gapBreadthIntersection
										),
										{
											startEdge: snap.gap.startEdge,
											endEdge: snap.gap.endEdge,
										},
										{
											startEdge: [
												Vec2d.Add(snap.gap.endEdge[0], {
													x: 0,
													y: snap.gap.endNode.pageBounds.height,
												}),
												Vec2d.Add(snap.gap.endEdge[1], {
													x: 0,
													y: snap.gap.endNode.pageBounds.height,
												}),
											],
											endEdge: selectionSides.top,
										},
								  ],
					})
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
