import { useLayoutEffect, useRef } from 'react'
import { TLDrawShape, TLGeoShape, getDefaultColorTheme, useEditor } from 'tldraw'

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

		let isCancelled = false

		function render() {
			if (isCancelled) return
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
						ctx.moveTo(segment.points[0].x, segment.points[0].y)
						if (segment.type === 'straight') {
							ctx.lineTo(segment.points[1].x, segment.points[1].y)
						} else {
							for (const point of segment.points.slice(1)) {
								ctx.lineTo(point.x, point.y)
							}
						}
					}
					ctx.strokeStyle = theme[shape.props.color].solid
					ctx.lineWidth = 4
					ctx.stroke()
					if (shape.props.fill !== 'none' && shape.props.isClosed) {
						ctx.fillStyle = theme[shape.props.color].semi
						ctx.fill()
					}
				} else if (editor.isShapeOfType<TLGeoShape>(shape, 'geo')) {
					// Draw a geo shape
					const bounds = editor.getShapeGeometry(shape).bounds
					ctx.strokeStyle = theme[shape.props.color].solid
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

			requestAnimationFrame(render)
		}

		render()

		return () => {
			isCancelled = true
		}
	}, [editor])

	return <canvas ref={rCanvas} />
}
