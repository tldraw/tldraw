import {
	Geometry2d,
	Group2d,
	StateNode,
	TLArrowShape,
	TLEventHandlers,
	TLPointerEventInfo,
	TLShapeId,
	Vec,
	clockwiseAngleDist,
	counterClockwiseAngleDist,
} from '@tldraw/editor'

export class PointingArrowLabel extends StateNode {
	static override id = 'pointing_arrow_label'

	shapeId = '' as TLShapeId
	markId = ''

	private info = {} as TLPointerEventInfo & {
		shape: TLArrowShape
		onInteractionEnd?: string
		isCreating: boolean
	}

	private updateCursor() {
		this.editor.updateInstanceState({
			cursor: {
				type: 'grabbing',
				rotation: 0,
			},
		})
	}

	override onEnter = (
		info: TLPointerEventInfo & {
			shape: TLArrowShape
			onInteractionEnd?: string
			isCreating: boolean
		}
	) => {
		const { shape } = info
		this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		this.info = info
		this.shapeId = shape.id
		this.updateCursor()

		const geometry = this.editor.getShapeGeometry<Group2d>(shape)
		const labelGeometry = geometry.children[1]
		if (!labelGeometry) {
			throw Error(`Expected to find an arrow label geometry for shape: ${shape.id}`)
		}
		const { currentPagePoint } = this.editor.inputs
		const pointInShapeSpace = this.editor.getPointInShapeSpace(shape, currentPagePoint)

		this._labelDragOffset = Vec.Sub(labelGeometry.center, pointInShapeSpace)

		this.markId = 'label-drag start'
		this.editor.mark(this.markId)
		this.editor.setSelectedShapes([this.shapeId])
	}

	override onExit = () => {
		this.parent.setCurrentToolIdMask(undefined)

		this.editor.updateInstanceState(
			{ cursor: { type: 'default', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	private _labelDragOffset = new Vec(0, 0)

	override onPointerMove = () => {
		const { isDragging } = this.editor.inputs
		if (!isDragging) return

		const shape = this.editor.getShape<TLArrowShape>(this.shapeId)
		if (!shape) return

		const info = this.editor.getArrowInfo(shape)!

		const geometry = this.editor.getShapeGeometry<Group2d>(shape)
		const lineGeometry = geometry.children[0] as Geometry2d
		const pointInShapeSpace = this.editor.getPointInShapeSpace(
			shape,
			this.editor.inputs.currentPagePoint
		)
		const nearestPoint = lineGeometry.nearestPoint(
			Vec.Add(pointInShapeSpace, this._labelDragOffset)
		)

		let nextLabelPosition
		if (info.isStraight) {
			// straight arrows
			const lineLength = Vec.Dist(info.start.point, info.end.point)
			const segmentLength = Vec.Dist(info.end.point, nearestPoint)
			nextLabelPosition = 1 - segmentLength / lineLength
		} else {
			// curved arrows
			const isClockwise = shape.props.bend < 0
			const distFn = isClockwise ? clockwiseAngleDist : counterClockwiseAngleDist

			// fix me
			const angleCenterNearestPoint = Vec.Angle(info.handleArc.center, nearestPoint)
			const angleCenterStart = Vec.Angle(info.handleArc.center, info.start.point)
			const angleCenterEnd = Vec.Angle(info.handleArc.center, info.end.point)
			const arcLength = distFn(angleCenterStart, angleCenterEnd)
			const segmentLength = distFn(angleCenterNearestPoint, angleCenterEnd)
			nextLabelPosition = 1 - segmentLength / arcLength
		}

		this.editor.updateShape<TLArrowShape>(
			{ id: shape.id, type: shape.type, props: { labelPosition: nextLabelPosition } },
			{ squashing: true }
		)
	}

	override onPointerUp = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.cancel()
	}

	override onInterrupt = () => {
		this.cancel()
	}

	private complete() {
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, {})
		} else {
			this.parent.transition('idle')
		}
	}

	private cancel() {
		this.editor.bailToMark(this.markId)

		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd, {})
		} else {
			this.parent.transition('idle')
		}
	}
}
