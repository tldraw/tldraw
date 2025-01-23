import { TLGeoShape, createShapeId, toRichText } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

it("When changing the style of a geo shape, if the text label is empty, don't measure it", () => {
	const id = createShapeId()

	editor.createShapes<TLGeoShape>([
		{
			id,
			type: 'geo',
			props: {
				richText: toRichText(''),
				size: 's',
				w: 5,
				h: 5,
			},
		},
	])

	const boundsBefore = editor.getShapeGeometry(id).bounds

	editor.updateShapes<TLGeoShape>([
		{
			id,
			type: 'geo',
			props: { size: 'l' },
		},
	])

	expect(editor.getShapeGeometry(id).bounds).toMatchObject(boundsBefore)
})

it('When changing the style of a geo shape, if the text label has text, measure it and possibly update the size', () => {
	const id = createShapeId()

	editor.createShapes<TLGeoShape>([
		{
			id,
			type: 'geo',
			props: {
				richText: toRichText('h'),
				size: 's',
				w: 5,
				h: 5,
			},
		},
	])

	const boundsBefore = editor.getShapeGeometry(id).bounds!

	editor.updateShapes<TLGeoShape>([
		{
			id,
			type: 'geo',
			props: { size: 'l' },
		},
	])

	expect(editor.getShapeGeometry(id).bounds).not.toMatchObject(boundsBefore)
})
