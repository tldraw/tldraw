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

	enterTime = 0
	override onEnter(): void {
		this.enterTime = Date.now()
	}

	override onExit() {
		this.editor.setHintingShapes([])
	}

	override onPointerMove(info: TLPointerEventInfo) {
		const { editor } = this
		if (!editor.inputs.isPointing) return

		// Only create a fixed width shape if the drag duration is long enough.
		// Prevents accidentally creating a vertical column of single characters if you click while the mouse is moving.
		const timeSinceEnter = Date.now() - this.enterTime
		if (timeSinceEnter < 150) return

		// Only create a fixed width shape if the drag distance is long enough.
		// Prevents accidentally creating a tiny text shape during longer presses.
		const minDragX = editor.getInstanceState().isCoarsePointer
			? editor.options.coarseDragDistanceSquared
			: editor.options.dragDistanceSquared

		const currentDragX =
			Math.abs(editor.inputs.originScreenPoint.x - editor.inputs.currentScreenPoint.x) ** 2

		if (currentDragX > minDragX) {
			const id = createShapeId()
			this.markId = this.editor.markHistoryStoppingPoint(`creating_text:${id}`)

			const shape = this.createTextShape(id, editor.inputs.originPagePoint, false)
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
