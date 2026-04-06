import { OverlayUtil, TLOverlay } from '@tldraw/editor'

/** @public */
export interface TLBrushOverlay extends TLOverlay {
	props: {
		x: number
		y: number
		w: number
		h: number
	}
}

/**
 * Overlay util for the selection brush rectangle.
 *
 * @public
 */
export class BrushOverlayUtil extends OverlayUtil<TLBrushOverlay> {
	static override type = 'brush'

	override isActive(): boolean {
		return this.editor.getInstanceState().brush !== null
	}

	override getOverlays(): TLBrushOverlay[] {
		const brush = this.editor.getInstanceState().brush
		if (!brush) return []
		return [
			{
				id: 'brush',
				type: 'brush',
				props: {
					x: brush.x,
					y: brush.y,
					w: Math.max(1, brush.w),
					h: Math.max(1, brush.h),
				},
			},
		]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLBrushOverlay[]): void {
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
