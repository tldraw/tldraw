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
	override options = { zIndex: 700, lineWidth: 1 }

	override isActive(): boolean {
		return this.editor.getVisibleCollaboratorsOnCurrentPage().some((c) => c.brush !== null)
	}

	override getOverlays(): TLCollaboratorBrushOverlay[] {
		const overlays: TLCollaboratorBrushOverlay[] = []
		for (const presence of this.editor.getVisibleCollaboratorsOnCurrentPage()) {
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
		const zoom = this.editor.getZoomLevel()
		for (const overlay of overlays) {
			const { x, y, w, h, color } = overlay.props

			// Match the old SVG path: brush fill at 0.75 modulated by a parent
			// opacity of 0.1 gave an effective fill alpha of 0.075.
			ctx.globalAlpha = 0.075
			ctx.fillStyle = color
			ctx.fillRect(x, y, w, h)

			// Stroke at 0.1 alpha matches the old parent opacity.
			ctx.globalAlpha = 0.1
			ctx.strokeStyle = color
			ctx.lineWidth = this.options.lineWidth / zoom
			ctx.strokeRect(x, y, w, h)

			ctx.globalAlpha = 1
		}
	}

	override renderMinimap(
		ctx: CanvasRenderingContext2D,
		overlays: TLCollaboratorBrushOverlay[]
	): void {
		for (const overlay of overlays) {
			const { x, y, w, h, color } = overlay.props
			ctx.globalAlpha = 0.75
			ctx.fillStyle = color
			ctx.fillRect(x, y, w, h)
		}
		ctx.globalAlpha = 1
	}
}
