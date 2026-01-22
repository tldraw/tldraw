import { useComputed, useQuickReactor } from '@tldraw/state-react'
import { createComputedCache } from '@tldraw/store'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { dedupe, isEqual } from '@tldraw/utils'
import { memo, useEffect, useRef } from 'react'
import { Editor } from '../../editor/Editor'
import { TLIndicatorPath } from '../../editor/shapes/ShapeUtil'
import { useEditor } from '../../hooks/useEditor'
import { useIsDarkMode } from '../../hooks/useIsDarkMode'
import { debugFlags } from '../../utils/debug-flags'

/** @public */
export interface TLCanvasShapeIndicatorsProps {
	/** Whether to hide all of the indicators */
	hideAll?: boolean
	/** Whether to show all of the indicators */
	showAll?: boolean
	/** Whether to render hinted shape indicators */
	renderHints?: boolean
}

const indicatorPathCache = createComputedCache(
	'indicatorPath',
	(editor: Editor, shape: TLShape) => {
		const util = editor.getShapeUtil(shape)
		return util.getIndicatorPath(shape)
	}
)

const getIndicatorPath = (editor: Editor, shape: TLShape) => {
	return indicatorPathCache.get(editor, shape.id)
}

function renderShapeIndicator(
	ctx: CanvasRenderingContext2D,
	editor: Editor,
	shapeId: TLShapeId,
	renderingShapeIds: Set<TLShapeId>
): boolean {
	if (!renderingShapeIds.has(shapeId)) return false

	const shape = editor.getShape(shapeId)
	if (!shape || shape.isLocked) return false

	const pageTransform = editor.getShapePageTransform(shape)
	if (!pageTransform) return false

	const indicatorPath = getIndicatorPath(editor, shape)
	if (!indicatorPath) return false

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

	return true
}

function renderIndicatorPath(ctx: CanvasRenderingContext2D, indicatorPath: TLIndicatorPath) {
	if (indicatorPath instanceof Path2D) {
		ctx.stroke(indicatorPath)
	} else {
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
}

/** @public @react */
export const CanvasShapeIndicators = memo(function CanvasShapeIndicators({
	hideAll,
	showAll,
	renderHints = true,
}: TLCanvasShapeIndicatorsProps) {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)

	if (hideAll && showAll) throw Error('You cannot set both hideAll and showAll props to true')

	// Cache the selected color to avoid getComputedStyle on every render
	const rSelectedColor = useRef<string | null>(null)
	const isDarkMode = useIsDarkMode()

	useEffect(() => {
		const timer = editor.timers.setTimeout(() => {
			rSelectedColor.current = null
		}, 0)
		return () => clearTimeout(timer)
	}, [isDarkMode, editor])

	const $renderData = useComputed(
		'indicator render data',
		() => {
			const useCanvasIndicators = debugFlags.useCanvasIndicators.get()
			const perfLogging = debugFlags.indicatorPerfLogging.get()
			const renderingShapeIds = new Set(editor.getRenderingShapes().map((s) => s.id))

			// Compute ids to display
			let idsToDisplay: Set<TLShapeId>
			if (showAll) {
				idsToDisplay = renderingShapeIds
			} else if (hideAll) {
				idsToDisplay = new Set()
			} else {
				idsToDisplay = new Set<TLShapeId>()
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
			}

			// Compute hinting shape ids
			const hintingShapeIds = renderHints ? dedupe(editor.getHintingShapeIds()) : []

			return {
				idsToDisplay,
				renderingShapeIds,
				hintingShapeIds,
				useCanvasIndicators,
				perfLogging,
			}
		},
		{ isEqual: isEqual },
		[editor, showAll, hideAll, renderHints]
	)

	useQuickReactor(
		'canvas indicators render',
		() => {
			const canvas = canvasRef.current
			if (!canvas) return

			const ctx = canvas.getContext('2d')
			if (!ctx) return

			const { idsToDisplay, renderingShapeIds, hintingShapeIds, useCanvasIndicators, perfLogging } =
				$renderData.get()

			// If canvas indicators are disabled, just clear and exit
			if (!useCanvasIndicators) {
				ctx.resetTransform()
				ctx.clearRect(0, 0, canvas.width, canvas.height)
				return
			}

			const { w, h } = editor.getViewportScreenBounds()
			const dpr = window.devicePixelRatio || 1
			const { x: cx, y: cy, z: zoom } = editor.getCamera()

			const canvasWidth = Math.ceil(w * dpr)
			const canvasHeight = Math.ceil(h * dpr)

			if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
				canvas.width = canvasWidth
				canvas.height = canvasHeight
				canvas.style.width = `${w}px`
				canvas.style.height = `${h}px`
			}

			ctx.resetTransform()
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			ctx.scale(dpr, dpr)
			ctx.scale(zoom, zoom)
			ctx.translate(cx, cy)

			// Use cached color, only call getComputedStyle when cache is empty
			if (!rSelectedColor.current) {
				rSelectedColor.current = getComputedStyle(canvas).getPropertyValue('--tl-color-selected')
			}

			ctx.strokeStyle = rSelectedColor.current
			ctx.lineCap = 'round'
			ctx.lineJoin = 'round'

			// Start timing after setup, to match SVG measurement which excludes per-shape transform updates
			const t0 = perfLogging ? performance.now() : 0

			// Draw selected/hovered indicators (1.5px stroke)
			ctx.lineWidth = 1.5 / zoom
			let canvasRenderedCount = 0
			for (const shapeId of idsToDisplay) {
				if (renderShapeIndicator(ctx, editor, shapeId, renderingShapeIds)) {
					canvasRenderedCount++
				}
			}

			// Draw hinted indicators with a thicker stroke (2.5px)
			if (hintingShapeIds.length > 0) {
				ctx.lineWidth = 2.5 / zoom
				for (const shapeId of hintingShapeIds) {
					if (renderShapeIndicator(ctx, editor, shapeId, renderingShapeIds)) {
						canvasRenderedCount++
					}
				}
			}

			if (perfLogging && canvasRenderedCount > 0) {
				const duration = performance.now() - t0
				const perShape = (duration / canvasRenderedCount).toFixed(3)
				performance.measure(
					`CanvasIndicators (${canvasRenderedCount} shapes, ${perShape}ms/shape)`,
					{ start: t0, end: performance.now() }
				)
			}
		},
		[editor, $renderData]
	)

	return <canvas ref={canvasRef} className="tl-canvas-indicators" />
})
