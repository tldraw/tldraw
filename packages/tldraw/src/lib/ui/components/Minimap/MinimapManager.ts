import {
	Box,
	Editor,
	Geometry2d,
	Mat,
	Vec,
	atom,
	clamp,
	computed,
	react,
	uniqueId,
} from '@tldraw/editor'

type WebGLGeometry = ReturnType<Geometry2d['getWebGLGeometry']>

class MeasureClock {
	num = 0
	measures: Set<Measure> = new Set()
	inc() {
		this.num++
		if (this.num % 60 === 0) {
			for (const measure of this.measures) {
				console.log(measure.name, measure.total / this.num)
			}
		}
	}
}
class Measure {
	constructor(
		public readonly name: string,
		clock: MeasureClock
	) {
		clock.measures.add(this)
	}
	total = 0
	_start = 0
	start() {
		this._start = performance.now()
	}
	end() {
		this.total += performance.now() - this._start
		return this
	}
}
export class MinimapManager {
	disposables = [] as (() => void)[]
	close = () => this.disposables.forEach((d) => d())
	gl: ReturnType<typeof setupWebGl>
	constructor(
		public editor: Editor,
		public readonly elem: HTMLCanvasElement
	) {
		this.gl = setupWebGl(elem)
		this.disposables.push(this._listenForCanvasResize(), react('minimap render', this.render))
	}

	@computed
	getColors() {
		// deref to force this to update when the user changes the theme
		const _isDarkMode = this.editor.user.getIsDarkMode()
		const style = getComputedStyle(this.editor.getContainer())

		return {
			shapeFill: getRGBA(style.getPropertyValue('--color-text-3').trim()),
			selectFill: getRGBA(style.getPropertyValue('--color-selected').trim()),
			viewportFill: getRGBA(style.getPropertyValue('--color-muted-1').trim()),
		}
	}

	readonly id = uniqueId()
	@computed
	getDpr() {
		return this.editor.getInstanceState().devicePixelRatio
	}

	@computed
	getCollaboratorsQuery() {
		return this.editor.store.query.records('instance_presence', () => ({
			userId: { neq: this.editor.user.getId() },
		}))
	}

	@computed
	getContentPageBounds() {
		const viewportPageBounds = this.editor.getViewportPageBounds()
		const commonShapeBounds = this.editor.getCurrentPageBounds()
		return commonShapeBounds
			? Box.Expand(commonShapeBounds, viewportPageBounds)
			: viewportPageBounds
	}

	@computed
	getContentScreenBounds() {
		const contentPageBounds = this.getContentPageBounds()
		const topLeft = this.editor.pageToScreen(contentPageBounds.point)
		const bottomRight = this.editor.pageToScreen(
			new Vec(contentPageBounds.maxX, contentPageBounds.maxY)
		)
		return new Box(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
	}

	private getCanvasScreenBounds() {
		const { x, y, width, height } = this.elem.getBoundingClientRect()
		return new Box(x, y, width, height)
	}

	private readonly canvasBoundingClientRect = atom('canvasBoundingClientRect', new Box())

	private _listenForCanvasResize() {
		const observer = new ResizeObserver(() => {
			const rect = this.getCanvasScreenBounds()
			this.canvasBoundingClientRect.set(rect)
		})
		observer.observe(this.elem)
		return () => observer.disconnect()
	}

	@computed
	getCanvasSize() {
		const rect = this.canvasBoundingClientRect.get()
		const dpr = this.getDpr()
		return new Vec(rect.width * dpr, rect.height * dpr)
	}

	@computed
	getCanvasClientPosition() {
		return this.canvasBoundingClientRect.get().point
	}

	originPagePoint = new Vec()
	originPageCenter = new Vec()

	isInViewport = false

	debug = false

	/** Get the canvas's true bounds converted to page bounds. */
	@computed getCanvasPageBounds() {
		const canvasScreenBounds = this.getCanvasScreenBounds()
		const contentPageBounds = this.getContentPageBounds()

		let targetWidth = contentPageBounds.width
		let targetHeight = canvasScreenBounds.height * (targetWidth / canvasScreenBounds.width)
		if (targetHeight > contentPageBounds.height) {
			targetHeight = contentPageBounds.height
			targetWidth = canvasScreenBounds.width * (targetHeight / canvasScreenBounds.height)
		}

		const box = new Box(0, 0, targetWidth, targetHeight)
		box.center = contentPageBounds.center
		return box
	}

	getPagePoint = (clientX: number, clientY: number) => {
		const canvasPageBounds = this.getCanvasPageBounds()
		const canvasScreenBounds = this.getCanvasScreenBounds()

		// first offset the canvas position
		let x = clientX - canvasScreenBounds.x
		let y = clientY - canvasScreenBounds.y

		// then multiply by the ratio between the page and screen bounds
		x *= canvasPageBounds.width / canvasScreenBounds.width
		y *= canvasPageBounds.height / canvasScreenBounds.height

		// then add the canvas page bounds' offset
		x += canvasPageBounds.minX
		y += canvasPageBounds.minY

		return new Vec(x, y, 1)
	}

	minimapScreenPointToPagePoint = (
		x: number,
		y: number,
		shiftKey = false,
		clampToBounds = false
	) => {
		const { editor } = this
		const viewportPageBounds = editor.getViewportPageBounds()

		let { x: px, y: py } = this.getPagePoint(x, y)

		if (clampToBounds) {
			const shapesPageBounds = this.editor.getCurrentPageBounds()
			const vpPageBounds = viewportPageBounds

			const minX = (shapesPageBounds?.minX ?? 0) - vpPageBounds.width / 2
			const maxX = (shapesPageBounds?.maxX ?? 0) + vpPageBounds.width / 2
			const minY = (shapesPageBounds?.minY ?? 0) - vpPageBounds.height / 2
			const maxY = (shapesPageBounds?.maxY ?? 0) + vpPageBounds.height / 2

			const lx = Math.max(0, minX + vpPageBounds.width - px)
			const rx = Math.max(0, -(maxX - vpPageBounds.width - px))
			const ly = Math.max(0, minY + vpPageBounds.height - py)
			const ry = Math.max(0, -(maxY - vpPageBounds.height - py))

			const ql = Math.max(0, lx - rx)
			const qr = Math.max(0, rx - lx)
			const qt = Math.max(0, ly - ry)
			const qb = Math.max(0, ry - ly)

			if (ql && ql > qr) {
				px += ql / 2
			} else if (qr) {
				px -= qr / 2
			}

			if (qt && qt > qb) {
				py += qt / 2
			} else if (qb) {
				py -= qb / 2
			}

			px = clamp(px, minX, maxX)
			py = clamp(py, minY, maxY)
		}

		if (shiftKey) {
			const { originPagePoint } = this
			const dx = Math.abs(px - originPagePoint.x)
			const dy = Math.abs(py - originPagePoint.y)
			if (dx > dy) {
				py = originPagePoint.y
			} else {
				px = originPagePoint.x
			}
		}

		return new Vec(px, py)
	}

	lastRenderEpoch = 0
	glData: Record<string, WebGlStuff> = {}

	cullGlData() {
		const context = this.gl?.context
		if (!context) return
		for (const [k, v] of Object.entries(this.glData)) {
			if (v.lastCheckedEpoch < this.lastRenderEpoch) {
				const data = this.glData[k]
				delete this.glData[k]
				context.deleteBuffer(data.shapeVertexPositionBuffer)
			}
		}
	}

	private createStuff(
		context: WebGL2RenderingContext,
		geometry: WebGLGeometry,
		pageTransform: Mat
	): WebGlStuff {
		const shapeVertexPositionBuffer = context.createBuffer()
		if (!shapeVertexPositionBuffer) throw new Error('Failed to create buffer')
		context.bindBuffer(context.ARRAY_BUFFER, shapeVertexPositionBuffer)
		context.bufferData(context.ARRAY_BUFFER, geometry.values, context.STATIC_DRAW)
		return {
			shapeVertexPositionBuffer,
			geometry,
			pageTransform,
			pageTransformArray: new Float32Array([
				pageTransform.a,
				pageTransform.b,
				0,
				pageTransform.c,
				pageTransform.d,
				0,
				pageTransform.e,
				pageTransform.f,
				1,
			]),
			lastCheckedEpoch: this.lastRenderEpoch,
		}
	}

	private updateStuff(
		stuff: WebGlStuff,
		geometry: WebGLGeometry,
		pageTransform: Mat,
		epoch: number
	) {
		try {
			this.stats.shapeUpdate.start()
			stuff.lastCheckedEpoch = epoch
			const geometryChanged = !stuff.geometry.equals(geometry)
			const pageTransformChanged = !stuff.pageTransform.equals(pageTransform)
			if (!geometryChanged && !pageTransformChanged) return false

			if (geometryChanged) {
				const context = this.gl.context
				context.bindBuffer(context.ARRAY_BUFFER, stuff.shapeVertexPositionBuffer)
				context.bufferData(context.ARRAY_BUFFER, geometry.values, context.STATIC_DRAW)
				stuff.geometry = geometry
			}

			if (pageTransformChanged) {
				stuff.pageTransform = pageTransform
				stuff.pageTransformArray.set([
					pageTransform.a,
					pageTransform.b,
					0,
					pageTransform.c,
					pageTransform.d,
					0,
					pageTransform.e,
					pageTransform.f,
					1,
				])
			}

			return true
		} finally {
			this.stats.shapeUpdate.end()
		}
	}

	private renderStuff(stuff: WebGlStuff) {
		this.stats.shapeRender.start()
		this.stats.bindBuffer.start()
		this.gl.context.bindBuffer(this.gl.context.ARRAY_BUFFER, stuff.shapeVertexPositionBuffer)
		this.stats.bindBuffer.end()
		this.gl.context.enableVertexAttribArray(this.gl.shapeVertexPositionAttributeLocation)
		this.gl.context.vertexAttribPointer(
			this.gl.shapeVertexPositionAttributeLocation,
			2,
			this.gl.context.FLOAT,
			false,
			0,
			0
		)

		this.gl.context.uniformMatrix3fv(
			this.gl.shapePageTransformLocation,
			false,
			stuff.pageTransformArray
		)

		this.gl.context.drawArrays(this.gl.context.TRIANGLES, 0, stuff.geometry.values.length / 2)
		this.stats.shapeRender.end()
	}

	clock = new MeasureClock()

	stats = {
		cullTime: new Measure('cull', this.clock),
		totalRender: new Measure('total render', this.clock),
		shapeRender: new Measure('shape render', this.clock),
		bindBuffer: new Measure('bind buffer', this.clock),
		shapeUpdate: new Measure('shape update', this.clock),
	}

	render = () => {
		this.stats.totalRender.start()
		this.lastRenderEpoch++
		const context = this.gl.context
		const canvasSize = this.getCanvasSize()
		const canvasPageBounds = this.getCanvasPageBounds()

		this.gl.context.uniform2fv(this.gl.resolutionLocation, [
			1 / canvasPageBounds.w,
			1 / canvasPageBounds.h,
		])

		this.elem.width = canvasSize.x
		this.elem.height = canvasSize.y
		context.viewport(0, 0, canvasSize.x, canvasSize.y)

		context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT)

		const selectedShapes = new Set(this.editor.getSelectedShapeIds())

		const colors = this.getColors()

		for (const shape of this.editor.getCurrentPageShapes()) {
			const pageTransform = this.editor.getShapePageTransform(shape)
			const geometry = this.editor.getShapeGeometry(shape).getWebGLGeometry()

			let stuff = this.glData[shape.id]
			if (!stuff) {
				stuff = this.glData[shape.id] = this.createStuff(context, geometry, pageTransform)
			} else {
				this.updateStuff(stuff, geometry, pageTransform, this.lastRenderEpoch)
			}

			if (selectedShapes.has(shape.id)) {
				this.gl.context.uniform4fv(this.gl.shapeFillLocation, colors.selectFill)
			} else {
				this.gl.context.uniform4fv(this.gl.shapeFillLocation, colors.shapeFill)
			}
			this.renderStuff(stuff)
		}
		this.stats.cullTime.start()
		this.cullGlData()
		this.stats.cullTime.end()
		this.stats.totalRender.end()
		this.clock.inc()
	}
}

type WebGlStuff = {
	shapeVertexPositionBuffer: WebGLBuffer
	geometry: WebGLGeometry
	pageTransform: Mat
	pageTransformArray: Float32Array
	lastCheckedEpoch: number
}

function setupWebGl(canvas: HTMLCanvasElement | null) {
	if (!canvas) throw new Error('Canvas element not found')

	const context = canvas.getContext('webgl2')
	if (!context) throw new Error('Failed to get webgl2 context')

	const vertexShaderSourceCode = `#version 300 es
  precision mediump float;
  
  in vec2 shapeVertexPosition;

  uniform mat3 shapePageTransform; 
	uniform vec2 resolution;

	// taken (with thanks) from
	// https://webglfundamentals.org/webgl/lessons/webgl-2d-matrices.html
  void main() {
		// Multiply the position by the matrix.
		vec2 position = (shapePageTransform * vec3(shapeVertexPosition, 1)).xy;
	
		// convert the position from pixels to 0.0 to 1.0
		vec2 zeroToOne = position * resolution;
	
		// convert from 0->1 to 0->2
		vec2 zeroToTwo = zeroToOne * 2.0;
	
		// convert from 0->2 to -1->+1 (clipspace)
		vec2 clipSpace = zeroToTwo - 1.0;
	
		gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  }`

	const vertexShader = context.createShader(context.VERTEX_SHADER)
	if (!vertexShader) {
		throw new Error('Failed to create vertex shader')
	}
	context.shaderSource(vertexShader, vertexShaderSourceCode)
	context.compileShader(vertexShader)
	if (!context.getShaderParameter(vertexShader, context.COMPILE_STATUS)) {
		throw new Error('Failed to compile vertex shader')
	}
	// Dark = hsl(210, 11%, 19%)
	// Light = hsl(204, 14%, 93%)

	const fragmentShaderSourceCode = `#version 300 es
  precision mediump float;
  
	uniform vec4 shapeFill;
  out vec4 outputColor;

  void main() {
	outputColor = shapeFill;
  }`

	const fragmentShader = context.createShader(context.FRAGMENT_SHADER)
	if (!fragmentShader) {
		throw new Error('Failed to create fragment shader')
	}
	context.shaderSource(fragmentShader, fragmentShaderSourceCode)
	context.compileShader(fragmentShader)
	if (!context.getShaderParameter(fragmentShader, context.COMPILE_STATUS)) {
		throw new Error('Failed to compile fragment shader')
	}

	const program = context.createProgram()
	if (!program) {
		throw new Error('Failed to create program')
	}
	context.attachShader(program, vertexShader)
	context.attachShader(program, fragmentShader)
	context.linkProgram(program)
	if (!context.getProgramParameter(program, context.LINK_STATUS)) {
		throw new Error('Failed to link program')
	}
	context.useProgram(program)

	const shapeVertexPositionAttributeLocation = context.getAttribLocation(
		program,
		'shapeVertexPosition'
	)
	if (shapeVertexPositionAttributeLocation < 0) {
		throw new Error('Failed to get shapeVertexPosition attribute location')
	}
	context.enableVertexAttribArray(shapeVertexPositionAttributeLocation)

	const shapePageTransformLocation = context.getUniformLocation(program, 'shapePageTransform')
	const resolutionLocation = context.getUniformLocation(program, 'resolution')
	const shapeFillLocation = context.getUniformLocation(program, 'shapeFill')
	// if (!shapePageTransformLocation || !resolutionLocation) {
	// 	throw new Error('Failed to get shapePageTransform or resolution uniform location')
	// }
	return {
		context,
		program,
		shapeVertexPositionAttributeLocation,
		shapePageTransformLocation,
		resolutionLocation,
		shapeFillLocation,
	}
}

function getRGBA(colorString: string) {
	const canvas = document.createElement('canvas')
	const context = canvas.getContext('2d')
	context!.fillStyle = colorString
	context!.fillRect(0, 0, 1, 1)
	const [r, g, b, a] = context!.getImageData(0, 0, 1, 1).data
	return new Float32Array([r / 255, g / 255, b / 255, a / 255])
}
