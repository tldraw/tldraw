import { Editor, react, TLShape, Vec } from 'tldraw'
import { WebGLManager } from '../WebGLManager'

// Vertex shader for rendering a full-screen quad
const VERTEX_SHADER = `#version 300 es
precision mediump float;
precision mediump int;

in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// Fragment shader for rendering the smoke effect
const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
precision mediump int;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_pixelSize;
uniform float u_time;
uniform float u_darkMode;

// Geometry data
#define STEPS 20.0
#define MAX_SEGMENTS 1000
uniform vec4 u_segments[MAX_SEGMENTS]; // xy = start, zw = end
uniform float u_segmentCount;
  
// Simple noise function
float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian Motion for more organic noise
float fbm(vec2 p) {
	float value = 0.0;
	float amplitude = 0.5;
	float frequency = 1.0;
	
	for (int i = 0; i < 4; i++) {
		value += amplitude * noise(p * frequency);
		amplitude *= 0.5;
		frequency *= 2.0;
	}
	
	return value;
}

// Find closest point on line segment to point p
vec2 closestPointOnSegment(vec2 p, vec2 a, vec2 b) {
	vec2 pa = p - a;
	vec2 ba = b - a;
	float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
	return a + ba * h;
}

// Ease out quintic for smooth falloff
float easeOutQuint(float t) {
	return 1.0 - pow(1.0 - t, 5.0);
}

void main() {
	// Calculate pixel grid position
	vec2 pixelCoord = floor(v_uv * u_resolution / u_pixelSize) * u_pixelSize;
	vec2 pixelCenter = (pixelCoord + u_pixelSize * 0.5);
	
	float minDist = 1000.0;
	vec2 closestPoint = vec2(0.0);
	
	// Find actual closest point on any segment
	for (int i = 0; i < MAX_SEGMENTS; i++) {
		if (float(i) >= u_segmentCount) break;
		
		vec4 segment = u_segments[i];
		vec2 start = segment.xy;
		vec2 end = segment.zw;
		
		vec2 pointOnSegment = closestPointOnSegment(pixelCenter, start, end);
		float dist = distance(pixelCenter, pointOnSegment);
		
		if (dist < minDist) {
			minDist = dist;
			closestPoint = pointOnSegment;
		}
	}

	
	// Proximity-based rainbow
	float maxDistance = 200.0;

	if (minDist > maxDistance) {
		fragColor = vec4(0.0, 0.0, 0.0, 0.0);
		return;
  }
	
	
	minDist = floor(minDist / (maxDistance/STEPS)) * (maxDistance/STEPS);
	float proximity = smoothstep(maxDistance, 0.0, minDist);
	
	// Animate rainbow outward: distance + time creates moving waves
	// The rainbow cycles and radiates outward over time
	float hue = mod((minDist * 0.003) + (u_time * 0.0001), 1.0);
	
	// Convert HSV to RGB (simple approximation)
	vec3 rainbowColor;
	float h = hue * 20.0;
	float x = 1.0 - abs(mod(h, 2.0) - 1.0);
	if (h < 1.0) rainbowColor = vec3(1.0, x, 0.0);       // Red to Yellow
	else if (h < 2.0) rainbowColor = vec3(x, 1.0, 0.0);  // Yellow to Green
	else if (h < 3.0) rainbowColor = vec3(0.0, 1.0, x);  // Green to Cyan
	else if (h < 4.0) rainbowColor = vec3(0.0, x, 1.0);  // Cyan to Blue
	else if (h < 5.0) rainbowColor = vec3(x, 0.0, 1.0);  // Blue to Magenta
	else rainbowColor = vec3(1.0, 0.0, x);               // Magenta to Red
	
	// Opacity with ease out quintic for smooth falloff
	float alpha = easeOutQuint(proximity);
    
    fragColor = vec4(rainbowColor, alpha);
}
`

export interface Geometry {
	points: Vec[]
	segments: Array<{ start: Vec; end: Vec }>
}

export class SmokeManager extends WebGLManager {
	private program: WebGLProgram | null = null
	private positionBuffer: WebGLBuffer | null = null
	private vao: WebGLVertexArrayObject | null = null

	// Uniform locations
	private u_resolution: WebGLUniformLocation | null = null
	private u_pixelSize: WebGLUniformLocation | null = null
	private u_time: WebGLUniformLocation | null = null
	private u_darkMode: WebGLUniformLocation | null = null
	private u_segments: WebGLUniformLocation | null = null
	private u_segmentCount: WebGLUniformLocation | null = null

	private geometries: Geometry[] = []
	private pixelSize = 2
	private isDarkMode = false

	constructor(editor: Editor, canvas: HTMLCanvasElement) {
		super(editor, canvas)
		this.initialize()
	}

	private disposeShapeListener?: () => void

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
		this.u_pixelSize = this.gl.getUniformLocation(this.program, 'u_pixelSize')
		this.u_time = this.gl.getUniformLocation(this.program, 'u_time')
		this.u_darkMode = this.gl.getUniformLocation(this.program, 'u_darkMode')
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

		// Set up shape change listener
		this.setupShapeListener()

		// Initial dark mode check
		this.isDarkMode = this.editor.user.getIsDarkMode()

		// Initial geometry update
		this.updateGeometries()
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

		// Check for GL errors
		const error = this.gl.getError()
		if (error !== this.gl.NO_ERROR) {
			console.error('GL error after compileShader:', error)
		}

		const compileStatus = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)
		const shaderType = type === this.gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT'

		if (compileStatus !== true) {
			const log = this.gl.getShaderInfoLog(shader)
			console.error(`${shaderType} shader compile error:`, log || 'No error log available')
			console.error('Shader source:', source)

			// Try to get more info
			const shaderType2 = this.gl.getShaderParameter(shader, this.gl.SHADER_TYPE)
			const deleteStatus = this.gl.getShaderParameter(shader, this.gl.DELETE_STATUS)
			console.error('Shader type:', shaderType2, 'Delete status:', deleteStatus)

			this.gl.deleteShader(shader)
			return null
		}

		return shader
	}

	private setupShapeListener = (): void => {
		// Listen for shape changes
		this.disposeShapeListener = react('shapes', () => {
			this.updateGeometries()
		})
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

		const points: Vec[] = []
		const segments: Array<{ start: Vec; end: Vec }> = []

		const transformed = vertices.map((c) => transform.applyToPoint(c))
		const canvasPoints = transformed.map((p) => this.pageToCanvas(p))

		// Add points
		points.push(...canvasPoints)

		// Check if geometry is closed
		const isClosed = 'isClosed' in geometry ? geometry.isClosed : true

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

		return { points, segments }
	}

	private pageToCanvas = (point: Vec): Vec => {
		// Convert page coordinates to screen coordinates
		const screenPoint = this.editor.pageToScreen(point)
		const vsb = this.editor.getViewportScreenBounds()

		// Convert to canvas pixel coordinates (relative to canvas, not viewport)
		const canvasX = screenPoint.x - vsb.x
		// Flip Y axis: canvas Y=0 is at top, but we want Y=0 at bottom for consistency
		const canvasY = this.canvas.height - (screenPoint.y - vsb.y)

		return new Vec(canvasX, canvasY)
	}

	protected onUpdate = (_deltaTime: number, _currentTime: number): void => {
		// Update dark mode
		this.isDarkMode = this.editor.user.getIsDarkMode()
	}

	protected onRender = (_deltaTime: number, currentTime: number): void => {
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
		if (this.u_pixelSize) {
			this.gl.uniform1f(this.u_pixelSize, this.pixelSize)
		}
		if (this.u_time) {
			this.gl.uniform1f(this.u_time, currentTime)
		}
		if (this.u_darkMode) {
			this.gl.uniform1f(this.u_darkMode, this.isDarkMode ? 1.0 : 0.0)
		}

		// Flatten all geometries into segments array
		const allSegments: number[] = []

		const MAX_SEGMENTS = 1000

		for (const geometry of this.geometries) {
			let { segments } = geometry
			if (segments.length > 36) {
				// todo: simplify segments using RDP or something else
				segments = segments.slice(0, 36)
			}
			for (const segment of geometry.segments) {
				if (allSegments.length < MAX_SEGMENTS * 4) {
					// 96 segments * 4 components
					allSegments.push(segment.start.x, segment.start.y, segment.end.x, segment.end.y)
				}
			}
		}

		// Pad arrays with far-away coordinates so they don't appear on screen
		const farAway = 999999
		while (allSegments.length < MAX_SEGMENTS * 4)
			allSegments.push(farAway, farAway, farAway, farAway)

		// Upload geometry data
		if (this.u_segments) {
			this.gl.uniform4fv(this.u_segments, allSegments)
		}
		if (this.u_segmentCount) {
			this.gl.uniform1f(this.u_segmentCount, Math.min(allSegments.length / 4, MAX_SEGMENTS))
		}

		// Bind VAO if using WebGL2
		if (this.vao && this.gl instanceof WebGL2RenderingContext) {
			this.gl.bindVertexArray(this.vao)
		}

		// Draw the quad
		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)

		// Check for GL errors
		const err = this.gl.getError()
		if (err !== this.gl.NO_ERROR) {
			console.error('GL error during draw:', err)
		}

		// Unbind VAO
		if (this.vao && this.gl instanceof WebGL2RenderingContext) {
			this.gl.bindVertexArray(null)
		}
	}

	protected onDispose = (): void => {
		// Clean up shape listener
		if (this.disposeShapeListener) {
			this.disposeShapeListener()
			this.disposeShapeListener = undefined
		}

		// Clean up WebGL resources
		if (this.gl) {
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
	 * Set the pixel size for the smoke effect
	 */
	setPixelSize = (size: number): void => {
		this.pixelSize = Math.max(1, size)
	}

	/**
	 * Get the current pixel size
	 */
	getPixelSize = (): number => {
		return this.pixelSize
	}

	/**
	 * Manually update geometries from shapes
	 */
	refresh = (): void => {
		try {
			this.updateGeometries()
		} catch (e) {
			console.log('Error refreshing geometries', e)
		}
	}
}
