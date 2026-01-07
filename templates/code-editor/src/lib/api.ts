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

// ============================================================================
// Style Constants - Use these values for shape options
// ============================================================================

/**
 * Available colors for shapes.
 * Use with the `color` or `labelColor` option.
 *
 * @example
 * api.createRect(0, 0, 100, 100, { color: COLORS.blue })
 */
export const COLORS = {
	black: 'black',
	grey: 'grey',
	lightViolet: 'light-violet',
	violet: 'violet',
	blue: 'blue',
	lightBlue: 'light-blue',
	yellow: 'yellow',
	orange: 'orange',
	green: 'green',
	lightGreen: 'light-green',
	lightRed: 'light-red',
	red: 'red',
	white: 'white',
} as const

/**
 * Available fill styles for shapes.
 * Use with the `fill` option.
 *
 * @example
 * api.createRect(0, 0, 100, 100, { fill: FILLS.solid })
 */
export const FILLS = {
	none: 'none',
	semi: 'semi',
	solid: 'solid',
	pattern: 'pattern',
} as const

/**
 * Available dash/stroke styles for shapes.
 * Use with the `dash` option.
 *
 * @example
 * api.createRect(0, 0, 100, 100, { dash: DASHES.dashed })
 */
export const DASHES = {
	draw: 'draw',
	solid: 'solid',
	dashed: 'dashed',
	dotted: 'dotted',
} as const

/**
 * Available sizes for shapes.
 * Use with the `size` option. Affects stroke width, text size, etc.
 *
 * @example
 * api.createText(0, 0, 'Hello', { size: SIZES.xl })
 */
export const SIZES = {
	s: 's',
	m: 'm',
	l: 'l',
	xl: 'xl',
} as const

/**
 * Available fonts for text and labels.
 * Use with the `font` option.
 *
 * @example
 * api.createText(0, 0, 'Hello', { font: FONTS.mono })
 */
export const FONTS = {
	draw: 'draw',
	sans: 'sans',
	serif: 'serif',
	mono: 'mono',
} as const

/**
 * Available horizontal alignment options.
 * Use with the `align` option for text and labels.
 *
 * @example
 * api.createText(0, 0, 'Hello', { textAlign: ALIGN.middle })
 */
export const ALIGN = {
	start: 'start',
	middle: 'middle',
	end: 'end',
} as const

/**
 * Available vertical alignment options.
 * Use with the `verticalAlign` option for text and labels.
 *
 * @example
 * api.createRect(0, 0, 100, 100, { verticalAlign: VALIGN.start, text: 'Top' })
 */
export const VALIGN = {
	start: 'start',
	middle: 'middle',
	end: 'end',
} as const

/**
 * Available geo shape types.
 * Use with the `geo` option or use the specific create functions.
 *
 * @example
 * api.createGeo(0, 0, 100, 100, { geo: GEO.star })
 */
export const GEO = {
	rectangle: 'rectangle',
	ellipse: 'ellipse',
	triangle: 'triangle',
	diamond: 'diamond',
	pentagon: 'pentagon',
	hexagon: 'hexagon',
	octagon: 'octagon',
	star: 'star',
	rhombus: 'rhombus',
	rhombus2: 'rhombus-2',
	oval: 'oval',
	trapezoid: 'trapezoid',
	arrowRight: 'arrow-right',
	arrowLeft: 'arrow-left',
	arrowUp: 'arrow-up',
	arrowDown: 'arrow-down',
	xBox: 'x-box',
	checkBox: 'check-box',
	cloud: 'cloud',
	heart: 'heart',
} as const

/**
 * Available arrowhead styles.
 * Use with the `arrowheadStart` or `arrowheadEnd` option.
 *
 * @example
 * api.createArrow(0, 0, 100, 100, { arrowheadStart: ARROWHEADS.dot, arrowheadEnd: ARROWHEADS.triangle })
 */
export const ARROWHEADS = {
	none: 'none',
	arrow: 'arrow',
	triangle: 'triangle',
	square: 'square',
	dot: 'dot',
	pipe: 'pipe',
	diamond: 'diamond',
	inverted: 'inverted',
	bar: 'bar',
} as const

/**
 * Available spline types for lines.
 * Use with the `spline` option.
 *
 * @example
 * api.createLine([{x: 0, y: 0}, {x: 100, y: 100}], { spline: SPLINES.cubic })
 */
export const SPLINES = {
	line: 'line',
	cubic: 'cubic',
} as const

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
		 * Create an ellipse shape.
		 * @param x - X coordinate of center
		 * @param y - Y coordinate of center
		 * @param w - Width (horizontal diameter)
		 * @param h - Height (vertical diameter)
		 * @param options - Additional shape properties (color, fill, etc.)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createEllipse(300, 200, 100, 60, { color: 'blue', fill: 'solid' })
		 */
		createEllipse(
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
					x: x - w / 2,
					y: y - h / 2,
					props: {
						w,
						h,
						geo: 'ellipse',
						...options,
					},
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create a generic geo shape with any geo type.
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param w - Width
		 * @param h - Height
		 * @param options - Shape properties including `geo` type (use GEO constants)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createGeo(100, 100, 80, 80, { geo: GEO.star, color: 'yellow', fill: 'solid' })
		 * api.createGeo(200, 100, 100, 100, { geo: GEO.heart, color: 'red', fill: 'solid' })
		 */
		createGeo(
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
		 * Create a triangle shape.
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param w - Width
		 * @param h - Height
		 * @param options - Additional shape properties (color, fill, etc.)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createTriangle(100, 100, 80, 80, { color: 'green', fill: 'solid' })
		 */
		createTriangle(
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
					props: { w, h, geo: 'triangle', ...options },
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create a diamond shape.
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param w - Width
		 * @param h - Height
		 * @param options - Additional shape properties (color, fill, etc.)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createDiamond(100, 100, 80, 80, { color: 'violet', fill: 'semi' })
		 */
		createDiamond(
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
					props: { w, h, geo: 'diamond', ...options },
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create a star shape.
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param w - Width
		 * @param h - Height
		 * @param options - Additional shape properties (color, fill, etc.)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createStar(100, 100, 100, 100, { color: 'yellow', fill: 'solid' })
		 */
		createStar(
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
					props: { w, h, geo: 'star', ...options },
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create a hexagon shape.
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param w - Width
		 * @param h - Height
		 * @param options - Additional shape properties (color, fill, etc.)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createHexagon(100, 100, 80, 80, { color: 'orange', fill: 'pattern' })
		 */
		createHexagon(
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
					props: { w, h, geo: 'hexagon', ...options },
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create a cloud shape.
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param w - Width
		 * @param h - Height
		 * @param options - Additional shape properties (color, fill, etc.)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createCloud(100, 100, 150, 100, { color: 'light-blue', fill: 'solid' })
		 */
		createCloud(
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
					props: { w, h, geo: 'cloud', ...options },
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create a heart shape.
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param w - Width
		 * @param h - Height
		 * @param options - Additional shape properties (color, fill, etc.)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createHeart(100, 100, 80, 80, { color: 'red', fill: 'solid' })
		 */
		createHeart(
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
					props: { w, h, geo: 'heart', ...options },
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create an oval shape.
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param w - Width
		 * @param h - Height
		 * @param options - Additional shape properties (color, fill, etc.)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createOval(100, 100, 120, 60, { color: 'green', fill: 'semi' })
		 */
		createOval(
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
					props: { w, h, geo: 'oval', ...options },
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create a pentagon shape.
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param w - Width
		 * @param h - Height
		 * @param options - Additional shape properties (color, fill, etc.)
		 * @returns The created shape ID
		 */
		createPentagon(
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
					props: { w, h, geo: 'pentagon', ...options },
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create an octagon shape.
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param w - Width
		 * @param h - Height
		 * @param options - Additional shape properties (color, fill, etc.)
		 * @returns The created shape ID
		 */
		createOctagon(
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
					props: { w, h, geo: 'octagon', ...options },
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create a trapezoid shape.
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param w - Width
		 * @param h - Height
		 * @param options - Additional shape properties (color, fill, etc.)
		 * @returns The created shape ID
		 */
		createTrapezoid(
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
					props: { w, h, geo: 'trapezoid', ...options },
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create a rhombus shape.
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param w - Width
		 * @param h - Height
		 * @param options - Additional shape properties (color, fill, etc.)
		 * @returns The created shape ID
		 */
		createRhombus(
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
					props: { w, h, geo: 'rhombus', ...options },
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create a checkbox shape (unchecked by default).
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param size - Size of the checkbox (width and height)
		 * @param options - Additional shape properties (use geo: 'check-box' for checked state)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createCheckbox(100, 100, 30) // unchecked
		 * api.createCheckbox(150, 100, 30, { geo: 'check-box' }) // checked
		 */
		createCheckbox(
			x: number,
			y: number,
			size: number,
			options: Record<string, unknown> = {}
		): TLShapeId {
			const id = createShapeId()
			const geo = options.checked ? 'check-box' : 'x-box'
			editor.createShapes([
				{
					id,
					type: 'geo',
					x,
					y,
					props: { w: size, h: size, geo, ...options },
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
		 * Create a sticky note shape.
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param text - Text content of the note
		 * @param options - Additional shape properties (color, size, font, align, etc.)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createNote(100, 100, 'Remember this!')
		 * api.createNote(200, 100, 'Important', { color: 'red', size: 'l' })
		 */
		createNote(
			x: number,
			y: number,
			text: string,
			options: Record<string, unknown> = {}
		): TLShapeId {
			const id = createShapeId()
			editor.createShapes([
				{
					id,
					type: 'note',
					x,
					y,
					props: { richText: toRichText(text), ...options },
					meta: { generated: true },
				},
			])
			return id
		},

		/**
		 * Create a frame shape (container for organizing shapes).
		 * @param x - X coordinate of top-left corner
		 * @param y - Y coordinate of top-left corner
		 * @param w - Width
		 * @param h - Height
		 * @param options - Additional shape properties (name for the frame label)
		 * @returns The created shape ID
		 *
		 * @example
		 * api.createFrame(0, 0, 400, 300)
		 * api.createFrame(0, 0, 400, 300, { name: 'My Frame' })
		 */
		createFrame(
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
					type: 'frame',
					x,
					y,
					props: { w, h, ...options },
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
		 * Get a shape by its ID.
		 * @param id - The shape ID
		 * @returns The shape or undefined if not found
		 *
		 * @example
		 * const shape = api.getShape(shapeId)
		 * if (shape) console.log('Shape type:', shape.type)
		 */
		getShape(id: TLShapeId): TLShape | undefined {
			return editor.getShape(id)
		},

		/**
		 * Update a shape's properties.
		 * @param id - The shape ID
		 * @param partial - Partial shape properties to update
		 *
		 * @example
		 * api.updateShape(shapeId, { x: 200, y: 200 })
		 * api.updateShape(shapeId, { props: { color: 'red', fill: 'solid' } })
		 */
		updateShape<T extends TLShape>(id: TLShapeId, partial: Partial<Omit<T, 'id' | 'type'>>): void {
			const shape = editor.getShape(id)
			if (!shape) return
			editor.updateShape({ ...partial, id, type: shape.type } as T)
		},

		/**
		 * Delete a shape by its ID.
		 * @param id - The shape ID to delete
		 *
		 * @example
		 * api.deleteShape(shapeId)
		 */
		deleteShape(id: TLShapeId): void {
			editor.deleteShape(id)
		},

		/**
		 * Delete multiple shapes by their IDs.
		 * @param ids - Array of shape IDs to delete
		 *
		 * @example
		 * api.deleteShapes([shape1Id, shape2Id, shape3Id])
		 */
		deleteShapes(ids: TLShapeId[]): void {
			editor.deleteShapes(ids)
		},

		/**
		 * Select shapes by their IDs.
		 * @param ids - Array of shape IDs to select
		 *
		 * @example
		 * api.select([shape1Id, shape2Id])
		 */
		select(ids: TLShapeId[]): void {
			editor.select(...ids)
		},

		/**
		 * Select all shapes on the current page.
		 *
		 * @example
		 * api.selectAll()
		 */
		selectAll(): void {
			editor.selectAll()
		},

		/**
		 * Clear the current selection (deselect all).
		 *
		 * @example
		 * api.selectNone()
		 */
		selectNone(): void {
			editor.selectNone()
		},

		/**
		 * Get the currently selected shapes.
		 * @returns Array of selected shapes
		 *
		 * @example
		 * const selected = api.getSelectedShapes()
		 * console.log('Selected:', selected.length)
		 */
		getSelectedShapes(): TLShape[] {
			return editor.getSelectedShapes()
		},

		/**
		 * Get the IDs of currently selected shapes.
		 * @returns Array of selected shape IDs
		 *
		 * @example
		 * const selectedIds = api.getSelectedShapeIds()
		 */
		getSelectedShapeIds(): TLShapeId[] {
			return [...editor.getSelectedShapeIds()]
		},

		/**
		 * Group the specified shapes together.
		 * @param ids - Array of shape IDs to group
		 * @returns The created group shape ID or undefined if grouping failed
		 *
		 * @example
		 * const groupId = api.group([shape1Id, shape2Id])
		 */
		group(ids: TLShapeId[]): TLShapeId | undefined {
			editor.select(...ids)
			editor.groupShapes(ids)
			const selected = editor.getSelectedShapes()
			return selected.length === 1 && selected[0].type === 'group' ? selected[0].id : undefined
		},

		/**
		 * Ungroup the specified group shape.
		 * @param id - The group shape ID to ungroup
		 * @returns Array of ungrouped shape IDs
		 *
		 * @example
		 * const unroupedIds = api.ungroup(groupId)
		 */
		ungroup(id: TLShapeId): TLShapeId[] {
			editor.ungroupShapes([id])
			return [...editor.getSelectedShapeIds()]
		},

		/**
		 * Bring a shape to the front (on top of all other shapes).
		 * @param id - The shape ID
		 *
		 * @example
		 * api.bringToFront(shapeId)
		 */
		bringToFront(id: TLShapeId): void {
			editor.bringToFront([id])
		},

		/**
		 * Send a shape to the back (behind all other shapes).
		 * @param id - The shape ID
		 *
		 * @example
		 * api.sendToBack(shapeId)
		 */
		sendToBack(id: TLShapeId): void {
			editor.sendToBack([id])
		},

		/**
		 * Bring a shape forward one step in the z-order.
		 * @param id - The shape ID
		 *
		 * @example
		 * api.bringForward(shapeId)
		 */
		bringForward(id: TLShapeId): void {
			editor.bringForward([id])
		},

		/**
		 * Send a shape backward one step in the z-order.
		 * @param id - The shape ID
		 *
		 * @example
		 * api.sendBackward(shapeId)
		 */
		sendBackward(id: TLShapeId): void {
			editor.sendBackward([id])
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
