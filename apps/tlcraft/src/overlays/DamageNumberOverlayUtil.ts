import { OverlayUtil, TLOverlay } from 'tldraw'
import { damageNumbers$ } from '../game-state'

const DURATION_MS = 700

interface TLDamageNumberOverlay extends TLOverlay {
	props: { x: number; y: number; amount: number; ageMs: number }
}

// Floating "-12" numbers when something takes damage. Drift up and fade out
// over their lifetime.
export class DamageNumberOverlayUtil extends OverlayUtil<TLDamageNumberOverlay> {
	static override type = 'tlc-damage-num'
	override options = { zIndex: 250 }

	override isActive(): boolean {
		return damageNumbers$.get().length > 0
	}

	override getOverlays(): TLDamageNumberOverlay[] {
		return damageNumbers$.get().map((d) => ({
			id: `tlc-damage-num:${d.id}`,
			type: 'tlc-damage-num',
			props: { x: d.x, y: d.y, amount: d.amount, ageMs: d.ageMs },
		}))
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLDamageNumberOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		for (const o of overlays) {
			const { x, y, amount, ageMs } = o.props
			const t = Math.min(1, ageMs / DURATION_MS)
			const offsetY = -20 * t
			const alpha = 1 - t
			ctx.save()
			ctx.globalAlpha = alpha
			ctx.font = `700 ${14 / zoom}px sans-serif`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillStyle = '#fff'
			ctx.strokeStyle = '#000'
			ctx.lineWidth = 3 / zoom
			const text = `-${amount}`
			ctx.strokeText(text, x, y + offsetY)
			ctx.fillText(text, x, y + offsetY)
			ctx.restore()
		}
	}
}
