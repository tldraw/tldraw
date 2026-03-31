import { BoxModel, TLScribble } from '@tldraw/tlschema'
import { useEffect, useRef } from 'react'
import { Editor } from '../../editor/Editor'
import {
	GapsSnapIndicator,
	PointsSnapIndicator,
} from '../../editor/managers/SnapManager/SnapManager'
import { getComputedStyle } from '../../exports/domUtils'
import { useCurrentThemeId } from '../../hooks/useCurrentThemeId'
import { useEditor } from '../../hooks/useEditor'
import { rangeIntersection } from '../../primitives/utils'
import { getSvgPathFromPoints } from '../../utils/getSvgPathFromPoints'

// --- Shared hooks ---

/** @internal */
export function useCssColorCache() {
	const editor = useEditor()
	const rColorCache = useRef<Map<string, string>>(new Map())
	const themeId = useCurrentThemeId()
	useEffect(() => {
		const timer = editor.timers.setTimeout(() => rColorCache.current.clear(), 0)
		return () => clearTimeout(timer)
	}, [themeId, editor])
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
	brush: BoxModel,
	zoom: number,
	fillColor: string,
	strokeColor: string
) {
	const w = Math.max(1, brush.w)
	const h = Math.max(1, brush.h)
	ctx.fillStyle = fillColor
	ctx.fillRect(brush.x, brush.y, w, h)
	ctx.strokeStyle = strokeColor
	ctx.lineWidth = 1 / zoom
	ctx.strokeRect(brush.x, brush.y, w, h)
}

export function drawCollaboratorBrush(
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

export function drawScribble(
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

export function drawPointsSnap(
	ctx: CanvasRenderingContext2D,
	indicator: PointsSnapIndicator,
	zoom: number
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

	ctx.strokeStyle = 'lime'

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

export function drawGapsSnap(
	ctx: CanvasRenderingContext2D,
	indicator: GapsSnapIndicator,
	zoom: number
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
	ctx.strokeStyle = 'cyan'

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
