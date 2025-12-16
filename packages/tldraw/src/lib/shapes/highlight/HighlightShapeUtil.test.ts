import { createShapeId, TLHighlightShape } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import { createDrawSegments, pointsToBase64 } from '../../utils/test-helpers'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

describe('HighlightShapeUtil dot detection', () => {
	const shapeId = createShapeId('test-highlight')

	function createHighlightShape(segments: TLHighlightShape['props']['segments']): TLHighlightShape {
		editor.createShapes([
			{
				id: shapeId,
				type: 'highlight',
				props: { segments },
			},
		])
		return editor.getShape(shapeId) as TLHighlightShape
	}

	describe('getIsDot behavior via hideResizeHandles', () => {
		it('treats a shape with one segment and zero points as a dot', () => {
			const shape = createHighlightShape([{ type: 'free', points: '' }])
			const util = editor.getShapeUtil('highlight')
			expect(util.hideResizeHandles(shape)).toBe(true)
		})

		it('treats a shape with one segment and one point as a dot', () => {
			const shape = createHighlightShape(createDrawSegments([[{ x: 0, y: 0, z: 0.5 }]]))
			const util = editor.getShapeUtil('highlight')
			expect(util.hideResizeHandles(shape)).toBe(true)
		})

		it('treats a shape with one segment and two points as NOT a dot', () => {
			const shape = createHighlightShape(
				createDrawSegments([
					[
						{ x: 0, y: 0, z: 0.5 },
						{ x: 10, y: 10, z: 0.5 },
					],
				])
			)
			const util = editor.getShapeUtil('highlight')
			expect(util.hideResizeHandles(shape)).toBe(false)
		})

		it('treats a shape with one segment and many points as NOT a dot', () => {
			const shape = createHighlightShape(
				createDrawSegments([
					[
						{ x: 0, y: 0, z: 0.5 },
						{ x: 10, y: 10, z: 0.5 },
						{ x: 20, y: 5, z: 0.5 },
						{ x: 30, y: 15, z: 0.5 },
					],
				])
			)
			const util = editor.getShapeUtil('highlight')
			expect(util.hideResizeHandles(shape)).toBe(false)
		})

		it('treats a shape with multiple segments as NOT a dot', () => {
			const shape = createHighlightShape(
				createDrawSegments([[{ x: 0, y: 0, z: 0.5 }], [{ x: 10, y: 10, z: 0.5 }]])
			)
			const util = editor.getShapeUtil('highlight')
			expect(util.hideResizeHandles(shape)).toBe(false)
		})
	})

	describe('hideRotateHandle mirrors hideResizeHandles for dots', () => {
		it('hides rotate handle for dots', () => {
			const shape = createHighlightShape(createDrawSegments([[{ x: 0, y: 0, z: 0.5 }]]))
			const util = editor.getShapeUtil('highlight')
			expect(util.hideRotateHandle(shape)).toBe(true)
		})

		it('shows rotate handle for non-dots', () => {
			const shape = createHighlightShape(
				createDrawSegments([
					[
						{ x: 0, y: 0, z: 0.5 },
						{ x: 10, y: 10, z: 0.5 },
					],
				])
			)
			const util = editor.getShapeUtil('highlight')
			expect(util.hideRotateHandle(shape)).toBe(false)
		})
	})

	describe('hideSelectionBoundsFg mirrors hideResizeHandles for dots', () => {
		it('hides selection bounds for dots', () => {
			const shape = createHighlightShape(createDrawSegments([[{ x: 0, y: 0, z: 0.5 }]]))
			const util = editor.getShapeUtil('highlight')
			expect(util.hideSelectionBoundsFg(shape)).toBe(true)
		})

		it('shows selection bounds for non-dots', () => {
			const shape = createHighlightShape(
				createDrawSegments([
					[
						{ x: 0, y: 0, z: 0.5 },
						{ x: 10, y: 10, z: 0.5 },
					],
				])
			)
			const util = editor.getShapeUtil('highlight')
			expect(util.hideSelectionBoundsFg(shape)).toBe(false)
		})
	})

	describe('base64 encoding boundary conditions', () => {
		it('correctly handles the boundary at exactly 16 base64 characters (2 points)', () => {
			// Each point is 8 base64 characters (3 Float16s = 6 bytes = 8 base64 chars)
			// 2 points = 16 characters, which should NOT be a dot
			const twoPointsBase64 = pointsToBase64([
				{ x: 0, y: 0, z: 0.5 },
				{ x: 1, y: 1, z: 0.5 },
			])
			expect(twoPointsBase64.length).toBe(16)

			const shape = createHighlightShape([{ type: 'free', points: twoPointsBase64 }])
			const util = editor.getShapeUtil('highlight')
			expect(util.hideResizeHandles(shape)).toBe(false)
		})

		it('correctly handles the boundary at exactly 8 base64 characters (1 point)', () => {
			// 1 point = 8 characters, which should be a dot
			const onePointBase64 = pointsToBase64([{ x: 0, y: 0, z: 0.5 }])
			expect(onePointBase64.length).toBe(8)

			const shape = createHighlightShape([{ type: 'free', points: onePointBase64 }])
			const util = editor.getShapeUtil('highlight')
			expect(util.hideResizeHandles(shape)).toBe(true)
		})
	})
})
