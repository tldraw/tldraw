import {
	Box,
	ComputedCache,
	Editor,
	Geometry2d,
	Mat,
	TLShape,
	Vec,
	atom,
	clamp,
	computed,
	react,
	uniqueId,
} from '@tldraw/editor'
import { getRgba } from './getRgba'
import { pie, roundedRectangle, roundedRectangleDataSize } from './minimapShapes'

type WebGLGeometry = ReturnType<Geometry2d['getWebGLGeometry']>

export class MinimapManager {
	disposables = [] as (() => void)[]
	close = () => this.disposables.forEach((d) => d())
	gl: ReturnType<typeof setupWebGl>
	stuff: ComputedCache<WebGlStuff, TLShape>
	constructor(
		public editor: Editor,
		public readonly elem: HTMLCanvasElement
	) {
		this.gl = setupWebGl(elem)
		this.stuff = editor.store.createComputedCache('stuff', (r: TLShape) => {
			const pageTransform = editor.getShapePageTransform(r.id)
			const geometry = editor.getShapeGeometry(r.id).getWebGLGeometry()
			return this.createStuff(this.gl.context, geometry, pageTransform)
		})
		this.disposables.push(this._listenForCanvasResize(), react('minimap render', this.render))
	}

	@computed
	getColors() {
		// deref to force this to update when the user changes the theme
		const _isDarkMode = this.editor.user.getIsDarkMode()
		const style = getComputedStyle(this.editor.getContainer())

		return {
			shapeFill: getRgba(style.getPropertyValue('--color-text-3').trim()),
			selectFill: getRgba(style.getPropertyValue('--color-selected').trim()),
			viewportFill: getRgba(style.getPropertyValue('--color-muted-1').trim()),
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

		const aspectRatio = canvasScreenBounds.width / canvasScreenBounds.height

		let targetWidth = contentPageBounds.width
		let targetHeight = targetWidth / aspectRatio
		if (targetHeight < contentPageBounds.height) {
			targetHeight = contentPageBounds.height
			targetWidth = targetHeight * aspectRatio
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

	private createStuff(
		context: WebGL2RenderingContext,
		geometry: WebGLGeometry,
		pageTransform: Mat
	): WebGlStuff {
		const shapeVertexPositionBuffer = context.createBuffer()
		if (!shapeVertexPositionBuffer) throw new Error('Failed to create buffer')
		context.bindBuffer(context.ARRAY_BUFFER, shapeVertexPositionBuffer)
		context.bufferData(context.ARRAY_BUFFER, geometry.values, context.STATIC_DRAW)
		const transformedGeometry = new Float32Array(geometry.values)
		for (let i = 0; i < transformedGeometry.length; i += 2) {
			;[transformedGeometry[i], transformedGeometry[i + 1]] = Mat.applyToXY(
				pageTransform,
				geometry.values[i],
				geometry.values[i + 1]
			)
		}
		return {
			shapeVertexPositionBuffer,
			geometry,
			pageTransform,
			transformedGeometry,
		}
	}

	updateViewportData() {
		const viewport = this.editor.getViewportPageBounds()
		const zoom = this.getCanvasPageBounds().width / this.getCanvasScreenBounds().width
		return roundedRectangle(this.gl.viewportVertices, viewport, 4 * zoom)
	}

	render = () => {
		stats.start('minimap render')
		// make sure we update when dark mode switches
		const context = this.gl.context
		const canvasSize = this.getCanvasSize()
		const canvasPageBounds = this.getCanvasPageBounds()

		this.gl.context.uniform4fv(this.gl.canvasPageBoundsLocation, [
			canvasPageBounds.x,
			canvasPageBounds.y,
			canvasPageBounds.w,
			canvasPageBounds.h,
		])

		this.elem.width = canvasSize.x
		this.elem.height = canvasSize.y
		context.viewport(0, 0, canvasSize.x, canvasSize.y)

		context.clear(context.COLOR_BUFFER_BIT)

		const selectedShapes = new Set(this.editor.getSelectedShapeIds())

		const colors = this.getColors()
		let selectedShapeOffset = 0
		let unselectedShapeOffset = 0

		const ids = this.editor.getCurrentPageShapeIdsSorted()

		for (const shapeId of ids) {
			const stuff = this.stuff.get(shapeId)
			if (!stuff) continue

			const len = stuff.transformedGeometry.length

			if (selectedShapes.has(shapeId)) {
				while (this.gl.selectedShapesVertices.length < selectedShapeOffset + len) {
					const prev = this.gl.selectedShapesVertices
					this.gl.selectedShapesVertices = new Float32Array(
						this.gl.selectedShapesVertices.length * 2
					)

					this.gl.selectedShapesVertices.set(prev)
				}
				this.gl.selectedShapesVertices.set(stuff.transformedGeometry, selectedShapeOffset)
				selectedShapeOffset += len
			} else {
				while (this.gl.unSelectedShapesVertices.length < unselectedShapeOffset + len) {
					const prev = this.gl.unSelectedShapesVertices
					this.gl.unSelectedShapesVertices = new Float32Array(
						this.gl.unSelectedShapesVertices.length * 2
					)

					this.gl.unSelectedShapesVertices.set(prev)
				}
				this.gl.unSelectedShapesVertices.set(stuff.transformedGeometry, unselectedShapeOffset)
				unselectedShapeOffset += len
			}
		}
		this.drawViewport()
		this.drawShapes(
			this.gl.unselectedShapesBuffer,
			this.gl.unSelectedShapesVertices,
			unselectedShapeOffset,
			colors.shapeFill
		)

		this.drawShapes(
			this.gl.selectedShapesBuffer,
			this.gl.selectedShapesVertices,
			selectedShapeOffset,
			colors.selectFill
		)
		this.drawCollaborators()
		stats.end('minimap render')
		stats.tick()
	}

	drawShapes(buffer: WebGLBuffer, vertices: Float32Array, len: number, color: Float32Array) {
		this.gl.context.uniform4fv(this.gl.shapeFillLocation, color)
		this.gl.context.bindBuffer(this.gl.context.ARRAY_BUFFER, buffer)
		this.gl.context.bufferData(
			this.gl.context.ARRAY_BUFFER,
			vertices,
			this.gl.context.STATIC_DRAW,
			0,
			len
		)
		this.gl.context.enableVertexAttribArray(this.gl.shapeVertexPositionAttributeLocation)
		this.gl.context.vertexAttribPointer(
			this.gl.shapeVertexPositionAttributeLocation,
			2,
			this.gl.context.FLOAT,
			false,
			0,
			0
		)

		this.gl.context.drawArrays(this.gl.context.TRIANGLES, 0, len / 2)
	}

	drawViewport() {
		const color = this.getColors().viewportFill
		const len = this.updateViewportData()

		this.gl.context.bindBuffer(this.gl.context.ARRAY_BUFFER, this.gl.viewportBuffer)
		this.gl.context.bufferData(
			this.gl.context.ARRAY_BUFFER,
			this.gl.viewportVertices,
			this.gl.context.STATIC_DRAW,
			0,
			len
		)
		this.gl.context.enableVertexAttribArray(this.gl.shapeVertexPositionAttributeLocation)
		this.gl.context.vertexAttribPointer(
			this.gl.shapeVertexPositionAttributeLocation,
			2,
			this.gl.context.FLOAT,
			false,
			0,
			0
		)

		this.gl.context.uniform4fv(this.gl.shapeFillLocation, color)
		this.gl.context.drawArrays(this.gl.context.TRIANGLES, 0, len / 2)
	}

	drawCollaborators() {
		const currentPageId = this.editor.getCurrentPageId()
		const zoom = this.getCanvasPageBounds().width / this.getCanvasScreenBounds().width
		const allPresenceRecords = this.getCollaboratorsQuery().get()
		if (!allPresenceRecords.length) return
		const userIds = [...new Set(allPresenceRecords.map((c) => c.userId))].sort()
		const collaborators = userIds
			.map((id) => {
				const latestPresence = allPresenceRecords
					.filter((c) => c.userId === id)
					.sort((a, b) => b.lastActivityTimestamp - a.lastActivityTimestamp)[0]
				return latestPresence
			})
			.filter((c) => c.currentPageId === currentPageId)

		// just draw a little circle for each collaborator
		const numSegmentsPerCircle = 20
		const dataSizePerCircle = numSegmentsPerCircle * 6
		const totalSize = dataSizePerCircle * collaborators.length
		if (this.gl.collaboratorVertices.length < totalSize) {
			this.gl.collaboratorVertices = new Float32Array(totalSize)
		}
		let offset = 0
		for (const { cursor } of collaborators) {
			pie(this.gl.collaboratorVertices, { center: Vec.From(cursor), radius: 2 * zoom, offset })
			offset += dataSizePerCircle
		}

		this.gl.context.bindBuffer(this.gl.context.ARRAY_BUFFER, this.gl.collaboratorBuffer)
		this.gl.context.bufferData(
			this.gl.context.ARRAY_BUFFER,
			this.gl.collaboratorVertices,
			this.gl.context.STATIC_DRAW,
			0,
			totalSize
		)
		this.gl.context.enableVertexAttribArray(this.gl.shapeVertexPositionAttributeLocation)
		this.gl.context.vertexAttribPointer(
			this.gl.shapeVertexPositionAttributeLocation,
			2,
			this.gl.context.FLOAT,
			false,
			0,
			0
		)

		offset = 0
		for (const { color } of collaborators) {
			const rgba = getRgba(color)
			this.gl.context.uniform4fv(this.gl.shapeFillLocation, rgba)
			this.gl.context.drawArrays(this.gl.context.TRIANGLES, offset / 2, dataSizePerCircle / 2)
			offset += dataSizePerCircle
		}
	}
}

class Stats {
	periods = 0
	totals = {} as Record<string, number>
	starts = {} as Record<string, number>
	start(name: string) {
		this.starts[name] = performance.now()
	}
	end(name: string) {
		if (!this.starts[name]) throw new Error(`No start for ${name}`)
		this.totals[name] = (this.totals[name] ?? 0) + (performance.now() - this.starts[name])
		delete this.starts[name]
	}
	tick() {
		this.periods++
		if (this.periods === 60) {
			console.log('Stats:')
			for (const [name, total] of Object.entries(this.totals).sort((a, b) =>
				a[0].localeCompare(b[0])
			)) {
				console.log(' ', name, total / this.periods)
			}
			this.totals = {}
			this.starts = {}
			this.periods = 0
		}
	}
}
const stats = new Stats()

type WebGlStuff = {
	shapeVertexPositionBuffer: WebGLBuffer
	geometry: WebGLGeometry
	pageTransform: Mat
	transformedGeometry: Float32Array
}

function setupWebGl(canvas: HTMLCanvasElement | null) {
	if (!canvas) throw new Error('Canvas element not found')

	const context = canvas.getContext('webgl2', {
		premultipliedAlpha: false,
	})
	if (!context) throw new Error('Failed to get webgl2 context')

	const vertexShaderSourceCode = `#version 300 es
  precision mediump float;
  
  in vec2 shapeVertexPosition;

	uniform vec4 canvasPageBounds;

	// taken (with thanks) from
	// https://webglfundamentals.org/webgl/lessons/webgl-2d-matrices.html
  void main() {
		// convert the position from pixels to 0.0 to 1.0
		vec2 zeroToOne = (shapeVertexPosition - canvasPageBounds.xy) / canvasPageBounds.zw;
	
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
	const canvasPageBoundsLocation = context.getUniformLocation(program, 'canvasPageBounds')
	const shapeFillLocation = context.getUniformLocation(program, 'shapeFill')
	// if (!shapePageTransformLocation || !canvasPageBoundsLocation) {
	// 	throw new Error('Failed to get shapePageTransform or resolution uniform location')
	// }

	const selectedShapesBuffer = context.createBuffer()
	if (!selectedShapesBuffer) throw new Error('Failed to create buffer')
	const selectedShapesVertices = new Float32Array(1024)
	const unselectedShapesBuffer = context.createBuffer()
	if (!unselectedShapesBuffer) throw new Error('Failed to create buffer')
	const unSelectedShapesVertices = new Float32Array(4096)
	const viewportBuffer = context.createBuffer()
	const viewportVertices = new Float32Array(roundedRectangleDataSize)

	const collaboratorBuffer = context.createBuffer()
	const collaboratorVertices = new Float32Array(1024)

	return {
		context,
		program,
		selectedShapesBuffer,
		selectedShapesVertices,
		unselectedShapesBuffer,
		unSelectedShapesVertices,
		viewportBuffer,
		viewportVertices,
		collaboratorBuffer,
		collaboratorVertices,
		shapeVertexPositionAttributeLocation,
		shapePageTransformLocation,
		canvasPageBoundsLocation,
		shapeFillLocation,
	}
}
