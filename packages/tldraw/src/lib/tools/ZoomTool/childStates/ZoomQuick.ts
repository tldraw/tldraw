import { Box, StateNode, TLKeyboardEventInfo, TLPointerEventInfo, Vec, react } from '@tldraw/editor'

export class ZoomQuick extends StateNode {
	static override id = 'zoom_quick'

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	qzState = 'idle' as 'idle' | 'moving'

	initialVpb = new Box()
	initialPp = new Vec()

	/** The camera zoom right after the overview zoom-out in onEnter. */
	overviewZoom = 1

	cleanupZoomReactor() {
		void null
	}

	nextVpb = new Box()

	override onEnter(info: TLPointerEventInfo & { onInteractionEnd: string }) {
		const { editor } = this
		this.info = info
		this.qzState = 'idle'

		this.initialVpb = editor.getViewportPageBounds()
		this.initialPp = Vec.From(editor.inputs.getCurrentPagePoint())

		editor.setCursor({ type: 'zoom-in', rotation: 0 })

		// Find the union of the current viewport and all shapes on the page,
		// then compute the zoom needed to fit it while preserving cursor position.
		const vpb = this.initialVpb
		const pageBounds = editor.getCurrentPageBounds()
		const commonBounds = pageBounds ? Box.Expand(vpb, pageBounds) : vpb.clone()

		// The cursor stays fixed on screen, so the viewport extends:
		//   left of cursor by sx/z, right by (vsb.w-sx)/z (in page units)
		// We need each side to reach the common bounds edge.
		const vsb = editor.getViewportScreenBounds()
		const sp = editor.inputs.getCurrentScreenPoint()
		const sx = sp.x - vsb.x
		const sy = sp.y - vsb.y
		const { x: px, y: py } = this.initialPp

		const dLeft = px - commonBounds.minX
		const dRight = commonBounds.maxX - px
		const dTop = py - commonBounds.minY
		const dBottom = commonBounds.maxY - py

		let targetZoom = editor.getCamera().z
		if (dLeft > 0) targetZoom = Math.min(targetZoom, sx / dLeft)
		if (dRight > 0) targetZoom = Math.min(targetZoom, (vsb.w - sx) / dRight)
		if (dTop > 0) targetZoom = Math.min(targetZoom, sy / dTop)
		if (dBottom > 0) targetZoom = Math.min(targetZoom, (vsb.h - sy) / dBottom)

		// Zoom out a little further to add breathing room for dragging
		targetZoom *= 0.85

		// Make sure we're not less than the minimum zoom
		targetZoom = Math.max(editor.getCameraOptions().zoomSteps[0], targetZoom)
		this.overviewZoom = targetZoom

		// When preserving screen bounds, react to zoom changes to resize the brush.
		// Otherwise the brush keeps fixed page dimensions.
		if (editor.options.quickZoomPreservesScreenBounds) {
			this.cleanupZoomReactor = react('zoom change in quick zoom', () => {
				editor.getZoomLevel()
				this.updateBrush()
			})
		}

		// Set the camera — when the reactor is active it will update the brush automatically.
		const { x: cx, y: cy, z: cz } = editor.getCamera()
		const ratio = cz / targetZoom
		editor.setCamera(new Vec((cx + px) * ratio - px, (cy + py) * ratio - py, targetZoom))

		if (!editor.options.quickZoomPreservesScreenBounds) {
			this.updateBrush()
		}
	}

	override onExit() {
		this.cleanupZoomReactor()
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

	override onTick() {
		const { editor } = this

		// If the user is idle but has moved their camera, transition to the moving state
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
				break
		}
	}

	private getNextVpb() {
		const { editor } = this
		let w: number
		let h: number
		if (editor.options.quickZoomPreservesScreenBounds) {
			// Scale the brush page dimensions so that its screen size stays constant
			// as the overview zoom changes. When the user zooms in on the overview,
			// the brush shrinks in page coords (higher target zoom); zooming out expands it.
			const zoomRatio = this.overviewZoom / editor.getCamera().z
			w = this.initialVpb.w * zoomRatio
			h = this.initialVpb.h * zoomRatio
		} else {
			w = this.initialVpb.w
			h = this.initialVpb.h
		}
		const { x, y } = editor.inputs.getCurrentPagePoint()

		// Normalize the offset on the current screen point within the current viewport screen bounds
		const vsb = editor.getViewportScreenBounds()
		const vsp = editor.inputs.getCurrentScreenPoint()
		const { x: nx, y: ny } = new Vec((vsp.x - vsb.x) / vsb.w, (vsp.y - vsb.y) / vsb.h)

		return new Box(x - nx * w, y - ny * h, w, h)
	}
}
