import { DEFAULT_THEME, OverlayUtil, TLOverlay } from 'tldraw'
import { enemies$ } from '../game-state'
import { sketchCircle } from '../sketch'

interface TLEnemyOverlay extends TLOverlay {
	props: { id: number; x: number; y: number; radius: number; hp: number; maxHp: number }
}

// The enemy swarm. This is the perf-intensive layer — potentially hundreds of
// entities moving every frame — so it lives on the single canvas overlay rather
// than as DOM shapes. Colors come from the tldraw palette so it reads as tldraw.
export class EnemyOverlayUtil extends OverlayUtil<TLEnemyOverlay> {
	static override type = 'vs-enemy'
	override options = { zIndex: 200 }

	override isActive(): boolean {
		return enemies$.get().length > 0
	}

	override getOverlays(): TLEnemyOverlay[] {
		return enemies$.get().map((e) => ({
			id: `vs-enemy:${e.id}`,
			type: 'vs-enemy',
			props: { id: e.id, x: e.x, y: e.y, radius: e.radius, hp: e.hp, maxHp: e.maxHp },
		}))
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLEnemyOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const theme =
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light

		ctx.lineJoin = 'round'
		for (const { props } of overlays) {
			const { id, x, y, radius, hp, maxHp } = props
			const wounded = 1 - Math.max(0, Math.min(1, hp / maxHp))

			// Hand-drawn body, in the tldraw sketch style.
			sketchCircle(ctx, x, y, radius, id)
			ctx.fillStyle = theme.red.semi
			ctx.fill()
			ctx.lineWidth = 2.5 / zoom
			ctx.strokeStyle = theme.red.solid
			ctx.stroke()

			// A darkening core that grows as the enemy loses HP, so damage reads at
			// a glance without a separate health bar cluttering the swarm.
			if (wounded > 0) {
				sketchCircle(ctx, x, y, radius * 0.6 * wounded, id + 1)
				ctx.fillStyle = theme.red.solid
				ctx.fill()
			}
		}
	}
}
