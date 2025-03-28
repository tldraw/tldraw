import { createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
	box5: createShapeId('box5'),
	boxA: createShapeId('boxA'),
	boxB: createShapeId('boxB'),
	boxC: createShapeId('boxC'),
	center: createShapeId('center'),
	right: createShapeId('right'),
	left: createShapeId('left'),
	up: createShapeId('up'),
	down: createShapeId('down'),
	right45: createShapeId('right45'),
	right85: createShapeId('right85'),
	nearRight: createShapeId('nearRight'),
	farRight: createShapeId('farRight'),
	offAxisRight: createShapeId('offAxisRight'),
	row1Shape1: createShapeId('row1Shape1'),
	row1Shape2: createShapeId('row1Shape2'),
	row1Shape3: createShapeId('row1Shape3'),
	row2Shape1: createShapeId('row2Shape1'),
	row2Shape2: createShapeId('row2Shape2'),
	offscreenBox: createShapeId('offscreenBox'),
	frame1: createShapeId('frame1'),
	group1: createShapeId('group1'),
	group2: createShapeId('group2'),
	group3: createShapeId('group3'),
}

beforeEach(() => {
	editor = new TestEditor({
		options: {
			edgeScrollDelay: 0,
			edgeScrollEaseDuration: 0,
		},
	})
	editor.setScreenBounds({ w: 3000, h: 3000, x: 0, y: 0 })
})

describe('Shape navigation', () => {
	// 1. Test it doesn't navigate to shapes that have canTabTo false
	it("doesn't navigate to shapes that have canTabTo false", () => {
		// Create shapes
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0 },
			{ id: ids.box2, type: 'geo', x: 100, y: 0 },
		])

		// Mock canTabTo to return false for the second shape
		jest.spyOn(editor.getShapeUtil('geo'), 'canTabTo').mockImplementation((shape) => {
			return shape.id !== ids.box2
		})

		// Select the first shape
		editor.select(ids.box1)

		// Try to navigate to next shape
		editor.selectAdjacentShape('next')

		// Should not select box2 since canTabTo is false
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	// 2. Test that multiple selection - hitting tab goes to one selection
	it('navigates from multiple selection to single shape on tab', () => {
		// Create shapes in a row
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0 },
			{ id: ids.box2, type: 'geo', x: 100, y: 0 },
			{ id: ids.box3, type: 'geo', x: 200, y: 0 },
		])

		// Select multiple shapes
		editor.select(ids.box1, ids.box2)

		// Navigate to next shape
		editor.selectAdjacentShape('next')

		// Should select only box3
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2])
	})

	// 3. Test that it pans to offscreen shapes
	it('pans to offscreen shapes when navigating', () => {
		// Create an offscreen shape

		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0 },
			{ id: ids.offscreenBox, type: 'geo', x: 2000, y: 2000 },
		])

		// Select the first shape
		editor.select(ids.box1)

		// Spy on zoomToSelectionIfOffscreen method
		const zoomSpy = jest.spyOn(editor, 'zoomToSelectionIfOffscreen')

		// Navigate to next shape (offscreen)
		editor.selectAdjacentShape('next')

		// Should have called zoomToSelectionIfOffscreen
		expect(zoomSpy).toHaveBeenCalled()
		expect(editor.getSelectedShapeIds()).toEqual([ids.offscreenBox])
	})

	// 4. Test if culled that it can still go to prev or next
	it('navigates to culled (out-of-view) shapes', () => {
		// Create shapes, including one that will be "culled" (out of view)
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0 },
			{ id: ids.box2, type: 'geo', x: 3000, y: 3000 }, // Far outside viewport
		])

		// Mock a culled shape (not rendered)
		jest.spyOn(editor, 'getShapePageBounds').mockImplementation((shape: any) => {
			// Return normal bounds for box1, null for box2 as if it's culled/not rendered
			if (shape?.id === ids.box2) {
				// Still return bounds, but pretend it was calculated even though shape is culled
				return { x: 3000, y: 3000, w: 100, h: 100, center: { x: 3050, y: 3050 } } as any
			}
			return { x: 0, y: 0, w: 100, h: 100, center: { x: 50, y: 50 } } as any
		})

		// Select first shape
		editor.select(ids.box1)

		// Navigate to next shape (which is culled)
		editor.selectAdjacentShape('next')

		// Should still select the culled shape
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2])
	})

	// 5. Test angle and off-axis edge cases
	describe('angle and off-axis navigation', () => {
		it('selects shapes with shallow angles in reading order', () => {
			// Create shapes in a pattern similar to the example:
			// A (0,100) -> C (20,90) -> B (50,100)
			editor.createShapes([
				{ id: ids.boxA, type: 'geo', x: 0, y: 100, props: { w: 20, h: 20 } },
				{ id: ids.boxB, type: 'geo', x: 50, y: 100, props: { w: 20, h: 20 } },
				{ id: ids.boxC, type: 'geo', x: 20, y: 90, props: { w: 20, h: 20 } },
			])

			// Setup shape centers for the test
			jest.spyOn(editor, 'getShapePageBounds').mockImplementation((shape: any) => {
				if (shape?.id === ids.boxA) {
					return { center: { x: 10, y: 110 } } as any
				}
				if (shape?.id === ids.boxB) {
					return { center: { x: 60, y: 110 } } as any
				}
				if (shape?.id === ids.boxC) {
					return { center: { x: 30, y: 100 } } as any
				}
				return { center: { x: 0, y: 0 } } as any
			})

			// Select box A
			editor.select(ids.boxA)

			// Navigate to next shape from A
			editor.selectAdjacentShape('next')

			// Should select C, not B (because C is closer with shallow angle)
			expect(editor.getSelectedShapeIds()).toEqual([ids.boxC])
		})

		it('handles extreme angle cases correctly', () => {
			// Create shapes with extreme angles
			editor.createShapes([
				{ id: ids.center, type: 'geo', x: 100, y: 100 },
				{ id: ids.right45, type: 'geo', x: 150, y: 150 }, // 45° angle
				{ id: ids.right85, type: 'geo', x: 150, y: 105 }, // ~85° angle
			])

			// Setup shape centers for the test
			jest.spyOn(editor, 'getShapePageBounds').mockImplementation((shape: any) => {
				if (shape?.id === ids.center) {
					return { center: { x: 100, y: 100 } } as any
				}
				if (shape?.id === ids.right45) {
					return { center: { x: 150, y: 150 } } as any
				}
				if (shape?.id === ids.right85) {
					return { center: { x: 150, y: 105 } } as any
				}
				return { center: { x: 0, y: 0 } } as any
			})

			// Select center
			editor.select(ids.center)

			// Navigate right
			editor.selectAdjacentShape('right')

			// Should prefer right85 because it's more directly to the right
			expect(editor.getSelectedShapeIds()).toEqual([ids.right85])
		})
	})

	// 6. Tests for directional navigation
	describe('directional navigation', () => {
		it('correctly navigates in each cardinal direction', () => {
			// Create shapes in 4 directions
			editor.createShapes([
				{ id: ids.center, type: 'geo', x: 200, y: 200 },
				{ id: ids.right, type: 'geo', x: 300, y: 200 },
				{ id: ids.left, type: 'geo', x: 100, y: 200 },
				{ id: ids.up, type: 'geo', x: 200, y: 100 },
				{ id: ids.down, type: 'geo', x: 200, y: 300 },
			])

			// Setup shape centers
			jest.spyOn(editor, 'getShapePageBounds').mockImplementation((shape: any) => {
				if (shape?.id === ids.center) return { center: { x: 200, y: 200 } } as any
				if (shape?.id === ids.right) return { center: { x: 300, y: 200 } } as any
				if (shape?.id === ids.left) return { center: { x: 100, y: 200 } } as any
				if (shape?.id === ids.up) return { center: { x: 200, y: 100 } } as any
				if (shape?.id === ids.down) return { center: { x: 200, y: 300 } } as any
				return { center: { x: 0, y: 0 } } as any
			})

			// Select center
			editor.select(ids.center)

			// Test navigation in each direction
			editor.selectAdjacentShape('right')
			expect(editor.getSelectedShapeIds()).toEqual([ids.right])

			editor.select(ids.center)
			editor.selectAdjacentShape('left')
			expect(editor.getSelectedShapeIds()).toEqual([ids.left])

			editor.select(ids.center)
			editor.selectAdjacentShape('up')
			expect(editor.getSelectedShapeIds()).toEqual([ids.up])

			editor.select(ids.center)
			editor.selectAdjacentShape('down')
			expect(editor.getSelectedShapeIds()).toEqual([ids.down])
		})

		it('selects the most appropriate shape when multiple are in the same direction', () => {
			// Create multiple shapes in the same direction
			editor.createShapes([
				{ id: ids.center, type: 'geo', x: 200, y: 200 },
				{ id: ids.nearRight, type: 'geo', x: 250, y: 200 },
				{ id: ids.farRight, type: 'geo', x: 350, y: 200 },
				{ id: ids.offAxisRight, type: 'geo', x: 300, y: 220 },
			])

			// Setup shape centers
			jest.spyOn(editor, 'getShapePageBounds').mockImplementation((shape: any) => {
				if (shape?.id === ids.center) return { center: { x: 200, y: 200 } } as any
				if (shape?.id === ids.nearRight) return { center: { x: 250, y: 200 } } as any
				if (shape?.id === ids.farRight) return { center: { x: 350, y: 200 } } as any
				if (shape?.id === ids.offAxisRight) return { center: { x: 300, y: 220 } } as any
				return { center: { x: 0, y: 0 } } as any
			})

			// Select center
			editor.select(ids.center)

			// Navigate right - should select nearRight as it's closest
			editor.selectAdjacentShape('right')
			expect(editor.getSelectedShapeIds()).toEqual([ids.nearRight])
		})

		// Add this test for the 'prev' direction in directional navigation
		it('navigates in previous/reverse directions correctly', () => {
			// Create shapes in a pattern that tests directional navigation
			editor.createShapes([
				{ id: ids.box1, type: 'geo', x: 0, y: 0 },
				{ id: ids.box2, type: 'geo', x: 100, y: 0 },
				{ id: ids.box3, type: 'geo', x: 100, y: 100 },
			])

			// Setup shape centers
			jest.spyOn(editor, 'getShapePageBounds').mockImplementation((shape: any) => {
				if (shape?.id === ids.box1) return { center: { x: 50, y: 50 } } as any
				if (shape?.id === ids.box2) return { center: { x: 150, y: 50 } } as any
				if (shape?.id === ids.box3) return { center: { x: 150, y: 150 } } as any
				return { center: { x: 0, y: 0 } } as any
			})

			// Start with box3
			editor.select(ids.box3)

			// Navigate 'up' from box3 should go to box2
			editor.selectAdjacentShape('up')
			expect(editor.getSelectedShapeIds()).toEqual([ids.box2])

			// Navigate 'left' from box2 should go to box1
			editor.selectAdjacentShape('left')
			expect(editor.getSelectedShapeIds()).toEqual([ids.box1])

			// Navigate 'right' from box1 should go back to box2
			editor.selectAdjacentShape('right')
			expect(editor.getSelectedShapeIds()).toEqual([ids.box2])

			// Navigate 'down' from box2 should go back to box3
			editor.selectAdjacentShape('down')
			expect(editor.getSelectedShapeIds()).toEqual([ids.box3])
		})
	})

	// 7. Additional edge cases and regression tests
	describe('edge cases and regressions', () => {
		it('cycles through all shapes when repeatedly tabbing', () => {
			// Create several shapes with predefined IDs
			const shapeIds = [ids.box1, ids.box2, ids.box3]
			editor.createShapes([
				{ id: shapeIds[0], type: 'geo', x: 0, y: 0 },
				{ id: shapeIds[1], type: 'geo', x: 100, y: 0 },
				{ id: shapeIds[2], type: 'geo', x: 200, y: 0 },
			])

			// Select first shape
			editor.select(shapeIds[0])

			// Tab through all shapes
			editor.selectAdjacentShape('next')
			expect(editor.getSelectedShapeIds()).toEqual([shapeIds[1]])

			editor.selectAdjacentShape('next')
			expect(editor.getSelectedShapeIds()).toEqual([shapeIds[2]])

			// Should cycle back to first shape
			editor.selectAdjacentShape('next')
			expect(editor.getSelectedShapeIds()).toEqual([shapeIds[0]])
		})

		it('handles empty or no selection states gracefully', () => {
			// Create a shape
			editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])

			// Start with no selection
			editor.selectNone()

			// Try to navigate - should select a shape
			editor.selectAdjacentShape('next')

			// Should have selected a shape rather than erroring
			expect(editor.getSelectedShapeIds().length).toBeGreaterThan(0)
		})

		it('navigates in row-wise reading order with complex layouts', () => {
			// Create shapes in a grid-like pattern
			editor.createShapes([
				{ id: ids.row1Shape1, type: 'geo', x: 0, y: 0 },
				{ id: ids.row1Shape2, type: 'geo', x: 100, y: 0 },
				{ id: ids.row1Shape3, type: 'geo', x: 200, y: 0 },
				{ id: ids.row2Shape1, type: 'geo', x: 0, y: 100 },
				{ id: ids.row2Shape2, type: 'geo', x: 100, y: 100 },
			])

			// Setup shape centers
			jest.spyOn(editor, 'getShapePageBounds').mockImplementation((shape: any) => {
				if (shape?.id === ids.row1Shape1) return { center: { x: 50, y: 50 } } as any
				if (shape?.id === ids.row1Shape2) return { center: { x: 150, y: 50 } } as any
				if (shape?.id === ids.row1Shape3) return { center: { x: 250, y: 50 } } as any
				if (shape?.id === ids.row2Shape1) return { center: { x: 50, y: 150 } } as any
				if (shape?.id === ids.row2Shape2) return { center: { x: 150, y: 150 } } as any
				return { center: { x: 0, y: 0 } } as any
			})

			// Select first shape
			editor.select(ids.row1Shape1)

			// Navigate through shapes and verify reading order
			editor.selectAdjacentShape('next')
			expect(editor.getSelectedShapeIds()).toEqual([ids.row1Shape2])

			editor.selectAdjacentShape('next')
			expect(editor.getSelectedShapeIds()).toEqual([ids.row1Shape3])

			editor.selectAdjacentShape('next')
			expect(editor.getSelectedShapeIds()).toEqual([ids.row2Shape1])

			editor.selectAdjacentShape('next')
			expect(editor.getSelectedShapeIds()).toEqual([ids.row2Shape2])

			// And back to row1Shape1 to complete the cycle
			editor.selectAdjacentShape('next')
			expect(editor.getSelectedShapeIds()).toEqual([ids.row1Shape1])
		})

		// Add this new test for 'prev' navigation
		it('cycles through all shapes in reverse when repeatedly using prev', () => {
			// Create several shapes with predefined IDs
			const shapeIds = [ids.box1, ids.box2, ids.box3]
			editor.createShapes([
				{ id: shapeIds[0], type: 'geo', x: 0, y: 0 },
				{ id: shapeIds[1], type: 'geo', x: 100, y: 0 },
				{ id: shapeIds[2], type: 'geo', x: 200, y: 0 },
			])

			// Select last shape
			editor.select(shapeIds[2])

			// Tab backward through all shapes
			editor.selectAdjacentShape('prev')
			expect(editor.getSelectedShapeIds()).toEqual([shapeIds[1]])

			editor.selectAdjacentShape('prev')
			expect(editor.getSelectedShapeIds()).toEqual([shapeIds[0]])

			// Should cycle back to last shape
			editor.selectAdjacentShape('prev')
			expect(editor.getSelectedShapeIds()).toEqual([shapeIds[2]])
		})

		// Also add a test for navigating from multiple selection using 'prev'
		it('navigates from multiple selection to single shape on prev', () => {
			// Create shapes in a row
			editor.createShapes([
				{ id: ids.box1, type: 'geo', x: 0, y: 0 },
				{ id: ids.box2, type: 'geo', x: 100, y: 0 },
				{ id: ids.box3, type: 'geo', x: 200, y: 0 },
			])

			// Select multiple shapes
			editor.select(ids.box2, ids.box3)

			// Navigate to previous shape
			editor.selectAdjacentShape('prev')

			// Should select only box1
			expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		})

		// Test mix of next/prev navigation
		it('correctly handles alternating next and prev navigation', () => {
			// Create shapes
			editor.createShapes([
				{ id: ids.box1, type: 'geo', x: 0, y: 0 },
				{ id: ids.box2, type: 'geo', x: 100, y: 0 },
				{ id: ids.box3, type: 'geo', x: 200, y: 0 },
			])

			// Select middle shape
			editor.select(ids.box2)

			// Navigate next
			editor.selectAdjacentShape('next')
			expect(editor.getSelectedShapeIds()).toEqual([ids.box3])

			// Navigate prev twice
			editor.selectAdjacentShape('prev')
			expect(editor.getSelectedShapeIds()).toEqual([ids.box2])

			editor.selectAdjacentShape('prev')
			expect(editor.getSelectedShapeIds()).toEqual([ids.box1])

			// Navigate next again
			editor.selectAdjacentShape('next')
			expect(editor.getSelectedShapeIds()).toEqual([ids.box2])
		})
	})
})
