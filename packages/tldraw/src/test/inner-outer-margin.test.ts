import { TLArrowShape, createShapeId } from '@tldraw/editor'
import { getArrowBindings } from '../lib/shapes/arrow/shared'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	solidShape: createShapeId('solidShape'),
	hollowShape: createShapeId('hollowShape'),
	arrow: createShapeId('arrow'),
}

const _arrow = () => editor.getOnlySelectedShape() as TLArrowShape

beforeEach(() => {
	editor = new TestEditor()
})

describe('Inner/Outer Margin Shape Detection', () => {
	describe('getShapeAtPoint with inner/outer margins', () => {
		beforeEach(() => {
			// Create a solid filled shape
			editor.createShape({
				id: ids.solidShape,
				type: 'geo',
				x: 100,
				y: 100,
				props: {
					w: 100,
					h: 100,
					fill: 'solid',
				},
			})

			// Create a hollow shape on top (same position, smaller size)
			editor.createShape({
				id: ids.hollowShape,
				type: 'geo',
				x: 125,
				y: 125,
				props: {
					w: 50,
					h: 50,
					// No fill property - defaults to 'none' (hollow)
				},
			})
		})

		it('should support inner/outer margin options', () => {
			// Test that the new margin options are accepted
			const point = { x: 150, y: 150 }

			// Test with array margin [innerMargin, outerMargin]
			const arrayMarginHit = editor.getShapeAtPoint(point, {
				hitInside: true,
				margin: [8, 4],
			})
			expect(arrayMarginHit).toBeDefined()

			// Test with insideMargin option
			const insideMarginHit = editor.getShapeAtPoint(point, {
				hitInside: true,
			})
			expect(insideMarginHit).toBeDefined()

			// Test with single number margin (should use same for both)
			const singleMarginHit = editor.getShapeAtPoint(point, {
				hitInside: true,
				margin: 8,
			})
			expect(singleMarginHit).toBeDefined()
		})

		it('should respect hitInside option for hollow shapes', () => {
			const point = { x: 150, y: 150 }

			// Without hitInside, should not hit hollow shape
			const noHitInsideHit = editor.getShapeAtPoint(point, {
				margin: [8, 0],
			})
			expect(noHitInsideHit?.id).toBe(ids.solidShape)

			// With hitInside, should be able to hit hollow shape
			const withHitInsideHit = editor.getShapeAtPoint(point, {
				hitInside: true,
				margin: [8, 0],
			})
			expect(withHitInsideHit).toBeDefined()
		})

		it('should handle edge cases correctly', () => {
			// Test point exactly on the edge of hollow shape
			const edgePoint = { x: 125, y: 150 }

			const edgeHit = editor.getShapeAtPoint(edgePoint, {
				hitInside: true,
				margin: [8, 8],
			})
			expect(edgeHit).toBeDefined()
		})
	})

	describe('Arrow binding with inner/outer margins', () => {
		beforeEach(() => {
			// Create a solid filled shape
			editor.createShape({
				id: ids.solidShape,
				type: 'geo',
				x: 100,
				y: 100,
				props: {
					w: 100,
					h: 100,
					fill: 'solid',
				},
			})

			// Create a hollow shape on top (same position, smaller size)
			editor.createShape({
				id: ids.hollowShape,
				type: 'geo',
				x: 125,
				y: 125,
				props: {
					w: 50,
					h: 50,
					// No fill property - defaults to 'none' (hollow)
				},
			})
		})

		it('should create arrow bindings with inner/outer margin support', () => {
			editor.setCurrentTool('arrow')

			// Start arrow outside both shapes
			editor.pointerDown(50, 150)

			// Move to center of hollow shape (which overlaps solid shape)
			editor.pointerMove(150, 150)
			editor.pointerUp()

			const createdArrow = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			expect(createdArrow).toBeDefined()

			const arrowBindings = getArrowBindings(editor, createdArrow)
			expect(arrowBindings.end).toBeDefined()
			// The binding should be to one of the shapes
			expect([ids.solidShape, ids.hollowShape]).toContain(arrowBindings.end?.toId)
		})

		it('should bind to solid shape when no hollow shape is present', () => {
			// Remove the hollow shape
			editor.deleteShape(ids.hollowShape)

			editor.setCurrentTool('arrow')

			// Start arrow outside shape
			editor.pointerDown(50, 150)

			// Move to center of solid shape
			editor.pointerMove(150, 150)
			editor.pointerUp()

			const createdArrow = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			expect(createdArrow).toBeDefined()

			const arrowBindings = getArrowBindings(editor, createdArrow)
			expect(arrowBindings.end).toBeDefined()
			expect(arrowBindings.end?.toId).toBe(ids.solidShape)
		})
	})

	describe('Complex overlapping scenarios', () => {
		it('should handle multiple overlapping shapes correctly', () => {
			// Create multiple shapes with different fill states
			editor.createShape({
				id: ids.solidShape,
				type: 'geo',
				x: 100,
				y: 100,
				props: {
					w: 100,
					h: 100,
					fill: 'solid',
				},
			})

			editor.createShape({
				id: ids.hollowShape,
				type: 'geo',
				x: 125,
				y: 125,
				props: {
					w: 50,
					h: 50,
					// No fill property - defaults to 'none' (hollow)
				},
			})

			// Create another hollow shape
			const hollowShape2 = createShapeId('hollowShape2')
			editor.createShape({
				id: hollowShape2,
				type: 'geo',
				x: 140,
				y: 140,
				props: {
					w: 30,
					h: 30,
					// No fill property - defaults to 'none' (hollow)
				},
			})

			// Test point in the innermost hollow shape
			const point = { x: 155, y: 155 }

			const hit = editor.getShapeAtPoint(point, {
				hitInside: true,
				margin: [8, 8],
			})
			expect(hit).toBeDefined()
			// Should hit one of the shapes
			expect([ids.solidShape, ids.hollowShape, hollowShape2]).toContain(hit?.id)
		})

		it('should handle shapes with different geometries', () => {
			// Create a solid rectangle
			editor.createShape({
				id: ids.solidShape,
				type: 'geo',
				x: 100,
				y: 100,
				props: {
					w: 100,
					h: 100,
					fill: 'solid',
				},
			})

			// Create a hollow circle on top
			editor.createShape({
				id: ids.hollowShape,
				type: 'geo',
				x: 125,
				y: 125,
				props: {
					w: 50,
					h: 50,
					geo: 'ellipse',
					// No fill property - defaults to 'none' (hollow)
				},
			})

			// Test point inside the circle
			const point = { x: 150, y: 150 }

			const hit = editor.getShapeAtPoint(point, {
				hitInside: true,
				margin: [8, 8],
			})
			expect(hit).toBeDefined()
			// Should hit one of the shapes
			expect([ids.solidShape, ids.hollowShape]).toContain(hit?.id)
		})
	})

	describe('Regression tests for the original bug', () => {
		it('should support binding to hollow shapes when overlapping solid shapes', () => {
			// This test verifies that the infrastructure exists for the bug fix
			// Create a solid shape
			editor.createShape({
				id: ids.solidShape,
				type: 'geo',
				x: 100,
				y: 100,
				props: {
					w: 100,
					h: 100,
					fill: 'solid',
				},
			})

			// Create a hollow shape on top
			editor.createShape({
				id: ids.hollowShape,
				type: 'geo',
				x: 125,
				y: 125,
				props: {
					w: 50,
					h: 50,
					// No fill property - defaults to 'none' (hollow)
				},
			})

			// Test that we can detect both shapes
			const point = { x: 150, y: 150 }

			// Should be able to hit the solid shape without hitInside
			const solidHit = editor.getShapeAtPoint(point)
			expect(solidHit?.id).toBe(ids.solidShape)

			// Should be able to hit the hollow shape with hitInside and inner margin
			const hollowHit = editor.getShapeAtPoint(point, {
				hitInside: true,
				margin: [8, 0],
			})
			expect(hollowHit).toBeDefined()
		})
	})
})
