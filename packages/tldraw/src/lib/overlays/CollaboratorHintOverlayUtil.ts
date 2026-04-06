import { OverlayUtil, TLOverlay, Vec, clamp } from '@tldraw/editor'

/** @public */
export interface TLCollaboratorHintOverlay extends TLOverlay {
	props: {
		/** Clamped point on viewport edge, in page coordinates */
		x: number
		y: number
		/** Rotation angle pointing toward the collaborator's actual cursor */
		rotation: number
		color: string
	}
}

/**
 * Overlay util for off-screen collaborator cursor hints.
 * Shows a small directional arrow at the viewport edge pointing toward the collaborator.
 *
 * @public
 */
export class CollaboratorHintOverlayUtil extends OverlayUtil<TLCollaboratorHintOverlay> {
	static override type = 'collaborator_hint'

	override isActive(): boolean {
		const viewport = this.editor.getViewportPageBounds()
		const zoom = this.editor.getZoomLevel()
		return this.editor.getCollaboratorsOnCurrentPage().some((c) => {
			if (!c.cursor) return false
			return !this._isCursorInViewport(c.cursor, viewport, zoom)
		})
	}

	override getOverlays(): TLCollaboratorHintOverlay[] {
		const overlays: TLCollaboratorHintOverlay[] = []
		const viewport = this.editor.getViewportPageBounds()
		const zoom = this.editor.getZoomLevel()

		for (const presence of this.editor.getCollaboratorsOnCurrentPage()) {
			const { cursor, color, userId } = presence
			if (!cursor) continue
			if (this._isCursorInViewport(cursor, viewport, zoom)) continue

			const pad = 5 / zoom
			const x = clamp(cursor.x, viewport.minX + pad, viewport.maxX - pad)
			const y = clamp(cursor.y, viewport.minY + pad, viewport.maxY - pad)
			const rotation = Vec.Angle(viewport.center, cursor)

			overlays.push({
				id: `collaborator_hint:${userId}`,
				type: 'collaborator_hint',
				props: { x, y, rotation, color },
			})
		}
		return overlays
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLCollaboratorHintOverlay[]): void {
		const zoom = this.editor.getEfficientZoomLevel()
		const scale = 1 / zoom

		for (const overlay of overlays) {
			const { x, y, rotation, color } = overlay.props

			ctx.save()
			ctx.translate(x, y)
			ctx.scale(scale, scale)
			ctx.rotate(rotation)

			// Arrow shape: same as the SVG "M -2,-5 2,0 -2,5 Z"
			ctx.beginPath()
			ctx.moveTo(-2, -5)
			ctx.lineTo(2, 0)
			ctx.lineTo(-2, 5)
			ctx.closePath()

			// Outline stroke (white background for contrast)
			ctx.lineWidth = 3
			ctx.strokeStyle = 'var(--tl-color-background)'
			// Canvas doesn't support CSS vars in strokeStyle; use white as fallback
			ctx.strokeStyle = '#ffffff'
			ctx.stroke()

			// Fill with collaborator color
			ctx.fillStyle = color
			ctx.fill()

			ctx.restore()
		}
	}

	/** @internal */
	_isCursorInViewport(
		cursor: { x: number; y: number },
		viewport: { minX: number; minY: number; maxX: number; maxY: number },
		zoom: number
	): boolean {
		return !(
			cursor.x < viewport.minX - 12 / zoom ||
			cursor.y < viewport.minY - 16 / zoom ||
			cursor.x > viewport.maxX - 12 / zoom ||
			cursor.y > viewport.maxY - 16 / zoom
		)
	}
}
