import {
	Interaction,
	Mat,
	ShapeUtil,
	TLDefaultSizeStyle,
	TLDrawShape,
	TLDrawShapeSegment,
	TLHighlightShape,
	TLShapePartial,
	Vec,
	createShapeId,
	last,
	uniqueId,
} from '@tldraw/editor'
import { STROKE_SIZES } from '../shapes/shared/default-shape-constants'

// todo:
// - move strokesize to info
// - move interrupt logic to drawing tool

type DrawableShape = TLDrawShape | TLHighlightShape

export class DrawingInteraction extends Interaction<{
	shapeType: DrawableShape['type']
	isPen: boolean
	initialPressure: number
}> {
	id = 'drawing'
	markId = ''
	didDrag = false
	isPen = false
	util = {} as ShapeUtil<DrawableShape>
	segmentMode = 'free' as 'free' | 'straight' | 'starting_straight' | 'starting_free'
	didJustShiftClickToExtendPreviousShapeLine = false
	pagePointWhereCurrentSegmentChanged = {} as Vec
	pagePointWhereNextSegmentChanged = null as Vec | null
	lastRecordedPoint = {} as Vec
	mergeNextPoint = false
	currentLineLength = 0
	canDraw = false
	initialShape = {} as DrawableShape

	// Used to track whether we have changes that have not yet been pushed to the Editor.
	isDirty = false
	// The changes that have not yet been pushed to the Editor.
	shapePartial: TLShapePartial<DrawableShape> | null = null

	override onStart() {
		this.isPen = this.info.isPen
		this.canDraw = !this.editor.getIsMenuOpen()
		this.lastRecordedPoint = this.editor.inputs.currentPagePoint.clone()
		this.shapePartial = null
		this.isDirty = false
		if (this.canDraw) {
			this.startShape()
		}
	}

	override onUpdate() {
		const { editor } = this

		if (!editor.inputs.isPointing) {
			this.complete()
			return
		}

		if (editor.inputs.isDragging) {
			if (!this.didDrag) {
				this.didDrag = true
			}
		} else {
			// noop until dragging
			return
		}
	}

	override onComplete() {
		// If we weren't focused when the drawing shape started, and if
		// we haven't dragged far enough to start dragging, then don't do
		// anything here. Most likely we clicked back into the canvas from
		// a menu or other UI element.
		if (!this.canDraw) {
			this.cancel()
			return
		}

		const { initialShape } = this
		if (!initialShape) return
		this.editor.updateShapes([
			{ id: initialShape.id, type: initialShape.type, props: { isComplete: true } },
		])
	}

	override onCancel() {
		this.editor.bailToMark(this.markId)
	}

	override onEnd() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	private startShape() {
		const {
			inputs: { originPagePoint, isPen },
		} = this.editor

		this.markId = 'draw start ' + uniqueId()
		this.editor.mark(this.markId)

		this.isPen = isPen

		const pressure = this.isPen ? this.info.initialPressure * 1.25 : 0.5

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

				const pressure = this.isPen ? this.info.initialPressure * 1.25 : 0.5

				const newSegment: TLDrawShapeSegment = {
					type: this.segmentMode,
					points: [
						{
							x: prevPoint.x,
							y: prevPoint.y,
							z: +pressure.toFixed(2),
						},
						{
							x,
							y,
							z: +pressure.toFixed(2),
						},
					],
				}

				// Convert prevPoint to page space
				const prevPointPageSpace = Mat.applyToPoint(
					this.editor.getShapePageTransform(shape.id)!,
					prevPoint
				)
				this.pagePointWhereCurrentSegmentChanged = prevPointPageSpace
				this.pagePointWhereNextSegmentChanged = null
				const segments = [...shape.props.segments, newSegment]

				this.currentLineLength = this.getLineLength(segments)

				const shapePartial: TLShapePartial<DrawableShape> = {
					id: shape.id,
					type: this.info.shapeType,
					props: {
						segments,
					},
				}

				if (this.canClose()) {
					;(shapePartial as TLShapePartial<TLDrawShape>).props!.isClosed = this.getIsClosed(
						segments,
						shape.props.size
					)
				}

				this.editor.updateShapes<TLDrawShape | TLHighlightShape>([shapePartial])

				return
			}
		}

		// Create a new shape

		this.pagePointWhereCurrentSegmentChanged = originPagePoint.clone()
		const id = createShapeId()

		this.editor.createShapes<DrawableShape>([
			{
				id,
				type: this.info.shapeType,
				x: originPagePoint.x,
				y: originPagePoint.y,
				props: {
					isPen: this.isPen,
					segments: [
						{
							type: this.segmentMode,
							points: [
								{
									x: 0,
									y: 0,
									z: +pressure.toFixed(2),
								},
							],
						},
					],
				},
			},
		])
		this.currentLineLength = 0
		this.initialShape = this.editor.getShape<DrawableShape>(id)!
	}

	private canClose() {
		return this.info.shapeType !== 'highlight'
	}

	private getIsClosed(segments: TLDrawShapeSegment[], size: TLDefaultSizeStyle) {
		if (!this.canClose()) return false

		const strokeWidth = STROKE_SIZES[size]
		const firstPoint = segments[0].points[0]
		const lastSegment = segments[segments.length - 1]
		const lastPoint = lastSegment.points[lastSegment.points.length - 1]

		return (
			firstPoint !== lastPoint &&
			this.currentLineLength > strokeWidth * 4 &&
			Vec.Dist(firstPoint, lastPoint) < strokeWidth * 2
		)
	}

	private getLineLength(segments: TLDrawShapeSegment[]) {
		let length = 0

		for (const segment of segments) {
			for (let i = 0; i < segment.points.length - 1; i++) {
				const A = segment.points[i]
				const B = segment.points[i + 1]
				length += Vec.Sub(B, A).len2()
			}
		}

		return Math.sqrt(length)
	}
}
