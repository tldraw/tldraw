import { StateNode, TLEventHandlers, TLTextShape, createShapeId } from '@tldraw/editor'

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

			this.editor.createShapes<TLTextShape>([
				{
					id,
					type: 'text',
					x: originPagePoint.x,
					y: originPagePoint.y,
					props: {
						text: '',
						autoSize: false,
						w: 20,
					},
				},
			])

			this.editor.select(id)

			this.shape = this.editor.getShape(id)
			if (!this.shape) return

			this.editor.setCurrentTool('select.resizing', {
				...info,
				target: 'selection',
				handle: 'right',
				isCreating: true,
				creationCursorOffset: { x: 1, y: 1 },
				editAfterComplete: true,
				onInteractionEnd: 'text',
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
		const { x, y } = this.editor.inputs.currentPagePoint
		this.editor
			.createShapes([
				{
					id,
					type: 'text',
					x,
					y,
					props: {
						text: '',
						autoSize: true,
					},
				},
			])
			.select(id)

		this.editor.setEditingShape(id)
		this.editor.setCurrentTool('select')
		this.editor.root.current.value?.transition('editing_shape', {})
	}

	private cancel() {
		this.parent.transition('idle', {})
		this.editor.bailToMark(this.markId)
	}
}
