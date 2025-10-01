import { describe, expect, test } from 'vitest'
import { TLShapeCrop } from './ShapeWithCrop'

describe('TLShapeCrop', () => {
	test('should calculate crop dimensions correctly', () => {
		const crop: TLShapeCrop = {
			topLeft: { x: 0.2, y: 0.3 },
			bottomRight: { x: 0.8, y: 0.7 },
		}

		// This tests the actual utility of the crop interface - calculating dimensions
		const width = crop.bottomRight.x - crop.topLeft.x
		const height = crop.bottomRight.y - crop.topLeft.y

		expect(width).toBeCloseTo(0.6)
		expect(height).toBeCloseTo(0.4)
	})
})
