import { computed, react } from '@tldraw/state'
import { measureCbDuration } from '@tldraw/utils'
import { useEffect, useRef } from 'react'
import { useEditor } from '../hooks/useEditor'
import { useIsDarkMode } from '../hooks/useIsDarkMode'

// Parts of the below code are taken from MIT licensed project:
// https://github.com/sessamekesh/webgl-tutorials-2023
function setupWebGl(canvas: HTMLCanvasElement | null, isDarkMode: boolean) {
	if (!canvas) return

	const context = canvas.getContext('webgl2')
	if (!context) return

	const vertexShaderSourceCode = `#version 300 es
  precision mediump float;
  
  in vec2 shapeVertexPosition;
  uniform vec2 viewportStart; 
  uniform vec2 viewportEnd; 

  void main() {
	// We need to transform from page coordinates to something WebGl understands
	float viewportWidth = viewportEnd.x - viewportStart.x;
	float viewportHeight = viewportEnd.y - viewportStart.y;
	vec2 finalPosition = vec2(
		2.0 * (shapeVertexPosition.x - viewportStart.x) / viewportWidth - 1.0, 
		1.0 - 2.0 * (shapeVertexPosition.y - viewportStart.y) / viewportHeight
	);
	gl_Position = vec4(finalPosition, 0.0, 1.0);
  }`

	const vertexShader = context.createShader(context.VERTEX_SHADER)
	if (!vertexShader) return
	context.shaderSource(vertexShader, vertexShaderSourceCode)
	context.compileShader(vertexShader)
	if (!context.getShaderParameter(vertexShader, context.COMPILE_STATUS)) {
		return
	}
	// Dark = hsl(210, 11%, 19%)
	// Light = hsl(204, 14%, 93%)
	const color = isDarkMode ? 'vec4(0.169, 0.188, 0.212, 1.0)' : 'vec4(0.922, 0.933, 0.941, 1.0)'

	const fragmentShaderSourceCode = `#version 300 es
  precision mediump float;
  
  out vec4 outputColor;

  void main() {
	outputColor = ${color};
  }`

	const fragmentShader = context.createShader(context.FRAGMENT_SHADER)
	if (!fragmentShader) return
	context.shaderSource(fragmentShader, fragmentShaderSourceCode)
	context.compileShader(fragmentShader)
	if (!context.getShaderParameter(fragmentShader, context.COMPILE_STATUS)) {
		return
	}

	const program = context.createProgram()
	if (!program) return
	context.attachShader(program, vertexShader)
	context.attachShader(program, fragmentShader)
	context.linkProgram(program)
	if (!context.getProgramParameter(program, context.LINK_STATUS)) {
		return
	}
	context.useProgram(program)

	const shapeVertexPositionAttributeLocation = context.getAttribLocation(
		program,
		'shapeVertexPosition'
	)
	if (shapeVertexPositionAttributeLocation < 0) {
		return
	}
	context.enableVertexAttribArray(shapeVertexPositionAttributeLocation)

	const viewportStartUniformLocation = context.getUniformLocation(program, 'viewportStart')
	const viewportEndUniformLocation = context.getUniformLocation(program, 'viewportEnd')
	if (!viewportStartUniformLocation || !viewportEndUniformLocation) {
		return
	}
	return {
		context,
		program,
		shapeVertexPositionAttributeLocation,
		viewportStartUniformLocation,
		viewportEndUniformLocation,
	}
}

export function CulledShapes() {
	const editor = useEditor()
	const isDarkMode = useIsDarkMode()
	const canvasRef = useRef<HTMLCanvasElement>(null)

	const isCullingOffScreenShapes = Number.isFinite(editor.renderingBoundsMargin)

	useEffect(() => {
		const webGl = setupWebGl(canvasRef.current, isDarkMode)
		if (!webGl) return
		if (!isCullingOffScreenShapes) return

		const {
			context,
			shapeVertexPositionAttributeLocation,
			viewportStartUniformLocation,
			viewportEndUniformLocation,
		} = webGl

		const shapeVertices = computed('shape vertices', function calculateCulledShapeVertices() {
			const results: number[] = []

			return measureCbDuration('vertices', () => {
				editor.getCulledShapes().forEach((maskedPageBounds) => {
					if (maskedPageBounds) {
						results.push(
							// triangle 1
							maskedPageBounds.minX,
							maskedPageBounds.minY,
							maskedPageBounds.minX,
							maskedPageBounds.maxY,
							maskedPageBounds.maxX,
							maskedPageBounds.maxY,
							// triangle 2
							maskedPageBounds.minX,
							maskedPageBounds.minY,
							maskedPageBounds.maxX,
							maskedPageBounds.minY,
							maskedPageBounds.maxX,
							maskedPageBounds.maxY
						)
					}
				})

				return results
			})
		})

		return react('render culled shapes ', function renderCulledShapes() {
			const canvas = canvasRef.current
			if (!canvas) return

			const width = canvas.clientWidth
			const height = canvas.clientHeight
			if (width !== canvas.width || height !== canvas.height) {
				canvas.width = width
				canvas.height = height
				context.viewport(0, 0, width, height)
			}

			const verticesArray = shapeVertices.get()
			context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT)
			if (verticesArray.length > 0) {
				const viewport = editor.getViewportPageBounds() // when the viewport changes...
				context.uniform2f(viewportStartUniformLocation, viewport.minX, viewport.minY)
				context.uniform2f(viewportEndUniformLocation, viewport.maxX, viewport.maxY)
				const triangleGeoCpuBuffer = new Float32Array(verticesArray)
				const triangleGeoBuffer = context.createBuffer()
				context.bindBuffer(context.ARRAY_BUFFER, triangleGeoBuffer)
				context.bufferData(context.ARRAY_BUFFER, triangleGeoCpuBuffer, context.STATIC_DRAW)
				context.vertexAttribPointer(
					shapeVertexPositionAttributeLocation,
					2,
					context.FLOAT,
					false,
					2 * Float32Array.BYTES_PER_ELEMENT,
					0
				)
				context.drawArrays(context.TRIANGLES, 0, verticesArray.length / 2)
			}
		})
	}, [isCullingOffScreenShapes, isDarkMode, editor])
	return isCullingOffScreenShapes ? (
		<canvas ref={canvasRef} className="tl-culled-shapes__canvas" />
	) : null
}
