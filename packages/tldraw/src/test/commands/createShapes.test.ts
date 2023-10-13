import { DefaultColorStyle, TLArrowShape, TLGeoShape, createShapeId } from '@tldraw/editor'
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

it('Uses typescript generics', () => {
	expect(() => {
		// No error here because no generic, the editor doesn't know what this guy is
		editor.createShapes([
			{
				id: ids.box1,
				type: 'geo',
				props: { w: 'OH NO' },
			},
		])
		// Yep error here because we are giving the wrong props to the shape
		editor.createShapes<TLGeoShape>([
			{
				id: ids.box1,
				type: 'geo',
				//@ts-expect-error
				props: { w: 'OH NO' },
			},
		])

		// Yep error here because we are giving the wrong generic
		editor.createShapes<TLArrowShape>([
			{
				id: ids.box1,
				//@ts-expect-error
				type: 'geo',
				//@ts-expect-error
				props: { w: 'OH NO' },
			},
		])

		// All good, correct match of generic and shape type
		editor.createShapes<TLGeoShape>([
			{
				id: ids.box1,
				type: 'geo',
				props: { w: 100 },
			},
		])

		editor.createShapes<TLGeoShape>([
			{
				id: ids.box1,
				type: 'geo',
			},
			{
				id: ids.box1,
				// @ts-expect-error - wrong type
				type: 'arrow',
			},
		])

		// Unions are supported just fine
		editor.createShapes<TLGeoShape | TLArrowShape>([
			{
				id: ids.box1,
				type: 'geo',
			},
			{
				id: ids.box1,
				type: 'arrow',
			},
		])
	}).toThrowError()
})

it('Parents shapes to the current page if the parent is not found', () => {
	editor.createShapes([{ id: ids.box1, parentId: ids.missing, type: 'geo' }])
	expect(editor.getShape(ids.box1)!.parentId).toEqual(editor.currentPageId)
})

it('Creates shapes with the current style', () => {
	expect(editor.instanceState.stylesForNextShape[DefaultColorStyle.id]).toBe(undefined)
	editor.createShapes([{ id: ids.box1, type: 'geo' }])
	expect(editor.getShape<TLGeoShape>(ids.box1)!.props.color).toEqual('black')

	editor.setStyleForSelectedShapes(DefaultColorStyle, 'red')
	editor.setStyleForNextShapes(DefaultColorStyle, 'red')
	expect(editor.instanceState.stylesForNextShape[DefaultColorStyle.id]).toBe('red')
	editor.createShapes([{ id: ids.box2, type: 'geo' }])
	expect(editor.getShape<TLGeoShape>(ids.box2)!.props.color).toEqual('red')
})

it('Creates shapes with the current opacity', () => {
	editor.setOpacityForNextShapes(0.5)
	editor.createShapes([{ id: ids.box3, type: 'geo' }])
	expect(editor.getShape<TLGeoShape>(ids.box3)!.opacity).toEqual(0.5)
})

it('Creates shapes at the correct index', () => {
	editor.createShapes([
		{ id: ids.box3, type: 'geo' },
		{ id: ids.box4, type: 'geo' },
	])
	expect(editor.getShape(ids.box3)!.index).toEqual('a1')
	expect(editor.getShape(ids.box4)!.index).toEqual('a2')

	editor.createShapes([{ id: ids.box5, type: 'geo' }])
	expect(editor.getShape(ids.box5)!.index).toEqual('a3')
})

it('Throws out all shapes if any shape is invalid', () => {
	const n = editor.currentPageShapeIds.size

	expect(() => {
		editor.createShapes([{ id: ids.box1, type: 'geo' }])
	}).not.toThrow()

	expect(editor.currentPageShapeIds.size).toBe(n + 1)

	console.error = jest.fn()

	// But these will need to be thrown out
	expect(() => {
		editor.createShapes([
			{ id: ids.box3, type: 'geo', x: 3 },
			// @ts-expect-error
			{ id: ids.box4, type: 'geo', x: 'three' }, // invalid x
		])
	}).toThrow()

	expect(editor.currentPageShapeIds.size).toBe(n + 1)
})
