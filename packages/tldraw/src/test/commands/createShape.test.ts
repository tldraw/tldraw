import { TLArrowShape, TLGeoShape, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
}

beforeEach(() => {
	editor = new TestEditor()
})

it('Uses typescript generics', () => {
	expect(() => {
		editor.createShape(
			//@ts-expect-error Yep error because we are giving the wrong props to the shape
			{
				id: ids.box1,
				type: 'geo',
				props: { w: 'OH NO' },
			}
		)

		// Errors when creating a shape with unknown props
		editor.createShape({
			id: ids.box1,
			type: 'geo',
			props: {
				// @ts-expect-error
				foo: 'bar',
			},
		})

		// Yep error here because we are giving the wrong props to the shape
		editor.createShape<TLGeoShape>({
			id: ids.box1,
			type: 'geo',
			//@ts-expect-error
			props: { w: 'OH NO' },
		})

		// Yep error here because we are giving the wrong generic
		editor.createShape<TLArrowShape>({
			id: ids.box1,
			//@ts-expect-error
			type: 'geo',
			//@ts-expect-error
			props: { w: 'OH NO' },
		})

		// All good, correct match of generic and shape type
		editor.createShape<TLGeoShape>({
			id: ids.box1,
			type: 'geo',
			props: { w: 100 },
		})

		editor.createShape<TLGeoShape>({
			id: ids.box1,
			type: 'geo',
		})
	}).toThrow()
})
