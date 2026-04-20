import { OverlayUtil, TLOverlay } from '@tldraw/editor'

/** @public */
export interface TLCollaboratorBrushOverlay extends TLOverlay {
	props: {
		x: number
		y: number
		w: number
		h: number
		color: string
	}
}

/**
 * Overlay util for collaborator selection brushes.
 *
 * @public
 */
export class CollaboratorBrushOverlayUtil extends OverlayUtil<TLCollaboratorBrushOverlay> {
	static override type = 'collaborator_brush'
	override options = { zIndex: 700 }

	override isActive(): boolean {
		return this.editor.getCollaboratorsOnCurrentPage().some((c) => c.brush !== null)
	}

	override getOverlays(): TLCollaboratorBrushOverlay[] {
		const overlays: TLCollaboratorBrushOverlay[] = []
		for (const presence of this.editor.getCollaboratorsOnCurrentPage()) {
			const { brush, color, userId } = presence
			if (!brush) continue
			overlays.push({
				id: `collaborator_brush:${userId}`,
				type: 'collaborator_brush',
				props: {
					x: brush.x,
					y: brush.y,
					w: Math.max(1, brush.w),
					h: Math.max(1, brush.h),
					color,
				},
			})
		}
		return overlays
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLCollaboratorBrushOverlay[]): void {
		const zoom = this.editor.getEfficientZoomLevel()
		for (const overlay of overlays) {
			const { x, y, w, h, color } = overlay.props

			// Fill with semi-opaque color
			ctx.globalAlpha = 0.75
			ctx.fillStyle = color
			ctx.fillRect(x, y, w, h)

			// Stroke with lower alpha; avoid path creation via strokeRect
			ctx.globalAlpha = 0.1
			ctx.strokeStyle = color
			ctx.lineWidth = 1 / zoom
			ctx.strokeRect(x, y, w, h)

			ctx.globalAlpha = 1
		}
	}
}
