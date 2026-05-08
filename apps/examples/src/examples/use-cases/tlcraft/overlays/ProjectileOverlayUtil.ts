import { OverlayUtil, TLOverlay } from 'tldraw'
import { projectiles$ } from '../game-state'

interface TLProjectileOverlay extends TLOverlay {
	props: { x: number; y: number; angle: number }
}

// Tower arrows in flight.
export class ProjectileOverlayUtil extends OverlayUtil<TLProjectileOverlay> {
	static override type = 'tlc-projectile'
	override options = { zIndex: 240 }

	override isActive(): boolean {
		return projectiles$.get().length > 0
	}

	override getOverlays(): TLProjectileOverlay[] {
		return projectiles$.get().map((p) => ({
			id: `tlc-projectile:${p.id}`,
			type: 'tlc-projectile',
			props: { x: p.x, y: p.y, angle: Math.atan2(p.vy, p.vx) },
		}))
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLProjectileOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const isDark = this.editor.getColorMode() === 'dark'
		for (const o of overlays) {
			const { x, y, angle } = o.props
			ctx.save()
			ctx.translate(x, y)
			ctx.rotate(angle)
			ctx.lineWidth = 2 / zoom
			ctx.strokeStyle = isDark ? '#ddd' : '#222'
			ctx.beginPath()
			ctx.moveTo(-12, 0)
			ctx.lineTo(8, 0)
			ctx.stroke()
			ctx.beginPath()
			ctx.moveTo(8, 0)
			ctx.lineTo(2, -3)
			ctx.lineTo(2, 3)
			ctx.closePath()
			ctx.fillStyle = isDark ? '#ddd' : '#222'
			ctx.fill()
			ctx.restore()
		}
	}
}
