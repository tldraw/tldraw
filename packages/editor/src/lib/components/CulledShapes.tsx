import { useValue } from '@tldraw/state'
import { scale } from '@tldraw/utils'
import { useEffect, useRef } from 'react'
import { useEditor } from '../hooks/useEditor'

export function CulledShapes() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const editor = useEditor()
	const contextRef = useRef<WebGL2RenderingContext | null>(null)
	const vertextShaderRef = useRef<any>(null)
	const fragmentShaderRef = useRef<any>(null)
	const programRef = useRef<any>(null)

	const renderingShapes = useValue('rendering shapes', () => editor.getRenderingShapes(), [editor])
	const viewport = useValue('viewport', () => editor.getViewportPageBounds(), [editor])

	const isCullingOffScreenShapes = Number.isFinite(editor.renderingBoundsMargin)
	const selectedShapeIds = useValue('selected', () => editor.getSelectedShapeIds(), [editor])
	const renderingBoundsExpanded = useValue('rendering', () => editor.getRenderingBoundsExpanded(), [
		editor,
	])
	const editingShapeId = useValue('editing', () => editor.getEditingShapeId(), [editor])
	useEffect(() => {
		if (!isCullingOffScreenShapes) return
		// Parts of the below code are taken from MIT licensed project:
		// https://github.com/sessamekesh/webgl-tutorials-2023

		const canvas = canvasRef.current
		if (!canvas) return

		let context = contextRef.current
		if (!context) {
			context = canvas.getContext('webgl2')
			contextRef.current = context
			if (!context) return
		}

		let vertexShader = vertextShaderRef.current
		if (!vertexShader) {
			const vertexShaderSourceCode = `#version 300 es
  precision mediump float;
  
  in vec2 vertexPosition;

  void main() {
    gl_Position = vec4(vertexPosition, 0.0, 1.0);
  }`

			vertexShader = context.createShader(context.VERTEX_SHADER)
			if (!vertexShader) return
			vertextShaderRef.current = vertexShader
			context.shaderSource(vertexShader, vertexShaderSourceCode)
			context.compileShader(vertexShader)
			if (!context.getShaderParameter(vertexShader, context.COMPILE_STATUS)) {
				const errorMessage = context.getShaderInfoLog(vertexShader)
				console.log(`Failed to compile vertex shader: ${errorMessage}`)
				return
			}
		}

		let fragmentShader = fragmentShaderRef.current
		if (!fragmentShader) {
			const fragmentShaderSourceCode = `#version 300 es
  precision mediump float;
  
  out vec4 outputColor;

  void main() {
    outputColor = vec4(0.922, 0.933, 0.941, 1.0);
  }`

			fragmentShader = context.createShader(context.FRAGMENT_SHADER)
			if (!fragmentShader) return
			fragmentShaderRef.current = fragmentShader
			context.shaderSource(fragmentShader, fragmentShaderSourceCode)
			context.compileShader(fragmentShader)
			if (!context.getShaderParameter(fragmentShader, context.COMPILE_STATUS)) {
				const errorMessage = context.getShaderInfoLog(fragmentShader)
				console.log(`Failed to compile fragment shader: ${errorMessage}`)
				return
			}
		}

		let program = programRef.current
		if (!program) {
			program = context.createProgram()
			if (!program) return
			context.attachShader(program, vertexShader)
			context.attachShader(program, fragmentShader)
			context.linkProgram(program)
			if (!context.getProgramParameter(program, context.LINK_STATUS)) {
				const errorMessage = context.getProgramInfoLog(program)
				console.log(`Failed to link GPU program: ${errorMessage}`)
				return
			}
		}

		const vertexPositionAttributeLocation = context.getAttribLocation(program, 'vertexPosition')
		if (vertexPositionAttributeLocation < 0) {
			console.log(`Failed to get attribute location for vertexPosition`)
			return
		}

		canvas.width = canvas.clientWidth
		canvas.height = canvas.clientHeight
		context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT)

		context.viewport(0, 0, canvas.width, canvas.height)

		context.useProgram(program)
		context.enableVertexAttribArray(vertexPositionAttributeLocation)

		const shapes = renderingShapes
		const triangleVertices: number[] = []

		shapes.forEach(({ shape, id }) => {
			const isCulled = editor.isShapeCulled(shape)
			if (!isCulled) return

			const shapePageBounds = editor.getShapePageBounds(shape)
			if (!shapePageBounds) return

			// We need to scale the position from the page dimensions to something webgl understands
			// y is also flipped compared to our page coordinates
			const xScale = scale(viewport.minX, viewport.maxX, -1, 1)
			const yScale = scale(viewport.minY, viewport.maxY, 1, -1)

			const minX = xScale(shape.x)
			const maxX = xScale(shapePageBounds.x + shapePageBounds.width)
			const minY = yScale(shape.y)
			const maxY = yScale(shapePageBounds.y + shapePageBounds.height)

			// We create the rectangle around shapes bounds by sticthing together two triangles
			triangleVertices.push(...[minX, minY, minX, maxY, maxX, maxY])
			triangleVertices.push(...[minX, minY, maxX, minY, maxX, maxY])
		})

		const triangleGeoCpuBuffer = new Float32Array(triangleVertices)
		const triangleGeoBuffer = context.createBuffer()
		context.bindBuffer(context.ARRAY_BUFFER, triangleGeoBuffer)
		context.bufferData(context.ARRAY_BUFFER, triangleGeoCpuBuffer, context.STATIC_DRAW)

		context.bindBuffer(context.ARRAY_BUFFER, triangleGeoBuffer)
		context.vertexAttribPointer(
			vertexPositionAttributeLocation,
			2,
			context.FLOAT,
			false,
			2 * Float32Array.BYTES_PER_ELEMENT,
			0
		)
		context.drawArrays(context.TRIANGLES, 0, triangleVertices.length / 2)
	}, [
		viewport,
		renderingShapes,
		editor,
		isCullingOffScreenShapes,
		editingShapeId,
		renderingBoundsExpanded,
		selectedShapeIds,
	])
	return isCullingOffScreenShapes ? (
		<canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
	) : null
}
