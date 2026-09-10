import { Atom, Editor, react, Vec } from 'tldraw'
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

		const maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE)

		if (!maxTextureSize) {
			console.error('WebGL context appears invalid (max texture size is null)')
			return
		}

		const gl = this.gl
		const compileShader = (type: number, source: string): WebGLShader | null => {
			const shader = gl.createShader(type)
			if (!shader) {
				console.error('Failed to create shader - createShader returned null')
				return null
			}

			gl.shaderSource(shader, source)
			gl.compileShader(shader)

			if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
				const shaderType = type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT'
				const log = gl.getShaderInfoLog(shader)
				console.error(`${shaderType} shader compile error:`, log || 'No error log available')
				console.error('Shader source:', source)
				gl.deleteShader(shader)
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

		this.vao = this.gl.createVertexArray()
		this.gl.bindVertexArray(this.vao)

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer)
		const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
		this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW)

		const a_position = this.gl.getAttribLocation(this.program, 'a_position')
		this.gl.enableVertexAttribArray(a_position)
		this.gl.vertexAttribPointer(a_position, 2, this.gl.FLOAT, false, 0, 0)

		this.gl.bindVertexArray(null)

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

		this.gl.bindVertexArray(this.vao)
		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
		this.gl.bindVertexArray(null)
	}

	onDispose = (): void => {
		if (this.gl) {
			if (this.vao) {
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
}
