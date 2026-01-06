import {
	createShapeId,
	Editor,
	TLBinding,
	TLBindingCreate,
	TLBindingId,
	TLBindingUpdate,
	TLCamera,
	TLCameraMoveOptions,
	TLShape,
	TLShapeId,
	toRichText,
	Vec,
	VecLike,
} from 'tldraw'
import { MyBezierCurveShape } from './CubicBezierShape'

/**
 * Curated API for the code editor.
 * Provides helper functions for creating shapes with automatic meta.generated marking.
 */
export function createEditorAPI(editor: Editor) {
	return {
		/**
		 * Create a rectangle shape.
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param w - Width
		 * @param h - Height
		 * @param options - Additional shape properties (color, fill, etc.)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createRect(100, 100, 200, 150, { color: 'blue', fill: 'solid' })
		 */
		createRect(
			x: number,
			y: number,
			w: number,
			h: number,
			options: Record<string, unknown> = {}
		): TLShapeId {
			const id = createShapeId()
			editor.createShapes([
				{
					id,
					type: 'geo',
					x,
					y,
					props: { w, h, geo: 'rectangle', ...options },
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create a circle (ellipse) shape.
		 * @param x - X coordinate of center
		 * @param y - Y coordinate of center
		 * @param radius - Radius of the circle
		 * @param options - Additional shape properties (color, fill, etc.)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createCircle(300, 200, 50, { color: 'red', fill: 'semi' })
		 */
		createCircle(
			x: number,
			y: number,
			radius: number,
			options: Record<string, unknown> = {}
		): TLShapeId {
			const id = createShapeId()
			editor.createShapes([
				{
					id,
					type: 'geo',
					x: x - radius,
					y: y - radius,
					props: {
						w: radius * 2,
						h: radius * 2,
						geo: 'ellipse',
						...options,
					},
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create a text shape.
		 * @param x - X coordinate
		 * @param y - Y coordinate
		 * @param text - Text content
		 * @param options - Additional shape properties (color, size, font, etc.)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createText(100, 100, 'Hello World!', { color: 'violet', size: 'xl' })
		 */
		createText(
			x: number,
			y: number,
			text: string,
			options: Record<string, unknown> = {}
		): TLShapeId {
			const id = createShapeId()
			editor.createShapes([
				{
					id,
					type: 'text',
					x,
					y,
					props: { richText: toRichText(text), ...options },
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create an arrow shape between two points.
		 * @param fromX - Starting X coordinate
		 * @param fromY - Starting Y coordinate
		 * @param toX - Ending X coordinate
		 * @param toY - Ending Y coordinate
		 * @param options - Additional shape properties (color, arrowheadStart, arrowheadEnd, etc.)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createArrow(100, 100, 300, 200, { color: 'blue' })
		 */
		createArrow(
			fromX: number,
			fromY: number,
			toX: number,
			toY: number,
			options: Record<string, unknown> = {}
		): TLShapeId {
			const id = createShapeId()
			editor.createShapes([
				{
					id,
					type: 'arrow',
					x: fromX,
					y: fromY,
					props: {
						start: { x: 0, y: 0 },
						end: { x: toX - fromX, y: toY - fromY },
						...options,
					},
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create a cubic bezier curve shape.
		 * @param x - X coordinate of the shape origin
		 * @param y - Y coordinate of the shape origin
		 * @param options - Control points for the curve (start, cp1, cp2, end relative to origin)
		 * @returns The created shape ID
		 *
		 * @example
		 * // Create a simple S-curve
		 * api.createBezier(100, 100, {
		 *   start: { x: 0, y: 0 },
		 *   cp1: { x: 100, y: 0 },
		 *   cp2: { x: 0, y: 200 },
		 *   end: { x: 100, y: 200 }
		 * })
		 */
		createBezier(
			x: number,
			y: number,
			options: {
				start?: VecLike
				cp1?: VecLike
				cp2?: VecLike
				end?: VecLike
			} = {}
		): TLShapeId {
			const id = createShapeId()
			const defaultProps: MyBezierCurveShape['props'] = {
				start: { x: 0, y: 0 },
				cp1: { x: 0, y: 140 },
				cp2: { x: 350, y: 300 },
				end: { x: 400, y: 110 },
			}
			editor.createShapes([
				{
					id,
					type: 'bezier-curve',
					x,
					y,
					props: {
						...defaultProps,
						...options,
					},
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Clear all generated shapes from the canvas.
		 * This only removes shapes created via the API (with meta.generated = true).
		 * Hand-drawn shapes are preserved.
		 *
		 * @example
		 * api.clear()
		 */
		clear(): void {
			const generatedShapes = editor
				.getCurrentPageShapes()
				.filter((shape) => shape.meta.generated === true)
			editor.deleteShapes(generatedShapes.map((s) => s.id))
		},

		/**
		 * Get all shapes on the current page.
		 * @returns Array of all shapes
		 *
		 * @example
		 * const shapes = api.getAllShapes()
		 * console.log('Total shapes:', shapes.length)
		 */
		getAllShapes() {
			return editor.getCurrentPageShapes()
		},

		/**
		 * Get only the generated shapes (created via the API).
		 * @returns Array of generated shapes
		 *
		 * @example
		 * const generated = api.getGeneratedShapes()
		 * console.log('Generated shapes:', generated.length)
		 */
		getGeneratedShapes() {
			return editor.getCurrentPageShapes().filter((shape) => shape.meta.generated === true)
		},

		/**
		 * Get the current camera position and zoom level.
		 * @returns The current camera state
		 *
		 * @example
		 * const camera = api.getCamera()
		 * console.log('Camera:', camera.x, camera.y, camera.z)
		 */
		getCamera(): TLCamera {
			return editor.getCamera()
		},

		/**
		 * Set the camera position and zoom level.
		 * @param point - The new camera position (x, y) and optional zoom (z)
		 * @param options - Optional camera move options (animation, force, etc.)
		 *
		 * @example
		 * api.setCamera({ x: 0, y: 0, z: 1 })
		 * api.setCamera({ x: 100, y: 200 }, { animation: { duration: 500 } })
		 */
		setCamera(point: VecLike, options?: TLCameraMoveOptions): void {
			editor.setCamera(point, options)
		},

		/**
		 * Center the camera on a point in page space.
		 * @param point - The point in page space to center on
		 * @param options - Optional camera move options
		 *
		 * @example
		 * api.centerOnPoint({ x: 100, y: 100 })
		 * api.centerOnPoint({ x: 200, y: 300 }, { animation: { duration: 300 } })
		 */
		centerOnPoint(point: VecLike, options?: TLCameraMoveOptions): void {
			editor.centerOnPoint(point, options)
		},

		/**
		 * Zoom the camera in.
		 * @param point - Optional screen point to zoom in on (defaults to viewport center)
		 * @param options - Optional camera move options
		 *
		 * @example
		 * api.zoomIn()
		 * api.zoomIn({ x: 400, y: 300 }, { animation: { duration: 200 } })
		 */
		zoomIn(point?: VecLike, options?: TLCameraMoveOptions): void {
			if (point) {
				editor.zoomIn(Vec.Cast(point), options)
			} else {
				editor.zoomIn(undefined, options)
			}
		},

		/**
		 * Zoom the camera out.
		 * @param point - Optional screen point to zoom out on (defaults to viewport center)
		 * @param options - Optional camera move options
		 *
		 * @example
		 * api.zoomOut()
		 * api.zoomOut({ x: 400, y: 300 }, { animation: { duration: 200 } })
		 */
		zoomOut(point?: VecLike, options?: TLCameraMoveOptions): void {
			if (point) {
				editor.zoomOut(Vec.Cast(point), options)
			} else {
				editor.zoomOut(undefined, options)
			}
		},

		/**
		 * Zoom the camera to fit all content on the current page.
		 * @param options - Optional camera move options
		 *
		 * @example
		 * api.zoomToFit()
		 * api.zoomToFit({ animation: { duration: 500 } })
		 */
		zoomToFit(options?: TLCameraMoveOptions): void {
			editor.zoomToFit(options)
		},

		/**
		 * Zoom the camera to fit the current selection.
		 * @param options - Optional camera move options
		 *
		 * @example
		 * api.zoomToSelection()
		 * api.zoomToSelection({ animation: { duration: 300 } })
		 */
		zoomToSelection(options?: TLCameraMoveOptions): void {
			editor.zoomToSelection(options)
		},

		/**
		 * Reset the zoom level to 100% (or initial zoom if constraints are set).
		 * @param point - Optional screen point to zoom on (defaults to viewport center)
		 * @param options - Optional camera move options
		 *
		 * @example
		 * api.resetZoom()
		 * api.resetZoom({ x: 400, y: 300 }, { animation: { duration: 200 } })
		 */
		resetZoom(point?: VecLike, options?: TLCameraMoveOptions): void {
			if (point) {
				editor.resetZoom(Vec.Cast(point), options)
			} else {
				editor.resetZoom(undefined, options)
			}
		},

		/**
		 * Get all bindings on the current page.
		 * @returns Array of all bindings
		 *
		 * @example
		 * const bindings = api.getAllBindings()
		 * console.log('Total bindings:', bindings.length)
		 */
		getAllBindings(): TLBinding[] {
			return editor.store.query.records('binding').get()
		},

		/**
		 * Get bindings from a specific shape (where the shape is the source).
		 * @param shape - The shape or shape ID
		 * @param type - Optional binding type to filter by
		 * @returns Array of bindings from the shape
		 *
		 * @example
		 * const bindings = api.getBindingsFromShape(shapeId)
		 * const arrowBindings = api.getBindingsFromShape(shapeId, 'arrow')
		 */
		getBindingsFromShape<Binding extends TLBinding = TLBinding>(
			shape: TLShape | TLShapeId,
			type?: Binding['type']
		): Binding[] {
			if (type) {
				return editor.getBindingsFromShape(shape, type) as unknown as Binding[]
			}
			return editor
				.getBindingsInvolvingShape(shape)
				.filter((b) => b.fromId === (typeof shape === 'string' ? shape : shape.id)) as Binding[]
		},

		/**
		 * Get bindings to a specific shape (where the shape is the target).
		 * @param shape - The shape or shape ID
		 * @param type - Optional binding type to filter by
		 * @returns Array of bindings to the shape
		 *
		 * @example
		 * const bindings = api.getBindingsToShape(shapeId)
		 * const arrowBindings = api.getBindingsToShape(shapeId, 'arrow')
		 */
		getBindingsToShape<Binding extends TLBinding = TLBinding>(
			shape: TLShape | TLShapeId,
			type?: Binding['type']
		): Binding[] {
			if (type) {
				return editor.getBindingsToShape(shape, type) as unknown as Binding[]
			}
			return editor
				.getBindingsInvolvingShape(shape)
				.filter((b) => b.toId === (typeof shape === 'string' ? shape : shape.id)) as Binding[]
		},

		/**
		 * Get all bindings involving a specific shape (both from and to).
		 * @param shape - The shape or shape ID
		 * @param type - Optional binding type to filter by
		 * @returns Array of bindings involving the shape
		 *
		 * @example
		 * const bindings = api.getBindingsInvolvingShape(shapeId)
		 * const arrowBindings = api.getBindingsInvolvingShape(shapeId, 'arrow')
		 */
		getBindingsInvolvingShape<Binding extends TLBinding = TLBinding>(
			shape: TLShape | TLShapeId,
			type?: Binding['type']
		): Binding[] {
			return editor.getBindingsInvolvingShape(shape, type) as Binding[]
		},

		/**
		 * Create a single binding between two shapes.
		 * @param partial - Partial binding data (type, fromId, toId are required)
		 * @returns The created binding
		 *
		 * @example
		 * const binding = api.createBinding({
		 *   type: 'arrow',
		 *   fromId: arrowShapeId,
		 *   toId: targetShapeId,
		 *   props: { terminal: 'end' }
		 * })
		 */
		createBinding<Binding extends TLBinding = TLBinding>(
			partial: TLBindingCreate<Binding>
		): Binding | undefined {
			editor.createBinding(partial)
			// Return the created binding if we can find it
			const fromShape = editor.getShape(partial.fromId)
			if (!fromShape) return undefined
			const bindings = editor.getBindingsFromShape(fromShape, partial.type)
			return bindings[bindings.length - 1] as Binding | undefined
		},

		/**
		 * Create multiple bindings at once.
		 * @param partials - Array of partial binding data
		 *
		 * @example
		 * api.createBindings([
		 *   { type: 'arrow', fromId: arrow1, toId: shape1 },
		 *   { type: 'arrow', fromId: arrow2, toId: shape2 }
		 * ])
		 */
		createBindings<Binding extends TLBinding = TLBinding>(
			partials: TLBindingCreate<Binding>[]
		): void {
			editor.createBindings(partials)
		},

		/**
		 * Update a single binding.
		 * @param partial - Partial binding update (id and type are required)
		 *
		 * @example
		 * api.updateBinding({
		 *   id: bindingId,
		 *   type: 'arrow',
		 *   props: { terminal: 'start' }
		 * })
		 */
		updateBinding<Binding extends TLBinding = TLBinding>(partial: TLBindingUpdate<Binding>): void {
			editor.updateBinding(partial)
		},

		/**
		 * Update multiple bindings at once.
		 * @param partials - Array of partial binding updates
		 *
		 * @example
		 * api.updateBindings([
		 *   { id: binding1, type: 'arrow', props: { terminal: 'start' } },
		 *   { id: binding2, type: 'arrow', props: { terminal: 'end' } }
		 * ])
		 */
		updateBindings<Binding extends TLBinding = TLBinding>(
			partials: TLBindingUpdate<Binding>[]
		): void {
			editor.updateBindings(partials)
		},

		/**
		 * Delete a single binding.
		 * @param binding - The binding or binding ID to delete
		 * @param options - Optional deletion options
		 *
		 * @example
		 * api.deleteBinding(bindingId)
		 * api.deleteBinding(binding, { isolateShapes: true })
		 */
		deleteBinding(binding: TLBinding | TLBindingId, options?: { isolateShapes?: boolean }): void {
			editor.deleteBinding(binding, options)
		},

		/**
		 * Delete multiple bindings at once.
		 * @param bindings - Array of bindings or binding IDs to delete
		 * @param options - Optional deletion options
		 *
		 * @example
		 * api.deleteBindings([binding1, binding2])
		 * api.deleteBindings([bindingId1, bindingId2], { isolateShapes: true })
		 */
		deleteBindings(
			bindings: (TLBinding | TLBindingId)[],
			options?: { isolateShapes?: boolean }
		): void {
			editor.deleteBindings(bindings, options)
		},
	}
}

export type EditorAPI = ReturnType<typeof createEditorAPI>
