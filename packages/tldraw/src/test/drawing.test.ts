import { TLDrawShape, TLHighlightShape, last } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'
import { TEST_DRAW_SHAPE_SCREEN_POINTS } from './drawing.data'

vi.useFakeTimers()

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

			// For straight segments, points should contain deltas (2 numbers for non-pen, 3 for pen)
			const isPen = segment.firstPoint.z !== undefined
			expect(segment.points.length).toBe(isPen ? 3 : 2)
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
			// Reconstruct the last point from firstPoint + deltas
			const dx = segment.points[0] / 10
			const dy = segment.points[1] / 10
			const lastX = segment.firstPoint.x + dx
			const lastY = segment.firstPoint.y + dy
			// Use 1 decimal place tolerance (0.05) to account for rounding errors from Math.round(dx * 10)
			expect(lastX).toBeCloseTo(snappedX, 1)
			expect(lastY).toBeCloseTo(snappedY, 1)
		})

		it('Doesnt snap to 15 degree angle when cmd is held', () => {
			const magnitude = 10
			const angle = (17 * Math.PI) / 180
			const x = magnitude * Math.cos(angle)
			const y = magnitude * Math.sin(angle)

			editor.setCurrentTool(toolType).keyDown('Meta').pointerDown(0, 0).pointerMove(x, y)

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			const segment = shape.props.segments[0]
			// Reconstruct the last point from firstPoint + deltas
			const dx = segment.points[0] / 10
			const dy = segment.points[1] / 10
			const lastX = segment.firstPoint.x + dx
			const lastY = segment.firstPoint.y + dy
			// Use 1 decimal place tolerance (0.05) to account for rounding errors from Math.round(dx * 10)
			expect(lastX).toBeCloseTo(x, 1)
			expect(lastY).toBeCloseTo(y, 1)
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
			// Reconstruct last point from firstPoint + deltas
			const dx1 = segment1.points[0] / 10
			const point1X = segment1.firstPoint.x + dx1
			expect(point1X).toBe(1)

			editor.keyDown('Meta')
			const shape2 = editor.getCurrentPageShapes()[0] as DrawableShape
			const segment2 = last(shape2.props.segments)!
			// Reconstruct last point from firstPoint + deltas
			const dx2 = segment2.points[0] / 10
			const point2X = segment2.firstPoint.x + dx2
			expect(point2X).toBe(0)
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
			// Reconstruct last point from firstPoint + deltas
			const dx1 = segment1.points[0] / 10
			const point1X = segment1.firstPoint.x + dx1
			expect(point1X).toBe(1)

			editor.keyDown('Meta')
			const shape2 = editor.getCurrentPageShapes()[0] as DrawableShape
			const segment2 = last(shape2.props.segments)!
			// Reconstruct last point from firstPoint + deltas
			const dx2 = segment2.points[0] / 10
			const point2X = segment2.firstPoint.x + dx2
			expect(point2X).toBe(0)
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
