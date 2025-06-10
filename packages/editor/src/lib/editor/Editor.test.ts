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
	editor.setCamera = jest.fn()
	editor.user.getAnimationSpeed = jest.fn()
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
		editor.getCurrentPageShapeIds = jest.fn(() => new Set([createShapeId('box1')]))
		editor.zoomToFit()
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.getCurrentPageShapeIds = jest.fn(() => new Set([createShapeId('box1')]))
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
		editor.getSelectionPageBounds = jest.fn(() => Box.From({ x: 0, y: 0, w: 100, h: 100 }))
		editor.zoomToSelection()
		expect(editor.setCamera).not.toHaveBeenCalled()
	})

	it('sets camera when isLocked is set and force flag is set', () => {
		editor.getSelectionPageBounds = jest.fn(() => Box.From({ x: 0, y: 0, w: 100, h: 100 }))
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
		const isShapeHiddenSpy = jest.spyOn(editor, 'isShapeHidden')
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
		const isShapeHiddenSpy = jest.spyOn(editor, 'isShapeHidden')
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
