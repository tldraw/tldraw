import { OverlayUtil, TLOverlay } from 'tldraw'
import { MAP_BOUNDS } from '../map'

interface TLMapOverlay extends TLOverlay {
	props: Record<string, never>
}

// The base layer: a grass-coloured rectangle with a faint tile grid so movement
// reads as motion across terrain. Always visible — `isActive` returns true.
export class MapOverlayUtil extends OverlayUtil<TLMapOverlay> {
	static override type = 'tlc-map'
	override options = { zIndex: 0 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLMapOverlay[] {
		return [{ id: 'tlc-map:main', type: 'tlc-map', props: {} }]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		// Don't fill the grass here — the overlay layer paints on top of shapes,
		// so a solid fill would hide every building the player places. The grass
		// colour comes from the .tldraw__editor background in tlcraft.css; this
		// overlay just adds the tile grid and the playable-area border on top.
		const isDark = this.editor.getColorMode() === 'dark'
		const { minX, minY, maxX, maxY } = MAP_BOUNDS
		const w = maxX - minX
		const h = maxY - minY

		ctx.save()
		ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'
		ctx.lineWidth = 1
		const tile = 50
		ctx.beginPath()
		for (let x = minX; x <= maxX; x += tile) {
			ctx.moveTo(x, minY)
			ctx.lineTo(x, maxY)
		}
		for (let y = minY; y <= maxY; y += tile) {
			ctx.moveTo(minX, y)
			ctx.lineTo(maxX, y)
		}
		ctx.stroke()

		ctx.lineWidth = 2
		ctx.strokeStyle = isDark ? '#3a5a44' : '#6a8c5e'
		ctx.strokeRect(minX, minY, w, h)
		ctx.restore()
	}
}
