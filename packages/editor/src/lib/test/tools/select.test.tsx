import { SelectTool } from '../../editor/tools/SelectTool/SelectTool'
import { TestEditor } from '../TestEditor'
import { TL } from '../jsx'

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
			editor.setSelectedTool('geo').pointerDown(0, 0).pointerMove(100, 100).pointerUp(100, 100)
			const shapeId = editor.onlySelectedShape?.id
			editor._transformPointerDownSpy.mockRestore()
			editor._transformPointerUpSpy.mockRestore()
			editor.setSelectedTool('select')
			editor.expectPathToBe('root.select.idle')
			editor.doubleClick(50, 50, shapeId)

			expect(editor.pageState.editingId).toBe(shapeId)

			// clicking on the shape should not do anything
			jest.advanceTimersByTime(1000)
			editor.pointerDown(50, 50, shapeId)

			expect(editor.pageState.editingId).toBe(shapeId)

			// clicking outside the shape should end editing
			jest.advanceTimersByTime(1000)

			editor.pointerDown(150, 150).pointerUp()
			expect(editor.pageState.editingId).toBe(null)
			expect(editor.root.path.value).toEqual('root.select.idle')
		})
	})
	it('does not allow pressing undo to end up in the editing state', () => {
		editor.setSelectedTool('geo').pointerDown(0, 0).pointerMove(100, 100).pointerUp(100, 100)
		const shapeId = editor.onlySelectedShape?.id
		editor._transformPointerDownSpy.mockRestore()
		editor._transformPointerUpSpy.mockRestore()
		editor.setSelectedTool('select')
		editor.doubleClick(50, 50, shapeId)

		expect(editor.pageState.editingId).toBe(shapeId)

		// clicking on the shape should not do anything
		jest.advanceTimersByTime(1000)
		editor.pointerDown(50, 50, shapeId)

		expect(editor.pageState.editingId).toBe(shapeId)

		// clicking outside the shape should end editing
		jest.advanceTimersByTime(1000)

		editor.pointerDown(150, 150).pointerUp()
		expect(editor.pageState.editingId).toBe(null)
		expect(editor.root.path.value).toEqual('root.select.idle')

		editor.undo()

		expect(editor.pageState.editingId).toBe(null)
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
		editor.pointerDown(100, 100, ids.B)
		expect(editor.selectedIds).toMatchObject([ids.A, ids.C])
		editor.pointerUp(100, 100, ids.B)
		expect(editor.selectedIds).toMatchObject([ids.B])
	})

	it('Selects on shift+pointer up', () => {
		editor.selectNone()
		const ids = editor.createShapesFromJsx([
			<TL.geo ref="A" x={0} y={0} w={100} h={100} />,
			<TL.geo ref="B" x={50} y={50} w={100} h={100} />,
			<TL.geo ref="C" x={100} y={100} w={100} h={100} />,
		])
		editor.select(ids.A, ids.C)
		// don't select it yet! It's behind the current selection
		editor.pointerDown(100, 100, ids.B, { shiftKey: true })
		expect(editor.selectedIds).toMatchObject([ids.A, ids.C])
		editor.pointerUp(100, 100, ids.B, { shiftKey: true })
		expect(editor.selectedIds).toMatchObject([ids.A, ids.C, ids.B])

		// and deselect
		editor.pointerDown(100, 100, ids.B, { shiftKey: true })
		expect(editor.selectedIds).toMatchObject([ids.A, ids.C, ids.B])
		editor.pointerUp(100, 100, ids.B, { shiftKey: true })
		expect(editor.selectedIds).toMatchObject([ids.A, ids.C])
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
		expect(editor.selectedIds).toMatchObject([ids.A, ids.C])
		editor.pointerUp(100, 100, ids.B)
		expect(editor.selectedIds).toMatchObject([ids.A, ids.C]) // no change! we've moved
	})
})

describe('When brushing arrows', () => {
	it('Brushes a straight arrow', () => {
		const ids = editor
			.selectAll()
			.deleteShapes()
			.setCamera(0, 0, 1)
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
		editor.setSelectedTool('select')
		editor.pointerDown(55, 45)
		editor.pointerMove(45, 55)
		editor.expectPathToBe('root.select.brushing')
		expect(editor.selectedIds).toStrictEqual([ids.arrow1])
	})

	it('Brushes within the curve of a curved arrow without selecting the arrow', () => {
		editor
			.selectAll()
			.deleteShapes()
			.setCamera(0, 0, 1)
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
		editor.setSelectedTool('select')
		editor.pointerDown(55, 45)
		editor.pointerMove(45, 55)
		editor.expectPathToBe('root.select.brushing')
		expect(editor.selectedIds).toStrictEqual([])
	})
})
