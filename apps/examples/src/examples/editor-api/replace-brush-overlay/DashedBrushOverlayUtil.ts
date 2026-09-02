import { BrushOverlayUtil, TLBrushOverlay } from 'tldraw'

export class DashedBrushOverlayUtil extends BrushOverlayUtil {
	override render(ctx: CanvasRenderingContext2D, overlays: TLBrushOverlay[]): void {
		const overlay = overlays[0]
		if (!overlay) return
		const { x, y, w, h } = overlay.props
		const zoom = this.editor.getZoomLevel()

		ctx.fillStyle = 'rgba(147, 51, 234, 0.08)'
		ctx.fillRect(x, y, w, h)

		ctx.save()
		ctx.lineWidth = 2 / zoom
		ctx.setLineDash([8 / zoom, 4 / zoom])
		ctx.strokeStyle = 'rgb(147, 51, 234)'
		ctx.strokeRect(x, y, w, h)
		ctx.restore()
	}
}
