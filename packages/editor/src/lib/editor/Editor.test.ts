import { vi } from 'vitest'
import {
	Box,
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLBaseShape,
	createShapeId,
	createTLStore,
} from '../..'
import { Editor } from './Editor'

type ICustomShape = TLBaseShape<
	'my-custom-shape',
	{
		w: number
		h: number
		text: string | undefined
		isFilled: boolean
	}
>

class CustomShape extends ShapeUtil<ICustomShape> {
	static override type = 'my-custom-shape' as const
	static override props: RecordProps<ICustomShape> = {
		w: T.number,
		h: T.number,
		text: T.string.optional(),
		isFilled: T.boolean,
	}
	getDefaultProps(): ICustomShape['props'] {
		return {
			w: 200,
			h: 200,
			text: '',
			isFilled: false,
		}
	}
	getGeometry(shape: ICustomShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: shape.props.isFilled,
		})
	}
	indicator() {}
	component() {}
}

let editor: Editor

beforeEach(() => {
	editor = new Editor({
		shapeUtils: [CustomShape],
		bindingUtils: [],
		tools: [],
		store: createTLStore({ shapeUtils: [CustomShape], bindingUtils: [] }),
		getContainer: () => document.body,
	})
	editor.setCameraOptions({ isLocked: true })
	editor.setCamera = vi.fn()
	editor.user.getAnimationSpeed = vi.fn()
})

describe('centerOnPoint', () => {
	it('no-op when isLocked is set', () => {
		editor.centerOnPoint({ x: 0, y: 0 })
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.centerOnPoint({ x: 0, y: 0 }, { force: true })
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('updateShape', () => {
	it('updates shape props to undefined', () => {
		const id = createShapeId('sample')
		editor.createShape({
			id,
			type: 'my-custom-shape',
			props: { w: 100, h: 100, text: 'Hello' },
		})
		const shape = editor.getShape(id) as ICustomShape
		expect(shape.props).toEqual({ w: 100, h: 100, text: 'Hello', isFilled: false })

		editor.updateShape({ ...shape, props: { ...shape.props, text: undefined } })
		const updatedShape = editor.getShape(id) as ICustomShape
		expect(updatedShape.props).toEqual({ w: 100, h: 100, text: undefined, isFilled: false })
	})
})

describe('zoomToFit', () => {
	it('no-op when isLocked is set', () => {
		editor.getCurrentPageShapeIds = vi.fn(() => new Set([createShapeId('box1')]))
		editor.zoomToFit()
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.getCurrentPageShapeIds = vi.fn(() => new Set([createShapeId('box1')]))
		editor.zoomToFit({ force: true })
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('resetZoom', () => {
	it('no-op when isLocked is set', () => {
		editor.resetZoom()
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.resetZoom(undefined, { force: true })
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('zoomIn', () => {
	it('no-op when isLocked is set', () => {
		editor.zoomIn()
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.zoomIn(undefined, { force: true })
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('zoomOut', () => {
	it('no-op when isLocked is set', () => {
		editor.zoomOut()
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.zoomOut(undefined, { force: true })
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('zoomToSelection', () => {
	it('no-op when isLocked is set', () => {
		editor.getSelectionPageBounds = vi.fn(() => Box.From({ x: 0, y: 0, w: 100, h: 100 }))
		editor.zoomToSelection()
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.getSelectionPageBounds = vi.fn(() => Box.From({ x: 0, y: 0, w: 100, h: 100 }))
		editor.zoomToSelection({ force: true })
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('slideCamera', () => {
	it('no-op when isLocked is set', () => {
		editor.slideCamera({ speed: 1, direction: { x: 1, y: 1 } })
		expect(editor.user.getAnimationSpeed).not.toHaveBeenCalled()
	})

	it('performs animation when isLocked is set and force flag is set', () => {
		editor.slideCamera({ speed: 1, direction: { x: 1, y: 1 }, force: true })
		expect(editor.user.getAnimationSpeed).toHaveBeenCalled()
	})
})

describe('zoomToBounds', () => {
	it('no-op when isLocked is set', () => {
		editor.zoomToBounds({ x: 0, y: 0, w: 100, h: 100 })
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.zoomToBounds({ x: 0, y: 0, w: 100, h: 100 }, { force: true })
		expect(editor.setCamera).toHaveBeenCalled()
	})
})

describe('getShapesAtPoint', () => {
	const ids = {
		shape1: createShapeId('shape1'),
		shape2: createShapeId('shape2'),
		shape3: createShapeId('shape3'),
		shape4: createShapeId('shape4'),
		shape5: createShapeId('shape5'),
		overlap1: createShapeId('overlap1'),
		overlap2: createShapeId('overlap2'),
		filledShape: createShapeId('filledShape'),
		hollowShape: createShapeId('hollowShape'),
		hiddenShape: createShapeId('hiddenShape'),
	}

	beforeEach(() => {
		// Create test shapes with different z-index positions
		// Shape 1: Bottom layer, large square
		editor.createShape({
			id: ids.shape1,
			type: 'my-custom-shape',
			x: 0,
			y: 0,
			props: { w: 200, h: 200, text: 'Bottom' },
		})

		// Shape 2: Middle layer, overlapping square
		editor.createShape({
			id: ids.shape2,
			type: 'my-custom-shape',
			x: 100,
			y: 0,
			props: { w: 200, h: 200, text: 'Middle' },
		})

		// Shape 3: Top layer, small square
		editor.createShape({
			id: ids.shape3,
			type: 'my-custom-shape',
			x: 50,
			y: 50,
			props: { w: 100, h: 100, text: 'Top' },
		})

		// Shape 4: Separate area, no overlap
		editor.createShape({
			id: ids.shape4,
			type: 'my-custom-shape',
			x: 50,
			y: 100,
			props: { w: 100, h: 100, text: 'Separate' },
		})
	})

	it('returns shapes at a point in reverse z-index order', () => {
		// Point at (50, 50) should hit shape3's edge (since it's at 50,50 with size 100x100)
		// This point is exactly at the top-left corner of shape3
		const shapes = editor.getShapesAtPoint({ x: 50, y: 50 })
		const shapeIds = shapes.map((s) => s.id)

		expect(shapeIds).toEqual([ids.shape3])
		expect(shapes).toHaveLength(1)
	})

	it('returns empty array when no shapes at point', () => {
		const shapes = editor.getShapesAtPoint({ x: 1000, y: 1000 })
		expect(shapes).toEqual([])
	})

	it('returns single shape when point hits only one shape', () => {
		// Point at right edge of shape2 where it doesn't overlap with other shapes
		// Shape2 is at (100,0) with size 200x200, so right edge is at x=300
		const shapes = editor.getShapesAtPoint({ x: 300, y: 100 })
		expect(shapes).toHaveLength(1)
		expect(shapes[0].id).toBe(ids.shape2)
	})

	it('returns shapes on edge when point is exactly on boundary', () => {
		// Point at exact edge of shape1
		const shapes = editor.getShapesAtPoint({ x: 0, y: 0 })
		expect(shapes).toHaveLength(1)
		expect(shapes[0].id).toBe(ids.shape1)
	})

	it('respects hitInside option when false (default)', () => {
		// Point inside shape1 (at 0,0 with size 200x200) but with hitInside false should not hit
		const shapes = editor.getShapesAtPoint({ x: 25, y: 25 }, { hitInside: false })
		expect(shapes).toEqual([])
	})

	it('respects hitInside option when true', () => {
		// Point inside shape1 (at 0,0 with size 200x200) with hitInside true should hit
		const shapes = editor.getShapesAtPoint({ x: 25, y: 25 }, { hitInside: true })
		expect(shapes).toHaveLength(1)
		expect(shapes[0].id).toBe(ids.shape1)
	})

	it('respects margin option', () => {
		// Point slightly outside shape1 at bottom edge but within margin should hit only shape1
		// Shape1 is at (0,0) with size 200x200, shape2 goes to (300,200) so avoid overlap at (200,200)
		const shapes = editor.getShapesAtPoint({ x: 205, y: 100 }, { margin: 10 })
		expect(shapes).toHaveLength(1)
		expect(shapes[0].id).toBe(ids.shape1)
	})

	it('filters out hidden shapes', () => {
		// Create a spy to mock isShapeHidden
		const isShapeHiddenSpy = vi.spyOn(editor, 'isShapeHidden')
		isShapeHiddenSpy.mockImplementation((shape) => {
			return typeof shape === 'string' ? shape === ids.shape3 : shape.id === ids.shape3
		})

		const shapes = editor.getShapesAtPoint({ x: 50, y: 50 })
		const shapeIds = shapes.map((s) => s.id)

		// Should not include shape3 since it's hidden, and no other shapes are at this point
		expect(shapeIds).toEqual([])
		expect(shapes).toHaveLength(0)

		isShapeHiddenSpy.mockRestore()
	})

	it('handles point exactly at shape corner', () => {
		// Point at bottom-left corner of shape1 where it doesn't overlap with other shapes
		const shapes = editor.getShapesAtPoint({ x: 0, y: 200 })
		expect(shapes).toHaveLength(1)
		expect(shapes[0].id).toBe(ids.shape1)
	})

	it('handles overlapping shapes with different hit areas', () => {
		// Point that hits both shape1 and shape2 edges (they overlap at x=100,y=0)
		const shapes = editor.getShapesAtPoint({ x: 100, y: 0 })
		const shapeIds = shapes.map((s) => s.id)

		// Both shapes should be detected at this overlapping point (reversed order - top-most first)
		expect(shapeIds).toEqual([ids.shape2, ids.shape1])
		expect(shapes).toHaveLength(2)
	})

	it('maintains reverse shape order and responds to z-index changes', () => {
		// Create filled shape that overlaps with shape2
		editor.createShape({
			id: ids.shape5,
			type: 'my-custom-shape',
			x: 110,
			y: 110,
			props: { w: 200, h: 200, isFilled: true, text: 'Shape5' },
		})

		// Test with hitInside to detect multiple shapes
		// Point (120,120) will hit shape1, shape2, shape3, shape4, and shape5 with hitInside: true
		const shapes = editor.getShapesAtPoint({ x: 120, y: 120 }, { hitInside: true })
		const shapeIds = shapes.map((s) => s.id)

		// All shapes that contain this point should be returned in reverse z-index order (top-most first)
		expect(shapeIds).toEqual([ids.shape5, ids.shape4, ids.shape3, ids.shape2, ids.shape1])

		// After bringing shape2 to front, order should change (shape2 becomes top-most)
		editor.bringToFront([ids.shape2])
		const shapes2 = editor.getShapesAtPoint({ x: 120, y: 120 }, { hitInside: true })
		const shapeIds2 = shapes2.map((s) => s.id)
		expect(shapeIds2).toEqual([ids.shape2, ids.shape5, ids.shape4, ids.shape3, ids.shape1])
	})

	it('combines hitInside and margin options', () => {
		// Point inside shape1 (at 0,0 with size 200x200) with hitInside and margin
		const shapes = editor.getShapesAtPoint({ x: 25, y: 25 }, { hitInside: true, margin: 5 })
		expect(shapes).toHaveLength(1)
		expect(shapes[0].id).toBe(ids.shape1)
	})

	it('returns empty array when all shapes are hidden', () => {
		// Mock all shapes as hidden
		const isShapeHiddenSpy = vi.spyOn(editor, 'isShapeHidden')
		isShapeHiddenSpy.mockReturnValue(true)

		const shapes = editor.getShapesAtPoint({ x: 50, y: 50 })
		expect(shapes).toEqual([])

		isShapeHiddenSpy.mockRestore()
	})

	it('returns multiple shapes at same point in reverse z-index order', () => {
		// Create two shapes at exactly the same position (away from existing shapes)
		editor.createShape({
			id: ids.overlap1,
			type: 'my-custom-shape',
			x: 600,
			y: 600,
			props: { w: 100, h: 100, text: 'First' },
		})

		editor.createShape({
			id: ids.overlap2,
			type: 'my-custom-shape',
			x: 600,
			y: 600,
			props: { w: 100, h: 100, text: 'Second' },
		})

		// Test at corner where both shapes' edges meet
		const shapes = editor.getShapesAtPoint({ x: 600, y: 600 })
		const shapeIds = shapes.map((s) => s.id)

		// Should return both shapes in reverse z-index order (top-most first)
		expect(shapeIds).toEqual([ids.overlap2, ids.overlap1])
		expect(shapes).toHaveLength(2)
	})

	it('respects isFilled property for hit detection', () => {
		// Create a filled shape
		editor.createShape({
			id: ids.filledShape,
			type: 'my-custom-shape',
			x: 300,
			y: 300,
			props: { w: 100, h: 100, isFilled: true, text: 'Filled' },
		})

		// Create a hollow shape at the same position
		editor.createShape({
			id: ids.hollowShape,
			type: 'my-custom-shape',
			x: 400,
			y: 300,
			props: { w: 100, h: 100, isFilled: false, text: 'Hollow' },
		})

		// Test point inside filled shape - should hit without hitInside option
		const filledShapes = editor.getShapesAtPoint({ x: 350, y: 350 })
		expect(filledShapes).toHaveLength(1)
		expect(filledShapes[0].id).toBe(ids.filledShape)

		// Test point inside hollow shape - should not hit without hitInside option
		const hollowShapes = editor.getShapesAtPoint({ x: 450, y: 350 })
		expect(hollowShapes).toHaveLength(0)

		// Test point inside hollow shape with hitInside - should hit
		const hollowShapesWithHitInside = editor.getShapesAtPoint(
			{ x: 450, y: 350 },
			{ hitInside: true }
		)
		expect(hollowShapesWithHitInside).toHaveLength(1)
		expect(hollowShapesWithHitInside[0].id).toBe(ids.hollowShape)
	})
})

describe('selectAll', () => {
	const selectAllIds = {
		pageShape1: createShapeId('pageShape1'),
		pageShape2: createShapeId('pageShape2'),
		pageShape3: createShapeId('pageShape3'),
		container1: createShapeId('container1'),
		containerChild1: createShapeId('containerChild1'),
		containerChild2: createShapeId('containerChild2'),
		containerChild3: createShapeId('containerChild3'),
		containerGrandchild1: createShapeId('containerGrandchild1'),
		container2: createShapeId('container2'),
		container2Child1: createShapeId('container2Child1'),
		container2Child2: createShapeId('container2Child2'),
		container2Grandchild1: createShapeId('container2Grandchild1'),
		lockedShape: createShapeId('lockedShape'),
	}

	beforeEach(() => {
		// Clear any existing shapes
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())

		// Create shapes directly on the page (no parentId means they're children of the page)
		editor.createShapes([
			{
				id: selectAllIds.pageShape1,
				type: 'my-custom-shape',
				x: 100,
				y: 100,
				props: { w: 100, h: 100 },
			},
			{
				id: selectAllIds.pageShape2,
				type: 'my-custom-shape',
				x: 300,
				y: 100,
				props: { w: 100, h: 100 },
			},
			{
				id: selectAllIds.pageShape3,
				type: 'my-custom-shape',
				x: 500,
				y: 100,
				props: { w: 100, h: 100 },
			},
			{
				id: selectAllIds.lockedShape,
				type: 'my-custom-shape',
				x: 700,
				y: 100,
				props: { w: 100, h: 100 },
				isLocked: true,
			},
		])

		// Create a container shape (simulating a frame or group)
		editor.createShape({
			id: selectAllIds.container1,
			type: 'my-custom-shape',
			x: 100,
			y: 300,
			props: { w: 400, h: 200 },
		})

		// Create children inside the container (parentId set to container1)
		editor.createShapes([
			{
				id: selectAllIds.containerChild1,
				type: 'my-custom-shape',
				parentId: selectAllIds.container1,
				x: 120,
				y: 320,
				props: { w: 50, h: 50 },
			},
			{
				id: selectAllIds.containerChild2,
				type: 'my-custom-shape',
				parentId: selectAllIds.container1,
				x: 200,
				y: 320,
				props: { w: 50, h: 50 },
			},
			{
				id: selectAllIds.containerChild3,
				type: 'my-custom-shape',
				parentId: selectAllIds.container1,
				x: 280,
				y: 320,
				props: { w: 50, h: 50 },
			},
		])

		// Create a grandchild inside one of the container children
		editor.createShape({
			id: selectAllIds.containerGrandchild1,
			type: 'my-custom-shape',
			parentId: selectAllIds.containerChild3,
			x: 290,
			y: 330,
			props: { w: 30, h: 30 },
		})

		// Create a second container (simulating a group)
		editor.createShape({
			id: selectAllIds.container2,
			type: 'my-custom-shape',
			x: 600,
			y: 300,
			props: { w: 200, h: 200 },
		})

		// Create children inside the second container
		editor.createShapes([
			{
				id: selectAllIds.container2Child1,
				type: 'my-custom-shape',
				parentId: selectAllIds.container2,
				x: 620,
				y: 320,
				props: { w: 50, h: 50 },
			},
			{
				id: selectAllIds.container2Child2,
				type: 'my-custom-shape',
				parentId: selectAllIds.container2,
				x: 680,
				y: 320,
				props: { w: 50, h: 50 },
			},
		])

		// Create a grandchild in the second container
		editor.createShape({
			id: selectAllIds.container2Grandchild1,
			type: 'my-custom-shape',
			parentId: selectAllIds.container2Child1,
			x: 630,
			y: 330,
			props: { w: 30, h: 30 },
		})

		// Clear selection
		editor.selectNone()
	})

	it('when no shapes are selected, selects all page-level shapes (excluding locked ones)', () => {
		// Initially no shapes selected
		expect(editor.getSelectedShapeIds()).toEqual([])

		// Call selectAll
		editor.selectAll()

		// Should select all page-level shapes (excluding locked ones)
		const selectedIds = editor.getSelectedShapeIds()
		expect(Array.from(selectedIds).sort()).toEqual(
			[
				selectAllIds.pageShape1,
				selectAllIds.pageShape2,
				selectAllIds.pageShape3,
				selectAllIds.container1,
				selectAllIds.container2,
			].sort()
		)

		// Should NOT include locked shape or children/grandchildren
		expect(selectedIds).not.toContain(selectAllIds.lockedShape)
		expect(selectedIds).not.toContain(selectAllIds.containerChild1)
		expect(selectedIds).not.toContain(selectAllIds.containerChild2)
		expect(selectedIds).not.toContain(selectAllIds.containerChild3)
		expect(selectedIds).not.toContain(selectAllIds.containerGrandchild1)
		expect(selectedIds).not.toContain(selectAllIds.container2Child1)
		expect(selectedIds).not.toContain(selectAllIds.container2Child2)
		expect(selectedIds).not.toContain(selectAllIds.container2Grandchild1)
	})

	it('when shapes are selected only on the page, all children of the page should be selected (but not their descendants)', () => {
		// Select some page-level shapes
		editor.select(selectAllIds.pageShape1, selectAllIds.pageShape2)

		// Call selectAll
		editor.selectAll()

		// Should select all page-level shapes (excluding locked ones), but not descendants
		const selectedIds = editor.getSelectedShapeIds()
		expect(Array.from(selectedIds).sort()).toEqual(
			[
				selectAllIds.pageShape1,
				selectAllIds.pageShape2,
				selectAllIds.pageShape3,
				selectAllIds.container1,
				selectAllIds.container2,
			].sort()
		)

		// Should NOT include children or grandchildren or locked shapes
		expect(selectedIds).not.toContain(selectAllIds.containerChild1)
		expect(selectedIds).not.toContain(selectAllIds.containerChild2)
		expect(selectedIds).not.toContain(selectAllIds.containerChild3)
		expect(selectedIds).not.toContain(selectAllIds.containerGrandchild1)
		expect(selectedIds).not.toContain(selectAllIds.container2Child1)
		expect(selectedIds).not.toContain(selectAllIds.container2Child2)
		expect(selectedIds).not.toContain(selectAllIds.container2Grandchild1)
		expect(selectedIds).not.toContain(selectAllIds.lockedShape)
	})

	it('when shapes are selected within a container, only children of the container should be selected (not their descendants)', () => {
		// Select some container children
		editor.select(selectAllIds.containerChild1, selectAllIds.containerChild2)

		// Call selectAll
		editor.selectAll()

		// Should select all container children (but not their descendants)
		const selectedIds = editor.getSelectedShapeIds()
		expect(Array.from(selectedIds).sort()).toEqual(
			[
				selectAllIds.containerChild1,
				selectAllIds.containerChild2,
				selectAllIds.containerChild3,
			].sort()
		)

		// Should NOT include page-level shapes or grandchildren
		expect(selectedIds).not.toContain(selectAllIds.pageShape1)
		expect(selectedIds).not.toContain(selectAllIds.pageShape2)
		expect(selectedIds).not.toContain(selectAllIds.pageShape3)
		expect(selectedIds).not.toContain(selectAllIds.container1)
		expect(selectedIds).not.toContain(selectAllIds.container2)
		expect(selectedIds).not.toContain(selectAllIds.containerGrandchild1)
		expect(selectedIds).not.toContain(selectAllIds.container2Child1)
		expect(selectedIds).not.toContain(selectAllIds.container2Child2)
		expect(selectedIds).not.toContain(selectAllIds.container2Grandchild1)
	})

	it('when shapes are selected within a second container, only children of that container should be selected', () => {
		// Select some second container children
		editor.select(selectAllIds.container2Child1)

		// Call selectAll
		editor.selectAll()

		// Should select all second container children (but not their descendants)
		const selectedIds = editor.getSelectedShapeIds()
		expect(Array.from(selectedIds).sort()).toEqual(
			[selectAllIds.container2Child1, selectAllIds.container2Child2].sort()
		)

		// Should NOT include page-level shapes or other container's children or grandchildren
		expect(selectedIds).not.toContain(selectAllIds.pageShape1)
		expect(selectedIds).not.toContain(selectAllIds.pageShape2)
		expect(selectedIds).not.toContain(selectAllIds.pageShape3)
		expect(selectedIds).not.toContain(selectAllIds.container1)
		expect(selectedIds).not.toContain(selectAllIds.container2)
		expect(selectedIds).not.toContain(selectAllIds.containerChild1)
		expect(selectedIds).not.toContain(selectAllIds.containerChild2)
		expect(selectedIds).not.toContain(selectAllIds.containerChild3)
		expect(selectedIds).not.toContain(selectAllIds.containerGrandchild1)
		expect(selectedIds).not.toContain(selectAllIds.container2Grandchild1)
	})

	it('when shapes are selected that belong to different parents, no change/history entry should be made', () => {
		// Select shapes from different parents (page and container)
		editor.select(selectAllIds.pageShape1, selectAllIds.containerChild1)

		const initialSelectedIds = editor.getSelectedShapeIds()

		// Spy on setSelectedShapes to verify it's not called
		const setSelectedShapesSpy = vi.spyOn(editor, 'setSelectedShapes')

		// Call selectAll
		editor.selectAll()

		// Selection should remain unchanged
		expect(editor.getSelectedShapeIds()).toEqual(initialSelectedIds)

		// setSelectedShapes should not have been called (the method returns early)
		expect(setSelectedShapesSpy).not.toHaveBeenCalled()

		setSelectedShapesSpy.mockRestore()
	})

	it('when shapes are selected that belong to different containers, no change/history entry should be made', () => {
		// Select shapes from different containers
		editor.select(selectAllIds.containerChild1, selectAllIds.container2Child1)

		const initialSelectedIds = editor.getSelectedShapeIds()

		// Spy on setSelectedShapes to verify it's not called
		const setSelectedShapesSpy = vi.spyOn(editor, 'setSelectedShapes')

		// Call selectAll
		editor.selectAll()

		// Selection should remain unchanged
		expect(editor.getSelectedShapeIds()).toEqual(initialSelectedIds)

		// setSelectedShapes should not have been called
		expect(setSelectedShapesSpy).not.toHaveBeenCalled()

		setSelectedShapesSpy.mockRestore()
	})

	it('should not select locked shapes', () => {
		// Select a page-level shape
		editor.select(selectAllIds.pageShape1)

		// Call selectAll
		editor.selectAll()

		// Should select all page-level shapes except locked ones
		const selectedIds = editor.getSelectedShapeIds()
		expect(selectedIds).not.toContain(selectAllIds.lockedShape)
		expect(selectedIds).toContain(selectAllIds.pageShape1)
		expect(selectedIds).toContain(selectAllIds.pageShape2)
		expect(selectedIds).toContain(selectAllIds.pageShape3)
		expect(selectedIds).toContain(selectAllIds.container1)
		expect(selectedIds).toContain(selectAllIds.container2)
	})

	it('should handle empty container by selecting all siblings at the same level', () => {
		// Create an empty container
		const emptyContainerId = createShapeId('emptyContainer')
		editor.createShape({
			id: emptyContainerId,
			type: 'my-custom-shape',
			x: 800,
			y: 400,
			props: { w: 100, h: 100 },
		})

		// Clear selection first
		editor.selectNone()

		// Select the empty container
		editor.select(emptyContainerId)

		// Call selectAll - since the empty container has no children, it should select all siblings (page-level shapes)
		editor.selectAll()

		// Should select all page-level shapes (including the empty container itself)
		const selectedIds = editor.getSelectedShapeIds()
		expect(Array.from(selectedIds).sort()).toEqual(
			[
				selectAllIds.pageShape1,
				selectAllIds.pageShape2,
				selectAllIds.pageShape3,
				selectAllIds.container1,
				selectAllIds.container2,
				emptyContainerId,
			].sort()
		)

		// Should NOT include locked shapes or children/grandchildren
		expect(selectedIds).not.toContain(selectAllIds.lockedShape)
		expect(selectedIds).not.toContain(selectAllIds.containerChild1)
		expect(selectedIds).not.toContain(selectAllIds.containerChild2)
		expect(selectedIds).not.toContain(selectAllIds.containerChild3)
		expect(selectedIds).not.toContain(selectAllIds.containerGrandchild1)
		expect(selectedIds).not.toContain(selectAllIds.container2Child1)
		expect(selectedIds).not.toContain(selectAllIds.container2Child2)
		expect(selectedIds).not.toContain(selectAllIds.container2Grandchild1)
	})

	it('should work correctly when selecting all shapes of same parent type', () => {
		// Select all container children
		editor.select(
			selectAllIds.containerChild1,
			selectAllIds.containerChild2,
			selectAllIds.containerChild3
		)

		// Call selectAll - should maintain the same selection since all children are already selected
		editor.selectAll()

		// Should still have all container children selected
		const selectedIds = editor.getSelectedShapeIds()
		expect(Array.from(selectedIds).sort()).toEqual(
			[
				selectAllIds.containerChild1,
				selectAllIds.containerChild2,
				selectAllIds.containerChild3,
			].sort()
		)
	})

	it('should handle mixed selection levels gracefully by doing nothing', () => {
		// Select a mix: page shape (parent=page), container (parent=page), and container child (parent=container1)
		// These all have different parent IDs so selectAll should do nothing
		editor.select(selectAllIds.pageShape1, selectAllIds.containerChild1)

		const initialSelectedIds = Array.from(editor.getSelectedShapeIds())

		// Spy on setSelectedShapes to verify it's not called
		const setSelectedShapesSpy = vi.spyOn(editor, 'setSelectedShapes')

		// Call selectAll
		editor.selectAll()

		// Selection should remain unchanged since shapes have different parents
		expect(Array.from(editor.getSelectedShapeIds())).toEqual(initialSelectedIds)

		// setSelectedShapes should not have been called
		expect(setSelectedShapesSpy).not.toHaveBeenCalled()

		setSelectedShapesSpy.mockRestore()
	})
})

describe('putExternalContent', () => {
	let mockHandler: any

	beforeEach(() => {
		mockHandler = vi.fn()
		editor.registerExternalContentHandler('text', mockHandler)
	})

	it('calls external content handler when not readonly', async () => {
		vi.spyOn(editor, 'getIsReadonly').mockReturnValue(false)

		const info = { type: 'text' as const, text: 'test-data' }
		await editor.putExternalContent(info)

		expect(mockHandler).toHaveBeenCalledWith(info)
	})

	it('does not call external content handler when readonly', async () => {
		vi.spyOn(editor, 'getIsReadonly').mockReturnValue(true)

		const info = { type: 'text' as const, text: 'test-data' }
		await editor.putExternalContent(info)

		expect(mockHandler).not.toHaveBeenCalled()
	})

	it('calls external content handler when readonly but force is true', async () => {
		vi.spyOn(editor, 'getIsReadonly').mockReturnValue(true)

		const info = { type: 'text' as const, text: 'test-data' }
		await editor.putExternalContent(info, { force: true })

		expect(mockHandler).toHaveBeenCalledWith(info)
	})

	it('calls external content handler when force is false and not readonly', async () => {
		vi.spyOn(editor, 'getIsReadonly').mockReturnValue(false)

		const info = { type: 'text' as const, text: 'test-data' }
		await editor.putExternalContent(info, { force: false })

		expect(mockHandler).toHaveBeenCalledWith(info)
	})
})

describe('replaceExternalContent', () => {
	let mockHandler: any

	beforeEach(() => {
		mockHandler = vi.fn()
		editor.registerExternalContentHandler('text', mockHandler)
	})

	it('calls external content handler when not readonly', async () => {
		vi.spyOn(editor, 'getIsReadonly').mockReturnValue(false)

		const info = { type: 'text' as const, text: 'test-data' }
		await editor.replaceExternalContent(info)

		expect(mockHandler).toHaveBeenCalledWith(info)
	})

	it('does not call external content handler when readonly', async () => {
		vi.spyOn(editor, 'getIsReadonly').mockReturnValue(true)

		const info = { type: 'text' as const, text: 'test-data' }
		await editor.replaceExternalContent(info)

		expect(mockHandler).not.toHaveBeenCalled()
	})

	it('calls external content handler when readonly but force is true', async () => {
		vi.spyOn(editor, 'getIsReadonly').mockReturnValue(true)

		const info = { type: 'text' as const, text: 'test-data' }
		await editor.replaceExternalContent(info, { force: true })

		expect(mockHandler).toHaveBeenCalledWith(info)
	})

	it('calls external content handler when force is false and not readonly', async () => {
		vi.spyOn(editor, 'getIsReadonly').mockReturnValue(false)

		const info = { type: 'text' as const, text: 'test-data' }
		await editor.replaceExternalContent(info, { force: false })

		expect(mockHandler).toHaveBeenCalledWith(info)
	})
})
