import { TLLineShape, assert } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('enters the line state', () => {
	editor.setCurrentTool('line')
	expect(editor.getCurrentToolId()).toBe('line')
	editor.expectToBeIn('line.idle')
})

describe('When in the idle state', () => {
	it('enters the pointing state and creates a shape on pointer down', () => {
		const shapesBefore = editor.getCurrentPageShapes().length
		editor.setCurrentTool('line').pointerDown(0, 0, { target: 'canvas' })
		const shapesAfter = editor.getCurrentPageShapes().length
		expect(shapesAfter).toBe(shapesBefore + 1)
		editor.expectToBeIn('line.pointing')
	})

	it('returns to select on cancel', () => {
		editor.setCurrentTool('line')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})
})

describe('When in the pointing state', () => {
	it('createes on pointer up', () => {
		const shapesBefore = editor.getCurrentPageShapes().length
		editor.setCurrentTool('line').pointerDown(0, 0, { target: 'canvas' }).pointerUp(0, 0)
		const shapesAfter = editor.getCurrentPageShapes().length
		expect(shapesAfter).toBe(shapesBefore + 1)
		expect(editor.getHintingShapeIds().length).toBe(0)
		editor.expectToBeIn('line.idle')
	})

	it('bails on cancel', () => {
		const shapesBefore = editor.getCurrentPageShapes().length
		editor.setCurrentTool('line').pointerDown(0, 0, { target: 'canvas' }).cancel()
		const shapesAfter = editor.getCurrentPageShapes().length
		expect(shapesAfter).toBe(shapesBefore)
		expect(editor.getHintingShapeIds().length).toBe(0)
		editor.expectToBeIn('line.idle')
	})

	it('enters the dragging state on pointer move', () => {
		editor.setCurrentTool('line').pointerDown(0, 0, { target: 'canvas' }).pointerMove(10, 10)
		editor.expectToBeIn('select.dragging_handle')
	})
})

// This could be moved to dragging_handle
describe('When dragging the line', () => {
	it('updates the line on pointer move', () => {
		editor.setCurrentTool('line').pointerDown(0, 0, { target: 'canvas' }).pointerMove(10, 10)
		const line = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]
		editor.expectShapeToMatch(line, {
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
		editor.expectToBeIn('select.dragging_handle')
	})

	it('returns to select.idle, keeping shape, on pointer up', () => {
		const shapesBefore = editor.getCurrentPageShapes().length
		editor
			.setCurrentTool('line')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
		const shapesAfter = editor.getCurrentPageShapes().length
		expect(shapesAfter).toBe(shapesBefore + 1)
		expect(editor.getHintingShapeIds().length).toBe(0)
		editor.expectToBeIn('select.idle')
	})

	it('returns to line.idle, keeping shape, on pointer up if tool lock is enabled', () => {
		editor.updateInstanceState({ isToolLocked: true })
		const shapesBefore = editor.getCurrentPageShapes().length
		editor
			.setCurrentTool('line')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
		const shapesAfter = editor.getCurrentPageShapes().length
		expect(shapesAfter).toBe(shapesBefore + 1)
		expect(editor.getHintingShapeIds().length).toBe(0)
		editor.expectToBeIn('line.idle')
	})

	it('bails on cancel', () => {
		const shapesBefore = editor.getCurrentPageShapes().length
		editor
			.setCurrentTool('line')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.cancel()
		const shapesAfter = editor.getCurrentPageShapes().length
		expect(shapesAfter).toBe(shapesBefore)
		editor.expectToBeIn('line.idle')
	})
})

describe('When extending the line with the shift-key in tool-lock mode', () => {
	it('extends a line by joining-the-dots', () => {
		editor.updateInstanceState({ isToolLocked: true })
		editor
			.setCurrentTool('line')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
			.keyDown('Shift')
			.pointerDown(20, 10, { target: 'canvas' })
			.pointerUp(20, 10)

		const line = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]
		assert(editor.isShapeOfType<TLLineShape>(line, 'line'))
		const handles = Object.values(line.props.handles)
		expect(handles.length).toBe(3)
	})

	it('extends a line after a click by shift-click dragging', () => {
		editor.updateInstanceState({ isToolLocked: true })
		editor
			.setCurrentTool('line')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerUp(0, 0)
			.keyDown('Shift')
			.pointerDown(20, 10, { target: 'canvas' })
			.pointerMove(30, 10)
			.pointerUp(30, 10)

		const line = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]
		assert(editor.isShapeOfType<TLLineShape>(line, 'line'))
		const handles = Object.values(line.props.handles)
		expect(handles.length).toBe(2)
	})

	it('extends a line by shift-click dragging', () => {
		editor.updateInstanceState({ isToolLocked: true })
		editor
			.setCurrentTool('line')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
			.keyDown('Shift')
			.pointerDown(20, 10, { target: 'canvas' })
			.pointerMove(30, 10)
			.pointerUp(30, 10)

		const line = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]
		assert(editor.isShapeOfType<TLLineShape>(line, 'line'))
		const handles = Object.values(line.props.handles)
		expect(handles.length).toBe(3)
	})

	it('extends a line by shift-clicking even after canceling a pointerdown', () => {
		editor.updateInstanceState({ isToolLocked: true })
		editor
			.setCurrentTool('line')
			.pointerDown(0, 0, { target: 'canvas' })
			.pointerMove(10, 10)
			.pointerUp(10, 10)
			.keyDown('Shift')
			.pointerDown(20, 10, { target: 'canvas' })
			.cancel()
			.pointerDown(20, 10, { target: 'canvas' })
			.pointerMove(30, 10)
			.pointerUp(30, 10)

		const line = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]
		assert(editor.isShapeOfType<TLLineShape>(line, 'line'))
		const handles = Object.values(line.props.handles)
		expect(handles.length).toBe(3)
	})

	it('extends a line by shift-clicking even after canceling a pointermove', () => {
		editor.updateInstanceState({ isToolLocked: true })
		editor
			.setCurrentTool('line')
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

		const line = editor.getCurrentPageShapes()[editor.getCurrentPageShapes().length - 1]
		assert(editor.isShapeOfType<TLLineShape>(line, 'line'))
		const handles = Object.values(line.props.handles)
		expect(handles.length).toBe(3)
	})
})

describe('tool lock bug', () => {
	it('works as expected when tool lock is on but shift is off', () => {
		expect(editor.getCurrentPageShapes().length).toBe(0)
		editor
			.updateInstanceState({ isToolLocked: true })
			.setCurrentTool('line')
			.pointerDown(0, 0)
			.pointerMove(10, 10)
			.pointerUp(10, 10)
			.pointerDown(100, 100)
			.pointerMove(110, 110)
			.pointerUp(100, 100)
			.pointerUp(120, 110)
		expect(editor.getCurrentPageShapes().length).toBe(2)
	})
})
