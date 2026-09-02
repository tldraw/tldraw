import { OverlayUtil, strokeShapeIndicators, TLOverlay, TLShapeId } from '@tldraw/editor'

/** @public */
export interface TLCollaboratorShapeIndicatorOverlay extends TLOverlay {
	props: {
		// One entry per peer, batching the shape IDs they have selected so the
		// renderer can issue a single stroke call per collaborator.
		indicators: Array<{ color: string; shapeIds: TLShapeId[] }>
	}
}

/**
 * Overlay util for remote collaborators' shape selection indicators.
 *
 * Renders a per-peer outline around each shape another user has selected,
 * using the peer's color. Drawn under the local `ShapeIndicatorOverlayUtil`
 * (lower z-index) so the local user's selection always appears on top.
 *
 * Non-interactive: contributes no hit-test geometry.
 *
 * @public
 */
export class CollaboratorShapeIndicatorOverlayUtil extends OverlayUtil<TLCollaboratorShapeIndicatorOverlay> {
	static override type = 'collaborator_shape_indicator'
	override options = { zIndex: 49, lineWidth: 1.5, alpha: 0.7 }

	override isActive(): boolean {
		return this.editor
			.getVisibleCollaboratorsOnCurrentPage()
			.some((presence) => presence.selectedShapeIds.length > 0)
	}

	override getOverlays(): TLCollaboratorShapeIndicatorOverlay[] {
		const editor = this.editor
		const selectedPresences = editor
			.getVisibleCollaboratorsOnCurrentPage()
			.filter((presence) => presence.selectedShapeIds.length > 0)
		if (selectedPresences.length === 0) return []

		const renderingShapeIds = new Set(editor.getRenderingShapes().map((s) => s.id))

		const indicators: TLCollaboratorShapeIndicatorOverlay['props']['indicators'] = []
		for (const presence of selectedPresences) {
			const visibleShapeIds = presence.selectedShapeIds.filter(
				(id) => renderingShapeIds.has(id) && !editor.isShapeHidden(id)
			)
			if (visibleShapeIds.length === 0) continue
			indicators.push({ color: presence.color, shapeIds: visibleShapeIds })
		}

		if (indicators.length === 0) return []

		return [
			{
				id: 'collaborator_shape_indicator',
				type: 'collaborator_shape_indicator',
				props: { indicators },
			},
		]
	}

	override render(
		ctx: CanvasRenderingContext2D,
		overlays: TLCollaboratorShapeIndicatorOverlay[]
	): void {
		const overlay = overlays[0]
		if (!overlay) return

		const editor = this.editor
		const zoom = editor.getZoomLevel()

		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		ctx.lineWidth = this.options.lineWidth / zoom
		ctx.globalAlpha = this.options.alpha

		// One stroke call per collaborator.
		for (const { color, shapeIds } of overlay.props.indicators) {
			ctx.strokeStyle = color
			strokeShapeIndicators(editor, ctx, shapeIds)
		}

		ctx.globalAlpha = 1
	}
}
