import { createCustomShapeId } from '@tldraw/tlschema'
import { TestApp } from '../TestEditor'

let app: TestApp

const ids = {
	boxA: createCustomShapeId('boxA'),
	boxB: createCustomShapeId('boxB'),
	boxC: createCustomShapeId('boxC'),
	boxD: createCustomShapeId('boxD'),
}

jest.useFakeTimers()

beforeEach(() => {
	app = new TestApp()
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

describe('app.packShapes', () => {
	it('packs shapes', () => {
		app.selectAll()
		const centerBefore = app.selectionBounds!.center.clone()
		app.packShapes()
		jest.advanceTimersByTime(1000)
		expect(app.shapesArray.map((s) => ({ ...s, parentId: 'wahtever' }))).toMatchSnapshot(
			'packed shapes'
		)
		const centerAfter = app.selectionBounds!.center.clone()
		expect(centerBefore).toMatchObject(centerAfter)
	})

	it('packs rotated shapes', () => {
		app.updateShapes([{ id: ids.boxA, type: 'geo', rotation: Math.PI }])
		app.selectAll().packShapes()
		jest.advanceTimersByTime(1000)
		expect(app.shapesArray.map((s) => ({ ...s, parentId: 'wahtever' }))).toMatchSnapshot(
			'packed shapes'
		)
	})
})
