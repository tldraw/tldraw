import { Editor, Group2d, react, TLShape, Vec } from 'tldraw'
import { WebGLManager } from '../WebGLManager'
import { shaderConfig } from './config'
import fragmentShader from './fragment.glsl?raw'
import vertexShader from './vertex.glsl?raw'

// Vertex shader for rendering a full-screen quad
const VERTEX_SHADER = vertexShader

// Fragment shader for rendering the smoke effect
const FRAGMENT_SHADER = fragmentShader

/**
 * Geometry data structure containing line segments for a shape.
 */
export interface Geometry {
	/** Array of line segments defining the shape's outline */
	segments: Array<{ start: Vec; end: Vec }>
}

/**
 * Manages a rainbow shader effect that renders colorful halos around shape edges.
 * Uses WebGL shaders to create distance-based color gradients around all visible shapes.
 * Extends WebGLManager for WebGL lifecycle management.
 */
export class RainbowShaderManager extends WebGLManager {
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

	private geometries: Geometry[] = []
	private isDarkMode = false
	private maxSegments: number = 2000

	private editor: Editor

	/**
	 * Creates a new rainbow shader manager.
	 * @param editor - The tldraw editor instance
	 * @param canvas - The HTML canvas element to render to
	 * @param quality - Rendering quality multiplier (default: 1)
	 */
	constructor(editor: Editor, canvas: HTMLCanvasElement, quality: number = 1) {
		super(canvas, quality)
		this.editor = editor
		// Calculate max segments based on quality (inverse relationship)
		// Lower quality = fewer pixels to compute = can handle more segments
		// Cap at 512 to stay within WebGL uniform limits
		this.maxSegments = Math.floor(Math.min(512, 2000 / quality))
		// Start paused - we'll render on-demand when things change
		this.initialize(true, undefined, true)
	}

	private _disposables = new Set<() => void>()

	/**
	 * Initializes the WebGL context, shaders, and shape reactivity.
	 * Called automatically by the base WebGLManager class.
	 */
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

		// Listen for config changes
		this._disposables.add(
			react('config', () => {
				const config = shaderConfig.get()
				if (config.quality !== undefined && config.quality !== this.quality) {
					this.setQuality(config.quality)
					// Recalculate max segments based on new quality
					this.maxSegments = Math.floor(Math.min(512, 2000 / this.quality))
				}
			})
		)

		// Initial geometry update
		this.updateGeometries()

		// Render the first frame
		this.renderFrame()
	}

	/**
	 * Renders a single frame of the rainbow effect.
	 * Called by the animation loop or manually when shapes/camera change.
	 * @param _deltaTime - Time since last frame (unused, rendering is frame-independent)
	 * @param _currentTime - Current animation time (unused, rendering is frame-independent)
	 */
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

	/**
	 * Cleans up WebGL resources and reactive subscriptions.
	 * Called automatically when the manager is disposed.
	 */
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

	/**
	 * Compiles a WebGL shader from source code.
	 * @param type - Shader type (VERTEX_SHADER or FRAGMENT_SHADER)
	 * @param source - GLSL source code
	 * @returns Compiled shader or null if compilation failed
	 */
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

	/**
	 * Updates geometry data from all shapes on the current page.
	 * Extracts line segments from each shape for shader rendering.
	 */
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

	/**
	 * Extracts line segment geometry from a shape.
	 * Converts shape vertices to canvas coordinates for shader rendering.
	 * @param shape - The shape to extract geometry from
	 * @returns Geometry object with line segments, or null if extraction failed
	 */
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

	/**
	 * Converts a point from page coordinates to canvas pixel coordinates.
	 * Accounts for camera position, zoom, and quality scaling.
	 * @param point - Point in page coordinates
	 * @returns Point in canvas pixel coordinates
	 */
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
