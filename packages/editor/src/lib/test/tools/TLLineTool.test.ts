import { assert } from '@tldraw/utils'
import { TLLineShapeDef } from '../../app/shapeutils/TLLineUtil/TLLineUtil'
import { TestApp } from '../TestApp'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})

it('enters the line state', () => {
	app.setSelectedTool('line')
	expect(app.currentToolId).toBe('line')
	app.expectPathToBe('root.line.idle')
})

describe('When in the idle state', () => {
	it('enters the pointing state and creates a shape on pointer down', () => {
		const shapesBefore = app.shapesArray.length
		app.setSelectedTool('line').pointerDown(0, 0, { target: 'canvas' })
		const shapesAfter = app.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore + 1)
		app.expectPathToBe('root.line.pointing')
	})

	it('returns to select on cancel', () => {
		app.setSelectedTool('line')
		app.cancel()
		app.expectToBeIn('select.idle')
	})
})

describe('When in the pointing state', () => {
	it('createes on pointer up', () => {
		const shapesBefore = app.shapesArray.length
		app.setSelectedTool('line').pointerDown(0, 0, { target: 'canvas' }).pointerUp(0, 0)
		const shapesAfter = app.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore + 1)
		expect(app.hintingIds.length).toBe(0)
		app.expectPathToBe('root.line.idle')
	})

	it('bails on cancel', () => {
		const shapesBefore = app.shapesArray.length
		app.setSelectedTool('line').pointerDown(0, 0, { target: 'canvas' }).cancel()
		const shapesAfter = app.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore)
		expect(app.hintingIds.length).toBe(0)
		app.expectPathToBe('root.line.idle')
	})

	it('enters the dragging state on pointer move', () => {
		app.setSelectedTool('line').pointerDown(0, 0, { target: 'canvas' }).pointerMove(10, 10)
		app.expectPathToBe('root.select.dragging_handle')
	})
})

// This could be moved to dragging_handle
describe('When dragging the line', () => {
	it('updates the line on pointer move', () => {
		app.setSelectedTool('line').pointerDown(0, 0, { target: 'canvas' }).pointerMove(10, 10)
		const line = app.shapesArray[app.shapesArray.length - 1]
		app.expectShapeToMatch(line, {
			id: line.id,
			type: 'line',
			x: 0,
			y: 0,
			props: {
				handles: {
					start: { id: 'start', index: 'a1', type: 'vertex', x: 0, y: 0 },
					end: { id: 'end', index: 'a2', type: 'vertex', x: 10, y: 10 },
				},
			},
		})
		app.expectPathToBe('root.select.dragging_handle')
	})

	it('returns to select.idle, keeping shape, on pointer up', () => {
		const shapesBefore = app.shapesArray.length
		app
			.setSelectedTool('line')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
		const shapesAfter = app.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore + 1)
		expect(app.hintingIds.length).toBe(0)
		app.expectPathToBe('root.select.idle')
	})

	it('returns to line.idle, keeping shape, on pointer up if tool lock is enabled', () => {
		app.setToolLocked(true)
		const shapesBefore = app.shapesArray.length
		app
			.setSelectedTool('line')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
		const shapesAfter = app.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore + 1)
		expect(app.hintingIds.length).toBe(0)
		app.expectPathToBe('root.line.idle')
	})

	it('bails on cancel', () => {
		const shapesBefore = app.shapesArray.length
		app.setSelectedTool('line').pointerDown(0, 0, { target: 'canvas' }).pointerMove(10, 10).cancel()
		const shapesAfter = app.shapesArray.length
		expect(shapesAfter).toBe(shapesBefore)
		app.expectPathToBe('root.line.idle')
	})
})

describe('When extending the line with the shift-key in tool-lock mode', () => {
	it('extends a line by joining-the-dots', () => {
		app.setToolLocked(true)
		app
			.setSelectedTool('line')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
			.keyDown('Shift')
			.pointerDown(20, 10, { target: 'canvas' })
			.pointerUp(20, 10)

		const line = app.shapesArray[app.shapesArray.length - 1]
		assert(TLLineShapeDef.is(line))
		const handles = Object.values(line.props.handles)
		expect(handles.length).toBe(3)
	})

	it('extends a line after a click by shift-click dragging', () => {
		app.setToolLocked(true)
		app
			.setSelectedTool('line')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerUp(0, 0)
			.keyDown('Shift')
			.pointerDown(20, 10, { target: 'canvas' })
			.pointerMove(30, 10)
			.pointerUp(30, 10)

		const line = app.shapesArray[app.shapesArray.length - 1]
		assert(TLLineShapeDef.is(line))
		const handles = Object.values(line.props.handles)
		expect(handles.length).toBe(3)
	})

	it('extends a line by shift-click dragging', () => {
		app.setToolLocked(true)
		app
			.setSelectedTool('line')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
			.keyDown('Shift')
			.pointerDown(20, 10, { target: 'canvas' })
			.pointerMove(30, 10)
			.pointerUp(30, 10)

		const line = app.shapesArray[app.shapesArray.length - 1]
		assert(TLLineShapeDef.is(line))
		const handles = Object.values(line.props.handles)
		expect(handles.length).toBe(3)
	})

	it('extends a line by shift-clicking even after canceling a pointerdown', () => {
		app.setToolLocked(true)
		app
			.setSelectedTool('line')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
			.keyDown('Shift')
			.pointerDown(20, 10, { target: 'canvas' })
			.cancel()
			.pointerDown(20, 10, { target: 'canvas' })
			.pointerMove(30, 10)
			.pointerUp(30, 10)

		const line = app.shapesArray[app.shapesArray.length - 1]
		assert(TLLineShapeDef.is(line))
		const handles = Object.values(line.props.handles)
		expect(handles.length).toBe(3)
	})

	it('extends a line by shift-clicking even after canceling a pointermove', () => {
		app.setToolLocked(true)
		app
			.setSelectedTool('line')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
			.keyDown('Shift')
			.pointerDown(20, 10, { target: 'canvas' })
			.pointerUp(20, 10)
			.pointerMove(30, 10)
			.cancel()
			.pointerDown(30, 10, { target: 'canvas' })
			.pointerMove(40, 10)
			.pointerUp(40, 10)

		const line = app.shapesArray[app.shapesArray.length - 1]
		assert(TLLineShapeDef.is(line))
		const handles = Object.values(line.props.handles)
		expect(handles.length).toBe(3)
	})
})
