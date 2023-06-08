import { createShapeId } from '../../schema/records/TLShape'
import { TLGeoShape } from '../../schema/shapes/TLGeoShape'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
	box5: createShapeId('box5'),
	missing: createShapeId('missing'),
}

beforeEach(() => {
	editor = new TestEditor()
})

it('Parents shapes to the current page if the parent is not found', () => {
	editor.createShapes([{ id: ids.box1, parentId: ids.missing, type: 'geo' }])
	expect(editor.getShapeById(ids.box1)!.parentId).toEqual(editor.currentPageId)
})

it('Creates shapes with the current style', () => {
	expect(editor.instanceState.propsForNextShape!.color).toBe('black')
	editor.createShapes([{ id: ids.box1, type: 'geo' }])
	expect(editor.getShapeById<TLGeoShape>(ids.box1)!.props.color).toEqual('black')

	editor.setProp('color', 'red')
	expect(editor.instanceState.propsForNextShape!.color).toBe('red')
	editor.createShapes([{ id: ids.box2, type: 'geo' }])
	expect(editor.getShapeById<TLGeoShape>(ids.box2)!.props.color).toEqual('red')
})

it('Creates shapes with the current opacity', () => {
	editor.setOpacity(0.5)
	editor.createShapes([{ id: ids.box3, type: 'geo' }])
	expect(editor.getShapeById<TLGeoShape>(ids.box3)!.opacity).toEqual(0.5)
})

it('Creates shapes at the correct index', () => {
	editor.createShapes([
		{ id: ids.box3, type: 'geo' },
		{ id: ids.box4, type: 'geo' },
	])
	expect(editor.getShapeById(ids.box3)!.index).toEqual('a1')
	expect(editor.getShapeById(ids.box4)!.index).toEqual('a2')

	editor.createShapes([{ id: ids.box5, type: 'geo' }])
	expect(editor.getShapeById(ids.box5)!.index).toEqual('a3')
})

it('Throws out all shapes if any shape is invalid', () => {
	const n = editor.shapeIds.size

	expect(() => {
		editor.createShapes([{ id: ids.box1, type: 'geo' }])
	}).not.toThrow()

	expect(editor.shapeIds.size).toBe(n + 1)

	console.error = jest.fn()

	// But these will need to be thrown out
	expect(() => {
		editor.createShapes([
			{ id: ids.box3, type: 'geo', x: 3 },
			// @ts-expect-error
			{ id: ids.box4, type: 'geo', x: 'three' }, // invalid x
		])
	}).toThrow()

	expect(editor.shapeIds.size).toBe(n + 1)
})
