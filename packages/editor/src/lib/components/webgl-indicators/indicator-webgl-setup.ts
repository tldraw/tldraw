/**
 * WebGL2 setup for indicator rendering.
 * Renders shape indicators as stroked lines using triangulated geometry.
 */

export function setupIndicatorWebGl(canvas: HTMLCanvasElement | null) {
	if (!canvas) throw new Error('Canvas element not found')

	const context = canvas.getContext('webgl2', {
		premultipliedAlpha: false,
		antialias: true,
	})
	if (!context) throw new Error('Failed to get webgl2 context')

	// Vertex shader - transforms page coordinates to clip space
	// Each vertex has: centerPosition (vec2) + offset direction (vec2)
	// Final position = center + offset * strokeWidth
	const vertexShaderSourceCode = `#version 300 es
precision mediump float;

in vec2 centerPosition;
in vec2 offsetDirection;

uniform vec3 camera;       // x, y, z (z is zoom)
uniform vec2 canvasSize;   // width, height in screen pixels
uniform float strokeWidth; // half-width of stroke in screen pixels

void main() {
	// Convert page position to screen position
	// camera.xy is the offset in page space, applied before zoom
	vec2 screenCenter = (centerPosition + camera.xy) * camera.z;

	// Apply stroke width in screen space
	vec2 screenPosition = screenCenter + offsetDirection * strokeWidth;

	// Convert from screen coordinates to clip space
	vec2 clipSpace = (screenPosition / canvasSize) * 2.0 - 1.0;

	// Flip Y axis for WebGL coordinates
	gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}`

	const vertexShader = context.createShader(context.VERTEX_SHADER)
	if (!vertexShader) {
		throw new Error('Failed to create vertex shader')
	}
	context.shaderSource(vertexShader, vertexShaderSourceCode)
	context.compileShader(vertexShader)
	if (!context.getShaderParameter(vertexShader, context.COMPILE_STATUS)) {
		throw new Error('Failed to compile vertex shader: ' + context.getShaderInfoLog(vertexShader))
	}

	// Fragment shader - solid color output
	const fragmentShaderSourceCode = `#version 300 es
precision mediump float;

uniform vec4 strokeColor;
out vec4 outputColor;

void main() {
	outputColor = strokeColor;
}`

	const fragmentShader = context.createShader(context.FRAGMENT_SHADER)
	if (!fragmentShader) {
		throw new Error('Failed to create fragment shader')
	}
	context.shaderSource(fragmentShader, fragmentShaderSourceCode)
	context.compileShader(fragmentShader)
	if (!context.getShaderParameter(fragmentShader, context.COMPILE_STATUS)) {
		throw new Error(
			'Failed to compile fragment shader: ' + context.getShaderInfoLog(fragmentShader)
		)
	}

	const program = context.createProgram()
	if (!program) {
		throw new Error('Failed to create program')
	}
	context.attachShader(program, vertexShader)
	context.attachShader(program, fragmentShader)
	context.linkProgram(program)
	if (!context.getProgramParameter(program, context.LINK_STATUS)) {
		throw new Error('Failed to link program: ' + context.getProgramInfoLog(program))
	}
	context.useProgram(program)

	const centerPositionLocation = context.getAttribLocation(program, 'centerPosition')
	if (centerPositionLocation < 0) {
		throw new Error('Failed to get centerPosition attribute location')
	}
	context.enableVertexAttribArray(centerPositionLocation)

	const offsetDirectionLocation = context.getAttribLocation(program, 'offsetDirection')
	if (offsetDirectionLocation < 0) {
		throw new Error('Failed to get offsetDirection attribute location')
	}
	context.enableVertexAttribArray(offsetDirectionLocation)

	const cameraLocation = context.getUniformLocation(program, 'camera')
	const canvasSizeLocation = context.getUniformLocation(program, 'canvasSize')
	const strokeColorLocation = context.getUniformLocation(program, 'strokeColor')
	const strokeWidthLocation = context.getUniformLocation(program, 'strokeWidth')

	return {
		context,
		// Buffers for different indicator types
		selectedIndicators: allocateBuffer(context, 4096),
		hoveredIndicators: allocateBuffer(context, 1024),
		collaboratorIndicators: allocateBuffer(context, 2048),

		prepareTriangles(stuff: BufferStuff, len: number) {
			context.bindBuffer(context.ARRAY_BUFFER, stuff.buffer)
			context.bufferData(context.ARRAY_BUFFER, stuff.vertices, context.DYNAMIC_DRAW, 0, len)

			// Vertex format: [centerX, centerY, offsetX, offsetY] = 4 floats per vertex
			const stride = 4 * 4 // 4 floats * 4 bytes per float

			// centerPosition attribute: first 2 floats
			context.enableVertexAttribArray(centerPositionLocation)
			context.vertexAttribPointer(centerPositionLocation, 2, context.FLOAT, false, stride, 0)

			// offsetDirection attribute: next 2 floats (offset 8 bytes)
			context.enableVertexAttribArray(offsetDirectionLocation)
			context.vertexAttribPointer(offsetDirectionLocation, 2, context.FLOAT, false, stride, 8)
		},

		drawTriangles(len: number) {
			// len is number of floats, 4 floats per vertex
			context.drawArrays(context.TRIANGLES, 0, len / 4)
		},

		drawTrianglesTransparently(len: number) {
			context.enable(context.BLEND)
			context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA)
			// len is number of floats, 4 floats per vertex
			context.drawArrays(context.TRIANGLES, 0, len / 4)
			context.disable(context.BLEND)
		},

		setStrokeColor(color: Float32Array) {
			context.uniform4fv(strokeColorLocation, color)
		},

		setStrokeWidth(width: number) {
			context.uniform1f(strokeWidthLocation, width)
		},

		setCamera(x: number, y: number, z: number) {
			context.uniform3f(cameraLocation, x, y, z)
		},

		setCanvasSize(width: number, height: number) {
			context.uniform2f(canvasSizeLocation, width, height)
		},
	}
}

export type IndicatorWebGl = ReturnType<typeof setupIndicatorWebGl>

export interface BufferStuff {
	buffer: WebGLBuffer
	vertices: Float32Array
}

function allocateBuffer(context: WebGL2RenderingContext, size: number): BufferStuff {
	const buffer = context.createBuffer()
	if (!buffer) throw new Error('Failed to create buffer')
	return { buffer, vertices: new Float32Array(size) }
}

/**
 * Append vertices to a buffer, growing it if necessary.
 */
export function appendVertices(bufferStuff: BufferStuff, offset: number, data: Float32Array): void {
	let len = bufferStuff.vertices.length
	while (len < offset + data.length) {
		len *= 2
	}
	if (len !== bufferStuff.vertices.length) {
		const newVertices = new Float32Array(len)
		newVertices.set(bufferStuff.vertices)
		bufferStuff.vertices = newVertices
	}

	bufferStuff.vertices.set(data, offset)
}

/**
 * Convert RGBA color string to Float32Array for WebGL.
 * Accepts hex colors (#rrggbb, #rgb) or CSS color names.
 */
export function colorToFloat32Array(color: string): Float32Array {
	// Create a temporary canvas to parse CSS colors
	const ctx = document.createElement('canvas').getContext('2d')
	if (!ctx) {
		// Fallback to blue
		return new Float32Array([0, 0, 1, 1])
	}
	ctx.fillStyle = color
	const parsed = ctx.fillStyle

	// Handle hex colors
	if (parsed.startsWith('#')) {
		const hex = parsed.slice(1)
		if (hex.length === 6) {
			const r = parseInt(hex.slice(0, 2), 16) / 255
			const g = parseInt(hex.slice(2, 4), 16) / 255
			const b = parseInt(hex.slice(4, 6), 16) / 255
			return new Float32Array([r, g, b, 1])
		}
	}

	// Handle rgb/rgba colors
	const match = parsed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
	if (match) {
		return new Float32Array([
			parseInt(match[1]) / 255,
			parseInt(match[2]) / 255,
			parseInt(match[3]) / 255,
			match[4] ? parseFloat(match[4]) : 1,
		])
	}

	// Fallback to blue (selection color)
	return new Float32Array([0, 0.6, 1, 1])
}
