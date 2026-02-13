import { createShapeId, Ellipse2d, Rectangle2d, TLImageShape } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

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
})
