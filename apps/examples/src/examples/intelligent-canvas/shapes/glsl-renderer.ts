/**
 * Lightweight WebGL renderer for arbitrary GLSL fragment shaders.
 * Renders a full-screen quad with the given fragment shader, providing
 * u_resolution, u_time, and v_uv as standard inputs.
 */

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FALLBACK_FRAGMENT = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
varying vec2 v_uv;

void main() {
  vec3 color = vec3(v_uv.x, v_uv.y, 0.5 + 0.5 * sin(u_time));
  gl_FragColor = vec4(color, 1.0);
}
`

export class GLSLRenderer {
	private gl: WebGLRenderingContext | null = null
	private program: WebGLProgram | null = null
	private quadBuffer: WebGLBuffer | null = null
	private animFrameId: number | null = null
	private startTime = 0
	private _error: string | null = null

	get error(): string | null {
		return this._error
	}

	initialize(canvas: HTMLCanvasElement, fragmentSource: string): boolean {
		this._error = null
		const gl = canvas.getContext('webgl', {
			alpha: true,
			antialias: true,
			preserveDrawingBuffer: true,
		})
		if (!gl) {
			this._error = 'WebGL not supported'
			return false
		}
		this.gl = gl

		// Create quad buffer
		const buffer = gl.createBuffer()
		if (!buffer) return false
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
		this.quadBuffer = buffer

		// Compile shader program
		this.program = this.compileProgram(gl, fragmentSource)
		if (!this.program) {
			// Try fallback
			this.program = this.compileProgram(gl, FALLBACK_FRAGMENT)
		}
		if (!this.program) return false

		this.startTime = performance.now()
		return true
	}

	private compileProgram(gl: WebGLRenderingContext, fragmentSource: string): WebGLProgram | null {
		const vs = this.compileShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER)
		const fs = this.compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER)
		if (!vs || !fs) {
			if (vs) gl.deleteShader(vs)
			if (fs) gl.deleteShader(fs)
			return null
		}

		const program = gl.createProgram()
		if (!program) return null
		gl.attachShader(program, vs)
		gl.attachShader(program, fs)
		gl.linkProgram(program)
		gl.deleteShader(vs)
		gl.deleteShader(fs)

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			this._error = gl.getProgramInfoLog(program) || 'Link failed'
			gl.deleteProgram(program)
			return null
		}

		return program
	}

	private compileShader(
		gl: WebGLRenderingContext,
		source: string,
		type: number
	): WebGLShader | null {
		const shader = gl.createShader(type)
		if (!shader) return null
		gl.shaderSource(shader, source)
		gl.compileShader(shader)
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			this._error = gl.getShaderInfoLog(shader) || 'Compile failed'
			gl.deleteShader(shader)
			return null
		}
		return shader
	}

	start(): void {
		if (this.animFrameId !== null) return
		const loop = () => {
			this.render()
			this.animFrameId = requestAnimationFrame(loop)
		}
		this.animFrameId = requestAnimationFrame(loop)
	}

	stop(): void {
		if (this.animFrameId !== null) {
			cancelAnimationFrame(this.animFrameId)
			this.animFrameId = null
		}
	}

	private render(): void {
		const { gl, program, quadBuffer } = this
		if (!gl || !program || !quadBuffer) return

		const canvas = gl.canvas as HTMLCanvasElement
		const dpr = window.devicePixelRatio || 1
		const displayW = canvas.clientWidth
		const displayH = canvas.clientHeight
		if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
			canvas.width = displayW * dpr
			canvas.height = displayH * dpr
		}

		gl.viewport(0, 0, canvas.width, canvas.height)
		gl.clearColor(0, 0, 0, 1)
		gl.clear(gl.COLOR_BUFFER_BIT)

		gl.useProgram(program)

		// Set uniforms
		const uRes = gl.getUniformLocation(program, 'u_resolution')
		if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height)

		const uTime = gl.getUniformLocation(program, 'u_time')
		if (uTime) gl.uniform1f(uTime, (performance.now() - this.startTime) / 1000)

		const uMouse = gl.getUniformLocation(program, 'u_mouse')
		if (uMouse) gl.uniform2f(uMouse, 0.5, 0.5)

		const iResolution = gl.getUniformLocation(program, 'iResolution')
		if (iResolution) gl.uniform3f(iResolution, canvas.width, canvas.height, 1.0)

		const iTime = gl.getUniformLocation(program, 'iTime')
		if (iTime) gl.uniform1f(iTime, (performance.now() - this.startTime) / 1000)

		// Bind quad
		const aPos = gl.getAttribLocation(program, 'a_position')
		gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
		gl.enableVertexAttribArray(aPos)
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
	}

	resize(): void {
		// Next render() call will pick up the new size
	}

	dispose(): void {
		this.stop()
		const { gl, program, quadBuffer } = this
		if (gl) {
			if (program) gl.deleteProgram(program)
			if (quadBuffer) gl.deleteBuffer(quadBuffer)
		}
		this.gl = null
		this.program = null
		this.quadBuffer = null
	}
}
