import { OverlayUtil, TLOverlay } from 'tldraw'
import { CONNECT_RADIUS, TILE } from '../constants'
import { frame$, world } from '../game-state'
import { pathHead } from '../path'

interface TLHeadHintOverlay extends TLOverlay {
	props: { frame: number }
}

// A pulsing ring at the track head telling the player where to start their next
// stroke, plus a red flash when a stroke was rejected.
export class HeadHintOverlayUtil extends OverlayUtil<TLHeadHintOverlay> {
	static override type = 'unrailed-head'
	override options = { zIndex: 130 }

	override isActive(): boolean {
		return !world.gameOver
	}

	override getOverlays(): TLHeadHintOverlay[] {
		return [{ id: 'unrailed-head:main', type: 'unrailed-head', props: { frame: frame$.get() } }]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const zoom = this.editor.getZoomLevel()
		const f = frame$.get()

		// Reject flash.
		if (world.flash) {
			const left = world.flash.until - world.elapsedMs
			ctx.save()
			ctx.globalAlpha = Math.max(0, Math.min(0.6, left / 450))
			ctx.strokeStyle = '#e03131'
			ctx.lineWidth = 4 / zoom
			ctx.beginPath()
			ctx.arc(world.flash.x, world.flash.y, TILE * 0.4, 0, Math.PI * 2)
			ctx.stroke()
			ctx.restore()
		}

		// Pulsing "draw from here" ring at the track head.
		const head = pathHead(world.path)
		const pulse = 0.5 + 0.5 * Math.sin(f * 0.1)
		ctx.save()
		ctx.globalAlpha = 0.4 + 0.4 * pulse
		ctx.strokeStyle = world.budget >= 1 ? '#2f9e44' : '#f08c00'
		ctx.lineWidth = 2.5 / zoom
		ctx.setLineDash([7 / zoom, 5 / zoom])
		ctx.beginPath()
		ctx.arc(head.x, head.y, CONNECT_RADIUS * (0.7 + 0.15 * pulse), 0, Math.PI * 2)
		ctx.stroke()
		ctx.restore()
	}
}
