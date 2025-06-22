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

	it('Resizes from the top left corner', () => {
		const testCrop = {
			topLeft: { x: 0.2, y: 0.3 },
			bottomRight: { x: 0.8, y: 0.7 },
		}
		const initialAspectRatio =
			(testCrop.bottomRight.x - testCrop.topLeft.x) / (testCrop.bottomRight.y - testCrop.topLeft.y)

		const results = getCropBox(shape, {
			handle: 'top_left',
			change: new Vec(10, 15),
			crop: testCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: true,
		})

		if (results?.props.crop) {
			// Bottom right corner should be preserved
			expect(results.props.crop.bottomRight.x).toBeCloseTo(testCrop.bottomRight.x, 5)
			expect(results.props.crop.bottomRight.y).toBeCloseTo(testCrop.bottomRight.y, 5)

			// Aspect ratio should be maintained
			const newAspectRatio =
				(results.props.crop.bottomRight.x - results.props.crop.topLeft.x) /
				(results.props.crop.bottomRight.y - results.props.crop.topLeft.y)
			expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)

			// All coordinates should be within valid bounds
			expect(results.props.crop.topLeft.x).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.topLeft.y).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.bottomRight.x).toBeLessThanOrEqual(1)
			expect(results.props.crop.bottomRight.y).toBeLessThanOrEqual(1)
		}
	})

	it('Resizes from the top right corner', () => {
		const testCrop = {
			topLeft: { x: 0.2, y: 0.3 },
			bottomRight: { x: 0.8, y: 0.7 },
		}
		const initialAspectRatio =
			(testCrop.bottomRight.x - testCrop.topLeft.x) / (testCrop.bottomRight.y - testCrop.topLeft.y)

		const results = getCropBox(shape, {
			handle: 'top_right',
			change: new Vec(-10, 15),
			crop: testCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: true,
		})

		if (results?.props.crop) {
			// Bottom left corner should be preserved
			expect(results.props.crop.topLeft.x).toBeCloseTo(testCrop.topLeft.x, 5)
			expect(results.props.crop.bottomRight.y).toBeCloseTo(testCrop.bottomRight.y, 5)

			// Aspect ratio should be maintained
			const newAspectRatio =
				(results.props.crop.bottomRight.x - results.props.crop.topLeft.x) /
				(results.props.crop.bottomRight.y - results.props.crop.topLeft.y)
			expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)

			// All coordinates should be within valid bounds
			expect(results.props.crop.topLeft.x).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.topLeft.y).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.bottomRight.x).toBeLessThanOrEqual(1)
			expect(results.props.crop.bottomRight.y).toBeLessThanOrEqual(1)
		}
	})

	it('Resizes from the bottom right corner', () => {
		const testCrop = {
			topLeft: { x: 0.2, y: 0.3 },
			bottomRight: { x: 0.8, y: 0.7 },
		}
		const initialAspectRatio =
			(testCrop.bottomRight.x - testCrop.topLeft.x) / (testCrop.bottomRight.y - testCrop.topLeft.y)

		const results = getCropBox(shape, {
			handle: 'bottom_right',
			change: new Vec(-10, -15),
			crop: testCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: true,
		})

		if (results?.props.crop) {
			// Top left corner should be preserved
			expect(results.props.crop.topLeft.x).toBeCloseTo(testCrop.topLeft.x, 5)
			expect(results.props.crop.topLeft.y).toBeCloseTo(testCrop.topLeft.y, 5)

			// Aspect ratio should be maintained
			const newAspectRatio =
				(results.props.crop.bottomRight.x - results.props.crop.topLeft.x) /
				(results.props.crop.bottomRight.y - results.props.crop.topLeft.y)
			expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)

			// All coordinates should be within valid bounds
			expect(results.props.crop.topLeft.x).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.topLeft.y).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.bottomRight.x).toBeLessThanOrEqual(1)
			expect(results.props.crop.bottomRight.y).toBeLessThanOrEqual(1)
		}
	})

	it('Resizes from the bottom left corner', () => {
		const testCrop = {
			topLeft: { x: 0.2, y: 0.3 },
			bottomRight: { x: 0.8, y: 0.7 },
		}
		const initialAspectRatio =
			(testCrop.bottomRight.x - testCrop.topLeft.x) / (testCrop.bottomRight.y - testCrop.topLeft.y)

		const results = getCropBox(shape, {
			handle: 'bottom_left',
			change: new Vec(10, -15),
			crop: testCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: true,
		})

		if (results?.props.crop) {
			// Top right corner should be preserved
			expect(results.props.crop.bottomRight.x).toBeCloseTo(testCrop.bottomRight.x, 5)
			expect(results.props.crop.topLeft.y).toBeCloseTo(testCrop.topLeft.y, 5)

			// Aspect ratio should be maintained
			const newAspectRatio =
				(results.props.crop.bottomRight.x - results.props.crop.topLeft.x) /
				(results.props.crop.bottomRight.y - results.props.crop.topLeft.y)
			expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)

			// All coordinates should be within valid bounds
			expect(results.props.crop.topLeft.x).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.topLeft.y).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.bottomRight.x).toBeLessThanOrEqual(1)
			expect(results.props.crop.bottomRight.y).toBeLessThanOrEqual(1)
		}
	})

	it('Resizes from the top edge', () => {
		const testCrop = {
			topLeft: { x: 0.2, y: 0.3 },
			bottomRight: { x: 0.8, y: 0.7 },
		}
		const initialAspectRatio =
			(testCrop.bottomRight.x - testCrop.topLeft.x) / (testCrop.bottomRight.y - testCrop.topLeft.y)
		const initialCenterX = (testCrop.topLeft.x + testCrop.bottomRight.x) / 2

		const results = getCropBox(shape, {
			handle: 'top',
			change: new Vec(0, 15),
			crop: testCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: true,
		})

		if (results?.props.crop) {
			// Bottom edge and horizontal center should be preserved
			expect(results.props.crop.bottomRight.y).toBeCloseTo(testCrop.bottomRight.y, 5)
			const newCenterX = (results.props.crop.topLeft.x + results.props.crop.bottomRight.x) / 2
			expect(newCenterX).toBeCloseTo(initialCenterX, 5)

			// Aspect ratio should be maintained
			const newAspectRatio =
				(results.props.crop.bottomRight.x - results.props.crop.topLeft.x) /
				(results.props.crop.bottomRight.y - results.props.crop.topLeft.y)
			expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)

			// All coordinates should be within valid bounds
			expect(results.props.crop.topLeft.x).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.topLeft.y).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.bottomRight.x).toBeLessThanOrEqual(1)
			expect(results.props.crop.bottomRight.y).toBeLessThanOrEqual(1)
		}
	})

	it('Resizes from the right edge', () => {
		const testCrop = {
			topLeft: { x: 0.2, y: 0.3 },
			bottomRight: { x: 0.8, y: 0.7 },
		}
		const initialAspectRatio =
			(testCrop.bottomRight.x - testCrop.topLeft.x) / (testCrop.bottomRight.y - testCrop.topLeft.y)
		const initialCenterY = (testCrop.topLeft.y + testCrop.bottomRight.y) / 2

		const results = getCropBox(shape, {
			handle: 'right',
			change: new Vec(-15, 0),
			crop: testCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: true,
		})

		if (results?.props.crop) {
			// Left edge and vertical center should be preserved
			expect(results.props.crop.topLeft.x).toBeCloseTo(testCrop.topLeft.x, 5)
			const newCenterY = (results.props.crop.topLeft.y + results.props.crop.bottomRight.y) / 2
			expect(newCenterY).toBeCloseTo(initialCenterY, 5)

			// Aspect ratio should be maintained
			const newAspectRatio =
				(results.props.crop.bottomRight.x - results.props.crop.topLeft.x) /
				(results.props.crop.bottomRight.y - results.props.crop.topLeft.y)
			expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)

			// All coordinates should be within valid bounds
			expect(results.props.crop.topLeft.x).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.topLeft.y).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.bottomRight.x).toBeLessThanOrEqual(1)
			expect(results.props.crop.bottomRight.y).toBeLessThanOrEqual(1)
		}
	})

	it('Resizes from the bottom edge', () => {
		const testCrop = {
			topLeft: { x: 0.2, y: 0.3 },
			bottomRight: { x: 0.8, y: 0.7 },
		}
		const initialAspectRatio =
			(testCrop.bottomRight.x - testCrop.topLeft.x) / (testCrop.bottomRight.y - testCrop.topLeft.y)
		const initialCenterX = (testCrop.topLeft.x + testCrop.bottomRight.x) / 2

		const results = getCropBox(shape, {
			handle: 'bottom',
			change: new Vec(0, -15),
			crop: testCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: true,
		})

		if (results?.props.crop) {
			// Top edge and horizontal center should be preserved
			expect(results.props.crop.topLeft.y).toBeCloseTo(testCrop.topLeft.y, 5)
			const newCenterX = (results.props.crop.topLeft.x + results.props.crop.bottomRight.x) / 2
			expect(newCenterX).toBeCloseTo(initialCenterX, 5)

			// Aspect ratio should be maintained
			const newAspectRatio =
				(results.props.crop.bottomRight.x - results.props.crop.topLeft.x) /
				(results.props.crop.bottomRight.y - results.props.crop.topLeft.y)
			expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)

			// All coordinates should be within valid bounds
			expect(results.props.crop.topLeft.x).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.topLeft.y).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.bottomRight.x).toBeLessThanOrEqual(1)
			expect(results.props.crop.bottomRight.y).toBeLessThanOrEqual(1)
		}
	})

	it('Resizes from the left edge', () => {
		const testCrop = {
			topLeft: { x: 0.2, y: 0.3 },
			bottomRight: { x: 0.8, y: 0.7 },
		}
		const initialAspectRatio =
			(testCrop.bottomRight.x - testCrop.topLeft.x) / (testCrop.bottomRight.y - testCrop.topLeft.y)
		const initialCenterY = (testCrop.topLeft.y + testCrop.bottomRight.y) / 2

		const results = getCropBox(shape, {
			handle: 'left',
			change: new Vec(15, 0),
			crop: testCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: true,
		})

		if (results?.props.crop) {
			// Right edge and vertical center should be preserved
			expect(results.props.crop.bottomRight.x).toBeCloseTo(testCrop.bottomRight.x, 5)
			const newCenterY = (results.props.crop.topLeft.y + results.props.crop.bottomRight.y) / 2
			expect(newCenterY).toBeCloseTo(initialCenterY, 5)

			// Aspect ratio should be maintained
			const newAspectRatio =
				(results.props.crop.bottomRight.x - results.props.crop.topLeft.x) /
				(results.props.crop.bottomRight.y - results.props.crop.topLeft.y)
			expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)

			// All coordinates should be within valid bounds
			expect(results.props.crop.topLeft.x).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.topLeft.y).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.bottomRight.x).toBeLessThanOrEqual(1)
			expect(results.props.crop.bottomRight.y).toBeLessThanOrEqual(1)
		}
	})

	it('When overlapping edges, does not produce a result with < 0 or > 1 for x or y crop dimensions and maintains the aspect ratio', () => {
		const testCrop = {
			topLeft: { x: 0.25, y: 0.25 },
			bottomRight: { x: 0.75, y: 0.75 },
		}
		const initialAspectRatio =
			(testCrop.bottomRight.x - testCrop.topLeft.x) / (testCrop.bottomRight.y - testCrop.topLeft.y)

		// Test extreme resize that would normally cause invalid bounds
		const results = getCropBox(shape, {
			handle: 'top_left',
			change: new Vec(200, 200), // Extreme change
			crop: testCrop,
			uncroppedSize: initialSize,
			initialShape: shape,
			aspectRatioLocked: true,
		})

		if (results?.props.crop) {
			// All coordinates should be within valid bounds
			expect(results.props.crop.topLeft.x).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.topLeft.y).toBeGreaterThanOrEqual(0)
			expect(results.props.crop.bottomRight.x).toBeLessThanOrEqual(1)
			expect(results.props.crop.bottomRight.y).toBeLessThanOrEqual(1)

			// Crop should have positive dimensions
			const cropWidth = results.props.crop.bottomRight.x - results.props.crop.topLeft.x
			const cropHeight = results.props.crop.bottomRight.y - results.props.crop.topLeft.y
			expect(cropWidth).toBeGreaterThan(0)
			expect(cropHeight).toBeGreaterThan(0)

			// Aspect ratio should be maintained
			const newAspectRatio = cropWidth / cropHeight
			expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)
		}
	})

	// 1. Boundary collision tests
	describe('Boundary collision scenarios', () => {
		it('Handles crop starting at left boundary (x=0)', () => {
			const boundaryTestCrop = {
				topLeft: { x: 0, y: 0.3 },
				bottomRight: { x: 0.4, y: 0.7 },
			}
			const initialAspectRatio =
				(boundaryTestCrop.bottomRight.x - boundaryTestCrop.topLeft.x) /
				(boundaryTestCrop.bottomRight.y - boundaryTestCrop.topLeft.y)

			const results = getCropBox(shape, {
				handle: 'left',
				change: new Vec(-50, 0), // Try to move left edge beyond boundary
				crop: boundaryTestCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
				aspectRatioLocked: true,
			})

			if (results?.props.crop) {
				// Left edge should stay at boundary
				expect(results.props.crop.topLeft.x).toBe(0)

				// Aspect ratio should be maintained
				const newAspectRatio =
					(results.props.crop.bottomRight.x - results.props.crop.topLeft.x) /
					(results.props.crop.bottomRight.y - results.props.crop.topLeft.y)
				expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)

				// Should not exceed boundaries
				expect(results.props.crop.bottomRight.x).toBeLessThanOrEqual(1)
				expect(results.props.crop.bottomRight.y).toBeLessThanOrEqual(1)
			}
		})

		it('Handles crop starting at right boundary (x=1)', () => {
			const boundaryTestCrop = {
				topLeft: { x: 0.6, y: 0.3 },
				bottomRight: { x: 1, y: 0.7 },
			}
			const initialAspectRatio =
				(boundaryTestCrop.bottomRight.x - boundaryTestCrop.topLeft.x) /
				(boundaryTestCrop.bottomRight.y - boundaryTestCrop.topLeft.y)

			const results = getCropBox(shape, {
				handle: 'right',
				change: new Vec(50, 0), // Try to move right edge beyond boundary
				crop: boundaryTestCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
				aspectRatioLocked: true,
			})

			if (results?.props.crop) {
				// Right edge should stay at boundary
				expect(results.props.crop.bottomRight.x).toBe(1)

				// Aspect ratio should be maintained
				const newAspectRatio =
					(results.props.crop.bottomRight.x - results.props.crop.topLeft.x) /
					(results.props.crop.bottomRight.y - results.props.crop.topLeft.y)
				expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)

				// Should not go below boundaries
				expect(results.props.crop.topLeft.x).toBeGreaterThanOrEqual(0)
				expect(results.props.crop.topLeft.y).toBeGreaterThanOrEqual(0)
			}
		})

		it('Handles crop starting at top boundary (y=0)', () => {
			const boundaryTestCrop = {
				topLeft: { x: 0.3, y: 0 },
				bottomRight: { x: 0.7, y: 0.4 },
			}
			const initialAspectRatio =
				(boundaryTestCrop.bottomRight.x - boundaryTestCrop.topLeft.x) /
				(boundaryTestCrop.bottomRight.y - boundaryTestCrop.topLeft.y)

			const results = getCropBox(shape, {
				handle: 'top',
				change: new Vec(0, -50), // Try to move top edge beyond boundary
				crop: boundaryTestCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
				aspectRatioLocked: true,
			})

			if (results?.props.crop) {
				// Top edge should stay at boundary
				expect(results.props.crop.topLeft.y).toBe(0)

				// Aspect ratio should be maintained
				const newAspectRatio =
					(results.props.crop.bottomRight.x - results.props.crop.topLeft.x) /
					(results.props.crop.bottomRight.y - results.props.crop.topLeft.y)
				expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)
			}
		})

		it('Handles aspect ratio constraint conflicting with boundary constraints', () => {
			// Start with a very wide crop near the top-left corner
			const conflictTestCrop = {
				topLeft: { x: 0.05, y: 0.05 },
				bottomRight: { x: 0.95, y: 0.25 }, // Very wide (4.5:1 ratio)
			}
			const initialAspectRatio =
				(conflictTestCrop.bottomRight.x - conflictTestCrop.topLeft.x) /
				(conflictTestCrop.bottomRight.y - conflictTestCrop.topLeft.y)

			const results = getCropBox(shape, {
				handle: 'top_left',
				change: new Vec(-20, -20), // Try to move beyond both x=0 and y=0
				crop: conflictTestCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
				aspectRatioLocked: true,
			})

			if (results?.props.crop) {
				// Should respect boundaries
				expect(results.props.crop.topLeft.x).toBeGreaterThanOrEqual(0)
				expect(results.props.crop.topLeft.y).toBeGreaterThanOrEqual(0)
				expect(results.props.crop.bottomRight.x).toBeLessThanOrEqual(1)
				expect(results.props.crop.bottomRight.y).toBeLessThanOrEqual(1)

				// Should maintain positive dimensions
				const cropWidth = results.props.crop.bottomRight.x - results.props.crop.topLeft.x
				const cropHeight = results.props.crop.bottomRight.y - results.props.crop.topLeft.y
				expect(cropWidth).toBeGreaterThan(0)
				expect(cropHeight).toBeGreaterThan(0)

				// Should attempt to maintain aspect ratio where possible
				const newAspectRatio = cropWidth / cropHeight
				expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 2) // Less precision due to boundary conflicts
			}
		})
	})

	// 2. Minimum size constraint tests with aspect ratio locked
	describe('Minimum size constraints with aspect ratio locked', () => {
		it('Enforces minimum size constraints even when they conflict with aspect ratio', () => {
			const smallCrop = {
				topLeft: { x: 0.4, y: 0.4 },
				bottomRight: { x: 0.6, y: 0.6 }, // 20x20 crop
			}

			const results = getCropBox(
				shape,
				{
					handle: 'top_left',
					change: new Vec(15, 15), // Try to make it smaller
					crop: smallCrop,
					uncroppedSize: initialSize,
					initialShape: shape,
					aspectRatioLocked: true,
				},
				{
					minWidth: 25, // Larger than what resize would produce
					minHeight: 25,
				}
			)

			// Should clamp to minimum size constraints
			if (results?.props.crop) {
				const cropWidth = results.props.crop.bottomRight.x - results.props.crop.topLeft.x
				const cropHeight = results.props.crop.bottomRight.y - results.props.crop.topLeft.y

				// Minimum size should be respected
				expect(cropWidth * initialSize.w).toBeGreaterThanOrEqual(25)
				expect(cropHeight * initialSize.h).toBeGreaterThanOrEqual(25)
			}
		})

		it('Respects minimum width constraint while maintaining aspect ratio', () => {
			const testCrop = {
				topLeft: { x: 0.2, y: 0.2 },
				bottomRight: { x: 0.6, y: 0.8 }, // 40x60 crop (2:3 ratio)
			}
			const initialAspectRatio =
				(testCrop.bottomRight.x - testCrop.topLeft.x) /
				(testCrop.bottomRight.y - testCrop.topLeft.y)

			const results = getCropBox(
				shape,
				{
					handle: 'right',
					change: new Vec(-25, 0), // Try to make it narrower
					crop: testCrop,
					uncroppedSize: initialSize,
					initialShape: shape,
					aspectRatioLocked: true,
				},
				{
					minWidth: 20, // Enforce minimum width
					minHeight: 8,
				}
			)

			if (results?.props.crop) {
				// Width should respect minimum
				const cropWidth = results.props.crop.bottomRight.x - results.props.crop.topLeft.x
				expect(cropWidth * initialSize.w).toBeGreaterThanOrEqual(20)

				// Aspect ratio should be maintained
				const cropHeight = results.props.crop.bottomRight.y - results.props.crop.topLeft.y
				const newAspectRatio = cropWidth / cropHeight
				expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)
			}
		})

		it('Respects minimum height constraint while maintaining aspect ratio', () => {
			const testCrop = {
				topLeft: { x: 0.2, y: 0.2 },
				bottomRight: { x: 0.8, y: 0.6 }, // 60x40 crop (3:2 ratio)
			}
			const initialAspectRatio =
				(testCrop.bottomRight.x - testCrop.topLeft.x) /
				(testCrop.bottomRight.y - testCrop.topLeft.y)

			const results = getCropBox(
				shape,
				{
					handle: 'bottom',
					change: new Vec(0, -25), // Try to make it shorter
					crop: testCrop,
					uncroppedSize: initialSize,
					initialShape: shape,
					aspectRatioLocked: true,
				},
				{
					minWidth: 8,
					minHeight: 20, // Enforce minimum height
				}
			)

			if (results?.props.crop) {
				// Height should respect minimum
				const cropHeight = results.props.crop.bottomRight.y - results.props.crop.topLeft.y
				expect(cropHeight * initialSize.h).toBeGreaterThanOrEqual(20)

				// Aspect ratio should be maintained
				const cropWidth = results.props.crop.bottomRight.x - results.props.crop.topLeft.x
				const newAspectRatio = cropWidth / cropHeight
				expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)
			}
		})
	})

	// 3. Different aspect ratio tests
	describe('Different starting aspect ratios', () => {
		it('Maintains very wide aspect ratio (4:1)', () => {
			const wideCrop = {
				topLeft: { x: 0.1, y: 0.4 },
				bottomRight: { x: 0.9, y: 0.6 }, // 4:1 ratio
			}
			const initialAspectRatio =
				(wideCrop.bottomRight.x - wideCrop.topLeft.x) /
				(wideCrop.bottomRight.y - wideCrop.topLeft.y)
			expect(initialAspectRatio).toBeCloseTo(4, 1) // Verify it's actually 4:1

			const results = getCropBox(shape, {
				handle: 'bottom_right',
				change: new Vec(-20, -5),
				crop: wideCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
				aspectRatioLocked: true,
			})

			if (results?.props.crop) {
				const cropWidth = results.props.crop.bottomRight.x - results.props.crop.topLeft.x
				const cropHeight = results.props.crop.bottomRight.y - results.props.crop.topLeft.y
				const newAspectRatio = cropWidth / cropHeight
				expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)
			}
		})

		it('Maintains very tall aspect ratio (1:4)', () => {
			const tallCrop = {
				topLeft: { x: 0.4, y: 0.1 },
				bottomRight: { x: 0.6, y: 0.9 }, // 1:4 ratio
			}
			const initialAspectRatio =
				(tallCrop.bottomRight.x - tallCrop.topLeft.x) /
				(tallCrop.bottomRight.y - tallCrop.topLeft.y)
			expect(initialAspectRatio).toBeCloseTo(0.25, 1) // Verify it's actually 1:4

			const results = getCropBox(shape, {
				handle: 'top_left',
				change: new Vec(5, 20),
				crop: tallCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
				aspectRatioLocked: true,
			})

			if (results?.props.crop) {
				const cropWidth = results.props.crop.bottomRight.x - results.props.crop.topLeft.x
				const cropHeight = results.props.crop.bottomRight.y - results.props.crop.topLeft.y
				const newAspectRatio = cropWidth / cropHeight
				expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 5)
			}
		})

		it('Maintains perfect square aspect ratio (1:1)', () => {
			const squareCrop = {
				topLeft: { x: 0.25, y: 0.25 },
				bottomRight: { x: 0.75, y: 0.75 }, // 1:1 ratio
			}
			const initialAspectRatio =
				(squareCrop.bottomRight.x - squareCrop.topLeft.x) /
				(squareCrop.bottomRight.y - squareCrop.topLeft.y)
			expect(initialAspectRatio).toBe(1) // Verify it's actually 1:1

			const results = getCropBox(shape, {
				handle: 'right',
				change: new Vec(-15, 0),
				crop: squareCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
				aspectRatioLocked: true,
			})

			if (results?.props.crop) {
				const cropWidth = results.props.crop.bottomRight.x - results.props.crop.topLeft.x
				const cropHeight = results.props.crop.bottomRight.y - results.props.crop.topLeft.y
				const newAspectRatio = cropWidth / cropHeight
				expect(newAspectRatio).toBeCloseTo(1, 5)
			}
		})

		it('Maintains extreme wide aspect ratio (16:1)', () => {
			const extremeWideCrop = {
				topLeft: { x: 0.05, y: 0.475 },
				bottomRight: { x: 0.85, y: 0.525 }, // ~16:1 ratio
			}
			const initialAspectRatio =
				(extremeWideCrop.bottomRight.x - extremeWideCrop.topLeft.x) /
				(extremeWideCrop.bottomRight.y - extremeWideCrop.topLeft.y)
			expect(initialAspectRatio).toBeCloseTo(16, 1) // Verify it's extremely wide

			const results = getCropBox(shape, {
				handle: 'left',
				change: new Vec(20, 0),
				crop: extremeWideCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
				aspectRatioLocked: true,
			})

			if (results?.props.crop) {
				const cropWidth = results.props.crop.bottomRight.x - results.props.crop.topLeft.x
				const cropHeight = results.props.crop.bottomRight.y - results.props.crop.topLeft.y
				const newAspectRatio = cropWidth / cropHeight
				expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 3) // Less precision for extreme ratios
			}
		})

		it('Maintains extreme tall aspect ratio (1:16)', () => {
			const extremeTallCrop = {
				topLeft: { x: 0.475, y: 0.05 },
				bottomRight: { x: 0.525, y: 0.85 }, // ~1:16 ratio
			}
			const initialAspectRatio =
				(extremeTallCrop.bottomRight.x - extremeTallCrop.topLeft.x) /
				(extremeTallCrop.bottomRight.y - extremeTallCrop.topLeft.y)
			expect(initialAspectRatio).toBeCloseTo(0.0625, 1) // Verify it's extremely tall

			const results = getCropBox(shape, {
				handle: 'top',
				change: new Vec(0, 20),
				crop: extremeTallCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
				aspectRatioLocked: true,
			})

			if (results?.props.crop) {
				const cropWidth = results.props.crop.bottomRight.x - results.props.crop.topLeft.x
				const cropHeight = results.props.crop.bottomRight.y - results.props.crop.topLeft.y
				const newAspectRatio = cropWidth / cropHeight
				expect(newAspectRatio).toBeCloseTo(initialAspectRatio, 3) // Less precision for extreme ratios
			}
		})
	})
})
