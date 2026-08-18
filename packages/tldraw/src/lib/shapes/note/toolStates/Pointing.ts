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
import { startEditingShapeWithRichText } from '../../../tools/SelectTool/selectHelpers'
import { getDisplayValues } from '../../shared/getDisplayValues'
import {
	NOTE_ADJACENT_POSITION_SNAP_RADIUS,
	getAvailableNoteAdjacentPositions,
} from '../noteHelpers'
import type { NoteShapeUtil } from '../NoteShapeUtil'

export class Pointing extends StateNode {
	static override id = 'pointing'

	markId = ''

	shape = {} as TLNoteShape

	private shapeId!: TLShapeId

	private shapeCenter = new Vec()

	private hasCreatedShape = false

	override onEnter() {
		const { editor } = this

		this.hasCreatedShape = false
		this.shapeId = createShapeId()
		this.markId = editor.markHistoryStoppingPoint(`creating_note:${this.shapeId}`)

		const noteUtil = editor.getShapeUtil('note') as NoteShapeUtil
		const dv = getDisplayValues(noteUtil, { props: noteUtil.getDefaultProps() } as TLNoteShape)

		// Check for note pits; if the pointer is close to one, place the note centered on the pit
		const center = editor.inputs.getOriginPagePoint().clone()
		const offset = getNoteShapeAdjacentPositionOffset(
			editor,
			center,
			editor.getResizeScaleFactor(),
			dv.noteWidth,
			dv.noteHeight
		)
		if (offset) {
			center.sub(offset)
		}
		this.shapeCenter = center

		// On a coarse pointer, defer creating the note until the gesture commits (a
		// drag or a release). The note is created on press, and a long-press cancels
		// the pending creation, so without deferral the note appears on press and
		// vanishes at the long-press mark — a visible flash. On a fine pointer there
		// is no long-press cancel, so create immediately to keep the press-and-drag feel.
		if (!editor.getInstanceState().isCoarsePointer) {
			this.ensureShapeCreated()
		}
	}

	// A max-shapes failure cancels the gesture.
	private ensureShapeCreated() {
		if (this.hasCreatedShape) return

		const shape = createNoteShape(this.editor, this.shapeId, this.shapeCenter)
		if (shape) {
			this.shape = shape
			this.hasCreatedShape = true
		} else {
			this.cancel()
		}
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.getIsDragging()) {
			this.ensureShapeCreated()
			if (!this.hasCreatedShape) return
			this.editor.setCurrentTool('select.translating', {
				...info,
				target: 'shape',
				shape: this.shape,
				onInteractionEnd: 'note',
				isCreating: true,
				creatingMarkId: this.markId,
				onCreate: () => {
					startEditingShapeWithRichText(this.editor, this.shape.id)
				},
			})
		}
	}

	override onPointerUp() {
		this.complete()
	}

	override onLongPress() {
		// On a touch (coarse pointer) long-press, cancel the pending shape so it leaves nothing behind.
		if (this.editor.getInstanceState().isCoarsePointer) this.cancel()
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
		this.ensureShapeCreated()
		if (!this.hasCreatedShape) return
		if (this.editor.getInstanceState().isToolLocked) {
			this.parent.transition('idle')
		} else {
			startEditingShapeWithRichText(this.editor, this.shape.id)
		}
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle')
	}
}

export function getNoteShapeAdjacentPositionOffset(
	editor: Editor,
	center: Vec,
	scale: number,
	noteWidth: number,
	noteHeight: number
) {
	let min = NOTE_ADJACENT_POSITION_SNAP_RADIUS / editor.getZoomLevel() // in screen space
	let offset: Vec | undefined
	for (const pit of getAvailableNoteAdjacentPositions(editor, {
		rotation: 0,
		scale,
		extraHeight: 0,
		noteWidth,
		noteHeight,
	})) {
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
			scale: editor.getResizeScaleFactor(),
		},
	})

	const shape = editor.getShape<TLNoteShape>(id)
	if (!shape) return // may have hit max shapes

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
