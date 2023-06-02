import { createCustomShapeId } from '@tldraw/tlschema'
import { TestApp } from '../TestEditor'

let app: TestApp

jest.useFakeTimers()

const ids = {
	boxA: createCustomShapeId('boxA'),
	boxB: createCustomShapeId('boxB'),
	boxC: createCustomShapeId('boxC'),
	boxD: createCustomShapeId('boxD'),
}

beforeEach(() => {
	app = new TestApp()
})

// most of the resizeShape command logic is tested in the resizing.test.ts file
// this file is mainly for testing the default parameters and associated logic

describe('resizing a shape', () => {
	it('always squashes history entries', () => {
		app.createShapes([{ id: ids.boxA, type: 'geo', props: { w: 100, h: 100 } }])

		app.mark('start')
		const startHistoryLength = app.history.numUndos
		app.resizeShape(ids.boxA, { x: 2, y: 2 })
		expect(app.history.numUndos).toBe(startHistoryLength + 1)
		app.resizeShape(ids.boxA, { x: 2, y: 2 })
		expect(app.history.numUndos).toBe(startHistoryLength + 1)
		app.resizeShape(ids.boxA, { x: 2, y: 2 })
		expect(app.history.numUndos).toBe(startHistoryLength + 1)

		expect(app.getPageBoundsById(ids.boxA)).toCloselyMatchObject({
			w: 800,
			h: 800,
		})

		app.undo()
		expect(app.getPageBoundsById(ids.boxA)).toCloselyMatchObject({
			w: 100,
			h: 100,
		})
	})

	it('resizes from the center of the shape by default', () => {
		app.createShapes([{ id: ids.boxA, type: 'geo', props: { w: 100, h: 100 } }])

		app.resizeShape(ids.boxA, { x: 2, y: 2 })
		expect(app.getPageBoundsById(ids.boxA)).toCloselyMatchObject({
			x: -50,
			y: -50,
			w: 200,
			h: 200,
		})
	})
})
