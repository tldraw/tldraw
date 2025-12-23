import type { TLShapeId } from '@tldraw/tlschema'
import type { Editor } from '../../editor/Editor'
import { Mat, MatModel } from '../../primitives/Mat'

/**
 * Configuration for a single indicator to render
 * @public
 */
export interface IndicatorConfig {
	shapeId: TLShapeId
	transform: MatModel
	vertices: Float32Array
	color: [number, number, number, number]
	isClosed: boolean
}

// Vertex shader for line rendering
const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec4 a_color;

uniform mat3 u_projection;

out vec4 v_color;

void main() {
	vec3 pos = u_projection * vec3(a_position, 1.0);
	gl_Position = vec4(pos.xy, 0.0, 1.0);
	v_color = a_color;
}
`

// Fragment shader for line rendering
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 fragColor;

void main() {
	fragColor = v_color;
}
`

/**
 * WebGL-based manager for rendering shape indicators.
 * Replaces the DOM-based SVG indicator system with GPU-accelerated rendering.
 * @public
 */
export class WebGLIndicatorManager {
	private gl: WebGL2RenderingContext | null = null
	private program: WebGLProgram | null = null
	private vao: WebGLVertexArrayObject | null = null
	private positionBuffer: WebGLBuffer | null = null
	private colorBuffer: WebGLBuffer | null = null
	private u_projection: WebGLUniformLocation | null = null

	private isInitialized = false
	private isDisposed = false
	private needsRender = true

	// Cache for indicator data
	private indicatorVertices: Float32Array = new Float32Array(0)
	private indicatorColors: Float32Array = new Float32Array(0)
	private segmentCounts: number[] = []

	constructor(
		readonly editor: Editor,
		readonly canvas: HTMLCanvasElement
	) {}

	/**
	 * Initialize WebGL context and compile shaders
	 */
	initialize(): boolean {
		if (this.isInitialized) return true
		if (this.isDisposed) return false

		try {
			this.gl = this.canvas.getContext('webgl2', {
				alpha: true,
				antialias: true,
				premultipliedAlpha: true,
				preserveDrawingBuffer: false,
			})

			if (!this.gl) {
				console.warn('WebGL2 not available for indicators')
				return false
			}

			// Compile shaders
			const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, VERTEX_SHADER)
			const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER)

			if (!vertexShader || !fragmentShader) {
				return false
			}

			// Create program
			this.program = this.gl.createProgram()
			if (!this.program) {
				console.error('Failed to create WebGL program')
				return false
			}

			this.gl.attachShader(this.program, vertexShader)
			this.gl.attachShader(this.program, fragmentShader)
			this.gl.linkProgram(this.program)

			if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
				console.error('Program link error:', this.gl.getProgramInfoLog(this.program))
				return false
			}

			// Get uniform locations
			this.u_projection = this.gl.getUniformLocation(this.program, 'u_projection')

			// Create VAO
			this.vao = this.gl.createVertexArray()
			this.gl.bindVertexArray(this.vao)

			// Create buffers
			this.positionBuffer = this.gl.createBuffer()
			this.colorBuffer = this.gl.createBuffer()

			// Setup position attribute
			const a_position = this.gl.getAttribLocation(this.program, 'a_position')
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer)
			this.gl.enableVertexAttribArray(a_position)
			this.gl.vertexAttribPointer(a_position, 2, this.gl.FLOAT, false, 0, 0)

			// Setup color attribute
			const a_color = this.gl.getAttribLocation(this.program, 'a_color')
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer)
			this.gl.enableVertexAttribArray(a_color)
			this.gl.vertexAttribPointer(a_color, 4, this.gl.FLOAT, false, 0, 0)

			this.gl.bindVertexArray(null)

			// Cleanup shaders (attached to program now)
			this.gl.deleteShader(vertexShader)
			this.gl.deleteShader(fragmentShader)

			this.isInitialized = true
			return true
		} catch (e) {
			console.error('Failed to initialize WebGL indicator manager:', e)
			return false
		}
	}

	private compileShader(type: number, source: string): WebGLShader | null {
		if (!this.gl) return null

		const shader = this.gl.createShader(type)
		if (!shader) return null

		this.gl.shaderSource(shader, source)
		this.gl.compileShader(shader)

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.error('Shader compile error:', this.gl.getShaderInfoLog(shader))
			this.gl.deleteShader(shader)
			return null
		}

		return shader
	}

	/**
	 * Update the canvas size to match container
	 */
	resize(): void {
		if (!this.gl || !this.isInitialized) return

		const { width, height } = this.canvas.getBoundingClientRect()
		const dpr = Math.min(window.devicePixelRatio || 1, 2)
		const canvasWidth = Math.floor(width * dpr)
		const canvasHeight = Math.floor(height * dpr)

		if (this.canvas.width !== canvasWidth || this.canvas.height !== canvasHeight) {
			this.canvas.width = canvasWidth
			this.canvas.height = canvasHeight
			this.gl.viewport(0, 0, canvasWidth, canvasHeight)
			this.needsRender = true
		}
	}

	/**
	 * Set indicator data for rendering.
	 * This collects all vertex data from the provided indicators.
	 */
	setIndicators(indicators: IndicatorConfig[]): void {
		// Count total vertices needed
		let totalVertices = 0
		this.segmentCounts = []

		for (const indicator of indicators) {
			// For line strip, we need (n-1) line segments, each with 2 vertices
			// But we duplicate vertices for separate line segments
			const vertexCount = indicator.vertices.length / 2
			if (vertexCount < 2) continue

			// For LINE_STRIP rendering, we just need the original vertices
			// But we need to track segment lengths
			const segmentVertices = indicator.isClosed ? vertexCount + 1 : vertexCount
			totalVertices += segmentVertices
			this.segmentCounts.push(segmentVertices)
		}

		// Allocate arrays
		this.indicatorVertices = new Float32Array(totalVertices * 2)
		this.indicatorColors = new Float32Array(totalVertices * 4)

		// Fill arrays
		let vertexOffset = 0
		for (let i = 0; i < indicators.length; i++) {
			const indicator = indicators[i]
			const vertexCount = indicator.vertices.length / 2
			if (vertexCount < 2) continue

			const transform = indicator.transform
			const color = indicator.color

			// Transform and copy vertices
			for (let j = 0; j < vertexCount; j++) {
				const srcIdx = j * 2
				const dstIdx = (vertexOffset + j) * 2

				// Apply transform to vertex
				const x = indicator.vertices[srcIdx]
				const y = indicator.vertices[srcIdx + 1]
				const transformed = Mat.applyToPoint(transform, { x, y })

				this.indicatorVertices[dstIdx] = transformed.x
				this.indicatorVertices[dstIdx + 1] = transformed.y

				// Copy color
				const colorIdx = (vertexOffset + j) * 4
				this.indicatorColors[colorIdx] = color[0]
				this.indicatorColors[colorIdx + 1] = color[1]
				this.indicatorColors[colorIdx + 2] = color[2]
				this.indicatorColors[colorIdx + 3] = color[3]
			}

			// If closed, add first vertex again to close the loop
			if (indicator.isClosed) {
				const dstIdx = (vertexOffset + vertexCount) * 2
				const x = indicator.vertices[0]
				const y = indicator.vertices[1]
				const transformed = Mat.applyToPoint(transform, { x, y })

				this.indicatorVertices[dstIdx] = transformed.x
				this.indicatorVertices[dstIdx + 1] = transformed.y

				const colorIdx = (vertexOffset + vertexCount) * 4
				this.indicatorColors[colorIdx] = color[0]
				this.indicatorColors[colorIdx + 1] = color[1]
				this.indicatorColors[colorIdx + 2] = color[2]
				this.indicatorColors[colorIdx + 3] = color[3]
			}

			vertexOffset += indicator.isClosed ? vertexCount + 1 : vertexCount
		}

		this.needsRender = true
	}

	/**
	 * Render all indicators to the canvas
	 */
	render(): void {
		if (!this.gl || !this.program || !this.isInitialized) return

		const gl = this.gl

		// Clear canvas
		gl.clearColor(0, 0, 0, 0)
		gl.clear(gl.COLOR_BUFFER_BIT)

		if (this.indicatorVertices.length === 0) return

		// Get camera for projection
		const camera = this.editor.getCamera()
		const { width, height } = this.canvas.getBoundingClientRect()

		// Create projection matrix that transforms from page coordinates to clip space
		// First apply camera (translate by camera position, scale by zoom)
		// Then transform to clip space (-1 to 1)
		const scaleX = (2 * camera.z) / width
		const scaleY = (-2 * camera.z) / height
		const translateX = (camera.x * camera.z * 2) / width - 1
		const translateY = (-camera.y * camera.z * 2) / height + 1

		// Column-major 3x3 matrix for 2D transform
		const projectionMatrix = new Float32Array([
			scaleX,
			0,
			0,
			0,
			scaleY,
			0,
			translateX,
			translateY,
			1,
		])

		// Use program
		gl.useProgram(this.program)

		// Set uniforms
		gl.uniformMatrix3fv(this.u_projection, false, projectionMatrix)

		// Upload vertex data
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
		gl.bufferData(gl.ARRAY_BUFFER, this.indicatorVertices, gl.DYNAMIC_DRAW)

		// Upload color data
		gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer)
		gl.bufferData(gl.ARRAY_BUFFER, this.indicatorColors, gl.DYNAMIC_DRAW)

		// Enable blending for alpha
		gl.enable(gl.BLEND)
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

		// Set line width (note: WebGL line width > 1 is not widely supported)
		gl.lineWidth(1.5)

		// Bind VAO and draw
		gl.bindVertexArray(this.vao)

		// Draw each indicator segment as a line strip
		let offset = 0
		for (const count of this.segmentCounts) {
			gl.drawArrays(gl.LINE_STRIP, offset, count)
			offset += count
		}

		gl.bindVertexArray(null)
		this.needsRender = false
	}

	/**
	 * Check if a render is needed
	 */
	getNeedsRender(): boolean {
		return this.needsRender
	}

	/**
	 * Mark that a render is needed
	 */
	markNeedsRender(): void {
		this.needsRender = true
	}

	/**
	 * Check if WebGL is available
	 */
	getIsInitialized(): boolean {
		return this.isInitialized
	}

	/**
	 * Dispose of WebGL resources
	 */
	dispose(): void {
		if (this.isDisposed) return

		if (this.gl) {
			if (this.vao) {
				this.gl.deleteVertexArray(this.vao)
				this.vao = null
			}
			if (this.positionBuffer) {
				this.gl.deleteBuffer(this.positionBuffer)
				this.positionBuffer = null
			}
			if (this.colorBuffer) {
				this.gl.deleteBuffer(this.colorBuffer)
				this.colorBuffer = null
			}
			if (this.program) {
				this.gl.deleteProgram(this.program)
				this.program = null
			}
		}

		this.gl = null
		this.isDisposed = true
		this.isInitialized = false
	}
}
