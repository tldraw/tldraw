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

describe('Crop box with aspect ratio locked', () => {
	const aspectRatioLockedCrop = {
		topLeft: { x: 0.2, y: 0.3 },
		bottomRight: { x: 0.8, y: 0.7 },
	}

	describe('Top handle with aspect ratio locked', () => {
		it('maintains aspect ratio when dragging top edge', () => {
			const results = getCropBox(shape, {
				handle: 'top',
				change: new Vec(0, 10),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			// Check that aspect ratio is maintained
			const newCropW = results!.props.crop!.bottomRight.x - results!.props.crop!.topLeft.x
			const newCropH = results!.props.crop!.bottomRight.y - results!.props.crop!.topLeft.y
			const originalCropW = aspectRatioLockedCrop.bottomRight.x - aspectRatioLockedCrop.topLeft.x
			const originalCropH = aspectRatioLockedCrop.bottomRight.y - aspectRatioLockedCrop.topLeft.y

			expect(newCropW / newCropH).toBeCloseTo(originalCropW / originalCropH, 5)
		})

		it('handles boundary collision when top handle hits left edge', () => {
			const wideCrop = {
				topLeft: { x: 0.1, y: 0.4 },
				bottomRight: { x: 0.9, y: 0.6 },
			}

			const results = getCropBox(shape, {
				handle: 'top',
				change: new Vec(0, 15),
				crop: wideCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()
			// With aspect ratio locked, boundary collision handling adjusts both dimensions
			expect(results!.props.crop!.topLeft.x).toBeCloseTo(0.34, 2)
		})
	})

	describe('Bottom handle with aspect ratio locked', () => {
		it('maintains aspect ratio when dragging bottom edge', () => {
			const results = getCropBox(shape, {
				handle: 'bottom',
				change: new Vec(0, -10),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			const newCropW = results!.props.crop!.bottomRight.x - results!.props.crop!.topLeft.x
			const newCropH = results!.props.crop!.bottomRight.y - results!.props.crop!.topLeft.y
			const originalCropW = aspectRatioLockedCrop.bottomRight.x - aspectRatioLockedCrop.topLeft.x
			const originalCropH = aspectRatioLockedCrop.bottomRight.y - aspectRatioLockedCrop.topLeft.y

			expect(newCropW / newCropH).toBeCloseTo(originalCropW / originalCropH, 5)
		})

		it('centers horizontally around previous center', () => {
			const results = getCropBox(shape, {
				handle: 'bottom',
				change: new Vec(0, -20),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			// Check that horizontal center is maintained
			const originalCenterX =
				(aspectRatioLockedCrop.topLeft.x + aspectRatioLockedCrop.bottomRight.x) / 2
			const newCenterX = (results!.props.crop!.topLeft.x + results!.props.crop!.bottomRight.x) / 2

			expect(newCenterX).toBeCloseTo(originalCenterX, 5)
		})
	})

	describe('Left handle with aspect ratio locked', () => {
		it('maintains aspect ratio when dragging left edge', () => {
			const results = getCropBox(shape, {
				handle: 'left',
				change: new Vec(10, 0),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			const newCropW = results!.props.crop!.bottomRight.x - results!.props.crop!.topLeft.x
			const newCropH = results!.props.crop!.bottomRight.y - results!.props.crop!.topLeft.y
			const originalCropW = aspectRatioLockedCrop.bottomRight.x - aspectRatioLockedCrop.topLeft.x
			const originalCropH = aspectRatioLockedCrop.bottomRight.y - aspectRatioLockedCrop.topLeft.y

			expect(newCropW / newCropH).toBeCloseTo(originalCropW / originalCropH, 5)
		})

		it('centers vertically around previous center', () => {
			const results = getCropBox(shape, {
				handle: 'left',
				change: new Vec(15, 0),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			// Check that vertical center is maintained
			const originalCenterY =
				(aspectRatioLockedCrop.topLeft.y + aspectRatioLockedCrop.bottomRight.y) / 2
			const newCenterY = (results!.props.crop!.topLeft.y + results!.props.crop!.bottomRight.y) / 2

			expect(newCenterY).toBeCloseTo(originalCenterY, 5)
		})

		it('handles boundary collision when left handle hits top edge', () => {
			const tallCrop = {
				topLeft: { x: 0.4, y: 0.1 },
				bottomRight: { x: 0.6, y: 0.9 },
			}

			const results = getCropBox(shape, {
				handle: 'left',
				change: new Vec(20, 0),
				crop: tallCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()
			// With aspect ratio locked, the system maintains proportional adjustments
			expect(results!.props.crop!.topLeft.y).toBeCloseTo(0.34, 2)
		})
	})

	describe('Right handle with aspect ratio locked', () => {
		it('maintains aspect ratio when dragging right edge', () => {
			const results = getCropBox(shape, {
				handle: 'right',
				change: new Vec(-10, 0),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			const newCropW = results!.props.crop!.bottomRight.x - results!.props.crop!.topLeft.x
			const newCropH = results!.props.crop!.bottomRight.y - results!.props.crop!.topLeft.y
			const originalCropW = aspectRatioLockedCrop.bottomRight.x - aspectRatioLockedCrop.topLeft.x
			const originalCropH = aspectRatioLockedCrop.bottomRight.y - aspectRatioLockedCrop.topLeft.y

			expect(newCropW / newCropH).toBeCloseTo(originalCropW / originalCropH, 5)
		})

		it('centers vertically around previous center', () => {
			const results = getCropBox(shape, {
				handle: 'right',
				change: new Vec(-15, 0),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			// Check that vertical center is maintained
			const originalCenterY =
				(aspectRatioLockedCrop.topLeft.y + aspectRatioLockedCrop.bottomRight.y) / 2
			const newCenterY = (results!.props.crop!.topLeft.y + results!.props.crop!.bottomRight.y) / 2

			expect(newCenterY).toBeCloseTo(originalCenterY, 5)
		})

		it('handles boundary collision when right handle hits bottom edge', () => {
			const tallCrop = {
				topLeft: { x: 0.4, y: 0.1 },
				bottomRight: { x: 0.6, y: 0.9 },
			}

			const results = getCropBox(shape, {
				handle: 'right',
				change: new Vec(-20, 0),
				crop: tallCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()
			// Aspect ratio locked maintains proportional boundaries
			expect(results!.props.crop!.bottomRight.y).toBeCloseTo(0.66, 2)
		})
	})

	describe('Minimum size constraints with aspect ratio locked', () => {
		it('returns undefined when dimension is too small', () => {
			const results = getCropBox(
				shape,
				{
					handle: 'top',
					change: new Vec(0, 10),
					crop: aspectRatioLockedCrop,
					uncroppedSize: { w: 50, h: 50 }, // Small uncropped size
					aspectRatioLocked: true,
					initialShape: shape,
				},
				{
					minWidth: 60, // Larger than available width
					minHeight: 60,
				}
			)

			expect(results).toBeUndefined()
		})
	})

	describe('Boundary collision edge cases', () => {
		it('handles right boundary collision with top handle', () => {
			const wideCrop = {
				topLeft: { x: 0.1, y: 0.4 },
				bottomRight: { x: 0.9, y: 0.6 },
			}

			const results = getCropBox(shape, {
				handle: 'top',
				change: new Vec(0, 25), // Large movement
				crop: wideCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()
			// Large movements with aspect ratio locked result in proportional adjustments
			expect(results!.props.crop!.bottomRight.x).toBeCloseTo(0.66, 2)
		})

		it('handles left boundary collision with bottom handle', () => {
			const wideCrop = {
				topLeft: { x: 0.1, y: 0.4 },
				bottomRight: { x: 0.9, y: 0.6 },
			}

			const results = getCropBox(shape, {
				handle: 'bottom',
				change: new Vec(0, -25), // Large movement
				crop: wideCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()
			// Aspect ratio locked boundary handling maintains proportions
			expect(results!.props.crop!.topLeft.x).toBeCloseTo(0.5, 2)
		})
	})
})

describe('Non-aspect-ratio-locked edge cases', () => {
	describe('Minimum size enforcement', () => {
		it('enforces minimum height for top handles', () => {
			const results = getCropBox(
				shape,
				{
					handle: 'top',
					change: new Vec(0, 85), // Large downward movement
					crop: initialCrop,
					uncroppedSize: initialSize,
					initialShape: shape,
				},
				{
					minHeight: 20,
				}
			)

			expect(results).toBeDefined()
			expect(results!.props.h).toBeCloseTo(20, 1) // Should enforce minimum height
		})

		it('enforces minimum width for left handles', () => {
			const results = getCropBox(
				shape,
				{
					handle: 'left',
					change: new Vec(85, 0), // Large rightward movement
					crop: initialCrop,
					uncroppedSize: initialSize,
					initialShape: shape,
				},
				{
					minWidth: 20,
				}
			)

			expect(results).toBeDefined()
			expect(results!.props.w).toBeCloseTo(20, 1) // Should enforce minimum width
		})
	})

	describe('Boundary clamping', () => {
		it('clamps top handle to top boundary', () => {
			const results = getCropBox(shape, {
				handle: 'top',
				change: new Vec(0, -50), // Large upward movement
				crop: initialCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
			})

			expect(results).toBeDefined()
			expect(results!.props.crop!.topLeft.y).toBe(0) // Should clamp to boundary
		})

		it('clamps left handle to left boundary', () => {
			const results = getCropBox(shape, {
				handle: 'left',
				change: new Vec(-50, 0), // Large leftward movement
				crop: initialCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
			})

			expect(results).toBeDefined()
			expect(results!.props.crop!.topLeft.x).toBe(0) // Should clamp to boundary
		})
	})

	describe('Multi-handle operations', () => {
		it('handles top_left correctly', () => {
			const results = getCropBox(shape, {
				handle: 'top_left',
				change: new Vec(10, 20),
				crop: initialCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
			})

			expect(results).toBeDefined()
			expect(results!.props.crop!.topLeft.x).toBeCloseTo(0.1, 5)
			expect(results!.props.crop!.topLeft.y).toBeCloseTo(0.2, 5)
		})

		it('handles bottom_right correctly', () => {
			const results = getCropBox(shape, {
				handle: 'bottom_right',
				change: new Vec(-10, -20),
				crop: initialCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
			})

			expect(results).toBeDefined()
			expect(results!.props.crop!.bottomRight.x).toBeCloseTo(0.9, 5)
			expect(results!.props.crop!.bottomRight.y).toBeCloseTo(0.8, 5)
		})
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

describe('CropBoxOptions.aspectRatioLocked parameter', () => {
	const testCrop = {
		topLeft: { x: 0.2, y: 0.3 },
		bottomRight: { x: 0.8, y: 0.7 },
	}

	it('uses aspectRatioLocked from CropBoxOptions when not provided in info', () => {
		const results = getCropBox(
			shape,
			{
				handle: 'top',
				change: new Vec(0, 10),
				crop: testCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
				// aspectRatioLocked not provided in info
			},
			{
				aspectRatioLocked: true, // Provided in options
			}
		)

		expect(results).toBeDefined()

		// Check that aspect ratio is maintained (same as when aspectRatioLocked: true in info)
		const newCropW = results!.props.crop!.bottomRight.x - results!.props.crop!.topLeft.x
		const newCropH = results!.props.crop!.bottomRight.y - results!.props.crop!.topLeft.y
		const originalCropW = testCrop.bottomRight.x - testCrop.topLeft.x
		const originalCropH = testCrop.bottomRight.y - testCrop.topLeft.y

		expect(newCropW / newCropH).toBeCloseTo(originalCropW / originalCropH, 5)
	})

	it('info.aspectRatioLocked takes precedence over options.aspectRatioLocked', () => {
		const results = getCropBox(
			shape,
			{
				handle: 'top',
				change: new Vec(0, 10),
				crop: testCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: false, // Explicitly false in info
				initialShape: shape,
			},
			{
				aspectRatioLocked: true, // True in options, but should be overridden
			}
		)

		expect(results).toBeDefined()

		// Should NOT maintain aspect ratio since info.aspectRatioLocked is false
		const newCropW = results!.props.crop!.bottomRight.x - results!.props.crop!.topLeft.x
		const newCropH = results!.props.crop!.bottomRight.y - results!.props.crop!.topLeft.y
		const originalCropW = testCrop.bottomRight.x - testCrop.topLeft.x
		const originalCropH = testCrop.bottomRight.y - testCrop.topLeft.y

		// Aspect ratio should be different (not maintained)
		expect(newCropW / newCropH).not.toBeCloseTo(originalCropW / originalCropH, 5)
	})

	it('defaults to false when aspectRatioLocked not provided in either info or options', () => {
		const results = getCropBox(
			shape,
			{
				handle: 'top',
				change: new Vec(0, 10),
				crop: testCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
				// aspectRatioLocked not provided
			},
			{
				// aspectRatioLocked not provided in options either
			}
		)

		expect(results).toBeDefined()

		// Should NOT maintain aspect ratio (default behavior)
		const newCropW = results!.props.crop!.bottomRight.x - results!.props.crop!.topLeft.x
		const newCropH = results!.props.crop!.bottomRight.y - results!.props.crop!.topLeft.y
		const originalCropW = testCrop.bottomRight.x - testCrop.topLeft.x
		const originalCropH = testCrop.bottomRight.y - testCrop.topLeft.y

		// Aspect ratio should be different (not maintained)
		expect(newCropW / newCropH).not.toBeCloseTo(originalCropW / originalCropH, 5)
	})
})

describe('Corner handles with aspect ratio locked', () => {
	const aspectRatioLockedCrop = {
		topLeft: { x: 0.2, y: 0.3 },
		bottomRight: { x: 0.8, y: 0.7 },
	}

	describe('top_left corner with aspect ratio locked', () => {
		it('maintains aspect ratio when dragging top_left corner', () => {
			const results = getCropBox(shape, {
				handle: 'top_left',
				change: new Vec(10, 15),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			// Check that aspect ratio is maintained
			const newCropW = results!.props.crop!.bottomRight.x - results!.props.crop!.topLeft.x
			const newCropH = results!.props.crop!.bottomRight.y - results!.props.crop!.topLeft.y
			const originalCropW = aspectRatioLockedCrop.bottomRight.x - aspectRatioLockedCrop.topLeft.x
			const originalCropH = aspectRatioLockedCrop.bottomRight.y - aspectRatioLockedCrop.topLeft.y

			expect(newCropW / newCropH).toBeCloseTo(originalCropW / originalCropH, 5)
		})

		it('keeps bottom_right corner fixed when dragging top_left', () => {
			const results = getCropBox(shape, {
				handle: 'top_left',
				change: new Vec(10, 15),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			// Bottom right corner should remain fixed
			expect(results!.props.crop!.bottomRight.x).toBeCloseTo(aspectRatioLockedCrop.bottomRight.x, 5)
			expect(results!.props.crop!.bottomRight.y).toBeCloseTo(aspectRatioLockedCrop.bottomRight.y, 5)
		})
	})

	describe('top_right corner with aspect ratio locked', () => {
		it('maintains aspect ratio when dragging top_right corner', () => {
			const results = getCropBox(shape, {
				handle: 'top_right',
				change: new Vec(-10, 15),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			// Check that aspect ratio is maintained
			const newCropW = results!.props.crop!.bottomRight.x - results!.props.crop!.topLeft.x
			const newCropH = results!.props.crop!.bottomRight.y - results!.props.crop!.topLeft.y
			const originalCropW = aspectRatioLockedCrop.bottomRight.x - aspectRatioLockedCrop.topLeft.x
			const originalCropH = aspectRatioLockedCrop.bottomRight.y - aspectRatioLockedCrop.topLeft.y

			expect(newCropW / newCropH).toBeCloseTo(originalCropW / originalCropH, 5)
		})

		it('keeps bottom_left corner fixed when dragging top_right', () => {
			const results = getCropBox(shape, {
				handle: 'top_right',
				change: new Vec(-10, 15),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			// Bottom left corner should remain fixed
			expect(results!.props.crop!.topLeft.x).toBeCloseTo(aspectRatioLockedCrop.topLeft.x, 5)
			expect(results!.props.crop!.bottomRight.y).toBeCloseTo(aspectRatioLockedCrop.bottomRight.y, 5)
		})
	})

	describe('bottom_left corner with aspect ratio locked', () => {
		it('maintains aspect ratio when dragging bottom_left corner', () => {
			const results = getCropBox(shape, {
				handle: 'bottom_left',
				change: new Vec(10, -15),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			// Check that aspect ratio is maintained
			const newCropW = results!.props.crop!.bottomRight.x - results!.props.crop!.topLeft.x
			const newCropH = results!.props.crop!.bottomRight.y - results!.props.crop!.topLeft.y
			const originalCropW = aspectRatioLockedCrop.bottomRight.x - aspectRatioLockedCrop.topLeft.x
			const originalCropH = aspectRatioLockedCrop.bottomRight.y - aspectRatioLockedCrop.topLeft.y

			expect(newCropW / newCropH).toBeCloseTo(originalCropW / originalCropH, 5)
		})

		it('keeps top_right corner fixed when dragging bottom_left', () => {
			const results = getCropBox(shape, {
				handle: 'bottom_left',
				change: new Vec(10, -15),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			// Top right corner should remain fixed
			expect(results!.props.crop!.bottomRight.x).toBeCloseTo(aspectRatioLockedCrop.bottomRight.x, 5)
			expect(results!.props.crop!.topLeft.y).toBeCloseTo(aspectRatioLockedCrop.topLeft.y, 5)
		})
	})

	describe('bottom_right corner with aspect ratio locked', () => {
		it('maintains aspect ratio when dragging bottom_right corner', () => {
			const results = getCropBox(shape, {
				handle: 'bottom_right',
				change: new Vec(-10, -15),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			// Check that aspect ratio is maintained
			const newCropW = results!.props.crop!.bottomRight.x - results!.props.crop!.topLeft.x
			const newCropH = results!.props.crop!.bottomRight.y - results!.props.crop!.topLeft.y
			const originalCropW = aspectRatioLockedCrop.bottomRight.x - aspectRatioLockedCrop.topLeft.x
			const originalCropH = aspectRatioLockedCrop.bottomRight.y - aspectRatioLockedCrop.topLeft.y

			expect(newCropW / newCropH).toBeCloseTo(originalCropW / originalCropH, 5)
		})

		it('keeps top_left corner fixed when dragging bottom_right', () => {
			const results = getCropBox(shape, {
				handle: 'bottom_right',
				change: new Vec(-10, -15),
				crop: aspectRatioLockedCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			// Top left corner should remain fixed
			expect(results!.props.crop!.topLeft.x).toBeCloseTo(aspectRatioLockedCrop.topLeft.x, 5)
			expect(results!.props.crop!.topLeft.y).toBeCloseTo(aspectRatioLockedCrop.topLeft.y, 5)
		})
	})

	describe('corner boundary handling with aspect ratio locked', () => {
		it('handles boundary collision when corner hits edges', () => {
			// Use a crop near the boundary
			const nearBoundaryCrop = {
				topLeft: { x: 0.05, y: 0.05 },
				bottomRight: { x: 0.95, y: 0.95 },
			}

			const results = getCropBox(shape, {
				handle: 'top_left',
				change: new Vec(-20, -20), // Large movement toward boundary
				crop: nearBoundaryCrop,
				uncroppedSize: initialSize,
				aspectRatioLocked: true,
				initialShape: shape,
			})

			expect(results).toBeDefined()

			// Should clamp to boundaries
			expect(results!.props.crop!.topLeft.x).toBeGreaterThanOrEqual(0)
			expect(results!.props.crop!.topLeft.y).toBeGreaterThanOrEqual(0)
			expect(results!.props.crop!.bottomRight.x).toBeLessThanOrEqual(1)
			expect(results!.props.crop!.bottomRight.y).toBeLessThanOrEqual(1)

			// Should still maintain aspect ratio as much as possible
			const newCropW = results!.props.crop!.bottomRight.x - results!.props.crop!.topLeft.x
			const newCropH = results!.props.crop!.bottomRight.y - results!.props.crop!.topLeft.y
			const originalCropW = nearBoundaryCrop.bottomRight.x - nearBoundaryCrop.topLeft.x
			const originalCropH = nearBoundaryCrop.bottomRight.y - nearBoundaryCrop.topLeft.y

			expect(newCropW / newCropH).toBeCloseTo(originalCropW / originalCropH, 2)
		})
	})
})

describe('Additional edge cases for comprehensive coverage', () => {
	it('handles minimum size constraints with corner handles', () => {
		const results = getCropBox(
			shape,
			{
				handle: 'top_left',
				change: new Vec(80, 80), // Large movement that would make crop too small
				crop: initialCrop,
				uncroppedSize: initialSize,
				initialShape: shape,
			},
			{
				minWidth: 30,
				minHeight: 30,
			}
		)

		expect(results).toBeDefined()

		// Should enforce minimum size
		expect(results!.props.w).toBeGreaterThanOrEqual(30)
		expect(results!.props.h).toBeGreaterThanOrEqual(30)
	})

	it('handles aspect ratio adjustment when width is too large', () => {
		// Create a wide crop that will trigger width adjustment
		const wideCrop = {
			topLeft: { x: 0.1, y: 0.4 },
			bottomRight: { x: 0.9, y: 0.6 }, // Very wide crop
		}

		const results = getCropBox(shape, {
			handle: 'top_left',
			change: new Vec(5, 5),
			crop: wideCrop,
			uncroppedSize: initialSize,
			aspectRatioLocked: true,
			initialShape: shape,
		})

		expect(results).toBeDefined()

		// Should maintain aspect ratio by adjusting width
		const newCropW = results!.props.crop!.bottomRight.x - results!.props.crop!.topLeft.x
		const newCropH = results!.props.crop!.bottomRight.y - results!.props.crop!.topLeft.y
		const originalCropW = wideCrop.bottomRight.x - wideCrop.topLeft.x
		const originalCropH = wideCrop.bottomRight.y - wideCrop.topLeft.y

		expect(newCropW / newCropH).toBeCloseTo(originalCropW / originalCropH, 5)
	})

	it('handles aspect ratio adjustment when height is too large', () => {
		// Create a tall crop that will trigger height adjustment
		const tallCrop = {
			topLeft: { x: 0.4, y: 0.1 },
			bottomRight: { x: 0.6, y: 0.9 }, // Very tall crop
		}

		const results = getCropBox(shape, {
			handle: 'top_left',
			change: new Vec(5, 5),
			crop: tallCrop,
			uncroppedSize: initialSize,
			aspectRatioLocked: true,
			initialShape: shape,
		})

		expect(results).toBeDefined()

		// Should maintain aspect ratio by adjusting height
		const newCropW = results!.props.crop!.bottomRight.x - results!.props.crop!.topLeft.x
		const newCropH = results!.props.crop!.bottomRight.y - results!.props.crop!.topLeft.y
		const originalCropW = tallCrop.bottomRight.x - tallCrop.topLeft.x
		const originalCropH = tallCrop.bottomRight.y - tallCrop.topLeft.y

		expect(newCropW / newCropH).toBeCloseTo(originalCropW / originalCropH, 5)
	})
})
