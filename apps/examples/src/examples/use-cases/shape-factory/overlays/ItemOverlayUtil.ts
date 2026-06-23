import { DEFAULT_THEME, OverlayUtil, TLOverlay, TLThemeDefaultColors } from 'tldraw'
import { ITEM_R, ItemColor, ItemShape } from '../constants'
import { items$ } from '../game-state'
import { traceShape } from '../shapes'

interface TLItemOverlay extends TLOverlay {
	props: {
		id: number
		shape: ItemShape
		color: ItemColor
		x: number
		y: number
	}
}

// The items travelling the belts, drawn as little tldraw-palette shapes. They
// move every frame, so they live on the overlay canvas rather than as real
// shapes.
export class ItemOverlayUtil extends OverlayUtil<TLItemOverlay> {
	static override type = 'sf-item'
	override options = { zIndex: 220 }

	override isActive(): boolean {
		return items$.get().length > 0
	}

	override getOverlays(): TLItemOverlay[] {
		return items$.get().map((it) => ({ id: `sf-item:${it.id}`, type: 'sf-item', props: it }))
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLItemOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const theme = (
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		) as TLThemeDefaultColors

		for (const { props } of overlays) {
			const palette = theme[props.color]
			traceShape(ctx, props.shape, props.x, props.y, ITEM_R)
			ctx.fillStyle = palette.solid
			ctx.fill()
			ctx.lineWidth = 1.5 / zoom
			ctx.strokeStyle = palette.fill
			ctx.stroke()
		}
	}
}
