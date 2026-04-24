import { createComputedCache } from '@tldraw/store'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { dedupe } from '@tldraw/utils'
import type { Editor } from '../Editor'
import { OverlayUtil, TLOverlay } from './OverlayUtil'

/** @public */
export interface TLShapeIndicatorOverlay extends TLOverlay {
	props: {
		idsToDisplay: TLShapeId[]
		hintingShapeIds: TLShapeId[]
		collaboratorIndicators: Array<{ color: string; shapeIds: TLShapeId[] }>
	}
}

const indicatorPathCache = createComputedCache(
	'shapeIndicatorPath',
	(editor: Editor, shape: TLShape) => {
		const util = editor.getShapeUtil(shape)
		return util.getIndicatorPath(shape)
	}
)

/**
 * Overlay util for shape indicators — the selection / hover / hint outlines drawn
 * under the selection foreground. Paints local indicators in the theme's
 * selection color and remote collaborator indicators in each peer's color.
 *
 * Non-interactive: contributes no hit-test geometry.
 *
 * @public
 */
export class ShapeIndicatorOverlayUtil extends OverlayUtil<TLShapeIndicatorOverlay> {
	static override type = 'shape_indicator'
	override options = { zIndex: 50, lineWidth: 1.5, hintedLineWidth: 2.5 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLShapeIndicatorOverlay[] {
		const editor = this.editor
		const renderingShapeIds = new Set(editor.getRenderingShapes().map((s) => s.id))

		// Local selected / hovered indicators.
		const idsToDisplay: TLShapeId[] = []
		const instanceState = editor.getInstanceState()
		const isChangingStyle = instanceState.isChangingStyle
		const isIdleOrEditing = editor.isInAny('select.idle', 'select.editing_shape')
		const isInSelectState = editor.isInAny(
			'select.brushing',
			'select.scribble_brushing',
			'select.pointing_shape',
			'select.pointing_selection',
			'select.pointing_handle'
		)

		if (!isChangingStyle && (isIdleOrEditing || isInSelectState)) {
			for (const id of editor.getSelectedShapeIds()) {
				if (renderingShapeIds.has(id)) idsToDisplay.push(id)
			}
			if (isIdleOrEditing && instanceState.isHoveringCanvas && !instanceState.isCoarsePointer) {
				const hovered = editor.getHoveredShapeId()
				if (hovered && renderingShapeIds.has(hovered) && !idsToDisplay.includes(hovered)) {
					idsToDisplay.push(hovered)
				}
			}
		}

		// Hinted shapes (drawn thicker). Deduped so repeated entries don't overdraw.
		const hintingShapeIds = dedupe(editor.getHintingShapeIds()).filter((id) =>
			renderingShapeIds.has(id)
		)

		// Remote collaborator indicators (only currently-visible peers).
		const collaboratorIndicators: TLShapeIndicatorOverlay['props']['collaboratorIndicators'] = []
		for (const presence of editor.getVisibleCollaboratorsOnCurrentPage()) {
			const visibleShapeIds = presence.selectedShapeIds.filter(
				(id) => renderingShapeIds.has(id) && !editor.isShapeHidden(id)
			)
			if (visibleShapeIds.length === 0) continue

			collaboratorIndicators.push({ color: presence.color, shapeIds: visibleShapeIds })
		}

		if (
			idsToDisplay.length === 0 &&
			hintingShapeIds.length === 0 &&
			collaboratorIndicators.length === 0
		) {
			return []
		}

		return [
			{
				id: 'shape_indicator',
				type: 'shape_indicator',
				props: { idsToDisplay, hintingShapeIds, collaboratorIndicators },
			},
		]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLShapeIndicatorOverlay[]): void {
		const overlay = overlays[0]
		if (!overlay) return

		const editor = this.editor
		const zoom = editor.getZoomLevel()
		const { idsToDisplay, hintingShapeIds, collaboratorIndicators } = overlay.props

		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'

		// Remote collaborator indicators — under local indicators, slightly transparent.
		// One stroke call per collaborator (per unique color).
		ctx.lineWidth = this.options.lineWidth / zoom
		ctx.globalAlpha = 0.7
		for (const collaborator of collaboratorIndicators) {
			ctx.strokeStyle = collaborator.color
			this._strokeIndicatorBatch(ctx, collaborator.shapeIds)
		}
		ctx.globalAlpha = 1.0

		// Local selected / hovered indicators — one stroke call for the whole batch.
		ctx.strokeStyle = editor.getCurrentTheme().colors[editor.getColorMode()].selectionStroke
		ctx.lineWidth = this.options.lineWidth / zoom
		this._strokeIndicatorBatch(ctx, idsToDisplay)

		// Hinted shapes — thicker stroke, one call for the whole batch.
		if (hintingShapeIds.length > 0) {
			ctx.lineWidth = this.options.hintedLineWidth / zoom
			this._strokeIndicatorBatch(ctx, hintingShapeIds)
		}
	}

	// Combine every batchable shape indicator into a single page-space Path2D
	// and emit one stroke call. Shapes whose indicator needs an evenodd clip
	// (e.g. arrows with labels or complex arrowheads) can't be batched — they
	// still stroke individually inside a save/restore with ctx.clip applied.
	private _strokeIndicatorBatch(ctx: CanvasRenderingContext2D, shapeIds: TLShapeId[]): void {
		if (shapeIds.length === 0) return

		const editor = this.editor
		const batched = new Path2D()

		for (const shapeId of shapeIds) {
			const shape = editor.getShape(shapeId)
			if (!shape || shape.isLocked) continue

			const pageTransform = editor.getShapePageTransform(shape)
			if (!pageTransform) continue

			const indicatorPath = indicatorPathCache.get(editor, shape.id)
			if (!indicatorPath) continue

			if (indicatorPath instanceof Path2D) {
				batched.addPath(indicatorPath, pageTransform)
				continue
			}

			const { path, clipPath, additionalPaths } = indicatorPath

			if (!clipPath) {
				// No clip: the main path and any additional paths can all join
				// the batch directly.
				batched.addPath(path, pageTransform)
				if (additionalPaths) {
					for (const p of additionalPaths) batched.addPath(p, pageTransform)
				}
				continue
			}

			// Clipped case: fall back to an individual stroke. Rare (arrows with
			// labels / complex arrowheads), so the extra save/restore/stroke
			// pair per such shape isn't worth batching away.
			ctx.save()
			ctx.transform(
				pageTransform.a,
				pageTransform.b,
				pageTransform.c,
				pageTransform.d,
				pageTransform.e,
				pageTransform.f
			)
			ctx.save()
			ctx.clip(clipPath, 'evenodd')
			ctx.stroke(path)
			ctx.restore()
			if (additionalPaths) {
				for (const p of additionalPaths) ctx.stroke(p)
			}
			ctx.restore()
		}

		ctx.stroke(batched)
	}
}
