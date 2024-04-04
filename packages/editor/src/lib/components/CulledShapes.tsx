import { computed, react, track } from '@tldraw/state'
import { useEffect, useRef } from 'react'
import { useEditor } from '../hooks/useEditor'

// Parts of the below code are taken from MIT licensed project:
// https://github.com/sessamekesh/webgl-tutorials-2023
function setupWebGl(canvas: HTMLCanvasElement | null, isDarkMode: boolean) {
	if (!canvas) return

	const context = canvas.getContext('webgl2')
	if (!context) return

	const vertexShaderSourceCode = `#version 300 es
  precision mediump float;
  
  in vec2 shapeVertexPosition;
  uniform vec2 viewportStartUniform; 
  uniform vec2 viewportEndUniform; 

  void main() {
    float viewportWidth = viewportEndUniform.x - viewportStartUniform.x;
    float viewportHeight = viewportEndUniform.y - viewportStartUniform.y;
	vec2 finalPosition = vec2(
		2.0 * (shapeVertexPosition.x - viewportStartUniform.x) / viewportWidth - 1.0, 
		1.0 - 2.0 * (shapeVertexPosition.y - viewportStartUniform.y) / viewportHeight
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

	const viewportStartUniformLocation = context.getUniformLocation(program, 'viewportStartUniform')
	const viewportEndUniformLocation = context.getUniformLocation(program, 'viewportEndUniform')
	if (!viewportStartUniformLocation || !viewportEndUniformLocation) {
		return
	}
	context.enableVertexAttribArray(shapeVertexPositionAttributeLocation)
	return {
		context,
		program,
		shapeVertexPositionAttributeLocation,
		viewportStartUniformLocation,
		viewportEndUniformLocation,
	}
}

export const CulledShapes = track(function CulledShapes() {
	const editor = useEditor()
	const isDarkMode = editor.user.getUserPreferences().isDarkMode
	const canvasRef = useRef<HTMLCanvasElement>(null)

	const isCullingOffScreenShapes = Number.isFinite(editor.renderingBoundsMargin)

	useEffect(() => {
		const webGl = setupWebGl(canvasRef.current, isDarkMode)
		if (!webGl) return
		const {
			context,
			shapeVertexPositionAttributeLocation,
			viewportStartUniformLocation,
			viewportEndUniformLocation,
		} = webGl
		const shapeVertices = computed('calculate shape vertices', () => {
			return editor.getRenderingShapes().reduce((result, { shape }) => {
				if (!editor.isShapeCulled(shape)) return result

				const shapePageBounds = editor.getShapePageBounds(shape)
				if (!shapePageBounds) return result

				result.push(
					shapePageBounds.minX,
					shapePageBounds.minY,
					shapePageBounds.minX,
					shapePageBounds.maxY,
					shapePageBounds.maxX,
					shapePageBounds.maxY,
					shapePageBounds.minX,
					shapePageBounds.minY,
					shapePageBounds.maxX,
					shapePageBounds.minY,
					shapePageBounds.maxX,
					shapePageBounds.maxY
				)
				return result
			}, [] as number[])
		})
		return react('render culled shapes ', () => {
			const canvas = canvasRef.current
			if (!canvas || !isCullingOffScreenShapes) return

			const width = canvas.clientWidth
			const height = canvas.clientHeight
			if (width !== canvas.width || height !== canvas.height) {
				canvas.width = width
				canvas.height = height
				context.viewport(0, 0, width, height)
			}

			context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT)

			const viewport = editor.getViewportPageBounds()
			context.uniform2f(viewportStartUniformLocation, viewport.minX, viewport.minY)
			context.uniform2f(viewportEndUniformLocation, viewport.maxX, viewport.maxY)
			const verticesArray = shapeVertices.get()
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
		})
	}, [isCullingOffScreenShapes, isDarkMode, editor])
	return isCullingOffScreenShapes ? (
		<canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
	) : null
})
