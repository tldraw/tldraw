import { Box, StateNode, TLKeyboardEventInfo, TLPointerEventInfo } from '@tldraw/editor'

export class ZoomQuick extends StateNode {
	static override id = 'zoom_quick'

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	didZoom = false
	zoomBrush = null as Box | null
	initialViewport = new Box()

	override onEnter(info: TLPointerEventInfo & { onInteractionEnd: string }) {
		const { editor } = this
		this.info = info
		this.zoomBrush = null
		this.didZoom = false
		this.initialViewport = editor.getViewportPageBounds()

		// Zoom out to 5%, keeping the cursor over the same page point.
		// To maintain the cursor position, we adjust the camera by the difference
		// in how the cursor offset scales between the old and new zoom levels.
		const { x: cx, y: cy, z: cz } = editor.getCamera()
		const { x: sx, y: sy } = editor.inputs.getCurrentScreenPoint()
		const newZoom = 0.05
		editor.setCamera({
			x: cx + sx * (1 / newZoom - 1 / cz),
			y: cy + sy * (1 / newZoom - 1 / cz),
			z: newZoom,
		})

		// Show the viewport brush immediately
		this.updateBrush()
	}

	override onExit() {
		this.zoomToNewViewport()
		this.editor.updateInstanceState({ zoomBrush: null })
	}

	override onPointerMove() {
		this.updateBrush()
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
}
