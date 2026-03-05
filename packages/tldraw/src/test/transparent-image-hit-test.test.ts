import { AssetRecordType, createShapeId } from '@tldraw/editor'
import { isPointTransparent } from '../lib/shapes/image/ImageAlphaCache'
import { ImageEllipse2d, ImageRectangle2d } from '../lib/shapes/image/ImageAlphaGeometry'
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

describe('ImageRectangle2d.ignoreHit', () => {
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
		expect(rect.ignoreHit({ x: 50, y: 50 })).toBe(false)
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
		expect(rect.ignoreHit({ x: 10, y: 10 })).toBe(true)
		// Point in top-right quadrant
		expect(rect.ignoreHit({ x: 75, y: 10 })).toBe(false)
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
		expect(rect.ignoreHit({ x: 10, y: 50 })).toBe(true)
		// Shape x=75 maps to image x=0.875 (pixel 3, alpha=255)
		expect(rect.ignoreHit({ x: 75, y: 50 })).toBe(false)
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
		expect(rect.ignoreHit({ x: 10, y: 50 })).toBe(false)
		// Right side of shape maps to left side of image (transparent)
		expect(rect.ignoreHit({ x: 90, y: 50 })).toBe(true)
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
		expect(rect.ignoreHit({ x: 50, y: 10 })).toBe(false)
		// Bottom of shape maps to top of image (transparent)
		expect(rect.ignoreHit({ x: 50, y: 90 })).toBe(true)
	})
})

describe('ImageRectangle2d.hitTestPoint', () => {
	it('returns false for transparent pixel', () => {
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
		// Point in top-left quadrant (transparent)
		expect(rect.hitTestPoint({ x: 10, y: 10 }, 0, true)).toBe(false)
	})

	it('returns true for opaque pixel', () => {
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
		// Point in top-right quadrant (opaque)
		expect(rect.hitTestPoint({ x: 75, y: 10 }, 0, true)).toBe(true)
	})

	it('returns false with margin > 0 near transparent edge', () => {
		// 2x1 alpha: [transparent, opaque]
		const data = { width: 2, height: 1, alphas: new Uint8Array([0, 255]) }
		const rect = new ImageRectangle2d({
			width: 100,
			height: 100,
			isFilled: true,
			alphaDataGetter: () => data,
			crop: null,
			flipX: false,
			flipY: false,
		})
		// Point near the top edge with margin, but in transparent left half
		expect(rect.hitTestPoint({ x: 10, y: -2 }, 5, true)).toBe(false)
	})

	it('returns true when alpha data is not loaded', () => {
		const rect = new ImageRectangle2d({
			width: 100,
			height: 100,
			isFilled: true,
			alphaDataGetter: () => null,
			crop: null,
			flipX: false,
			flipY: false,
		})
		// Should treat as opaque when data isn't loaded
		expect(rect.hitTestPoint({ x: 50, y: 50 }, 0, true)).toBe(true)
	})
})

describe('ImageRectangle2d.ignoreHit with edge-margin clamping', () => {
	it('clamps point slightly outside bounds to nearest edge pixel', () => {
		// 2x1 alpha: [transparent, opaque]
		const data = { width: 2, height: 1, alphas: new Uint8Array([0, 255]) }
		const rect = new ImageRectangle2d({
			width: 100,
			height: 100,
			isFilled: true,
			alphaDataGetter: () => data,
			crop: null,
			flipX: false,
			flipY: false,
		})
		// Point slightly outside left edge — clamps to left (transparent) pixel
		expect(rect.ignoreHit({ x: -2, y: 50 })).toBe(true)
		// Point slightly outside right edge — clamps to right (opaque) pixel
		expect(rect.ignoreHit({ x: 102, y: 50 })).toBe(false)
	})
})

describe('ImageEllipse2d.hitTestPoint', () => {
	it('returns false for transparent pixel', () => {
		const data = { width: 2, height: 2, alphas: new Uint8Array([0, 255, 255, 255]) }
		const ellipse = new ImageEllipse2d({
			width: 100,
			height: 100,
			isFilled: true,
			alphaDataGetter: () => data,
			crop: null,
			flipX: false,
			flipY: false,
		})
		// Point near center-ish but in top-left quadrant (transparent)
		expect(ellipse.hitTestPoint({ x: 25, y: 25 }, 0, true)).toBe(false)
	})

	it('returns true for opaque pixel', () => {
		const data = { width: 2, height: 2, alphas: new Uint8Array([0, 255, 255, 255]) }
		const ellipse = new ImageEllipse2d({
			width: 100,
			height: 100,
			isFilled: true,
			alphaDataGetter: () => data,
			crop: null,
			flipX: false,
			flipY: false,
		})
		// Point in bottom-right quadrant (opaque)
		expect(ellipse.hitTestPoint({ x: 75, y: 75 }, 0, true)).toBe(true)
	})

	it('returns true when alpha data is not loaded', () => {
		const ellipse = new ImageEllipse2d({
			width: 100,
			height: 100,
			isFilled: true,
			alphaDataGetter: () => null,
			crop: null,
			flipX: false,
			flipY: false,
		})
		expect(ellipse.hitTestPoint({ x: 50, y: 50 }, 0, true)).toBe(true)
	})
})

describe('ImageEllipse2d.ignoreHit', () => {
	it('returns true for transparent pixel', () => {
		const data = { width: 2, height: 2, alphas: new Uint8Array([0, 255, 255, 255]) }
		const ellipse = new ImageEllipse2d({
			width: 100,
			height: 100,
			isFilled: true,
			alphaDataGetter: () => data,
			crop: null,
			flipX: false,
			flipY: false,
		})
		expect(ellipse.ignoreHit({ x: 25, y: 25 })).toBe(true)
	})

	it('returns false for opaque pixel', () => {
		const data = { width: 2, height: 2, alphas: new Uint8Array([0, 255, 255, 255]) }
		const ellipse = new ImageEllipse2d({
			width: 100,
			height: 100,
			isFilled: true,
			alphaDataGetter: () => data,
			crop: null,
			flipX: false,
			flipY: false,
		})
		expect(ellipse.ignoreHit({ x: 75, y: 75 })).toBe(false)
	})

	it('returns false when alpha data is not loaded', () => {
		const ellipse = new ImageEllipse2d({
			width: 100,
			height: 100,
			isFilled: true,
			alphaDataGetter: () => null,
			crop: null,
			flipX: false,
			flipY: false,
		})
		expect(ellipse.ignoreHit({ x: 50, y: 50 })).toBe(false)
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
		vi.spyOn(geo, 'ignoreHit').mockReturnValue(true)

		const hit = editor.getShapeAtPoint({ x: 50, y: 50 }, { hitInside: true })
		expect(hit?.id).toBe(ids.box)
	})

	it('returns image when geometry does not reject hit', () => {
		const hit = editor.getShapeAtPoint({ x: 50, y: 50 }, { hitInside: true })
		expect(hit?.id).toBe(ids.image)
	})
})
