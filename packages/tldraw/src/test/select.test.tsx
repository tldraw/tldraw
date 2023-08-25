import { SelectTool } from '../lib/tools/SelectTool/SelectTool'
import { TestEditor } from './TestEditor'
import { TL } from './test-jsx'

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
			const shapeId = editor.onlySelectedShape?.id
			editor._transformPointerDownSpy.mockRestore()
			editor._transformPointerUpSpy.mockRestore()
			editor.setCurrentTool('select')
			editor.expectPathToBe('root.select.idle')
			editor.doubleClick(50, 50, shapeId)

			expect(editor.currentPageState.editingShapeId).toBe(shapeId)

			// note: this behavior has moved to the React hook useEditableText.
			// clicking on the input will preserve selection, however you can
			// click on the shape itself to select it as usual.
			// clicking on the shape should not do anything
			// jest.advanceTimersByTime(1000)
			// editor.pointerDown(50, 50, shapeId)
			// expect(editor.currentPageState.editingShapeId).toBe(shapeId)

			// clicking outside the shape should end editing
			jest.advanceTimersByTime(1000)

			editor.pointerDown(150, 150).pointerUp()
			expect(editor.currentPageState.editingShapeId).toBe(null)
			expect(editor.root.path.value).toEqual('root.select.idle')
		})
	})
	it('does not allow pressing undo to end up in the editing state', () => {
		editor.setCurrentTool('geo').pointerDown(0, 0).pointerMove(100, 100).pointerUp(100, 100)
		const shapeId = editor.onlySelectedShape?.id
		editor._transformPointerDownSpy.mockRestore()
		editor._transformPointerUpSpy.mockRestore()
		editor.setCurrentTool('select')
		editor.doubleClick(50, 50, shapeId)

		expect(editor.currentPageState.editingShapeId).toBe(shapeId)

		// clicking outside the shape should end editing
		jest.advanceTimersByTime(1000)

		editor.pointerDown(150, 150).pointerUp()
		expect(editor.currentPageState.editingShapeId).toBe(null)
		expect(editor.root.path.value).toEqual('root.select.idle')

		editor.undo()

		expect(editor.currentPageState.editingShapeId).toBe(null)
	})
})

describe('When pointing a shape behind the current selection', () => {
	it('Does not select on pointer down, but does select on pointer up', () => {
		editor.selectNone()
		const ids = editor.createShapesFromJsx([
			<TL.geo ref="A" x={0} y={0} w={100} h={100} />,
			<TL.geo ref="B" x={50} y={50} w={100} h={100} />,
			<TL.geo ref="C" x={100} y={100} w={100} h={100} />,
		])
		editor.select(ids.A, ids.C)
		// don't select it yet! It's behind the current selection
		editor.pointerDown(75, 75)
		expect(editor.selectedShapeIds).toMatchObject([ids.A, ids.C])
		editor.pointerUp(75, 75)
		expect(editor.selectedShapeIds).toMatchObject([ids.B])
	})

	it('Selects on shift+pointer up', () => {
		editor.selectNone()
		const ids = editor.createShapesFromJsx([
			<TL.geo ref="A" x={0} y={0} w={50} h={50} />,
			<TL.geo ref="B" x={50} y={50} w={50} h={50} />,
			<TL.geo ref="C" x={100} y={100} w={50} h={50} />,
		])
		editor.select(ids.A, ids.C)

		// don't select B yet! It's behind the current selection
		editor.pointerDown(75, 75, { target: 'canvas' }, { shiftKey: true })
		editor.expectToBeIn('select.pointing_selection')
		expect(editor.selectedShapeIds).toMatchObject([ids.A, ids.C])

		editor.pointerUp(75, 75, { target: 'canvas' }, { shiftKey: true })
		editor.expectToBeIn('select.idle')
		expect(editor.selectedShapeIds).toMatchObject([ids.A, ids.C, ids.B])

		// and deselect
		editor.pointerDown(75, 75, { target: 'canvas' }, { shiftKey: true })
		editor.expectToBeIn('select.pointing_shape')
		expect(editor.selectedShapeIds).toMatchObject([ids.A, ids.C, ids.B])

		editor.pointerUp(75, 75, { target: 'canvas' }, { shiftKey: true })
		editor.expectToBeIn('select.idle')
		expect(editor.selectedShapeIds).toMatchObject([ids.A, ids.C])
	})

	it('Moves on pointer move, does not select on pointer up', () => {
		editor.selectNone()
		const ids = editor.createShapesFromJsx([
			<TL.geo ref="A" x={0} y={0} w={100} h={100} />,
			<TL.geo ref="B" x={50} y={50} w={100} h={100} />,
			<TL.geo ref="C" x={100} y={100} w={100} h={100} />,
		])
		editor.select(ids.A, ids.C) // don't select it yet! It's behind the current selection
		editor.pointerDown(100, 100, ids.B)
		editor.pointerMove(150, 150)
		editor.pointerMove(151, 151)
		editor.pointerMove(100, 100)
		expect(editor.selectedShapeIds).toMatchObject([ids.A, ids.C])
		editor.pointerUp(100, 100, ids.B)
		expect(editor.selectedShapeIds).toMatchObject([ids.A, ids.C]) // no change! we've moved
	})
})

describe('When brushing arrows', () => {
	it('Brushes a straight arrow', () => {
		const ids = editor
			.selectAll()
			.deleteShapes(editor.selectedShapeIds)
			.setCamera({ x: 0, y: 0, z: 1 })
			.createShapesFromJsx([
				<TL.arrow
					ref="arrow1"
					x={0}
					y={0}
					start={{ type: 'point', x: 0, y: 0 }}
					end={{ type: 'point', x: 100, y: 100 }}
					bend={0}
				/>,
			])
		editor.setCurrentTool('select')
		editor.pointerDown(0, 45)
		editor.pointerMove(100, 55)
		editor.expectPathToBe('root.select.brushing')
		expect(editor.selectedShapeIds).toStrictEqual([ids.arrow1])
	})

	it('Brushes within the curve of a curved arrow without selecting the arrow', () => {
		editor
			.selectAll()
			.deleteShapes(editor.selectedShapeIds)
			.setCamera({ x: 0, y: 0, z: 1 })
			.createShapesFromJsx([
				<TL.arrow
					ref="arrow1"
					x={0}
					y={0}
					start={{ type: 'point', x: 0, y: 0 }}
					end={{ type: 'point', x: 100, y: 100 }}
					bend={40}
				/>,
			])
		editor.setCurrentTool('select')
		editor.pointerDown(55, 45)
		editor.pointerMove(45, 55)
		editor.expectPathToBe('root.select.brushing')
		expect(editor.selectedShapeIds).toStrictEqual([])
	})
})
