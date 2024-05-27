import {
	StateNode,
	TLEventHandlers,
	TLShapeId,
	TLTextShape,
	Vec,
	createShapeId,
} from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	shape?: TLTextShape

	markId = ''

	override onExit = () => {
		this.editor.setHintingShapes([])
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
			const {
				inputs: { originPagePoint },
			} = this.editor

			const id = createShapeId()

			this.markId = `creating:${id}`
			this.editor.mark(this.markId)

			const shape = this.createTextShape(id, originPagePoint, false)
			if (!shape) return

			this.shape = shape

			this.editor.select(id)

			this.editor.setCurrentTool('select.resizing', {
				...info,
				target: 'selection',
				handle: 'right',
				isCreating: true,
				creationCursorOffset: { x: 18, y: 1 },
				onInteractionEnd: 'text',
				onCreate: () => {
					this.editor.setEditingShape(shape.id)
					this.editor.setCurrentTool('select.editing_shape')
				},
			})
		}
	}

	override onPointerUp = () => {
		this.complete()
	}

	override onComplete = () => {
		this.cancel()
	}

	override onCancel = () => {
		this.cancel()
	}

	override onInterrupt = () => {
		this.cancel()
	}

	private complete() {
		this.editor.mark('creating text shape')
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
		const localPoint = this.editor.getPointInParentSpace(shape, point)

		let x: number
		if (autoSize) {
			switch (shape.props.textAlign) {
				case 'start': {
					x = localPoint.x
					break
				}
				case 'middle': {
					x = localPoint.x - bounds.width / 2
					break
				}
				case 'end': {
					x = localPoint.x - bounds.width
					break
				}
			}
		} else {
			x = shape.x
		}

		this.editor.updateShape({
			...shape,
			x,
			y: localPoint.y - bounds.height / 2,
		})

		return shape
	}
}
