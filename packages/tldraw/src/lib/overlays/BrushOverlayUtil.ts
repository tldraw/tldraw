import {
	getOverlayDisplayValues,
	OverlayOptionsWithDisplayValues,
	OverlayUtil,
	TLOverlay,
} from '@tldraw/editor'

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
export interface BrushOverlayUtilDisplayValues {
	fillColor: string
	strokeColor: string
	lineWidth: number
}

/** @public */
export interface BrushOverlayUtilOptions extends OverlayOptionsWithDisplayValues<
	TLBrushOverlay,
	BrushOverlayUtilDisplayValues
> {
	zIndex: number
}

/**
 * Overlay util for the selection brush rectangle.
 *
 * @public
 */
export class BrushOverlayUtil extends OverlayUtil<TLBrushOverlay> {
	static override type = 'brush'
	override options: BrushOverlayUtilOptions = {
		zIndex: 300,
		getDefaultDisplayValues(editor, _overlay, theme, colorMode): BrushOverlayUtilDisplayValues {
			const colors = theme.colors[colorMode]
			return {
				fillColor: colors.brushFill,
				strokeColor: colors.brushStroke,
				lineWidth: 1,
			}
		},
		getCustomDisplayValues(): Partial<BrushOverlayUtilDisplayValues> {
			return {}
		},
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
		this._draw(ctx, overlays[0], this.editor.getZoomLevel())
	}

	override renderMinimap(
		ctx: CanvasRenderingContext2D,
		overlays: TLBrushOverlay[],
		zoom: number
	): void {
		this._draw(ctx, overlays[0], zoom)
	}

	private _draw(ctx: CanvasRenderingContext2D, overlay: TLBrushOverlay | undefined, zoom: number) {
		if (!overlay) return
		const { x, y, w, h } = overlay.props
		const dv = getOverlayDisplayValues(this, overlay)

		// Use fillRect / strokeRect to avoid path construction overhead
		ctx.fillStyle = dv.fillColor
		ctx.fillRect(x, y, w, h)

		ctx.lineWidth = dv.lineWidth / zoom
		ctx.strokeStyle = dv.strokeColor
		ctx.strokeRect(x, y, w, h)
	}
}
