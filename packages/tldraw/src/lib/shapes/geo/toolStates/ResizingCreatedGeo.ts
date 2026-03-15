import {
	ResizeInteraction,
	StateNode,
	TLPointerEventInfo,
	TLTickEventInfo,
	VecLike,
	kickoutOccludedShapes,
} from '@tldraw/editor'

export interface ResizingCreatedGeoInfo {
	info: TLPointerEventInfo
	markId: string
	creationCursorOffset?: VecLike
}

export class ResizingCreatedGeo extends StateNode {
	static override id = 'resizing'

	interaction = new ResizeInteraction(this.editor)
	markId = ''

	override onEnter(info: ResizingCreatedGeoInfo) {
		this.markId = info.markId

		const started = this.interaction.start({
			handle: 'bottom_right',
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
		} else {
			this.editor.setCurrentTool('select', {})
		}
	}
}
