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

		ctx.beginPath()
		ctx.rect(x, y, w, h)

		ctx.fillStyle = this._brushFill
		ctx.fill()

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
