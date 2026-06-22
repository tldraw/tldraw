import { DEFAULT_THEME, OverlayUtil, TLOverlay, TLThemeDefaultColors } from 'tldraw'
import { LineColor, STATION_R } from '../constants'
import { drag$ } from '../game-state'

interface TLLinePreviewOverlay extends TLOverlay {
	props: {
		fromX: number
		fromY: number
		toX: number
		toY: number
		snapId: number | null
		color: LineColor | null
	}
}

// The rubber-band line shown while you drag from one station to another. It
// turns the line's colour and rings the target once the connection is valid.
export class LinePreviewOverlayUtil extends OverlayUtil<TLLinePreviewOverlay> {
	static override type = 'mm-line-preview'
	override options = { zIndex: 240 }

	override isActive(): boolean {
		return drag$.get() !== null
	}

	override getOverlays(): TLLinePreviewOverlay[] {
		const drag = drag$.get()
		if (!drag) return []
		return [{ id: 'mm-line-preview:current', type: 'mm-line-preview', props: drag }]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLLinePreviewOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const theme = (
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		) as TLThemeDefaultColors

		for (const { props } of overlays) {
			const { fromX, fromY, toX, toY, snapId, color } = props
			const stroke = color ? theme[color].solid : theme.grey.solid

			ctx.beginPath()
			ctx.moveTo(fromX, fromY)
			ctx.lineTo(toX, toY)
			ctx.lineCap = 'round'
			ctx.lineWidth = 7 / zoom
			ctx.globalAlpha = color ? 0.8 : 0.4
			ctx.strokeStyle = stroke
			ctx.stroke()
			ctx.globalAlpha = 1

			// Highlight the station the connection would snap to.
			if (snapId !== null) {
				ctx.beginPath()
				ctx.arc(toX, toY, STATION_R + 5, 0, Math.PI * 2)
				ctx.lineWidth = 3 / zoom
				ctx.strokeStyle = stroke
				ctx.stroke()
			}
		}
	}
}
