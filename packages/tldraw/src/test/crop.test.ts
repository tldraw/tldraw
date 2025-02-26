import { TLImageShape, Vec, createShapeId } from '@tldraw/editor'
import { getCropBox } from '../lib/shapes/shared/crop'
import { TestEditor } from './TestEditor'

let editor: TestEditor
let shape: TLImageShape
const initialSize = { w: 100, h: 100 }
const initialCrop = {
	topLeft: { x: 0, y: 0 },
	bottomRight: { x: 1, y: 1 },
}

beforeEach(() => {
	editor = new TestEditor()
	const id = createShapeId() as TLImageShape['id']
	editor.createShapes([
		{
			id,
			type: 'image',
			x: 100,
			y: 100,
			props: {
				...initialSize,
				crop: initialCrop,
			},
		},
	])
	shape = editor.getShape<TLImageShape>(id)!
})

describe('Crop box', () => {
	it('Crops from the top left', () => {
		const results = getCropBox(shape, {
			handle: 'top_left',
			change: new Vec(10, 20),
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
		})
		expect(results).toMatchObject({
			x: 110,
			y: 120,
			props: {
				w: 90,
				h: 80,
				crop: {
					topLeft: { x: 0.1, y: 0.2 },
					bottomRight: { x: 1, y: 1 },
				},
			},
		})
	})

	it('Crops from the top right', () => {
		const results = getCropBox(shape, {
			handle: 'top_right',
			change: new Vec(-10, 20),
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
		})
		expect(results).toMatchObject({
			x: 100,
			y: 120,
			props: {
				w: 90,
				h: 80,
				crop: {
					topLeft: { x: 0, y: 0.2 },
					bottomRight: { x: 0.9, y: 1 },
				},
			},
		})
	})

	it('Crops from the bottom right', () => {
		const results = getCropBox(shape, {
			handle: 'bottom_right',
			change: new Vec(-10, -20),
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
		})
		expect(results).toMatchObject({
			x: 100,
			y: 100,
			props: {
				w: 90,
				h: 80,
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 0.9, y: 0.8 },
				},
			},
		})
	})

	it('Crops from the bottom left', () => {
		const results = getCropBox(shape, {
			handle: 'bottom_left',
			change: new Vec(10, -20),
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
		})
		expect(results).toMatchObject({
			x: 110,
			y: 100,
			props: {
				w: 90,
				h: 80,
				crop: {
					topLeft: { x: 0.1, y: 0 },
					bottomRight: { x: 1, y: 0.8 },
				},
			},
		})
	})

	it('Crop returns the same object when expanding out of the shape', () => {
		const results = getCropBox(shape, {
			handle: 'top_left',
			change: new Vec(-10, 0),
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
		})
		expect(results).toMatchObject({
			x: 100,
			y: 100,
			props: {
				w: 100,
				h: 100,
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
				},
			},
		})
	})

	it('Crop returns undefined if existing width and height is already less than minWidth and minHeight', () => {
		const results = getCropBox(
			shape,
			{
				handle: 'top_left',
				change: new Vec(10, 20),
				crop: initialCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
			},
			{
				minWidth: 110,
				minHeight: 110,
			}
		)
		expect(results).toBeUndefined()
	})
})
