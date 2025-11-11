import { useLayoutEffect, useRef } from 'react'
import { TLDrawShape, TLGeoShape, getColorValue, getDefaultColorTheme, useEditor } from 'tldraw'

export function CustomRenderer() {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)

	useLayoutEffect(() => {
		const canvas = rCanvas.current
		if (!canvas) return

		canvas.style.width = '100%'
		canvas.style.height = '100%'

		const rect = canvas.getBoundingClientRect()

		canvas.width = rect.width
		canvas.height = rect.height

		const ctx = canvas.getContext('2d')!

		let raf = -1

		function render() {
			if (!canvas) return

			ctx.resetTransform()
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			const camera = editor.getCamera()
			ctx.scale(camera.z, camera.z)
			ctx.translate(camera.x, camera.y)

			const renderingShapes = editor.getRenderingShapes()
			const theme = getDefaultColorTheme({ isDarkMode: editor.user.getIsDarkMode() })
			const currentPageId = editor.getCurrentPageId()

			for (const { shape, opacity } of renderingShapes) {
				const maskedPageBounds = editor.getShapeMaskedPageBounds(shape)
				if (!maskedPageBounds) continue
				ctx.save()

				if (shape.parentId !== currentPageId) {
					ctx.beginPath()
					ctx.rect(
						maskedPageBounds.minX,
						maskedPageBounds.minY,
						maskedPageBounds.width,
						maskedPageBounds.height
					)
					ctx.clip()
				}

				ctx.beginPath()

				ctx.globalAlpha = opacity

				const transform = editor.getShapePageTransform(shape.id)
				ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f)

				if (editor.isShapeOfType<TLDrawShape>(shape, 'draw')) {
					// Draw a freehand shape
					for (const segment of shape.props.segments) {
						// Start from the first point
						let px = segment.firstPoint.x
						let py = segment.firstPoint.y
						ctx.moveTo(px, py)

						if (segment.type === 'straight') {
							// For straight segments, there should be 2 deltas (dx, dy) for the end point
							const dx = segment.points[2] / 10
							const dy = segment.points[3] / 10
							ctx.lineTo(px + dx, py + dy)
						} else {
							// For free segments, accumulate deltas to get actual points
							const pointsPerStep = shape.props.isPen ? 3 : 2 // pen has x,y,z deltas, mouse has x,y
							for (let i = pointsPerStep; i < segment.points.length; i += pointsPerStep) {
								const dx = segment.points[i] / 10
								const dy = segment.points[i + 1] / 10
								px += dx
								py += dy
								ctx.lineTo(px, py)
							}
						}
					}
					ctx.strokeStyle = getColorValue(theme, shape.props.color, 'solid')
					ctx.lineWidth = 4
					ctx.stroke()
					if (shape.props.fill !== 'none' && shape.props.isClosed) {
						ctx.fillStyle = getColorValue(theme, shape.props.color, 'semi')
						ctx.fill()
					}
				} else if (editor.isShapeOfType<TLGeoShape>(shape, 'geo')) {
					// Draw a geo shape
					const bounds = editor.getShapeGeometry(shape).bounds
					ctx.strokeStyle = getColorValue(theme, shape.props.color, 'solid')
					ctx.lineWidth = 2
					ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height)
				} else {
					// Draw any other kind of shape
					const bounds = editor.getShapeGeometry(shape).bounds
					ctx.strokeStyle = 'black'
					ctx.lineWidth = 2
					ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height)
				}
				ctx.restore()
			}

			raf = requestAnimationFrame(render)
		}

		render()

		return () => {
			cancelAnimationFrame(raf)
		}
	}, [editor])

	return <canvas ref={rCanvas} />
}
