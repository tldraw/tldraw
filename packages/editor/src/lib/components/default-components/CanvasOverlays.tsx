import { useComputed, useQuickReactor } from '@tldraw/state-react'
import { TLShapeId } from '@tldraw/tlschema'
import { BoxModel, TLScribble } from '@tldraw/tlschema'
import { dedupe } from '@tldraw/utils'
import { memo, useRef } from 'react'
import { useEditorComponents } from '../../hooks/EditorComponentsContext'
import { useEditor } from '../../hooks/useEditor'
import { useActivePeerIds$ } from '../../hooks/usePeerIds'
import {
	CollaboratorIndicatorData,
	IndicatorRenderData,
	drawBrush,
	drawCollaboratorBrush,
	drawGapsSnap,
	drawPointsSnap,
	drawScribble,
	drawShapeIndicators,
	getCachedCssColor,
	renderDataEqual,
	setupCanvasContext,
	useCssColorCache,
} from './canvasOverlayHelpers'
import { DefaultBrush } from './DefaultBrush'
import { DefaultScribble } from './DefaultScribble'
import { DefaultSnapIndicator } from './DefaultSnapIndictor'

/** @internal */
export const CanvasOverlays = memo(function CanvasOverlays() {
	const { Brush, CollaboratorBrush, ZoomBrush, Scribble, CollaboratorScribble, SnapIndicator } =
		useEditorComponents()

	const shouldDrawBrush = Brush === DefaultBrush
	const shouldDrawCollabBrush = CollaboratorBrush === DefaultBrush
	const shouldDrawZoomBrush = ZoomBrush === DefaultBrush
	const shouldDrawScribble = Scribble === DefaultScribble
	const shouldDrawCollabScribble = CollaboratorScribble === DefaultScribble
	const shouldDrawSnaps = SnapIndicator === DefaultSnapIndicator

	return (
		<CanvasOverlaysInner
			shouldDrawBrush={shouldDrawBrush}
			shouldDrawCollabBrush={shouldDrawCollabBrush}
			shouldDrawZoomBrush={shouldDrawZoomBrush}
			shouldDrawScribble={shouldDrawScribble}
			shouldDrawCollabScribble={shouldDrawCollabScribble}
			shouldDrawSnaps={shouldDrawSnaps}
		/>
	)
})

function CanvasOverlaysInner({
	shouldDrawBrush,
	shouldDrawCollabBrush,
	shouldDrawZoomBrush,
	shouldDrawScribble,
	shouldDrawCollabScribble,
	shouldDrawSnaps,
}: {
	shouldDrawBrush: boolean
	shouldDrawCollabBrush: boolean
	shouldDrawZoomBrush: boolean
	shouldDrawScribble: boolean
	shouldDrawCollabScribble: boolean
	shouldDrawSnaps: boolean
}) {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const rColorCache = useCssColorCache()
	const activePeerIds$ = useActivePeerIds$()

	// Compute indicator render data with custom equality to avoid unnecessary redraws
	const $renderData = useComputed(
		'indicator render data',
		() => {
			const renderingShapeIds = new Set(editor.getRenderingShapes().map((s) => s.id))

			// Compute ids to display for selected/hovered shapes
			const idsToDisplay = new Set<TLShapeId>()
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
					idsToDisplay.add(id)
				}
				if (isIdleOrEditing && instanceState.isHoveringCanvas && !instanceState.isCoarsePointer) {
					const hovered = editor.getHoveredShapeId()
					if (hovered) idsToDisplay.add(hovered)
				}
			}

			// Compute hinting shape ids
			const hintingShapeIds = dedupe(editor.getHintingShapeIds())

			// Compute collaborator indicators
			const collaboratorIndicators: CollaboratorIndicatorData[] = []
			const currentPageId = editor.getCurrentPageId()
			const activePeerIds = activePeerIds$.get()

			const collaborators = editor.getCollaborators()
			for (const peerId of activePeerIds.values()) {
				const presence = collaborators.find((c) => c.userId === peerId)
				if (!presence || presence.currentPageId !== currentPageId) continue

				const visibleShapeIds = presence.selectedShapeIds.filter(
					(id) => renderingShapeIds.has(id) && !editor.isShapeHidden(id)
				)

				if (visibleShapeIds.length > 0) {
					collaboratorIndicators.push({
						color: presence.color,
						shapeIds: visibleShapeIds,
					})
				}
			}

			return {
				idsToDisplay,
				renderingShapeIds,
				hintingShapeIds,
				collaboratorIndicators,
			} satisfies IndicatorRenderData
		},
		{ isEqual: renderDataEqual },
		[editor, activePeerIds$]
	)

	useQuickReactor(
		'canvas overlays',
		() => {
			const canvas = canvasRef.current
			if (!canvas) return
			const ctx = canvas.getContext('2d')
			if (!ctx) return

			// --- Read all reactive data ---

			const renderData = $renderData.get()
			const brush = shouldDrawBrush ? editor.getInstanceState().brush : null
			const zoomBrush = shouldDrawZoomBrush ? editor.getInstanceState().zoomBrush : null
			const scribbles = shouldDrawScribble
				? editor.getInstanceState().scribbles
				: ([] as TLScribble[])
			const snapIndicators = shouldDrawSnaps ? editor.snaps.getIndicators() : []

			let collabBrushData: Array<{ brush: BoxModel; color: string }> | null = null
			let collabScribbleData: Array<{
				scribble: TLScribble
				color: string
				opacity: number
			}> | null = null

			if (shouldDrawCollabBrush || shouldDrawCollabScribble) {
				const activePeerIds = activePeerIds$.get()
				if (activePeerIds.size > 0) {
					const currentPageId = editor.getCurrentPageId()
					const collaborators = editor.getCollaborators()

					if (shouldDrawCollabBrush) {
						const brushItems: Array<{ brush: BoxModel; color: string }> = []
						for (const peerId of activePeerIds) {
							const presence = collaborators.find((c) => c.userId === peerId)
							if (presence?.currentPageId === currentPageId && presence.brush) {
								brushItems.push({ brush: presence.brush, color: presence.color })
							}
						}
						if (brushItems.length > 0) collabBrushData = brushItems
					}

					if (shouldDrawCollabScribble) {
						const scribbleItems: Array<{
							scribble: TLScribble
							color: string
							opacity: number
						}> = []
						for (const peerId of activePeerIds) {
							const presence = collaborators.find((c) => c.userId === peerId)
							if (
								!presence ||
								presence.currentPageId !== currentPageId ||
								!presence.scribbles.length
							)
								continue
							for (const scribble of presence.scribbles) {
								if (!scribble.points.length) continue
								scribbleItems.push({
									scribble,
									color: presence.color,
									opacity: scribble.color === 'laser' ? 0.5 : 0.1,
								})
							}
						}
						if (scribbleItems.length > 0) collabScribbleData = scribbleItems
					}
				}
			}

			// --- Clear ---

			ctx.resetTransform()
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// --- Setup camera transform ---

			const zoom = setupCanvasContext(canvas, ctx, editor)
			const cache = rColorCache.current

			// --- Draw in z-order ---

			// 1-3. Shape indicators (collaborator, selected/hovered, hinted)
			const selectedColor = getCachedCssColor(canvas, cache, '--tl-color-selected')
			drawShapeIndicators(ctx, editor, renderData, zoom, selectedColor)

			// 4. Brush
			if (brush) {
				drawBrush(
					ctx,
					brush,
					zoom,
					getCachedCssColor(canvas, cache, '--tl-color-brush-fill'),
					getCachedCssColor(canvas, cache, '--tl-color-brush-stroke')
				)
			}

			// 5. Collaborator brushes
			if (collabBrushData) {
				for (const item of collabBrushData) {
					drawCollaboratorBrush(ctx, item.brush, zoom, item.color, 0.1)
				}
			}

			// 6. Scribbles
			if (scribbles.length > 0) {
				ctx.lineCap = 'round'
				ctx.lineJoin = 'round'
				for (const scribble of scribbles) {
					if (!scribble.points.length) continue
					const color = getCachedCssColor(canvas, cache, `--tl-color-${scribble.color}`)
					drawScribble(ctx, scribble, zoom, color, scribble.opacity)
				}
			}

			// 6b. Collaborator scribbles
			if (collabScribbleData) {
				ctx.lineCap = 'round'
				ctx.lineJoin = 'round'
				for (const item of collabScribbleData) {
					drawScribble(ctx, item.scribble, zoom, item.color, item.opacity)
				}
			}

			// 7. Zoom brush
			if (zoomBrush) {
				drawBrush(
					ctx,
					zoomBrush,
					zoom,
					getCachedCssColor(canvas, cache, '--tl-color-brush-fill'),
					getCachedCssColor(canvas, cache, '--tl-color-brush-stroke')
				)
			}

			// 8. Snap indicators
			if (snapIndicators.length > 0) {
				const snapColor = getCachedCssColor(canvas, cache, '--tl-color-snap')
				ctx.lineCap = 'butt'
				ctx.lineJoin = 'miter'
				ctx.lineWidth = 1 / zoom
				for (const indicator of snapIndicators) {
					if (indicator.type === 'points') {
						drawPointsSnap(ctx, indicator, zoom, snapColor)
					} else if (indicator.type === 'gaps') {
						drawGapsSnap(ctx, indicator, zoom, snapColor)
					}
				}
			}
		},
		[
			editor,
			$renderData,
			shouldDrawBrush,
			shouldDrawCollabBrush,
			shouldDrawZoomBrush,
			shouldDrawScribble,
			shouldDrawCollabScribble,
			shouldDrawSnaps,
			activePeerIds$,
		]
	)

	return <canvas ref={canvasRef} className="tl-canvas-overlays" />
}
