import {
	ResizeInteraction,
	SelectionCorner,
	SelectionEdge,
	StateNode,
	TLPointerEventInfo,
	TLShape,
	TLTickEventInfo,
	VecLike,
	kickoutOccludedShapes,
} from '@tldraw/editor'

/** @public */
export interface CreationResizingInfo {
	info: TLPointerEventInfo
	handle: SelectionEdge | SelectionCorner
	markId: string
	creationCursorOffset?: VecLike
	onCreate?(shape: TLShape | null): void
}

/**
 * A state node for creation tools that need to resize a newly created shape.
 * Uses ResizeInteraction directly — no cross-tool transition or tool ID masking needed.
 *
 * @public
 */
export class CreationResizing extends StateNode {
	static override id = 'resizing'

	interaction = new ResizeInteraction(this.editor)
	markId = ''
	onCreate?: (shape: TLShape | null) => void

	override onEnter(info: CreationResizingInfo) {
		this.markId = info.markId
		this.onCreate = info.onCreate

		const started = this.interaction.start({
			handle: info.handle,
			creationCursorOffset: info.creationCursorOffset,
		})

		if (!started) {
			console.error('Failed to create resize snapshot for creation')
			this.cancel()
			return
		}

		this.editor.setCursor({ type: 'cross', rotation: 0 })
		this.updateShapes()
	}

	override onTick({ elapsed }: TLTickEventInfo) {
		const { editor } = this
		if (!editor.inputs.getIsDragging() || editor.inputs.getIsPanning()) return
		editor.edgeScrollManager.updateEdgeScrolling(elapsed)
	}

	override onPointerMove() {
		this.updateShapes()
	}

	override onKeyDown() {
		this.updateShapes()
	}

	override onKeyUp() {
		this.updateShapes()
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

	override onExit() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
		this.editor.snaps.clearIndicators()
	}

	private cancel() {
		this.interaction.cancel()
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle')
	}

	private complete() {
		const selectedShapeIds = this.interaction.snapshot?.selectedShapeIds ?? []
		kickoutOccludedShapes(this.editor, selectedShapeIds)

		this.interaction.complete()

		// When tool-locked, return to tool idle without calling onCreate
		if (this.editor.getInstanceState().isToolLocked) {
			this.parent.transition('idle')
			return
		}

		if (this.onCreate) {
			this.onCreate(this.editor.getOnlySelectedShape())
			return
		}

		this.editor.setCurrentTool('select', {})
	}

	private updateShapes() {
		const result = this.interaction.update({ isCreating: true })

		if (result.cursor) {
			// Don't update cursor during creation — keep the cross cursor
		}
	}
}
