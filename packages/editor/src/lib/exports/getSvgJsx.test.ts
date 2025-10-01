import {
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLBaseShape,
	createShapeId,
} from '../..'
import { createTLStore } from '../config/createTLStore'
import { Editor } from '../editor/Editor'
import { Box } from '../primitives/Box'
import { getExportDefaultBounds } from './getSvgJsx'

type ITestShape = TLBaseShape<
	'test-shape',
	{
		w: number
		h: number
		x: number
		y: number
		isContainer?: boolean
	}
>

class TestShape extends ShapeUtil<ITestShape> {
	static override type = 'test-shape' as const
	static override props: RecordProps<ITestShape> = {
		w: T.number,
		h: T.number,
		x: T.number,
		y: T.number,
		isContainer: T.boolean.optional(),
	}
	getDefaultProps(): ITestShape['props'] {
		return {
			w: 100,
			h: 100,
			x: 0,
			y: 0,
			isContainer: false,
		}
	}
	getGeometry(shape: ITestShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			x: shape.props.x,
			y: shape.props.y,
			isFilled: false,
		})
	}

	override isExportBoundsContainer(shape: ITestShape): boolean {
		return shape.props.isContainer ?? false
	}

	indicator() {}
	component() {}
}

let editor: Editor

beforeEach(() => {
	editor = new Editor({
		shapeUtils: [TestShape],
		bindingUtils: [],
		tools: [],
		store: createTLStore({ shapeUtils: [TestShape], bindingUtils: [] }),
		getContainer: () => document.body,
	})
})

describe('getExportDefaultBounds', () => {
	it('returns null when no rendering shapes provided', () => {
		const result = getExportDefaultBounds(editor, [], 32, null)
		expect(result).toBeNull()
	})

	it('returns bounds for single shape with padding', () => {
		const shapeId = createShapeId('test1')
		editor.createShape({
			id: shapeId,
			type: 'test-shape',
			x: 10,
			y: 20,
			props: { w: 100, h: 80, x: 0, y: 0 },
		})

		const renderingShapes = editor.getUnorderedRenderingShapes(false)
		const testShape = renderingShapes.find((s) => s.id === shapeId)!

		const result = getExportDefaultBounds(editor, [testShape], 32, null)

		expect(result).toBeInstanceOf(Box)
		// Bounds should include 32px padding on all sides
		expect(result?.x).toBe(10 - 32) // -22
		expect(result?.y).toBe(20 - 32) // -12
		expect(result?.w).toBe(100 + 64) // 164 (32px on each side)
		expect(result?.h).toBe(80 + 64) // 144 (32px on each side)
	})

	it('returns union bounds for multiple shapes with padding', () => {
		const shape1Id = createShapeId('test1')
		const shape2Id = createShapeId('test2')

		editor.createShape({
			id: shape1Id,
			type: 'test-shape',
			x: 0,
			y: 0,
			props: { w: 50, h: 50, x: 0, y: 0 },
		})

		editor.createShape({
			id: shape2Id,
			type: 'test-shape',
			x: 30,
			y: 30,
			props: { w: 60, h: 60, x: 0, y: 0 },
		})

		const renderingShapes = editor.getUnorderedRenderingShapes(false)
		const testShapes = renderingShapes.filter((s) => [shape1Id, shape2Id].includes(s.id))

		const result = getExportDefaultBounds(editor, testShapes, 32, null)

		expect(result).toBeInstanceOf(Box)
		// Raw bounds would be (0,0) to (90,90), with 32px padding on all sides
		expect(result?.x).toBe(0 - 32) // -32
		expect(result?.y).toBe(0 - 32) // -32
		expect(result?.w).toBe(90 + 64) // 154
		expect(result?.h).toBe(90 + 64) // 154
	})

	it('handles shapes with transforms correctly', () => {
		const shapeId = createShapeId('test1')
		editor.createShape({
			id: shapeId,
			type: 'test-shape',
			x: 25,
			y: 35,
			props: { w: 50, h: 40, x: 0, y: 0 },
		})

		// Rotate the shape
		editor.rotateShapesBy([shapeId], Math.PI / 4)

		const renderingShapes = editor.getUnorderedRenderingShapes(false)
		const testShape = renderingShapes.find((s) => s.id === shapeId)!

		const result = getExportDefaultBounds(editor, [testShape], 32, null)

		expect(result).toBeInstanceOf(Box)
		// The rotated shape should have expanded bounds, plus padding
		expect(result!.w).toBeGreaterThan(50 + 64)
		expect(result!.h).toBeGreaterThan(40 + 64)
	})

	it('handles multiple overlapping shapes correctly', () => {
		const shape1Id = createShapeId('test1')
		const shape2Id = createShapeId('test2')
		const shape3Id = createShapeId('test3')

		// Create overlapping shapes
		editor.createShape({
			id: shape1Id,
			type: 'test-shape',
			x: 0,
			y: 0,
			props: { w: 40, h: 40, x: 0, y: 0 },
		})

		editor.createShape({
			id: shape2Id,
			type: 'test-shape',
			x: 20,
			y: 20,
			props: { w: 40, h: 40, x: 0, y: 0 },
		})

		editor.createShape({
			id: shape3Id,
			type: 'test-shape',
			x: 10,
			y: 10,
			props: { w: 20, h: 20, x: 0, y: 0 },
		})

		const renderingShapes = editor.getUnorderedRenderingShapes(false)
		const testShapes = renderingShapes.filter((s) => [shape1Id, shape2Id, shape3Id].includes(s.id))

		const result = getExportDefaultBounds(editor, testShapes, 32, null)

		expect(result).toBeInstanceOf(Box)
		// Raw bounds would be (0,0) to (60,60), with 32px padding on all sides
		expect(result?.x).toBe(0 - 32) // -32
		expect(result?.y).toBe(0 - 32) // -32
		expect(result?.w).toBe(60 + 64) // 124 (32px on each side)
		expect(result?.h).toBe(60 + 64) // 124 (32px on each side)
	})

	it('handles complex geometry with multiple shapes', () => {
		const shape1Id = createShapeId('shape1')
		const shape2Id = createShapeId('shape2')
		const shape3Id = createShapeId('shape3')

		// Create shapes with different positions and sizes
		editor.createShape({
			id: shape1Id,
			type: 'test-shape',
			x: 0,
			y: 0,
			props: { w: 50, h: 50, x: 0, y: 0 },
		})

		editor.createShape({
			id: shape2Id,
			type: 'test-shape',
			x: 100,
			y: 100,
			props: { w: 60, h: 40, x: 0, y: 0 },
		})

		editor.createShape({
			id: shape3Id,
			type: 'test-shape',
			x: 200,
			y: 50,
			props: { w: 40, h: 80, x: 0, y: 0 },
		})

		const renderingShapes = editor.getUnorderedRenderingShapes(false)
		const testShapes = renderingShapes.filter((s) => [shape1Id, shape2Id, shape3Id].includes(s.id))

		const result = getExportDefaultBounds(editor, testShapes, 32, null)

		expect(result).toBeInstanceOf(Box)

		// The bounds should encompass:
		// - shape1: (0, 0) to (50, 50)
		// - shape2: (100, 100) to (160, 140)
		// - shape3: (200, 50) to (240, 130)
		// Raw total bounds: (0, 0) to (240, 140), with 32px padding on all sides
		expect(result!.x).toBe(0 - 32) // -32 (leftmost edge with padding)
		expect(result!.y).toBe(0 - 32) // -32 (topmost edge with padding)
		expect(result!.w).toBe(240 + 64) // 304 (width + 32px on each side)
		expect(result!.h).toBe(140 + 64) // 204 (height + 32px on each side)
	})

	it('handles empty rendering shapes array after filtering', () => {
		// Create a shape but don't include it in rendering shapes
		const shapeId = createShapeId('test1')
		editor.createShape({
			id: shapeId,
			type: 'test-shape',
			x: 10,
			y: 20,
			props: { w: 100, h: 80, x: 0, y: 0 },
		})

		// Pass empty array to simulate filtered out shapes
		const result = getExportDefaultBounds(editor, [], 32, null)

		expect(result).toBeNull()
	})

	it('does not apply padding when exporting single frame shape', () => {
		const shapeId = createShapeId('test1')
		editor.createShape({
			id: shapeId,
			type: 'test-shape',
			x: 10,
			y: 20,
			props: { w: 100, h: 80, x: 0, y: 0 },
		})

		const renderingShapes = editor.getUnorderedRenderingShapes(false)
		const testShape = renderingShapes.find((s) => s.id === shapeId)!

		// Pass the shape ID as singleFrameShapeId to simulate single frame export
		const result = getExportDefaultBounds(editor, [testShape], 32, shapeId)

		expect(result).toBeInstanceOf(Box)
		// No padding should be applied
		expect(result?.x).toBe(10)
		expect(result?.y).toBe(20)
		expect(result?.w).toBe(100)
		expect(result?.h).toBe(80)
	})

	describe('isExportBoundsContainer behavior', () => {
		it('applies normal padding when no container shapes exist', () => {
			const shape1Id = createShapeId('shape1')
			const shape2Id = createShapeId('shape2')

			editor.createShape({
				id: shape1Id,
				type: 'test-shape',
				x: 0,
				y: 0,
				props: { w: 50, h: 50, x: 0, y: 0, isContainer: false },
			})

			editor.createShape({
				id: shape2Id,
				type: 'test-shape',
				x: 10,
				y: 10,
				props: { w: 30, h: 30, x: 0, y: 0, isContainer: false },
			})

			const renderingShapes = editor.getUnorderedRenderingShapes(false)
			const testShapes = renderingShapes.filter((s) => [shape1Id, shape2Id].includes(s.id))

			const result = getExportDefaultBounds(editor, testShapes, 32, null)

			expect(result).toBeInstanceOf(Box)
			// Raw bounds: (0,0) to (50,50), with padding
			expect(result?.x).toBe(-32)
			expect(result?.y).toBe(-32)
			expect(result?.w).toBe(50 + 64) // 114
			expect(result?.h).toBe(50 + 64) // 114
		})

		it('skips padding when container shape contains all other shapes', () => {
			const containerId = createShapeId('container')
			const shape1Id = createShapeId('shape1')
			const shape2Id = createShapeId('shape2')

			// Container shape that encompasses everything
			editor.createShape({
				id: containerId,
				type: 'test-shape',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, x: 0, y: 0, isContainer: true },
			})

			// Smaller shapes inside the container
			editor.createShape({
				id: shape1Id,
				type: 'test-shape',
				x: 10,
				y: 10,
				props: { w: 20, h: 20, x: 0, y: 0, isContainer: false },
			})

			editor.createShape({
				id: shape2Id,
				type: 'test-shape',
				x: 60,
				y: 60,
				props: { w: 30, h: 30, x: 0, y: 0, isContainer: false },
			})

			const renderingShapes = editor.getUnorderedRenderingShapes(false)
			const testShapes = renderingShapes.filter((s) =>
				[containerId, shape1Id, shape2Id].includes(s.id)
			)

			const result = getExportDefaultBounds(editor, testShapes, 32, null)

			expect(result).toBeInstanceOf(Box)
			// Should use container bounds without padding: (0,0) to (100,100)
			expect(result?.x).toBe(0)
			expect(result?.y).toBe(0)
			expect(result?.w).toBe(100)
			expect(result?.h).toBe(100)
		})

		it('applies padding when container does not contain all shapes', () => {
			const containerId = createShapeId('container')
			const insideShapeId = createShapeId('inside')
			const outsideShapeId = createShapeId('outside')

			// Small container
			editor.createShape({
				id: containerId,
				type: 'test-shape',
				x: 0,
				y: 0,
				props: { w: 50, h: 50, x: 0, y: 0, isContainer: true },
			})

			// Shape inside container
			editor.createShape({
				id: insideShapeId,
				type: 'test-shape',
				x: 10,
				y: 10,
				props: { w: 20, h: 20, x: 0, y: 0, isContainer: false },
			})

			// Shape outside container bounds
			editor.createShape({
				id: outsideShapeId,
				type: 'test-shape',
				x: 70,
				y: 70,
				props: { w: 30, h: 30, x: 0, y: 0, isContainer: false },
			})

			const renderingShapes = editor.getUnorderedRenderingShapes(false)
			const testShapes = renderingShapes.filter((s) =>
				[containerId, insideShapeId, outsideShapeId].includes(s.id)
			)

			const result = getExportDefaultBounds(editor, testShapes, 32, null)

			expect(result).toBeInstanceOf(Box)
			// Total bounds: (0,0) to (100,100), with padding applied
			expect(result?.x).toBe(-32)
			expect(result?.y).toBe(-32)
			expect(result?.w).toBe(100 + 64) // 164
			expect(result?.h).toBe(100 + 64) // 164
		})

		it('works with multiple containers where one contains all', () => {
			const container1Id = createShapeId('container1')
			const container2Id = createShapeId('container2')
			const shapeId = createShapeId('shape1')

			// Small container
			editor.createShape({
				id: container1Id,
				type: 'test-shape',
				x: 10,
				y: 10,
				props: { w: 40, h: 40, x: 0, y: 0, isContainer: true },
			})

			// Large container that contains everything
			editor.createShape({
				id: container2Id,
				type: 'test-shape',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, x: 0, y: 0, isContainer: true },
			})

			// Shape inside both containers
			editor.createShape({
				id: shapeId,
				type: 'test-shape',
				x: 20,
				y: 20,
				props: { w: 10, h: 10, x: 0, y: 0, isContainer: false },
			})

			const renderingShapes = editor.getUnorderedRenderingShapes(false)
			const testShapes = renderingShapes.filter((s) =>
				[container1Id, container2Id, shapeId].includes(s.id)
			)

			const result = getExportDefaultBounds(editor, testShapes, 32, null)

			expect(result).toBeInstanceOf(Box)
			// Should use the large container's bounds without padding
			expect(result?.x).toBe(0)
			expect(result?.y).toBe(0)
			expect(result?.w).toBe(100)
			expect(result?.h).toBe(100)
		})

		it('container behavior is overridden by single frame shape', () => {
			const containerId = createShapeId('container')
			const shapeId = createShapeId('shape1')

			// Container that would normally prevent padding
			editor.createShape({
				id: containerId,
				type: 'test-shape',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, x: 0, y: 0, isContainer: true },
			})

			// Shape inside container
			editor.createShape({
				id: shapeId,
				type: 'test-shape',
				x: 10,
				y: 10,
				props: { w: 20, h: 20, x: 0, y: 0, isContainer: false },
			})

			const renderingShapes = editor.getUnorderedRenderingShapes(false)
			const testShapes = renderingShapes.filter((s) => [containerId, shapeId].includes(s.id))

			// Single frame shape logic takes precedence over container logic
			const result = getExportDefaultBounds(editor, testShapes, 32, containerId)

			expect(result).toBeInstanceOf(Box)
			// Should use total bounds without padding (single frame overrides container)
			expect(result?.x).toBe(0)
			expect(result?.y).toBe(0)
			expect(result?.w).toBe(100)
			expect(result?.h).toBe(100)
		})

		it('handles containers with inner shapes correctly', () => {
			const containerId = createShapeId('container')
			const innerShapeId = createShapeId('inner')

			// Container shape large enough to contain inner shape
			editor.createShape({
				id: containerId,
				type: 'test-shape',
				x: 0,
				y: 0,
				props: { w: 200, h: 120, x: 0, y: 0, isContainer: true },
			})

			// Shape inside container bounds
			editor.createShape({
				id: innerShapeId,
				type: 'test-shape',
				x: 50,
				y: 20,
				props: { w: 100, h: 60, x: 0, y: 0, isContainer: false },
			})

			const renderingShapes = editor.getUnorderedRenderingShapes(false)
			const testShapes = renderingShapes.filter((s) => [containerId, innerShapeId].includes(s.id))

			const result = getExportDefaultBounds(editor, testShapes, 32, null)

			expect(result).toBeInstanceOf(Box)
			// Container (0,0,200,120) should contain inner shape bounds,
			// so no padding should be applied
			expect(result?.x).toBe(0)
			expect(result?.y).toBe(0)
			expect(result?.w).toBe(200)
			expect(result?.h).toBe(120)
		})

		it('handles order sensitivity - container processed first', () => {
			const containerId = createShapeId('container')
			const shapeId = createShapeId('shape')

			// Create container first (will be processed first due to creation order)
			editor.createShape({
				id: containerId,
				type: 'test-shape',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, x: 0, y: 0, isContainer: true },
			})

			// Create regular shape second
			editor.createShape({
				id: shapeId,
				type: 'test-shape',
				x: 20,
				y: 20,
				props: { w: 30, h: 30, x: 0, y: 0, isContainer: false },
			})

			const renderingShapes = editor.getUnorderedRenderingShapes(false)
			const testShapes = renderingShapes.filter((s) => [containerId, shapeId].includes(s.id))

			const result = getExportDefaultBounds(editor, testShapes, 32, null)

			expect(result).toBeInstanceOf(Box)
			// Container should contain regular shape, no padding applied
			expect(result?.x).toBe(0)
			expect(result?.y).toBe(0)
			expect(result?.w).toBe(100)
			expect(result?.h).toBe(100)
		})

		it('handles order sensitivity - regular shape processed first', () => {
			const shapeId = createShapeId('shape')
			const containerId = createShapeId('container')

			// Create regular shape first (will be processed first due to creation order)
			editor.createShape({
				id: shapeId,
				type: 'test-shape',
				x: 20,
				y: 20,
				props: { w: 30, h: 30, x: 0, y: 0, isContainer: false },
			})

			// Create container second
			editor.createShape({
				id: containerId,
				type: 'test-shape',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, x: 0, y: 0, isContainer: true },
			})

			const renderingShapes = editor.getUnorderedRenderingShapes(false)
			const testShapes = renderingShapes.filter((s) => [shapeId, containerId].includes(s.id))

			const result = getExportDefaultBounds(editor, testShapes, 32, null)

			expect(result).toBeInstanceOf(Box)
			// Container should still contain regular shape, no padding applied
			expect(result?.x).toBe(0)
			expect(result?.y).toBe(0)
			expect(result?.w).toBe(100)
			expect(result?.h).toBe(100)
		})

		it('multiple containers - only one that contains all others skips padding', () => {
			const smallContainerId = createShapeId('smallContainer')
			const largeContainerId = createShapeId('largeContainer')
			const shapeId = createShapeId('shape')

			// Small container
			editor.createShape({
				id: smallContainerId,
				type: 'test-shape',
				x: 10,
				y: 10,
				props: { w: 30, h: 30, x: 0, y: 0, isContainer: true },
			})

			// Large container that contains the small container AND the regular shape
			editor.createShape({
				id: largeContainerId,
				type: 'test-shape',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, x: 0, y: 0, isContainer: true },
			})

			// Regular shape inside both containers
			editor.createShape({
				id: shapeId,
				type: 'test-shape',
				x: 15,
				y: 15,
				props: { w: 10, h: 10, x: 0, y: 0, isContainer: false },
			})

			const renderingShapes = editor.getUnorderedRenderingShapes(false)
			const testShapes = renderingShapes.filter((s) =>
				[smallContainerId, largeContainerId, shapeId].includes(s.id)
			)

			const result = getExportDefaultBounds(editor, testShapes, 32, null)

			expect(result).toBeInstanceOf(Box)
			// Large container contains everything (including small container), no padding
			expect(result?.x).toBe(0)
			expect(result?.y).toBe(0)
			expect(result?.w).toBe(100)
			expect(result?.h).toBe(100)
		})

		it('multiple containers - none contains all others, padding applied', () => {
			const container1Id = createShapeId('container1')
			const container2Id = createShapeId('container2')
			const shape1Id = createShapeId('shape1')
			const shape2Id = createShapeId('shape2')

			// Container 1 contains shape1 but not container2 or shape2
			editor.createShape({
				id: container1Id,
				type: 'test-shape',
				x: 0,
				y: 0,
				props: { w: 40, h: 40, x: 0, y: 0, isContainer: true },
			})

			// Container 2 contains shape2 but not container1 or shape1
			editor.createShape({
				id: container2Id,
				type: 'test-shape',
				x: 60,
				y: 60,
				props: { w: 40, h: 40, x: 0, y: 0, isContainer: true },
			})

			// Shape inside container1
			editor.createShape({
				id: shape1Id,
				type: 'test-shape',
				x: 10,
				y: 10,
				props: { w: 20, h: 20, x: 0, y: 0, isContainer: false },
			})

			// Shape inside container2
			editor.createShape({
				id: shape2Id,
				type: 'test-shape',
				x: 70,
				y: 70,
				props: { w: 20, h: 20, x: 0, y: 0, isContainer: false },
			})

			const renderingShapes = editor.getUnorderedRenderingShapes(false)
			const testShapes = renderingShapes.filter((s) =>
				[container1Id, container2Id, shape1Id, shape2Id].includes(s.id)
			)

			const result = getExportDefaultBounds(editor, testShapes, 32, null)

			expect(result).toBeInstanceOf(Box)
			// No single container contains all others, padding should be applied
			// Total bounds: (0,0) to (100,100), with padding
			expect(result?.x).toBe(-32)
			expect(result?.y).toBe(-32)
			expect(result?.w).toBe(100 + 64) // 164
			expect(result?.h).toBe(100 + 64) // 164
		})

		it('container covers most but not all shapes - padding applied', () => {
			const containerId = createShapeId('container')
			const insideShapeId = createShapeId('inside')
			const partiallyOutsideId = createShapeId('partiallyOutside')

			// Container
			editor.createShape({
				id: containerId,
				type: 'test-shape',
				x: 0,
				y: 0,
				props: { w: 80, h: 80, x: 0, y: 0, isContainer: true },
			})

			// Shape fully inside container
			editor.createShape({
				id: insideShapeId,
				type: 'test-shape',
				x: 20,
				y: 20,
				props: { w: 20, h: 20, x: 0, y: 0, isContainer: false },
			})

			// Shape that partially extends outside container
			editor.createShape({
				id: partiallyOutsideId,
				type: 'test-shape',
				x: 70,
				y: 70,
				props: { w: 20, h: 20, x: 0, y: 0, isContainer: false },
			})

			const renderingShapes = editor.getUnorderedRenderingShapes(false)
			const testShapes = renderingShapes.filter((s) =>
				[containerId, insideShapeId, partiallyOutsideId].includes(s.id)
			)

			const result = getExportDefaultBounds(editor, testShapes, 32, null)

			expect(result).toBeInstanceOf(Box)
			// Container doesn't contain all shapes, padding applied
			// Total bounds: (0,0) to (90,90), with padding
			expect(result?.x).toBe(-32)
			expect(result?.y).toBe(-32)
			expect(result?.w).toBe(90 + 64) // 154
			expect(result?.h).toBe(90 + 64) // 154
		})

		it('nested containers - inner container processed first', () => {
			const outerContainerId = createShapeId('outerContainer')
			const innerContainerId = createShapeId('innerContainer')
			const shapeId = createShapeId('shape')

			// Inner container (created first)
			editor.createShape({
				id: innerContainerId,
				type: 'test-shape',
				x: 20,
				y: 20,
				props: { w: 40, h: 40, x: 0, y: 0, isContainer: true },
			})

			// Outer container that contains inner container
			editor.createShape({
				id: outerContainerId,
				type: 'test-shape',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, x: 0, y: 0, isContainer: true },
			})

			// Shape inside inner container
			editor.createShape({
				id: shapeId,
				type: 'test-shape',
				x: 30,
				y: 30,
				props: { w: 20, h: 20, x: 0, y: 0, isContainer: false },
			})

			const renderingShapes = editor.getUnorderedRenderingShapes(false)
			const testShapes = renderingShapes.filter((s) =>
				[innerContainerId, outerContainerId, shapeId].includes(s.id)
			)

			const result = getExportDefaultBounds(editor, testShapes, 32, null)

			expect(result).toBeInstanceOf(Box)
			// Outer container contains everything, should use outer bounds without padding
			expect(result?.x).toBe(0)
			expect(result?.y).toBe(0)
			expect(result?.w).toBe(100)
			expect(result?.h).toBe(100)
		})

		it('container-only shapes should not skip padding', () => {
			const container1Id = createShapeId('container1')
			const container2Id = createShapeId('container2')

			// Two containers, neither containing the other completely
			editor.createShape({
				id: container1Id,
				type: 'test-shape',
				x: 0,
				y: 0,
				props: { w: 50, h: 50, x: 0, y: 0, isContainer: true },
			})

			editor.createShape({
				id: container2Id,
				type: 'test-shape',
				x: 30,
				y: 30,
				props: { w: 50, h: 50, x: 0, y: 0, isContainer: true },
			})

			const renderingShapes = editor.getUnorderedRenderingShapes(false)
			const testShapes = renderingShapes.filter((s) => [container1Id, container2Id].includes(s.id))

			const result = getExportDefaultBounds(editor, testShapes, 32, null)

			expect(result).toBeInstanceOf(Box)
			// Neither container fully contains the other, padding should be applied
			// Total bounds: (0,0) to (80,80), with padding
			expect(result?.x).toBe(-32)
			expect(result?.y).toBe(-32)
			expect(result?.w).toBe(80 + 64) // 144
			expect(result?.h).toBe(80 + 64) // 144
		})

		it('single container with only itself skips padding', () => {
			const containerId = createShapeId('container')

			// Single container shape
			editor.createShape({
				id: containerId,
				type: 'test-shape',
				x: 10,
				y: 20,
				props: { w: 100, h: 80, x: 0, y: 0, isContainer: true },
			})

			const renderingShapes = editor.getUnorderedRenderingShapes(false)
			const testShapes = renderingShapes.filter((s) => s.id === containerId)

			const result = getExportDefaultBounds(editor, testShapes, 32, null)

			expect(result).toBeInstanceOf(Box)
			// Single container should skip padding (it trivially contains "all other shapes")
			expect(result?.x).toBe(10)
			expect(result?.y).toBe(20)
			expect(result?.w).toBe(100)
			expect(result?.h).toBe(80)
		})
	})
})
