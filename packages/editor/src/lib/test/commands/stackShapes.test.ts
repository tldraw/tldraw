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
			{
				id: ids.boxD,
				type: 'geo',
				x: 700,
				y: 700,
			},
		])
	})

	describe('when less than three shapes are selected', () => {
		it('does nothing', () => {
			app.setSelectedIds([ids.boxA, ids.boxB])
			const fn = jest.fn()
			app.on('change-history', fn)
			app.stackShapes('horizontal')
			jest.advanceTimersByTime(1000)
			expect(fn).not.toHaveBeenCalled()
		})
	})

	describe('when stacking horizontally', () => {
		it('stacks the shapes based on a given value', () => {
			app.setSelectedIds([ids.boxA, ids.boxB, ids.boxC, ids.boxD])
			app.stackShapes('horizontal', app.selectedIds, 10)
			jest.advanceTimersByTime(1000)
			// 200 distance gap between c and d
			app.expectShapeToMatch({
				id: ids.boxA,
				x: 0,
				y: 0,
			})
			app.expectShapeToMatch({
				id: ids.boxB,
				x: 110,
				y: 100,
			})
			app.expectShapeToMatch({
				id: ids.boxC,
				x: 220,
				y: 400,
			})
			app.expectShapeToMatch({
				id: ids.boxD,
				x: 330,
				y: 700,
			})
		})

		it('stacks the shapes based on the most common gap', () => {
			app.setSelectedIds([ids.boxA, ids.boxB, ids.boxC, ids.boxD])
			app.stackShapes('horizontal')
			jest.advanceTimersByTime(1000)
			// 200 distance gap between c and d
			app.expectShapeToMatch({
				id: ids.boxA,
				x: 0,
				y: 0,
			})
			app.expectShapeToMatch({
				id: ids.boxB,
				x: 300,
				y: 100,
			})
			app.expectShapeToMatch({
				id: ids.boxC,
				x: 600,
				y: 400,
			})
			app.expectShapeToMatch({
				id: ids.boxD,
				x: 900,
				y: 700,
			})
		})

		it('stacks the shapes based on the average', () => {
			app.updateShapes([{ id: ids.boxD, type: 'geo', x: 540, y: 700 }])
			app.setSelectedIds([ids.boxA, ids.boxB, ids.boxC, ids.boxD])
			app.stackShapes('horizontal')
			jest.advanceTimersByTime(1000)
			app.expectShapeToMatch({
				id: ids.boxA,
				x: 0,
				y: 0,
			})
			app.expectShapeToMatch({
				id: ids.boxB,
				x: 180,
				y: 100,
			})
			app.expectShapeToMatch({
				id: ids.boxC,
				x: 360,
				y: 400,
			})
			app.expectShapeToMatch({
				id: ids.boxD,
				x: 540,
				y: 700,
			})
		})
	})

	describe('when stacking vertically', () => {
		it('stacks the shapes based on a given value', () => {
			app.setSelectedIds([ids.boxA, ids.boxB, ids.boxC, ids.boxD])
			app.stackShapes('vertical', app.selectedIds, 10)
			jest.advanceTimersByTime(1000)
			// 200 distance gap between c and d
			app.expectShapeToMatch({
				id: ids.boxA,
				x: 0,
				y: 0,
			})
			app.expectShapeToMatch({
				id: ids.boxB,
				x: 100,
				y: 110,
			})
			app.expectShapeToMatch({
				id: ids.boxC,
				x: 400,
				y: 220,
			})
			app.expectShapeToMatch({
				id: ids.boxD,
				x: 700,
				y: 330,
			})
		})

		it('stacks the shapes based on the most common gap', () => {
			app.setSelectedIds([ids.boxA, ids.boxB, ids.boxC, ids.boxD])
			app.stackShapes('vertical')
			jest.advanceTimersByTime(1000)
			// 200 distance gap between c and d
			app.expectShapeToMatch({
				id: ids.boxA,
				x: 0,
				y: 0,
			})
			app.expectShapeToMatch({
				id: ids.boxB,
				x: 100,
				y: 300,
			})
			app.expectShapeToMatch({
				id: ids.boxC,
				x: 400,
				y: 600,
			})
			app.expectShapeToMatch({
				id: ids.boxD,
				x: 700,
				y: 900,
			})
		})

		it('stacks the shapes based on the average', () => {
			app.updateShapes([{ id: ids.boxD, type: 'geo', x: 700, y: 540 }])
			app.setSelectedIds([ids.boxA, ids.boxB, ids.boxC, ids.boxD])
			app.stackShapes('vertical')
			jest.advanceTimersByTime(1000)
			app.expectShapeToMatch({
				id: ids.boxA,
				x: 0,
				y: 0,
			})
			app.expectShapeToMatch({
				id: ids.boxB,
				x: 100,
				y: 180,
			})
			app.expectShapeToMatch({
				id: ids.boxC,
				x: 400,
				y: 360,
			})
			app.expectShapeToMatch({
				id: ids.boxD,
				x: 700,
				y: 540,
			})
		})
	})
})
