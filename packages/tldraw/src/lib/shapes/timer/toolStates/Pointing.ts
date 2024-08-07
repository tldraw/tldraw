import { StateNode, TLNoteShape, TLPointerEventInfo, createShapeId } from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	dragged = false

	info = {} as TLPointerEventInfo

	wasFocusedOnEnter = false

	markId = ''

	shape = {} as TLNoteShape

	override onEnter() {
		const { editor } = this

		this.wasFocusedOnEnter = !editor.getIsMenuOpen()

		if (this.wasFocusedOnEnter) {
			const id = createShapeId()
			this.markId = editor.markHistoryStoppingPoint(`creating_timer:${id}`)

			// Check for note pits; if the pointer is close to one, place the note centered on the pit
			const center = this.editor.inputs.originPagePoint.clone()
			editor
				.createShape({
					id,
					type: 'timer',
					x: center.x,
					y: center.y,
					props: {
						color: 'black',
					},
				})
				.select(id)
		}
	}

	override onPointerUp() {
		this.complete()
	}

	override onInterrupt() {
		this.cancel()
	}

	override onComplete() {
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	private complete() {
		if (this.wasFocusedOnEnter) {
			if (this.editor.getInstanceState().isToolLocked) {
				this.parent.transition('idle')
			} else {
				this.editor.setCurrentTool('timer.idle')
			}
		}
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle', this.info)
	}
}
