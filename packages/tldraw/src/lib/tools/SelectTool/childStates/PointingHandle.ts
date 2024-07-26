import {
	Editor,
	StateNode,
	TLArrowShape,
	TLEventHandlers,
	TLHandle,
	TLNoteShape,
	TLPointerEventInfo,
	Vec,
} from '@tldraw/editor'
import { getArrowBindings } from '../../../shapes/arrow/shared'
import {
	NOTE_CENTER_OFFSET,
	getNoteAdjacentPositions,
	getNoteShapeForAdjacentPosition,
} from '../../../shapes/note/noteHelpers'
import { startEditingShapeWithLabel } from '../selectHelpers'

export class PointingHandle extends StateNode {
	static override id = 'pointing_handle'

	info = {} as TLPointerEventInfo & { target: 'handle' }

	override onEnter = (info: TLPointerEventInfo & { target: 'handle' }) => {
		this.info = info

		const { shape } = info
		if (this.editor.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
			const initialBinding = getArrowBindings(this.editor, shape)[info.handle.id as 'start' | 'end']

			if (initialBinding) {
				this.editor.setHintingShapes([initialBinding.toId])
			}
		}

		this.editor.setCursor({ type: 'grabbing', rotation: 0 })
	}

	override onExit = () => {
		this.editor.setHintingShapes([])
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		const { shape, handle } = this.info

		if (this.editor.isShapeOfType<TLNoteShape>(shape, 'note')) {
			const { editor } = this
			const nextNote = getNoteForPit(editor, shape, handle, false)
			if (nextNote) {
				startEditingShapeWithLabel(editor, nextNote, true /* selectAll */)
				return
			}
		}

		this.parent.transition('idle', this.info)
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		const { editor } = this
		if (editor.inputs.isDragging) {
			this.startDraggingHandle()
		}
	}

	override onLongPress: TLEventHandlers['onLongPress'] = () => {
		this.startDraggingHandle()
	}

	private startDraggingHandle() {
		const { editor } = this
		if (editor.getInstanceState().isReadonly) return
		const { shape, handle } = this.info

		if (editor.isShapeOfType<TLNoteShape>(shape, 'note')) {
			const nextNote = getNoteForPit(editor, shape, handle, true)
			if (nextNote) {
				// Center the shape on the current pointer
				const centeredOnPointer = editor
					.getPointInParentSpace(nextNote, editor.inputs.originPagePoint)
					.sub(Vec.Rot(NOTE_CENTER_OFFSET.clone().mul(shape.props.scale), nextNote.rotation))
				editor.updateShape({ ...nextNote, x: centeredOnPointer.x, y: centeredOnPointer.y })

				// Then select and begin translating the shape
				editor
					.setHoveredShape(nextNote.id) // important!
					.select(nextNote.id)
					.setCurrentTool('select.translating', {
						...this.info,
						target: 'shape',
						shape: editor.getShape(nextNote),
						onInteractionEnd: 'note',
						isCreating: true,
						onCreate: () => {
							// When we're done, start editing it
							startEditingShapeWithLabel(editor, nextNote, true /* selectAll */)
						},
					})
				return
			}
		}

		this.parent.transition('dragging_handle', this.info)
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.cancel()
	}

	override onInterrupt = () => {
		this.cancel()
	}

	private cancel() {
		this.parent.transition('idle')
	}
}

function getNoteForPit(editor: Editor, shape: TLNoteShape, handle: TLHandle, forceNew: boolean) {
	const pageTransform = editor.getShapePageTransform(shape.id)!
	const pagePoint = pageTransform.point()
	const pageRotation = pageTransform.rotation()
	const pits = getNoteAdjacentPositions(
		editor,
		pagePoint,
		pageRotation,
		shape.props.growY,
		0,
		shape.props.scale
	)
	const pit = pits[handle.index]
	if (pit) {
		return getNoteShapeForAdjacentPosition(editor, shape, pit, pageRotation, forceNew)
	}
}
