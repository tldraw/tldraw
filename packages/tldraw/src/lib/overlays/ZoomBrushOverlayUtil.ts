import { OverlayUtil, TLOverlay } from '@tldraw/editor'

/** @public */
export interface TLZoomBrushOverlay extends TLOverlay {
	props: {
		x: number
		y: number
		w: number
		h: number
	}
}

/**
 * Overlay util for the zoom brush rectangle.
 *
 * @public
 */
export class ZoomBrushOverlayUtil extends OverlayUtil<TLZoomBrushOverlay> {
	static override type = 'zoom_brush'

	override isActive(): boolean {
		return this.editor.getInstanceState().zoomBrush !== null
	}

	override getOverlays(): TLZoomBrushOverlay[] {
		const brush = this.editor.getInstanceState().zoomBrush
		if (!brush) return []
		return [
			{
				id: 'zoom_brush',
				type: 'zoom_brush',
				props: {
					x: brush.x,
					y: brush.y,
					w: Math.max(1, brush.w),
					h: Math.max(1, brush.h),
				},
			},
		]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLZoomBrushOverlay[]): void {
		const overlay = overlays[0]
		if (!overlay) return

		const { x, y, w, h } = overlay.props
		const zoom = this.editor.getEfficientZoomLevel()
		const colors = this.editor.getCurrentTheme().colors[this.editor.getColorMode()]

		ctx.beginPath()
		ctx.rect(x, y, w, h)

		ctx.fillStyle = colors.brushFill
		ctx.fill()

		ctx.lineWidth = 1 / zoom
		ctx.strokeStyle = colors.brushStroke
		ctx.stroke()
	}
}
