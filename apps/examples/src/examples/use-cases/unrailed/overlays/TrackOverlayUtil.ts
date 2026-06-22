import { OverlayUtil, TLOverlay } from 'tldraw'
import { TILE } from '../constants'
import { frame$, world } from '../game-state'
import { samplePath } from '../path'

interface TLTrackOverlay extends TLOverlay {
	props: { frame: number }
}

const TIE_SPACING = TILE * 0.5
const TIE_HALF = TILE * 0.22

// Cross-ties drawn perpendicular to the drawn track line, so whatever curve the
// player sketches reads as a railroad. The player's own ink stays the rail.
export class TrackOverlayUtil extends OverlayUtil<TLTrackOverlay> {
	static override type = 'unrailed-track'
	override options = { zIndex: 100 }

	override isActive(): boolean {
		return world.path.length > 0
	}

	override getOverlays(): TLTrackOverlay[] {
		return [{ id: 'unrailed-track:main', type: 'unrailed-track', props: { frame: frame$.get() } }]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const zoom = this.editor.getZoomLevel()
		const isDark = this.editor.getColorMode() === 'dark'
		ctx.save()
		ctx.strokeStyle = isDark ? 'rgba(220,220,230,0.5)' : 'rgba(40,40,50,0.55)'
		ctx.lineWidth = 2.5 / zoom
		ctx.lineCap = 'round'
		const len = world.path.length
		for (let s = TIE_SPACING * 0.5; s < len; s += TIE_SPACING) {
			const p = samplePath(world.path, s)
			const nx = -Math.sin(p.angle)
			const ny = Math.cos(p.angle)
			ctx.beginPath()
			ctx.moveTo(p.x - nx * TIE_HALF, p.y - ny * TIE_HALF)
			ctx.lineTo(p.x + nx * TIE_HALF, p.y + ny * TIE_HALF)
			ctx.stroke()
		}
		ctx.restore()
	}
}
