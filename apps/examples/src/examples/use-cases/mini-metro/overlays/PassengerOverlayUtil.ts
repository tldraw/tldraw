import { DEFAULT_THEME, OverlayUtil, TLOverlay } from 'tldraw'
import { STATION_R, StationShape } from '../constants'
import { stations$ } from '../game-state'
import { traceShape } from '../sketch'

interface TLPassengerOverlay extends TLOverlay {
	props: {
		id: number
		x: number
		y: number
		shape: StationShape
		waiting: StationShape[]
		overcrowd: number
	}
}

// Passengers waiting at each station, drawn as little shapes showing where they
// want to go, plus a warning ring that fills as a station overcrowds. Real
// stations are tldraw geo shapes; this layer is the per-frame stuff on top.
export class PassengerOverlayUtil extends OverlayUtil<TLPassengerOverlay> {
	static override type = 'mm-passenger'
	override options = { zIndex: 210 }

	override isActive(): boolean {
		return stations$.get().length > 0
	}

	override getOverlays(): TLPassengerOverlay[] {
		return stations$
			.get()
			.map((s) => ({ id: `mm-passenger:${s.id}`, type: 'mm-passenger', props: s }))
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLPassengerOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const theme =
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light

		ctx.lineJoin = 'round'
		const size = 6

		for (const { props } of overlays) {
			const { x, y, waiting, overcrowd } = props

			// Overcrowding warning ring, growing from a thin arc to a full red circle.
			if (overcrowd > 0) {
				ctx.beginPath()
				ctx.arc(x, y, STATION_R + 8, -Math.PI / 2, -Math.PI / 2 + overcrowd * Math.PI * 2)
				ctx.lineWidth = 4 / zoom
				ctx.strokeStyle = theme.red.solid
				ctx.stroke()
			}

			// Waiting passengers, laid out in rows just outside the station.
			const startX = x + STATION_R + 8
			const startY = y - STATION_R + 4
			for (let i = 0; i < waiting.length; i++) {
				const col = i % 3
				const row = Math.floor(i / 3)
				const px = startX + col * (size * 2 + 2)
				const py = startY + row * (size * 2 + 2)
				traceShape(ctx, waiting[i], px, py, size)
				ctx.fillStyle = theme.text
				ctx.fill()
			}
		}
	}
}
