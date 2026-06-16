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
	uniqueId,
} from '@tldraw/editor'

export class MinimapManager {
	disposables = [] as (() => void)[]

	@bind
	close() {
		return this.disposables.forEach((d) => d())
	}

	private readonly ctx: CanvasRenderingContext2D
	private readonly shapeRectCache: ComputedCache<Box | null, TLShape>

	constructor(
		public editor: Editor,
		public readonly elem: HTMLCanvasElement,
		public readonly container: HTMLElement
	) {
		const ctx = elem.getContext('2d')
		if (!ctx) throw new Error('Minimap: could not get 2D canvas context')
		this.ctx = ctx
		// Per-shape minimap rect cache. Each entry re-derives only when the
		// underlying shape record (or its masked page bounds) changes, so a
		// single shape edit invalidates one entry instead of the whole render.
		// `null` means "do not draw this shape" (hideInMinimap or no bounds).
		this.shapeRectCache = editor.store.createComputedCache<Box | null, TLShape>(
			'minimap-shape-rect',
			(shape) => {
				const util = editor.getShapeUtil(shape.type)
				if (util.hideInMinimap?.(shape)) return null
				return editor.getShapeMaskedPageBounds(shape.id) ?? null
			}
		)
		this.colors = this._getColors()
		this.disposables.push(this._listenForCanvasResize(), react('minimap render', this.render))
	}

	private _getColors() {
		const style = this.editor.getContainerWindow().getComputedStyle(this.editor.getContainer())
		return {
			shapeFill: style.getPropertyValue('--tl-color-text-3').trim(),
			selectFill: style.getPropertyValue('--tl-color-selected').trim(),
			viewportFill: style.getPropertyValue('--tl-color-muted-1').trim(),
			background: style.getPropertyValue('--tl-color-low').trim(),
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

	/** Minimap screen-pixels per page-unit — same convention as `editor.getCamera().z`. */
	@computed getZoom() {
		return this.getCanvasScreenBounds().width / this.getCanvasPageBounds().width
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
		const { ctx, editor, elem } = this
		const canvasSize = this.getCanvasSize()
		const canvasPageBounds = this.getCanvasPageBounds()
		const dpr = this.getDpr()
		const zoom = this.getZoom()

		// Size the backing canvas to device pixels. Assigning width/height
		// also resets the context transform and clears the canvas.
		if (elem.width !== canvasSize.x || elem.height !== canvasSize.y) {
			elem.width = canvasSize.x
			elem.height = canvasSize.y
		}

		ctx.resetTransform()
		// Background fill (opaque — matches the WebGL clear color).
		ctx.fillStyle = this.colors.background
		ctx.fillRect(0, 0, canvasSize.x, canvasSize.y)

		// Transform: 1 page unit = `zoom * dpr` device pixels, with the minimap's
		// page bounds pinned to the top-left of the canvas.
		ctx.scale(dpr * zoom, dpr * zoom)
		ctx.translate(-canvasPageBounds.minX, -canvasPageBounds.minY)

		// Shapes — iterate sorted IDs and pull per-shape rects from the
		// computed cache so only *changed* shapes re-derive between renders.
		const selectedIds = new Set<string>(editor.getSelectedShapeIds())
		const ids = editor.getCurrentPageShapeIdsSorted()

		const shapesPath = new Path2D()
		const selectedPath = new Path2D()

		for (let i = 0, len = ids.length; i < len; i++) {
			const shapeId = ids[i]
			const bounds = this.shapeRectCache.get(shapeId)
			if (!bounds) continue
			const target = selectedIds.has(shapeId) ? selectedPath : shapesPath
			target.rect(bounds.x, bounds.y, bounds.w, bounds.h)
		}

		ctx.fillStyle = this.colors.shapeFill
		ctx.fill(shapesPath)

		ctx.fillStyle = this.colors.selectFill
		ctx.fill(selectedPath)

		// Viewport rounded rect
		const viewport = editor.getViewportPageBounds()
		const { minX: vx, minY: vy, width: vw, height: vh } = viewport
		const r = Math.min(vw / 4, vh / 4, 4 / zoom)
		ctx.beginPath()
		roundedRect(ctx, vx, vy, vw, vh, r)
		ctx.closePath()
		ctx.fillStyle = this.colors.viewportFill
		ctx.fill()

		// Let active overlay utils contribute to the minimap. The ctx is already
		// in page space, matching the main-canvas overlay render contract.
		const entries = editor.overlays.getActiveOverlayEntries()
		for (const { util, overlays } of entries) {
			ctx.save()
			util.renderMinimap(ctx, overlays, zoom)
			ctx.restore()
		}
	}
}

function roundedRect(
	ctx: CanvasRenderingContext2D | Path2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
) {
	if (r < 1) {
		ctx.rect(x, y, w, h)
		return
	}
	ctx.moveTo(x + r, y)
	ctx.lineTo(x + w - r, y)
	ctx.quadraticCurveTo(x + w, y, x + w, y + r)
	ctx.lineTo(x + w, y + h - r)
	ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
	ctx.lineTo(x + r, y + h)
	ctx.quadraticCurveTo(x, y + h, x, y + h - r)
	ctx.lineTo(x, y + r)
	ctx.quadraticCurveTo(x, y, x + r, y)
}
