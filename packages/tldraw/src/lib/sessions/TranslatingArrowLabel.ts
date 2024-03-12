import {
	Arc2d,
	Geometry2d,
	Group2d,
	Session,
	TLArrowShape,
	Vec,
	getPointInArcT,
} from '@tldraw/editor'

export class TranslatingArrowLabelSession extends Session<{
	shape: TLArrowShape
}> {
	readonly id = 'translating arrow label'

	markId = 'transalting arrow label'

	didTranslate = false

	startTime = Date.now()

	labelDragOffset = new Vec(0, 0)

	override onStart() {
		const { editor } = this
		const { shape } = this.info

		const currentShape = editor.getShape<TLArrowShape>(shape.id)
		if (!currentShape) {
			this.cancel()
			return
		}

		const geometry = editor.getShapeGeometry<Group2d>(shape)
		const labelGeometry = geometry.children[1]
		if (!labelGeometry) {
			throw Error(`Expected to find an arrow label geometry for shape: ${shape.id}`)
		}

		const { originPagePoint } = editor.inputs
		const pointInShapeSpace = editor.getPointInShapeSpace(shape, originPagePoint)
		this.labelDragOffset = Vec.Sub(labelGeometry.center, pointInShapeSpace)

		editor.setSelectedShapes([shape])
	}

	override onUpdate() {
		const { editor } = this
		const { shape } = this.info

		// The shape must still exist
		const currentShape = editor.getShape<TLArrowShape>(shape.id)
		if (!currentShape) {
			this.cancel()
			return
		}

		// Once the user stop pointing, we're done here
		if (!editor.inputs.isPointing) {
			this.complete()
			return
		}

		// If we're pointing but not dragging yet, no action is needed
		if (!editor.inputs.isDragging) {
			return
		}

		// We're dragging! Let's update the label

		// if this is the first time since the drag started, then update a few things
		if (!this.didTranslate) {
			editor.mark(this.markId)
			editor.setCursor({ type: 'grabbing', rotation: 0 })
			this.didTranslate = true
		}

		const info = editor.getArrowInfo(shape)!

		const groupGeometry = editor.getShapeGeometry<Group2d>(shape)
		const bodyGeometry = groupGeometry.children[0] as Geometry2d
		const pointInShapeSpace = editor.getPointInShapeSpace(shape, editor.inputs.currentPagePoint)
		const nearestPoint = bodyGeometry.nearestPoint(Vec.Add(pointInShapeSpace, this.labelDragOffset))

		let nextLabelPosition: number

		if (info.isStraight) {
			// straight arrows
			const lineLength = Vec.Dist(info.start.point, info.end.point)
			const segmentLength = Vec.Dist(info.end.point, nearestPoint)
			nextLabelPosition = 1 - segmentLength / lineLength
		} else {
			// curved arrows
			const { _center, measure, angleEnd, angleStart } = groupGeometry.children[0] as Arc2d
			nextLabelPosition = getPointInArcT(measure, angleStart, angleEnd, _center.angle(nearestPoint))
		}

		if (isNaN(nextLabelPosition)) {
			nextLabelPosition = 0.5
		}

		editor.updateShape<TLArrowShape>(
			{ id: shape.id, type: shape.type, props: { labelPosition: nextLabelPosition } },
			{ squashing: true }
		)
	}

	override onCancel() {
		const { editor } = this
		if (this.didTranslate) {
			editor.bailToMark(this.markId)
		}
		return
	}

	override onEnd() {
		const { editor } = this
		editor.setCursor({ type: 'default', rotation: 0 })
	}
}
