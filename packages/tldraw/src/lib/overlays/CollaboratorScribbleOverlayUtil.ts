import { EASINGS, OverlayUtil, TLOverlay, TLScribble, getSvgPathFromPoints } from '@tldraw/editor'
import { getStroke } from '../shapes/shared/freehand/getStroke'

/** @public */
export interface TLCollaboratorScribbleOverlay extends TLOverlay {
	props: {
		scribble: TLScribble
		color: string
	}
}

/**
 * Overlay util for collaborator scribble strokes (eraser, lasso, etc.).
 *
 * @public
 */
export class CollaboratorScribbleOverlayUtil extends OverlayUtil<TLCollaboratorScribbleOverlay> {
	static override type = 'collaborator_scribble'

	override isActive(): boolean {
		return this.editor.getCollaboratorsOnCurrentPage().some((c) => c.scribbles.length > 0)
	}

	override getOverlays(): TLCollaboratorScribbleOverlay[] {
		const overlays: TLCollaboratorScribbleOverlay[] = []
		for (const presence of this.editor.getCollaboratorsOnCurrentPage()) {
			const { scribbles, color, userId } = presence
			for (const scribble of scribbles) {
				overlays.push({
					id: `collaborator_scribble:${userId}:${scribble.id}`,
					type: 'collaborator_scribble',
					props: { scribble, color },
				})
			}
		}
		return overlays
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLCollaboratorScribbleOverlay[]): void {
		const zoom = this.editor.getEfficientZoomLevel()

		for (const overlay of overlays) {
			const { scribble, color } = overlay.props
			if (!scribble.points.length) continue

			const stroke = getStroke(scribble.points, {
				size: scribble.size / zoom,
				start: { taper: scribble.taper, easing: EASINGS.linear },
				last: scribble.state === 'complete' || scribble.state === 'stopping',
				simulatePressure: false,
				streamline: 0.32,
			})

			let d: string
			if (stroke.length < 4) {
				const r = scribble.size / zoom / 2
				const { x, y } = scribble.points[scribble.points.length - 1]
				d = `M ${x - r},${y} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`
			} else {
				d = getSvgPathFromPoints(stroke)
			}

			const path = new Path2D(d)
			ctx.fillStyle = color
			ctx.globalAlpha = scribble.color === 'laser' ? 0.5 : 0.1
			ctx.fill(path)
			ctx.globalAlpha = 1
		}
	}
}
