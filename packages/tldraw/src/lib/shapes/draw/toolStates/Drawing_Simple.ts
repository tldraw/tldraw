import {
	StateNode,
	TLDrawShape,
	TLEventHandlers,
	TLHighlightShape,
	TLPointerEventInfo,
	TLShapePartial,
	Vec2d,
	createShapeId,
	structuredClone,
} from '@tldraw/editor'

type DrawableShape = TLDrawShape | TLHighlightShape

export class DrawingSimple extends StateNode {
	static override id = 'drawing-simple'

	info = {} as TLPointerEventInfo

	initialShape = {} as DrawableShape

	override shapeType = 'draw'

	util = this.editor.getShapeUtil(this.shapeType)

	isPen = false

	markId = null as null | string

	interval = -1 as any

	override onEnter = (info: TLPointerEventInfo) => {
		this.markId = null
		this.info = info
		this.editor.addListener('tick', this.updateShapes)
		this.startShape()
	}

	override onExit? = () => {
		this.editor.removeListener('tick', this.updateShapes)
		this.editor.snaps.clear()
	}

	private startShape() {
		const {
			inputs: { originPagePoint },
		} = this.editor

		const id = createShapeId()

		this.editor.createShapes<DrawableShape>([
			{
				id,
				type: 'draw',
				x: originPagePoint.x,
				y: originPagePoint.y,
				props: {
					isPen: this.isPen,
					segments: [
						{
							type: 'free',
							points: [
								{
									x: 0,
									y: 0,
									z: +(0.5).toFixed(2),
								},
							],
						},
					],
				},
			},
		])

		this.initialShape = this.editor.getShape<DrawableShape>(id)!
		this._collectedPoints = [new Vec2d()]
		this._collectedSegments = structuredClone(this.initialShape.props.segments)
	}

	updateShapes = () => {
		this._updateShapes()
	}

	_collectedPoints: Vec2d[] = []
	_collectedSegments: DrawableShape['props']['segments'] = []
	_isDirty = false

	override onPointerMove = () => {
		const {
			initialShape,
			_collectedPoints,
			_collectedSegments,
			editor: { inputs },
		} = this
		const shape = this.editor.getShape<DrawableShape>(initialShape.id)!
		const point = this.editor.getPointInShapeSpace(shape, inputs.currentPagePoint)
		point.z = this.isPen ? +(point.z! * 1.25).toFixed(2) : 0.5

		// Add point to collected points (not used yet)
		_collectedPoints.push(point)

		// Add point to segments
		const segment = _collectedSegments[_collectedSegments.length - 1]
		segment.points.push(point.toFixed().toJson())
		this._isDirty = true
	}

	private _updateShapes = () => {
		if (!this._isDirty) return
		const { initialShape } = this

		const shapePartial: TLShapePartial<DrawableShape> = {
			id: initialShape.id,
			type: 'draw',
			props: {
				segments: structuredClone([...this._collectedSegments]),
			},
		}

		this.editor.updateShapes([shapePartial], { squashing: true })
		this._isDirty = false
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onInterrupt: TLEventHandlers['onInterrupt'] = () => {
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

		this.parent.transition('idle', {})
	}

	cancel() {
		this.parent.transition('idle', this.info)
	}
}
