import { track, useEditor } from '@tldraw/editor'
import * as React from 'react'

/** @internal */
export const HTMLCanvas = track(function HTMLCanvas() {
	const editor = useEditor()
	const rCanvas = React.useRef<HTMLCanvasElement>(null)

	const camera = editor.getCamera()
	const shapes = editor.getCurrentPageShapes()
	if (rCanvas.current) {
		const cvs = rCanvas.current
		const ctx = cvs.getContext('2d')!
		ctx.resetTransform()
		ctx.clearRect(0, 0, cvs.width, cvs.height)

		const path = new Path2D()

		ctx.translate(camera.x, camera.y)

		for (const shape of shapes) {
			const bounds = editor.getShapePageBounds(shape)!
			path.rect(bounds.minX, bounds.minY, bounds.width, bounds.height)
		}

		ctx.fillStyle = '#cccccc'
		ctx.fill(path)

		// for (const shape of shapes) {
		// 	ctx.save()
		// 	const corners = editor.getPageCorners(shape)
		// 	corners.forEach((corner) => dot(ctx, corner.x, corner.y, 'red'))
		// 	ctx.restore()
		// }
	}

	return (
		<canvas
			ref={rCanvas}
			width={editor.getViewportScreenBounds().width}
			height={editor.getViewportScreenBounds().height}
			style={{ width: '100%', height: '100%' }}
		/>
	)
})

// function dot(ctx: CanvasRenderingContext2D, x: number, y: number, color = '#000') {
// 	ctx.save()
// 	ctx.beginPath()
// 	ctx.ellipse(x, y, 4, 4, 0, 0, Math.PI * 2)
// 	ctx.fillStyle = color
// 	ctx.fill()
// 	ctx.restore()
// }
