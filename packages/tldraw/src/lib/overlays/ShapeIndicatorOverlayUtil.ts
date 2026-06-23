import { OverlayUtil, strokeShapeIndicators, TLOverlay } from '@tldraw/editor'
import { computed } from '@tldraw/state'
import { TLShapeId } from '@tldraw/tlschema'

/** @public */
export interface TLShapeIndicatorOverlay extends TLOverlay {
	props: {
		idsToDisplay: TLShapeId[]
		hintingShapeIds: TLShapeId[]
	}
}

interface RelevantInstanceFlags {
	isChangingStyle: boolean
	isHoveringCanvas: boolean | null
	isCoarsePointer: boolean
}

/**
 * Overlay util for shape indicators — the selection / hover / hint outlines drawn
 * under the selection foreground. Paints local indicators in the theme's
 * selection color.
 *
 * Remote collaborator selection indicators are drawn by a separate overlay util
 * (e.g. `CollaboratorShapeIndicatorOverlayUtil` from `tldraw`) that runs at a
 * lower z-index so peer selections appear under the local indicators.
 *
 * Non-interactive: contributes no hit-test geometry.
 *
 * @public
 */
export class ShapeIndicatorOverlayUtil extends OverlayUtil<TLShapeIndicatorOverlay> {
	static override type = 'shape_indicator'
	override options = { zIndex: 50, lineWidth: 1.5, hintedLineWidth: 2.5 }

	// Narrow projection of instance state. Reading the full record would
	// re-fire getOverlays on every cursor move / brush update; gating on these
	// three booleans means we only re-fire when one of them actually flips.
	private _instanceFlags$ = computed<RelevantInstanceFlags>(
		'shape indicator instance flags',
		() => {
			const i = this.editor.getInstanceState()
			return {
				isChangingStyle: i.isChangingStyle,
				isHoveringCanvas: i.isHoveringCanvas,
				isCoarsePointer: i.isCoarsePointer,
			}
		},
		{
			isEqual: (a, b) =>
				a.isChangingStyle === b.isChangingStyle &&
				a.isHoveringCanvas === b.isHoveringCanvas &&
				a.isCoarsePointer === b.isCoarsePointer,
		}
	)

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLShapeIndicatorOverlay[] {
		const editor = this.editor
		const renderingShapeIds = new Set(editor.getRenderingShapes().map((s) => s.id))

		// Local selected / hovered indicators.
		const idsToDisplay: TLShapeId[] = []
		const { isChangingStyle, isHoveringCanvas, isCoarsePointer } = this._instanceFlags$.get()
		const isIdleOrEditing = editor.isInAny('select.idle', 'select.editing_shape')
		const isInSelectState = editor.isInAny(
			'select.brushing',
			'select.scribble_brushing',
			'select.pointing_shape',
			'select.pointing_selection',
			'select.pointing_handle',
			'select.pointing_resize_handle',
			'select.pointing_rotate_handle'
		)

		if (!isChangingStyle && (isIdleOrEditing || isInSelectState)) {
			for (const id of editor.getSelectedShapeIds()) {
				if (renderingShapeIds.has(id)) idsToDisplay.push(id)
			}
			if (isIdleOrEditing && isHoveringCanvas && !isCoarsePointer) {
				const hovered = editor.getHoveredShapeId()
				if (hovered && renderingShapeIds.has(hovered) && !idsToDisplay.includes(hovered)) {
					idsToDisplay.push(hovered)
				}
			}
		}

		// Hinted shapes (drawn thicker). Already deduped at write time in
		// `updateHintingShapeIds`, so no need to dedupe again here.
		const hintingShapeIds: TLShapeId[] = []
		for (const id of editor.getHintingShapeIds()) {
			if (renderingShapeIds.has(id)) hintingShapeIds.push(id)
		}

		if (idsToDisplay.length === 0 && hintingShapeIds.length === 0) {
			return []
		}

		return [
			{
				id: 'shape_indicator',
				type: 'shape_indicator',
				props: { idsToDisplay, hintingShapeIds },
			},
		]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLShapeIndicatorOverlay[]): void {
		const overlay = overlays[0]
		if (!overlay) return

		const editor = this.editor
		const zoom = editor.getZoomLevel()
		const { idsToDisplay, hintingShapeIds } = overlay.props

		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'

		// Local selected / hovered indicators — one stroke call for the whole batch.
		ctx.strokeStyle = editor.getCurrentTheme().colors[editor.getColorMode()].selectionStroke
		ctx.lineWidth = this.options.lineWidth / zoom
		strokeShapeIndicators(editor, ctx, idsToDisplay)

		// Hinted shapes — thicker stroke, one call for the whole batch.
		if (hintingShapeIds.length > 0) {
			ctx.lineWidth = this.options.hintedLineWidth / zoom
			strokeShapeIndicators(editor, ctx, hintingShapeIds)
		}
	}
}
