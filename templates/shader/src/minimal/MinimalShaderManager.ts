import { Atom, Box, Editor, Vec } from 'tldraw'
import { WebGLManager } from '../WebGLManager'
import { ShaderManagerConfig } from './config'
import fragmentShader from './fragment.glsl?raw'
import vertexShader from './vertex.glsl?raw'

const VERTEX_SHADER = vertexShader
const FRAGMENT_SHADER = fragmentShader

export class MinimalShaderManager extends WebGLManager<ShaderManagerConfig> {
	private program: WebGLProgram | null = null
	private positionBuffer: WebGLBuffer | null = null
	private vao: WebGLVertexArrayObject | null = null
	private _disposables = new Set<() => void>()

	// Inputs
	pointer: Vec = new Vec(0, 0)

	// Uniforms
	private u_bgColor: WebGLUniformLocation | null = null

	constructor(
		editor: Editor,
		canvas: HTMLCanvasElement,
		config: Atom<ShaderManagerConfig, unknown>
	) {
		super(editor, canvas, config)
		this.initialize()
	}

	/* -------------------- Lifecycle ------------------- */

	onInitialize = (): void => {
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

		const compileShader = (type: number, source: string): WebGLShader | null => {
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

		// Compile shaders and create program
		const vertexShader = compileShader(this.gl.VERTEX_SHADER, VERTEX_SHADER)
		if (!vertexShader) {
			console.error('Failed to compile vertex shader, aborting initialization')
			return
		}

		const fragmentShader = compileShader(this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
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
		this.u_bgColor = this.gl.getUniformLocation(this.program, 'u_bgColor')

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

		// Update and render
		this.tick()
	}

	onUpdate = (): void => {
		// todo
	}

	onFirstRender = (): void => {
		if (!this.gl || !this.program) return

		// One-time setup
		this.gl.useProgram(this.program)
		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
	}

	onRender = (_deltaTime: number, _currentTime: number): void => {
		if (!this.gl || !this.program) return

		// Set background color based on dark mode
		if (this.u_bgColor) {
			const isDarkMode = this.editor.user.getIsDarkMode()
			const bgColor = isDarkMode ? [0.1, 0.1, 0.1] : [0.9, 0.9, 0.9]
			this.gl.uniform3f(this.u_bgColor, bgColor[0], bgColor[1], bgColor[2])
		}

		// Clear and draw
		this.gl.clearColor(0, 0, 0, 0)
		this.gl.clear(this.gl.COLOR_BUFFER_BIT)

		if (this.vao && this.gl instanceof WebGL2RenderingContext) {
			this.gl.bindVertexArray(this.vao)
		}

		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)

		if (this.vao && this.gl instanceof WebGL2RenderingContext) {
			this.gl.bindVertexArray(null)
		}
	}

	onDispose = (): void => {
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

	/* --------------------- Events --------------------- */

	pointerMove = (x: number, y: number): void => {
		const vsb = this.editor.getViewportScreenBounds()
		this.pointer.x = (x - vsb.x) / vsb.width
		this.pointer.y = 1.0 - (y - vsb.y) / vsb.height
		this.tick()
	}

	refresh = (): void => {
		try {
			this.tick()
		} catch (e) {
			console.log('Error refreshing geometries', e)
		}
	}

	/* -------------------- Internal -------------------- */

	pageToCanvas = (
		point: Vec,
		camera: { x: number; y: number; z: number },
		viewportScreenBounds: Box
	): Vec => {
		// Transform page coordinates to screen space
		const screenX = (point.x + camera.x) * camera.z + viewportScreenBounds.x
		const screenY = (point.y + camera.y) * camera.z + viewportScreenBounds.y
		// Normalize to canvas coordinates (0-1 range) within the viewport
		const canvasX = (screenX - viewportScreenBounds.x) / viewportScreenBounds.width
		const canvasY = 1.0 - (screenY - viewportScreenBounds.y) / viewportScreenBounds.height
		return new Vec(canvasX, canvasY)
	}
}
