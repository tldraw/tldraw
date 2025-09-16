import { describe, expect, it, test } from 'vitest'
import { VecModel } from '../misc/geometry-types'
import { ShapeWithCrop, TLShapeCrop } from './ShapeWithCrop'

describe('TLShapeCrop', () => {
	describe('interface structure', () => {
		it('should have required topLeft and bottomRight properties', () => {
			const crop: TLShapeCrop = {
				topLeft: { x: 0, y: 0 },
				bottomRight: { x: 1, y: 1 },
			}

			expect(crop.topLeft).toEqual({ x: 0, y: 0 })
			expect(crop.bottomRight).toEqual({ x: 1, y: 1 })
		})

		it('should support isCircle as optional property', () => {
			const cropWithoutCircle: TLShapeCrop = {
				topLeft: { x: 0.25, y: 0.25 },
				bottomRight: { x: 0.75, y: 0.75 },
			}

			const cropWithCircle: TLShapeCrop = {
				topLeft: { x: 0, y: 0 },
				bottomRight: { x: 1, y: 1 },
				isCircle: true,
			}

			expect(cropWithoutCircle.isCircle).toBeUndefined()
			expect(cropWithCircle.isCircle).toBe(true)
		})

		it('should support VecModel with optional z coordinate', () => {
			const crop2D: TLShapeCrop = {
				topLeft: { x: 0.1, y: 0.2 },
				bottomRight: { x: 0.8, y: 0.9 },
			}

			const crop3D: TLShapeCrop = {
				topLeft: { x: 0.1, y: 0.2, z: 0.3 },
				bottomRight: { x: 0.8, y: 0.9, z: 0.1 },
			}

			expect(crop2D.topLeft.z).toBeUndefined()
			expect(crop2D.bottomRight.z).toBeUndefined()
			expect(crop3D.topLeft.z).toBe(0.3)
			expect(crop3D.bottomRight.z).toBe(0.1)
		})
	})

	describe('crop coordinate boundaries', () => {
		it('should handle normalized coordinates (0-1 range)', () => {
			const normalizedCrop: TLShapeCrop = {
				topLeft: { x: 0, y: 0 },
				bottomRight: { x: 1, y: 1 },
			}

			expect(normalizedCrop.topLeft.x).toBe(0)
			expect(normalizedCrop.topLeft.y).toBe(0)
			expect(normalizedCrop.bottomRight.x).toBe(1)
			expect(normalizedCrop.bottomRight.y).toBe(1)
		})

		it('should handle partial crop regions', () => {
			const centerCrop: TLShapeCrop = {
				topLeft: { x: 0.25, y: 0.25 },
				bottomRight: { x: 0.75, y: 0.75 },
			}

			expect(centerCrop.topLeft.x).toBe(0.25)
			expect(centerCrop.topLeft.y).toBe(0.25)
			expect(centerCrop.bottomRight.x).toBe(0.75)
			expect(centerCrop.bottomRight.y).toBe(0.75)
		})

		it('should handle edge case coordinates', () => {
			const edgeCrop: TLShapeCrop = {
				topLeft: { x: 0.0001, y: 0.0001 },
				bottomRight: { x: 0.9999, y: 0.9999 },
			}

			expect(edgeCrop.topLeft.x).toBe(0.0001)
			expect(edgeCrop.topLeft.y).toBe(0.0001)
			expect(edgeCrop.bottomRight.x).toBe(0.9999)
			expect(edgeCrop.bottomRight.y).toBe(0.9999)
		})

		it('should handle fractional coordinates', () => {
			const fractionalCrop: TLShapeCrop = {
				topLeft: { x: 1 / 3, y: 1 / 4 },
				bottomRight: { x: 2 / 3, y: 3 / 4 },
			}

			expect(fractionalCrop.topLeft.x).toBeCloseTo(0.3333333)
			expect(fractionalCrop.topLeft.y).toBe(0.25)
			expect(fractionalCrop.bottomRight.x).toBeCloseTo(0.6666667)
			expect(fractionalCrop.bottomRight.y).toBe(0.75)
		})
	})

	describe('circle crop functionality', () => {
		it('should support circular crop without isCircle flag', () => {
			const crop: TLShapeCrop = {
				topLeft: { x: 0, y: 0 },
				bottomRight: { x: 1, y: 1 },
			}

			// Should work without isCircle - implementation decides behavior
			expect(crop.isCircle).toBeUndefined()
		})

		it('should support explicit circular crop', () => {
			const circleCrop: TLShapeCrop = {
				topLeft: { x: 0, y: 0 },
				bottomRight: { x: 1, y: 1 },
				isCircle: true,
			}

			expect(circleCrop.isCircle).toBe(true)
		})

		it('should support explicit rectangular crop', () => {
			const rectCrop: TLShapeCrop = {
				topLeft: { x: 0.1, y: 0.1 },
				bottomRight: { x: 0.9, y: 0.9 },
				isCircle: false,
			}

			expect(rectCrop.isCircle).toBe(false)
		})
	})

	describe('crop region calculations', () => {
		it('should represent valid crop regions', () => {
			const crop: TLShapeCrop = {
				topLeft: { x: 0.2, y: 0.3 },
				bottomRight: { x: 0.8, y: 0.7 },
			}

			// Calculate crop dimensions
			const width = crop.bottomRight.x - crop.topLeft.x
			const height = crop.bottomRight.y - crop.topLeft.y

			expect(width).toBeCloseTo(0.6)
			expect(height).toBeCloseTo(0.4)
		})

		it('should handle single-point crops', () => {
			const pointCrop: TLShapeCrop = {
				topLeft: { x: 0.5, y: 0.5 },
				bottomRight: { x: 0.5, y: 0.5 },
			}

			const width = pointCrop.bottomRight.x - pointCrop.topLeft.x
			const height = pointCrop.bottomRight.y - pointCrop.topLeft.y

			expect(width).toBe(0)
			expect(height).toBe(0)
		})
	})

	test('should work with VecModel interface', () => {
		// Test that TLShapeCrop integrates properly with VecModel
		const vecA: VecModel = { x: 0.25, y: 0.25 }
		const vecB: VecModel = { x: 0.75, y: 0.75, z: 0.5 }

		const crop: TLShapeCrop = {
			topLeft: vecA,
			bottomRight: vecB,
			isCircle: true,
		}

		expect(crop.topLeft).toBe(vecA)
		expect(crop.bottomRight).toBe(vecB)
		expect(crop.bottomRight.z).toBe(0.5)
	})
})

describe('ShapeWithCrop', () => {
	describe('type structure', () => {
		it('should extend TLBaseShape with crop-specific properties', () => {
			// Test shape structure by creating a concrete implementation
			const croppedShape: ShapeWithCrop = {
				// Base shape properties
				id: 'shape:test123' as any,
				type: 'image',
				typeName: 'shape',
				x: 100,
				y: 200,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: {},
				// Crop-specific properties
				props: {
					w: 300,
					h: 200,
					crop: {
						topLeft: { x: 0.1, y: 0.1 },
						bottomRight: { x: 0.9, y: 0.9 },
					},
				},
			}

			expect(croppedShape.props.w).toBe(300)
			expect(croppedShape.props.h).toBe(200)
			expect(croppedShape.props.crop).toBeDefined()
			expect(croppedShape.props.crop?.topLeft.x).toBe(0.1)
			expect(croppedShape.props.crop?.bottomRight.y).toBe(0.9)
		})

		it('should support null crop (no cropping)', () => {
			const uncroppedShape: ShapeWithCrop = {
				// Base shape properties
				id: 'shape:test456' as any,
				type: 'video',
				typeName: 'shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a2' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: {},
				// Crop-specific properties
				props: {
					w: 400,
					h: 300,
					crop: null,
				},
			}

			expect(uncroppedShape.props.crop).toBeNull()
			expect(uncroppedShape.props.w).toBe(400)
			expect(uncroppedShape.props.h).toBe(300)
		})

		it('should support different shape types with cropping', () => {
			const imageShape: ShapeWithCrop = {
				id: 'shape:image1' as any,
				type: 'image',
				typeName: 'shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: {},
				props: {
					w: 200,
					h: 150,
					crop: {
						topLeft: { x: 0, y: 0 },
						bottomRight: { x: 1, y: 1 },
						isCircle: false,
					},
				},
			}

			const videoShape: ShapeWithCrop = {
				id: 'shape:video1' as any,
				type: 'video',
				typeName: 'shape',
				x: 100,
				y: 100,
				rotation: 45,
				index: 'a2' as any,
				parentId: 'page:main' as any,
				isLocked: true,
				opacity: 0.8,
				meta: { custom: 'data' },
				props: {
					w: 640,
					h: 480,
					crop: {
						topLeft: { x: 0.1, y: 0.1 },
						bottomRight: { x: 0.9, y: 0.9 },
						isCircle: true,
					},
				},
			}

			expect(imageShape.type).toBe('image')
			expect(imageShape.props.crop?.isCircle).toBe(false)
			expect(videoShape.type).toBe('video')
			expect(videoShape.props.crop?.isCircle).toBe(true)
			expect(videoShape.isLocked).toBe(true)
			expect(videoShape.opacity).toBe(0.8)
		})
	})

	describe('dimension properties', () => {
		it('should handle positive dimensions', () => {
			const shape: ShapeWithCrop = {
				id: 'shape:dim1' as any,
				type: 'test',
				typeName: 'shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: {},
				props: {
					w: 100,
					h: 50,
					crop: null,
				},
			}

			expect(shape.props.w).toBe(100)
			expect(shape.props.h).toBe(50)
			expect(typeof shape.props.w).toBe('number')
			expect(typeof shape.props.h).toBe('number')
		})

		it('should handle decimal dimensions', () => {
			const shape: ShapeWithCrop = {
				id: 'shape:dim2' as any,
				type: 'test',
				typeName: 'shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: {},
				props: {
					w: 123.45,
					h: 67.89,
					crop: null,
				},
			}

			expect(shape.props.w).toBe(123.45)
			expect(shape.props.h).toBe(67.89)
		})

		it('should handle large dimensions', () => {
			const shape: ShapeWithCrop = {
				id: 'shape:large' as any,
				type: 'test',
				typeName: 'shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: {},
				props: {
					w: 5000,
					h: 3000,
					crop: {
						topLeft: { x: 0.4, y: 0.3 },
						bottomRight: { x: 0.6, y: 0.7 },
					},
				},
			}

			expect(shape.props.w).toBe(5000)
			expect(shape.props.h).toBe(3000)
		})
	})

	describe('crop property variations', () => {
		it('should handle complex crop with circular flag', () => {
			const shape: ShapeWithCrop = {
				id: 'shape:complex' as any,
				type: 'media',
				typeName: 'shape',
				x: 50,
				y: 75,
				rotation: 30,
				index: 'b1' as any,
				parentId: 'page:gallery' as any,
				isLocked: false,
				opacity: 0.95,
				meta: { source: 'upload' },
				props: {
					w: 800,
					h: 600,
					crop: {
						topLeft: { x: 0.125, y: 0.125 },
						bottomRight: { x: 0.875, y: 0.875 },
						isCircle: true,
					},
				},
			}

			expect(shape.props.crop?.topLeft.x).toBe(0.125)
			expect(shape.props.crop?.bottomRight.x).toBe(0.875)
			expect(shape.props.crop?.isCircle).toBe(true)
		})

		it('should handle crop with 3D coordinates', () => {
			const shape: ShapeWithCrop = {
				id: 'shape:3d' as any,
				type: 'test',
				typeName: 'shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: {},
				props: {
					w: 300,
					h: 200,
					crop: {
						topLeft: { x: 0.2, y: 0.3, z: 0.1 },
						bottomRight: { x: 0.8, y: 0.7, z: 0.9 },
						isCircle: false,
					},
				},
			}

			expect(shape.props.crop?.topLeft.z).toBe(0.1)
			expect(shape.props.crop?.bottomRight.z).toBe(0.9)
		})

		it('should handle minimal crop (single point)', () => {
			const shape: ShapeWithCrop = {
				id: 'shape:minimal' as any,
				type: 'test',
				typeName: 'shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: {},
				props: {
					w: 100,
					h: 100,
					crop: {
						topLeft: { x: 0.5, y: 0.5 },
						bottomRight: { x: 0.5, y: 0.5 },
					},
				},
			}

			expect(shape.props.crop?.topLeft).toEqual({ x: 0.5, y: 0.5 })
			expect(shape.props.crop?.bottomRight).toEqual({ x: 0.5, y: 0.5 })
		})
	})

	describe('base shape property inheritance', () => {
		it('should inherit all TLBaseShape properties', () => {
			const shape: ShapeWithCrop = {
				// All base shape properties should be present and accessible
				id: 'shape:inheritance' as any,
				type: 'custom',
				typeName: 'shape',
				x: 42,
				y: 84,
				rotation: Math.PI / 4,
				index: 'z9' as any,
				parentId: 'page:test' as any,
				isLocked: true,
				opacity: 0.5,
				meta: { custom: 'metadata', nested: { value: 123 } },
				props: {
					w: 150,
					h: 100,
					crop: null,
				},
			}

			// Verify base shape properties
			expect(shape.id).toBe('shape:inheritance')
			expect(shape.type).toBe('custom')
			expect(shape.typeName).toBe('shape')
			expect(shape.x).toBe(42)
			expect(shape.y).toBe(84)
			expect(shape.rotation).toBe(Math.PI / 4)
			expect(shape.index).toBe('z9')
			expect(shape.parentId).toBe('page:test')
			expect(shape.isLocked).toBe(true)
			expect(shape.opacity).toBe(0.5)
			expect(shape.meta.custom).toBe('metadata')
			expect((shape.meta as any).nested.value).toBe(123)

			// Verify crop-specific properties
			expect(shape.props.w).toBe(150)
			expect(shape.props.h).toBe(100)
			expect(shape.props.crop).toBeNull()
		})

		it('should support different shape types while maintaining crop functionality', () => {
			const shapes: ShapeWithCrop[] = [
				{
					id: 'shape:image' as any,
					type: 'image',
					typeName: 'shape',
					x: 0,
					y: 0,
					rotation: 0,
					index: 'a1' as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					meta: {},
					props: {
						w: 200,
						h: 150,
						crop: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 1, y: 1 } },
					},
				},
				{
					id: 'shape:video' as any,
					type: 'video',
					typeName: 'shape',
					x: 100,
					y: 100,
					rotation: 0,
					index: 'a2' as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					meta: {},
					props: {
						w: 400,
						h: 300,
						crop: null,
					},
				},
			]

			expect(shapes[0].type).toBe('image')
			expect(shapes[0].props.crop).toBeDefined()
			expect(shapes[1].type).toBe('video')
			expect(shapes[1].props.crop).toBeNull()

			// Both should have the same base structure
			shapes.forEach((shape) => {
				expect(typeof shape.props.w).toBe('number')
				expect(typeof shape.props.h).toBe('number')
				expect(shape.typeName).toBe('shape')
			})
		})
	})

	test('should support generic type parameter customization', () => {
		// Test that ShapeWithCrop works as a generic base for specific shape types
		interface CustomCroppableShape extends ShapeWithCrop {
			type: 'custom-crop'
			props: {
				w: number
				h: number
				crop: TLShapeCrop | null
				// Could add additional custom properties
				customProperty?: string
			}
		}

		const customShape: CustomCroppableShape = {
			id: 'shape:custom' as any,
			type: 'custom-crop',
			typeName: 'shape',
			x: 10,
			y: 20,
			rotation: 0,
			index: 'a1' as any,
			parentId: 'page:main' as any,
			isLocked: false,
			opacity: 1,
			meta: {},
			props: {
				w: 250,
				h: 180,
				crop: {
					topLeft: { x: 0.1, y: 0.2 },
					bottomRight: { x: 0.9, y: 0.8 },
					isCircle: true,
				},
				customProperty: 'test-value',
			},
		}

		expect(customShape.type).toBe('custom-crop')
		expect(customShape.props.customProperty).toBe('test-value')
		expect(customShape.props.crop?.isCircle).toBe(true)
	})
})

describe('integration scenarios', () => {
	describe('real-world usage patterns', () => {
		it('should handle image cropping scenario', () => {
			// Simulate cropping center 80% of an image
			const imageCrop: TLShapeCrop = {
				topLeft: { x: 0.1, y: 0.1 },
				bottomRight: { x: 0.9, y: 0.9 },
				isCircle: false,
			}

			const imageShape: ShapeWithCrop = {
				id: 'shape:photo1' as any,
				type: 'image',
				typeName: 'shape',
				x: 100,
				y: 100,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: { filename: 'photo.jpg' },
				props: {
					w: 400,
					h: 300,
					crop: imageCrop,
				},
			}

			// Calculate visible area (should be 80% x 80% = 64% of original)
			const cropWidth = imageCrop.bottomRight.x - imageCrop.topLeft.x
			const cropHeight = imageCrop.bottomRight.y - imageCrop.topLeft.y
			const visibleArea = cropWidth * cropHeight

			expect(cropWidth).toBeCloseTo(0.8)
			expect(cropHeight).toBeCloseTo(0.8)
			expect(visibleArea).toBeCloseTo(0.64)
			expect(imageShape.props.crop).toBe(imageCrop)
		})

		it('should handle video with circular crop', () => {
			const videoCrop: TLShapeCrop = {
				topLeft: { x: 0, y: 0 },
				bottomRight: { x: 1, y: 1 },
				isCircle: true,
			}

			const videoShape: ShapeWithCrop = {
				id: 'shape:video1' as any,
				type: 'video',
				typeName: 'shape',
				x: 200,
				y: 150,
				rotation: 0,
				index: 'b1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: { duration: 120 },
				props: {
					w: 640,
					h: 480,
					crop: videoCrop,
				},
			}

			expect(videoShape.props.crop?.isCircle).toBe(true)
			expect(videoShape.props.crop?.topLeft.x).toBe(0)
			expect(videoShape.props.crop?.bottomRight.x).toBe(1)
		})

		it('should handle aspect ratio preservation', () => {
			// Test common aspect ratios with cropping
			const shape16x9: ShapeWithCrop = {
				id: 'shape:16x9' as any,
				type: 'media',
				typeName: 'shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: {},
				props: {
					w: 1920,
					h: 1080,
					crop: {
						topLeft: { x: 0.125, y: 0 }, // Crop to 4:3 from center
						bottomRight: { x: 0.875, y: 1 },
					},
				},
			}

			const aspectRatio = shape16x9.props.w / shape16x9.props.h
			expect(aspectRatio).toBeCloseTo(16 / 9, 5)

			// Calculate crop dimensions
			if (shape16x9.props.crop) {
				const cropWidth = shape16x9.props.crop.bottomRight.x - shape16x9.props.crop.topLeft.x
				const cropHeight = shape16x9.props.crop.bottomRight.y - shape16x9.props.crop.topLeft.y
				const croppedAspectRatio = cropWidth / cropHeight

				expect(cropWidth).toBe(0.75)
				expect(cropHeight).toBe(1)
				expect(croppedAspectRatio).toBe(0.75) // 3:4 ratio
			}
		})
	})

	describe('edge cases and boundary conditions', () => {
		it('should handle zero-dimension shapes', () => {
			const zeroWidthShape: ShapeWithCrop = {
				id: 'shape:zero-w' as any,
				type: 'test',
				typeName: 'shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: {},
				props: {
					w: 0,
					h: 100,
					crop: null,
				},
			}

			const zeroHeightShape: ShapeWithCrop = {
				id: 'shape:zero-h' as any,
				type: 'test',
				typeName: 'shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: {},
				props: {
					w: 100,
					h: 0,
					crop: null,
				},
			}

			expect(zeroWidthShape.props.w).toBe(0)
			expect(zeroWidthShape.props.h).toBe(100)
			expect(zeroHeightShape.props.w).toBe(100)
			expect(zeroHeightShape.props.h).toBe(0)
		})

		it('should handle inverted crop coordinates', () => {
			// Test case where topLeft and bottomRight might be inverted
			const invertedCrop: TLShapeCrop = {
				topLeft: { x: 0.8, y: 0.9 },
				bottomRight: { x: 0.2, y: 0.1 },
			}

			const shape: ShapeWithCrop = {
				id: 'shape:inverted' as any,
				type: 'test',
				typeName: 'shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: {},
				props: {
					w: 100,
					h: 100,
					crop: invertedCrop,
				},
			}

			// The interface doesn't prevent inverted coordinates
			// Implementation would need to handle normalization
			expect(shape.props.crop?.topLeft.x).toBe(0.8)
			expect(shape.props.crop?.bottomRight.x).toBe(0.2)
		})

		it('should handle extreme coordinate values', () => {
			const extremeCrop: TLShapeCrop = {
				topLeft: { x: -0.5, y: -0.5 },
				bottomRight: { x: 1.5, y: 1.5 },
			}

			const shape: ShapeWithCrop = {
				id: 'shape:extreme' as any,
				type: 'test',
				typeName: 'shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				meta: {},
				props: {
					w: 200,
					h: 200,
					crop: extremeCrop,
				},
			}

			// Interface allows values outside 0-1 range
			expect(shape.props.crop?.topLeft.x).toBe(-0.5)
			expect(shape.props.crop?.bottomRight.x).toBe(1.5)
		})
	})

	test('should maintain type safety across transformations', () => {
		// Test that type constraints are preserved through various operations
		let shape: ShapeWithCrop = {
			id: 'shape:transform' as any,
			type: 'image',
			typeName: 'shape',
			x: 0,
			y: 0,
			rotation: 0,
			index: 'a1' as any,
			parentId: 'page:main' as any,
			isLocked: false,
			opacity: 1,
			meta: {},
			props: {
				w: 100,
				h: 100,
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
				},
			},
		}

		// Update dimensions
		shape = {
			...shape,
			props: {
				...shape.props,
				w: 200,
				h: 150,
			},
		}

		// Update crop
		shape = {
			...shape,
			props: {
				...shape.props,
				crop: {
					topLeft: { x: 0.1, y: 0.1 },
					bottomRight: { x: 0.9, y: 0.9 },
					isCircle: true,
				},
			},
		}

		// Remove crop
		shape = {
			...shape,
			props: {
				...shape.props,
				crop: null,
			},
		}

		expect(shape.props.w).toBe(200)
		expect(shape.props.h).toBe(150)
		expect(shape.props.crop).toBeNull()
	})
})
