import { Circle2d, createShapeId, TLDrawShape } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import { createDrawSegments, pointsToBase64 } from '../../utils/test-helpers'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

describe('DrawShapeUtil dot detection', () => {
	const shapeId = createShapeId('test-draw')

	function createDrawShape(segments: TLDrawShape['props']['segments']): TLDrawShape {
		editor.createShapes([
			{
				id: shapeId,
				type: 'draw',
				props: { segments },
			},
		])
		return editor.getShape(shapeId) as TLDrawShape
	}

	describe('empty segments', () => {
		it('treats a shape created from its default props as a dot', () => {
			editor.createShape({ id: shapeId, type: 'draw' })
			const shape = editor.getShape<TLDrawShape>(shapeId)!
			expect(shape.props.segments).toEqual([])
			expect(editor.getShapeGeometry(shape)).toBeInstanceOf(Circle2d)
			expect(editor.getShapeAtPoint({ x: 0, y: 0 })?.id).toBe(shapeId)
		})

		it('treats a single segment with an empty path as a dot', () => {
			const shape = createDrawShape([{ type: 'free', path: '' }])
			expect(editor.getShapeGeometry(shape)).toBeInstanceOf(Circle2d)
			expect(editor.getShapeAtPoint({ x: 0, y: 0 })?.id).toBe(shapeId)
		})
	})

	describe('getIsDot behavior via hideResizeHandles', () => {
		it('treats a shape with one segment and zero points as a dot', () => {
			const shape = createDrawShape([{ type: 'free', path: '' }])
			const util = editor.getShapeUtil('draw')
			expect(util.hideResizeHandles(shape)).toBe(true)
		})

		it('treats a shape with one segment and one point as a dot', () => {
			const shape = createDrawShape(createDrawSegments([[{ x: 0, y: 0, z: 0.5 }]]))
			const util = editor.getShapeUtil('draw')
			expect(util.hideResizeHandles(shape)).toBe(true)
		})

		it('treats a shape with one segment and two points as NOT a dot', () => {
			const shape = createDrawShape(
				createDrawSegments([
					[
						{ x: 0, y: 0, z: 0.5 },
						{ x: 10, y: 10, z: 0.5 },
					],
				])
			)
			const util = editor.getShapeUtil('draw')
			expect(util.hideResizeHandles(shape)).toBe(false)
		})

		it('treats a shape with one segment and many points as NOT a dot', () => {
			const shape = createDrawShape(
				createDrawSegments([
					[
						{ x: 0, y: 0, z: 0.5 },
						{ x: 10, y: 10, z: 0.5 },
						{ x: 20, y: 5, z: 0.5 },
						{ x: 30, y: 15, z: 0.5 },
					],
				])
			)
			const util = editor.getShapeUtil('draw')
			expect(util.hideResizeHandles(shape)).toBe(false)
		})

		it('treats a shape with multiple segments as NOT a dot', () => {
			const shape = createDrawShape(
				createDrawSegments([[{ x: 0, y: 0, z: 0.5 }], [{ x: 10, y: 10, z: 0.5 }]])
			)
			const util = editor.getShapeUtil('draw')
			expect(util.hideResizeHandles(shape)).toBe(false)
		})
	})

	describe('hideRotateHandle mirrors hideResizeHandles for dots', () => {
		it('hides rotate handle for dots', () => {
			const shape = createDrawShape(createDrawSegments([[{ x: 0, y: 0, z: 0.5 }]]))
			const util = editor.getShapeUtil('draw')
			expect(util.hideRotateHandle(shape)).toBe(true)
		})

		it('shows rotate handle for non-dots', () => {
			const shape = createDrawShape(
				createDrawSegments([
					[
						{ x: 0, y: 0, z: 0.5 },
						{ x: 10, y: 10, z: 0.5 },
					],
				])
			)
			const util = editor.getShapeUtil('draw')
			expect(util.hideRotateHandle(shape)).toBe(false)
		})
	})

	describe('hideSelectionBoundsFg mirrors hideResizeHandles for dots', () => {
		it('hides selection bounds for dots', () => {
			const shape = createDrawShape(createDrawSegments([[{ x: 0, y: 0, z: 0.5 }]]))
			const util = editor.getShapeUtil('draw')
			expect(util.hideSelectionBoundsFg(shape)).toBe(true)
		})

		it('shows selection bounds for non-dots', () => {
			const shape = createDrawShape(
				createDrawSegments([
					[
						{ x: 0, y: 0, z: 0.5 },
						{ x: 10, y: 10, z: 0.5 },
					],
				])
			)
			const util = editor.getShapeUtil('draw')
			expect(util.hideSelectionBoundsFg(shape)).toBe(false)
		})
	})

	describe('onResize prevents zero scale', () => {
		it('is a no-op when resized to zero width', () => {
			const shape = createDrawShape(
				createDrawSegments([
					[
						{ x: 0, y: 0, z: 0.5 },
						{ x: 50, y: 50, z: 0.5 },
					],
				])
			)

			editor.resizeShape(shape.id, { x: 0, y: 1 })
			const resized = editor.getShape<TLDrawShape>(shapeId)!
			expect(resized.props.scaleX).toBe(1)
			expect(resized.props.scaleY).toBe(1)
		})

		it('is a no-op when resized to zero height', () => {
			const shape = createDrawShape(
				createDrawSegments([
					[
						{ x: 0, y: 0, z: 0.5 },
						{ x: 50, y: 50, z: 0.5 },
					],
				])
			)

			editor.resizeShape(shape.id, { x: 1, y: 0 })
			const resized = editor.getShape<TLDrawShape>(shapeId)!
			expect(resized.props.scaleX).toBe(1)
			expect(resized.props.scaleY).toBe(1)
		})

		it('preserves sign when resizing with negative scale (flipping)', () => {
			const shape = createDrawShape(
				createDrawSegments([
					[
						{ x: 0, y: 0, z: 0.5 },
						{ x: 50, y: 50, z: 0.5 },
					],
				])
			)

			editor.resizeShape(shape.id, { x: -1, y: -1 })
			const resized = editor.getShape<TLDrawShape>(shapeId)!
			expect(resized.props.scaleX).toBe(-1)
			expect(resized.props.scaleY).toBe(-1)
		})
	})

	describe('path length does not decide dot detection', () => {
		it('treats two nearby points as a stroke, even though their path is short', () => {
			const twoPoints = pointsToBase64([
				{ x: 0, y: 0, z: 0.5 },
				{ x: 1, y: 1, z: 0.5 },
			])
			const onePointFarAway = pointsToBase64([{ x: 99999, y: 99999, z: 0.5 }])
			expect(twoPoints.length).toBeLessThan(onePointFarAway.length)

			const shape = createDrawShape([{ type: 'free', path: twoPoints }])
			expect(editor.getShapeUtil('draw').hideResizeHandles(shape)).toBe(false)
		})

		it('treats a single point as a dot, even when its path is long', () => {
			const onePoint = pointsToBase64([{ x: 99999, y: 99999, z: 0.5 }])

			const shape = createDrawShape([{ type: 'free', path: onePoint }])
			expect(editor.getShapeUtil('draw').hideResizeHandles(shape)).toBe(true)
		})
	})
})

describe('DrawShapeUtil getInterpolatedProps', () => {
	it('interpolates from a shape created with default props, which has no segments', () => {
		// https://github.com/tldraw/tldraw/issues/10737
		const startId = createShapeId('start')
		const endId = createShapeId('end')
		editor.createShapes([
			{ id: startId, type: 'draw' },
			{
				id: endId,
				type: 'draw',
				props: {
					segments: createDrawSegments([
						[
							{ x: 0, y: 0, z: 0.5 },
							{ x: 10, y: 10, z: 0.5 },
						],
					]),
				},
			},
		])
		const start = editor.getShape<TLDrawShape>(startId)!
		const end = editor.getShape<TLDrawShape>(endId)!
		expect(start.props.segments).toEqual([])
		const util = editor.getShapeUtil('draw')

		expect(() => util.getInterpolatedProps!(start, end, 0.5)).not.toThrow()
		expect(util.getInterpolatedProps!(start, end, 1).segments).toEqual(end.props.segments)
		expect(() => util.getInterpolatedProps!(end, start, 0.5)).not.toThrow()
		expect(util.getInterpolatedProps!(end, start, 0).segments).toEqual(end.props.segments)
	})
})
