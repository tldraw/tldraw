import { OverlayUtil, TLOverlay } from 'tldraw'
import { getStrokePoints } from 'tldraw'
import { getSvgPathFromStrokePoints } from 'tldraw'
import { LassoingState } from './LassoSelectTool'

interface TLLassoOverlay extends TLOverlay {
	props: {
		svgPath: string
	}
}

export class LassoOverlayUtil extends OverlayUtil<TLLassoOverlay> {
	static override type = 'lasso'

	override isActive(): boolean {
		return this.editor.isIn('lasso-select.lassoing')
	}

	override getOverlays(): TLLassoOverlay[] {
		const lassoing = this.editor.getStateDescendant('lasso-select.lassoing') as LassoingState
		const points = lassoing.points.get()
		if (points.length === 0) return []

		const smoothedPoints = getStrokePoints(points)
		const svgPath = getSvgPathFromStrokePoints(smoothedPoints, true)
		if (!svgPath) return []

		return [
			{
				id: 'lasso',
				type: 'lasso',
				props: { svgPath },
			},
		]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLLassoOverlay[]): void {
		const overlay = overlays[0]
		if (!overlay) return

		const zoom = this.editor.getZoomLevel()
		const colors = this.editor.getCurrentTheme().colors[this.editor.getColorMode()]
		const path = new Path2D(overlay.props.svgPath)

		ctx.globalAlpha = 0.5
		ctx.fillStyle = colors.selectionFill
		ctx.fill(path)
		ctx.globalAlpha = 1

		ctx.lineWidth = 2 / zoom
		ctx.strokeStyle = colors.selectionStroke
		ctx.stroke(path)
	}
}
