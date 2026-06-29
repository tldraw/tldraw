import { DEFAULT_THEME, OverlayUtil, TLOverlay } from 'tldraw'
import { projectiles$ } from '../game-state'

interface TLProjectileOverlay extends TLOverlay {
	props: { x: number; y: number; radius: number }
}

// The auto-fired projectiles. Also a per-frame canvas layer, drawn above the
// enemies so hits read clearly.
export class ProjectileOverlayUtil extends OverlayUtil<TLProjectileOverlay> {
	static override type = 'vs-projectile'
	override options = { zIndex: 260 }

	override isActive(): boolean {
		return projectiles$.get().length > 0
	}

	override getOverlays(): TLProjectileOverlay[] {
		return projectiles$.get().map((p) => ({
			id: `vs-projectile:${p.id}`,
			type: 'vs-projectile',
			props: { x: p.x, y: p.y, radius: p.radius },
		}))
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLProjectileOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const theme =
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light

		for (const { props } of overlays) {
			const { x, y, radius } = props
			ctx.beginPath()
			ctx.arc(x, y, radius, 0, Math.PI * 2)
			ctx.fillStyle = theme.orange.solid
			ctx.fill()
			ctx.lineWidth = 1.5 / zoom
			ctx.strokeStyle = theme.yellow.solid
			ctx.stroke()
		}
	}
}
