import { TLSelectTool } from '../../app/statechart/TLSelectTool/TLSelectTool'
import { TestApp } from '../TestEditor'
import { TL } from '../jsx'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})
afterEach(() => {
	app?.dispose()
})

describe(TLSelectTool, () => {
	describe('pointer down while shape is being edited', () => {
		it('captures the pointer down event if it is on the shape', () => {
			app.setSelectedTool('geo').pointerDown(0, 0).pointerMove(100, 100).pointerUp(100, 100)
			const shapeId = app.onlySelectedShape?.id
			app._transformPointerDownSpy.mockRestore()
			app._transformPointerUpSpy.mockRestore()
			app.setSelectedTool('select')
			app.expectPathToBe('root.select.idle')
			app.doubleClick(50, 50, shapeId)

			expect(app.pageState.editingId).toBe(shapeId)

			// clicking on the shape should not do anything
			jest.advanceTimersByTime(1000)
			app.pointerDown(50, 50, shapeId)

			expect(app.pageState.editingId).toBe(shapeId)

			// clicking outside the shape should end editing
			jest.advanceTimersByTime(1000)

			app.pointerDown(150, 150).pointerUp()
			expect(app.pageState.editingId).toBe(null)
			expect(app.root.path.value).toEqual('root.select.idle')
		})
	})
	it('does not allow pressing undo to end up in the editing state', () => {
		app.setSelectedTool('geo').pointerDown(0, 0).pointerMove(100, 100).pointerUp(100, 100)
		const shapeId = app.onlySelectedShape?.id
		app._transformPointerDownSpy.mockRestore()
		app._transformPointerUpSpy.mockRestore()
		app.setSelectedTool('select')
		app.doubleClick(50, 50, shapeId)

		expect(app.pageState.editingId).toBe(shapeId)

		// clicking on the shape should not do anything
		jest.advanceTimersByTime(1000)
		app.pointerDown(50, 50, shapeId)

		expect(app.pageState.editingId).toBe(shapeId)

		// clicking outside the shape should end editing
		jest.advanceTimersByTime(1000)

		app.pointerDown(150, 150).pointerUp()
		expect(app.pageState.editingId).toBe(null)
		expect(app.root.path.value).toEqual('root.select.idle')

		app.undo()

		expect(app.pageState.editingId).toBe(null)
	})
})

describe('When pointing a shape behind the current selection', () => {
	it('Does not select on pointer down, but does select on pointer up', () => {
		app.selectNone()
		const ids = app.createShapesFromJsx([
			<TL.geo ref="A" x={0} y={0} w={100} h={100} />,
			<TL.geo ref="B" x={50} y={50} w={100} h={100} />,
			<TL.geo ref="C" x={100} y={100} w={100} h={100} />,
		])
		app.select(ids.A, ids.C)
		// don't select it yet! It's behind the current selection
		app.pointerDown(100, 100, ids.B)
		expect(app.selectedIds).toMatchObject([ids.A, ids.C])
		app.pointerUp(100, 100, ids.B)
		expect(app.selectedIds).toMatchObject([ids.B])
	})

	it('Selects on shift+pointer up', () => {
		app.selectNone()
		const ids = app.createShapesFromJsx([
			<TL.geo ref="A" x={0} y={0} w={100} h={100} />,
			<TL.geo ref="B" x={50} y={50} w={100} h={100} />,
			<TL.geo ref="C" x={100} y={100} w={100} h={100} />,
		])
		app.select(ids.A, ids.C)
		// don't select it yet! It's behind the current selection
		app.pointerDown(100, 100, ids.B, { shiftKey: true })
		expect(app.selectedIds).toMatchObject([ids.A, ids.C])
		app.pointerUp(100, 100, ids.B, { shiftKey: true })
		expect(app.selectedIds).toMatchObject([ids.A, ids.C, ids.B])

		// and deselect
		app.pointerDown(100, 100, ids.B, { shiftKey: true })
		expect(app.selectedIds).toMatchObject([ids.A, ids.C, ids.B])
		app.pointerUp(100, 100, ids.B, { shiftKey: true })
		expect(app.selectedIds).toMatchObject([ids.A, ids.C])
	})

	it('Moves on pointer move, does not select on pointer up', () => {
		app.selectNone()
		const ids = app.createShapesFromJsx([
			<TL.geo ref="A" x={0} y={0} w={100} h={100} />,
			<TL.geo ref="B" x={50} y={50} w={100} h={100} />,
			<TL.geo ref="C" x={100} y={100} w={100} h={100} />,
		])
		app.select(ids.A, ids.C) // don't select it yet! It's behind the current selection
		app.pointerDown(100, 100, ids.B)
		app.pointerMove(150, 150)
		app.pointerMove(151, 151)
		app.pointerMove(100, 100)
		expect(app.selectedIds).toMatchObject([ids.A, ids.C])
		app.pointerUp(100, 100, ids.B)
		expect(app.selectedIds).toMatchObject([ids.A, ids.C]) // no change! we've moved
	})
})

describe('When brushing arrows', () => {
	it('Brushes a straight arrow', () => {
		const ids = app
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
		app.setSelectedTool('select')
		app.pointerDown(55, 45)
		app.pointerMove(45, 55)
		app.expectPathToBe('root.select.brushing')
		expect(app.selectedIds).toStrictEqual([ids.arrow1])
	})

	it('Brushes within the curve of a curved arrow without selecting the arrow', () => {
		app
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
		app.setSelectedTool('select')
		app.pointerDown(55, 45)
		app.pointerMove(45, 55)
		app.expectPathToBe('root.select.brushing')
		expect(app.selectedIds).toStrictEqual([])
	})
})
