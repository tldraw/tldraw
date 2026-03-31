import { createComputedCache } from '@tldraw/store'
import { BoxModel, TLShape, TLShapeId, TLScribble } from '@tldraw/tlschema'
import { useEffect, useRef } from 'react'
import { Editor } from '../../editor/Editor'
import {
	GapsSnapIndicator,
	PointsSnapIndicator,
	SnapIndicator,
} from '../../editor/managers/SnapManager/SnapManager'
import { TLIndicatorPath } from '../../editor/shapes/ShapeUtil'
import { getComputedStyle } from '../../exports/domUtils'
import { useEditor } from '../../hooks/useEditor'
import { useIsDarkMode } from '../../hooks/useIsDarkMode'
import { rangeIntersection } from '../../primitives/utils'
import { getSvgPathFromPoints } from '../../utils/getSvgPathFromPoints'

// --- Shared hooks ---

/** @internal */
export function useCssColorCache() {
	const editor = useEditor()
	const rColorCache = useRef<Map<string, string>>(new Map())
	const isDarkMode = useIsDarkMode()
	useEffect(() => {
		const timer = editor.timers.setTimeout(() => rColorCache.current.clear(), 0)
		return () => clearTimeout(timer)
	}, [isDarkMode, editor])
	return rColorCache
}

// --- Shared helpers ---

/** Sets up canvas size and camera transform. Only call when there's content to draw. */
export function setupCanvasContext(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	editor: Editor
): number {
	const { w, h } = editor.getViewportScreenBounds()
	const dpr = editor.getInstanceState().devicePixelRatio
	const { x: cx, y: cy, z: zoom } = editor.getCamera()

	const canvasWidth = Math.ceil(w * dpr)
	const canvasHeight = Math.ceil(h * dpr)
	if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
		canvas.width = canvasWidth
		canvas.height = canvasHeight
		canvas.style.width = `${w}px`
		canvas.style.height = `${h}px`
	}

	ctx.scale(dpr, dpr)
	ctx.scale(zoom, zoom)
	ctx.translate(cx, cy)

	return zoom
}

export function getCachedCssColor(
	canvas: HTMLCanvasElement,
	cache: Map<string, string>,
	varName: string
): string {
	let color = cache.get(varName)
	if (!color) {
		color = getComputedStyle(canvas).getPropertyValue(varName)
		cache.set(varName, color)
	}
	return color
}

// --- Drawing functions ---

export function drawBrush(
	ctx: CanvasRenderingContext2D,
	brush: BoxModel | null,
	zoom: number,
	fillColor: string,
	strokeColor: string
) {
	if (!brush) return
	const w = Math.max(1, brush.w)
	const h = Math.max(1, brush.h)
	ctx.fillStyle = fillColor
	ctx.fillRect(brush.x, brush.y, w, h)
	ctx.strokeStyle = strokeColor
	ctx.lineWidth = 1 / zoom
	ctx.strokeRect(brush.x, brush.y, w, h)
}

function drawCollaboratorBrush(
	ctx: CanvasRenderingContext2D,
	brush: BoxModel,
	zoom: number,
	color: string,
	opacity: number
) {
	const w = Math.max(1, brush.w)
	const h = Math.max(1, brush.h)
	ctx.globalAlpha = opacity * 0.75
	ctx.fillStyle = color
	ctx.fillRect(brush.x, brush.y, w, h)
	ctx.globalAlpha = opacity * 0.1
	ctx.strokeStyle = color
	ctx.lineWidth = 1 / zoom
	ctx.strokeRect(brush.x, brush.y, w, h)
	ctx.globalAlpha = 1
}

export function drawCollaboratorBrushes(
	ctx: CanvasRenderingContext2D,
	items: Array<{ brush: BoxModel; color: string }> | null,
	zoom: number
) {
	if (!items) return
	for (const item of items) {
		drawCollaboratorBrush(ctx, item.brush, zoom, item.color, 0.1)
	}
}

function drawScribble(
	ctx: CanvasRenderingContext2D,
	scribble: TLScribble,
	zoom: number,
	color: string,
	opacity: number
) {
	const pathStr = getSvgPathFromPoints(scribble.points, false)
	if (!pathStr) return
	const path = new Path2D(pathStr)
	ctx.globalAlpha = opacity
	ctx.strokeStyle = color
	ctx.lineWidth = 8 / zoom
	ctx.stroke(path)
	ctx.globalAlpha = 1
}

export function drawScribbles(
	ctx: CanvasRenderingContext2D,
	scribbles: TLScribble[],
	zoom: number,
	canvas: HTMLCanvasElement,
	colorCache: Map<string, string>
) {
	if (!scribbles.length) return
	ctx.lineCap = 'round'
	ctx.lineJoin = 'round'
	for (const scribble of scribbles) {
		if (!scribble.points.length) continue
		const color = getCachedCssColor(canvas, colorCache, `--tl-color-${scribble.color}`)
		drawScribble(ctx, scribble, zoom, color, scribble.opacity)
	}
}

export function drawCollaboratorScribbles(
	ctx: CanvasRenderingContext2D,
	items: Array<{ scribble: TLScribble; color: string; opacity: number }> | null,
	zoom: number
) {
	if (!items) return
	ctx.lineCap = 'round'
	ctx.lineJoin = 'round'
	for (const item of items) {
		drawScribble(ctx, item.scribble, zoom, item.color, item.opacity)
	}
}

export function drawSnapIndicators(
	ctx: CanvasRenderingContext2D,
	indicators: SnapIndicator[],
	zoom: number,
	color: string
) {
	if (!indicators.length) return
	ctx.lineCap = 'butt'
	ctx.lineJoin = 'miter'
	ctx.lineWidth = 1 / zoom
	for (const indicator of indicators) {
		if (indicator.type === 'points') {
			drawPointsSnap(ctx, indicator, zoom, color)
		} else if (indicator.type === 'gaps') {
			drawGapsSnap(ctx, indicator, zoom, color)
		}
	}
}

function drawPointsSnap(
	ctx: CanvasRenderingContext2D,
	indicator: PointsSnapIndicator,
	zoom: number,
	color: string
) {
	const { points } = indicator
	const l = 2.5 / zoom

	const minX = points.reduce((acc, p) => Math.min(acc, p.x), Infinity)
	const maxX = points.reduce((acc, p) => Math.max(acc, p.x), -Infinity)
	const minY = points.reduce((acc, p) => Math.min(acc, p.y), Infinity)
	const maxY = points.reduce((acc, p) => Math.max(acc, p.y), -Infinity)

	const useNWtoSEdireciton = points.some((p) => p.x === minX && p.y === minY)
	let firstX: number, firstY: number, secondX: number, secondY: number
	if (useNWtoSEdireciton) {
		firstX = minX
		firstY = minY
		secondX = maxX
		secondY = maxY
	} else {
		firstX = minX
		firstY = maxY
		secondX = maxX
		secondY = minY
	}

	ctx.strokeStyle = color

	ctx.beginPath()
	ctx.moveTo(firstX, firstY)
	ctx.lineTo(secondX, secondY)
	ctx.stroke()

	for (const p of points) {
		ctx.beginPath()
		ctx.moveTo(p.x - l, p.y - l)
		ctx.lineTo(p.x + l, p.y + l)
		ctx.moveTo(p.x - l, p.y + l)
		ctx.lineTo(p.x + l, p.y - l)
		ctx.stroke()
	}
}

function drawGapsSnap(
	ctx: CanvasRenderingContext2D,
	indicator: GapsSnapIndicator,
	zoom: number,
	color: string
) {
	const { gaps, direction } = indicator
	const l = 3.5 / zoom
	const horizontal = direction === 'horizontal'

	let edgeIntersection: number[] | null = [-Infinity, +Infinity]
	let nextEdgeIntersection: number[] | null = null

	for (const gap of gaps) {
		nextEdgeIntersection = rangeIntersection(
			edgeIntersection![0],
			edgeIntersection![1],
			horizontal ? gap.startEdge[0].y : gap.startEdge[0].x,
			horizontal ? gap.startEdge[1].y : gap.startEdge[1].x
		)
		if (nextEdgeIntersection) {
			edgeIntersection = nextEdgeIntersection
		} else {
			continue
		}

		nextEdgeIntersection = rangeIntersection(
			edgeIntersection[0],
			edgeIntersection[1],
			horizontal ? gap.endEdge[0].y : gap.endEdge[0].x,
			horizontal ? gap.endEdge[1].y : gap.endEdge[1].x
		)
		if (nextEdgeIntersection) {
			edgeIntersection = nextEdgeIntersection
		} else {
			continue
		}
	}

	if (edgeIntersection === null) return

	const midPoint = (edgeIntersection[0] + edgeIntersection[1]) / 2
	ctx.strokeStyle = color

	ctx.beginPath()
	for (const { startEdge, endEdge } of gaps) {
		if (horizontal) {
			ctx.moveTo(startEdge[0].x, midPoint - 2 * l)
			ctx.lineTo(startEdge[1].x, midPoint + 2 * l)
			ctx.moveTo(endEdge[0].x, midPoint - 2 * l)
			ctx.lineTo(endEdge[1].x, midPoint + 2 * l)
			ctx.moveTo(startEdge[0].x, midPoint)
			ctx.lineTo(endEdge[0].x, midPoint)
			const centerX = (startEdge[0].x + endEdge[0].x) / 2
			ctx.moveTo(centerX, midPoint - l)
			ctx.lineTo(centerX, midPoint + l)
		} else {
			ctx.moveTo(midPoint - 2 * l, startEdge[0].y)
			ctx.lineTo(midPoint + 2 * l, startEdge[1].y)
			ctx.moveTo(midPoint - 2 * l, endEdge[0].y)
			ctx.lineTo(midPoint + 2 * l, endEdge[1].y)
			ctx.moveTo(midPoint, startEdge[0].y)
			ctx.lineTo(midPoint, endEdge[0].y)
			const centerY = (startEdge[0].y + endEdge[0].y) / 2
			ctx.moveTo(midPoint - l, centerY)
			ctx.lineTo(midPoint + l, centerY)
		}
	}
	ctx.stroke()
}

// --- Shape indicator types and functions ---

export interface CollaboratorIndicatorData {
	color: string
	shapeIds: TLShapeId[]
}

export interface IndicatorRenderData {
	idsToDisplay: Set<TLShapeId>
	renderingShapeIds: Set<TLShapeId>
	hintingShapeIds: TLShapeId[]
	collaboratorIndicators: CollaboratorIndicatorData[]
}

const indicatorPathCache = createComputedCache(
	'indicatorPath',
	(editor: Editor, shape: TLShape) => {
		const util = editor.getShapeUtil(shape)
		return util.getIndicatorPath(shape)
	}
)

function drawIndicatorPath(ctx: CanvasRenderingContext2D, indicatorPath: TLIndicatorPath) {
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

function drawShapeIndicator(
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

	const indicatorPath = indicatorPathCache.get(editor, shape.id)
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
	drawIndicatorPath(ctx, indicatorPath)
	ctx.restore()

	return true
}

/** Draws all shape indicators (collaborator, selected/hovered, hinted) in z-order. */
export function drawShapeIndicators(
	ctx: CanvasRenderingContext2D,
	editor: Editor,
	renderData: IndicatorRenderData,
	zoom: number,
	selectedColor: string
) {
	const { idsToDisplay, renderingShapeIds, hintingShapeIds, collaboratorIndicators } = renderData

	ctx.lineCap = 'round'
	ctx.lineJoin = 'round'

	// 1. Collaborator indicators (0.7 opacity, underneath local indicators)
	ctx.lineWidth = 1.5 / zoom
	for (const collaborator of collaboratorIndicators) {
		ctx.strokeStyle = collaborator.color
		ctx.globalAlpha = 0.7
		for (const shapeId of collaborator.shapeIds) {
			drawShapeIndicator(ctx, editor, shapeId, renderingShapeIds)
		}
	}

	// 2. Selected/hovered indicators
	ctx.globalAlpha = 1.0
	ctx.strokeStyle = selectedColor
	ctx.lineWidth = 1.5 / zoom
	for (const shapeId of idsToDisplay) {
		drawShapeIndicator(ctx, editor, shapeId, renderingShapeIds)
	}

	// 3. Hinted indicators (thicker stroke)
	if (hintingShapeIds.length > 0) {
		ctx.lineWidth = 2.5 / zoom
		for (const shapeId of hintingShapeIds) {
			drawShapeIndicator(ctx, editor, shapeId, renderingShapeIds)
		}
	}
}

// --- Equality helpers for IndicatorRenderData ---

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
	if (a.size !== b.size) return false
	for (const item of a) {
		if (!b.has(item)) return false
	}
	return true
}

function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}
	return true
}

function collaboratorIndicatorsEqual(
	a: CollaboratorIndicatorData[],
	b: CollaboratorIndicatorData[]
): boolean {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i].color !== b[i].color) return false
		if (!arraysEqual(a[i].shapeIds, b[i].shapeIds)) return false
	}
	return true
}

export function renderDataEqual(a: IndicatorRenderData, b: IndicatorRenderData): boolean {
	return (
		setsEqual(a.idsToDisplay, b.idsToDisplay) &&
		setsEqual(a.renderingShapeIds, b.renderingShapeIds) &&
		arraysEqual(a.hintingShapeIds, b.hintingShapeIds) &&
		collaboratorIndicatorsEqual(a.collaboratorIndicators, b.collaboratorIndicators)
	)
}
