import { createShapeId, Editor, TLShapeId, toRichText } from 'tldraw'

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
	}
}

export type EditorAPI = ReturnType<typeof createEditorAPI>
