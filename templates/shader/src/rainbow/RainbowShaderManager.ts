import { Atom, Box, Editor, Group2d, react, TLShape, Vec } from 'tldraw'
import { WebGLManager } from '../WebGLManager'
import { ShaderManagerConfig } from './config'
import fragmentShader from './fragment.glsl?raw'
import vertexShader from './vertex.glsl?raw'

const VERTEX_SHADER = vertexShader
const FRAGMENT_SHADER = fragmentShader

export type Geometry = Array<{ start: Vec; end: Vec }>

export class RainbowShaderManager extends WebGLManager<ShaderManagerConfig> {
	private program: WebGLProgram | null = null
	private positionBuffer: WebGLBuffer | null = null
	private vao: WebGLVertexArrayObject | null = null

	private u_resolution: WebGLUniformLocation | null = null
	private u_darkMode: WebGLUniformLocation | null = null
	private u_quality: WebGLUniformLocation | null = null
	private u_zoom: WebGLUniformLocation | null = null
	private u_stepSize: WebGLUniformLocation | null = null
	private u_steps: WebGLUniformLocation | null = null
	private u_offset: WebGLUniformLocation | null = null
	private u_segments: WebGLUniformLocation | null = null
	private u_segmentCount: WebGLUniformLocation | null = null
	private u_pointerPos: WebGLUniformLocation | null = null

	private geometries: Geometry[] = []
	private maxSegments: number = 2000

	private pointer: Vec = new Vec(0.5, 0.5)

	constructor(
		editor: Editor,
		canvas: HTMLCanvasElement,
		config: Atom<ShaderManagerConfig, unknown>
	) {
		super(editor, canvas, config)
		this.initialize()
	}

	onInitialize = (): void => {
		this.maxSegments = Math.floor(Math.min(512, 2000 / this.getConfig().quality))

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

		this.u_resolution = this.gl.getUniformLocation(this.program, 'u_resolution')
		this.u_darkMode = this.gl.getUniformLocation(this.program, 'u_darkMode')
		this.u_quality = this.gl.getUniformLocation(this.program, 'u_quality')
		this.u_zoom = this.gl.getUniformLocation(this.program, 'u_zoom')
		this.u_stepSize = this.gl.getUniformLocation(this.program, 'u_stepSize')
		this.u_steps = this.gl.getUniformLocation(this.program, 'u_steps')
		this.u_offset = this.gl.getUniformLocation(this.program, 'u_offset')
		this.u_segments = this.gl.getUniformLocation(this.program, 'u_segments')
		this.u_segmentCount = this.gl.getUniformLocation(this.program, 'u_segmentCount')
		this.u_pointerPos = this.gl.getUniformLocation(this.program, 'u_pointerPos')

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
		const { editor } = this
		const vsb = editor.getViewportScreenBounds()
		const camera = editor.getCamera()
		const shapes = this.editor.getCurrentPageShapes()
		this.geometries = []

		for (const shape of shapes) {
			try {
				const geometry = this.extractGeometry(shape, camera, vsb)
				if (geometry) {
					this.geometries.push(geometry)
				}
			} catch (e) {
				console.log(`Error extracting geometry for shape: ${shape.type}`, e)
			}
		}
	}

	onFirstRender = (): void => {
		if (!this.gl || !this.program) return

		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
		this.gl.clearColor(0, 0, 0, 0)
		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
		this.gl.useProgram(this.program)
	}

	onRender = (_deltaTime: number, _currentTime: number): void => {
		if (!this.gl || !this.program) return

		this.gl.clear(this.gl.COLOR_BUFFER_BIT)

		const isDarkMode = this.editor.user.getIsDarkMode()

		const { quality, stepSize, steps, offset } = this.getConfig()

		if (this.u_resolution) {
			this.gl.uniform2f(this.u_resolution, this.canvas.width, this.canvas.height)
		}
		if (this.u_darkMode) {
			this.gl.uniform1f(this.u_darkMode, isDarkMode ? 1.0 : 0.0)
		}
		if (this.u_quality) {
			this.gl.uniform1f(this.u_quality, quality)
		}
		if (this.u_zoom) {
			this.gl.uniform1f(this.u_zoom, this.editor.getZoomLevel())
		}
		if (this.u_stepSize) {
			this.gl.uniform1f(this.u_stepSize, stepSize)
		}
		if (this.u_steps) {
			this.gl.uniform1i(this.u_steps, steps)
		}
		if (this.u_offset) {
			this.gl.uniform1f(this.u_offset, offset)
		}
		if (this.u_pointerPos) {
			this.gl.uniform2f(this.u_pointerPos, this.pointer.x, this.pointer.y)
		}

		const allSegments: number[] = []

		for (const geometry of this.geometries) {
			for (const segment of geometry) {
				if (allSegments.length < this.maxSegments * 4) {
					allSegments.push(segment.start.x, segment.start.y, segment.end.x, segment.end.y)
				}
			}
		}

		const farAway = 999999
		while (allSegments.length < this.maxSegments * 4)
			allSegments.push(farAway, farAway, farAway, farAway)

		if (this.u_segments) {
			this.gl.uniform4fv(this.u_segments, allSegments)
		}
		if (this.u_segmentCount) {
			this.gl.uniform1f(this.u_segmentCount, Math.min(allSegments.length / 4, this.maxSegments))
		}

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

	refresh = (): void => {
		try {
			this.tick()
		} catch (e) {
			console.log('Error refreshing geometries', e)
		}
	}

	pointerMove = (x: number, y: number): void => {
		const vsb = this.editor.getViewportScreenBounds()
		this.pointer.x = (x - vsb.x) / vsb.width
		this.pointer.y = 1.0 - (y - vsb.y) / vsb.height
		this.tick()
	}

	private pageToCanvas = (
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

	private extractGeometry = (
		shape: TLShape,
		camera: { x: number; y: number; z: number },
		viewportScreenBounds: Box
	): Array<{ start: Vec; end: Vec }> | null => {
		const { editor } = this
		const geometry = this.editor.getShapeGeometry(shape)
		const transform = editor.getShapePageTransform(shape)
		if (!transform) return null

		const canvasPoints = geometry.vertices.map((c) =>
			this.pageToCanvas(transform.applyToPoint(c), camera, viewportScreenBounds)
		)

		const segments: Array<{ start: Vec; end: Vec }> = []

		for (let i = 0; i < canvasPoints.length - 1; i++) {
			const start = canvasPoints[i]
			const end = canvasPoints[i + 1]
			segments.push({ start, end })
		}

		const isClosed =
			geometry instanceof Group2d
				? (geometry.children[0]?.isClosed ?? true)
				: 'isClosed' in geometry
					? geometry.isClosed
					: true

		if (isClosed && canvasPoints.length > 0) {
			segments.push({
				start: canvasPoints[canvasPoints.length - 1],
				end: canvasPoints[0],
			})
		}

		return segments
	}
}
