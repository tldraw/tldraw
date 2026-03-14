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

export type ResizingInfo = TLPointerEventInfo & {
	target: 'selection'
	handle: SelectionEdge | SelectionCorner
	isCreating?: boolean
	creatingMarkId?: string
	onCreate?(shape: TLShape | null): void
	creationCursorOffset?: VecLike
	onInteractionEnd?: string | (() => void)
}

export class Resizing extends StateNode {
	static override id = 'resizing'

	info = {} as ResizingInfo

	markId = ''

	interaction = new ResizeInteraction(this.editor)

	override onEnter(info: ResizingInfo) {
		const { isCreating = false, creatingMarkId, creationCursorOffset = { x: 0, y: 0 } } = info

		this.info = info

		if (typeof info.onInteractionEnd === 'string') {
			this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		}

		const started = this.interaction.start({
			handle: info.handle,
			creationCursorOffset,
		})

		if (!started) {
			console.error('Failed to create resize snapshot')
			this.cancel()
			return
		}

		this.markId = ''

		if (isCreating) {
			if (creatingMarkId) {
				this.markId = creatingMarkId
			} else {
				const markId = this.editor.getMarkIdMatching(
					`creating:${this.editor.getOnlySelectedShapeId()}`
				)
				if (markId) {
					this.markId = markId
				}
			}
		} else {
			this.markId = this.editor.markHistoryStoppingPoint('starting resizing')
		}

		if (isCreating) {
			this.editor.setCursor({ type: 'cross', rotation: 0 })
		}

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

	private cancel() {
		this.interaction.cancel()
		this.editor.bailToMark(this.markId)

		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				this.editor.setCurrentTool(onInteractionEnd, {})
			} else {
				onInteractionEnd()
			}
			return
		}
		this.parent.transition('idle')
	}

	private complete() {
		const selectedShapeIds = this.interaction.snapshot?.selectedShapeIds ?? []
		kickoutOccludedShapes(this.editor, selectedShapeIds)

		this.interaction.complete()

		if (this.info.isCreating && this.info.onCreate) {
			this.info.onCreate?.(this.editor.getOnlySelectedShape())
			return
		}

		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				if (this.editor.getInstanceState().isToolLocked) {
					this.editor.setCurrentTool(onInteractionEnd, {})
					return
				}
			} else {
				onInteractionEnd()
				return
			}
		}

		this.parent.transition('idle')
	}

	private updateShapes() {
		const result = this.interaction.update({ isCreating: this.info.isCreating })

		if (result.cursor) {
			this.updateCursor(result.cursor)
		}
	}

	private updateCursor({
		dragHandle,
		isFlippedX,
		isFlippedY,
		rotation,
	}: {
		dragHandle: SelectionCorner | SelectionEdge
		isFlippedX: boolean
		isFlippedY: boolean
		rotation: number
	}) {
		const nextCursor = { ...this.editor.getInstanceState().cursor }

		switch (dragHandle) {
			case 'top_left':
			case 'bottom_right': {
				nextCursor.type = 'nwse-resize'
				if (isFlippedX !== isFlippedY) {
					nextCursor.type = 'nesw-resize'
				}
				break
			}
			case 'top_right':
			case 'bottom_left': {
				nextCursor.type = 'nesw-resize'
				if (isFlippedX !== isFlippedY) {
					nextCursor.type = 'nwse-resize'
				}
				break
			}
		}

		nextCursor.rotation = rotation

		this.editor.setCursor(nextCursor)
	}

	override onExit() {
		this.parent.setCurrentToolIdMask(undefined)
		this.editor.setCursor({ type: 'default', rotation: 0 })
		this.editor.snaps.clearIndicators()
	}
}
