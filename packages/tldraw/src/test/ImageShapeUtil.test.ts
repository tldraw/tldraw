import { createShapeId, Ellipse2d, Rectangle2d, TLImageShape } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

const ids = {
	image: createShapeId('image'),
	box: createShapeId('box'),
}

function createCroppedImageWithSibling() {
	editor.createShapes([
		{
			id: ids.image,
			type: 'image',
			x: 0,
			y: 0,
			props: {
				w: 100,
				h: 100,
				assetId: null,
				playing: true,
				url: '',
				// crop to the top-left quadrant of the source image
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 0.5, y: 0.5 },
				},
				flipX: false,
				flipY: false,
				altText: '',
			},
		},
		{
			id: ids.box,
			type: 'geo',
			x: 300,
			y: 0,
			props: { w: 100, h: 100 },
		},
	])
}

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

describe('ImageShapeUtil', () => {
	describe('getGeometry', () => {
		it('returns Rectangle2d for normal image shapes', () => {
			const shapeId = createShapeId()
			editor.createShapes([
				{
					id: shapeId,
					type: 'image',
					x: 0,
					y: 0,
					props: {
						w: 100,
						h: 80,
						assetId: null,
						playing: true,
						url: '',
						crop: null,
						flipX: false,
						flipY: false,
						altText: '',
					},
				},
			])

			const shape = editor.getShape<TLImageShape>(shapeId)!
			const util = editor.getShapeUtil(shape)
			const geometry = util.getGeometry(shape)

			expect(geometry).toBeInstanceOf(Rectangle2d)
			expect(geometry.bounds.width).toBe(100)
			expect(geometry.bounds.height).toBe(80)
			expect(geometry.isFilled).toBe(true)
		})

		it('returns Rectangle2d for cropped image shapes that are not circular', () => {
			const shapeId = createShapeId()
			editor.createShapes([
				{
					id: shapeId,
					type: 'image',
					x: 0,
					y: 0,
					props: {
						w: 100,
						h: 80,
						assetId: null,
						playing: true,
						url: '',
						crop: {
							topLeft: { x: 0.1, y: 0.1 },
							bottomRight: { x: 0.9, y: 0.9 },
							isCircle: false,
						},
						flipX: false,
						flipY: false,
						altText: '',
					},
				},
			])

			const shape = editor.getShape<TLImageShape>(shapeId)!
			const util = editor.getShapeUtil(shape)
			const geometry = util.getGeometry(shape)

			expect(geometry).toBeInstanceOf(Rectangle2d)
			expect(geometry.bounds.width).toBe(100)
			expect(geometry.bounds.height).toBe(80)
			expect(geometry.isFilled).toBe(true)
		})

		it('returns Ellipse2d for circle cropped image shapes', () => {
			const shapeId = createShapeId()
			editor.createShapes([
				{
					id: shapeId,
					type: 'image',
					x: 0,
					y: 0,
					props: {
						w: 120,
						h: 90,
						assetId: null,
						playing: true,
						url: '',
						crop: {
							topLeft: { x: 0.1, y: 0.1 },
							bottomRight: { x: 0.9, y: 0.9 },
							isCircle: true,
						},
						flipX: false,
						flipY: false,
						altText: '',
					},
				},
			])

			const shape = editor.getShape<TLImageShape>(shapeId)!
			const util = editor.getShapeUtil(shape)
			const geometry = util.getGeometry(shape)

			expect(geometry).toBeInstanceOf(Ellipse2d)
			expect(geometry.bounds.width).toBe(120)
			expect(geometry.bounds.height).toBe(90)
			expect(geometry.isFilled).toBe(true)
		})

		it('returns Ellipse2d for circle cropped image shapes with different dimensions', () => {
			const shapeId = createShapeId()
			editor.createShapes([
				{
					id: shapeId,
					type: 'image',
					x: 0,
					y: 0,
					props: {
						w: 200,
						h: 150,
						assetId: null,
						playing: true,
						url: '',
						crop: {
							topLeft: { x: 0, y: 0 },
							bottomRight: { x: 1, y: 1 },
							isCircle: true,
						},
						flipX: false,
						flipY: false,
						altText: '',
					},
				},
			])

			const shape = editor.getShape<TLImageShape>(shapeId)!
			const util = editor.getShapeUtil(shape)
			const geometry = util.getGeometry(shape)

			expect(geometry).toBeInstanceOf(Ellipse2d)
			expect(geometry.bounds.width).toBe(200)
			expect(geometry.bounds.height).toBe(150)
			expect(geometry.isFilled).toBe(true)
		})
	})

	describe('flipping a cropped image when its group is resized', () => {
		it('mirrors the crop when a grouped cropped image is flipped by drag resize', () => {
			createCroppedImageWithSibling()
			editor.select(ids.image, ids.box)
			editor.groupShapes(editor.getSelectedShapeIds())

			// Flip the group horizontally by dragging a corner handle past the
			// opposite edge. The drag scale is not exactly -1, which is the case
			// that previously left the crop un-mirrored.
			editor.resizeSelection({ scaleX: -2, scaleY: 1 }, 'top_left')

			const image = editor.getShape<TLImageShape>(ids.image)!
			expect(image.props.flipX).toBe(true)
			// The crop should be mirrored horizontally and unchanged vertically.
			expect(image.props.crop).toMatchObject({
				topLeft: { x: 0.5, y: 0 },
				bottomRight: { x: 1, y: 0.5 },
			})
		})

		it('mirrors the crop vertically when a grouped cropped image is flipped by drag resize', () => {
			createCroppedImageWithSibling()
			editor.select(ids.image, ids.box)
			editor.groupShapes(editor.getSelectedShapeIds())

			editor.resizeSelection({ scaleX: 1, scaleY: -2 }, 'top_left')

			const image = editor.getShape<TLImageShape>(ids.image)!
			expect(image.props.flipY).toBe(true)
			expect(image.props.crop).toMatchObject({
				topLeft: { x: 0, y: 0.5 },
				bottomRight: { x: 0.5, y: 1 },
			})
		})

		it('matches the flipShapes command result for a grouped cropped image', () => {
			createCroppedImageWithSibling()
			editor.select(ids.image, ids.box)
			editor.groupShapes(editor.getSelectedShapeIds())
			editor.flipShapes(editor.getSelectedShapeIds(), 'horizontal')

			const image = editor.getShape<TLImageShape>(ids.image)!
			expect(image.props.flipX).toBe(true)
			expect(image.props.crop).toMatchObject({
				topLeft: { x: 0.5, y: 0 },
				bottomRight: { x: 1, y: 0.5 },
			})
		})
	})
})
