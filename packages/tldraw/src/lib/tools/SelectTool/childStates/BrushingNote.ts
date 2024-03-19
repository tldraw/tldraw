import {
	Box,
	StateNode,
	TLCancelEvent,
	TLEventHandlers,
	TLInterruptEvent,
	TLKeyboardEvent,
	TLNoteShape,
	TLPointerEventInfo,
	TLShapeId,
	TLTickEventHandler,
	VecLike,
	createShapeId,
	moveCameraWhenCloseToEdge,
} from '@tldraw/editor'

export class BrushingNote extends StateNode {
	static override id = 'brushing_note'

	info = {} as TLPointerEventInfo & { target: 'canvas' }

	brush = new Box()
	isDirty = false
	originPoint = {} as VecLike
	gridShapes = [] as TLShapeId[]
	initialStartShape = {} as TLNoteShape

	override onEnter = (info: TLPointerEventInfo & { target: 'canvas' }) => {
		if (info.shape) {
			const shape = info.shape as TLNoteShape
			this.originPoint = { x: shape.x + 100, y: shape.y + 100 }
			this.info = info
			this.isDirty = false
			this.initialStartShape = info.shape
			this.createNoteGrid()
		}
	}

	override onExit = () => {
		this.editor.updateInstanceState({ brush: null })
	}

	override onTick: TLTickEventHandler = () => {
		moveCameraWhenCloseToEdge(this.editor)
		if (this.isDirty) {
			this.isDirty = false
			this.createNoteGrid()
		}
	}

	override onPointerMove = () => {
		this.isDirty = true
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onCancel?: TLCancelEvent | undefined = (info) => {
		this.parent.transition('idle', info)
	}

	override onKeyDown: TLEventHandlers['onKeyDown'] = () => {
		this.createNoteGrid()
	}

	override onKeyUp?: TLKeyboardEvent | undefined = () => {
		this.createNoteGrid()
	}

	private complete() {
		this.createNoteGrid()
		this.isDirty = false
		this.parent.transition('idle')
	}

	private createNoteGrid() {
		const {
			inputs: { currentPagePoint },
		} = this.editor
		// Set the brush to contain the current and origin points
		this.brush.setTo(Box.FromPoints([this.originPoint, currentPagePoint]))
		const isLeft = this.originPoint.x - currentPagePoint.x > 0
		const isUp = this.originPoint.y - currentPagePoint.y > 0
		const direction = {
			isLeft,
			isUp,
		}
		// test how many notes fit in the brush horizontally and vertically

		const noteSize = 215
		const brushWidth = this.brush.width
		const offsetOriginPoint = {
			x: this.originPoint.x - noteSize / 2 + 15,
			y: this.originPoint.y - noteSize / 2 + 15,
		}

		const notesPerRow = Math.floor(Math.max(brushWidth / noteSize, 1)) + 1
		const notesPerColumn = Math.floor(Math.max(this.brush.height / noteSize, 1))

		const totalNotes = notesPerRow * notesPerColumn
		// delete the old grid
		this.editor.deleteShapes(this.gridShapes)
		// create the shapes
		const noteIds = Array.from({ length: totalNotes }, () => createShapeId())
		for (let i = 0; i < notesPerColumn; i++) {
			for (let j = 0; j < notesPerRow; j++) {
				if (i === 0 && j === 0) continue
				let x = offsetOriginPoint.x + j * noteSize
				let y = offsetOriginPoint.y + i * noteSize
				if (direction.isLeft) x = offsetOriginPoint.x - j * noteSize
				if (direction.isUp) y = offsetOriginPoint.y - i * noteSize
				const noteId = noteIds[i * notesPerRow + j]
				this.editor.createShape<TLNoteShape>({
					type: 'note',
					x,
					y,
					id: noteId,
					props: {
						color: this.initialStartShape?.props.color,
						size: this.initialStartShape?.props.size,
					},
				})
			}
		}
		this.gridShapes = noteIds
		// reset the grid shapes

		this.editor.updateInstanceState({ brush: { ...this.brush.toJson() } })
	}

	override onInterrupt: TLInterruptEvent = () => {
		this.editor.updateInstanceState({ brush: null })
	}
}
