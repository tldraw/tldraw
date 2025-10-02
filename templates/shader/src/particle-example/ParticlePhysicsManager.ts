import { Editor, react, TLShape } from 'tldraw'
import { WebGLManager } from '../WebGLManager'
import { particleConfig } from './config'
import particleFragmentShader from './particle-fragment.glsl?raw'
import particleVertexShader from './particle-vertex.glsl?raw'
import updatePositionFragmentShader from './update-position-fragment.glsl?raw'
import updateVelocityFragmentShader from './update-velocity-fragment.glsl?raw'
import updateVertexShader from './update-vertex.glsl?raw'

const BASE = 256
const OFFSET = (BASE * BASE) / 2

/**
 * Encode a float value into two bytes for texture storage.
 * Uses Excess-K representation to handle negative values.
 */
function encode(value: number, scale: number): [number, number] {
	value = value * scale + OFFSET
	const x = Math.floor(((value % BASE) / BASE) * 255)
	const y = Math.floor((Math.floor(value / BASE) / BASE) * 255)
	return [x, y]
}

/**
 * Manages a GPU-based particle physics simulation.
 * Particles are stored as textures (position and velocity) and updated via fragment shaders.
 * Obstacles from tldraw shapes provide collision surfaces.
 */
export class ParticlePhysicsManager extends WebGLManager {
	private editor: Editor

	// Programs
	private updatePositionProgram: WebGLProgram | null = null
	private updateVelocityProgram: WebGLProgram | null = null
	private renderParticlesProgram: WebGLProgram | null = null

	// Textures for particle state (ping-pong buffers)
	private positionTextures: [WebGLTexture | null, WebGLTexture | null] = [null, null]
	private velocityTextures: [WebGLTexture | null, WebGLTexture | null] = [null, null]
	private currentBuffer = 0

	// Obstacle texture
	private obstacleTexture: WebGLTexture | null = null
	private obstacleCanvas: HTMLCanvasElement
	private obstacleCtx: CanvasRenderingContext2D

	// Framebuffers for update passes
	private framebuffers: WebGLFramebuffer[] = []

	// Particle rendering
	private particleVertexBuffer: WebGLBuffer | null = null
	private particleCount = 128 // 128x128 = 16,384 particles

	private _disposables = new Set<() => void>()

	constructor(editor: Editor, canvas: HTMLCanvasElement) {
		super(canvas, 1.0)
		this.editor = editor

		// Create obstacle canvas
		this.obstacleCanvas = document.createElement('canvas')
		this.obstacleCtx = this.obstacleCanvas.getContext('2d')!

		// Get particle count from config
		const config = particleConfig.get()
		this.particleCount = config.particleCount

		// Initialize with continuous rendering (not paused)
		this.initialize(true, undefined, false)
	}

	protected onInitialize = (): void => {
		if (!this.gl) return

		// Check for vertex texture support (required for reading positions in vertex shader)
		const maxVertexTextureUnits = this.gl.getParameter(this.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)
		console.log('[ParticlePhysics] MAX_VERTEX_TEXTURE_IMAGE_UNITS:', maxVertexTextureUnits)
		if (maxVertexTextureUnits < 1) {
			console.error('[ParticlePhysics] Vertex texture units not supported on this device')
			return
		}

		// Compile shaders and create programs
		this.updatePositionProgram = this.createProgram(
			updateVertexShader,
			updatePositionFragmentShader
		)
		this.updateVelocityProgram = this.createProgram(
			updateVertexShader,
			updateVelocityFragmentShader
		)
		this.renderParticlesProgram = this.createProgram(particleVertexShader, particleFragmentShader)

		if (
			!this.updatePositionProgram ||
			!this.updateVelocityProgram ||
			!this.renderParticlesProgram
		) {
			console.error('Failed to create shader programs')
			return
		}

		// Initialize textures
		this.initializeStateTextures()
		this.initializeObstacleTexture()

		// Create framebuffers
		this.createFramebuffers()

		// Setup particle rendering
		this.setupParticleRendering()

		// Setup full-screen quad for update passes
		this.setupUpdateQuad()

		// Listen for shape changes to update obstacles
		this._disposables.add(
			react('shapes', () => {
				this.updateObstacles()
			})
		)

		// Listen for config changes
		this._disposables.add(
			react('config', () => {
				const config = particleConfig.get()
				if (config.particleCount !== this.particleCount) {
					// Need to reinitialize with new particle count
					this.particleCount = config.particleCount
					this.reinitialize()
				}
			})
		)

		// Initial obstacle update
		this.updateObstacles()

		console.log('[ParticlePhysics] Initialization complete')
		console.log(
			'  Particle count:',
			this.particleCount,
			`(${this.particleCount * this.particleCount} total)`
		)
		console.log('  Canvas size:', this.canvas.width, 'x', this.canvas.height)
		console.log(
			'  Position textures:',
			this.positionTextures[0] !== null,
			this.positionTextures[1] !== null
		)
		console.log(
			'  Velocity textures:',
			this.velocityTextures[0] !== null,
			this.velocityTextures[1] !== null
		)
		console.log('  Framebuffers:', this.framebuffers.length)
		console.log('[ParticlePhysics] Starting animation loop')
	}

	private reinitialize = (): void => {
		// Clean up old resources
		this.cleanupStateTextures()
		if (this.particleVertexBuffer) {
			this.gl!.deleteBuffer(this.particleVertexBuffer)
			this.particleVertexBuffer = null
		}

		// Reinitialize
		this.initializeStateTextures()
		this.createFramebuffers()
		this.setupParticleRendering()
	}

	private createProgram = (vertexSource: string, fragmentSource: string): WebGLProgram | null => {
		if (!this.gl) return null

		const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource)
		const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource)

		if (!vertexShader || !fragmentShader) return null

		const program = this.gl.createProgram()
		if (!program) return null

		this.gl.attachShader(program, vertexShader)
		this.gl.attachShader(program, fragmentShader)
		this.gl.linkProgram(program)

		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			console.error('Program link error:', this.gl.getProgramInfoLog(program))
			return null
		}

		return program
	}

	private compileShader = (type: number, source: string): WebGLShader | null => {
		if (!this.gl) return null

		const shader = this.gl.createShader(type)
		if (!shader) return null

		this.gl.shaderSource(shader, source)
		this.gl.compileShader(shader)

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			const shaderType = type === this.gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT'
			console.error(
				`[ParticlePhysics] ${shaderType} shader compile error:`,
				this.gl.getShaderInfoLog(shader)
			)
			console.error('Shader source:', source)
			this.gl.deleteShader(shader)
			return null
		}

		return shader
	}

	private initializeStateTextures = (): void => {
		if (!this.gl) return

		const size = this.particleCount
		const data = new Uint8Array(size * size * 4)

		// Initialize position data (spawn particles from top for rain effect)
		const { width, height } = this.canvas.getBoundingClientRect()
		for (let i = 0; i < size * size; i++) {
			const x = Math.random() * width
			// Spawn from top of screen, distributed across the full height initially
			const y = Math.random() * height
			const [xr, xg] = encode(x, 1.0)
			const [yr, yg] = encode(y, 1.0)
			data[i * 4 + 0] = xr
			data[i * 4 + 1] = xg
			data[i * 4 + 2] = yr
			data[i * 4 + 3] = yg
		}

		// Create position textures
		for (let i = 0; i < 2; i++) {
			this.positionTextures[i] = this.createTexture(size, size, data)
		}

		// Initialize velocity data (downward for rain effect with slight horizontal variation)
		for (let i = 0; i < size * size; i++) {
			const vx = (Math.random() - 0.5) * 10 // Slight horizontal drift
			const vy = -Math.random() * 50 - 20 // Start falling downward
			const [vxr, vxg] = encode(vx, 1.0)
			const [vyr, vyg] = encode(vy, 1.0)
			data[i * 4 + 0] = vxr
			data[i * 4 + 1] = vxg
			data[i * 4 + 2] = vyr
			data[i * 4 + 3] = vyg
		}

		// Create velocity textures
		for (let i = 0; i < 2; i++) {
			this.velocityTextures[i] = this.createTexture(size, size, data)
		}
	}

	private initializeObstacleTexture = (): void => {
		if (!this.gl) return

		const { width, height } = this.canvas.getBoundingClientRect()
		this.obstacleCanvas.width = width
		this.obstacleCanvas.height = height

		// Clear to transparent
		this.obstacleCtx.clearRect(0, 0, width, height)

		// Create texture
		this.obstacleTexture = this.gl.createTexture()
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.obstacleTexture)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.RGBA,
			this.gl.RGBA,
			this.gl.UNSIGNED_BYTE,
			this.obstacleCanvas
		)
	}

	private createTexture = (
		width: number,
		height: number,
		data: Uint8Array | null
	): WebGLTexture | null => {
		if (!this.gl) return null

		const texture = this.gl.createTexture()
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.RGBA,
			width,
			height,
			0,
			this.gl.RGBA,
			this.gl.UNSIGNED_BYTE,
			data
		)

		return texture
	}

	private createFramebuffers = (): void => {
		if (!this.gl) return

		// Create framebuffers for ping-pong rendering
		for (let i = 0; i < 2; i++) {
			const fb = this.gl.createFramebuffer()
			if (fb) this.framebuffers.push(fb)
		}
	}

	private updateQuadBuffer: WebGLBuffer | null = null

	private setupUpdateQuad = (): void => {
		if (!this.gl) return

		// Full-screen quad for update passes
		this.updateQuadBuffer = this.gl.createBuffer()
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.updateQuadBuffer)
		const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
		this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW)
	}

	private setupParticleRendering = (): void => {
		if (!this.gl) return

		// Create particle index buffer (2D indices for texture lookup)
		const size = this.particleCount
		const indices = new Float32Array(size * size * 2)
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const i = (y * size + x) * 2
				indices[i] = x
				indices[i + 1] = y
			}
		}

		this.particleVertexBuffer = this.gl.createBuffer()
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleVertexBuffer)
		this.gl.bufferData(this.gl.ARRAY_BUFFER, indices, this.gl.STATIC_DRAW)
	}

	private updateObstacles = (): void => {
		const shapes = this.editor.getCurrentPageShapes()
		const { width, height } = this.obstacleCanvas

		// Clear
		this.obstacleCtx.clearRect(0, 0, width, height)

		// Draw each shape as an obstacle
		for (const shape of shapes) {
			this.drawShapeAsObstacle(shape)
		}

		// Upload to GPU
		if (this.gl && this.obstacleTexture) {
			this.gl.bindTexture(this.gl.TEXTURE_2D, this.obstacleTexture)
			this.gl.texImage2D(
				this.gl.TEXTURE_2D,
				0,
				this.gl.RGBA,
				this.gl.RGBA,
				this.gl.UNSIGNED_BYTE,
				this.obstacleCanvas
			)
		}
	}

	private drawShapeAsObstacle = (shape: TLShape): void => {
		const geometry = this.editor.getShapeGeometry(shape)
		const bounds = this.editor.getShapePageBounds(shape)
		if (!bounds) return

		// Convert to screen space
		const screenCenter = this.editor.pageToScreen(bounds.center)
		const vsb = this.editor.getViewportScreenBounds()
		const cx = screenCenter.x - vsb.x
		const cy = screenCenter.y - vsb.y

		// Simple circle obstacle for all shapes
		const radius = (Math.max(bounds.width, bounds.height) * this.editor.getZoomLevel()) / 2

		// Draw circle with radial gradient normals
		const gradient = this.obstacleCtx.createRadialGradient(cx, cy, 0, cx, cy, radius)

		// Store normals in RGB channels
		// For a circle, normals point outward from center
		this.obstacleCtx.save()
		this.obstacleCtx.beginPath()
		this.obstacleCtx.arc(cx, cy, radius, 0, Math.PI * 2)
		this.obstacleCtx.closePath()

		// Fill with a solid color for now (normals will be computed in shader)
		this.obstacleCtx.fillStyle = 'rgba(128, 128, 255, 255)'
		this.obstacleCtx.fill()
		this.obstacleCtx.restore()

		// Draw normals properly
		const steps = 32
		for (let i = 0; i < steps; i++) {
			const angle = (i / steps) * Math.PI * 2
			const nx = Math.cos(angle)
			const ny = Math.sin(angle)

			// Encode normal as color (map -1..1 to 0..255)
			const r = Math.floor((nx * 0.5 + 0.5) * 255)
			const g = Math.floor((ny * 0.5 + 0.5) * 255)

			const x = cx + nx * radius
			const y = cy + ny * radius

			this.obstacleCtx.fillStyle = `rgba(${r}, ${g}, 128, 255)`
			this.obstacleCtx.fillRect(x - 2, y - 2, 4, 4)
		}
	}

	private frameCount = 0

	protected onRender = (_deltaTime: number, currentTime: number): void => {
		try {
			this.frameCount++

			// Log every 60 frames to show it's still running
			if (this.frameCount % 60 === 0) {
				console.log(`[ParticlePhysics] Still running at frame ${this.frameCount}`)
			}

			if (!this.gl) {
				console.error('[ParticlePhysics] No GL context')
				return
			}
			if (
				!this.updatePositionProgram ||
				!this.updateVelocityProgram ||
				!this.renderParticlesProgram
			) {
				console.error('[ParticlePhysics] Programs not initialized')
				return
			}

			// Log first few frames to confirm render loop is running
			if (this.frameCount <= 5) {
				console.log(
					`[ParticlePhysics] Frame ${this.frameCount}, deltaTime: ${_deltaTime}, currentBuffer: ${this.currentBuffer}`
				)
			}

			// Check if context is lost
			if (this.gl.isContextLost()) {
				console.error('[ParticlePhysics] WebGL context lost!')
				return
			}

			const config = particleConfig.get()
			const { width, height } = this.canvas.getBoundingClientRect()
			const deltaTime = Math.min(_deltaTime, 0.033) // Cap at 30fps

			// Update position
			this.updatePass(this.updatePositionProgram!, this.positionTextures, (program) => {
				const u_positionTexture = this.gl!.getUniformLocation(program, 'u_positionTexture')
				const u_velocityTexture = this.gl!.getUniformLocation(program, 'u_velocityTexture')
				const u_resolution = this.gl!.getUniformLocation(program, 'u_resolution')
				const u_deltaTime = this.gl!.getUniformLocation(program, 'u_deltaTime')

				this.gl!.uniform1i(u_positionTexture, 0)
				this.gl!.uniform1i(u_velocityTexture, 1)
				this.gl!.uniform2f(u_resolution, this.particleCount, this.particleCount)
				this.gl!.uniform1f(u_deltaTime, deltaTime)

				// Bind textures
				this.gl!.activeTexture(this.gl!.TEXTURE0)
				this.gl!.bindTexture(this.gl!.TEXTURE_2D, this.positionTextures[this.currentBuffer])
				this.gl!.activeTexture(this.gl!.TEXTURE1)
				this.gl!.bindTexture(this.gl!.TEXTURE_2D, this.velocityTextures[this.currentBuffer])
			})

			this.currentBuffer = 1 - this.currentBuffer

			// Update velocity
			this.updatePass(this.updateVelocityProgram!, this.velocityTextures, (program) => {
				const u_positionTexture = this.gl!.getUniformLocation(program, 'u_positionTexture')
				const u_velocityTexture = this.gl!.getUniformLocation(program, 'u_velocityTexture')
				const u_obstacleTexture = this.gl!.getUniformLocation(program, 'u_obstacleTexture')
				const u_resolution = this.gl!.getUniformLocation(program, 'u_resolution')
				const u_canvasSize = this.gl!.getUniformLocation(program, 'u_canvasSize')
				const u_deltaTime = this.gl!.getUniformLocation(program, 'u_deltaTime')
				const u_gravity = this.gl!.getUniformLocation(program, 'u_gravity')
				const u_damping = this.gl!.getUniformLocation(program, 'u_damping')
				const u_time = this.gl!.getUniformLocation(program, 'u_time')

				this.gl!.uniform1i(u_positionTexture, 0)
				this.gl!.uniform1i(u_velocityTexture, 1)
				this.gl!.uniform1i(u_obstacleTexture, 2)
				this.gl!.uniform2f(u_resolution, this.particleCount, this.particleCount)
				this.gl!.uniform2f(u_canvasSize, width, height)
				this.gl!.uniform1f(u_deltaTime, deltaTime)
				this.gl!.uniform1f(u_gravity, config.gravity)
				this.gl!.uniform1f(u_damping, config.damping)
				this.gl!.uniform1f(u_time, currentTime / 1000)

				// Bind textures
				this.gl!.activeTexture(this.gl!.TEXTURE0)
				this.gl!.bindTexture(this.gl!.TEXTURE_2D, this.positionTextures[this.currentBuffer])
				this.gl!.activeTexture(this.gl!.TEXTURE1)
				this.gl!.bindTexture(this.gl!.TEXTURE_2D, this.velocityTextures[this.currentBuffer])
				this.gl!.activeTexture(this.gl!.TEXTURE2)
				this.gl!.bindTexture(this.gl!.TEXTURE_2D, this.obstacleTexture)
			})

			this.currentBuffer = 1 - this.currentBuffer

			// Render particles
			this.renderParticles()
		} catch (error) {
			console.error('[ParticlePhysics] Error in onRender:', error)
			throw error // Re-throw to stop the animation loop
		}
	}

	private updatePass = (
		program: WebGLProgram,
		textures: [WebGLTexture | null, WebGLTexture | null],
		setupUniforms: (program: WebGLProgram) => void
	): void => {
		if (!this.gl) return

		const readBuffer = this.currentBuffer
		const writeBuffer = 1 - this.currentBuffer

		// Bind framebuffer for writing
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffers[writeBuffer])
		this.gl.framebufferTexture2D(
			this.gl.FRAMEBUFFER,
			this.gl.COLOR_ATTACHMENT0,
			this.gl.TEXTURE_2D,
			textures[writeBuffer],
			0
		)

		// Check framebuffer completeness
		const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER)
		if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
			console.error(
				'[ParticlePhysics] Framebuffer incomplete:',
				status,
				'expected:',
				this.gl.FRAMEBUFFER_COMPLETE
			)
			console.error('  Read buffer:', readBuffer, 'Write buffer:', writeBuffer)
			console.error('  Texture:', textures[writeBuffer])
			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
			return
		}

		// Set viewport to texture size
		this.gl.viewport(0, 0, this.particleCount, this.particleCount)

		// Use program
		this.gl.useProgram(program)

		// Setup uniforms
		setupUniforms(program)

		// Bind update quad buffer and draw
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.updateQuadBuffer)
		const a_position = this.gl.getAttribLocation(program, 'a_position')
		this.gl.enableVertexAttribArray(a_position)
		this.gl.vertexAttribPointer(a_position, 2, this.gl.FLOAT, false, 0, 0)
		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)

		// Check for GL errors
		const error = this.gl.getError()
		if (error !== this.gl.NO_ERROR) {
			console.error('[ParticlePhysics] GL error in updatePass:', error)
		}

		// Unbind framebuffer
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
	}

	private renderParticles = (): void => {
		if (!this.gl || !this.renderParticlesProgram) return

		const config = particleConfig.get()
		const { width, height } = this.canvas

		// Reset viewport to canvas size
		this.gl.viewport(0, 0, width, height)

		// Clear
		this.gl.clearColor(0, 0, 0, 0)
		this.gl.clear(this.gl.COLOR_BUFFER_BIT)

		// Enable blending
		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

		// Use particle rendering program
		this.gl.useProgram(this.renderParticlesProgram)

		// Set uniforms
		const u_positionTexture = this.gl.getUniformLocation(
			this.renderParticlesProgram,
			'u_positionTexture'
		)
		const u_velocityTexture = this.gl.getUniformLocation(
			this.renderParticlesProgram,
			'u_velocityTexture'
		)
		const u_stateSize = this.gl.getUniformLocation(this.renderParticlesProgram, 'u_stateSize')
		const u_canvasSize = this.gl.getUniformLocation(this.renderParticlesProgram, 'u_canvasSize')
		const u_particleSize = this.gl.getUniformLocation(this.renderParticlesProgram, 'u_particleSize')

		this.gl.uniform1i(u_positionTexture, 0)
		this.gl.uniform1i(u_velocityTexture, 1)
		this.gl.uniform2f(u_stateSize, this.particleCount, this.particleCount)
		this.gl.uniform2f(u_canvasSize, width, height)
		this.gl.uniform1f(u_particleSize, config.particleSize)

		// Bind textures
		this.gl.activeTexture(this.gl.TEXTURE0)
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.positionTextures[this.currentBuffer])
		this.gl.activeTexture(this.gl.TEXTURE1)
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.velocityTextures[this.currentBuffer])

		// Bind particle indices
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleVertexBuffer)
		const a_index = this.gl.getAttribLocation(this.renderParticlesProgram, 'a_index')
		this.gl.enableVertexAttribArray(a_index)
		this.gl.vertexAttribPointer(a_index, 2, this.gl.FLOAT, false, 0, 0)

		// Draw particles as points
		this.gl.drawArrays(this.gl.POINTS, 0, this.particleCount * this.particleCount)

		// Check for GL errors
		const error = this.gl.getError()
		if (error !== this.gl.NO_ERROR) {
			console.error('[ParticlePhysics] GL error in renderParticles:', error)
		}
	}

	private cleanupStateTextures = (): void => {
		if (!this.gl) return

		for (const texture of this.positionTextures) {
			if (texture) this.gl.deleteTexture(texture)
		}
		for (const texture of this.velocityTextures) {
			if (texture) this.gl.deleteTexture(texture)
		}
		this.positionTextures = [null, null]
		this.velocityTextures = [null, null]
	}

	protected onDispose = (): void => {
		this._disposables.forEach((dispose) => dispose())
		this._disposables.clear()

		if (this.gl) {
			this.cleanupStateTextures()

			if (this.obstacleTexture) this.gl.deleteTexture(this.obstacleTexture)
			if (this.particleVertexBuffer) this.gl.deleteBuffer(this.particleVertexBuffer)
			if (this.updateQuadBuffer) this.gl.deleteBuffer(this.updateQuadBuffer)

			for (const fb of this.framebuffers) {
				this.gl.deleteFramebuffer(fb)
			}

			if (this.updatePositionProgram) this.gl.deleteProgram(this.updatePositionProgram)
			if (this.updateVelocityProgram) this.gl.deleteProgram(this.updateVelocityProgram)
			if (this.renderParticlesProgram) this.gl.deleteProgram(this.renderParticlesProgram)
		}
	}

	override resize = (): void => {
		const { width, height } = this.canvas.getBoundingClientRect()
		if (!this.isInitialized || this.isDisposed || !this.gl) {
			return
		}

		this.canvas.width = Math.floor(width * this.quality)
		this.canvas.height = Math.floor(height * this.quality)

		// Apply quality (resolution scale) to the internal canvas resolution
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)

		// Reinitialize obstacle texture with new size
		this.initializeObstacleTexture()
		this.updateObstacles()

		// If paused, trigger a single frame render to show the resize
		if (!this.isRunning()) {
			this.renderFrame()
		}
	}
}
