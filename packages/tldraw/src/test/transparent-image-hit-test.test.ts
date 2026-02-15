import { AssetRecordType, createShapeId } from '@tldraw/editor'
import { isPointTransparent } from '../lib/shapes/image/ImageAlphaCache'
import { ImageRectangle2d } from '../lib/shapes/image/ImageRectangle2d'
import { TestEditor } from './TestEditor'

let editor: TestEditor

afterEach(() => {
	editor?.dispose()
})

describe('isPointTransparent', () => {
	it('returns true for fully transparent pixel', () => {
		const data = { width: 2, height: 2, alphas: new Uint8Array([0, 255, 255, 255]) }
		expect(isPointTransparent(data, 0, 0)).toBe(true)
	})

	it('returns false for fully opaque pixel', () => {
		const data = { width: 2, height: 2, alphas: new Uint8Array([0, 255, 255, 255]) }
		expect(isPointTransparent(data, 0.75, 0)).toBe(false)
	})

	it('returns true when alpha is below threshold', () => {
		const data = { width: 1, height: 1, alphas: new Uint8Array([9]) }
		expect(isPointTransparent(data, 0, 0, 10)).toBe(true)
	})

	it('returns false when alpha equals threshold', () => {
		const data = { width: 1, height: 1, alphas: new Uint8Array([10]) }
		expect(isPointTransparent(data, 0, 0, 10)).toBe(false)
	})
})

describe('ImageRectangle2d.rejectHit', () => {
	it('returns false when alpha data is not loaded', () => {
		const rect = new ImageRectangle2d({
			width: 100,
			height: 100,
			isFilled: true,
			alphaDataGetter: () => null,
			crop: null,
			flipX: false,
			flipY: false,
		})
		expect(rect.rejectHit({ x: 50, y: 50 })).toBe(false)
	})

	it('returns true for transparent pixel', () => {
		// 2x2 alpha map: top-left transparent, rest opaque
		const data = { width: 2, height: 2, alphas: new Uint8Array([0, 255, 255, 255]) }
		const rect = new ImageRectangle2d({
			width: 100,
			height: 100,
			isFilled: true,
			alphaDataGetter: () => data,
			crop: null,
			flipX: false,
			flipY: false,
		})
		// Point in top-left quadrant
		expect(rect.rejectHit({ x: 10, y: 10 })).toBe(true)
		// Point in top-right quadrant
		expect(rect.rejectHit({ x: 75, y: 10 })).toBe(false)
	})

	it('maps crop coordinates correctly', () => {
		// 4x1 alpha: [transparent, opaque, transparent, opaque]
		const data = { width: 4, height: 1, alphas: new Uint8Array([0, 255, 0, 255]) }
		const rect = new ImageRectangle2d({
			width: 100,
			height: 100,
			isFilled: true,
			alphaDataGetter: () => data,
			crop: { topLeft: { x: 0.5, y: 0 }, bottomRight: { x: 1, y: 1 } },
			flipX: false,
			flipY: false,
		})
		// Crop shows right half of image. Shape x=0 maps to image x=0.5 (pixel 2, alpha=0)
		expect(rect.rejectHit({ x: 10, y: 50 })).toBe(true)
		// Shape x=75 maps to image x=0.875 (pixel 3, alpha=255)
		expect(rect.rejectHit({ x: 75, y: 50 })).toBe(false)
	})

	it('handles flipX correctly', () => {
		// 2x1 alpha: [transparent, opaque]
		const data = { width: 2, height: 1, alphas: new Uint8Array([0, 255]) }
		const rect = new ImageRectangle2d({
			width: 100,
			height: 100,
			isFilled: true,
			alphaDataGetter: () => data,
			crop: null,
			flipX: true,
			flipY: false,
		})
		// With flipX, left side of shape maps to right side of image (opaque)
		expect(rect.rejectHit({ x: 10, y: 50 })).toBe(false)
		// Right side of shape maps to left side of image (transparent)
		expect(rect.rejectHit({ x: 90, y: 50 })).toBe(true)
	})

	it('handles flipY correctly', () => {
		// 1x2 alpha: [transparent, opaque]
		const data = { width: 1, height: 2, alphas: new Uint8Array([0, 255]) }
		const rect = new ImageRectangle2d({
			width: 100,
			height: 100,
			isFilled: true,
			alphaDataGetter: () => data,
			crop: null,
			flipX: false,
			flipY: true,
		})
		// With flipY, top of shape maps to bottom of image (opaque)
		expect(rect.rejectHit({ x: 50, y: 10 })).toBe(false)
		// Bottom of shape maps to top of image (transparent)
		expect(rect.rejectHit({ x: 50, y: 90 })).toBe(true)
	})
})

describe('getShapeAtPoint with transparent images', () => {
	const ids = {
		image: createShapeId('image'),
		box: createShapeId('box'),
		imageAsset: AssetRecordType.createId('imageAsset'),
	}

	beforeEach(() => {
		editor = new TestEditor()
		editor.createAssets([
			{
				type: 'image',
				id: ids.imageAsset,
				typeName: 'asset',
				props: {
					w: 100,
					h: 100,
					name: '',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'https://example.com/test.png',
				},
				meta: {},
			},
		])
		// Box behind the image
		editor.createShapes([
			{
				id: ids.box,
				type: 'geo',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, fill: 'solid' },
			},
		])
		// Image on top
		editor.createShapes([
			{
				id: ids.image,
				type: 'image',
				x: 0,
				y: 0,
				props: {
					w: 100,
					h: 100,
					assetId: ids.imageAsset,
					crop: null,
					flipX: false,
					flipY: false,
				},
			},
		])
	})

	it('returns shape behind image when geometry rejects hit', () => {
		// Mock the geometry to reject hits
		const imageShape = editor.getShape(ids.image)!
		const geo = editor.getShapeGeometry(imageShape)
		vi.spyOn(geo, 'rejectHit').mockReturnValue(true)

		const hit = editor.getShapeAtPoint({ x: 50, y: 50 }, { hitInside: true })
		expect(hit?.id).toBe(ids.box)
	})

	it('returns image when geometry does not reject hit', () => {
		const hit = editor.getShapeAtPoint({ x: 50, y: 50 }, { hitInside: true })
		expect(hit?.id).toBe(ids.image)
	})
})
