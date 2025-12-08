import {
	Editor,
	StateNode,
	TLNoteShape,
	TLPointerEventInfo,
	TLShapeId,
	Vec,
	createShapeId,
	maybeSnapToGrid,
} from '@tldraw/editor'

import {
	NOTE_ADJACENT_POSITION_SNAP_RADIUS,
	getAvailableNoteAdjacentPositions,
} from '../noteHelpers'

export class Pointing extends StateNode {
	static override id = 'pointing'

	dragged = false

	info = {} as TLPointerEventInfo

	markId = ''

	shape = {} as TLNoteShape

	override onEnter() {
		const { editor } = this

		const id = createShapeId()
		this.markId = editor.markHistoryStoppingPoint(`creating_note:${id}`)

		// Check for note pits; if the pointer is close to one, place the note centered on the pit
		const center = this.editor.inputs.originPagePoint.clone()
		const offset = getNoteShapeAdjacentPositionOffset(
			this.editor,
			center,
			this.editor.user.getIsDynamicResizeMode() ? 1 / this.editor.getZoomLevel() : 1
		)
		if (offset) {
			center.sub(offset)
		}

		// Allow this to trigger the max shapes reached alert
		const shape = createNoteShape(this.editor, id, center)
		if (shape) {
			this.shape = shape
		} else {
			this.cancel()
		}
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.isDragging) {
			this.editor.setCurrentTool('select.translating', {
				...info,
				target: 'shape',
				shape: this.shape,
				onInteractionEnd: 'note',
				isCreating: true,
				creatingMarkId: this.markId,
				onCreate: () => {
					this.editor.setEditingShape(this.shape.id)
					this.editor.setCurrentTool('select.editing_shape')
				},
			})
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

	private cancel() {
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle', this.info)
	}
}

export function getNoteShapeAdjacentPositionOffset(editor: Editor, center: Vec, scale: number) {
	let min = NOTE_ADJACENT_POSITION_SNAP_RADIUS / editor.getZoomLevel() // in screen space
	let offset: Vec | undefined
	for (const pit of getAvailableNoteAdjacentPositions(editor, 0, scale, 0)) {
		// only check page rotations of zero
		const deltaToPit = Vec.Sub(center, pit)
		const dist = deltaToPit.len()
		if (dist < min) {
			min = dist
			offset = deltaToPit
		}
	}
	return offset
}

export function createNoteShape(editor: Editor, id: TLShapeId, center: Vec) {
	editor.createShape({
		id,
		type: 'note',
		x: center.x,
		y: center.y,
		props: {
			scale: editor.user.getIsDynamicResizeMode() ? 1 / editor.getZoomLevel() : 1,
		},
	})

	const shape = editor.getShape<TLNoteShape>(id)
	// Should never happen since we just checked, but just in case
	if (!shape) return

	editor.select(id)
	const bounds = editor.getShapeGeometry(shape).bounds
	const newPoint = maybeSnapToGrid(
		new Vec(shape.x - bounds.width / 2, shape.y - bounds.height / 2),
		editor
	)

	// Center the text around the created point
	editor.updateShapes([
		{
			id,
			type: 'note',
			x: newPoint.x,
			y: newPoint.y,
		},
	])

	return editor.getShape<TLNoteShape>(id)
}
