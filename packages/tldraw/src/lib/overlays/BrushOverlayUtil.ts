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

		ctx.beginPath()
		ctx.rect(x, y, w, h)

		// Fill
		ctx.fillStyle = this._brushFill
		ctx.fill()

		// Stroke
		ctx.lineWidth = 1 / zoom
		ctx.strokeStyle = this._brushStroke
		ctx.stroke()
	}

	private get _brushFill(): string {
		return this._getThemeColor('--tl-color-brush-fill', 'hsla(0, 0%, 56%, 0.102)')
	}

	private get _brushStroke(): string {
		return this._getThemeColor('--tl-color-brush-stroke', 'hsla(0, 0%, 56%, 0.251)')
	}

	private _getThemeColor(varName: string, fallback: string): string {
		const container = this.editor.getContainer()
		const value = getComputedStyle(container).getPropertyValue(varName)
		return value || fallback
	}
}
