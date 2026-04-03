import {
	EASINGS,
	TLScribbleProps,
	getSvgPathFromPoints,
	prepareCanvas,
	useEditor,
	useTransform,
} from '@tldraw/editor'
import classNames from 'classnames'
import { useLayoutEffect, useRef } from 'react'
import { getStroke } from '../shapes/shared/freehand/getStroke'

/** @public @react */
export function TldrawScribble({ scribble, zoom, color, opacity, className }: TLScribbleProps) {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)

	// Compute bounding box of scribble points
	const points = scribble.points

	// Add padding for stroke width
	const padding = (scribble.size / zoom) * 2

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

		const stroke = getStroke(points, {
			size: scribble.size / zoom,
			start: { taper: scribble.taper, easing: EASINGS.linear },
			last: scribble.state === 'complete' || scribble.state === 'stopping',
			simulatePressure: false,
			streamline: 0.32,
		})

		ctx.globalAlpha = opacity ?? scribble.opacity
		ctx.fillStyle = color ?? style.getPropertyValue(`--tl-color-${scribble.color}`)

		if (stroke.length < 4) {
			const r = scribble.size / zoom / 2
			const { x, y } = points[points.length - 1]
			ctx.beginPath()
			ctx.arc(x, y, r, 0, Math.PI * 2)
			ctx.fill()
		} else {
			const pathStr = getSvgPathFromPoints(stroke)
			const path = new Path2D(pathStr)
			ctx.fill(path)
		}
	})

	if (!points.length) return null

	return <canvas ref={rCanvas} className={classNames('tl-overlays__item', className)} />
}
