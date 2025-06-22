import { TLImageShape, Vec, createShapeId } from '@tldraw/editor'
import {
	getCropBox,
	getCroppedImageDataForAspectRatio,
	getCroppedImageDataWhenZooming,
} from '../lib/shapes/shared/crop'
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

describe('getCroppedImageDataWhenZooming', () => {
	it('maintains the aspect ratio when zooming', () => {
		const imageShape: TLImageShape = {
			...shape,
			props: {
				...shape.props,
				w: 100,
				h: 50, // 2:1 aspect ratio
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
				},
			},
		}

		const result = getCroppedImageDataWhenZooming(0.5, imageShape)

		// Check that aspect ratio is preserved
		expect(result.w / result.h).toBeCloseTo(2, 5)

		// Check that crop dimensions are correct
		const cropWidth = result.crop.bottomRight.x - result.crop.topLeft.x
		const cropHeight = result.crop.bottomRight.y - result.crop.topLeft.y
		expect(cropWidth / cropHeight).toBe(1)
	})

	it('maintains the aspect ratio of a non-default crop when zooming', () => {
		const imageShape: TLImageShape = {
			...shape,
			props: {
				...shape.props,
				w: 80,
				h: 80, // 1:1 original image
				crop: {
					// 2:1 crop aspect ratio
					topLeft: { x: 0.25, y: 0.375 },
					bottomRight: { x: 0.75, y: 0.625 },
				},
			},
		}

		const result = getCroppedImageDataWhenZooming(0.5, imageShape)

		// Check that the crop aspect ratio is preserved (2:1)
		const cropWidth = result.crop.bottomRight.x - result.crop.topLeft.x
		const cropHeight = result.crop.bottomRight.y - result.crop.topLeft.y
		expect(cropWidth / cropHeight).toBeCloseTo(2, 5)
		expect(result.w / result.h).toBe(1)
	})

	it('applies zoom scaling (max 3x)', () => {
		const imageShape: TLImageShape = {
			...shape,
			props: {
				...shape.props,
				w: 100,
				h: 100,
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
				},
			},
		}

		// Zoom to 100% (max zoom)
		const result = getCroppedImageDataWhenZooming(1, imageShape)

		// At max zoom, the crop window should be smaller
		const cropWidth = result.crop.bottomRight.x - result.crop.topLeft.x
		const cropHeight = result.crop.bottomRight.y - result.crop.topLeft.y
		expect(cropWidth).toBeCloseTo(0.33, 2)
		expect(cropHeight).toBeCloseTo(0.33, 2)

		expect(result.w).toBeCloseTo(99.99, 1)
		expect(result.h).toBeCloseTo(99.99, 1)
	})

	it('applies custom maxZoom scaling', () => {
		const imageShape: TLImageShape = {
			...shape,
			props: {
				...shape.props,
				w: 100,
				h: 100,
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
				},
			},
		}

		// Apply zoom with a custom maxZoom of 2x
		const result = getCroppedImageDataWhenZooming(0.75, imageShape, 0.8)

		// Verify that the crop dimensions respect the custom maxZoom
		const cropWidth = result.crop.bottomRight.x - result.crop.topLeft.x
		const cropHeight = result.crop.bottomRight.y - result.crop.topLeft.y
		expect(cropWidth).toBe(0.25)
		expect(cropHeight).toBe(0.25)

		expect(result.w).toBeCloseTo(74.99, 1)
		expect(result.h).toBeCloseTo(74.99, 1)
	})

	it('preserves circular crops', () => {
		const imageShape: TLImageShape = {
			...shape,
			props: {
				...shape.props,
				w: 100,
				h: 100,
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
					isCircle: true,
				},
			},
		}

		const result = getCroppedImageDataWhenZooming(0.5, imageShape)

		// Verify that isCircle property is preserved
		expect(result.crop.isCircle).toBe(true)
	})

	it('preserves crop center when zooming with crop in bottom right quadrant', () => {
		// Create image with crop in bottom right quadrant
		const imageShape: TLImageShape = {
			...shape,
			props: {
				...shape.props,
				w: 100,
				h: 100,
				crop: {
					// Crop in bottom right quadrant
					topLeft: { x: 0.6, y: 0.6 },
					bottomRight: { x: 0.9, y: 0.9 },
				},
			},
		}

		// Calculate the center of the original crop
		const originalCropCenterX = (0.6 + 0.9) / 2
		const originalCropCenterY = (0.6 + 0.9) / 2

		// Apply zoom operation
		const result = getCroppedImageDataWhenZooming(0.5, imageShape)

		// Calculate center of the new crop
		const newCropCenterX = (result.crop.topLeft.x + result.crop.bottomRight.x) / 2
		const newCropCenterY = (result.crop.topLeft.y + result.crop.bottomRight.y) / 2

		// Center should be preserved
		expect(newCropCenterX).toBeCloseTo(originalCropCenterX, 5)
		expect(newCropCenterY).toBeCloseTo(originalCropCenterY, 5)
	})
})

describe('getCroppedImageDataForAspectRatio', () => {
	it('returns full image for original aspect ratio', () => {
		const imageShape: TLImageShape = {
			...shape,
			props: {
				...shape.props,
				w: 80,
				h: 100,
				crop: {
					topLeft: { x: 0.2, y: 0.1 },
					bottomRight: { x: 0.8, y: 0.9 },
				},
			},
		}

		const result = getCroppedImageDataForAspectRatio('original', imageShape)

		expect(result?.crop).toEqual({
			topLeft: { x: 0, y: 0 },
			bottomRight: { x: 1, y: 1 },
		})

		expect(result?.w).toBeCloseTo(133, 0)
		expect(result?.h).toBeCloseTo(125, 0)
	})

	it('creates perfect squares for square aspect ratio', () => {
		const imageShape: TLImageShape = {
			...shape,
			props: {
				...shape.props,
				w: 100,
				h: 50, // 2:1 aspect ratio
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
				},
			},
		}

		const result = getCroppedImageDataForAspectRatio('square', imageShape)

		// Crop window should be square
		const aspectRatio = result.w / result.h
		expect(aspectRatio).toEqual(1)
	})

	it('creates circular crops for circle aspect ratio', () => {
		const imageShape: TLImageShape = {
			...shape,
			props: {
				...shape.props,
				w: 100,
				h: 80,
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
				},
			},
		}

		const result = getCroppedImageDataForAspectRatio('circle', imageShape)

		// Should be marked as a circle
		expect(result?.crop.isCircle).toBe(true)

		// Crop window should be 1:1
		const aspectRatio = result.w / result.h
		expect(aspectRatio).toEqual(1)
	})

	it('applies landscape crop to a square image', () => {
		// Start with a square image (100x100)
		const squareImage: TLImageShape = {
			...shape,
			props: {
				...shape.props,
				w: 100,
				h: 100,
				crop: {
					// Default crop (full image)
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
				},
			},
		}

		// Apply a landscape crop
		const result = getCroppedImageDataForAspectRatio('landscape', squareImage)

		// Should have 4:3 aspect ratio (landscape)
		expect((result?.w as number) / (result?.h as number)).toBeCloseTo(4 / 3, 5)

		// Should preserve the center of the image
		const cropCenterX = (result!.crop.topLeft.x + result!.crop.bottomRight.x) / 2
		const cropCenterY = (result!.crop.topLeft.y + result!.crop.bottomRight.y) / 2
		expect(cropCenterX).toBeCloseTo(0.5, 5)
		expect(cropCenterY).toBeCloseTo(0.5, 5)
	})

	it('applies portrait crop to a square image', () => {
		// Start with a square image (100x100)
		const squareImage: TLImageShape = {
			...shape,
			props: {
				...shape.props,
				w: 100,
				h: 100,
				crop: {
					// Default crop (full image)
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
				},
			},
		}

		// Apply a portrait crop
		const result = getCroppedImageDataForAspectRatio('portrait', squareImage)

		// Should have 3:4 aspect ratio (portrait)
		expect((result?.w as number) / (result?.h as number)).toBeCloseTo(3 / 4, 5)

		// Should preserve the center of the image
		const cropCenterX = (result!.crop.topLeft.x + result!.crop.bottomRight.x) / 2
		const cropCenterY = (result!.crop.topLeft.y + result!.crop.bottomRight.y) / 2
		expect(cropCenterX).toBeCloseTo(0.5, 5)
		expect(cropCenterY).toBeCloseTo(0.5, 5)
	})
})

describe('Resizing crop box when not aspect-ratio locked', () => {
	it('Resizes from the top left corner', () => {
		const results = getCropBox(shape, {
			handle: 'top_left',
			change: new Vec(10, 20),
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: false,
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

	it('Resizes from the top right corner', () => {
		const results = getCropBox(shape, {
			handle: 'top_right',
			change: new Vec(-10, 20),
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: false,
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

	it('Resizes from the bottom right corner', () => {
		const results = getCropBox(shape, {
			handle: 'bottom_right',
			change: new Vec(-10, -20),
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: false,
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

	it('Resizes from the bottom left corner', () => {
		const results = getCropBox(shape, {
			handle: 'bottom_left',
			change: new Vec(10, -20),
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: false,
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

	it('Resizes from the top edge', () => {
		const results = getCropBox(shape, {
			handle: 'top',
			change: new Vec(0, 20),
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: false,
		})
		expect(results).toMatchObject({
			x: 100,
			y: 120,
			props: {
				w: 100,
				h: 80,
				crop: {
					topLeft: { x: 0, y: 0.2 },
					bottomRight: { x: 1, y: 1 },
				},
			},
		})
	})

	it('Resizes from the right edge', () => {
		const results = getCropBox(shape, {
			handle: 'right',
			change: new Vec(-10, 0),
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: false,
		})
		expect(results).toMatchObject({
			x: 100,
			y: 100,
			props: {
				w: 90,
				h: 100,
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 0.9, y: 1 },
				},
			},
		})
	})

	it('Resizes from the bottom edge', () => {
		const results = getCropBox(shape, {
			handle: 'bottom',
			change: new Vec(0, -20),
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: false,
		})
		expect(results).toMatchObject({
			x: 100,
			y: 100,
			props: {
				w: 100,
				h: 80,
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 0.8 },
				},
			},
		})
	})

	it('Resizes from the left edge', () => {
		const results = getCropBox(shape, {
			handle: 'left',
			change: new Vec(10, 0),
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: false,
		})
		expect(results).toMatchObject({
			x: 110,
			y: 100,
			props: {
				w: 90,
				h: 100,
				crop: {
					topLeft: { x: 0.1, y: 0 },
					bottomRight: { x: 1, y: 1 },
				},
			},
		})
	})

	it('When overlapping edges, does not produce a result with < 0 or > 1 for x or y crop dimensions', () => {
		// Test dragging top edge down beyond bottom edge
		const results1 = getCropBox(shape, {
			handle: 'top',
			change: new Vec(0, 150), // Try to drag top edge past bottom
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: false,
		})
		if (results1?.props.crop) {
			expect(results1.props.crop.topLeft.y).toBeGreaterThanOrEqual(0)
			expect(results1.props.crop.topLeft.y).toBeLessThan(results1.props.crop.bottomRight.y)
			expect(results1.props.crop.bottomRight.y).toBeLessThanOrEqual(1)
		}

		// Test dragging left edge right beyond right edge
		const results2 = getCropBox(shape, {
			handle: 'left',
			change: new Vec(150, 0), // Try to drag left edge past right
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: false,
		})
		if (results2?.props.crop) {
			expect(results2.props.crop.topLeft.x).toBeGreaterThanOrEqual(0)
			expect(results2.props.crop.topLeft.x).toBeLessThan(results2.props.crop.bottomRight.x)
			expect(results2.props.crop.bottomRight.x).toBeLessThanOrEqual(1)
		}

		// Test dragging corner to extreme position
		const results3 = getCropBox(shape, {
			handle: 'top_left',
			change: new Vec(150, 150), // Try to drag top-left corner beyond bottom-right
			crop: initialCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: false,
		})
		if (results3?.props.crop) {
			expect(results3.props.crop.topLeft.x).toBeGreaterThanOrEqual(0)
			expect(results3.props.crop.topLeft.y).toBeGreaterThanOrEqual(0)
			expect(results3.props.crop.topLeft.x).toBeLessThan(results3.props.crop.bottomRight.x)
			expect(results3.props.crop.topLeft.y).toBeLessThan(results3.props.crop.bottomRight.y)
			expect(results3.props.crop.bottomRight.x).toBeLessThanOrEqual(1)
			expect(results3.props.crop.bottomRight.y).toBeLessThanOrEqual(1)
		}
	})
})

describe('Resizing crop box when aspect-ratio locked', () => {
	// When resizing from a corner, the opposite corner should be preserved
	// When resizing from an edge, the opposite edge's mid point should be preserved
	// The result should have the same aspect ratio as the initial crop
	// The result should never have any dimension < 0 or > 1

	it.todo('Resizes from the top left corner')

	it.todo('Resizes from the top right corner')

	it.todo('Resizes from the bottom right corner')

	it.todo('Resizes from the bottom left corner')

	it.todo('Resizes from the top edge')

	it.todo('Resizes from the right edge')

	it.todo('Resizes from the bottom edge')

	it.todo('Resizes from the left edge')

	it.todo(
		'When overlapping edges, does not produce a result with < 0 or > 1 for x or y crop dimensions and maintains the aspect ratio'
	)
})
