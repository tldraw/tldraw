import { Editor, Group2d, react, TLShape, Vec } from 'tldraw'
import { WebGLManager } from '../WebGLManager'
import fragmentShader from './fragment.glsl?raw'
import vertexShader from './vertex.glsl?raw'

// Vertex shader for rendering a full-screen quad
const VERTEX_SHADER = vertexShader

// Fragment shader for rendering the smoke effect
const FRAGMENT_SHADER = fragmentShader

export interface Geometry {
	segments: Array<{ start: Vec; end: Vec }>
}

export class ShadowCastingShaderManager extends WebGLManager {
	private program: WebGLProgram | null = null
	private positionBuffer: WebGLBuffer | null = null
	private vao: WebGLVertexArrayObject | null = null

	// Uniform locations
	private u_resolution: WebGLUniformLocation | null = null
	private u_darkMode: WebGLUniformLocation | null = null
	private u_quality: WebGLUniformLocation | null = null
	private u_zoom: WebGLUniformLocation | null = null
	private u_segments: WebGLUniformLocation | null = null
	private u_segmentCount: WebGLUniformLocation | null = null
	private u_lightPos: WebGLUniformLocation | null = null
	private u_shadowContrast: WebGLUniformLocation | null = null

	private geometries: Geometry[] = []
	private isDarkMode = false
	private maxSegments: number = 2000
	private lightPos: Vec = new Vec(0, 0)
	private shadowContrast: number = 0.08

	private editor: Editor

	constructor(
		editor: Editor,
		canvas: HTMLCanvasElement,
		quality: number = 1,
		shadowContrast: number = 0.08
	) {
		super(canvas, quality)
		this.editor = editor
		this.shadowContrast = shadowContrast
		// Calculate max segments based on quality (inverse relationship)
		// Lower quality = fewer pixels to compute = can handle more segments
		// Cap at 512 to stay within WebGL uniform limits
		this.maxSegments = Math.floor(Math.min(512, 2000 / quality))
		// Start paused - we'll render on-demand when things change
		this.initialize(true, undefined, true)
	}

	private _disposables = new Set<() => void>()

	protected onInitialize = (): void => {
		if (!this.gl) {
			console.error('No WebGL context available')
			return
		}

		// Check if context is lost before doing anything
		if (this.gl.isContextLost()) {
			console.error('WebGL context is lost, cannot initialize')
			return
		}

		const isWebGL2 = this.gl instanceof WebGL2RenderingContext

		// Test context by checking a simple parameter
		const maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE)

		if (!maxTextureSize) {
			console.error('WebGL context appears invalid (max texture size is null)')
			return
		}

		// Compile shaders and create program
		const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, VERTEX_SHADER)
		if (!vertexShader) {
			console.error('Failed to compile vertex shader, aborting initialization')
			return
		}

		const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
		if (!fragmentShader) {
			console.error('Failed to compile fragment shader, aborting initialization')
			// Clean up vertex shader
			this.gl.deleteShader(vertexShader)
			return
		}

		this.program = this.gl.createProgram()

		if (!this.program) {
			console.error('Failed to create program')
			return
		}

		this.gl.attachShader(this.program, vertexShader)
		this.gl.attachShader(this.program, fragmentShader)
		this.gl.linkProgram(this.program)

		if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
			console.error('Program link error:', this.gl.getProgramInfoLog(this.program))
			return
		}

		// Get uniform locations
		this.u_resolution = this.gl.getUniformLocation(this.program, 'u_resolution')
		this.u_darkMode = this.gl.getUniformLocation(this.program, 'u_darkMode')
		this.u_quality = this.gl.getUniformLocation(this.program, 'u_quality')
		this.u_zoom = this.gl.getUniformLocation(this.program, 'u_zoom')
		this.u_segments = this.gl.getUniformLocation(this.program, 'u_segments')
		this.u_segmentCount = this.gl.getUniformLocation(this.program, 'u_segmentCount')
		this.u_lightPos = this.gl.getUniformLocation(this.program, 'u_lightPos')
		this.u_shadowContrast = this.gl.getUniformLocation(this.program, 'u_shadowContrast')

		// Create a full-screen quad
		this.positionBuffer = this.gl.createBuffer()

		// Create and set up VAO for WebGL2
		if (isWebGL2) {
			const gl2 = this.gl as WebGL2RenderingContext
			this.vao = gl2.createVertexArray()
			gl2.bindVertexArray(this.vao)
		}

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer)
		const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
		this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW)

		// Set up attribute
		const a_position = this.gl.getAttribLocation(this.program, 'a_position')
		this.gl.enableVertexAttribArray(a_position)
		this.gl.vertexAttribPointer(a_position, 2, this.gl.FLOAT, false, 0, 0)

		// Unbind VAO
		if (isWebGL2) {
			const gl2 = this.gl as WebGL2RenderingContext
			gl2.bindVertexArray(null)
		}

		// Initial dark mode check
		this.isDarkMode = this.editor.user.getIsDarkMode()

		// Listen for shape changes
		this._disposables.add(
			react('shapes', () => {
				this.updateGeometries()
				// Trigger a single frame render when shapes change
				this.renderFrame()
			})
		)

		// Listen for theme changes
		this._disposables.add(
			react('dark mode', () => {
				const newIsDarkMode = this.editor.user.getIsDarkMode()
				if (newIsDarkMode !== this.isDarkMode) {
					this.isDarkMode = newIsDarkMode
					this.renderFrame()
				}
			})
		)

		// Listen for camera changes
		this._disposables.add(
			react('camera', () => {
				this.editor.getCamera()
				this.renderFrame()
			})
		)

		// Note: Config changes (quality, radius) trigger manager recreation in ShadowCastingExample

		// Initial geometry update
		this.updateGeometries()

		// Render the first frame
		this.renderFrame()
	}

	protected onRender = (_deltaTime: number, _currentTime: number): void => {
		if (!this.gl || !this.program) return

		// Clear with transparent background
		this.gl.clearColor(0, 0, 0, 0)
		this.gl.clear(this.gl.COLOR_BUFFER_BIT)

		// Enable blending
		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

		this.gl.useProgram(this.program)

		// Set uniforms
		if (this.u_resolution) {
			this.gl.uniform2f(this.u_resolution, this.canvas.width, this.canvas.height)
		}
		if (this.u_darkMode) {
			this.gl.uniform1f(this.u_darkMode, this.isDarkMode ? 1.0 : 0.0)
		}
		if (this.u_quality) {
			this.gl.uniform1f(this.u_quality, this.quality)
		}
		if (this.u_zoom) {
			this.gl.uniform1f(this.u_zoom, this.editor.getZoomLevel())
		}
		if (this.u_lightPos) {
			this.gl.uniform2f(this.u_lightPos, this.lightPos.x, this.lightPos.y)
		}
		if (this.u_shadowContrast) {
			this.gl.uniform1f(this.u_shadowContrast, this.shadowContrast)
		}

		// Flatten all geometries into segments array
		const allSegments: number[] = []

		for (const geometry of this.geometries) {
			const { segments } = geometry
			for (const segment of segments) {
				if (allSegments.length < this.maxSegments * 4) {
					allSegments.push(segment.start.x, segment.start.y, segment.end.x, segment.end.y)
				}
			}
		}

		// Pad arrays with far-away coordinates so they don't appear on screen
		const farAway = 999999
		while (allSegments.length < this.maxSegments * 4)
			allSegments.push(farAway, farAway, farAway, farAway)

		// Upload geometry data
		if (this.u_segments) {
			this.gl.uniform4fv(this.u_segments, allSegments)
		}
		if (this.u_segmentCount) {
			this.gl.uniform1f(this.u_segmentCount, Math.min(allSegments.length / 4, this.maxSegments))
		}

		// Bind VAO if using WebGL2
		if (this.vao && this.gl instanceof WebGL2RenderingContext) {
			this.gl.bindVertexArray(this.vao)
		}

		// Draw the quad
		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)

		// Unbind VAO
		if (this.vao && this.gl instanceof WebGL2RenderingContext) {
			this.gl.bindVertexArray(null)
		}
	}

	protected onDispose = (): void => {
		this._disposables.forEach((dispose) => dispose())
		this._disposables.clear()

		// Clean up WebGL resources
		if (this.gl) {
			if (this.vao && this.gl instanceof WebGL2RenderingContext) {
				this.gl.deleteVertexArray(this.vao)
				this.vao = null
			}
			if (this.positionBuffer) {
				this.gl.deleteBuffer(this.positionBuffer)
				this.positionBuffer = null
			}
			if (this.program) {
				this.gl.deleteProgram(this.program)
				this.program = null
			}
		}
	}

	private compileShader = (type: number, source: string): WebGLShader | null => {
		if (!this.gl) {
			console.error('No GL context')
			return null
		}

		const shader = this.gl.createShader(type)
		if (!shader) {
			console.error('Failed to create shader - createShader returned null')
			return null
		}

		this.gl.shaderSource(shader, source)
		this.gl.compileShader(shader)

		const compileStatus = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)
		const shaderType = type === this.gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT'

		if (compileStatus !== true) {
			const log = this.gl.getShaderInfoLog(shader)
			console.error(`${shaderType} shader compile error:`, log || 'No error log available')
			console.error('Shader source:', source)
			this.gl.deleteShader(shader)
			return null
		}

		return shader
	}

	private updateGeometries = (): void => {
		const shapes = this.editor.getCurrentPageShapes()
		this.geometries = []

		for (const shape of shapes) {
			try {
				const geometry = this.extractGeometry(shape)
				if (geometry) {
					this.geometries.push(geometry)
				}
			} catch (e) {
				console.log(`Error extracting geometry for shape: ${shape.type}`, e)
			}
		}
	}

	private extractGeometry = (shape: TLShape): Geometry | null => {
		const geometry = this.editor.getShapeGeometry(shape)
		const vertices = geometry.vertices
		const transform = this.editor.getShapePageTransform(shape)

		if (!transform) return null

		const segments: Array<{ start: Vec; end: Vec }> = []

		const transformed = vertices.map((c) => transform.applyToPoint(c))
		const canvasPoints = transformed.map((p) => this.pageToCanvas(p))

		// Check if geometry is closed. The children note is a hack to handle arrows, which are groups with the (open) arrow and the (closed) label. In practice, you could special case any custom shapes.
		const isClosed =
			geometry instanceof Group2d
				? (geometry.children[0]?.isClosed ?? true)
				: 'isClosed' in geometry
					? geometry.isClosed
					: true

		// Add segments connecting the vertices
		for (let i = 0; i < canvasPoints.length - 1; i++) {
			const start = canvasPoints[i]
			const end = canvasPoints[i + 1]
			segments.push({ start, end })
		}

		// Only add closing segment if geometry is closed
		if (isClosed && canvasPoints.length > 0) {
			segments.push({
				start: canvasPoints[canvasPoints.length - 1],
				end: canvasPoints[0],
			})
		}

		return { segments }
	}

	private pageToCanvas = (point: Vec): Vec => {
		// Convert page coordinates to screen coordinates
		const screenPoint = this.editor.pageToScreen(point)
		const vsb = this.editor.getViewportScreenBounds()

		// Convert to canvas pixel coordinates (relative to canvas, not viewport)
		// Scale by quality to match the canvas internal resolution
		const canvasX = (screenPoint.x - vsb.x) * this.quality
		// Flip Y axis: canvas Y=0 is at top, but we want Y=0 at bottom for consistency
		const canvasY = this.canvas.height - (screenPoint.y - vsb.y) * this.quality

		return new Vec(canvasX, canvasY)
	}

	/**
	 * Update the light position (in canvas coordinates)
	 */
	setLightPosition = (x: number, y: number): void => {
		this.lightPos.x = x
		this.lightPos.y = y
		this.renderFrame()
	}

	/**
	 * Manually update geometries from shapes and re-render
	 */
	refresh = (): void => {
		try {
			this.updateGeometries()
			this.renderFrame()
		} catch (e) {
			console.log('Error refreshing geometries', e)
		}
	}
}
