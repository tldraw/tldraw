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
	override options = { zIndex: 400, lineWidth: 1 }

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
		const zoom = this.editor.getZoomLevel()
		const colors = this.editor.getCurrentTheme().colors[this.editor.getColorMode()]

		// Use fillRect / strokeRect to avoid path construction overhead
		ctx.fillStyle = colors.brushFill
		ctx.fillRect(x, y, w, h)

		ctx.lineWidth = this.options.lineWidth / zoom
		ctx.strokeStyle = colors.brushStroke
		ctx.strokeRect(x, y, w, h)
	}

	override renderMinimap(
		ctx: CanvasRenderingContext2D,
		overlays: TLZoomBrushOverlay[],
		zoom: number
	): void {
		const overlay = overlays[0]
		if (!overlay) return
		const { x, y, w, h } = overlay.props
		const colors = this.editor.getCurrentTheme().colors[this.editor.getColorMode()]
		ctx.fillStyle = colors.brushFill
		ctx.fillRect(x, y, w, h)
		ctx.lineWidth = this.options.lineWidth / zoom
		ctx.strokeStyle = colors.brushStroke
		ctx.strokeRect(x, y, w, h)
	}
}
