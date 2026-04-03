import { TLScribble } from '@tldraw/tlschema'
import classNames from 'classnames'
import { useLayoutEffect, useRef } from 'react'
import { useEditor } from '../../hooks/useEditor'
import { useTransform } from '../../hooks/useTransform'
import { getSvgPathFromPoints } from '../../utils/getSvgPathFromPoints'
import { prepareCanvas } from './canvas-overlay-helpers'

/** @public */
export interface TLScribbleProps {
	userId?: string
	scribble: TLScribble
	zoom: number
	color?: string
	opacity?: number
	className?: string
}

/** @public @react */
export function DefaultScribble({ scribble, zoom, color, opacity, className }: TLScribbleProps) {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)

	// Compute bounding box of scribble points
	const points = scribble.points

	// Add padding for stroke width
	const strokeWidth = 8 / zoom
	const padding = strokeWidth * 2

	let minX = 0,
		minY = 0,
		maxX = 0,
		maxY = 0
	if (points.length) {
		minX = Infinity
		minY = Infinity
		maxX = -Infinity
		maxY = -Infinity
		for (const p of points) {
			if (p.x < minX) minX = p.x
			if (p.y < minY) minY = p.y
			if (p.x > maxX) maxX = p.x
			if (p.y > maxY) maxY = p.y
		}
		minX -= padding
		minY -= padding
		maxX += padding
		maxY += padding
	}

	const bboxW = Math.max(1, maxX - minX)
	const bboxH = Math.max(1, maxY - minY)

	useTransform(rCanvas, minX, minY)

	useLayoutEffect(() => {
		const canvas = rCanvas.current
		if (!canvas) return
		if (!points.length) return
		const result = prepareCanvas(editor, canvas, bboxW, bboxH)
		if (!result) return
		const { ctx, style } = result
		ctx.translate(-minX, -minY)

		const pathStr = getSvgPathFromPoints(points, false)
		const path = new Path2D(pathStr)
		ctx.globalAlpha = opacity ?? scribble.opacity
		ctx.strokeStyle = color ?? style.getPropertyValue(`--tl-color-${scribble.color}`)
		ctx.lineWidth = strokeWidth
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		ctx.stroke(path)
	})

	if (!points.length) return null

	return <canvas ref={rCanvas} className={classNames('tl-overlays__item', className)} />
}
