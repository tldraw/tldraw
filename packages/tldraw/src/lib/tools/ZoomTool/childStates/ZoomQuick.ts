import {
	Box,
	StateNode,
	TLKeyboardEventInfo,
	TLPointerEventInfo,
	TLTickEventInfo,
	Vec,
} from '@tldraw/editor'

export class ZoomQuick extends StateNode {
	static override id = 'zoom_quick'

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	didZoom = false
	zoomBrush = null as Box | null
	initialViewport = new Box()
	originScreenPoint = null as null | Vec

	override onEnter(info: TLPointerEventInfo & { onInteractionEnd: string }) {
		const { editor } = this
		this.info = info
		this.zoomBrush = null
		this.didZoom = false
		this.initialViewport = editor.getViewportPageBounds()
		this.originScreenPoint = this.editor.inputs.getCurrentScreenPoint().clone()
		editor.setCursor({ type: 'zoom-in', rotation: 0 })

		editor.zoomToFit()

		// We don't show the brush immediately, because the user might just
		// want to have a quick look at the top level and zoom back to where they were.
		// If we update the brush immediately, then the user will accidentally zoom
		// to a new place without meaning to.
	}

	override onExit() {
		this.zoomToNewViewport()
		this.editor.updateInstanceState({ zoomBrush: null })
	}

	override onPointerMove() {
		if (
			this.zoomBrush ||
			!Vec.DistMin(this.editor.inputs.getCurrentScreenPoint(), this.originScreenPoint!, 16)
		) {
			// See note in onEnter. We only update the brush if the user has moved the pointer a bit.
			this.updateBrush()
		}
	}

	override onPointerUp() {
		this.updateBrush()
		this.zoomToNewViewport()
	}

	override onCancel() {
		// Clear brush so onExit zooms back to initial viewport
		this.zoomBrush = null
		// Exit the zoom tool entirely, returning to the original tool
		const toolId = this.info.onInteractionEnd?.split('.')[0] ?? 'select'
		this.editor.setCurrentTool(toolId)
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
		if (info.key === 'Shift') {
			this.parent.transition('idle', this.info)
		}
	}

	private updateBrush() {
		if (this.didZoom) return
		const { editor } = this

		const screenBounds = editor.getViewportScreenBounds()
		const zoom = editor.getZoomLevel()

		// Brush is at most 1/4 of screen size (in page coordinates), clamped to initial viewport
		const brushW = Math.min(screenBounds.w / zoom / 4, this.initialViewport.w)
		const brushH = Math.min(screenBounds.h / zoom / 4, this.initialViewport.h)

		const { x, y } = editor.inputs.getCurrentPagePoint()
		this.zoomBrush = new Box(x - brushW / 2, y - brushH / 2, brushW, brushH)
		editor.updateInstanceState({ zoomBrush: this.zoomBrush.toJson() })
	}

	private zoomToNewViewport() {
		if (this.didZoom) return
		const { editor } = this

		const newViewport = this.zoomBrush ?? this.initialViewport
		editor.zoomToBounds(newViewport, { inset: 0 })

		this.didZoom = true
	}

	override onTick({ elapsed }: TLTickEventInfo) {
		const { editor } = this
		editor.edgeScrollManager.updateEdgeScrolling(elapsed)
	}
}
