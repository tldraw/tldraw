import classNames from 'classnames'
import { useLayoutEffect, useRef } from 'react'
import {
	GapsSnapIndicator,
	PointsSnapIndicator,
	type SnapIndicator,
} from '../../editor/managers/SnapManager/SnapManager'
import { getComputedStyle } from '../../exports/domUtils'
import { useEditor } from '../../hooks/useEditor'
import { useTransform } from '../../hooks/useTransform'
import { rangeIntersection } from '../../primitives/utils'

/** @public */
export interface TLSnapIndicatorProps {
	className?: string
	line: SnapIndicator
	zoom: number
}

/** @public @react */
export function DefaultSnapIndicator({ line, zoom, className }: TLSnapIndicatorProps) {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)

	// Compute bounding box of the snap indicator
	const bounds = getSnapIndicatorBounds(line, zoom)

	useTransform(rCanvas, bounds.x, bounds.y)

	useLayoutEffect(() => {
		const canvas = rCanvas.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const dpr = editor.getInstanceState().devicePixelRatio
		const cameraZoom = editor.getCamera().z

		const w = bounds.w
		const h = bounds.h

		const canvasW = Math.ceil(w * cameraZoom * dpr)
		const canvasH = Math.ceil(h * cameraZoom * dpr)
		canvas.width = canvasW
		canvas.height = canvasH
		canvas.style.width = w + 'px'
		canvas.style.height = h + 'px'

		ctx.scale(cameraZoom * dpr, cameraZoom * dpr)
		ctx.translate(-bounds.x, -bounds.y)

		const style = getComputedStyle(canvas)
		const color = style.getPropertyValue('--tl-color-snap')

		ctx.strokeStyle = color
		ctx.lineCap = 'butt'
		ctx.lineJoin = 'miter'
		ctx.lineWidth = 1 / cameraZoom

		if (line.type === 'points') {
			drawPointsSnap(ctx, line, cameraZoom)
		} else if (line.type === 'gaps') {
			drawGapsSnap(ctx, line, cameraZoom)
		}
	})

	return <canvas ref={rCanvas} className={classNames('tl-overlays__item', className)} />
}

function getSnapIndicatorBounds(
	line: SnapIndicator,
	zoom: number
): { x: number; y: number; w: number; h: number } {
	const padding = 10 / zoom

	if (line.type === 'points') {
		const { points } = line
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity
		for (const p of points) {
			if (p.x < minX) minX = p.x
			if (p.y < minY) minY = p.y
			if (p.x > maxX) maxX = p.x
			if (p.y > maxY) maxY = p.y
		}
		return {
			x: minX - padding,
			y: minY - padding,
			w: Math.max(1, maxX - minX + padding * 2),
			h: Math.max(1, maxY - minY + padding * 2),
		}
	} else {
		const { gaps } = line
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity
		for (const gap of gaps) {
			for (const edge of [gap.startEdge, gap.endEdge]) {
				for (const p of edge) {
					if (p.x < minX) minX = p.x
					if (p.y < minY) minY = p.y
					if (p.x > maxX) maxX = p.x
					if (p.y > maxY) maxY = p.y
				}
			}
		}
		return {
			x: minX - padding,
			y: minY - padding,
			w: Math.max(1, maxX - minX + padding * 2),
			h: Math.max(1, maxY - minY + padding * 2),
		}
	}
}

function drawPointsSnap(
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

function drawGapsSnap(ctx: CanvasRenderingContext2D, indicator: GapsSnapIndicator, zoom: number) {
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
