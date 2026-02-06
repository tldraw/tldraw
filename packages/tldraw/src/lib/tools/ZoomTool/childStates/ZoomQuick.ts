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

	qzState = 'idle' as 'idle' | 'moving'

	initialVpb = new Box()
	initialPp = new Vec()

	nextVpb = new Box()

	override onEnter(info: TLPointerEventInfo & { onInteractionEnd: string }) {
		const { editor } = this
		this.info = info
		this.qzState = 'idle'

		this.initialVpb = editor.getViewportPageBounds()
		this.initialPp = Vec.From(editor.inputs.getCurrentPagePoint())

		editor.setCursor({ type: 'zoom-in', rotation: 0 })

		// Zoom to the 2nd zoom step while preserving cursor position
		// If already below that, zoom to the 1st zoom step instead
		const baseZoom = editor.getBaseZoom()
		const { zoomSteps } = editor.getCameraOptions()
		const currentZoom = editor.getCamera().z
		// Safely access zoomSteps - use first element if only one exists
		const secondStep = zoomSteps.length > 1 ? zoomSteps[1] : zoomSteps[0]
		const targetZoom =
			currentZoom < secondStep * baseZoom ? zoomSteps[0] * baseZoom : secondStep * baseZoom

		const { x: cx, y: cy, z: cz } = editor.getCamera()
		const { x: px, y: py } = this.initialPp
		const ratio = cz / targetZoom
		editor.setCamera(new Vec((cx + px) * ratio - px, (cy + py) * ratio - py, targetZoom))

		this.updateBrush()
	}

	override onExit() {
		this.zoomToNewViewport()
		this.editor.updateInstanceState({ zoomBrush: null })
	}

	override onPointerUp() {
		// Exit the zoom tool entirely, returning to the original tool
		const toolId = this.info.onInteractionEnd?.split('.')[0] ?? 'select'
		this.editor.setCurrentTool(toolId)
	}

	override onCancel() {
		this.qzState = 'idle'
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
		const { editor } = this
		const nextVpb = this.getNextVpb()
		this.nextVpb.setTo(nextVpb)
		editor.updateInstanceState({ zoomBrush: nextVpb.toJson() })
	}

	private zoomToNewViewport() {
		const { editor } = this
		switch (this.qzState) {
			case 'idle':
				// return to original viewport
				editor.zoomToBounds(this.initialVpb, { inset: 0 })
				break
			case 'moving':
				// zoom to the new viewport
				editor.zoomToBounds(this.nextVpb, { inset: 0 })
				break
		}
	}

	override onPointerMove() {
		if (this.qzState !== 'moving') return
		this.updateBrush()
	}

	override onTick({ elapsed }: TLTickEventInfo) {
		const { editor } = this

		switch (this.qzState) {
			case 'idle': {
				const zoomLevel = editor.getZoomLevel()
				if (
					Vec.Dist2(editor.inputs.getCurrentPagePoint(), this.initialPp) * zoomLevel >
					editor.options.dragDistanceSquared / zoomLevel
				) {
					this.qzState = 'moving'
					this.updateBrush()
				}
				break
			}
			case 'moving':
				if (editor.getCameraOptions().isLocked) break
				editor.edgeScrollManager.updateEdgeScrolling(elapsed)
				break
		}
	}

	private getNextVpb() {
		const { editor } = this
		const { w, h } = this.initialVpb
		const { x, y } = editor.inputs.getCurrentPagePoint()

		// Normalize the offset on the current screen point within the curren viewport screen bounds
		const vsb = editor.getViewportScreenBounds()
		const vsp = editor.inputs.getCurrentScreenPoint()
		const { x: nx, y: ny } = new Vec((vsp.x - vsb.x) / vsb.w, (vsp.y - vsb.y) / vsb.h)

		return new Box(x - nx * w, y - ny * h, w, h)
	}
}
