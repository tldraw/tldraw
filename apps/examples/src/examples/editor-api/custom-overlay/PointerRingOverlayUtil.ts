import { OverlayUtil, TLOverlay } from 'tldraw'

interface TLPointerRingOverlay extends TLOverlay {
	props: {
		x: number
		y: number
	}
}

export class PointerRingOverlayUtil extends OverlayUtil<TLPointerRingOverlay> {
	static override type = 'pointer-ring'
	override options = { zIndex: 50 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLPointerRingOverlay[] {
		const { x, y } = this.editor.inputs.getCurrentPagePoint()
		return [{ id: 'pointer-ring', type: 'pointer-ring', props: { x, y } }]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLPointerRingOverlay[]): void {
		const overlay = overlays[0]
		if (!overlay) return
		const { x, y } = overlay.props
		const zoom = this.editor.getZoomLevel()
		const radius = 24 / zoom

		ctx.lineWidth = 2 / zoom
		ctx.strokeStyle = 'hotpink'
		ctx.beginPath()
		ctx.arc(x, y, radius, 0, Math.PI * 2)
		ctx.stroke()
	}
}
