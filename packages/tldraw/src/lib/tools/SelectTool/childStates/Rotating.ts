import {
	RotateCorner,
	RotateInteraction,
	StateNode,
	TLPointerEventInfo,
	kickoutOccludedShapes,
} from '@tldraw/editor'
import { CursorTypeMap } from './PointingResizeHandle'

export class Rotating extends StateNode {
	static override id = 'rotating'

	interaction = new RotateInteraction(this.editor)

	info = {} as Extract<TLPointerEventInfo, { target: 'selection' }> & {
		onInteractionEnd?: string | (() => void)
	}

	markId = ''

	override onEnter(
		info: TLPointerEventInfo & { target: 'selection'; onInteractionEnd?: string | (() => void) }
	) {
		this.info = info
		if (typeof info.onInteractionEnd === 'string') {
			this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		}

		this.markId = this.editor.markHistoryStoppingPoint('rotate start')

		// Create snapshot first (without applying rotation yet)
		const started = this.interaction.start({
			ids: this.editor.getSelectedShapeIds(),
		})
		if (!started) {
			this.parent.transition('idle', this.info)
			return
		}

		// Compute initial delta from pointer position (needs snapshot to exist)
		const newSelectionRotation = this.interaction.getRotationDelta({
			snapToNearestDegree: false,
		})

		// Apply the start stage with the computed delta (fires onRotateStart + onRotate)
		this.interaction.applyStart(newSelectionRotation)

		// Update cursor
		this.editor.setCursor({
			type: CursorTypeMap[this.info.handle as RotateCorner],
			rotation: newSelectionRotation + (this.interaction.snapshot?.initialShapesRotation ?? 0),
		})
	}

	override onExit() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
		this.parent.setCurrentToolIdMask(undefined)
	}

	override onPointerMove() {
		this.update()
	}

	override onKeyDown() {
		this.update()
	}

	override onKeyUp() {
		this.update()
	}

	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	// ---

	private update() {
		const delta = this.interaction.getRotationDelta({ snapToNearestDegree: false })
		this.interaction.update({ delta })

		// Update cursor
		this.editor.setCursor({
			type: CursorTypeMap[this.info.handle as RotateCorner],
			rotation: delta + (this.interaction.snapshot?.initialShapesRotation ?? 0),
		})
	}

	private cancel() {
		this.interaction.cancel()
		this.editor.bailToMark(this.markId)

		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				this.editor.setCurrentTool(onInteractionEnd, this.info)
			} else {
				onInteractionEnd()
			}
			return
		}
		this.parent.transition('idle', this.info)
	}

	private complete() {
		const delta = this.interaction.getRotationDelta({ snapToNearestDegree: true })
		const shapeIds =
			this.interaction.snapshot?.shapeSnapshots.map((s) => s.shape.id) ??
			this.editor.getSelectedShapeIds()
		this.interaction.complete({ delta })

		kickoutOccludedShapes(this.editor, shapeIds)

		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				this.editor.setCurrentTool(onInteractionEnd, this.info)
			} else {
				onInteractionEnd()
			}
			return
		}
		this.parent.transition('idle', this.info)
	}
}
