import { TLDrawShape, TLHighlightShape, last } from '@tldraw/editor'
import { TestEditor } from './TestEditor'
import { TEST_DRAW_SHAPE_SCREEN_POINTS } from './drawing.data'

jest.useFakeTimers()

let editor: TestEditor

afterEach(() => {
	editor?.dispose()
})

beforeEach(() => {
	editor = new TestEditor()

	editor.createShapes([])
})

type DrawableShape = TLDrawShape | TLHighlightShape

for (const toolType of ['draw', 'highlight'] as const) {
	describe(`When ${toolType}ing...`, () => {
		it('Creates a dot', () => {
			editor
				.setCurrentTool(toolType)
				.pointerDown(60, 60)
				.expectToBeIn(`${toolType}.drawing`)
				.pointerUp()
				.expectToBeIn(`${toolType}.idle`)

			expect(editor.getCurrentPageShapes()).toHaveLength(1)

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			expect(shape.type).toBe(toolType)
			expect(shape.props.segments.length).toBe(1)

			const segment = shape.props.segments[0]
			expect(segment.type).toBe('free')
		})

		it('Creates a dot when shift is held down', () => {
			editor
				.setCurrentTool(toolType)
				.keyDown('Shift')
				.pointerDown(60, 60)
				.expectToBeIn(`${toolType}.drawing`)
				.pointerUp()
				.expectToBeIn(`${toolType}.idle`)

			expect(editor.getCurrentPageShapes()).toHaveLength(1)

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			expect(shape.type).toBe(toolType)
			expect(shape.props.segments.length).toBe(1)

			const segment = shape.props.segments[0]
			expect(segment.type).toBe('straight')
		})

		it('Creates a free draw line when shift is not held', () => {
			editor.setCurrentTool(toolType).pointerDown(10, 10).pointerMove(20, 20)

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			expect(shape.props.segments.length).toBe(1)

			const segment = shape.props.segments[0]
			expect(segment.type).toBe('free')
		})

		it('Creates a straight line when shift is held', () => {
			editor.setCurrentTool(toolType).keyDown('Shift').pointerDown(10, 10).pointerMove(20, 20)

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			expect(shape.props.segments.length).toBe(1)

			const segment = shape.props.segments[0]
			expect(segment.type).toBe('straight')

			const points = segment.points
			expect(points.length).toBe(2)
		})

		it('Switches between segment types when shift is pressed / released  (starting with shift up)', () => {
			editor
				.setCurrentTool(toolType)
				.pointerDown(10, 10)
				.pointerMove(20, 20)
				.keyDown('Shift')
				.pointerMove(30, 30)
				.keyUp('Shift')
				.pointerMove(40, 40)
				.pointerUp()

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			expect(shape.props.segments.length).toBe(3)

			expect(shape.props.segments[0].type).toBe('free')
			expect(shape.props.segments[1].type).toBe('straight')
			expect(shape.props.segments[2].type).toBe('free')
		})

		it('Switches between segment types when shift is pressed / released (starting with shift down)', () => {
			editor
				.setCurrentTool(toolType)
				.keyDown('Shift')
				.pointerDown(10, 10)
				.pointerMove(20, 20)
				.keyUp('Shift')
				.pointerMove(30, 30)
				.keyDown('Shift')
				.pointerMove(40, 40)
				.pointerUp()

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			expect(shape.props.segments.length).toBe(3)

			expect(shape.props.segments[0].type).toBe('straight')
			expect(shape.props.segments[1].type).toBe('free')
			expect(shape.props.segments[2].type).toBe('straight')
		})

		it('Extends previously drawn line when shift is held', () => {
			editor
				.setCurrentTool(toolType)
				.keyDown('Shift')
				.pointerDown(10, 10)
				.pointerUp()
				.pointerDown(20, 20)

			const shape1 = editor.getCurrentPageShapes()[0] as DrawableShape
			expect(shape1.props.segments.length).toBe(2)
			expect(shape1.props.segments[0].type).toBe('straight')
			expect(shape1.props.segments[1].type).toBe('straight')

			editor.pointerUp().pointerDown(30, 30).pointerUp()

			const shape2 = editor.getCurrentPageShapes()[0] as DrawableShape
			expect(shape2.props.segments.length).toBe(3)
			expect(shape2.props.segments[2].type).toBe('straight')
		})

		it('Does not extends previously drawn line after switching to another tool', () => {
			editor
				.setCurrentTool(toolType)
				.pointerDown(10, 10)
				.pointerUp()
				.setCurrentTool('select')
				.setCurrentTool(toolType)
				.keyDown('Shift')
				.pointerDown(20, 20)
				.pointerMove(30, 30)

			expect(editor.getCurrentPageShapes()).toHaveLength(2)

			const shape1 = editor.getCurrentPageShapes()[0] as DrawableShape
			expect(shape1.props.segments.length).toBe(1)
			expect(shape1.props.segments[0].type).toBe('free')

			const shape2 = editor.getCurrentPageShapes()[1] as DrawableShape
			expect(shape2.props.segments.length).toBe(1)
			expect(shape2.props.segments[0].type).toBe('straight')
		})

		it('Snaps to 15 degree angle when shift is held', () => {
			const magnitude = 10
			const angle = (17 * Math.PI) / 180
			const x = magnitude * Math.cos(angle)
			const y = magnitude * Math.sin(angle)

			const snappedAngle = (15 * Math.PI) / 180
			const snappedX = magnitude * Math.cos(snappedAngle)
			const snappedY = magnitude * Math.sin(snappedAngle)

			editor.setCurrentTool(toolType).keyDown('Shift').pointerDown(0, 0).pointerMove(x, y)

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			const segment = shape.props.segments[0]
			expect(segment.points[1].x).toBeCloseTo(snappedX)
			expect(segment.points[1].y).toBeCloseTo(snappedY)
		})

		it('Doesnt snap to 15 degree angle when cmd is held', () => {
			const magnitude = 10
			const angle = (17 * Math.PI) / 180
			const x = magnitude * Math.cos(angle)
			const y = magnitude * Math.sin(angle)

			editor.setCurrentTool(toolType).keyDown('Meta').pointerDown(0, 0).pointerMove(x, y)

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			const segment = shape.props.segments[0]
			expect(segment.points[1].x).toBeCloseTo(x)
			expect(segment.points[1].y).toBeCloseTo(y)
		})

		it('Snaps to start or end of straight segments in self when shift + cmd is held', () => {
			editor
				.setCurrentTool(toolType)
				.keyDown('Shift')
				.pointerDown(0, 0)
				.pointerUp()
				.pointerDown(0, 10)
				.pointerUp()
				.pointerDown(10, 0)
				.pointerUp()
				.pointerDown(10, 0)
				.pointerMove(1, 0) // very close to first point

			const shape1 = editor.getCurrentPageShapes()[0] as DrawableShape
			const segment1 = last(shape1.props.segments)!
			const point1 = last(segment1.points)!
			expect(point1.x).toBe(1)

			editor.keyDown('Meta')
			const shape2 = editor.getCurrentPageShapes()[0] as DrawableShape
			const segment2 = last(shape2.props.segments)!
			const point2 = last(segment2.points)!
			expect(point2.x).toBe(0)
		})

		it('Snaps to position along straight segments in self when shift + cmd is held', () => {
			editor
				.setCurrentTool(toolType)
				.keyDown('Shift')
				.pointerDown(0, 0)
				.pointerUp()
				.pointerDown(0, 10)
				.pointerUp()
				.pointerDown(10, 5)
				.pointerUp()
				.pointerDown(10, 5)
				.pointerMove(1, 5)

			const shape1 = editor.getCurrentPageShapes()[0] as DrawableShape
			const segment1 = last(shape1.props.segments)!
			const point1 = last(segment1.points)!
			expect(point1.x).toBe(1)

			editor.keyDown('Meta')
			const shape2 = editor.getCurrentPageShapes()[0] as DrawableShape
			const segment2 = last(shape2.props.segments)!
			const point2 = last(segment2.points)!
			expect(point2.x).toBe(0)
		})

		it('Deletes very short lines on interrupt', () => {
			editor.setCurrentTool(toolType).pointerDown(0, 0).pointerMove(0.1, 0.1).interrupt()
			expect(editor.getCurrentPageShapes()).toHaveLength(0)
		})

		it('Does not delete longer lines on interrupt', () => {
			editor.setCurrentTool(toolType).pointerDown(0, 0).pointerMove(5, 5).interrupt()
			expect(editor.getCurrentPageShapes()).toHaveLength(1)
		})

		it('Completes on cancel', () => {
			editor.setCurrentTool(toolType).pointerDown(0, 0).pointerMove(5, 5).cancel()
			expect(editor.getCurrentPageShapes()).toHaveLength(1)
			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			expect(shape.props.segments.length).toBe(1)
		})

		// New tests for pressure system
		it('Omits pressure property when no pressure is provided', () => {
			editor.setCurrentTool(toolType).pointerDown(10, 10, { pointerId: 1 }).pointerUp()

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			const point = shape.props.segments[0].points[0]
			
			// Point should not have z property when no pressure provided
			expect(point.z).toBeUndefined()
		})

		it('Stores pressure as integer 0-100 when pressure is provided', () => {
			// Simulate pen input with pressure
			editor.setCurrentTool(toolType).pointerDown(10, 10, { 
				pointerId: 1, 
				isPen: true,
				point: { x: 10, y: 10, z: 0.8 } // 80% pressure
			}).pointerUp()

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			const point = shape.props.segments[0].points[0]
			
			// Should convert 0.8 * 1.25 * 100 = 100 (clamped)
			expect(point.z).toBe(100)
			expect(Number.isInteger(point.z!)).toBe(true)
		})

		it('Handles low pressure values correctly', () => {
			// Simulate pen input with low pressure
			editor.setCurrentTool(toolType).pointerDown(10, 10, { 
				pointerId: 1, 
				isPen: true,
				point: { x: 10, y: 10, z: 0.3 } // 30% pressure
			}).pointerUp()

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			const point = shape.props.segments[0].points[0]
			
			// Should convert 0.3 * 1.25 * 100 = 37.5 -> 38 (rounded)
			expect(point.z).toBe(38)
			expect(Number.isInteger(point.z!)).toBe(true)
		})

		it('Clamps pressure values to 0-100 range', () => {
			// Simulate pen input with very high pressure that would exceed 100
			editor.setCurrentTool(toolType).pointerDown(10, 10, { 
				pointerId: 1, 
				isPen: true,
				point: { x: 10, y: 10, z: 0.9 } // 90% pressure
			}).pointerUp()

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			const point = shape.props.segments[0].points[0]
			
			// Should convert 0.9 * 1.25 * 100 = 112.5 -> 100 (clamped)
			expect(point.z).toBe(100)
			expect(Number.isInteger(point.z!)).toBe(true)
		})
	})
}

it('Draws a bunch', () => {
	editor.setCurrentTool('draw').setCamera({ x: 0, y: 0, z: 1 })

	const [first, ...rest] = TEST_DRAW_SHAPE_SCREEN_POINTS
	editor.pointerMove(first.x, first.y).pointerDown()

	for (const point of rest) {
		editor.pointerMove(point.x, point.y)
	}

	editor.pointerUp()
	editor.selectAll()

	const shape = { ...editor.getLastCreatedShape() }
	// @ts-expect-error
	delete shape.id
	expect(shape).toMatchSnapshot('draw shape')
})
