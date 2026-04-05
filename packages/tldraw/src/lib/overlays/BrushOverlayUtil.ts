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

/** @public */
export interface BrushOverlayOptions {
	fill: string
	stroke: string
}

/**
 * Overlay util for the selection brush rectangle.
 *
 * @public
 */
export class BrushOverlayUtil extends OverlayUtil<TLBrushOverlay> {
	static override type = 'brush'

	override options: BrushOverlayOptions = {
		fill: 'var(--tl-color-brush-fill)',
		stroke: 'var(--tl-color-brush-stroke)',
	}

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
