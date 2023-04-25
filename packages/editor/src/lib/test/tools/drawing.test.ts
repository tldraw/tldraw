import { TLDrawShape } from '@tldraw/tlschema'
import { last } from '@tldraw/utils'
import { TestApp } from '../TestApp'

jest.useFakeTimers()

let app: TestApp

afterEach(() => {
	app?.dispose()
})

beforeEach(() => {
	app = new TestApp()

	app.createShapes([])
})

describe('When drawing...', () => {
	it('Creates a dot', () => {
		app
			.setSelectedTool('draw')
			.pointerDown(60, 60)
			.expectToBeIn('draw.drawing')
			.pointerUp()
			.expectToBeIn('draw.idle')

		expect(app.shapesArray).toHaveLength(1)

		const shape = app.shapesArray[0] as TLDrawShape
		expect(shape.props.segments.length).toBe(1)

		const segment = shape.props.segments[0]
		expect(segment.type).toBe('free')
	})

	it('Creates a dot when shift is held down', () => {
		app
			.setSelectedTool('draw')
			.keyDown('Shift')
			.pointerDown(60, 60)
			.expectToBeIn('draw.drawing')
			.pointerUp()
			.expectToBeIn('draw.idle')

		expect(app.shapesArray).toHaveLength(1)

		const shape = app.shapesArray[0] as TLDrawShape
		expect(shape.props.segments.length).toBe(1)

		const segment = shape.props.segments[0]
		expect(segment.type).toBe('straight')
	})

	it('Creates a free draw line when shift is not held', () => {
		app.setSelectedTool('draw').pointerDown(10, 10).pointerMove(20, 20)

		const shape = app.shapesArray[0] as TLDrawShape
		expect(shape.props.segments.length).toBe(1)

		const segment = shape.props.segments[0]
		expect(segment.type).toBe('free')
	})

	it('Creates a straight line when shift is held', () => {
		app.setSelectedTool('draw').keyDown('Shift').pointerDown(10, 10).pointerMove(20, 20)

		const shape = app.shapesArray[0] as TLDrawShape
		expect(shape.props.segments.length).toBe(1)

		const segment = shape.props.segments[0]
		expect(segment.type).toBe('straight')

		const points = segment.points
		expect(points.length).toBe(2)
	})

	it('Switches between segment types when shift is pressed / released  (starting with shift up)', () => {
		app
			.setSelectedTool('draw')
			.pointerDown(10, 10)
			.pointerMove(20, 20)
			.keyDown('Shift')
			.pointerMove(30, 30)
			.keyUp('Shift')
			.pointerMove(40, 40)
			.pointerUp()

		const shape = app.shapesArray[0] as TLDrawShape
		expect(shape.props.segments.length).toBe(3)

		expect(shape.props.segments[0].type).toBe('free')
		expect(shape.props.segments[1].type).toBe('straight')
		expect(shape.props.segments[2].type).toBe('free')
	})

	it('Switches between segment types when shift is pressed / released (starting with shift down)', () => {
		app
			.setSelectedTool('draw')
			.keyDown('Shift')
			.pointerDown(10, 10)
			.pointerMove(20, 20)
			.keyUp('Shift')
			.pointerMove(30, 30)
			.keyDown('Shift')
			.pointerMove(40, 40)
			.pointerUp()

		const shape = app.shapesArray[0] as TLDrawShape
		expect(shape.props.segments.length).toBe(3)

		expect(shape.props.segments[0].type).toBe('straight')
		expect(shape.props.segments[1].type).toBe('free')
		expect(shape.props.segments[2].type).toBe('straight')
	})

	it('Extends previously drawn line when shift is held', () => {
		app.setSelectedTool('draw').keyDown('Shift').pointerDown(10, 10).pointerUp().pointerDown(20, 20)

		const shape1 = app.shapesArray[0] as TLDrawShape
		expect(shape1.props.segments.length).toBe(2)
		expect(shape1.props.segments[0].type).toBe('straight')
		expect(shape1.props.segments[1].type).toBe('straight')

		app.pointerUp().pointerDown(30, 30).pointerUp()

		const shape2 = app.shapesArray[0] as TLDrawShape
		expect(shape2.props.segments.length).toBe(3)
		expect(shape2.props.segments[2].type).toBe('straight')
	})

	it('Does not extends previously drawn line after switching to another tool', () => {
		app
			.setSelectedTool('draw')
			.pointerDown(10, 10)
			.pointerUp()
			.setSelectedTool('select')
			.setSelectedTool('draw')
			.keyDown('Shift')
			.pointerDown(20, 20)
			.pointerMove(30, 30)

		expect(app.shapesArray).toHaveLength(2)

		const shape1 = app.shapesArray[0] as TLDrawShape
		expect(shape1.props.segments.length).toBe(1)
		expect(shape1.props.segments[0].type).toBe('free')

		const shape2 = app.shapesArray[1] as TLDrawShape
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

		app.setSelectedTool('draw').keyDown('Shift').pointerDown(0, 0).pointerMove(x, y)

		const shape = app.shapesArray[0] as TLDrawShape
		const segment = shape.props.segments[0]
		expect(segment.points[1].x).toBeCloseTo(snappedX)
		expect(segment.points[1].y).toBeCloseTo(snappedY)
	})

	it('Doesnt snap to 15 degree angle when cmd is held', () => {
		const magnitude = 10
		const angle = (17 * Math.PI) / 180
		const x = magnitude * Math.cos(angle)
		const y = magnitude * Math.sin(angle)

		app.setSelectedTool('draw').keyDown('Meta').pointerDown(0, 0).pointerMove(x, y)

		const shape = app.shapesArray[0] as TLDrawShape
		const segment = shape.props.segments[0]
		expect(segment.points[1].x).toBeCloseTo(x)
		expect(segment.points[1].y).toBeCloseTo(y)
	})

	it('Snaps to start or end of straight segments in self when shift + cmd is held', () => {
		app
			.setSelectedTool('draw')
			.keyDown('Shift')
			.pointerDown(0, 0)
			.pointerUp()
			.pointerDown(0, 10)
			.pointerUp()
			.pointerDown(10, 0)
			.pointerUp()
			.pointerDown(10, 0)
			.pointerMove(1, 0)

		const shape1 = app.shapesArray[0] as TLDrawShape
		const segment1 = last(shape1.props.segments)!
		const point1 = last(segment1.points)!
		expect(point1.x).toBe(1)

		app.keyDown('Meta')
		const shape2 = app.shapesArray[0] as TLDrawShape
		const segment2 = last(shape2.props.segments)!
		const point2 = last(segment2.points)!
		expect(point2.x).toBe(0)
	})

	it('Snaps to position along straight segments in self when shift + cmd is held', () => {
		app
			.setSelectedTool('draw')
			.keyDown('Shift')
			.pointerDown(0, 0)
			.pointerUp()
			.pointerDown(0, 10)
			.pointerUp()
			.pointerDown(10, 5)
			.pointerUp()
			.pointerDown(10, 5)
			.pointerMove(1, 5)

		const shape1 = app.shapesArray[0] as TLDrawShape
		const segment1 = last(shape1.props.segments)!
		const point1 = last(segment1.points)!
		expect(point1.x).toBe(1)

		app.keyDown('Meta')
		const shape2 = app.shapesArray[0] as TLDrawShape
		const segment2 = last(shape2.props.segments)!
		const point2 = last(segment2.points)!
		expect(point2.x).toBe(0)
	})

	it('Deletes very short lines on interrupt', () => {
		app.setSelectedTool('draw').pointerDown(0, 0).pointerMove(0.1, 0.1).interrupt()
		expect(app.shapesArray).toHaveLength(0)
	})

	it('Does not delete longer lines on interrupt', () => {
		app.setSelectedTool('draw').pointerDown(0, 0).pointerMove(5, 5).interrupt()
		expect(app.shapesArray).toHaveLength(1)
	})

	it('Completes on cancel', () => {
		app.setSelectedTool('draw').pointerDown(0, 0).pointerMove(5, 5).cancel()
		expect(app.shapesArray).toHaveLength(1)
		const shape = app.shapesArray[0] as TLDrawShape
		expect(shape.props.segments.length).toBe(1)
	})
})
