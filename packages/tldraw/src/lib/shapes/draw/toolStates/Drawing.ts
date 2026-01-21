import {
	Mat,
	StateNode,
	TLDefaultSizeStyle,
	TLDrawShape,
	TLDrawShapeSegment,
	TLHighlightShape,
	TLKeyboardEventInfo,
	TLPointerEventInfo,
	TLShapePartial,
	Vec,
	VecModel,
	b64Vecs,
	createShapeId,
	last,
	snapAngle,
	structuredClone,
	toFixed,
	uniqueId,
} from '@tldraw/editor'
import { HighlightShapeUtil } from '../../highlight/HighlightShapeUtil'
import { STROKE_SIZES } from '../../shared/default-shape-constants'
import { DrawShapeUtil } from '../DrawShapeUtil'

type DrawableShape = TLDrawShape | TLHighlightShape

export class Drawing extends StateNode {
	static override id = 'drawing'

	info = {} as TLPointerEventInfo

	initialShape?: DrawableShape

	override shapeType = this.parent.id === 'highlight' ? ('highlight' as const) : ('draw' as const)

	util = this.editor.getShapeUtil(this.shapeType) as DrawShapeUtil | HighlightShapeUtil

	isPen = false
	isPenOrStylus = false

	segmentMode = 'free' as 'free' | 'straight' | 'starting_straight' | 'starting_free'

	didJustShiftClickToExtendPreviousShapeLine = false

	pagePointWhereCurrentSegmentChanged = {} as Vec

	pagePointWhereNextSegmentChanged = null as Vec | null

	lastRecordedPoint = {} as Vec
	mergeNextPoint = false
	currentLineLength = 0

	// Cache for current segment's points to avoid repeated b64 decode/encode
	currentSegmentPoints: Vec[] = []

	markId = null as null | string

	override onEnter(info: TLPointerEventInfo) {
		this.markId = null
		this.info = info
		this.lastRecordedPoint = this.editor.inputs.getCurrentPagePoint().clone()
		this.startShape()
	}

	override onPointerMove() {
		const { inputs } = this.editor
		const isPen = inputs.getIsPen()

		if (this.isPen && !isPen) {
			// The user made a palm gesture before starting a pen gesture;
			// ideally we'd start the new shape here but we could also just bail
			// as the next interaction will work correctly
			if (this.markId) {
				this.editor.bailToMark(this.markId)
				this.startShape()
				return
			}
		}

		if (this.isPenOrStylus) {
			// Don't update the shape if we haven't moved far enough from the last time we recorded a point
			const currentPagePoint = inputs.getCurrentPagePoint()
			if (Vec.Dist(currentPagePoint, this.lastRecordedPoint) >= 1 / this.editor.getZoomLevel()) {
				this.lastRecordedPoint = currentPagePoint.clone()
				this.mergeNextPoint = false
			} else {
				this.mergeNextPoint = true
			}
		} else {
			this.mergeNextPoint = false
		}

		this.updateDrawingShape()
	}

	override onKeyDown(info: TLKeyboardEventInfo) {
		if (info.key === 'Shift') {
			switch (this.segmentMode) {
				case 'free': {
					// We've just entered straight mode, go to straight mode
					this.segmentMode = 'starting_straight'
					this.pagePointWhereNextSegmentChanged = this.editor.inputs.getCurrentPagePoint().clone()
					break
				}
				case 'starting_free': {
					this.segmentMode = 'starting_straight'
				}
			}
		}
		this.updateDrawingShape()
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
		if (info.key === 'Shift') {
			this.editor.snaps.clearIndicators()

			switch (this.segmentMode) {
				case 'straight': {
					// We've just exited straight mode, go back to free mode
					this.segmentMode = 'starting_free'
					this.pagePointWhereNextSegmentChanged = this.editor.inputs.getCurrentPagePoint().clone()
					break
				}
				case 'starting_straight': {
					this.pagePointWhereNextSegmentChanged = null
					this.segmentMode = 'free'
					break
				}
			}
		}

		this.updateDrawingShape()
	}

	override onExit() {
		this.editor.snaps.clearIndicators()
		this.pagePointWhereCurrentSegmentChanged = this.editor.inputs.getCurrentPagePoint().clone()
	}

	canClose() {
		return this.shapeType !== 'highlight'
	}

	getIsClosed(segments: TLDrawShapeSegment[], size: TLDefaultSizeStyle, scale: number) {
		if (!this.canClose()) return false

		const strokeWidth = STROKE_SIZES[size]
		const firstPoint = b64Vecs.decodeFirstPoint(segments[0].path)
		const lastSegment = segments[segments.length - 1]
		const lastPoint = b64Vecs.decodeLastPoint(lastSegment.path)

		return (
			firstPoint !== null &&
			lastPoint !== null &&
			firstPoint !== lastPoint &&
			this.currentLineLength > strokeWidth * 4 * scale &&
			Vec.DistMin(firstPoint, lastPoint, strokeWidth * 2 * scale)
		)
	}

	private startShape() {
		const inputs = this.editor.inputs
		const originPagePoint = inputs.getOriginPagePoint()
		const isPen = inputs.getIsPen()

		this.markId = this.editor.markHistoryStoppingPoint('draw start')

		// If the pressure is weird, then it's probably a stylus reporting as a mouse
		// We treat pen/stylus inputs differently in the drawing tool, so we need to
		// have our own value for this. The inputs.isPen is only if the input is a regular
		// pen, like an iPad pen, which needs to trigger "pen mode" in order to avoid
		// accidental palm touches. We don't have to worry about that with styluses though.
		const { z = 0.5 } = this.info.point

		this.isPen = isPen
		this.isPenOrStylus = isPen || (z > 0 && z < 0.5) || (z > 0.5 && z < 1)

		const pressure = this.isPenOrStylus ? z * 1.25 : 0.5

		this.segmentMode = this.editor.inputs.getShiftKey() ? 'straight' : 'free'

		this.didJustShiftClickToExtendPreviousShapeLine = false

		this.lastRecordedPoint = originPagePoint.clone()

		if (this.initialShape) {
			const shape = this.editor.getShape<DrawableShape>(this.initialShape.id)

			if (shape && this.segmentMode === 'straight') {
				// Connect dots

				this.didJustShiftClickToExtendPreviousShapeLine = true

				const prevSegment = last(shape.props.segments)
				if (!prevSegment) throw Error('Expected a previous segment!')
				const prevPoint = b64Vecs.decodeLastPoint(prevSegment.path)
				if (!prevPoint) throw Error('Expected a previous point!')

				const { x, y } = this.editor.getPointInShapeSpace(shape, originPagePoint).toFixed()

				const newSegment: TLDrawShapeSegment = {
					type: this.segmentMode,
					path: b64Vecs.encodePoints([
						{ x: prevPoint.x, y: prevPoint.y, z: +pressure.toFixed(2) },
						{ x, y, z: +pressure.toFixed(2) },
					]),
				}

				// Convert prevPoint to page space
				const prevPointPageSpace = Mat.applyToPoint(
					this.editor.getShapePageTransform(shape.id)!,
					prevPoint
				)
				this.pagePointWhereCurrentSegmentChanged = prevPointPageSpace
				this.pagePointWhereNextSegmentChanged = null
				const segments = [...shape.props.segments, newSegment]

				if (this.currentLineLength < STROKE_SIZES[shape.props.size] * 4) {
					this.currentLineLength = this.getLineLength(segments)
				}

				const shapePartial: TLShapePartial<DrawableShape> = {
					id: shape.id,
					type: this.shapeType,
					props: {
						segments,
					},
				}

				if (this.canClose()) {
					;(shapePartial as TLShapePartial<TLDrawShape>).props!.isClosed = this.getIsClosed(
						segments,
						shape.props.size,
						shape.props.scale
					)
				}

				this.editor.updateShapes([shapePartial])

				return
			}
		}

		// Create a new shape

		this.pagePointWhereCurrentSegmentChanged = originPagePoint.clone()
		const id = createShapeId()

		// Initialize the segment points cache
		const initialPoint = new Vec(0, 0, +pressure.toFixed(2))
		this.currentSegmentPoints = [initialPoint]

		// Allow this to trigger the max shapes reached alert
		this.editor.createShape({
			id,
			type: this.shapeType,
			x: originPagePoint.x,
			y: originPagePoint.y,
			props: {
				isPen: this.isPenOrStylus,
				scale: this.editor.user.getIsDynamicResizeMode() ? 1 / this.editor.getZoomLevel() : 1,
				segments: [
					{
						type: this.segmentMode,
						path: b64Vecs.encodePoints([initialPoint]),
					},
				],
			},
		})
		const shape = this.editor.getShape<DrawableShape>(id)
		if (!shape) {
			this.cancel()
			return
		}
		this.currentLineLength = 0
		this.initialShape = this.editor.getShape<DrawableShape>(id)
	}

	private updateDrawingShape() {
		const { initialShape } = this
		const { inputs } = this.editor

		if (!initialShape) return

		const {
			id,
			props: { size, scale },
		} = initialShape

		const shape = this.editor.getShape<DrawableShape>(id)!

		if (!shape) return

		const { segments } = shape.props

		const currentPagePoint = inputs.getCurrentPagePoint()
		const { x, y, z } = this.editor.getPointInShapeSpace(shape, currentPagePoint).toFixed()
		const pressure = this.isPenOrStylus ? +(currentPagePoint.z! * 1.25).toFixed(2) : 0.5
		const newPoint = { x, y, z: pressure }

		switch (this.segmentMode) {
			case 'starting_straight': {
				const { pagePointWhereNextSegmentChanged } = this

				if (pagePointWhereNextSegmentChanged === null) {
					throw Error('We should have a point where the segment changed')
				}

				const hasMovedFarEnough =
					Vec.Dist2(pagePointWhereNextSegmentChanged, inputs.getCurrentPagePoint()) >
					this.editor.options.dragDistanceSquared

				// Find the distance from where the pointer was when shift was released and
				// where it is now; if it's far enough away, then update the page point where
				// the current segment changed (to match the pagepoint where next segment changed)
				// and set the pagepoint where next segment changed to null.
				if (hasMovedFarEnough) {
					this.pagePointWhereCurrentSegmentChanged = this.pagePointWhereNextSegmentChanged!.clone()
					this.pagePointWhereNextSegmentChanged = null

					// Set the new mode
					this.segmentMode = 'straight'

					const prevSegment = last(segments)
					if (!prevSegment) throw Error('Expected a previous segment!')

					const prevLastPoint = b64Vecs.decodeLastPoint(prevSegment.path)
					if (!prevLastPoint) throw Error('Expected a previous last point!')

					let newSegment: TLDrawShapeSegment

					const newLastPoint = this.editor
						.getPointInShapeSpace(shape, this.pagePointWhereCurrentSegmentChanged)
						.toFixed()
						.toJson()

					if (prevSegment.type === 'straight') {
						this.currentLineLength += Vec.Dist(prevLastPoint, newLastPoint)

						newSegment = {
							type: 'straight',
							path: b64Vecs.encodePoints([prevLastPoint, newLastPoint]),
						}

						const transform = this.editor.getShapePageTransform(shape)!

						this.pagePointWhereCurrentSegmentChanged = Mat.applyToPoint(transform, prevLastPoint)
					} else {
						newSegment = {
							type: 'straight',
							path: b64Vecs.encodePoints([newLastPoint, newPoint]),
						}
					}

					const shapePartial: TLShapePartial<DrawableShape> = {
						id,
						type: this.shapeType,
						props: {
							segments: [...segments, newSegment],
						},
					}

					if (this.canClose()) {
						;(shapePartial as TLShapePartial<TLDrawShape>).props!.isClosed = this.getIsClosed(
							segments,
							size,
							scale
						)
					}

					this.editor.updateShapes([shapePartial])
				}
				break
			}
			case 'starting_free': {
				const { pagePointWhereNextSegmentChanged } = this

				if (pagePointWhereNextSegmentChanged === null) {
					throw Error('We should have a point where the segment changed')
				}

				const hasMovedFarEnough =
					Vec.Dist2(pagePointWhereNextSegmentChanged, inputs.getCurrentPagePoint()) >
					this.editor.options.dragDistanceSquared

				// Find the distance from where the pointer was when shift was released and
				// where it is now; if it's far enough away, then update the page point where
				// the current segment changed (to match the pagepoint where next segment changed)
				// and set the pagepoint where next segment changed to null.
				if (hasMovedFarEnough) {
					this.pagePointWhereCurrentSegmentChanged = this.pagePointWhereNextSegmentChanged!.clone()
					this.pagePointWhereNextSegmentChanged = null

					// Set the new mode
					this.segmentMode = 'free'

					const newSegments = segments.slice()
					const prevStraightSegment = newSegments[newSegments.length - 1]
					const prevPoint = b64Vecs.decodeLastPoint(prevStraightSegment.path)

					if (!prevPoint) {
						throw Error('No previous point!')
					}

					// Create the new free segment and interpolate the points between where the last line
					// ended and where the pointer is now
					const interpolatedPoints = Vec.PointsBetween(prevPoint, newPoint, 6).map(
						(p) => new Vec(toFixed(p.x), toFixed(p.y), toFixed(p.z))
					)
					// Initialize cache for the new free segment
					this.currentSegmentPoints = interpolatedPoints

					const newFreeSegment: TLDrawShapeSegment = {
						type: 'free',
						path: b64Vecs.encodePoints(interpolatedPoints),
					}

					const finalSegments = [...newSegments, newFreeSegment]

					if (this.currentLineLength < STROKE_SIZES[shape.props.size] * 4) {
						this.currentLineLength = this.getLineLength(finalSegments)
					}

					const shapePartial: TLShapePartial<DrawableShape> = {
						id,
						type: this.shapeType,
						props: {
							segments: finalSegments,
						},
					}

					if (this.canClose()) {
						;(shapePartial as TLShapePartial<TLDrawShape>).props!.isClosed = this.getIsClosed(
							finalSegments,
							size,
							scale
						)
					}

					this.editor.updateShapes([shapePartial])
				}

				break
			}
			case 'straight': {
				const newSegments = segments.slice()
				const newSegment = newSegments[newSegments.length - 1]

				const { pagePointWhereCurrentSegmentChanged } = this
				const inputs = this.editor.inputs
				const ctrlKey = inputs.getCtrlKey()
				const currentPagePoint = inputs.getCurrentPagePoint()

				if (!pagePointWhereCurrentSegmentChanged)
					throw Error('We should have a point where the segment changed')

				let pagePoint: VecModel
				let shouldSnapToAngle = false

				if (this.didJustShiftClickToExtendPreviousShapeLine) {
					if (this.editor.inputs.getIsDragging()) {
						// If we've just shift clicked to extend a line, only snap once we've started dragging
						shouldSnapToAngle = !ctrlKey
						this.didJustShiftClickToExtendPreviousShapeLine = false
					} else {
						// noop
					}
				} else {
					// If we're not shift clicking to extend a line, but we're holding shift, then we should snap
					shouldSnapToAngle = !ctrlKey // don't snap angle while snapping line
				}

				let newPoint = this.editor.getPointInShapeSpace(shape, currentPagePoint).toFixed().toJson()
				let didSnap = false
				let snapSegment: TLDrawShapeSegment | undefined = undefined

				const shouldSnap = this.editor.user.getIsSnapMode() ? !ctrlKey : ctrlKey

				if (shouldSnap) {
					if (newSegments.length > 2) {
						let nearestPoint: VecModel | undefined = undefined
						let minDistance = 8 / this.editor.getZoomLevel()

						// Don't try to snap to the last two segments
						for (let i = 0, n = segments.length - 2; i < n; i++) {
							const segment = segments[i]
							if (!segment) break
							if (segment.type === 'free') continue

							const first = b64Vecs.decodeFirstPoint(segment.path)
							const lastPoint = b64Vecs.decodeLastPoint(segment.path)
							if (!(first && lastPoint)) continue

							// Snap to the nearest point on the segment, if it's closer than the previous snapped point
							const nearestPointOnSegment = Vec.NearestPointOnLineSegment(
								first,
								lastPoint,
								newPoint
							)

							if (Vec.DistMin(nearestPointOnSegment, newPoint, minDistance)) {
								nearestPoint = nearestPointOnSegment.toFixed().toJson()
								minDistance = Vec.Dist(nearestPointOnSegment, newPoint)
								snapSegment = segment
								break
							}
						}

						if (nearestPoint) {
							didSnap = true
							newPoint = nearestPoint
						}
					}
				}

				if (didSnap && snapSegment) {
					const transform = this.editor.getShapePageTransform(shape)!
					const first = b64Vecs.decodeFirstPoint(snapSegment.path)
					const lastPoint = b64Vecs.decodeLastPoint(snapSegment.path)
					if (!first || !lastPoint) throw Error('Expected a last point!')

					const A = Mat.applyToPoint(transform, first)

					const B = Mat.applyToPoint(transform, lastPoint)

					const snappedPoint = Mat.applyToPoint(transform, newPoint)

					this.editor.snaps.setIndicators([
						{
							id: uniqueId(),
							type: 'points',
							points: [A, snappedPoint, B],
						},
					])
				} else {
					this.editor.snaps.clearIndicators()

					if (shouldSnapToAngle) {
						// Snap line angle to nearest 15 degrees
						const currentAngle = Vec.Angle(pagePointWhereCurrentSegmentChanged, currentPagePoint)
						const snappedAngle = snapAngle(currentAngle, 24)
						const angleDiff = snappedAngle - currentAngle

						pagePoint = Vec.RotWith(
							currentPagePoint,
							pagePointWhereCurrentSegmentChanged,
							angleDiff
						)
					} else {
						pagePoint = currentPagePoint.clone()
					}

					newPoint = this.editor.getPointInShapeSpace(shape, pagePoint).toFixed().toJson()
				}

				// If the previous segment is a one point free shape and is the first segment of the line,
				// then the user just did a click-and-immediately-press-shift to create a new straight line
				// without continuing the previous line. In this case, we want to remove the previous segment.

				this.currentLineLength +=
					newSegments.length && b64Vecs.decodeFirstPoint(newSegment.path)
						? Vec.Dist(b64Vecs.decodeFirstPoint(newSegment.path)!, Vec.From(newPoint))
						: 0

				newSegments[newSegments.length - 1] = {
					...newSegment,
					type: 'straight',
					path: b64Vecs.encodePoints([
						b64Vecs.decodeFirstPoint(newSegment.path)!,
						Vec.From(newPoint),
					]),
				}

				const shapePartial: TLShapePartial<DrawableShape> = {
					id,
					type: this.shapeType,
					props: {
						segments: newSegments,
					},
				}

				if (this.canClose()) {
					;(shapePartial as TLShapePartial<TLDrawShape>).props!.isClosed = this.getIsClosed(
						segments,
						size,
						scale
					)
				}

				this.editor.updateShapes([shapePartial])

				break
			}
			case 'free': {
				// Use cached points instead of decoding from b64 on every update
				const cachedPoints = this.currentSegmentPoints

				if (cachedPoints.length && this.mergeNextPoint) {
					const lastPoint = cachedPoints[cachedPoints.length - 1]
					lastPoint.x = newPoint.x
					lastPoint.y = newPoint.y
					lastPoint.z = lastPoint.z ? Math.max(lastPoint.z, newPoint.z) : newPoint.z
					// Note: we could recompute the line length here, but it's not really necessary
					// this.currentLineLength = this.getLineLength(newSegments)
				} else {
					this.currentLineLength += cachedPoints.length
						? Vec.Dist(cachedPoints[cachedPoints.length - 1], newPoint)
						: 0
					cachedPoints.push(new Vec(newPoint.x, newPoint.y, newPoint.z))
				}

				const newSegments = segments.slice()
				const newSegment = newSegments[newSegments.length - 1]
				newSegments[newSegments.length - 1] = {
					...newSegment,
					path: b64Vecs.encodePoints(cachedPoints),
				}

				if (this.currentLineLength < STROKE_SIZES[shape.props.size] * 4) {
					this.currentLineLength = this.getLineLength(newSegments)
				}

				const shapePartial: TLShapePartial<DrawableShape> = {
					id,
					type: this.shapeType,
					props: {
						segments: newSegments,
					},
				}

				if (this.canClose()) {
					;(shapePartial as TLShapePartial<TLDrawShape>).props!.isClosed = this.getIsClosed(
						newSegments,
						size,
						scale
					)
				}

				this.editor.updateShapes([shapePartial])

				// Set a maximum length for the lines array; after 200 points, complete the line.
				if (cachedPoints.length > this.util.options.maxPointsPerShape) {
					this.editor.updateShapes([{ id, type: this.shapeType, props: { isComplete: true } }])

					const newShapeId = createShapeId()

					const props = this.editor.getShape<DrawableShape>(id)!.props

					if (!this.editor.canCreateShapes([newShapeId])) return this.cancel()
					const currentPagePoint = inputs.getCurrentPagePoint()

					// Reset cache for the new shape's segment
					const initialPoint = new Vec(0, 0, this.isPenOrStylus ? +(z! * 1.25).toFixed() : 0.5)
					this.currentSegmentPoints = [initialPoint]

					this.editor.createShape({
						id: newShapeId,
						type: this.shapeType,
						x: toFixed(currentPagePoint.x),
						y: toFixed(currentPagePoint.y),
						props: {
							isPen: this.isPenOrStylus,
							scale: props.scale,
							segments: [
								{
									type: 'free',
									path: b64Vecs.encodePoints([initialPoint]),
								},
							],
						},
					})

					const shape = this.editor.getShape<DrawableShape>(newShapeId)

					if (!shape) {
						// This would only happen if the page is full and no more shapes can be created. The bug would manifest as a crash when we try to clone the shape.
						// todo: handle this type of thing better
						return this.cancel()
					}

					this.initialShape = structuredClone(shape)
					this.mergeNextPoint = false
					this.lastRecordedPoint = currentPagePoint.clone()
					this.currentLineLength = 0
				}

				break
			}
		}
	}

	private getLineLength(segments: TLDrawShapeSegment[]) {
		let length = 0

		for (let j = 0; j < segments.length; j++) {
			const points = b64Vecs.decodePoints(segments[j].path)
			for (let i = 0; i < points.length - 1; i++) {
				length += Vec.Dist2(points[i], points[i + 1])
			}
		}

		return Math.sqrt(length)
	}

	override onPointerUp() {
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	override onComplete() {
		this.complete()
	}

	override onInterrupt() {
		if (this.editor.inputs.getIsDragging()) {
			return
		}

		if (this.markId) {
			this.editor.bailToMark(this.markId)
		}
		this.cancel()
	}

	complete() {
		const { initialShape } = this
		if (!initialShape) return
		this.editor.updateShapes([
			{ id: initialShape.id, type: initialShape.type, props: { isComplete: true } },
		])

		this.parent.transition('idle')
	}

	cancel() {
		this.parent.transition('idle', this.info)
	}
}
