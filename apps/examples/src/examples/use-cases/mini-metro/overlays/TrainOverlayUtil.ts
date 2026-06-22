import { DEFAULT_THEME, OverlayUtil, TLOverlay, TLThemeDefaultColors } from 'tldraw'
import { LineColor, StationShape } from '../constants'
import { trains$ } from '../game-state'
import { traceShape } from '../sketch'

interface TLTrainOverlay extends TLOverlay {
	props: {
		id: number
		color: LineColor
		x: number
		y: number
		passengers: StationShape[]
	}
}

// The trains, drawn in their line's colour with their onboard passengers shown
// as little shapes. They move every frame, so they live on the overlay canvas
// rather than as real shapes.
export class TrainOverlayUtil extends OverlayUtil<TLTrainOverlay> {
	static override type = 'mm-train'
	override options = { zIndex: 230 }

	override isActive(): boolean {
		return trains$.get().length > 0
	}

	override getOverlays(): TLTrainOverlay[] {
		return trains$.get().map((t) => ({ id: `mm-train:${t.id}`, type: 'mm-train', props: t }))
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLTrainOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const theme = (
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		) as TLThemeDefaultColors

		const w = 30
		const h = 18
		const r = 5

		for (const { props } of overlays) {
			const { x, y, color, passengers } = props
			const palette = theme[color]

			// Rounded-rectangle carriage in the line colour.
			roundRect(ctx, x - w / 2, y - h / 2, w, h, r)
			ctx.fillStyle = palette.solid
			ctx.fill()
			ctx.lineWidth = 2 / zoom
			ctx.strokeStyle = palette.solid
			ctx.stroke()

			// Onboard passengers as a little row of shapes.
			const size = 3.5
			const cols = Math.min(passengers.length, 3)
			for (let i = 0; i < passengers.length && i < 6; i++) {
				const col = i % 3
				const row = Math.floor(i / 3)
				const px = x - (cols - 1) * 4 + col * 8
				const py = y - 4 + row * 8
				traceShape(ctx, passengers[i], px, py, size)
				ctx.fillStyle = theme.background
				ctx.fill()
			}
		}
	}
}

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
) {
	ctx.beginPath()
	ctx.moveTo(x + r, y)
	ctx.arcTo(x + w, y, x + w, y + h, r)
	ctx.arcTo(x + w, y + h, x, y + h, r)
	ctx.arcTo(x, y + h, x, y, r)
	ctx.arcTo(x, y, x + w, y, r)
	ctx.closePath()
}
