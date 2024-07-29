import {
	StateNode,
	TLPointerEventInfo,
	TLShapeId,
	TLTextShape,
	Vec,
	createShapeId,
	isShapeId,
} from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	shape?: TLTextShape

	markId = ''

	override onExit() {
		this.editor.setHintingShapes([])
	}

	override onPointerMove(info: TLPointerEventInfo) {
		// Don't create a fixed width shape unless the the drag is a little larger,
		// otherwise you get a vertical column of single characters if you accidentally
		// drag a bit unintentionally.
		const { editor } = this
		const { isPointing, originPagePoint, currentPagePoint } = editor.inputs
		if (
			isPointing &&
			Math.abs(originPagePoint.x - currentPagePoint.x) ** 2 >
				((editor.getInstanceState().isCoarsePointer
					? editor.options.coarseDragDistanceSquared
					: editor.options.dragDistanceSquared) *
					2) / // double the necessary drag distance for text shapes
					editor.getZoomLevel()
		) {
			const id = createShapeId()
			this.markId = this.editor.markHistoryStoppingPoint(`creating_text:${id}`)

			const shape = this.createTextShape(id, originPagePoint, false)
			if (!shape) {
				this.cancel()
				return
			}

			// Now save the fresh reference
			this.shape = editor.getShape(shape)

			editor.select(id)

			editor.setCurrentTool('select.resizing', {
				...info,
				target: 'selection',
				handle: 'right',
				isCreating: true,
				creatingMarkId: this.markId,
				creationCursorOffset: { x: 18, y: 1 },
				onInteractionEnd: 'text',
				onCreate: () => {
					editor.setEditingShape(shape.id)
					editor.setCurrentTool('select.editing_shape')
				},
			})
		}
	}

	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.cancel()
	}

	override onCancel() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	private complete() {
		this.editor.markHistoryStoppingPoint('creating text shape')
		const id = createShapeId()
		const { currentPagePoint } = this.editor.inputs
		const shape = this.createTextShape(id, currentPagePoint, true)
		if (!shape) return

		this.editor.select(id)
		this.editor.setEditingShape(id)
		this.editor.setCurrentTool('select')
		this.editor.root.getCurrent()?.transition('editing_shape')
	}

	private cancel() {
		this.parent.transition('idle')
		this.editor.bailToMark(this.markId)
	}

	private createTextShape(id: TLShapeId, point: Vec, autoSize: boolean) {
		this.editor.createShape<TLTextShape>({
			id,
			type: 'text',
			x: point.x,
			y: point.y,
			props: {
				text: '',
				autoSize,
				w: 20,
				scale: this.editor.user.getIsDynamicResizeMode() ? 1 / this.editor.getZoomLevel() : 1,
			},
		})

		const shape = this.editor.getShape<TLTextShape>(id)
		if (!shape) {
			this.cancel()
			return
		}

		const bounds = this.editor.getShapePageBounds(shape)!

		const delta = new Vec()

		if (autoSize) {
			switch (shape.props.textAlign) {
				case 'start': {
					delta.x = 0
					break
				}
				case 'middle': {
					delta.x = -bounds.width / 2
					break
				}
				case 'end': {
					delta.x = -bounds.width
					break
				}
			}
		} else {
			delta.x = 0
		}

		delta.y = -bounds.height / 2

		if (isShapeId(shape.parentId)) {
			const transform = this.editor.getShapeParentTransform(shape)
			delta.rot(-transform.rotation())
		}

		this.editor.updateShape({
			...shape,
			x: shape.x + delta.x,
			y: shape.y + delta.y,
		})

		return shape
	}
}
