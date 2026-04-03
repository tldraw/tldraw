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

	// Add padding for stroke width
	const padding = (scribble.size / zoom) * 2
	minX -= padding
	minY -= padding
	maxX += padding
	maxY += padding

	const bboxW = Math.max(1, maxX - minX)
	const bboxH = Math.max(1, maxY - minY)

	useTransform(rCanvas, minX, minY)

	useLayoutEffect(() => {
		const canvas = rCanvas.current
		if (!canvas) return
		if (!points.length) return
		const { ctx, style } = prepareCanvas(editor, canvas, bboxW, bboxH)
		ctx.translate(-minX, -minY)

		const stroke = getStroke(points, {
			size: scribble.size / zoom,
			start: { taper: scribble.taper, easing: EASINGS.linear },
			last: scribble.state === 'complete' || scribble.state === 'stopping',
			simulatePressure: false,
			streamline: 0.32,
		})

		if (stroke.length < 4) {
			// Draw a dot for very short strokes
			const r = scribble.size / zoom / 2
			const { x, y } = points[points.length - 1]
			ctx.beginPath()
			ctx.arc(x, y, r, 0, Math.PI * 2)
		} else {
			// Draw the freehand stroke as a filled path
			const pathStr = getSvgPathFromPoints(stroke)
			const path = new Path2D(pathStr)
			ctx.beginPath()
			ctx.globalAlpha = opacity ?? scribble.opacity
			ctx.fillStyle = color ?? style.getPropertyValue(`--tl-color-${scribble.color}`)
			ctx.fill(path)
			return
		}

		ctx.globalAlpha = opacity ?? scribble.opacity
		ctx.fillStyle = color ?? style.getPropertyValue(`--tl-color-${scribble.color}`)
		ctx.fill()
	})

	if (!points.length) return null

	return <canvas ref={rCanvas} className={classNames('tl-overlays__item', className)} />
}
