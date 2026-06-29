import { DEFAULT_THEME, OverlayUtil, TLOverlay } from 'tldraw'
import { gems$ } from '../game-state'
import { sketchDiamond } from '../sketch'

interface TLGemOverlay extends TLOverlay {
	props: { x: number; y: number }
}

const GEM_R = 8

// XP gems dropped by dead enemies. Drawn as little rotated squares (diamonds) in
// tldraw green, beneath the enemies and projectiles.
export class GemOverlayUtil extends OverlayUtil<TLGemOverlay> {
	static override type = 'vs-gem'
	override options = { zIndex: 150 }

	override isActive(): boolean {
		return gems$.get().length > 0
	}

	override getOverlays(): TLGemOverlay[] {
		return gems$.get().map((g) => ({
			id: `vs-gem:${g.id}`,
			type: 'vs-gem',
			props: { x: g.x, y: g.y },
		}))
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLGemOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const theme =
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		const r = GEM_R

		ctx.lineJoin = 'round'
		for (const { props } of overlays) {
			const { x, y } = props
			sketchDiamond(ctx, x, y, r)
			ctx.fillStyle = theme.green.solid
			ctx.fill()
			ctx.lineWidth = 1.5 / zoom
			ctx.strokeStyle = theme.green.fill
			ctx.stroke()
		}
	}
}
