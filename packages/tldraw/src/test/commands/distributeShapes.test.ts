import { PI, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

jest.useFakeTimers()

let editor: TestEditor

const ids = {
	boxA: createShapeId('boxA'),
	boxB: createShapeId('boxB'),
	boxC: createShapeId('boxC'),
	boxD: createShapeId('boxD'),
}

beforeEach(() => {
	editor = new TestEditor()
})

describe('distributeShapes command', () => {
	beforeEach(() => {
		editor.selectAll()
		editor.deleteShapes(editor.selectedShapeIds)
		editor.createShapes([
			{
				id: ids.boxA,
				type: 'geo',
				x: 0,
				y: 0,
			},
			{
				id: ids.boxB,
				type: 'geo',
				x: 100,
				y: 100,
			},
			{
				id: ids.boxC,
				type: 'geo',
				x: 400,
				y: 400,
			},
		])
	})

	describe('when less than three shapes are selected', () => {
		it('does nothing', () => {
			editor.setSelectedShapes([ids.boxA, ids.boxB])
			const fn = jest.fn()
			editor.on('change-history', fn)
			editor.distributeShapes(editor.selectedShapeIds, 'horizontal')
			jest.advanceTimersByTime(1000)
			expect(fn).not.toHaveBeenCalled()
		})
	})

	describe('When distributing...', () => {
		it('distributeShapes horizontally', () => {
			editor.selectAll()
			editor.distributeShapes(editor.selectedShapeIds, 'horizontal')
			jest.advanceTimersByTime(1000)
			editor.expectShapeToMatch(
				{ id: ids.boxA, x: 0 },
				{ id: ids.boxB, x: 200 },
				{ id: ids.boxC, x: 400 }
			)
		})

		it('distributeShapes horizontally when shapes are clustered', () => {
			editor.updateShapes([{ id: ids.boxC, type: 'geo', x: 25 }])
			editor.selectAll()
			editor.distributeShapes(editor.selectedShapeIds, 'horizontal')
			jest.advanceTimersByTime(1000)
			editor.expectShapeToMatch(
				{ id: ids.boxA, x: 0 },
				{ id: ids.boxB, x: 100 },
				{ id: ids.boxC, x: 50 }
			)
		})

		it('distributeShapes vertically', () => {
			editor.selectAll()
			editor.distributeShapes(editor.selectedShapeIds, 'vertical')
			jest.advanceTimersByTime(1000)
			editor.expectShapeToMatch(
				{ id: ids.boxA, y: 0 },
				{ id: ids.boxB, y: 200 },
				{ id: ids.boxC, y: 400 }
			)
		})

		it('distributeShapes vertically when shapes are clustered', () => {
			editor.updateShapes([{ id: ids.boxC, type: 'geo', y: 25 }])
			editor.selectAll()
			editor.distributeShapes(editor.selectedShapeIds, 'vertical')
			jest.advanceTimersByTime(1000)
			editor.expectShapeToMatch(
				{ id: ids.boxA, y: 0 },
				{ id: ids.boxB, y: 100 },
				{ id: ids.boxC, y: 50 }
			)
		})
	})

	it('distributeShapes shapes that are the child of another shape.', () => {
		editor.selectAll()
		editor.deleteShapes(editor.selectedShapeIds)
		editor.createShapes([
			{
				id: ids.boxA,
				type: 'geo',
				x: 0,
				y: 0,
			},
			{
				id: ids.boxB,
				type: 'geo',
				parentId: ids.boxA,
				x: 100,
				y: 100,
			},
			{
				id: ids.boxC,
				type: 'geo',
				x: 200,
				y: 100,
			},
			{
				id: ids.boxD,
				type: 'geo',
				x: 400,
				y: 100,
			},
		])
		editor.setSelectedShapes([ids.boxB, ids.boxC, ids.boxD])

		editor.distributeShapes(editor.selectedShapeIds, 'horizontal')
		jest.advanceTimersByTime(1000)

		editor.expectShapeToMatch(
			{ id: ids.boxB, x: 100 },
			{ id: ids.boxC, x: 250 },
			{ id: ids.boxD, x: 400 }
		)
	})

	it('distributeShapes shapes that are the child of another shape when clustered.', () => {
		editor.selectAll()
		editor.deleteShapes(editor.selectedShapeIds)
		editor.createShapes([
			{
				id: ids.boxA,
				type: 'geo',
				x: 0,
				y: 0,
			},
			{
				id: ids.boxB,
				type: 'geo',
				parentId: ids.boxA,
				x: 100,
				y: 100,
			},
			{
				id: ids.boxC,
				type: 'geo',
				x: 200,
				y: 100,
			},
			{
				id: ids.boxD,
				type: 'geo',
				x: 175,
				y: 200,
			},
		])
		editor.setSelectedShapes([ids.boxB, ids.boxC, ids.boxD])

		editor.distributeShapes(editor.selectedShapeIds, 'horizontal')
		jest.advanceTimersByTime(1000)

		editor.expectShapeToMatch(
			{ id: ids.boxB, x: 100 },
			{ id: ids.boxC, x: 200 },
			{ id: ids.boxD, x: 150 }
		)
	})

	it('distributeShapes shapes that are the child of another shape when a parent is rotated.', () => {
		editor = new TestEditor()
		editor.selectAll()
		editor.deleteShapes(editor.selectedShapeIds)
		editor.createShapes([
			{
				id: ids.boxA,
				type: 'geo',
				x: 0,
				y: 0,
				rotation: PI,
			},
			{
				id: ids.boxB,
				type: 'geo',
				parentId: ids.boxA,
				x: 100,
				y: 100,
			},
			{
				id: ids.boxC,
				type: 'geo',
				x: 200,
				y: 0,
			},
			{
				id: ids.boxD,
				type: 'geo',
				x: 300,
				y: 0,
			},
		])

		editor.setSelectedShapes([ids.boxB, ids.boxC, ids.boxD])

		editor.distributeShapes(editor.selectedShapeIds, 'horizontal')
		jest.advanceTimersByTime(1000)

		editor.expectShapeToMatch(
			{ id: ids.boxB, x: 100 },
			{ id: ids.boxC, x: 50 },
			{ id: ids.boxD, x: 300 }
		)
	})
})
