import { useQuickReactor, useValue } from '@tldraw/state-react'
import { TLShapeId } from '@tldraw/tlschema'
import { dedupe } from '@tldraw/utils'
import { memo, useEffect, useRef } from 'react'
import { Editor } from '../../editor/Editor'
import { TLIndicatorPath } from '../../editor/shapes/ShapeUtil'
import { useEditor } from '../../hooks/useEditor'
import { useIsDarkMode } from '../../hooks/useIsDarkMode'
import { Mat } from '../../primitives/Mat'
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

/** Renders a single shape indicator on the canvas context */
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

	const util = editor.getShapeUtil(shape)
	const indicatorPath = util.getIndicatorPath(shape)
	if (!indicatorPath) return false

	ctx.save()
	applyTransform(ctx, pageTransform)
	renderIndicatorPath(ctx, indicatorPath)
	ctx.restore()

	return true
}

/** Renders an indicator path, handling both simple Path2D and complex clipped paths */
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

/** Applies a Mat transform to the canvas context */
function applyTransform(ctx: CanvasRenderingContext2D, transform: Mat) {
	ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f)
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

	const rPreviousSelectedShapeIds = useRef<Set<TLShapeId>>(new Set())
	const rPreviousHintingShapeIds = useRef<TLShapeId[]>([])

	// Cache the selected color to avoid getComputedStyle on every render
	const rSelectedColor = useRef<string | null>(null)
	const isDarkMode = useIsDarkMode()

	useEffect(() => {
		const timer = editor.timers.setTimeout(() => {
			rSelectedColor.current = null
		}, 0)
		return () => clearTimeout(timer)
	}, [isDarkMode, editor])

	const idsToDisplay = useValue(
		'canvas indicator ids',
		() => {
			const prev = rPreviousSelectedShapeIds.current
			const next = new Set<TLShapeId>()

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

			if (isChangingStyle || !(isIdleOrEditing || isInSelectState)) {
				rPreviousSelectedShapeIds.current = next
				return next
			}

			for (const id of editor.getSelectedShapeIds()) {
				next.add(id)
			}

			if (isIdleOrEditing && instanceState.isHoveringCanvas && !instanceState.isCoarsePointer) {
				const hovered = editor.getHoveredShapeId()
				if (hovered) next.add(hovered)
			}

			if (prev.size !== next.size) {
				rPreviousSelectedShapeIds.current = next
				return next
			}

			for (const id of next) {
				if (!prev.has(id)) {
					rPreviousSelectedShapeIds.current = next
					return next
				}
			}

			return prev
		},
		[editor]
	)

	const renderingShapeIds = useValue(
		'rendering shape ids',
		() => new Set(editor.getRenderingShapes().map((s) => s.id)),
		[editor]
	)

	const hintingShapeIds = useValue(
		'hinting shape ids',
		() => {
			if (!renderHints) return []
			const prev = rPreviousHintingShapeIds.current
			const next = dedupe(editor.getHintingShapeIds())

			if (prev.length === next.length && prev.every((id: TLShapeId, i: number) => id === next[i])) {
				return prev
			}
			rPreviousHintingShapeIds.current = next
			return next
		},
		[editor, renderHints]
	)

	const perfLogging = useValue(
		'indicatorPerfLogging',
		() => debugFlags.indicatorPerfLogging.get(),
		[debugFlags]
	)

	useQuickReactor(
		'canvas indicators render',
		() => {
			const t0 = perfLogging ? performance.now() : 0

			const canvas = canvasRef.current
			if (!canvas) return

			const ctx = canvas.getContext('2d')
			if (!ctx) return

			// Determine which IDs to render
			const currentIds = showAll ? renderingShapeIds : hideAll ? new Set<TLShapeId>() : idsToDisplay

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

			// Draw selected/hovered indicators (1.5px stroke)
			ctx.lineWidth = 1.5 / zoom
			let canvasRenderedCount = 0
			for (const shapeId of currentIds) {
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
				const t1 = performance.now()
				// eslint-disable-next-line no-console
				console.log(
					`[CanvasIndicators] ${canvasRenderedCount} shapes, draw calls: ${(t1 - t0).toFixed(2)}ms`
				)
			}
		},
		[editor, idsToDisplay, renderingShapeIds, hintingShapeIds, showAll, hideAll, perfLogging]
	)

	return <canvas ref={canvasRef} className="tl-canvas-indicators" />
})
