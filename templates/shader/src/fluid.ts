/* eslint-disable */

/*
MIT License

Copyright (c) 2017 Pavel Dobryakov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

export interface FluidConfig {
	SIM_RESOLUTION: number
	DYE_RESOLUTION: number
	DENSITY_DISSIPATION: number
	VELOCITY_DISSIPATION: number
	PRESSURE: number
	PRESSURE_ITERATIONS: number
	CURL: number
	SPLAT_RADIUS: number
	SPLAT_FORCE: number
	SHADING: boolean
	COLORFUL: boolean
	COLOR_UPDATE_SPEED: number
	PAUSED: boolean
	BACK_COLOR: { r: number; g: number; b: number }
	TRANSPARENT: boolean
	BLOOM: boolean
	BLOOM_ITERATIONS: number
	BLOOM_RESOLUTION: number
	BLOOM_INTENSITY: number
	BLOOM_THRESHOLD: number
	BLOOM_SOFT_KNEE: number
	SUNRAYS: boolean
	SUNRAYS_RESOLUTION: number
	SUNRAYS_WEIGHT: number
}

const DEFAULT_CONFIG: FluidConfig = {
	SIM_RESOLUTION: 128,
	DYE_RESOLUTION: 1024,
	DENSITY_DISSIPATION: 1,
	VELOCITY_DISSIPATION: 0.2,
	PRESSURE: 0.8,
	PRESSURE_ITERATIONS: 20,
	CURL: 30,
	SPLAT_RADIUS: 0.25,
	SPLAT_FORCE: 6000,
	SHADING: true,
	COLORFUL: true,
	COLOR_UPDATE_SPEED: 10,
	PAUSED: false,
	BACK_COLOR: { r: 0, g: 0, b: 0 },
	TRANSPARENT: false,
	BLOOM: true,
	BLOOM_ITERATIONS: 8,
	BLOOM_RESOLUTION: 256,
	BLOOM_INTENSITY: 0.8,
	BLOOM_THRESHOLD: 0.6,
	BLOOM_SOFT_KNEE: 0.7,
	SUNRAYS: true,
	SUNRAYS_RESOLUTION: 196,
	SUNRAYS_WEIGHT: 1.0,
}

interface Pointer {
	id: number
	texcoordX: number
	texcoordY: number
	prevTexcoordX: number
	prevTexcoordY: number
	deltaX: number
	deltaY: number
	down: boolean
	moved: boolean
	color: [number, number, number]
}

function createPointer(): Pointer {
	return {
		id: -1,
		texcoordX: 0,
		texcoordY: 0,
		prevTexcoordX: 0,
		prevTexcoordY: 0,
		deltaX: 0,
		deltaY: 0,
		down: false,
		moved: false,
		color: [30, 0, 300],
	}
}

export class FluidSimulation {
	private canvas: HTMLCanvasElement
	private gl: WebGL2RenderingContext | WebGLRenderingContext
	private ext: any
	private config: FluidConfig
	private pointers: Pointer[] = []
	private splatStack: number[] = []
	private animationId: number | null = null
	private lastUpdateTime: number = Date.now()
	private colorUpdateTimer: number = 0.0
	private isRunning: boolean = false
	private isDragging: boolean = false
	private dragPointer: Pointer | null = null

	// Framebuffers and textures
	private dye: any
	private velocity: any
	private divergence: any
	private curl: any
	private pressure: any
	private bloom: any
	private bloomFramebuffers: any[] = []
	private sunrays: any
	private sunraysTemp: any
	private ditheringTexture: any

	// Programs and materials
	private programs: any = {}
	private displayMaterial: any
	private blit: any

	constructor(canvas: HTMLCanvasElement, config: Partial<FluidConfig> = {}) {
		this.canvas = canvas
		this.config = { ...DEFAULT_CONFIG, ...config }
		this.pointers.push(createPointer())

		const webglContext = this.getWebGLContext(canvas)
		this.gl = webglContext.gl
		this.ext = webglContext.ext

		if (this.isMobile()) {
			this.config.DYE_RESOLUTION = 512
		}
		if (!this.ext.supportLinearFiltering) {
			this.config.DYE_RESOLUTION = 512
			this.config.SHADING = false
			this.config.BLOOM = false
			this.config.SUNRAYS = false
		}

		this.initializeShaders()
		this.initFramebuffers()
		this.setupBlit()
	}

	private getWebGLContext(canvas: HTMLCanvasElement) {
		const params = {
			alpha: true,
			depth: false,
			stencil: false,
			antialias: false,
			preserveDrawingBuffer: false,
		}

		let gl = canvas.getContext('webgl2', params) as WebGL2RenderingContext
		const isWebGL2 = !!gl
		if (!isWebGL2) {
			gl = (canvas.getContext('webgl', params) ||
				canvas.getContext('experimental-webgl', params)) as WebGL2RenderingContext
		}

		if (!gl) {
			throw new Error('WebGL not supported')
		}

		let halfFloat: any
		let supportLinearFiltering: any
		if (isWebGL2) {
			gl.getExtension('EXT_color_buffer_float')
			supportLinearFiltering = gl.getExtension('OES_texture_float_linear')
		} else {
			halfFloat = gl.getExtension('OES_texture_half_float')
			supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear')
		}

		gl.clearColor(0.0, 0.0, 0.0, 1.0)

		const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES
		let formatRGBA: any
		let formatRG: any
		let formatR: any

		if (isWebGL2) {
			formatRGBA = this.getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType)
			formatRG = this.getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType)
			formatR = this.getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType)
		} else {
			formatRGBA = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)
			formatRG = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)
			formatR = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType)
		}

		return {
			gl,
			ext: {
				formatRGBA,
				formatRG,
				formatR,
				halfFloatTexType,
				supportLinearFiltering,
			},
		}
	}

	private getSupportedFormat(
		gl: WebGL2RenderingContext | WebGLRenderingContext,
		internalFormat: number,
		format: number,
		type: number
	): any {
		if (!this.supportRenderTextureFormat(gl, internalFormat, format, type)) {
			switch (internalFormat) {
				case (gl as WebGL2RenderingContext).R16F:
					return this.getSupportedFormat(
						gl,
						(gl as WebGL2RenderingContext).RG16F,
						(gl as WebGL2RenderingContext).RG,
						type
					)
				case (gl as WebGL2RenderingContext).RG16F:
					return this.getSupportedFormat(gl, (gl as WebGL2RenderingContext).RGBA16F, gl.RGBA, type)
				default:
					return null
			}
		}

		return {
			internalFormat,
			format,
		}
	}

	private supportRenderTextureFormat(
		gl: WebGL2RenderingContext | WebGLRenderingContext,
		internalFormat: number,
		format: number,
		type: number
	) {
		let texture = gl.createTexture()
		gl.bindTexture(gl.TEXTURE_2D, texture)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null)

		let fbo = gl.createFramebuffer()
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)

		let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
		return status == gl.FRAMEBUFFER_COMPLETE
	}

	private isMobile() {
		return /Mobi|Android/i.test(navigator.userAgent)
	}

	private compileShader(type: number, source: string, keywords?: string[]) {
		source = this.addKeywords(source, keywords)

		const shader = this.gl.createShader(type)!
		this.gl.shaderSource(shader, source)
		this.gl.compileShader(shader)

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.trace(this.gl.getShaderInfoLog(shader))
		}

		return shader
	}

	private addKeywords(source: string, keywords?: string[]) {
		if (keywords == null) return source
		let keywordsString = ''
		keywords.forEach((keyword) => {
			keywordsString += '#define ' + keyword + '\n'
		})
		return keywordsString + source
	}

	private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
		let program = this.gl.createProgram()!
		this.gl.attachShader(program, vertexShader)
		this.gl.attachShader(program, fragmentShader)
		this.gl.linkProgram(program)

		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			console.trace(this.gl.getProgramInfoLog(program))
		}

		return program
	}

	private getUniforms(program: WebGLProgram) {
		let uniforms: { [key: string]: WebGLUniformLocation } = {}
		let uniformCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS)
		for (let i = 0; i < uniformCount; i++) {
			let uniformName = this.gl.getActiveUniform(program, i)!.name
			uniforms[uniformName] = this.gl.getUniformLocation(program, uniformName)!
		}
		return uniforms
	}

	private initializeShaders() {
		// Base vertex shader
		const baseVertexShader = this.compileShader(
			this.gl.VERTEX_SHADER,
			`
			precision highp float;
			attribute vec2 aPosition;
			varying vec2 vUv;
			varying vec2 vL;
			varying vec2 vR;
			varying vec2 vT;
			varying vec2 vB;
			uniform vec2 texelSize;

			void main () {
				vUv = aPosition * 0.5 + 0.5;
				vL = vUv - vec2(texelSize.x, 0.0);
				vR = vUv + vec2(texelSize.x, 0.0);
				vT = vUv + vec2(0.0, texelSize.y);
				vB = vUv - vec2(0.0, texelSize.y);
				gl_Position = vec4(aPosition, 0.0, 1.0);
			}
		`
		)

		// Simple copy shader
		const copyShader = this.compileShader(
			this.gl.FRAGMENT_SHADER,
			`
			precision mediump float;
			precision mediump sampler2D;
			varying highp vec2 vUv;
			uniform sampler2D uTexture;

			void main () {
				gl_FragColor = texture2D(uTexture, vUv);
			}
		`
		)

		// Color shader
		const colorShader = this.compileShader(
			this.gl.FRAGMENT_SHADER,
			`
			precision mediump float;
			uniform vec4 color;

			void main () {
				gl_FragColor = color;
			}
		`
		)

		// Splat shader
		const splatShader = this.compileShader(
			this.gl.FRAGMENT_SHADER,
			`
			precision highp float;
			precision highp sampler2D;
			varying vec2 vUv;
			uniform sampler2D uTarget;
			uniform float aspectRatio;
			uniform vec3 color;
			uniform vec2 point;
			uniform float radius;

			void main () {
				vec2 p = vUv - point.xy;
				p.x *= aspectRatio;
				vec3 splat = exp(-dot(p, p) / radius) * color;
				vec3 base = texture2D(uTarget, vUv).xyz;
				gl_FragColor = vec4(base + splat, 1.0);
			}
		`
		)

		// Additional shaders for complete simulation
		const clearShader = this.compileShader(
			this.gl.FRAGMENT_SHADER,
			`
			precision mediump float;
			precision mediump sampler2D;
			varying highp vec2 vUv;
			uniform sampler2D uTexture;
			uniform float value;

			void main () {
				gl_FragColor = value * texture2D(uTexture, vUv);
			}
		`
		)

		const advectionShader = this.compileShader(
			this.gl.FRAGMENT_SHADER,
			`
			precision highp float;
			precision highp sampler2D;
			varying vec2 vUv;
			uniform sampler2D uVelocity;
			uniform sampler2D uSource;
			uniform vec2 texelSize;
			uniform vec2 dyeTexelSize;
			uniform float dt;
			uniform float dissipation;

			vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
				vec2 st = uv / tsize - 0.5;
				vec2 iuv = floor(st);
				vec2 fuv = fract(st);
				vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
				vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
				vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
				vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
				return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
			}

			void main () {
				vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
				vec4 result = texture2D(uSource, coord);
				float decay = 1.0 + dissipation * dt;
				gl_FragColor = result / decay;
			}
		`
		)

		const divergenceShader = this.compileShader(
			this.gl.FRAGMENT_SHADER,
			`
			precision mediump float;
			precision mediump sampler2D;
			varying highp vec2 vUv;
			varying highp vec2 vL;
			varying highp vec2 vR;
			varying highp vec2 vT;
			varying highp vec2 vB;
			uniform sampler2D uVelocity;

			void main () {
				float L = texture2D(uVelocity, vL).x;
				float R = texture2D(uVelocity, vR).x;
				float T = texture2D(uVelocity, vT).y;
				float B = texture2D(uVelocity, vB).y;

				vec2 C = texture2D(uVelocity, vUv).xy;
				if (vL.x < 0.0) { L = -C.x; }
				if (vR.x > 1.0) { R = -C.x; }
				if (vT.y > 1.0) { T = -C.y; }
				if (vB.y < 0.0) { B = -C.y; }

				float div = 0.5 * (R - L + T - B);
				gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
			}
		`
		)

		const curlShader = this.compileShader(
			this.gl.FRAGMENT_SHADER,
			`
			precision mediump float;
			precision mediump sampler2D;
			varying highp vec2 vUv;
			varying highp vec2 vL;
			varying highp vec2 vR;
			varying highp vec2 vT;
			varying highp vec2 vB;
			uniform sampler2D uVelocity;

			void main () {
				float L = texture2D(uVelocity, vL).y;
				float R = texture2D(uVelocity, vR).y;
				float T = texture2D(uVelocity, vT).x;
				float B = texture2D(uVelocity, vB).x;
				float vorticity = R - L - T + B;
				gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
			}
		`
		)

		const vorticityShader = this.compileShader(
			this.gl.FRAGMENT_SHADER,
			`
			precision highp float;
			precision highp sampler2D;
			varying vec2 vUv;
			varying vec2 vL;
			varying vec2 vR;
			varying vec2 vT;
			varying vec2 vB;
			uniform sampler2D uVelocity;
			uniform sampler2D uCurl;
			uniform float curl;
			uniform float dt;

			void main () {
				float L = texture2D(uCurl, vL).x;
				float R = texture2D(uCurl, vR).x;
				float T = texture2D(uCurl, vT).x;
				float B = texture2D(uCurl, vB).x;
				float C = texture2D(uCurl, vUv).x;

				vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
				force /= length(force) + 0.0001;
				force *= curl * C;
				force.y *= -1.0;

				vec2 velocity = texture2D(uVelocity, vUv).xy;
				velocity += force * dt;
				velocity = min(max(velocity, -1000.0), 1000.0);
				gl_FragColor = vec4(velocity, 0.0, 1.0);
			}
		`
		)

		const pressureShader = this.compileShader(
			this.gl.FRAGMENT_SHADER,
			`
			precision mediump float;
			precision mediump sampler2D;
			varying highp vec2 vUv;
			varying highp vec2 vL;
			varying highp vec2 vR;
			varying highp vec2 vT;
			varying highp vec2 vB;
			uniform sampler2D uPressure;
			uniform sampler2D uDivergence;

			void main () {
				float L = texture2D(uPressure, vL).x;
				float R = texture2D(uPressure, vR).x;
				float T = texture2D(uPressure, vT).x;
				float B = texture2D(uPressure, vB).x;
				float C = texture2D(uPressure, vUv).x;
				float divergence = texture2D(uDivergence, vUv).x;
				float pressure = (L + R + B + T - divergence) * 0.25;
				gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
			}
		`
		)

		const gradientSubtractShader = this.compileShader(
			this.gl.FRAGMENT_SHADER,
			`
			precision mediump float;
			precision mediump sampler2D;
			varying highp vec2 vUv;
			varying highp vec2 vL;
			varying highp vec2 vR;
			varying highp vec2 vT;
			varying highp vec2 vB;
			uniform sampler2D uPressure;
			uniform sampler2D uVelocity;

			void main () {
				float L = texture2D(uPressure, vL).x;
				float R = texture2D(uPressure, vR).x;
				float T = texture2D(uPressure, vT).x;
				float B = texture2D(uPressure, vB).x;
				vec2 velocity = texture2D(uVelocity, vUv).xy;
				velocity.xy -= vec2(R - L, T - B);
				gl_FragColor = vec4(velocity, 0.0, 1.0);
			}
		`
		)

		// Create programs
		this.programs.copy = this.createProgramWithUniforms(baseVertexShader, copyShader)
		this.programs.color = this.createProgramWithUniforms(baseVertexShader, colorShader)
		this.programs.splat = this.createProgramWithUniforms(baseVertexShader, splatShader)
		this.programs.clear = this.createProgramWithUniforms(baseVertexShader, clearShader)
		this.programs.advection = this.createProgramWithUniforms(baseVertexShader, advectionShader)
		this.programs.divergence = this.createProgramWithUniforms(baseVertexShader, divergenceShader)
		this.programs.curl = this.createProgramWithUniforms(baseVertexShader, curlShader)
		this.programs.vorticity = this.createProgramWithUniforms(baseVertexShader, vorticityShader)
		this.programs.pressure = this.createProgramWithUniforms(baseVertexShader, pressureShader)
		this.programs.gradientSubtract = this.createProgramWithUniforms(
			baseVertexShader,
			gradientSubtractShader
		)

		// Display material with keywords support
		this.displayMaterial = new Material(this.gl, baseVertexShader, this.getDisplayShaderSource())
		this.updateKeywords()
	}

	private updateKeywords() {
		let displayKeywords: string[] = []
		if (this.config.SHADING) displayKeywords.push('SHADING')
		if (this.config.BLOOM) displayKeywords.push('BLOOM')
		if (this.config.SUNRAYS) displayKeywords.push('SUNRAYS')
		this.displayMaterial.setKeywords(displayKeywords)
	}

	private getDisplayShaderSource() {
		return `
			precision highp float;
			precision highp sampler2D;

			varying vec2 vUv;
			varying vec2 vL;
			varying vec2 vR;
			varying vec2 vT;
			varying vec2 vB;
			uniform sampler2D uTexture;
			uniform sampler2D uBloom;
			uniform sampler2D uSunrays;
			uniform sampler2D uDithering;
			uniform vec2 ditherScale;
			uniform vec2 texelSize;

			vec3 linearToGamma (vec3 color) {
				color = max(color, vec3(0));
				return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
			}

			void main () {
				vec3 c = texture2D(uTexture, vUv).rgb;

			#ifdef SHADING
				vec3 lc = texture2D(uTexture, vL).rgb;
				vec3 rc = texture2D(uTexture, vR).rgb;
				vec3 tc = texture2D(uTexture, vT).rgb;
				vec3 bc = texture2D(uTexture, vB).rgb;

				float dx = length(rc) - length(lc);
				float dy = length(tc) - length(bc);

				vec3 n = normalize(vec3(dx, dy, length(texelSize)));
				vec3 l = vec3(0.0, 0.0, 1.0);

				float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
				c *= diffuse;
			#endif

			#ifdef BLOOM
				vec3 bloom = texture2D(uBloom, vUv).rgb;
			#endif

			#ifdef SUNRAYS
				float sunrays = texture2D(uSunrays, vUv).r;
				c *= sunrays;
			#ifdef BLOOM
				bloom *= sunrays;
			#endif
			#endif

			#ifdef BLOOM
				float noise = texture2D(uDithering, vUv * ditherScale).r;
				noise = noise * 2.0 - 1.0;
				bloom += noise / 255.0;
				bloom = linearToGamma(bloom);
				c += bloom;
			#endif

				float a = max(c.r, max(c.g, c.b));
				gl_FragColor = vec4(c, a);
			}
		`
	}

	private createProgramWithUniforms(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
		const program = this.createProgram(vertexShader, fragmentShader)
		return {
			program,
			uniforms: this.getUniforms(program),
			bind: () => this.gl.useProgram(program),
		}
	}

	private setupBlit() {
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.createBuffer())
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
			this.gl.STATIC_DRAW
		)
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.gl.createBuffer())
		this.gl.bufferData(
			this.gl.ELEMENT_ARRAY_BUFFER,
			new Uint16Array([0, 1, 2, 0, 2, 3]),
			this.gl.STATIC_DRAW
		)
		this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0)
		this.gl.enableVertexAttribArray(0)

		this.blit = (target?: any, clear = false) => {
			if (target == null) {
				this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight)
				this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
			} else {
				this.gl.viewport(0, 0, target.width, target.height)
				this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.fbo)
			}
			if (clear) {
				this.gl.clearColor(0.0, 0.0, 0.0, 1.0)
				this.gl.clear(this.gl.COLOR_BUFFER_BIT)
			}
			this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0)
		}
	}

	private initFramebuffers() {
		let simRes = this.getResolution(this.config.SIM_RESOLUTION)
		let dyeRes = this.getResolution(this.config.DYE_RESOLUTION)

		const texType = this.ext.halfFloatTexType
		const rgba = this.ext.formatRGBA
		const rg = this.ext.formatRG
		const r = this.ext.formatR
		const filtering = this.ext.supportLinearFiltering ? this.gl.LINEAR : this.gl.NEAREST

		this.gl.disable(this.gl.BLEND)

		// Create framebuffers for complete simulation
		this.dye = this.createDoubleFBO(
			dyeRes.width,
			dyeRes.height,
			rgba.internalFormat,
			rgba.format,
			texType,
			filtering
		)

		this.velocity = this.createDoubleFBO(
			simRes.width,
			simRes.height,
			rg.internalFormat,
			rg.format,
			texType,
			filtering
		)

		this.divergence = this.createFBO(
			simRes.width,
			simRes.height,
			r.internalFormat,
			r.format,
			texType,
			this.gl.NEAREST
		)

		this.curl = this.createFBO(
			simRes.width,
			simRes.height,
			r.internalFormat,
			r.format,
			texType,
			this.gl.NEAREST
		)

		this.pressure = this.createDoubleFBO(
			simRes.width,
			simRes.height,
			r.internalFormat,
			r.format,
			texType,
			this.gl.NEAREST
		)

		this.initBloomFramebuffers()
		this.initSunraysFramebuffers()
	}

	private initBloomFramebuffers() {
		let res = this.getResolution(this.config.BLOOM_RESOLUTION)

		const texType = this.ext.halfFloatTexType
		const rgba = this.ext.formatRGBA
		const filtering = this.ext.supportLinearFiltering ? this.gl.LINEAR : this.gl.NEAREST

		this.bloom = this.createFBO(
			res.width,
			res.height,
			rgba.internalFormat,
			rgba.format,
			texType,
			filtering
		)

		this.bloomFramebuffers.length = 0
		for (let i = 0; i < this.config.BLOOM_ITERATIONS; i++) {
			let width = res.width >> (i + 1)
			let height = res.height >> (i + 1)

			if (width < 2 || height < 2) break

			let fbo = this.createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering)
			this.bloomFramebuffers.push(fbo)
		}
	}

	private initSunraysFramebuffers() {
		let res = this.getResolution(this.config.SUNRAYS_RESOLUTION)

		const texType = this.ext.halfFloatTexType
		const r = this.ext.formatR
		const filtering = this.ext.supportLinearFiltering ? this.gl.LINEAR : this.gl.NEAREST

		this.sunrays = this.createFBO(
			res.width,
			res.height,
			r.internalFormat,
			r.format,
			texType,
			filtering
		)
		this.sunraysTemp = this.createFBO(
			res.width,
			res.height,
			r.internalFormat,
			r.format,
			texType,
			filtering
		)
	}

	private getResolution(resolution: number) {
		let aspectRatio = this.gl.drawingBufferWidth / this.gl.drawingBufferHeight
		if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio

		let min = Math.round(resolution)
		let max = Math.round(resolution * aspectRatio)

		if (this.gl.drawingBufferWidth > this.gl.drawingBufferHeight) {
			return { width: max, height: min }
		} else {
			return { width: min, height: max }
		}
	}

	private createFBO(
		w: number,
		h: number,
		internalFormat: number,
		format: number,
		type: number,
		param: number
	) {
		this.gl.activeTexture(this.gl.TEXTURE0)
		let texture = this.gl.createTexture()
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, param)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, param)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)

		let fbo = this.gl.createFramebuffer()
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo)
		this.gl.framebufferTexture2D(
			this.gl.FRAMEBUFFER,
			this.gl.COLOR_ATTACHMENT0,
			this.gl.TEXTURE_2D,
			texture,
			0
		)
		this.gl.viewport(0, 0, w, h)
		this.gl.clear(this.gl.COLOR_BUFFER_BIT)

		let texelSizeX = 1.0 / w
		let texelSizeY = 1.0 / h

		return {
			texture,
			fbo,
			width: w,
			height: h,
			texelSizeX,
			texelSizeY,
			attach: (id: number) => {
				this.gl.activeTexture(this.gl.TEXTURE0 + id)
				this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
				return id
			},
		}
	}

	private createDoubleFBO(
		w: number,
		h: number,
		internalFormat: number,
		format: number,
		type: number,
		param: number
	) {
		let fbo1 = this.createFBO(w, h, internalFormat, format, type, param)
		let fbo2 = this.createFBO(w, h, internalFormat, format, type, param)

		return {
			width: w,
			height: h,
			texelSizeX: fbo1.texelSizeX,
			texelSizeY: fbo1.texelSizeY,
			get read() {
				return fbo1
			},
			set read(value) {
				fbo1 = value
			},
			get write() {
				return fbo2
			},
			set write(value) {
				fbo2 = value
			},
			swap() {
				let temp = fbo1
				fbo1 = fbo2
				fbo2 = temp
			},
		}
	}

	private scaleByPixelRatio(input: number) {
		let pixelRatio = window.devicePixelRatio || 1
		return Math.floor(input * pixelRatio)
	}

	private correctDeltaX(delta: number) {
		let aspectRatio = this.canvas.width / this.canvas.height
		if (aspectRatio < 1) delta *= aspectRatio
		return delta
	}

	private correctDeltaY(delta: number) {
		let aspectRatio = this.canvas.width / this.canvas.height
		if (aspectRatio > 1) delta /= aspectRatio
		return delta
	}

	private generateColor(modifier: number = 1): [number, number, number] {
		// let c = this.HSVtoRGB(Math.random(), 1.0, 0.25)
		// c.r *= 0.5
		// c.g *= 0.5
		// c.b *= 2

		let r = Math.random() * 0.4 * modifier
		let g = Math.random() * 0.4 * modifier
		let b = Math.random() * 0.7 * modifier
		// if (r < 0.2 && g < 0.2 && b < 0.2) {
		// 	b = 1
		// }
		return [r, g, b]
	}

	// private HSVtoRGB(h: number, s: number, v: number) {
	// 	let r: number, g: number, b: number, i: number, f: number, p: number, q: number, t: number
	// 	i = Math.floor(h * 6)
	// 	f = h * 6 - i
	// 	p = v * (1 - s)
	// 	q = v * (1 - f * s)
	// 	t = v * (1 - (1 - f) * s)

	// 	switch (i % 6) {
	// 		case 0:
	// 			r = v
	// 			g = t
	// 			b = p
	// 			break
	// 		case 1:
	// 			r = q
	// 			g = v
	// 			b = p
	// 			break
	// 		case 2:
	// 			r = p
	// 			g = v
	// 			b = t
	// 			break
	// 		case 3:
	// 			r = p
	// 			g = q
	// 			b = v
	// 			break
	// 		case 4:
	// 			r = t
	// 			g = p
	// 			b = v
	// 			break
	// 		case 5:
	// 			r = v
	// 			g = p
	// 			b = q
	// 			break
	// 		default:
	// 			r = 0
	// 			g = 0
	// 			b = 0
	// 			break
	// 	}

	// 	return { r, g, b }
	// }

	private resizeCanvas() {
		let width = this.scaleByPixelRatio(this.canvas.clientWidth)
		let height = this.scaleByPixelRatio(this.canvas.clientHeight)
		if (this.canvas.width != width || this.canvas.height != height) {
			this.canvas.width = width
			this.canvas.height = height
			this.initFramebuffers()
			return true
		}
		return false
	}

	private calcDeltaTime() {
		let now = Date.now()
		let dt = (now - this.lastUpdateTime) / 1000
		dt = Math.min(dt, 0.016666)
		this.lastUpdateTime = now
		return dt
	}

	private updateColors(dt: number) {
		if (!this.config.COLORFUL) return

		this.colorUpdateTimer += dt * this.config.COLOR_UPDATE_SPEED
		if (this.colorUpdateTimer >= 1) {
			this.colorUpdateTimer = this.wrap(this.colorUpdateTimer, 0, 1)
			this.pointers.forEach((p) => {
				p.color = this.generateColor()
			})
		}
	}

	private wrap(value: number, min: number, max: number) {
		let range = max - min
		if (range == 0) return min
		return ((value - min) % range) + min
	}

	private applyInputs() {
		if (this.splatStack.length > 0) this.multipleSplats(this.splatStack.pop()!)

		this.pointers.forEach((p) => {
			if (p.moved) {
				p.moved = false
				this.splatPointer(p)
			}
		})
	}

	private splatPointer(pointer: Pointer) {
		let dx = pointer.deltaX * this.config.SPLAT_FORCE
		let dy = pointer.deltaY * this.config.SPLAT_FORCE
		this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, {
			r: pointer.color[0],
			g: pointer.color[1],
			b: pointer.color[2],
		})
	}

	private multipleSplats(amount: number) {
		for (let i = 0; i < amount; i++) {
			const color = this.generateColor()
			const x = Math.random()
			const y = Math.random()
			const dx = 1000 * (Math.random() - 0.5)
			const dy = 1000 * (Math.random() - 0.5)
			this.splat(x, y, dx, dy, { r: color[0] * 10, g: color[1] * 10, b: color[2] * 10 })
		}
	}

	private splat(
		x: number,
		y: number,
		dx: number,
		dy: number,
		color: { r: number; g: number; b: number },
		radius: number = 0.01
	) {
		this.programs.splat.bind()
		this.gl.uniform1i(this.programs.splat.uniforms.uTarget, this.velocity.read.attach(0))
		this.gl.uniform1f(
			this.programs.splat.uniforms.aspectRatio,
			this.canvas.width / this.canvas.height
		)
		this.gl.uniform2f(this.programs.splat.uniforms.point, x, y)
		this.gl.uniform3f(this.programs.splat.uniforms.color, dx, dy, 0.0)
		this.gl.uniform1f(this.programs.splat.uniforms.radius, this.correctRadius(radius / 100.0))
		this.blit(this.velocity.write)
		this.velocity.swap()

		this.gl.uniform1i(this.programs.splat.uniforms.uTarget, this.dye.read.attach(0))
		this.gl.uniform3f(this.programs.splat.uniforms.color, color.r, color.g, color.b)
		this.blit(this.dye.write)
		this.dye.swap()
	}

	private correctRadius(radius: number) {
		let aspectRatio = this.canvas.width / this.canvas.height
		if (aspectRatio > 1) radius *= aspectRatio
		return radius
	}

	private render(target?: any) {
		if (this.config.BLOOM) this.applyBloom(this.dye.read, this.bloom)
		if (this.config.SUNRAYS) {
			this.applySunrays(this.dye.read, this.dye.write, this.sunrays)
			this.blur(this.sunrays, this.sunraysTemp, 1)
		}

		if (target == null || !this.config.TRANSPARENT) {
			this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA)
			this.gl.enable(this.gl.BLEND)
		} else {
			this.gl.disable(this.gl.BLEND)
		}

		if (!this.config.TRANSPARENT)
			this.drawColor(target, this.normalizeColor(this.config.BACK_COLOR))
		this.drawDisplay(target)
	}

	private drawColor(target: any, color: { r: number; g: number; b: number }) {
		this.programs.color.bind()
		this.gl.uniform4f(this.programs.color.uniforms.color, color.r, color.g, color.b, 1)
		this.blit(target)
	}

	private drawDisplay(target: any) {
		let width = target == null ? this.gl.drawingBufferWidth : target.width
		let height = target == null ? this.gl.drawingBufferHeight : target.height

		this.displayMaterial.bind()
		if (this.config.SHADING)
			this.gl.uniform2f(this.displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height)
		this.gl.uniform1i(this.displayMaterial.uniforms.uTexture, this.dye.read.attach(0))
		if (this.config.BLOOM) {
			this.gl.uniform1i(this.displayMaterial.uniforms.uBloom, this.bloom.attach(1))
			if (this.ditheringTexture) {
				this.gl.uniform1i(this.displayMaterial.uniforms.uDithering, this.ditheringTexture.attach(2))
				let scale = this.getTextureScale(this.ditheringTexture, width, height)
				this.gl.uniform2f(this.displayMaterial.uniforms.ditherScale, scale.x, scale.y)
			}
		}
		if (this.config.SUNRAYS)
			this.gl.uniform1i(this.displayMaterial.uniforms.uSunrays, this.sunrays.attach(3))
		this.blit(target)
	}

	private getTextureScale(texture: any, width: number, height: number) {
		return {
			x: width / texture.width,
			y: height / texture.height,
		}
	}

	private applyBloom(source: any, destination: any) {
		if (this.bloomFramebuffers.length < 2) return

		let last = destination

		this.gl.disable(this.gl.BLEND)
		// Simple bloom implementation - just copy for now
		this.programs.copy.bind()
		this.gl.uniform1i(this.programs.copy.uniforms.uTexture, source.attach(0))
		this.blit(last)
	}

	private applySunrays(source: any, _mask: any, destination: any) {
		this.gl.disable(this.gl.BLEND)
		// Simple sunrays implementation - just copy for now
		this.programs.copy.bind()
		this.gl.uniform1i(this.programs.copy.uniforms.uTexture, source.attach(0))
		this.blit(destination)
	}

	private blur(target: any, temp: any, _iterations: number) {
		// Simple blur implementation - just copy for now
		this.programs.copy.bind()
		this.gl.uniform1i(this.programs.copy.uniforms.uTexture, target.attach(0))
		this.blit(temp)
	}

	private normalizeColor(input: { r: number; g: number; b: number }) {
		return {
			r: input.r / 255,
			g: input.g / 255,
			b: input.b / 255,
		}
	}

	private update() {
		if (!this.isRunning) return

		const dt = this.calcDeltaTime()
		if (this.resizeCanvas()) this.initFramebuffers()
		this.updateColors(dt)
		this.applyInputs()
		if (!this.config.PAUSED) {
			this.step(dt)
		}
		this.render(null)
		this.animationId = requestAnimationFrame(() => this.update())
	}

	private step(dt: number) {
		this.gl.disable(this.gl.BLEND)

		// Curl computation
		this.programs.curl.bind()
		this.gl.uniform2f(
			this.programs.curl.uniforms.texelSize,
			this.velocity.texelSizeX,
			this.velocity.texelSizeY
		)
		this.gl.uniform1i(this.programs.curl.uniforms.uVelocity, this.velocity.read.attach(0))
		this.blit(this.curl)

		// Vorticity confinement
		this.programs.vorticity.bind()
		this.gl.uniform2f(
			this.programs.vorticity.uniforms.texelSize,
			this.velocity.texelSizeX,
			this.velocity.texelSizeY
		)
		this.gl.uniform1i(this.programs.vorticity.uniforms.uVelocity, this.velocity.read.attach(0))
		this.gl.uniform1i(this.programs.vorticity.uniforms.uCurl, this.curl.attach(1))
		this.gl.uniform1f(this.programs.vorticity.uniforms.curl, this.config.CURL)
		this.gl.uniform1f(this.programs.vorticity.uniforms.dt, dt)
		this.blit(this.velocity.write)
		this.velocity.swap()

		// Divergence computation
		this.programs.divergence.bind()
		this.gl.uniform2f(
			this.programs.divergence.uniforms.texelSize,
			this.velocity.texelSizeX,
			this.velocity.texelSizeY
		)
		this.gl.uniform1i(this.programs.divergence.uniforms.uVelocity, this.velocity.read.attach(0))
		this.blit(this.divergence)

		// Clear pressure
		this.programs.clear.bind()
		this.gl.uniform1i(this.programs.clear.uniforms.uTexture, this.pressure.read.attach(0))
		this.gl.uniform1f(this.programs.clear.uniforms.value, this.config.PRESSURE)
		this.blit(this.pressure.write)
		this.pressure.swap()

		// Pressure solve
		this.programs.pressure.bind()
		this.gl.uniform2f(
			this.programs.pressure.uniforms.texelSize,
			this.velocity.texelSizeX,
			this.velocity.texelSizeY
		)
		this.gl.uniform1i(this.programs.pressure.uniforms.uDivergence, this.divergence.attach(0))
		for (let i = 0; i < this.config.PRESSURE_ITERATIONS; i++) {
			this.gl.uniform1i(this.programs.pressure.uniforms.uPressure, this.pressure.read.attach(1))
			this.blit(this.pressure.write)
			this.pressure.swap()
		}

		// Gradient subtraction
		this.programs.gradientSubtract.bind()
		this.gl.uniform2f(
			this.programs.gradientSubtract.uniforms.texelSize,
			this.velocity.texelSizeX,
			this.velocity.texelSizeY
		)
		this.gl.uniform1i(
			this.programs.gradientSubtract.uniforms.uPressure,
			this.pressure.read.attach(0)
		)
		this.gl.uniform1i(
			this.programs.gradientSubtract.uniforms.uVelocity,
			this.velocity.read.attach(1)
		)
		this.blit(this.velocity.write)
		this.velocity.swap()

		// Velocity advection
		this.programs.advection.bind()
		this.gl.uniform2f(
			this.programs.advection.uniforms.texelSize,
			this.velocity.texelSizeX,
			this.velocity.texelSizeY
		)
		this.gl.uniform2f(
			this.programs.advection.uniforms.dyeTexelSize,
			this.velocity.texelSizeX,
			this.velocity.texelSizeY
		)
		let velocityId = this.velocity.read.attach(0)
		this.gl.uniform1i(this.programs.advection.uniforms.uVelocity, velocityId)
		this.gl.uniform1i(this.programs.advection.uniforms.uSource, velocityId)
		this.gl.uniform1f(this.programs.advection.uniforms.dt, dt)
		this.gl.uniform1f(
			this.programs.advection.uniforms.dissipation,
			this.config.VELOCITY_DISSIPATION
		)
		this.blit(this.velocity.write)
		this.velocity.swap()

		// Dye advection
		this.gl.uniform2f(
			this.programs.advection.uniforms.dyeTexelSize,
			this.dye.texelSizeX,
			this.dye.texelSizeY
		)
		this.gl.uniform1i(this.programs.advection.uniforms.uVelocity, this.velocity.read.attach(0))
		this.gl.uniform1i(this.programs.advection.uniforms.uSource, this.dye.read.attach(1))
		this.gl.uniform1f(this.programs.advection.uniforms.dissipation, this.config.DENSITY_DISSIPATION)
		this.blit(this.dye.write)
		this.dye.swap()
	}

	// Public methods for controlling the simulation
	start() {
		if (this.isRunning) return
		this.isRunning = true
		this.resizeCanvas()
		this.multipleSplats(Math.floor(Math.random() * 20) + 5)
		this.lastUpdateTime = Date.now()
		this.update()
	}

	destroy() {
		this.isRunning = false
		if (this.animationId) {
			cancelAnimationFrame(this.animationId)
			this.animationId = null
		}
	}

	pause() {
		this.config.PAUSED = true
	}

	resume() {
		this.config.PAUSED = false
	}

	addSplat(x: number, y: number, dx: number, dy: number, color?: [number, number, number]) {
		if (!color) color = this.generateColor()
		this.splat(x, y, dx, dy, { r: color[0], g: color[1], b: color[2] })
	}

	// Drag interaction methods for tldraw integration
	startDrag(x: number, y: number) {
		if (!this.dragPointer) {
			this.dragPointer = createPointer()
		}

		this.isDragging = true
		this.dragPointer.down = true
		this.dragPointer.moved = false
		this.dragPointer.texcoordX = x
		this.dragPointer.texcoordY = y
		this.dragPointer.prevTexcoordX = x
		this.dragPointer.prevTexcoordY = y
		this.dragPointer.deltaX = 0
		this.dragPointer.deltaY = 0
		this.dragPointer.color = this.generateColor()
	}

	updateDrag(x: number, y: number) {
		if (!this.isDragging || !this.dragPointer) return

		// console.log('dragPointer', this.dragPointer)

		this.dragPointer.prevTexcoordX = this.dragPointer.texcoordX
		this.dragPointer.prevTexcoordY = this.dragPointer.texcoordY
		this.dragPointer.texcoordX = x
		this.dragPointer.texcoordY = y
		this.dragPointer.deltaX = this.correctDeltaX(x - this.dragPointer.prevTexcoordX)
		this.dragPointer.deltaY = this.correctDeltaY(y - this.dragPointer.prevTexcoordY)
		this.dragPointer.moved =
			Math.abs(this.dragPointer.deltaX) > 0 || Math.abs(this.dragPointer.deltaY) > 0

		// Create fluid effect if there's movement
		if (this.dragPointer.moved) {
			this.splatPointer(this.dragPointer)
		}
	}

	endDrag() {
		if (this.dragPointer) {
			this.dragPointer.down = false
		}
		this.isDragging = false
	}

	// Shape geometry splat methods
	createSplatsFromPoints(
		points: Array<{ x: number; y: number }>,
		velocity: { x: number; y: number } = { x: 0, y: 0 },
		color?: [number, number, number]
	) {
		points.forEach((point) => {
			// Create tiny splats with small radius and force
			const dx = velocity.x * 100 + (Math.random() - 0.5) * 1
			const dy = -velocity.y * 100 + (Math.random() - 0.5) * 1
			const splatColor = color || this.generateColor(0.05)
			this.addSplat(point.x, point.y, dx, dy, splatColor)
		})
	}

	interpolatePoints(
		point1: { x: number; y: number },
		point2: { x: number; y: number },
		maxDistance: number = 0.01
	): Array<{ x: number; y: number }> {
		const distance = Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2))

		if (distance <= maxDistance) {
			return [point1, point2]
		}

		const numPoints = Math.ceil(distance / maxDistance)
		const points: Array<{ x: number; y: number }> = []

		for (let i = 0; i <= numPoints; i++) {
			const t = i / numPoints
			points.push({
				x: point1.x + (point2.x - point1.x) * t,
				y: point1.y + (point2.y - point1.y) * t,
			})
		}

		return points
	}

	// Decimate points to remove those that are too close together
	decimatePoints(
		points: Array<{ x: number; y: number }>,
		minDistance: number = 0.003
	): Array<{ x: number; y: number }> {
		if (points.length <= 1) return points

		const decimated: Array<{ x: number; y: number }> = [points[0]] // Always keep first point
		const minDistanceSquared = minDistance * minDistance // Avoid sqrt in loop

		for (let i = 1; i < points.length; i++) {
			const currentPoint = points[i]
			const lastKeptPoint = decimated[decimated.length - 1]

			// Calculate squared distance to avoid expensive sqrt
			const dx = currentPoint.x - lastKeptPoint.x
			const dy = currentPoint.y - lastKeptPoint.y
			const distanceSquared = dx * dx + dy * dy

			// Only keep point if it's far enough from the last kept point
			if (distanceSquared >= minDistanceSquared) {
				decimated.push(currentPoint)
			}
		}

		// Always keep the last point if it's not already kept
		const lastPoint = points[points.length - 1]
		const lastKeptPoint = decimated[decimated.length - 1]
		if (lastPoint !== lastKeptPoint) {
			const dx = lastPoint.x - lastKeptPoint.x
			const dy = lastPoint.y - lastKeptPoint.y
			const distanceSquared = dx * dx + dy * dy

			// Only add if it's meaningfully different
			if (distanceSquared >= minDistanceSquared * 0.25) {
				decimated.push(lastPoint)
			}
		}

		return decimated
	}

	// Adaptive decimation based on point density and shape size
	adaptiveDecimatePoints(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
		if (points.length <= 3) return points

		// Calculate bounding box to estimate shape size
		let minX = points[0].x,
			maxX = points[0].x
		let minY = points[0].y,
			maxY = points[0].y

		for (const point of points) {
			minX = Math.min(minX, point.x)
			maxX = Math.max(maxX, point.x)
			minY = Math.min(minY, point.y)
			maxY = Math.max(maxY, point.y)
		}

		// const shapeWidth = maxX - minX
		// const shapeHeight = maxY - minY
		// const shapeSize = Math.sqrt(shapeWidth * shapeWidth + shapeHeight * shapeHeight)

		// Adaptive threshold: larger shapes can have more aggressive decimation
		const threshold = 0.002 // Base threshold for small shapes
		// if (shapeSize > 0.1) threshold = 0.004 // Medium shapes
		// if (shapeSize > 0.3) threshold = 0.008 // Large shapes
		// if (shapeSize > 0.5) threshold = 0.012 // Very large shapes

		// Also consider point density
		// const pointDensity = points.length / shapeSize
		// if (pointDensity > 100) threshold *= 1.5 // More aggressive for very dense geometry

		return this.decimatePoints(points, threshold)
	}

	createSplatsFromGeometry(
		geometry: Array<{ x: number; y: number }>,
		velocity: { x: number; y: number } = { x: 0, y: 0 },
		isClosed: boolean = true,
		color?: [number, number, number]
	) {
		if (geometry.length === 0) return

		// Use adaptive decimation based on shape size and point density
		const decimatedGeometry = this.adaptiveDecimatePoints(geometry)

		console.log(
			`Geometry decimation: ${geometry.length} -> ${decimatedGeometry.length} points (${isClosed ? 'closed' : 'open'})`
		)

		// Skip interpolation for very dense geometry to improve performance
		let finalPoints: Array<{ x: number; y: number }>

		if (decimatedGeometry.length > 50) {
			// For dense geometry, use points as-is
			finalPoints = decimatedGeometry
		} else {
			// For sparse geometry, interpolate for smoother coverage
			const interpolatedPoints: Array<{ x: number; y: number }> = []

			// Determine how many segments to process
			const segmentCount = isClosed ? decimatedGeometry.length : decimatedGeometry.length - 1

			for (let i = 0; i < segmentCount; i++) {
				const currentPoint = decimatedGeometry[i]
				const nextPoint = isClosed
					? decimatedGeometry[(i + 1) % decimatedGeometry.length] // Wrap around for closed shapes
					: decimatedGeometry[i + 1] // Don't wrap for open shapes

				if (nextPoint) {
					// Safety check for open shapes
					const segmentPoints = this.interpolatePoints(currentPoint, nextPoint, 0.008)
					interpolatedPoints.push(...segmentPoints.slice(0, -1))
				}
			}

			// Light final decimation for interpolated points
			finalPoints = this.decimatePoints(interpolatedPoints, 0.005)
		}

		// console.log(`Final point count: ${finalPoints.length}`)

		// Limit maximum points for performance
		if (finalPoints.length > 200) {
			// Sample evenly spaced points from the final set
			const step = Math.ceil(finalPoints.length / 200)
			finalPoints = finalPoints.filter((_, index) => index % step === 0)
			console.log(`Limited to ${finalPoints.length} points for performance`)
		}

		// Create splats from optimized points
		this.createSplatsFromPoints(finalPoints, velocity, color)
	}

	// Configuration methods
	updateConfig(newConfig: Partial<FluidConfig>) {
		this.config = { ...this.config, ...newConfig }
		this.updateKeywords()
	}

	getConfig(): FluidConfig {
		return { ...this.config }
	}

	// Additional utility methods
	addRandomSplats(count: number = 5) {
		this.splatStack.push(count)
	}

	clearFluid() {
		// Clear the dye texture
		this.programs.clear.bind()
		this.gl.uniform1i(this.programs.clear.uniforms.uTexture, this.dye.read.attach(0))
		this.gl.uniform1f(this.programs.clear.uniforms.value, 0.0)
		this.blit(this.dye.write)
		this.dye.swap()
	}

	setBackgroundColor(r: number, g: number, b: number) {
		this.config.BACK_COLOR = { r, g, b }
	}

	// Performance monitoring
	getPerformanceInfo() {
		return {
			isRunning: this.isRunning,
			isPaused: this.config.PAUSED,
			canvasSize: { width: this.canvas.width, height: this.canvas.height },
			simResolution: this.config.SIM_RESOLUTION,
			dyeResolution: this.config.DYE_RESOLUTION,
			webglVersion: this.gl instanceof WebGL2RenderingContext ? '2.0' : '1.0',
		}
	}
}

class Material {
	private vertexShader: WebGLShader
	private fragmentShaderSource: string
	private programs: { [key: number]: WebGLProgram } = {}
	private activeProgram: WebGLProgram | null = null
	public uniforms: { [key: string]: WebGLUniformLocation } = {}
	private gl: WebGL2RenderingContext | WebGLRenderingContext

	constructor(
		gl: WebGL2RenderingContext | WebGLRenderingContext,
		vertexShader: WebGLShader,
		fragmentShaderSource: string
	) {
		this.gl = gl
		this.vertexShader = vertexShader
		this.fragmentShaderSource = fragmentShaderSource
	}

	setKeywords(keywords: string[]) {
		let hash = 0
		for (let i = 0; i < keywords.length; i++) hash += this.hashCode(keywords[i])

		let program = this.programs[hash]
		if (program == null) {
			let fragmentShader = this.compileShader(
				this.gl.FRAGMENT_SHADER,
				this.fragmentShaderSource,
				keywords
			)
			program = this.createProgram(this.vertexShader, fragmentShader)
			this.programs[hash] = program
		}

		if (program == this.activeProgram) return

		this.uniforms = this.getUniforms(program)
		this.activeProgram = program
	}

	bind() {
		this.gl.useProgram(this.activeProgram)
	}

	private compileShader(type: number, source: string, keywords?: string[]) {
		source = this.addKeywords(source, keywords)

		const shader = this.gl.createShader(type)!
		this.gl.shaderSource(shader, source)
		this.gl.compileShader(shader)

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.trace(this.gl.getShaderInfoLog(shader))
		}

		return shader
	}

	private addKeywords(source: string, keywords?: string[]) {
		if (keywords == null) return source
		let keywordsString = ''
		keywords.forEach((keyword) => {
			keywordsString += '#define ' + keyword + '\n'
		})
		return keywordsString + source
	}

	private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
		let program = this.gl.createProgram()!
		this.gl.attachShader(program, vertexShader)
		this.gl.attachShader(program, fragmentShader)
		this.gl.linkProgram(program)

		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			console.trace(this.gl.getProgramInfoLog(program))
		}

		return program
	}

	private getUniforms(program: WebGLProgram) {
		let uniforms: { [key: string]: WebGLUniformLocation } = {}
		let uniformCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS)
		for (let i = 0; i < uniformCount; i++) {
			let uniformName = this.gl.getActiveUniform(program, i)!.name
			uniforms[uniformName] = this.gl.getUniformLocation(program, uniformName)!
		}
		return uniforms
	}

	private hashCode(s: string) {
		if (s.length == 0) return 0
		let hash = 0
		for (let i = 0; i < s.length; i++) {
			hash = (hash << 5) - hash + s.charCodeAt(i)
			hash |= 0 // Convert to 32bit integer
		}
		return hash
	}
}
