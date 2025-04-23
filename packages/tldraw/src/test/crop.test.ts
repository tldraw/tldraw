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
		expect(cropWidth).toBeCloseTo(0.25, 2)
		expect(cropHeight).toBeCloseTo(0.25, 2)

		expect(result.w).toBe(75)
		expect(result.h).toBe(75)
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
		const cropWidth = (result?.crop.bottomRight.x as number) - (result?.crop.topLeft.x as number)
		const cropHeight = (result?.crop.bottomRight.y as number) - (result?.crop.topLeft.y as number)
		expect(cropWidth).toEqual(cropHeight)
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
		const cropWidth = (result?.crop.bottomRight.x as number) - (result?.crop.topLeft.x as number)
		const cropHeight = (result?.crop.bottomRight.y as number) - (result?.crop.topLeft.y as number)
		expect(cropWidth).toEqual(cropHeight)
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

	it('preserves crop center when changing aspect ratio with crop in bottom right quadrant', () => {
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

		// Apply aspect ratio change
		const result = getCroppedImageDataForAspectRatio('landscape', imageShape)

		// Calculate center of the new crop
		const newCropCenterX = (result!.crop.topLeft.x + result!.crop.bottomRight.x) / 2
		const newCropCenterY = (result!.crop.topLeft.y + result!.crop.bottomRight.y) / 2

		// Center should be preserved (with slight rounding differences)
		expect(newCropCenterX).toBeCloseTo(originalCropCenterX, 5)
		expect(newCropCenterY).toBeCloseTo(originalCropCenterY, 5)
	})
})
