import { OverlayUtil, TLOverlay } from 'tldraw'
import { projectiles$ } from '../game-state'
import { ProjectileKind } from '../tower-config'

interface TLProjectileOverlay extends TLOverlay {
	props: {
		x: number
		y: number
		angle: number
		kind: ProjectileKind
	}
}

export class ProjectileOverlayUtil extends OverlayUtil<TLProjectileOverlay> {
	static override type = 'td-projectile'
	override options = { zIndex: 250 }

	override isActive(): boolean {
		return projectiles$.get().length > 0
	}

	override getOverlays(): TLProjectileOverlay[] {
		return projectiles$.get().map((p) => ({
			id: `td-projectile:${p.id}`,
			type: 'td-projectile',
			props: {
				x: p.x,
				y: p.y,
				angle: Math.atan2(p.vy, p.vx),
				kind: p.kind,
			},
		}))
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLProjectileOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const isDark = this.editor.getColorMode() === 'dark'
		for (const overlay of overlays) {
			const { x, y, angle, kind } = overlay.props
			ctx.save()
			ctx.translate(x, y)
			ctx.rotate(angle)
			switch (kind) {
				case 'arrow':
					ctx.lineWidth = 2 / zoom
					ctx.strokeStyle = isDark ? '#ddd' : '#222'
					ctx.beginPath()
					ctx.moveTo(-10, 0)
					ctx.lineTo(8, 0)
					ctx.stroke()
					ctx.beginPath()
					ctx.moveTo(8, 0)
					ctx.lineTo(2, -3)
					ctx.lineTo(2, 3)
					ctx.closePath()
					ctx.fillStyle = isDark ? '#ddd' : '#222'
					ctx.fill()
					break
				case 'rock':
					ctx.beginPath()
					ctx.arc(0, 0, 6, 0, Math.PI * 2)
					ctx.fillStyle = '#806040'
					ctx.fill()
					ctx.lineWidth = 1.5 / zoom
					ctx.strokeStyle = '#3a2a1a'
					ctx.stroke()
					break
				case 'orb': {
					const grd = ctx.createRadialGradient(0, 0, 1, 0, 0, 8)
					grd.addColorStop(0, 'rgba(180, 220, 255, 1)')
					grd.addColorStop(1, 'rgba(80, 120, 220, 0.1)')
					ctx.fillStyle = grd
					ctx.beginPath()
					ctx.arc(0, 0, 8, 0, Math.PI * 2)
					ctx.fill()
					break
				}
			}
			ctx.restore()
		}
	}
}
