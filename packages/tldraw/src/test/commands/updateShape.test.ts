import { TLArrowShape, TLGeoShape, createShapeId } from '@tldraw/editor'
import { TestEditor, createDefaultShapes } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes(createDefaultShapes())
})

it('Uses typescript generics', () => {
	expect(() => {
		editor.updateShape({
			id: ids.box1,
			type: 'geo',
			props: {
				// @ts-expect-error
				w: 'OH NO',
			},
		})

		// Errors when updating a shape with unknown props
		editor.updateShape({
			id: ids.box1,
			type: 'geo',
			props: {
				// @ts-expect-error
				foo: 'bar',
			},
		})

		// error here because we are giving the wrong props to the shape
		editor.updateShape<TLGeoShape>({
			id: ids.box1,
			type: 'geo',
			props: {
				// @ts-expect-error
				w: 'OH NO',
			},
		})

		// Yep error here because we are giving the wrong generic
		editor.updateShape<TLArrowShape>({
			id: ids.box1,
			//@ts-expect-error
			type: 'geo',
			//@ts-expect-error
			props: { w: 'OH NO' },
		})

		// All good, correct match of generic and shape type
		editor.updateShape<TLGeoShape>({
			id: ids.box1,
			type: 'geo',
			props: { w: 100 },
		})

		editor.updateShape<TLGeoShape>({
			id: ids.box1,
			type: 'geo',
		})
	}).toThrow()
})
