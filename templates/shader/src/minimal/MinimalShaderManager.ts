import { Atom, Box, Editor, react, Vec } from 'tldraw'
import { WebGLManager } from '../WebGLManager'
import { ShaderManagerConfig } from './config'
import FRAGMENT_SHADER from './fragment.glsl?raw'
import VERTEX_SHADER from './vertex.glsl?raw'

export class MinimalShaderManager extends WebGLManager<ShaderManagerConfig> {
	private program: WebGLProgram | null = null
	private positionBuffer: WebGLBuffer | null = null
	private vao: WebGLVertexArrayObject | null = null

	pointer: Vec = new Vec(0, 0)

	private u_bgColor: WebGLUniformLocation | null = null

	constructor(
		editor: Editor,
		canvas: HTMLCanvasElement,
		config: Atom<ShaderManagerConfig, unknown>
	) {
		super(editor, canvas, config)
		this.initialize()
	}

	onInitialize = (): void => {
		if (!this.gl) {
			console.error('No WebGL context available')
			return
		}

		if (this.gl.isContextLost()) {
			console.error('WebGL context is lost, cannot initialize')
			return
		}

		const isWebGL2 = this.gl instanceof WebGL2RenderingContext

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

		const vertexShader = compileShader(this.gl.VERTEX_SHADER, VERTEX_SHADER)
		if (!vertexShader) {
			console.error('Failed to compile vertex shader, aborting initialization')
			return
		}

		const fragmentShader = compileShader(this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
		if (!fragmentShader) {
			console.error('Failed to compile fragment shader, aborting initialization')
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

		this.u_bgColor = this.gl.getUniformLocation(this.program, 'u_bgColor')

		this.positionBuffer = this.gl.createBuffer()

		if (isWebGL2) {
			const gl2 = this.gl as WebGL2RenderingContext
			this.vao = gl2.createVertexArray()
			gl2.bindVertexArray(this.vao)
		}

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer)
		const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
		this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW)

		const a_position = this.gl.getAttribLocation(this.program, 'a_position')
		this.gl.enableVertexAttribArray(a_position)
		this.gl.vertexAttribPointer(a_position, 2, this.gl.FLOAT, false, 0, 0)

		if (isWebGL2) {
			const gl2 = this.gl as WebGL2RenderingContext
			gl2.bindVertexArray(null)
		}

		this.disposables.add(react('dependencies', this.tick))

		this.tick()
	}

	onUpdate = (): void => {
		// implement here...
	}

	onFirstRender = (): void => {
		if (!this.gl || !this.program) return

		this.gl.enable(this.gl.BLEND)
		this.gl.clearColor(0, 0, 0, 0)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
		this.gl.useProgram(this.program)
	}

	onRender = (_deltaTime: number, _currentTime: number): void => {
		if (!this.gl || !this.program) return

		if (this.u_bgColor) {
			const isDarkMode = this.editor.user.getIsDarkMode()
			const bgColor = isDarkMode ? [0.1, 0.1, 0.1] : [0.9, 0.9, 0.9]
			this.gl.uniform3f(this.u_bgColor, bgColor[0], bgColor[1], bgColor[2])
		}

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

	pageToCanvas = (
		point: Vec,
		camera: { x: number; y: number; z: number },
		viewportScreenBounds: Box
	): Vec => {
		const screenX = (point.x + camera.x) * camera.z + viewportScreenBounds.x
		const screenY = (point.y + camera.y) * camera.z + viewportScreenBounds.y
		const canvasX = (screenX - viewportScreenBounds.x) / viewportScreenBounds.width
		const canvasY = 1.0 - (screenY - viewportScreenBounds.y) / viewportScreenBounds.height
		return new Vec(canvasX, canvasY)
	}
}
