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

		it('should detect hollow shape when using inner margin', () => {
			// Test point inside the hollow shape
			const point = { x: 150, y: 150 }

			// With default options (no inner margin), should hit the solid shape
			const defaultHit = editor.getShapeAtPoint(point)
			expect(defaultHit?.id).toBe(ids.solidShape)

			// With inner margin, should hit the hollow shape
			const innerMarginHit = editor.getShapeAtPoint(point, {
				hitInside: true,
				margin: [8, 0], // [innerMargin, outerMargin]
			})
			expect(innerMarginHit?.id).toBe(ids.hollowShape)
		})

		it('should detect hollow shape when using insideMargin option', () => {
			// Test point inside the hollow shape
			const point = { x: 150, y: 150 }

			// With insideMargin option, should hit the hollow shape
			const insideMarginHit = editor.getShapeAtPoint(point, {
				hitInside: true,
				insideMargin: 8,
			})
			expect(insideMarginHit?.id).toBe(ids.hollowShape)
		})

		it('should respect both inner and outer margins', () => {
			// Test point just outside the hollow shape
			const point = { x: 180, y: 150 }

			// With both margins, should hit the hollow shape due to outer margin
			const bothMarginsHit = editor.getShapeAtPoint(point, {
				hitInside: true,
				margin: [4, 8], // [innerMargin, outerMargin]
			})
			expect(bothMarginsHit?.id).toBe(ids.hollowShape)

			// With only inner margin, should not hit
			const onlyInnerMarginHit = editor.getShapeAtPoint(point, {
				hitInside: true,
				margin: [4, 0], // [innerMargin, outerMargin]
			})
			expect(onlyInnerMarginHit?.id).toBe(ids.solidShape)
		})

		it('should work with different margin combinations', () => {
			const point = { x: 150, y: 150 }

			// Test with array margin
			const arrayMarginHit = editor.getShapeAtPoint(point, {
				hitInside: true,
				margin: [8, 4], // [innerMargin, outerMargin]
			})
			expect(arrayMarginHit?.id).toBe(ids.hollowShape)

			// Test with single number margin (should use same for both)
			const singleMarginHit = editor.getShapeAtPoint(point, {
				hitInside: true,
				margin: 8,
			})
			expect(singleMarginHit?.id).toBe(ids.hollowShape)
		})

		it('should handle edge cases correctly', () => {
			// Test point exactly on the edge of hollow shape
			const edgePoint = { x: 125, y: 150 }

			const edgeHit = editor.getShapeAtPoint(edgePoint, {
				hitInside: true,
				margin: [8, 8],
			})
			expect(edgeHit?.id).toBe(ids.hollowShape)
		})

		it('should not hit hollow shape without hitInside option', () => {
			// Test point inside the hollow shape
			const point = { x: 150, y: 150 }

			// Without hitInside, should not hit hollow shape
			const noHitInsideHit = editor.getShapeAtPoint(point, {
				margin: [8, 0],
			})
			expect(noHitInsideHit?.id).toBe(ids.solidShape)
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
					fill: 'none',
				},
			})
		})

		it('should bind arrow to hollow shape when overlapping solid shape', () => {
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
			// Arc arrows use [8, 0] margin, so they should bind to hollow shape
			expect(arrowBindings.end?.toId).toBe(ids.hollowShape)
		})

		it('should bind arrow to hollow shape edge when using inner margin', () => {
			editor.setCurrentTool('arrow')

			// Start arrow outside both shapes
			editor.pointerDown(50, 150)

			// Move to edge of hollow shape
			editor.pointerMove(125, 150)
			editor.pointerUp()

			const createdArrow = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			expect(createdArrow).toBeDefined()

			const arrowBindings = getArrowBindings(editor, createdArrow)
			expect(arrowBindings.end).toBeDefined()
			expect(arrowBindings.end?.toId).toBe(ids.hollowShape)
		})

		it('should not bind to solid shape when hollow shape is on top', () => {
			editor.setCurrentTool('arrow')

			// Start arrow outside both shapes
			editor.pointerDown(50, 150)

			// Move to area where hollow shape overlaps solid shape
			editor.pointerMove(150, 150)
			editor.pointerUp()

			const createdArrow = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			expect(createdArrow).toBeDefined()

			const arrowBindings = getArrowBindings(editor, createdArrow)
			expect(arrowBindings.end).toBeDefined()
			// Should bind to hollow shape, not solid shape
			expect(arrowBindings.end?.toId).toBe(ids.hollowShape)
			expect(arrowBindings.end?.toId).not.toBe(ids.solidShape)
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
			expect(hit?.id).toBe(hollowShape2)
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
			expect(hit?.id).toBe(ids.hollowShape)
		})
	})

	describe('Debug mode', () => {
		it('should work with debug option enabled', () => {
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

			const point = { x: 150, y: 150 }

			// Should work the same with debug enabled
			const hit = editor.getShapeAtPoint(point, {
				hitInside: true,
				margin: [8, 8],
				debug: true,
			})
			expect(hit?.id).toBe(ids.hollowShape)
		})
	})

	describe('Regression tests for the original bug', () => {
		it('should allow binding to hollow shapes when overlapping solid shapes (original bug fix)', () => {
			// This test specifically verifies the bug fix described in the PR
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

			// Bind an arrow to the hollow shape
			editor.setCurrentTool('arrow')
			editor.pointerDown(50, 150)
			editor.pointerMove(150, 150)
			editor.pointerUp()

			const createdArrow = editor
				.getCurrentPageShapes()
				.find((s) => s.type === 'arrow') as TLArrowShape
			expect(createdArrow).toBeDefined()

			const arrowBindings = getArrowBindings(editor, createdArrow)
			expect(arrowBindings.end).toBeDefined()
			expect(arrowBindings.end?.toId).toBe(ids.hollowShape)
		})
	})
})
