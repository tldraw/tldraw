import { computed } from '@tldraw/state'
import { TLShape, TLShapeId, VecModel } from '@tldraw/tlschema'
import { assertExists, dedupe } from '@tldraw/utils'
import {
	Box,
	SelectionCorner,
	SelectionEdge,
	flipSelectionHandleX,
	flipSelectionHandleY,
	isSelectionCorner,
} from '../../../primitives/Box'
import { Mat } from '../../../primitives/Mat'
import { Vec } from '../../../primitives/Vec'
import { rangeIntersection, rangesOverlap } from '../../../primitives/utils'
import { uniqueId } from '../../../utils/uniqueId'
import { Editor } from '../../Editor'
import {
	GapsSnapIndicator,
	PointsSnapIndicator,
	SnapData,
	SnapIndicator,
	SnapManager,
} from './SnapManager'

/**
 * When moving or resizing shapes, the bounds of the shape can snap to key geometry on other nearby
 * shapes. Customize how a shape snaps to others with {@link ShapeUtil.getBoundsSnapGeometry}.
 *
 * @public
 */
export interface BoundsSnapGeometry {
	/**
	 * Points that this shape will snap to. By default, this will be the corners and center of the
	 * shapes bounding box. To disable snapping to a specific point, use an empty array.
	 */
	points?: VecModel[]
}

/** @public */
export interface BoundsSnapPoint {
	id: string
	x: number
	y: number
	handle?: SelectionCorner
}

interface SnapPair {
	thisPoint: BoundsSnapPoint
	otherPoint: BoundsSnapPoint
}

interface NearestPointsSnap {
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

interface GapNode {
	id: TLShapeId
	pageBounds: Box
}

interface Gap {
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
	startEdge: [Vec, Vec]
	endEdge: [Vec, Vec]
	length: number
	breadthIntersection: [number, number]
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

function dedupeGapSnaps(snaps: Array<Extract<SnapIndicator, { type: 'gaps' }>>) {
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

export class BoundsSnaps {
	readonly editor: Editor
	constructor(readonly manager: SnapManager) {
		this.editor = manager.editor
	}

	@computed private getSnapPointsCache() {
		const { editor } = this
		return editor.store.createComputedCache<BoundsSnapPoint[], TLShape>('snapPoints', (shape) => {
			const pageTransform = editor.getShapePageTransform(shape.id)
			if (!pageTransform) return undefined
			const boundsSnapGeometry = editor.getShapeUtil(shape).getBoundsSnapGeometry(shape)
			const snapPoints =
				boundsSnapGeometry.points ?? editor.getShapeGeometry(shape).bounds.cornersAndCenter

			if (!pageTransform || !snapPoints) return undefined
			return snapPoints.map((point, i) => {
				const { x, y } = Mat.applyToPoint(pageTransform, point)
				return { x, y, id: `${shape.id}:${i}` }
			})
		})
	}

	getSnapPoints(shapeId: TLShapeId) {
		return this.getSnapPointsCache().get(shapeId) ?? []
	}

	// Points which belong to snappable shapes
	@computed private getSnappablePoints() {
		const snapPointsCache = this.getSnapPointsCache()
		const snappableShapes = this.manager.getSnappableShapes()
		const result: BoundsSnapPoint[] = []

		for (const shapeId of snappableShapes) {
			const snapPoints = snapPointsCache.get(shapeId)
			if (snapPoints) {
				result.push(...snapPoints)
			}
		}

		return result
	}

	@computed private getSnappableGapNodes(): Array<GapNode> {
		return Array.from(this.manager.getSnappableShapes(), (shapeId) => ({
			id: shapeId,
			pageBounds: assertExists(this.editor.getShapePageBounds(shapeId)),
		}))
	}

	@computed private getVisibleGaps(): { horizontal: Gap[]; vertical: Gap[] } {
		const horizontal: Gap[] = []
		const vertical: Gap[] = []

		let startNode: GapNode, endNode: GapNode

		const sortedShapesOnCurrentPageHorizontal = this.getSnappableGapNodes().sort((a, b) => {
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
							new Vec(startNode.pageBounds.maxX, startNode.pageBounds.minY),
							new Vec(startNode.pageBounds.maxX, startNode.pageBounds.maxY),
						],
						endEdge: [
							new Vec(endNode.pageBounds.minX, endNode.pageBounds.minY),
							new Vec(endNode.pageBounds.minX, endNode.pageBounds.maxY),
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
							new Vec(startNode.pageBounds.minX, startNode.pageBounds.maxY),
							new Vec(startNode.pageBounds.maxX, startNode.pageBounds.maxY),
						],
						endEdge: [
							new Vec(endNode.pageBounds.minX, endNode.pageBounds.minY),
							new Vec(endNode.pageBounds.maxX, endNode.pageBounds.minY),
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

	snapTranslateShapes({
		lockedAxis,
		initialSelectionPageBounds,
		initialSelectionSnapPoints,
		dragDelta,
	}: {
		lockedAxis: 'x' | 'y' | null
		initialSelectionSnapPoints: BoundsSnapPoint[]
		initialSelectionPageBounds: Box
		dragDelta: Vec
	}): SnapData {
		const snapThreshold = this.manager.getSnapThreshold()
		const visibleSnapPointsNotInSelection = this.getSnappablePoints()

		const selectionPageBounds = initialSelectionPageBounds.clone().translate(dragDelta)

		const selectionSnapPoints: BoundsSnapPoint[] = initialSelectionSnapPoints.map(
			({ x, y }, i) => ({
				id: 'selection:' + i,
				x: x + dragDelta.x,
				y: y + dragDelta.y,
			})
		)

		const otherNodeSnapPoints = visibleSnapPointsNotInSelection

		const nearestSnapsX: NearestSnap[] = []
		const nearestSnapsY: NearestSnap[] = []
		const minOffset = new Vec(snapThreshold, snapThreshold)

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
		const nudge = new Vec(
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

		this.manager.setIndicators([...gapSnapLines, ...pointSnapsLines])

		return { nudge }
	}

	snapResizeShapes({
		initialSelectionPageBounds,
		dragDelta,
		handle: originalHandle,
		isAspectRatioLocked,
		isResizingFromCenter,
	}: {
		// the page bounds when the pointer went down, before any dragging
		initialSelectionPageBounds: Box
		// how far the pointer has been dragged
		dragDelta: Vec

		handle: SelectionCorner | SelectionEdge
		isAspectRatioLocked: boolean
		isResizingFromCenter: boolean
	}): SnapData {
		const snapThreshold = this.manager.getSnapThreshold()

		// first figure out the new bounds of the selection
		const {
			box: unsnappedResizedPageBounds,
			scaleX,
			scaleY,
		} = Box.Resize(
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
		const minOffset = new Vec(snapThreshold, snapThreshold)

		this.collectPointSnaps({
			minOffset,
			nearestSnapsX,
			nearestSnapsY,
			otherNodeSnapPoints,
			selectionSnapPoints,
		})

		// at the same time, calculate how far we need to nudge the shape to 'snap' to the target point(s)
		const nudge = new Vec(
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
		const snappedDelta = Vec.Add(dragDelta, nudge)

		// first figure out the new bounds of the selection
		const { box: snappedResizedPageBounds } = Box.Resize(
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

		this.manager.setIndicators([...pointSnaps])

		return { nudge }
	}

	private collectPointSnaps({
		selectionSnapPoints,
		otherNodeSnapPoints,
		minOffset,
		nearestSnapsX,
		nearestSnapsY,
	}: {
		selectionSnapPoints: BoundsSnapPoint[]
		otherNodeSnapPoints: BoundsSnapPoint[]
		minOffset: Vec
		nearestSnapsX: NearestSnap[]
		nearestSnapsY: NearestSnap[]
	}) {
		// for each snap point on the bounding box of the selection, find the set of points
		// which are closest to it in each axis
		for (const thisSnapPoint of selectionSnapPoints) {
			for (const otherSnapPoint of otherNodeSnapPoints) {
				const offset = Vec.Sub(thisSnapPoint, otherSnapPoint)
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
		selectionPageBounds: Box
		minOffset: Vec
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
	}): PointsSnapIndicator[] {
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
						.map((snap) => Vec.From(snap.otherPoint))
						// be sure to nudge over the selection snap points
						.concat(snapGroup.map((snap) => Vec.From(snap.thisPoint))),
					(a: Vec, b: Vec) => a.equals(b)
				),
			}))
	}

	private getGapSnapLines({
		selectionPageBounds,
		nearestSnapsX,
		nearestSnapsY,
	}: {
		selectionPageBounds: Box
		nearestSnapsX: NearestSnap[]
		nearestSnapsY: NearestSnap[]
	}): GapsSnapIndicator[] {
		const { vertical, horizontal } = this.getVisibleGaps()

		const selectionSides: Record<SelectionEdge, [Vec, Vec]> = {
			top: selectionPageBounds.sides[0],
			right: selectionPageBounds.sides[1],
			// need bottom and left to be sorted asc, which .sides is not.
			bottom: [selectionPageBounds.corners[3], selectionPageBounds.corners[2]],
			left: [selectionPageBounds.corners[0], selectionPageBounds.corners[3]],
		}

		const result: GapsSnapIndicator[] = []

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
												) as [Vec, Vec],
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
												) as [Vec, Vec],
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
													) as [Vec, Vec],
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
													) as [Vec, Vec],
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
	selectionPageBounds: Box
): BoundsSnapPoint[] {
	const { minX, maxX, minY, maxY } = selectionPageBounds
	const result: BoundsSnapPoint[] = []

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
