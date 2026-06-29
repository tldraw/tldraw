import { OverlayUtil, TLOverlay } from 'tldraw'
import { explosions$ } from '../game-state'

interface TLExplosionOverlay extends TLOverlay {
	props: {
		x: number
		y: number
		radius: number
		t: number // 0 = just spawned, 1 = about to expire
	}
}

export class ExplosionOverlayUtil extends OverlayUtil<TLExplosionOverlay> {
	static override type = 'td-explosion'
	override options = { zIndex: 230 }

	override isActive(): boolean {
		return explosions$.get().length > 0
	}

	override getOverlays(): TLExplosionOverlay[] {
		return explosions$.get().map((e) => ({
			id: `td-explosion:${e.id}`,
			type: 'td-explosion',
			props: {
				x: e.x,
				y: e.y,
				radius: e.radius,
				t: Math.min(1, e.ageMs / e.maxAgeMs),
			},
		}))
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLExplosionOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		ctx.save()
		for (const overlay of overlays) {
			const { x, y, radius, t } = overlay.props
			// Expanding ring + fading filled core.
			const ringR = radius * (0.4 + 0.6 * t)
			const alpha = 1 - t

			ctx.globalAlpha = alpha * 0.45
			const grd = ctx.createRadialGradient(x, y, 1, x, y, radius)
			grd.addColorStop(0, 'rgba(180, 220, 255, 1)')
			grd.addColorStop(0.6, 'rgba(120, 160, 240, 0.5)')
			grd.addColorStop(1, 'rgba(80, 120, 220, 0)')
			ctx.fillStyle = grd
			ctx.beginPath()
			ctx.arc(x, y, radius, 0, Math.PI * 2)
			ctx.fill()

			ctx.globalAlpha = alpha
			ctx.lineWidth = 3 / zoom
			ctx.strokeStyle = 'rgba(180, 220, 255, 1)'
			ctx.beginPath()
			ctx.arc(x, y, ringR, 0, Math.PI * 2)
			ctx.stroke()
		}
		ctx.restore()
	}
}
