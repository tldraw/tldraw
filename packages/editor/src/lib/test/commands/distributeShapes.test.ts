import { PI } from '@tldraw/primitives'
import { createCustomShapeId } from '@tldraw/tlschema'
import { TestApp } from '../TestApp'

jest.useFakeTimers()

let app: TestApp

const ids = {
	boxA: createCustomShapeId('boxA'),
	boxB: createCustomShapeId('boxB'),
	boxC: createCustomShapeId('boxC'),
	boxD: createCustomShapeId('boxD'),
}

beforeEach(() => {
	app = new TestApp()
})

describe('distributeShapes command', () => {
	beforeEach(() => {
		app.selectAll()
		app.deleteShapes()
		app.createShapes([
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
			app.setSelectedIds([ids.boxA, ids.boxB])
			const fn = jest.fn()
			app.on('change-history', fn)
			app.distributeShapes('horizontal')
			jest.advanceTimersByTime(1000)
			expect(fn).not.toHaveBeenCalled()
		})
	})

	describe('When distributing...', () => {
		it('distributeShapes horizontally', () => {
			app.selectAll()
			app.distributeShapes('horizontal')
			jest.advanceTimersByTime(1000)
			app.expectShapeToMatch(
				{ id: ids.boxA, x: 0 },
				{ id: ids.boxB, x: 200 },
				{ id: ids.boxC, x: 400 }
			)
		})

		it('distributeShapes horizontally when shapes are clustered', () => {
			app.updateShapes([{ id: ids.boxC, type: 'geo', x: 25 }])
			app.selectAll()
			app.distributeShapes('horizontal')
			jest.advanceTimersByTime(1000)
			app.expectShapeToMatch(
				{ id: ids.boxA, x: 0 },
				{ id: ids.boxB, x: 100 },
				{ id: ids.boxC, x: 50 }
			)
		})

		it('distributeShapes vertically', () => {
			app.selectAll()
			app.distributeShapes('vertical')
			jest.advanceTimersByTime(1000)
			app.expectShapeToMatch(
				{ id: ids.boxA, y: 0 },
				{ id: ids.boxB, y: 200 },
				{ id: ids.boxC, y: 400 }
			)
		})

		it('distributeShapes vertically when shapes are clustered', () => {
			app.updateShapes([{ id: ids.boxC, type: 'geo', y: 25 }])
			app.selectAll()
			app.distributeShapes('vertical')
			jest.advanceTimersByTime(1000)
			app.expectShapeToMatch(
				{ id: ids.boxA, y: 0 },
				{ id: ids.boxB, y: 100 },
				{ id: ids.boxC, y: 50 }
			)
		})
	})

	it('distributeShapes shapes that are the child of another shape.', () => {
		app.selectAll()
		app.deleteShapes()
		app.createShapes([
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
		app.setSelectedIds([ids.boxB, ids.boxC, ids.boxD])

		app.distributeShapes('horizontal')
		jest.advanceTimersByTime(1000)

		app.expectShapeToMatch(
			{ id: ids.boxB, x: 100 },
			{ id: ids.boxC, x: 250 },
			{ id: ids.boxD, x: 400 }
		)
	})

	it('distributeShapes shapes that are the child of another shape when clustered.', () => {
		app.selectAll()
		app.deleteShapes()
		app.createShapes([
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
		app.setSelectedIds([ids.boxB, ids.boxC, ids.boxD])

		app.distributeShapes('horizontal')
		jest.advanceTimersByTime(1000)

		app.expectShapeToMatch(
			{ id: ids.boxB, x: 100 },
			{ id: ids.boxC, x: 200 },
			{ id: ids.boxD, x: 150 }
		)
	})

	it('distributeShapes shapes that are the child of another shape when a parent is rotated.', () => {
		app = new TestApp()
		app.selectAll()
		app.deleteShapes()
		app.createShapes([
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

		app.setSelectedIds([ids.boxB, ids.boxC, ids.boxD])

		app.distributeShapes('horizontal')
		jest.advanceTimersByTime(1000)

		app.expectShapeToMatch(
			{ id: ids.boxB, x: 100 },
			{ id: ids.boxC, x: 50 },
			{ id: ids.boxD, x: 300 }
		)
	})
})
