import {
	Editor,
	StateNode,
	TLArrowShape,
	TLHandle,
	TLNoteShape,
	TLPointerEventInfo,
	Vec,
} from '@tldraw/editor'
import { updateArrowTargetState } from '../../../shapes/arrow/arrowTargetState'
import { getArrowBindings } from '../../../shapes/arrow/shared'
import {
	NOTE_CENTER_OFFSET,
	getNoteAdjacentPositions,
	getNoteShapeForAdjacentPosition,
} from '../../../shapes/note/noteHelpers'
import { startEditingShapeWithLabel } from '../selectHelpers'

export class PointingHandle extends StateNode {
	static override id = 'pointing_handle'

	didCtrlOnEnter = false

	info = {} as TLPointerEventInfo & { target: 'handle' }

	override onEnter(info: TLPointerEventInfo & { target: 'handle' }) {
		this.info = info

		this.didCtrlOnEnter = info.accelKey

		const { shape } = info
		if (this.editor.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
			const initialBindings = getArrowBindings(this.editor, shape)
			const currentBinding = initialBindings[info.handle.id as 'start' | 'end']
			const oppositeBinding = initialBindings[info.handle.id === 'start' ? 'end' : 'start']
			const arrowTransform = this.editor.getShapePageTransform(shape.id)!

			if (currentBinding) {
				updateArrowTargetState({
					editor: this.editor,
					pointInPageSpace: arrowTransform.applyToPoint(info.handle),
					arrow: shape,
					isPrecise: currentBinding.props.isPrecise,
					currentBinding: currentBinding,
					oppositeBinding: oppositeBinding,
				})
			}
		}

		this.editor.setCursor({ type: 'grabbing', rotation: 0 })
	}

	override onExit() {
		this.editor.setHintingShapes([])
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	override onPointerUp() {
		const { shape, handle } = this.info

		if (this.editor.isShapeOfType<TLNoteShape>(shape, 'note')) {
			const { editor } = this
			const nextNote = getNoteForAdjacentPosition(editor, shape, handle, false)
			if (nextNote) {
				startEditingShapeWithLabel(editor, nextNote, true /* selectAll */)
				return
			}
		}

		this.parent.transition('idle', this.info)
	}

	override onPointerMove(info: TLPointerEventInfo) {
		const { editor } = this
		if (editor.inputs.isDragging) {
			if (this.didCtrlOnEnter) {
				this.parent.transition('brushing', info)
			} else {
				this.startDraggingHandle()
			}
		}
	}

	override onLongPress() {
		this.startDraggingHandle()
	}

	private startDraggingHandle() {
		const { editor } = this
		if (editor.getIsReadonly()) return
		const { shape, handle } = this.info

		if (editor.isShapeOfType<TLNoteShape>(shape, 'note')) {
			const nextNote = getNoteForAdjacentPosition(editor, shape, handle, true)
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

	override onCancel() {
		this.cancel()
	}

	override onComplete() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	private cancel() {
		this.parent.transition('idle')
	}
}

function getNoteForAdjacentPosition(
	editor: Editor,
	shape: TLNoteShape,
	handle: TLHandle,
	forceNew: boolean
) {
	const pageTransform = editor.getShapePageTransform(shape.id)!
	const pagePoint = pageTransform.point()
	const pageRotation = pageTransform.rotation()
	const positions = getNoteAdjacentPositions(
		editor,
		pagePoint,
		pageRotation,
		shape.props.growY * shape.props.scale,
		0,
		shape.props.scale
	)
	const position = positions[handle.index]
	if (position) {
		return getNoteShapeForAdjacentPosition(editor, shape, position, pageRotation, forceNew)
	}
}
