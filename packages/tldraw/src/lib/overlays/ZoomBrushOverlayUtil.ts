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

/** @public */
export interface ZoomBrushOverlayOptions {
	fill: string
	stroke: string
}

/**
 * Overlay util for the zoom brush rectangle.
 *
 * @public
 */
export class ZoomBrushOverlayUtil extends OverlayUtil<TLZoomBrushOverlay> {
	static override type = 'zoom_brush'

	override options: ZoomBrushOverlayOptions = {
		fill: 'var(--tl-color-brush-fill)',
		stroke: 'var(--tl-color-brush-stroke)',
	}

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

		ctx.beginPath()
		ctx.rect(x, y, w, h)

		ctx.fillStyle = this._resolveColor(this.options.fill)
		ctx.fill()

		ctx.lineWidth = 1 / zoom
		ctx.strokeStyle = this._resolveColor(this.options.stroke)
		ctx.stroke()
	}

	/** @internal */
	_resolveColor(value: string): string {
		if (!value.startsWith('var(')) return value
		const varName = value.slice(4, -1)
		const container = this.editor.getContainer()
		return getComputedStyle(container).getPropertyValue(varName) || value
	}
}
