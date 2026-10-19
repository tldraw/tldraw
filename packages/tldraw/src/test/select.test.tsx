import { createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { SelectTool } from '../lib/tools/SelectTool/SelectTool'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

describe(SelectTool, () => {
	describe('pointer down while shape is being edited', () => {
		it('captures the pointer down event if it is on the shape', () => {
			editor.setCurrentTool('geo').pointerDown(0, 0).pointerMove(100, 100).pointerUp(100, 100)
			const shapeId = editor.getLastCreatedShape().id
			editor._transformPointerDownSpy.mockRestore()
			editor._transformPointerUpSpy.mockRestore()
			editor.setCurrentTool('select')
			editor.expectToBeIn('select.idle')
			editor.doubleClick(50, 50, shapeId)

			expect(editor.getCurrentPageState().editingShapeId).toBe(shapeId)

			// note: this behavior has moved to the React hook useEditablePlainText.
			// clicking on the input will preserve selection, however you can
			// click on the shape itself to select it as usual.
			// clicking on the shape should not do anything
			// vi.advanceTimersByTime(1000)
			// editor.pointerDown(50, 50, shapeId)
			// expect(editor.currentPageState.editingShapeId).toBe(shapeId)

			// clicking outside the shape should end editing
			vi.advanceTimersByTime(1000)

			editor.pointerDown(150, 150).pointerUp()
			expect(editor.getCurrentPageState().editingShapeId).toBe(null)
			editor.expectToBeIn('select.idle')
		})
	})
	it('does not allow pressing undo to end up in the editing state', () => {
		editor.setCurrentTool('geo').pointerDown(0, 0).pointerMove(100, 100).pointerUp(100, 100)
		const shapeId = editor.getLastCreatedShape().id
		editor._transformPointerDownSpy.mockRestore()
		editor._transformPointerUpSpy.mockRestore()
		editor.setCurrentTool('select')
		editor.doubleClick(50, 50, shapeId)

		expect(editor.getCurrentPageState().editingShapeId).toBe(shapeId)

		// clicking outside the shape should end editing
		vi.advanceTimersByTime(1000)

		editor.pointerDown(150, 150).pointerUp()
		expect(editor.getCurrentPageState().editingShapeId).toBe(null)
		editor.expectToBeIn('select.idle')

		editor.undo()

		expect(editor.getCurrentPageState().editingShapeId).toBe(null)
	})
})

describe('When pointing a shape behind the current selection', () => {
	it('Does not select on pointer down, but does select on pointer up', () => {
		editor.selectNone()
		const ids = {
			A: createShapeId('A'),
			B: createShapeId('B'),
			C: createShapeId('C'),
		}
		editor.createShapes([
			{ id: ids.A, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.B, type: 'geo', x: 50, y: 50, props: { w: 100, h: 100 } },
			{ id: ids.C, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
		])
		editor.select(ids.A, ids.C)
		// don't select it yet! It's behind the current selection
		editor.pointerDown(75, 75)
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.A, ids.C])
		editor.pointerUp(75, 75)
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.B])
	})

	it('Selects on shift+pointer up', () => {
		editor.selectNone()
		const ids = {
			A: createShapeId('A'),
			B: createShapeId('B'),
			C: createShapeId('C'),
		}
		editor.createShapes([
			{ id: ids.A, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.B, type: 'geo', x: 50, y: 50, props: { w: 50, h: 50 } },
			{ id: ids.C, type: 'geo', x: 100, y: 100, props: { w: 50, h: 50 } },
		])
		editor.select(ids.A, ids.C)

		// don't select B yet! It's behind the current selection
		editor.pointerDown(75, 75, { target: 'canvas' }, { shiftKey: true })
		editor.expectToBeIn('select.pointing_selection')
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.A, ids.C])

		editor.pointerUp(75, 75, { target: 'canvas' }, { shiftKey: true })
		editor.expectToBeIn('select.idle')
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.A, ids.C, ids.B])

		// and deselect
		editor.pointerDown(75, 75, { target: 'canvas' }, { shiftKey: true })
		editor.expectToBeIn('select.pointing_shape')
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.A, ids.C, ids.B])

		editor.pointerUp(75, 75, { target: 'canvas' }, { shiftKey: true })
		editor.expectToBeIn('select.idle')
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.A, ids.C])
	})

	it('Moves on pointer move, does not select on pointer up', () => {
		editor.selectNone()
		const ids = {
			A: createShapeId('A'),
			B: createShapeId('B'),
			C: createShapeId('C'),
		}
		editor.createShapes([
			{ id: ids.A, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.B, type: 'geo', x: 50, y: 50, props: { w: 100, h: 100 } },
			{ id: ids.C, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
		])
		editor.select(ids.A, ids.C) // don't select it yet! It's behind the current selection
		editor.pointerDown(100, 100, ids.B)
		editor.pointerMove(150, 150)
		editor.pointerMove(151, 151)
		editor.pointerMove(100, 100)
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.A, ids.C])
		editor.pointerUp(100, 100, ids.B)
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.A, ids.C]) // no change! we've moved
	})
})

describe('When brushing arrows', () => {
	it('Brushes a straight arrow', () => {
		const ids = {
			arrow1: createShapeId('arrow1'),
		}
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.setCamera({ x: 0, y: 0, z: 1 })
			.createShapes([
				{
					id: ids.arrow1,
					type: 'arrow',
					x: 0,
					y: 0,
					props: { start: { x: 0, y: 0 }, end: { x: 100, y: 100 }, bend: 0 },
				},
			])
		editor.setCurrentTool('select')
		editor.pointerDown(0, 45)
		editor.pointerMove(100, 55)
		editor.expectToBeIn('select.brushing')
		expect(editor.getSelectedShapeIds()).toStrictEqual([ids.arrow1])
	})

	it('Brushes within the curve of a curved arrow without selecting the arrow', () => {
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.setCamera({ x: 0, y: 0, z: 1 })
			.createShapes([
				{
					id: createShapeId('arrow1'),
					type: 'arrow',
					x: 0,
					y: 0,
					props: { start: { x: 0, y: 0 }, end: { x: 100, y: 100 }, bend: 40 },
				},
			])
		editor.setCurrentTool('select')
		editor.pointerDown(55, 45)
		editor.pointerMove(45, 55)
		editor.expectToBeIn('select.brushing')
		expect(editor.getSelectedShapeIds()).toStrictEqual([])
	})
})

// Each of these selection changes happens while the select tool is idle with no
// pending history mark, so without a stopping point the selection change merges
// into the entry that created the shape and undo deletes the shape (#10412).
describe('Selection changes while idle are their own undo step', () => {
	const ids = {
		box1: createShapeId('box1'),
		box2: createShapeId('box2'),
		group1: createShapeId('group1'),
	}

	beforeEach(() => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
		editor.setCamera({ x: 0, y: 0, z: 1 })
	})

	function createBoxesWithNothingSelected() {
		editor.markHistoryStoppingPoint('create boxes')
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 400, y: 100, props: { w: 100, h: 100 } },
		])
		editor.selectNone()
		editor.setCurrentTool('select')
		expect(editor.getSelectedShapeIds()).toEqual([])
	}

	it('brushing from an empty selection', () => {
		createBoxesWithNothingSelected()

		editor.pointerDown(50, 50).pointerMove(250, 250).pointerUp(250, 250)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])

		editor.undo()
		expect(editor.getSelectedShapeIds()).toEqual([])
		expect(editor.getShape(ids.box1)).toBeDefined()
		expect(editor.getShape(ids.box2)).toBeDefined()
	})

	it('brushing that hits nothing does not make undo available', () => {
		createBoxesWithNothingSelected()
		editor.clearHistory()
		expect(editor.getCanUndo()).toBe(false)

		editor.pointerDown(700, 700).pointerMove(800, 800).pointerUp(800, 800)
		expect(editor.getSelectedShapeIds()).toEqual([])
		expect(editor.getCanUndo()).toBe(false)
	})

	it('brushing from an existing selection is a single undo step', () => {
		createBoxesWithNothingSelected()
		editor.setSelectedShapes([ids.box2])

		editor.pointerDown(50, 50).pointerMove(250, 250).pointerUp(250, 250)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])

		editor.undo()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2])
	})

	it('right-clicking empty canvas to clear the selection', () => {
		createBoxesWithNothingSelected()
		editor.setSelectedShapes([ids.box1])

		editor.rightClick(700, 700)
		expect(editor.getSelectedShapeIds()).toEqual([])

		editor.undo()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		expect(editor.getShape(ids.box1)).toBeDefined()
	})

	it('pressing Enter with only groups selected', () => {
		createBoxesWithNothingSelected()
		editor.groupShapes([ids.box1, ids.box2], { groupId: ids.group1 })
		editor.setSelectedShapes([ids.group1])

		editor.keyDown('Enter').keyUp('Enter')
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2])

		editor.undo()
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
		expect(editor.getShape(ids.group1)).toBeDefined()
	})

	it('Tab traversal', () => {
		createBoxesWithNothingSelected()
		editor.setSelectedShapes([ids.box1])

		editor.keyDown('Tab').keyUp('Tab')
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2])

		editor.undo()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		expect(editor.getShape(ids.box2)).toBeDefined()
	})

	it('Tab with a single shape does not make undo available', () => {
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
		editor.setSelectedShapes([ids.box1])
		editor.setCurrentTool('select')
		editor.clearHistory()
		expect(editor.getCanUndo()).toBe(false)

		editor.keyDown('Tab').keyUp('Tab')
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		expect(editor.getCanUndo()).toBe(false)
	})

	it('Ctrl+arrow traversal', () => {
		createBoxesWithNothingSelected()
		editor.setSelectedShapes([ids.box1])

		editor.keyDown('ArrowRight', { ctrlKey: true }).keyUp('ArrowRight', { ctrlKey: true })
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2])

		editor.undo()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		expect(editor.getShape(ids.box2)).toBeDefined()
	})

	it('Ctrl+Shift+arrow parent and child traversal', () => {
		createBoxesWithNothingSelected()
		editor.groupShapes([ids.box1, ids.box2], { groupId: ids.group1 })
		editor.setSelectedShapes([ids.group1])

		editor
			.keyDown('ArrowDown', { ctrlKey: true, shiftKey: true })
			.keyUp('ArrowDown', { ctrlKey: true, shiftKey: true })
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])

		editor
			.keyDown('ArrowUp', { ctrlKey: true, shiftKey: true })
			.keyUp('ArrowUp', { ctrlKey: true, shiftKey: true })
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])

		editor.undo()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.undo()
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
		expect(editor.getShape(ids.group1)).toBeDefined()
	})
})
