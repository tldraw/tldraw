import {
	Box,
	ComputedCache,
	Editor,
	TLShape,
	Vec,
	atom,
	bind,
	clamp,
	computed,
	react,
	tlenv,
	uniqueId,
} from '@tldraw/editor'
import { getRgba } from './getRgba'
import { BufferStuff, appendVertices, setupWebGl } from './minimap-webgl-setup'
import { pie, rectangle, roundedRectangle } from './minimap-webgl-shapes'

export class MinimapManager {
	disposables = [] as (() => void)[]

	@bind
	close() {
		return this.disposables.forEach((d) => d())
	}
	gl: ReturnType<typeof setupWebGl>
	shapeGeometryCache: ComputedCache<Float32Array | null, TLShape>
	constructor(
		public editor: Editor,
		public readonly elem: HTMLCanvasElement,
		public readonly container: HTMLElement
	) {
		this.gl = setupWebGl(elem)
		this.shapeGeometryCache = editor.store.createComputedCache('webgl-geometry', (r: TLShape) => {
			const bounds = editor.getShapeMaskedPageBounds(r.id)
			if (!bounds) return null
			const arr = new Float32Array(12)
			rectangle(arr, 0, bounds.x, bounds.y, bounds.w, bounds.h)
			return arr
		})
		this.colors = this._getColors()
		this.disposables.push(this._listenForCanvasResize(), react('minimap render', this.render))
	}

	private _getColors() {
		const style = getComputedStyle(this.editor.getContainer())

		return {
			shapeFill: getRgba(style.getPropertyValue('--tl-color-text-3').trim()),
			selectFill: getRgba(style.getPropertyValue('--tl-color-selected').trim()),
			viewportFill: getRgba(style.getPropertyValue('--tl-color-muted-1').trim()),
			background: getRgba(style.getPropertyValue('--tl-color-low').trim()),
		}
	}

	private colors: ReturnType<MinimapManager['_getColors']>
	// this should be called after dark/light mode changes have propagated to the dom
	updateColors() {
		this.colors = this._getColors()
	}

	readonly id = uniqueId()
	@computed
	getDpr() {
		return this.editor.getInstanceState().devicePixelRatio
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

	private _getCanvasBoundingRect() {
		const { x, y, width, height } = this.elem.getBoundingClientRect()
		return new Box(x, y, width, height)
	}

	private readonly canvasBoundingClientRect = atom('canvasBoundingClientRect', new Box())

	getCanvasScreenBounds() {
		return this.canvasBoundingClientRect.get()
	}

	private _listenForCanvasResize() {
		const observer = new ResizeObserver(() => {
			const rect = this._getCanvasBoundingRect()
			this.canvasBoundingClientRect.set(rect)
		})
		observer.observe(this.elem)
		observer.observe(this.container)
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

	@computed getZoom() {
		return this.getCanvasPageBounds().width / this.getCanvasScreenBounds().width
	}

	@computed getCanvasPageBoundsArray() {
		const { x, y, w, h } = this.getCanvasPageBounds()
		return new Float32Array([x, y, w, h])
	}

	getMinimapPagePoint(clientX: number, clientY: number) {
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

	minimapScreenPointToPagePoint(x: number, y: number, shiftKey = false, clampToBounds = false) {
		const { editor } = this
		const vpPageBounds = editor.getViewportPageBounds()

		let { x: px, y: py } = this.getMinimapPagePoint(x, y)

		if (clampToBounds) {
			const shapesPageBounds = this.editor.getCurrentPageBounds() ?? new Box()

			const minX = shapesPageBounds.minX - vpPageBounds.width / 2
			const maxX = shapesPageBounds.maxX + vpPageBounds.width / 2
			const minY = shapesPageBounds.minY - vpPageBounds.height / 2
			const maxY = shapesPageBounds.maxY + vpPageBounds.height / 2

			const lx = Math.max(0, minX + vpPageBounds.width - px)
			const rx = Math.max(0, -(maxX - vpPageBounds.width - px))
			const ly = Math.max(0, minY + vpPageBounds.height - py)
			const ry = Math.max(0, -(maxY - vpPageBounds.height - py))

			px += (lx - rx) / 2
			py += (ly - ry) / 2

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

	@bind
	render() {
		// make sure we update when dark mode switches
		const context = this.gl.context
		const canvasSize = this.getCanvasSize()

		this.gl.setCanvasPageBounds(this.getCanvasPageBoundsArray())

		this.elem.width = canvasSize.x
		this.elem.height = canvasSize.y
		context.viewport(0, 0, canvasSize.x, canvasSize.y)

		// this affects which color transparent shapes are blended with
		// during rendering. If we were to invert this any shapes narrower
		// than 1 px in screen space would have much lower contrast. e.g.
		// draw shapes on a large canvas.
		context.clearColor(
			this.colors.background[0],
			this.colors.background[1],
			this.colors.background[2],
			1
		)

		context.clear(context.COLOR_BUFFER_BIT)

		const selectedShapes = new Set(this.editor.getSelectedShapeIds())

		const colors = this.colors
		let selectedShapeOffset = 0
		let unselectedShapeOffset = 0

		const ids = this.editor.getCurrentPageShapeIdsSorted()

		for (let i = 0, len = ids.length; i < len; i++) {
			const shapeId = ids[i]
			const geometry = this.shapeGeometryCache.get(shapeId)
			if (!geometry) continue

			const len = geometry.length

			const shape = this.editor.getShape(shapeId)
			if (shape) {
				const shapeUtil = this.editor.getShapeUtil(shape.type)
				if (shapeUtil.hideInMinimap?.(shape)) continue
			}

			if (selectedShapes.has(shapeId)) {
				appendVertices(this.gl.selectedShapes, selectedShapeOffset, geometry)
				selectedShapeOffset += len
			} else {
				appendVertices(this.gl.unselectedShapes, unselectedShapeOffset, geometry)
				unselectedShapeOffset += len
			}
		}

		this.drawShapes(this.gl.unselectedShapes, unselectedShapeOffset, colors.shapeFill)
		this.drawShapes(this.gl.selectedShapes, selectedShapeOffset, colors.selectFill)

		this.drawViewport()
		this.drawCollaborators()
	}

	private drawShapes(stuff: BufferStuff, len: number, color: Float32Array) {
		this.gl.prepareTriangles(stuff, len)
		this.gl.setFillColor(color)
		this.gl.drawTriangles(len)
	}

	private drawViewport() {
		const viewport = this.editor.getViewportPageBounds()
		const len = roundedRectangle(this.gl.viewport.vertices, viewport, 4 * this.getZoom())

		this.gl.prepareTriangles(this.gl.viewport, len)
		this.gl.setFillColor(this.colors.viewportFill)
		this.gl.drawTrianglesTransparently(len)
		if (tlenv.isSafari) {
			this.gl.drawTrianglesTransparently(len)
			this.gl.drawTrianglesTransparently(len)
			this.gl.drawTrianglesTransparently(len)
		}
	}

	drawCollaborators() {
		const collaborators = this.editor.getCollaboratorsOnCurrentPage()
		if (!collaborators.length) return

		// just draw a little circle for each collaborator
		const numSegmentsPerCircle = 20
		const dataSizePerCircle = numSegmentsPerCircle * 6
		const totalSize = dataSizePerCircle * collaborators.length

		// expand vertex array if needed
		if (this.gl.collaborators.vertices.length < totalSize) {
			this.gl.collaborators.vertices = new Float32Array(totalSize)
		}

		const vertices = this.gl.collaborators.vertices
		let offset = 0
		const zoom = this.getZoom()
		for (const { cursor } of collaborators) {
			if (!cursor) continue
			pie(vertices, {
				center: Vec.From(cursor),
				radius: 3 * zoom,
				offset,
				numArcSegments: numSegmentsPerCircle,
			})
			offset += dataSizePerCircle
		}

		this.gl.prepareTriangles(this.gl.collaborators, totalSize)

		offset = 0
		for (const { color } of collaborators) {
			this.gl.setFillColor(getRgba(color))
			this.gl.context.drawArrays(this.gl.context.TRIANGLES, offset / 2, dataSizePerCircle / 2)
			offset += dataSizePerCircle
		}
	}
}
