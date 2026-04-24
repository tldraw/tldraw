import { createComputedCache } from '@tldraw/store'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { dedupe } from '@tldraw/utils'
import {
	getCollaboratorStateFromElapsedTime,
	shouldShowCollaborator,
} from '../../utils/collaboratorState'
import type { Editor } from '../Editor'
import { TLIndicatorPath } from '../shapes/ShapeUtil'
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

		// Remote collaborator indicators. Re-evaluated when the activity clock
		// ticks so idle/inactive peers drop out without a separate React timer.
		;(editor as any)._collaboratorVisibilityClock.get()
		const now = Date.now()
		const currentPageId = editor.getCurrentPageId()
		const collaboratorIndicators: TLShapeIndicatorOverlay['props']['collaboratorIndicators'] = []

		for (const presence of editor.getCollaborators()) {
			if (presence.currentPageId !== currentPageId) continue
			const elapsed = Math.max(0, now - (presence.lastActivityTimestamp ?? Infinity))
			const state = getCollaboratorStateFromElapsedTime(editor, elapsed)
			if (!shouldShowCollaborator(editor, presence, state)) continue

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
		const zoom = editor.getEfficientZoomLevel()
		const { idsToDisplay, hintingShapeIds, collaboratorIndicators } = overlay.props

		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'

		// Remote collaborator indicators — under local indicators, slightly transparent.
		ctx.lineWidth = this.options.lineWidth / zoom
		ctx.globalAlpha = 0.7
		for (const collaborator of collaboratorIndicators) {
			ctx.strokeStyle = collaborator.color
			for (const shapeId of collaborator.shapeIds) {
				this._renderShapeIndicator(ctx, shapeId)
			}
		}
		ctx.globalAlpha = 1.0

		// Local selected / hovered indicators.
		ctx.strokeStyle = editor.getCurrentTheme().colors[editor.getColorMode()].selectionStroke
		ctx.lineWidth = this.options.lineWidth / zoom
		for (const shapeId of idsToDisplay) {
			this._renderShapeIndicator(ctx, shapeId)
		}

		// Hinted shapes — thicker stroke.
		if (hintingShapeIds.length > 0) {
			ctx.lineWidth = this.options.hintedLineWidth / zoom
			for (const shapeId of hintingShapeIds) {
				this._renderShapeIndicator(ctx, shapeId)
			}
		}
	}

	private _renderShapeIndicator(ctx: CanvasRenderingContext2D, shapeId: TLShapeId): void {
		const editor = this.editor
		const shape = editor.getShape(shapeId)
		if (!shape || shape.isLocked) return

		const pageTransform = editor.getShapePageTransform(shape)
		if (!pageTransform) return

		const indicatorPath = indicatorPathCache.get(editor, shape.id)
		if (!indicatorPath) return

		ctx.save()
		ctx.transform(
			pageTransform.a,
			pageTransform.b,
			pageTransform.c,
			pageTransform.d,
			pageTransform.e,
			pageTransform.f
		)
		renderIndicatorPath(ctx, indicatorPath)
		ctx.restore()
	}
}

function renderIndicatorPath(ctx: CanvasRenderingContext2D, indicatorPath: TLIndicatorPath) {
	if (indicatorPath instanceof Path2D) {
		ctx.stroke(indicatorPath)
		return
	}

	const { path, clipPath, additionalPaths } = indicatorPath

	if (clipPath) {
		ctx.save()
		ctx.clip(clipPath, 'evenodd')
		ctx.stroke(path)
		ctx.restore()
	} else {
		ctx.stroke(path)
	}

	if (additionalPaths) {
		for (const additionalPath of additionalPaths) {
			ctx.stroke(additionalPath)
		}
	}
}
