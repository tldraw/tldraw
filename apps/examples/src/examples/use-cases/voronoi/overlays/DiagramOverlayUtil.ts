import { DEFAULT_THEME, OverlayUtil, TLOverlay, TLThemeDefaultColors } from 'tldraw'
import { CELL_INSET, COLOR_FOR_OWNER, SITE_R } from '../constants'
import { preview$, sites$ } from '../game-state'
import { traceSmooth } from '../smooth'
import { insetPolygon } from '../voronoi'

interface TLDiagramOverlay extends TLOverlay {
	props: Record<string, never>
}

// The site markers and the live hover preview. Cells are real tldraw shapes, but
// the site dots and the cell-you'd-claim preview update interactively, so they're
// drawn on the overlay canvas.
export class DiagramOverlayUtil extends OverlayUtil<TLDiagramOverlay> {
	static override type = 'vor-diagram'
	override options = { zIndex: 220 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLDiagramOverlay[] {
		return [{ id: 'vor-diagram:0', type: 'vor-diagram', props: {} }]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const zoom = this.editor.getZoomLevel()
		const theme = (
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		) as TLThemeDefaultColors

		// Hover preview: the cell a placement would carve out.
		const preview = preview$.get()
		if (preview && preview.poly.length >= 3) {
			const palette = preview.valid ? theme.blue : theme.grey
			traceSmooth(ctx, insetPolygon(preview.poly, CELL_INSET))
			ctx.fillStyle = palette.solid
			ctx.globalAlpha = preview.valid ? 0.3 : 0.12
			ctx.fill()
			ctx.globalAlpha = 1
			if (!preview.valid) {
				ctx.lineWidth = 1.5 / zoom
				ctx.strokeStyle = palette.solid
				ctx.setLineDash([6 / zoom, 5 / zoom])
				ctx.stroke()
				ctx.setLineDash([])
			}
		}

		// Site markers, drawn over their cells.
		for (const s of sites$.get()) {
			const palette = theme[COLOR_FOR_OWNER[s.owner] as 'blue']
			ctx.beginPath()
			ctx.arc(s.x, s.y, SITE_R, 0, Math.PI * 2)
			ctx.fillStyle = palette.solid
			ctx.fill()
			ctx.lineWidth = 2 / zoom
			ctx.strokeStyle = theme.background
			ctx.stroke()
		}
	}
}
