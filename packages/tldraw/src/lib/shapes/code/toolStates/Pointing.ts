import {
	Editor,
	StateNode,
	TLEventHandlers,
	TLInterruptEvent,
	TLCodeShape,
	TLPointerEventInfo,
	TLShapeId,
	Vec,
	createShapeId,
} from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	dragged = false

	info = {} as TLPointerEventInfo

	wasFocusedOnEnter = false

	markId = ''

	shape = {} as TLCodeShape

	override onEnter = () => {
		const { editor } = this

		this.wasFocusedOnEnter = !editor.getIsMenuOpen()

		if (this.wasFocusedOnEnter) {
			const id = createShapeId()
			this.markId = `creating:${id}`
			editor.mark(this.markId)

			const center = this.editor.inputs.originPagePoint.clone()
			this.shape = createCodeBlock(this.editor, id, center)
		}
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
			if (!this.wasFocusedOnEnter) {
				const id = createShapeId()
				const center = this.editor.inputs.originPagePoint.clone()
				this.shape = createCodeBlock(this.editor, id, center)
			}

			this.editor.setCurrentTool('select.translating', {
				...info,
				target: 'shape',
				shape: this.shape,
				onInteractionEnd: 'code',
				isCreating: true,
				onCreate: () => {
					this.editor.setEditingShape(this.shape.id)
					this.editor.setCurrentTool('select.editing_shape')
				},
			})
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onInterrupt: TLInterruptEvent = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	private complete() {
		if (this.wasFocusedOnEnter) {
			if (this.editor.getInstanceState().isToolLocked) {
				this.parent.transition('idle')
			} else {
				this.editor.setEditingShape(this.shape.id)
				this.editor.setCurrentTool('select.editing_shape', {
					...this.info,
					target: 'shape',
					shape: this.shape,
				})
			}
		}
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle', this.info)
	}
}

export function createCodeBlock(editor: Editor, id: TLShapeId, center: Vec) {
	editor
		.createShape({
			id,
			type: 'code',
			x: center.x,
			y: center.y,
		})
		.select(id)

	const shape = editor.getShape<TLCodeShape>(id)!
	const bounds = editor.getShapeGeometry(shape).bounds

	// Center the text around the created point
	editor.updateShapes([
		{
			id,
			type: 'code',
			x: shape.x - bounds.width / 2,
			y: shape.y - bounds.height / 2,
		},
	])

	return editor.getShape<TLCodeShape>(id)!
}
