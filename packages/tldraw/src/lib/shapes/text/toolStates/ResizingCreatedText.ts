import {
	ResizeInteraction,
	StateNode,
	TLPointerEventInfo,
	TLShape,
	TLTickEventInfo,
	VecLike,
	kickoutOccludedShapes,
} from '@tldraw/editor'

export interface ResizingCreatedTextInfo {
	info: TLPointerEventInfo
	markId: string
	creationCursorOffset?: VecLike
	onCreate?(shape: TLShape | null): void
}

export class ResizingCreatedText extends StateNode {
	static override id = 'resizing'

	interaction = new ResizeInteraction(this.editor)
	markId = ''
	onCreate?: (shape: TLShape | null) => void

	override onEnter(info: ResizingCreatedTextInfo) {
		this.markId = info.markId
		this.onCreate = info.onCreate

		const started = this.interaction.start({
			handle: 'right',
			creationCursorOffset: info.creationCursorOffset,
		})

		if (!started) {
			this.cancel()
			return
		}

		this.editor.setCursor({ type: 'cross', rotation: 0 })
		this.interaction.update({ isCreating: true })
	}

	override onTick({ elapsed }: TLTickEventInfo) {
		const { editor } = this
		if (!editor.inputs.getIsDragging() || editor.inputs.getIsPanning()) return
		editor.edgeScrollManager.updateEdgeScrolling(elapsed)
	}

	override onPointerMove() {
		this.interaction.update({ isCreating: true })
	}

	override onKeyDown() {
		this.interaction.update({ isCreating: true })
	}

	override onKeyUp() {
		this.interaction.update({ isCreating: true })
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
}
