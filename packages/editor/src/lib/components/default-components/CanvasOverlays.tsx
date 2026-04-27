import { useQuickReactor } from '@tldraw/state-react'
import { memo, useRef } from 'react'
import { useEditor } from '../../hooks/useEditor'
import { Geometry2d } from '../../primitives/geometry/Geometry2d'
import { Group2d } from '../../primitives/geometry/Group2d'
import { debugFlags } from '../../utils/debug-flags'

/** @internal @react */
export const CanvasOverlays = memo(function CanvasOverlays() {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useQuickReactor(
		'canvas overlays render',
		() => {
			const canvas = canvasRef.current
			if (!canvas) return

			const ctx = canvas.getContext('2d')
			if (!ctx) return

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

			ctx.resetTransform()
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// Apply DPR scaling and camera transform to get into page space
			ctx.scale(dpr, dpr)
			ctx.scale(zoom, zoom)
			ctx.translate(cx, cy)

			// Render all active overlay utils in zIndex order (low to high).
			for (const { util, overlays } of editor.overlays.getActiveOverlayEntries()) {
				ctx.save()
				util.render(ctx, overlays)
				ctx.restore()
			}

			// Debug: draw all geometry
			if (debugFlags.debugGeometry.get()) {
				const currentPagePoint = editor.inputs.getCurrentPagePoint()

				// Shape geometries
				const renderingShapes = editor.getRenderingShapes()
				for (const result of renderingShapes) {
					const shape = editor.getShape(result.id)
					if (!shape || shape.type === 'group') continue

					const geometry = editor.getShapeGeometry(shape)
					const pageTransform = editor.getShapePageTransform(shape)
					if (!pageTransform) continue

					ctx.save()
					const m = pageTransform
					ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f)

					// Outline
					ctx.strokeStyle = geometry.debugColor ?? 'red'
					ctx.lineWidth = 2 / zoom
					ctx.fillStyle = 'none'
					drawGeometryStroke(ctx, geometry)

					// Vertices
					const { vertices } = geometry
					for (let i = 0; i < vertices.length; i++) {
						const v = vertices[i]
						const hue = vertices.length > 1 ? 120 + ((200 - 120) * i) / (vertices.length - 1) : 160
						ctx.fillStyle = `hsl(${hue}, 100%, 50%)`
						ctx.strokeStyle = 'black'
						ctx.lineWidth = 1 / zoom
						ctx.beginPath()
						ctx.arc(v.x, v.y, 2 / zoom, 0, Math.PI * 2)
						ctx.fill()
						ctx.stroke()
					}

					// Nearest point line
					const pointInShapeSpace = editor.getPointInShapeSpace(shape, currentPagePoint)
					const dist = Math.abs(geometry.distanceToPoint(pointInShapeSpace, true)) * zoom
					if (dist < 150) {
						const nearestPoint = geometry.nearestPoint(pointInShapeSpace)
						const hitInside = geometry.distanceToPoint(pointInShapeSpace, true) < 0
						ctx.strokeStyle = hitInside ? 'goldenrod' : 'dodgerblue'
						ctx.lineWidth = 2 / zoom
						ctx.globalAlpha = 1 - dist / 150
						ctx.beginPath()
						ctx.moveTo(nearestPoint.x, nearestPoint.y)
						ctx.lineTo(pointInShapeSpace.x, pointInShapeSpace.y)
						ctx.stroke()
						ctx.globalAlpha = 1
					}

					ctx.restore()
				}

				// Overlay hit-test geometries
				ctx.save()
				ctx.strokeStyle = 'magenta'
				ctx.fillStyle = 'rgba(255, 0, 255, 0.1)'
				ctx.lineWidth = 1 / zoom
				for (const { overlays } of editor.overlays.getActiveOverlayEntries()) {
					for (const overlay of overlays) {
						const geometry = editor.overlays.getOverlayGeometry(overlay)
						if (!geometry) continue
						const vertices = geometry.vertices
						if (vertices.length < 2) continue
						ctx.beginPath()
						ctx.moveTo(vertices[0].x, vertices[0].y)
						for (let i = 1; i < vertices.length; i++) {
							ctx.lineTo(vertices[i].x, vertices[i].y)
						}
						if (geometry.isClosed) {
							ctx.closePath()
							ctx.fill()
						}
						ctx.stroke()
						for (const v of vertices) {
							ctx.beginPath()
							ctx.arc(v.x, v.y, 2 / zoom, 0, Math.PI * 2)
							ctx.fill()
						}
					}
				}
				ctx.restore()
			}
		},
		[editor]
	)

	return <canvas ref={canvasRef} className="tl-canvas-overlays" />
})

function drawGeometryStroke(ctx: CanvasRenderingContext2D, geometry: Geometry2d) {
	if (geometry instanceof Group2d) {
		const prevStroke = ctx.strokeStyle
		for (const child of [...geometry.children, ...geometry.ignoredChildren]) {
			if (child.debugColor) ctx.strokeStyle = child.debugColor
			drawGeometryStroke(ctx, child)
			ctx.strokeStyle = prevStroke
		}
		return
	}

	const vertices = geometry.vertices
	if (vertices.length < 2) return
	ctx.beginPath()
	ctx.moveTo(vertices[0].x, vertices[0].y)
	for (let i = 1; i < vertices.length; i++) {
		ctx.lineTo(vertices[i].x, vertices[i].y)
	}
	if (geometry.isClosed) ctx.closePath()
	ctx.stroke()
}
