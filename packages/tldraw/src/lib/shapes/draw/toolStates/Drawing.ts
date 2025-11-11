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

	/**
	 * Converts an array of VecModel points to the delta format (firstPoint + deltas array)
	 */
	private pointsToSegment(points: VecModel[], isPen: boolean): TLDrawShapeSegment {
		if (points.length === 0) {
			throw Error('Cannot create segment from empty points array')
		}

		const firstPoint = points[0]
		const deltas: number[] = []

		if (isPen) {
			let px = firstPoint.x
			let py = firstPoint.y
			let pz = firstPoint.z ?? 0.5

			for (let i = 1; i < points.length; i++) {
				const point = points[i]
				const dx = point.x - px
				const dy = point.y - py
				const dz = (point.z ?? 0.5) - pz
				deltas.push(Math.round(dx * 10))
				deltas.push(Math.round(dy * 10))
				deltas.push(Math.round(dz * 10))
				px += dx
				py += dy
				pz += dz
			}
		} else {
			let px = firstPoint.x
			let py = firstPoint.y

			for (let i = 1; i < points.length; i++) {
				const point = points[i]
				const dx = point.x - px
				const dy = point.y - py
				deltas.push(Math.round(dx * 10))
				deltas.push(Math.round(dy * 10))
				px += dx
				py += dy
			}
		}

		return {
			type: 'free',
			firstPoint: isPen
				? { x: firstPoint.x, y: firstPoint.y, z: firstPoint.z ?? 0.5 }
				: { x: firstPoint.x, y: firstPoint.y },
			points: deltas,
		}
	}

	/**
	 * Creates a straight segment from two points
	 */
	private createStraightSegment(
		firstPoint: VecModel,
		secondPoint: VecModel,
		isPen: boolean
	): TLDrawShapeSegment {
		const dx = secondPoint.x - firstPoint.x
		const dy = secondPoint.y - firstPoint.y
		const deltas: number[] = [Math.round(dx * 10), Math.round(dy * 10)]

		if (isPen) {
			const dz = (secondPoint.z ?? 0.5) - (firstPoint.z ?? 0.5)
			deltas.push(Math.round(dz * 10))
		}

		return {
			type: 'straight',
			firstPoint: isPen
				? { x: firstPoint.x, y: firstPoint.y, z: firstPoint.z ?? 0.5 }
				: { x: firstPoint.x, y: firstPoint.y },
			points: deltas,
		}
	}

	/**
	 * Gets the last point from a segment (reconstructs it from firstPoint + deltas)
	 */
	private getLastPointFromSegment(segment: TLDrawShapeSegment): VecModel {
		const isPen = segment.firstPoint.z !== undefined

		if (segment.points.length === 0) {
			return segment.firstPoint
		}

		if (isPen) {
			let px = segment.firstPoint.x
			let py = segment.firstPoint.y
			let pz = segment.firstPoint.z ?? 0.5

			for (let i = 0; i < segment.points.length; i += 3) {
				const dx = segment.points[i] / 10
				const dy = segment.points[i + 1] / 10
				const dz = segment.points[i + 2] / 10
				px += dx
				py += dy
				pz += dz
			}

			return { x: px, y: py, z: pz }
		} else {
			let px = segment.firstPoint.x
			let py = segment.firstPoint.y

			for (let i = 0; i < segment.points.length; i += 2) {
				const dx = segment.points[i] / 10
				const dy = segment.points[i + 1] / 10
				px += dx
				py += dy
			}

			return { x: px, y: py }
		}
	}

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
		const firstPoint = segments[0].firstPoint
		const lastSegment = segments[segments.length - 1]
		const lastPoint = this.getLastPointFromSegment(lastSegment)

		return (
			(firstPoint.x !== lastPoint.x ||
				firstPoint.y !== lastPoint.y ||
				(firstPoint.z !== undefined &&
					lastPoint.z !== undefined &&
					firstPoint.z !== lastPoint.z)) &&
			this.currentLineLength > strokeWidth * 4 * scale &&
			Vec.DistMin(Vec.Cast(firstPoint), Vec.Cast(lastPoint), strokeWidth * 2 * scale)
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

		const pressure = this.isPenOrStylus ? z * 1.25 : 0.5

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
				const prevPoint = this.getLastPointFromSegment(prevSegment)

				const { x, y } = this.editor.getPointInShapeSpace(shape, originPagePoint).toFixed()

				const newPoint: VecModel = {
					x,
					y,
					z: this.isPenOrStylus ? +pressure.toFixed(2) : undefined,
				}

				const newSegment = this.createStraightSegment(prevPoint, newPoint, this.isPenOrStylus)

				// Convert prevPoint to page space
				const prevPointPageSpace = Mat.applyToPoint(
					this.editor.getShapePageTransform(shape.id)!,
					Vec.Cast(prevPoint)
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

		// Allow this to trigger the max shapes reached alert
		const firstPoint: VecModel = {
			x: 0,
			y: 0,
			z: this.isPenOrStylus ? +pressure.toFixed(2) : undefined,
		}

		this.editor.createShape<DrawableShape>({
			id,
			type: this.shapeType,
			x: originPagePoint.x,
			y: originPagePoint.y,
			props: {
				isPen: this.isPenOrStylus,
				scale: this.editor.user.getIsDynamicResizeMode() ? 1 / this.editor.getZoomLevel() : 1,
				zoom: this.editor.getZoomLevel(),
				segments: [
					{
						type: this.segmentMode,
						firstPoint: this.isPenOrStylus
							? { x: firstPoint.x, y: firstPoint.y, z: firstPoint.z! }
							: { x: firstPoint.x, y: firstPoint.y },
						points: [],
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
		const pressure = this.isPenOrStylus ? +(inputs.currentPagePoint.z! * 1.25).toFixed(2) : 0.5
		const newPoint = { x, y, z: pressure }

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

					const prevLastPoint = this.getLastPointFromSegment(prevSegment)

					let newSegment: TLDrawShapeSegment

					const newLastPoint = this.editor
						.getPointInShapeSpace(shape, this.pagePointWhereCurrentSegmentChanged)
						.toFixed()
						.toJson()

					if (prevSegment.type === 'straight') {
						this.currentLineLength += Vec.Dist(Vec.Cast(prevLastPoint), Vec.Cast(newLastPoint))

						newSegment = this.createStraightSegment(prevLastPoint, newLastPoint, this.isPenOrStylus)

						const transform = this.editor.getShapePageTransform(shape)!

						this.pagePointWhereCurrentSegmentChanged = Mat.applyToPoint(
							transform,
							Vec.Cast(prevLastPoint)
						)
					} else {
						const newPointModel: VecModel = {
							...newPoint,
							z: this.isPenOrStylus ? newPoint.z : undefined,
						}
						newSegment = this.createStraightSegment(newLastPoint, newPointModel, this.isPenOrStylus)
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
					const prevPoint = this.getLastPointFromSegment(prevStraightSegment)

					// Create the new free segment and interpolate the points between where the last line
					// ended and where the pointer is now
					const interpolatedPoints = Vec.PointsBetween(
						Vec.Cast(prevPoint),
						Vec.Cast(newPoint),
						6
					).map((p) => ({
						x: toFixed(p.x),
						y: toFixed(p.y),
						z: this.isPenOrStylus ? toFixed(p.z) : undefined,
					}))
					const newFreeSegment = this.pointsToSegment(interpolatedPoints, this.isPenOrStylus)
					newFreeSegment.type = 'free'

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

							const first = segment.firstPoint
							const lastPoint = this.getLastPointFromSegment(segment)

							// Snap to the nearest point on the segment, if it's closer than the previous snapped point
							const nearestPointOnSegment = Vec.NearestPointOnLineSegment(
								Vec.Cast(first),
								Vec.Cast(lastPoint),
								Vec.Cast(newPoint)
							)

							if (Vec.DistMin(nearestPointOnSegment, Vec.Cast(newPoint), minDistance)) {
								nearestPoint = nearestPointOnSegment.toFixed().toJson()
								minDistance = Vec.Dist(nearestPointOnSegment, Vec.Cast(newPoint))
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
					const first = snapSegment.firstPoint
					const lastPoint = this.getLastPointFromSegment(snapSegment)

					const A = Mat.applyToPoint(transform, Vec.Cast(first))

					const B = Mat.applyToPoint(transform, Vec.Cast(lastPoint))

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

				const segmentFirstPoint = newSegment.firstPoint
				const newPointModel: VecModel = {
					...newPoint,
					z: this.isPenOrStylus ? newPoint.z : undefined,
				}

				this.currentLineLength += Vec.Dist(Vec.Cast(segmentFirstPoint), Vec.Cast(newPoint))

				newSegments[newSegments.length - 1] = this.createStraightSegment(
					segmentFirstPoint,
					newPointModel,
					this.isPenOrStylus
				)

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
				const currentSegment = newSegments[newSegments.length - 1]
				const isPen = this.isPenOrStylus

				// Reconstruct current points from segment
				const currentPoints: VecModel[] = [currentSegment.firstPoint]
				if (isPen) {
					let px = currentSegment.firstPoint.x
					let py = currentSegment.firstPoint.y
					let pz = currentSegment.firstPoint.z ?? 0.5

					for (let i = 0; i < currentSegment.points.length; i += 3) {
						const dx = currentSegment.points[i] / 10
						const dy = currentSegment.points[i + 1] / 10
						const dz = currentSegment.points[i + 2] / 10
						px += dx
						py += dy
						pz += dz
						currentPoints.push({ x: px, y: py, z: pz })
					}
				} else {
					let px = currentSegment.firstPoint.x
					let py = currentSegment.firstPoint.y

					for (let i = 0; i < currentSegment.points.length; i += 2) {
						const dx = currentSegment.points[i] / 10
						const dy = currentSegment.points[i + 1] / 10
						px += dx
						py += dy
						currentPoints.push({ x: px, y: py })
					}
				}

				if (currentPoints.length > 0 && this.mergeNextPoint) {
					// Merge with last point
					const lastPoint = currentPoints[currentPoints.length - 1]
					currentPoints[currentPoints.length - 1] = {
						x: newPoint.x,
						y: newPoint.y,
						z: isPen
							? lastPoint.z !== undefined && newPoint.z !== undefined
								? Math.max(lastPoint.z, newPoint.z)
								: newPoint.z
							: undefined,
					}
					// Note: we could recompute the line length here, but it's not really necessary
					// this.currentLineLength = this.getLineLength(newSegments)
				} else {
					// Add new point
					if (currentPoints.length > 0) {
						this.currentLineLength += Vec.Dist(
							Vec.Cast(currentPoints[currentPoints.length - 1]),
							Vec.Cast(newPoint)
						)
					}
					currentPoints.push({
						x: newPoint.x,
						y: newPoint.y,
						z: isPen ? newPoint.z : undefined,
					})
				}

				// Convert back to segment format
				newSegments[newSegments.length - 1] = this.pointsToSegment(currentPoints, isPen)
				newSegments[newSegments.length - 1].type = 'free'

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

				// Set a maximum length for the points array; after maxPointsPerShape points, complete the line.
				if (currentPoints.length > this.util.options.maxPointsPerShape) {
					this.editor.updateShapes([{ id, type: this.shapeType, props: { isComplete: true } }])

					const newShapeId = createShapeId()

					const props = this.editor.getShape<DrawableShape>(id)!.props
					const lastPoint = currentPoints[currentPoints.length - 1]

					if (!this.editor.canCreateShapes([newShapeId])) return this.cancel()

					const newFirstPoint: VecModel = {
						x: 0,
						y: 0,
						z: this.isPenOrStylus ? (lastPoint.z ?? 0.5) : undefined,
					}

					this.editor.createShape<DrawableShape>({
						id: newShapeId,
						type: this.shapeType,
						x: toFixed(inputs.currentPagePoint.x),
						y: toFixed(inputs.currentPagePoint.y),
						props: {
							isPen: this.isPenOrStylus,
							scale: props.scale,
							zoom: props.zoom,
							segments: [
								{
									type: 'free',
									firstPoint: this.isPenOrStylus
										? { x: newFirstPoint.x, y: newFirstPoint.y, z: newFirstPoint.z! }
										: { x: newFirstPoint.x, y: newFirstPoint.y },
									points: [],
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
			const isPen = segment.firstPoint.z !== undefined
			let px = segment.firstPoint.x
			let py = segment.firstPoint.y
			let pz = segment.firstPoint.z ?? 0.5
			let prevPoint = new Vec(px, py, isPen ? pz : undefined)

			if (isPen) {
				for (let i = 0; i < segment.points.length; i += 3) {
					const dx = segment.points[i] / 10
					const dy = segment.points[i + 1] / 10
					const dz = segment.points[i + 2] / 10
					px += dx
					py += dy
					pz += dz
					const currentPoint = new Vec(px, py, pz)
					length += Vec.Dist2(currentPoint, prevPoint)
					prevPoint = currentPoint
				}
			} else {
				for (let i = 0; i < segment.points.length; i += 2) {
					const dx = segment.points[i] / 10
					const dy = segment.points[i + 1] / 10
					px += dx
					py += dy
					const currentPoint = new Vec(px, py)
					length += Vec.Dist2(currentPoint, prevPoint)
					prevPoint = currentPoint
				}
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
