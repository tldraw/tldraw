/**
 * WebGL-based indicator rendering manager.
 * Renders shape indicators (selection, hover, hints) using WebGL for improved performance.
 */

import { computed, react, unsafe__withoutCapture } from '@tldraw/state'
import { TLShapeId } from '@tldraw/tlschema'
import { bind } from '@tldraw/utils'
import { Editor } from '../../editor/Editor'
import { Vec } from '../../primitives/Vec'
import { triangulateGeometry } from './indicator-webgl-geometry'
import { appendVertices, BufferStuff, setupIndicatorWebGl } from './indicator-webgl-setup'

// Memoized color parsing
const colorMemo = {} as Record<string, Float32Array>

function getRgba(colorString: string): Float32Array {
	if (colorMemo[colorString]) {
		return colorMemo[colorString]
	}
	const canvas = document.createElement('canvas')
	const context = canvas.getContext('2d')
	context!.fillStyle = colorString
	context!.fillRect(0, 0, 1, 1)
	const [r, g, b, a] = context!.getImageData(0, 0, 1, 1).data
	const result = new Float32Array([r / 255, g / 255, b / 255, a / 255])
	colorMemo[colorString] = result
	return result
}

/** Default stroke width for indicators in screen pixels */
const INDICATOR_STROKE_WIDTH = 1.5

/** @internal */
export class WebGLIndicatorManager {
	private disposables: Array<() => void> = []
	private gl: ReturnType<typeof setupIndicatorWebGl>
	private colors: {
		selected: Float32Array
		hovered: Float32Array
	}
	// Cache geometry (zoom-independent, stroke width applied in shader)
	private geometryCache: Map<TLShapeId, Float32Array> = new Map()
	// Track which shapes need geometry updates (lazy update on render)
	private dirtyShapes: Set<TLShapeId> = new Set()

	constructor(
		public readonly editor: Editor,
		public readonly canvas: HTMLCanvasElement,
		public readonly container: HTMLElement
	) {
		this.gl = setupIndicatorWebGl(canvas)

		// Set on load
		this.colors = this._getColors()

		// Set up resize observer and reactive render loop
		const disposeViewportScreenBoundsChanged = react('viewport screen bounds changed', () => {
			// Subscribe to the viewport screen bounds change
			this.editor.getViewportScreenBounds()
			unsafe__withoutCapture(() => {
				this.setupCanvas()
				this.render()
			})
		})
		this.disposables.push(disposeViewportScreenBoundsChanged)

		// Whenever a shape is added, removed, or updated, mark it as dirty
		const cleanupSideEffects = editor.sideEffects.register({
			shape: {
				afterDelete: (shape) => {
					this.geometryCache.delete(shape.id)
					this.dirtyShapes.delete(shape.id)
				},
				afterChange: (_, next) => {
					this.markDirty(next.id)
				},
				afterCreate: (shape) => {
					this.markDirty(shape.id)
				},
			},
		})
		this.disposables.push(cleanupSideEffects)

		// render when selection/hover state changes
		const disposeShapesToDisplayChanged = react('shapes to display changed', () => {
			this.getShapesToDisplay()
			this.render()
		})
		this.disposables.push(disposeShapesToDisplayChanged)

		// render when camera changes (zoom/pan)
		const disposeCameraChanged = react('camera changed', () => {
			this.editor.getCamera()
			this.render()
		})
		this.disposables.push(disposeCameraChanged)

		// Mark all existing shapes as dirty for initial render
		for (const shape of editor.getCurrentPageShapes()) {
			this.dirtyShapes.add(shape.id)
		}

		this.setupCanvas()
		this.render()
	}

	@bind
	dispose() {
		this.disposables.forEach((d) => d())
		this.disposables = []
		this.geometryCache.clear()
		this.dirtyShapes.clear()
	}

	/**
	 * Mark a shape as needing geometry update.
	 * The geometry will be computed lazily when the shape is actually rendered.
	 */
	private markDirty(shapeId: TLShapeId) {
		this.geometryCache.delete(shapeId)
		this.dirtyShapes.add(shapeId)
	}

	private setupCanvas() {
		// Update canvas dimensions (device pixels)
		const canvasSize = this.getCanvasSize()
		this.canvas.width = canvasSize.x
		this.canvas.height = canvasSize.y

		// Set up WebGL viewport (device pixels)
		this.gl.context.viewport(0, 0, canvasSize.x, canvasSize.y)

		// Set canvas size uniform (CSS pixels - camera math uses CSS coords)
		const viewportScreenBounds = this.editor.getViewportScreenBounds()
		this.gl.setCanvasSize(viewportScreenBounds.w, viewportScreenBounds.h)
	}

	private _getColors() {
		const style = getComputedStyle(this.editor.getContainer())
		const selectedColor = style.getPropertyValue('--color-selected').trim() || '#3b82f6'
		return {
			selected: getRgba(selectedColor),
			hovered: getRgba(selectedColor),
		}
	}

	updateColors() {
		this.colors = this._getColors()
	}

	@computed
	private getDpr() {
		return this.editor.getInstanceState().devicePixelRatio
	}

	@computed
	private getCanvasSize() {
		// Use the editor's viewport screen bounds for accurate canvas sizing
		const viewportScreenBounds = this.editor.getViewportScreenBounds()
		const dpr = this.getDpr()
		return new Vec(viewportScreenBounds.w * dpr, viewportScreenBounds.h * dpr)
	}

	/**
	 * Get or compute indicator geometry for a shape.
	 * The geometry is triangulated stroke data ready for WebGL rendering.
	 * Geometry is zoom-independent - stroke width is applied in the shader.
	 */
	private getIndicatorGeometry(shapeId: TLShapeId) {
		const { editor } = this
		const shape = editor.getShape(shapeId)
		if (!shape || shape.isLocked) return null

		// If shape is dirty, recompute geometry
		if (this.dirtyShapes.has(shapeId)) {
			this.setIndicatorGeometry(shapeId)
			this.dirtyShapes.delete(shapeId)
			return this.geometryCache.get(shapeId)
		}

		// Check cache
		const cached = this.geometryCache.get(shapeId)
		if (cached) {
			return cached
		}

		this.setIndicatorGeometry(shapeId)
		return this.geometryCache.get(shapeId)
	}

	private setIndicatorGeometry(shapeId: TLShapeId) {
		const { editor } = this
		try {
			const geometry = editor.getShapeIndicatorGeometry(shapeId)
			const pageTransform = editor.getShapePageTransform(shapeId)
			if (!pageTransform) return null

			// Triangulate without stroke width - shader applies it
			const triangulated = triangulateGeometry(geometry, pageTransform)
			this.geometryCache.set(shapeId, triangulated)
			return triangulated
		} catch {
			// Shape might not have valid geometry
			return null
		}
	}

	/**
	 * Determine which shapes should have indicators displayed.
	 * Note: This only handles selected and hovered shapes.
	 * Hinted shapes are handled separately by HintedShapeIndicator in DefaultCanvas.
	 */
	@computed
	private getShapesToDisplay(): {
		selected: Set<TLShapeId>
		hovered: TLShapeId | null
	} {
		const { editor } = this
		const instanceState = editor.getInstanceState()

		// Don't show indicators while changing style
		if (instanceState.isChangingStyle) {
			return { selected: new Set(), hovered: null }
		}

		const isIdleOrEditing = editor.isInAny('select.idle', 'select.editing_shape')
		const isInSelectState = editor.isInAny(
			'select.brushing',
			'select.scribble_brushing',
			'select.pointing_shape',
			'select.pointing_selection',
			'select.pointing_handle'
		)

		if (!isIdleOrEditing && !isInSelectState) {
			return { selected: new Set(), hovered: null }
		}

		const selected = new Set(editor.getSelectedShapeIds())

		let hovered: TLShapeId | null = null
		if (isIdleOrEditing && instanceState.isHoveringCanvas && !instanceState.isCoarsePointer) {
			const hoveredId = editor.getHoveredShapeId()
			if (hoveredId && !selected.has(hoveredId)) {
				hovered = hoveredId
			}
		}

		return { selected, hovered }
	}

	/**
	 * Get the set of shapes currently being rendered (visible in viewport).
	 */
	@computed
	private getRenderingShapeIds(): Set<TLShapeId> {
		const { editor } = this
		const renderingShapes = editor.getRenderingShapes()
		return new Set(renderingShapes.map((s) => s.id))
	}

	@bind
	render() {
		const context = this.gl.context

		// Clear canvas with transparent background
		context.clearColor(0, 0, 0, 0)
		context.clear(context.COLOR_BUFFER_BIT)

		// Update camera uniform for current position/zoom
		const camera = this.editor.getCamera()
		this.gl.setCamera(camera.x, camera.y, camera.z)

		// Get shapes to display
		const { selected, hovered } = this.getShapesToDisplay()
		const renderingShapeIds = this.getRenderingShapeIds()

		// Draw selected indicators
		if (selected.size > 0) {
			this.drawIndicators(
				[...selected].filter((id) => renderingShapeIds.has(id)),
				this.gl.selectedIndicators,
				this.colors.selected
			)
		}

		// Draw hovered indicator (if not already selected)
		if (hovered && renderingShapeIds.has(hovered)) {
			this.drawIndicators([hovered], this.gl.hoveredIndicators, this.colors.hovered)
		}
	}

	private drawIndicators(shapeIds: TLShapeId[], buffer: BufferStuff, color: Float32Array) {
		if (shapeIds.length === 0) return

		let offset = 0

		for (const shapeId of shapeIds) {
			const geometry = this.getIndicatorGeometry(shapeId)
			if (!geometry || geometry.length === 0) continue

			appendVertices(buffer, offset, geometry)
			offset += geometry.length
		}

		if (offset === 0) return

		this.gl.prepareTriangles(buffer, offset)
		this.gl.setStrokeWidth(INDICATOR_STROKE_WIDTH / 2)
		this.gl.setStrokeColor(color)
		this.gl.drawTrianglesTransparently(offset)
	}

	/**
	 * Draw collaborator indicators with individual colors.
	 */
	drawCollaboratorIndicators(collaborators: Array<{ odShapeIds: TLShapeId[]; color: string }>) {
		for (const { odShapeIds: shapeIds, color } of collaborators) {
			if (shapeIds.length === 0) continue

			const colorArray = getRgba(color)
			this.drawIndicators(shapeIds, this.gl.collaboratorIndicators, colorArray)
		}
	}
}
