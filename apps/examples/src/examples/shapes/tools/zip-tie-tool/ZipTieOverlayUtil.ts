import { OverlayUtil, TLOverlay, VecModel } from 'tldraw'
import { CuttingState } from './ZipTieTool'

interface TLZipTieOverlay extends TLOverlay {
	props: {
		start: VecModel
		end: VecModel
		hits: VecModel[]
	}
}

export class ZipTieOverlayUtil extends OverlayUtil<TLZipTieOverlay> {
	static override type = 'zip-tie-cut'

	override isActive() {
		return this.editor.isIn('zip-tie.cutting')
	}

	override getOverlays(): TLZipTieOverlay[] {
		const cutting = this.editor.getStateDescendant<CuttingState>('zip-tie.cutting')
		const line = cutting?.line.get()
		if (!cutting || !line) return []

		return [
			{
				id: 'zip-tie-cut',
				type: 'zip-tie-cut',
				props: {
					start: line.start,
					end: line.end,
					hits: cutting.hits.get().map((hit) => hit.point),
				},
			},
		]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLZipTieOverlay[]) {
		const overlay = overlays[0]
		if (!overlay) return

		const { start, end, hits } = overlay.props
		const zoom = this.editor.getZoomLevel()
		const colors = this.editor.getCurrentTheme().colors[this.editor.getColorMode()]

		ctx.strokeStyle = colors.selectionStroke
		ctx.lineWidth = 1.5 / zoom
		ctx.lineCap = 'round'
		ctx.setLineDash([4 / zoom, 4 / zoom])
		ctx.beginPath()
		ctx.moveTo(start.x, start.y)
		ctx.lineTo(end.x, end.y)
		ctx.stroke()
		ctx.setLineDash([])

		ctx.fillStyle = colors.selectionStroke
		for (const hit of hits) {
			ctx.beginPath()
			ctx.arc(hit.x, hit.y, 3.5 / zoom, 0, Math.PI * 2)
			ctx.fill()
		}
	}
}
