import { createCustomShapeId, TLGeoShape } from '@tldraw/tlschema'
import { TestEditor } from '../TestEditor'

let app: TestEditor

const ids = {
	box1: createCustomShapeId('box1'),
	box2: createCustomShapeId('box2'),
	box3: createCustomShapeId('box3'),
	box4: createCustomShapeId('box4'),
	box5: createCustomShapeId('box5'),
	missing: createCustomShapeId('missing'),
}

beforeEach(() => {
	app = new TestEditor()
})

it('Parents shapes to the current page if the parent is not found', () => {
	app.createShapes([{ id: ids.box1, parentId: ids.missing, type: 'geo' }])
	expect(app.getShapeById(ids.box1)!.parentId).toEqual(app.currentPageId)
})

it('Creates shapes with the current style', () => {
	expect(app.instanceState.propsForNextShape!.color).toBe('black')
	app.createShapes([{ id: ids.box1, type: 'geo' }])
	expect(app.getShapeById<TLGeoShape>(ids.box1)!.props.color).toEqual('black')

	app.setProp('color', 'red')
	expect(app.instanceState.propsForNextShape!.color).toBe('red')
	app.createShapes([{ id: ids.box2, type: 'geo' }])
	expect(app.getShapeById<TLGeoShape>(ids.box2)!.props.color).toEqual('red')
})

it('Creates shapes with the current opacity', () => {
	app.setProp('opacity', '0.5')
	app.createShapes([{ id: ids.box3, type: 'geo' }])
	expect(app.getShapeById<TLGeoShape>(ids.box3)!.props.opacity).toEqual('0.5')
})

it('Creates shapes at the correct index', () => {
	app.createShapes([
		{ id: ids.box3, type: 'geo' },
		{ id: ids.box4, type: 'geo' },
	])
	expect(app.getShapeById(ids.box3)!.index).toEqual('a1')
	expect(app.getShapeById(ids.box4)!.index).toEqual('a2')

	app.createShapes([{ id: ids.box5, type: 'geo' }])
	expect(app.getShapeById(ids.box5)!.index).toEqual('a3')
})

it('Throws out all shapes if any shape is invalid', () => {
	const n = app.shapeIds.size

	expect(() => {
		app.createShapes([{ id: ids.box1, type: 'geo' }])
	}).not.toThrow()

	expect(app.shapeIds.size).toBe(n + 1)

	console.error = jest.fn()

	// But these will need to be thrown out
	expect(() => {
		app.createShapes([
			{ id: ids.box3, type: 'geo', x: 3 },
			// @ts-expect-error
			{ id: ids.box4, type: 'geo', x: 'three' }, // invalid x
		])
	}).toThrow()

	expect(app.shapeIds.size).toBe(n + 1)
})
