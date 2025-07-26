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

	markId = null as null | string

	override onEnter(info: TLPointerEventInfo) {
		this.markId = null
		this.info = info
		this.lastRecordedPoint = this.editor.inputs.currentPagePoint.clone()
		this.startShape()
	}

	override onPointerMove() {
		const { inputs } = this.editor

		if (this.isPen && !inputs.isPen) {
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
			if (
				Vec.Dist(inputs.currentPagePoint, this.lastRecordedPoint) >=
				1 / this.editor.getZoomLevel()
			) {
				this.lastRecordedPoint = inputs.currentPagePoint.clone()
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
					this.pagePointWhereNextSegmentChanged = this.editor.inputs.currentPagePoint.clone()
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
					this.pagePointWhereNextSegmentChanged = this.editor.inputs.currentPagePoint.clone()
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
		this.pagePointWhereCurrentSegmentChanged = this.editor.inputs.currentPagePoint.clone()
	}

	canClose() {
		return this.shapeType !== 'highlight'
	}

	getIsClosed(segments: TLDrawShapeSegment[], size: TLDefaultSizeStyle, scale: number) {
		if (!this.canClose()) return false

		const strokeWidth = STROKE_SIZES[size]
		const firstPoint = segments[0].points[0]
		const lastSegment = segments[segments.length - 1]
		const lastPoint = lastSegment.points[lastSegment.points.length - 1]

		return (
			firstPoint !== lastPoint &&
			this.currentLineLength > strokeWidth * 4 * scale &&
			Vec.DistMin(firstPoint, lastPoint, strokeWidth * 2 * scale)
		)
	}

	private startShape() {
		const {
			inputs: { originPagePoint, isPen },
		} = this.editor

		this.markId = this.editor.markHistoryStoppingPoint('draw start')

		// If the pressure is weird, then it's probably a stylus reporting as a mouse
		// We treat pen/stylus inputs differently in the drawing tool, so we need to
		// have our own value for this. The inputs.isPen is only if the input is a regular
		// pen, like an iPad pen, which needs to trigger "pen mode" in order to avoid
		// accidental palm touches. We don't have to worry about that with styluses though.
		const { z = 0.5 } = this.info.point

		this.isPen = isPen
		this.isPenOrStylus = isPen || (z > 0 && z < 0.5) || (z > 0.5 && z < 1)

		// Calculate pressure in new format (integer 0-100 or undefined)
		let pressure: number | undefined
		if (this.isPenOrStylus) {
			// Convert from 0-1 input range to 0-100 integer, with 1.25x multiplier for pen sensitivity
			const rawPressure = z * 1.25
			pressure = Math.round(Math.min(100, Math.max(0, rawPressure * 100)))
		}
		// For non-pen inputs, pressure remains undefined (no z property)

		this.segmentMode = this.editor.inputs.shiftKey ? 'straight' : 'free'

		this.didJustShiftClickToExtendPreviousShapeLine = false

		this.lastRecordedPoint = originPagePoint.clone()

		if (this.initialShape) {
			const shape = this.editor.getShape<DrawableShape>(this.initialShape.id)

			if (shape && this.segmentMode === 'straight') {
				// Connect dots

				this.didJustShiftClickToExtendPreviousShapeLine = true

				const prevSegment = last(shape.props.segments)
				if (!prevSegment) throw Error('Expected a previous segment!')
				const prevPoint = last(prevSegment.points)
				if (!prevPoint) throw Error('Expected a previous point!')

				const { x, y } = this.editor.getPointInShapeSpace(shape, originPagePoint).toFixed()

				const newPoint: VecModel = { x, y }
				if (pressure !== undefined) {
					newPoint.z = pressure
				}

				const prevPointWithPressure: VecModel = { x: prevPoint.x, y: prevPoint.y }
				if (pressure !== undefined) {
					prevPointWithPressure.z = pressure
				}

				const newSegment: TLDrawShapeSegment = {
					type: this.segmentMode,
					points: [prevPointWithPressure, newPoint],
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

				this.editor.updateShapes<TLDrawShape | TLHighlightShape>([shapePartial])

				return
			}
		}

		// Create a new shape

		this.pagePointWhereCurrentSegmentChanged = originPagePoint.clone()
		const id = createShapeId()

		const initialPoint: VecModel = { x: 0, y: 0 }
		if (pressure !== undefined) {
			initialPoint.z = pressure
		}

		// Allow this to trigger the max shapes reached alert
		this.editor.createShape<DrawableShape>({
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
						points: [initialPoint],
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

		const { x, y } = this.editor.getPointInShapeSpace(shape, inputs.currentPagePoint).toFixed()
		
		// Calculate pressure in new format (integer 0-100 or undefined)
		let pressure: number | undefined
		if (this.isPenOrStylus && inputs.currentPagePoint.z !== undefined) {
			// Convert from 0-1 input range to 0-100 integer, with 1.25x multiplier for pen sensitivity
			const rawPressure = inputs.currentPagePoint.z * 1.25
			pressure = Math.round(Math.min(100, Math.max(0, rawPressure * 100)))
		}
		
		const newPoint: VecModel = { x, y }
		if (pressure !== undefined) {
			newPoint.z = pressure
		}

		switch (this.segmentMode) {
			case 'starting_straight': {
				const { pagePointWhereNextSegmentChanged } = this

				if (pagePointWhereNextSegmentChanged === null) {
					throw Error('We should have a point where the segment changed')
				}

				const hasMovedFarEnough =
					Vec.Dist2(pagePointWhereNextSegmentChanged, inputs.currentPagePoint) >
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

					const prevLastPoint = last(prevSegment.points)
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
							points: [{ ...prevLastPoint }, newLastPoint],
						}

						const transform = this.editor.getShapePageTransform(shape)!

						this.pagePointWhereCurrentSegmentChanged = Mat.applyToPoint(transform, prevLastPoint)
					} else {
						newSegment = {
							type: 'straight',
							points: [newLastPoint, newPoint],
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

					this.editor.updateShapes<TLDrawShape | TLHighlightShape>([shapePartial])
				}
				break
			}
			case 'starting_free': {
				const { pagePointWhereNextSegmentChanged } = this

				if (pagePointWhereNextSegmentChanged === null) {
					throw Error('We should have a point where the segment changed')
				}

				const hasMovedFarEnough =
					Vec.Dist2(pagePointWhereNextSegmentChanged, inputs.currentPagePoint) >
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
					const prevPoint = last(prevStraightSegment.points)

					if (!prevPoint) {
						throw Error('No previous point!')
					}

					// Create the new free segment and interpolate the points between where the last line
					// ended and where the pointer is now
					const interpolatedPoints = Vec.PointsBetween(prevPoint, newPoint, 6).map((p) => {
						const point: VecModel = {
							x: toFixed(p.x),
							y: toFixed(p.y),
						}
						if (pressure !== undefined) {
							point.z = pressure
						}
						return point
					})
					
					const newFreeSegment: TLDrawShapeSegment = {
						type: 'free',
						points: interpolatedPoints,
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
				const { ctrlKey, currentPagePoint } = this.editor.inputs

				if (!pagePointWhereCurrentSegmentChanged)
					throw Error('We should have a point where the segment changed')

				let pagePoint: VecModel
				let shouldSnapToAngle = false

				if (this.didJustShiftClickToExtendPreviousShapeLine) {
					if (this.editor.inputs.isDragging) {
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

							const first = segment.points[0]
							const lastPoint = last(segment.points)
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
					const first = snapSegment.points[0]
					const lastPoint = last(snapSegment.points)
					if (!lastPoint) throw Error('Expected a last point!')

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
						pagePoint = currentPagePoint
					}

					newPoint = this.editor.getPointInShapeSpace(shape, pagePoint).toFixed().toJson()
				}

				// If the previous segment is a one point free shape and is the first segment of the line,
				// then the user just did a click-and-immediately-press-shift to create a new straight line
				// without continuing the previous line. In this case, we want to remove the previous segment.

				this.currentLineLength += Vec.Dist(newSegment.points[0], newPoint)

				newSegments[newSegments.length - 1] = {
					...newSegment,
					type: 'straight',
					points: [newSegment.points[0], newPoint],
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
				const newSegments = segments.slice()
				const newSegment = newSegments[newSegments.length - 1]
				const newPoints = [...newSegment.points]

				if (newPoints.length && this.mergeNextPoint) {
					const lastPoint = newPoints[newPoints.length - 1]
					const mergedPoint: VecModel = {
						x: newPoint.x,
						y: newPoint.y,
					}
					// For pressure, use the maximum of existing and new pressure (if either exists)
					if (lastPoint.z !== undefined || newPoint.z !== undefined) {
						mergedPoint.z = Math.max(lastPoint.z || 0, newPoint.z || 0)
					}
					newPoints[newPoints.length - 1] = mergedPoint
					// Note: we could recompute the line length here, but it's not really necessary
					// this.currentLineLength = this.getLineLength(newSegments)
				} else {
					this.currentLineLength += Vec.Dist(newPoints[newPoints.length - 1], newPoint)
					newPoints.push(newPoint)
				}

				newSegments[newSegments.length - 1] = {
					...newSegment,
					points: newPoints,
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
				if (newPoints.length > this.util.options.maxPointsPerShape) {
					this.editor.updateShapes([{ id, type: this.shapeType, props: { isComplete: true } }])

					const newShapeId = createShapeId()

					const props = this.editor.getShape<DrawableShape>(id)!.props

					if (!this.editor.canCreateShapes([newShapeId])) return this.cancel()
					// Create initial point for new shape
					const initialPoint: VecModel = { x: 0, y: 0 }
					if (pressure !== undefined) {
						initialPoint.z = pressure
					}
					
					this.editor.createShape<DrawableShape>({
						id: newShapeId,
						type: this.shapeType,
						x: toFixed(inputs.currentPagePoint.x),
						y: toFixed(inputs.currentPagePoint.y),
						props: {
							isPen: this.isPenOrStylus,
							scale: props.scale,
							segments: [
								{
									type: 'free',
									points: [initialPoint],
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
					this.lastRecordedPoint = inputs.currentPagePoint.clone()
					this.currentLineLength = 0
				}

				break
			}
		}
	}

	private getLineLength(segments: TLDrawShapeSegment[]) {
		let length = 0

		for (const segment of segments) {
			for (let i = 0; i < segment.points.length - 1; i++) {
				const A = segment.points[i]
				const B = segment.points[i + 1]
				length += Vec.Dist2(B, A)
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
		if (this.editor.inputs.isDragging) {
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
