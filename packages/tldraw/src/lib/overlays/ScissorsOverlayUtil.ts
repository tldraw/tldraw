import { getSvgPathFromPoints, OverlayUtil, TLOverlay } from '@tldraw/editor'
import { Cutting } from '../tools/ScissorsTool/childStates/Cutting'

/** @public */
export interface TLScissorsOverlay extends TLOverlay {
	props: {
		svgPath: string
	}
}

/**
 * Overlay util for the scissors tool's lasso.
 *
 * @public
 */
export class ScissorsOverlayUtil extends OverlayUtil<TLScissorsOverlay> {
	static override type = 'scissors'
	override options = { zIndex: 400 }

	override isActive(): boolean {
		return this.editor.isIn('scissors.cutting')
	}

	override getOverlays(): TLScissorsOverlay[] {
		const cutting = this.editor.getStateDescendant<Cutting>('scissors.cutting')
		const points = cutting?.points.get() ?? []
		if (points.length < 2) return []
		const svgPath = getSvgPathFromPoints(points, true)
		return [{ id: 'scissors', type: 'scissors', props: { svgPath } }]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLScissorsOverlay[]): void {
		const overlay = overlays[0]
		if (!overlay) return
		const zoom = this.editor.getZoomLevel()
		const colors = this.editor.getCurrentTheme().colors[this.editor.getColorMode()]
		const path = new Path2D(overlay.props.svgPath)

		ctx.globalAlpha = 0.25
		ctx.fillStyle = colors.selectionFill
		ctx.fill(path)
		ctx.globalAlpha = 1

		ctx.lineWidth = 1.5 / zoom
		ctx.setLineDash([6 / zoom, 4 / zoom])
		ctx.strokeStyle = colors.selectionStroke
		ctx.stroke(path)
		ctx.setLineDash([])
	}
}
