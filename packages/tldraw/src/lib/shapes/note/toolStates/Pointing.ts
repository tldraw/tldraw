import {
	Editor,
	StateNode,
	TLEventHandlers,
	TLInterruptEvent,
	TLNoteShape,
	TLPointerEventInfo,
	TLShapeId,
	Vec,
	createShapeId,
} from '@tldraw/editor'
import { INITIAL_NOTE_SIZE } from '../NoteShapeUtil'

export class Pointing extends StateNode {
	static override id = 'pointing'

	dragged = false

	info = {} as TLPointerEventInfo

	wasFocusedOnEnter = false

	markId = ''

	shape = {} as TLNoteShape
	shapes = [] as TLNoteShape[]
	startingPoint = {} as Vec

	override onEnter = () => {
		this.wasFocusedOnEnter = !this.editor.getIsMenuOpen()

		if (this.wasFocusedOnEnter) {
			const id = createShapeId()
			this.markId = `creating:${id}`
			this.editor.mark(this.markId)
			this.shape = createSticky(this.editor, id)
			this.shapes = [this.shape]
		}

		this.startingPoint = this.editor.inputs.currentPagePoint.clone()
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
			if (info.shiftKey) {
				const distance =
					Math.abs(this.startingPoint.dist(this.editor.inputs.currentPagePoint)) +
					INITIAL_NOTE_SIZE * 1.1
				const numberOfNotesToCreate = Math.max(1, Math.floor(distance / (INITIAL_NOTE_SIZE / 0.9)))
				const prevNumberOfNotesToCreate = this.shapes.length
				if (numberOfNotesToCreate > prevNumberOfNotesToCreate) {
					const newShapes = new Array(numberOfNotesToCreate - prevNumberOfNotesToCreate).fill(
						createSticky(this.editor, undefined /* id */, this.editor.inputs.currentPagePoint)
					)
					this.shapes = this.shapes.concat(newShapes)
					this.shape = this.shapes[this.shapes.length - 1]
				} else if (numberOfNotesToCreate < prevNumberOfNotesToCreate) {
					const shapesToDelete = this.shapes.slice(numberOfNotesToCreate)
					this.editor.deleteShapes(shapesToDelete.map((s) => s.id))
					this.shapes = this.shapes.slice(0, numberOfNotesToCreate)
					this.shape = this.shapes[this.shapes.length - 1]
				}
			} else {
				if (!this.wasFocusedOnEnter) {
					this.shape = createSticky(this.editor, createShapeId())
				}

				this.editor.setCurrentTool('select.translating', {
					...info,
					target: 'shape',
					shape: this.shape,
					onInteractionEnd: 'note',
					isCreating: true,
					onCreate: () => {
						this.editor.setEditingShape(this.shape.id)
						this.editor.setCurrentTool('select.editing_shape')
					},
				})
			}
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

		this.shapes = []
	}

	private cancel() {
		this.shapes = []
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle', this.info)
	}
}

export function createSticky(editor: Editor, id?: TLShapeId, creationPoint?: Vec) {
	const {
		inputs: { originPagePoint },
	} = editor

	creationPoint = creationPoint || originPagePoint
	id = id || createShapeId()

	editor
		.createShapes([
			{
				id,
				type: 'note',
				x: creationPoint.x,
				y: creationPoint.y,
			},
		])
		.select(id)

	const shape = editor.getShape<TLNoteShape>(id)!
	const bounds = editor.getShapeGeometry(shape).bounds

	// Center the text around the created point
	editor.updateShapes([
		{
			id,
			type: 'note',
			x: shape.x - bounds.width / 2,
			y: shape.y - bounds.height / 2,
		},
	])

	return editor.getShape<TLNoteShape>(id)!
}
