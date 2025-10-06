import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLAssetId } from '../records/TLAsset'
import { TLShapeCrop } from './ShapeWithCrop'
import { ImageShapeCrop, imageShapeProps, imageShapeVersions } from './TLImageShape'

describe('TLImageShape', () => {
	describe('ImageShapeCrop validator', () => {
		it('should validate valid crop data', () => {
			const validCrop: TLShapeCrop = {
				topLeft: { x: 0.1, y: 0.1 },
				bottomRight: { x: 0.9, y: 0.9 },
			}

			expect(() => ImageShapeCrop.validate(validCrop)).not.toThrow()
			const result = ImageShapeCrop.validate(validCrop)
			expect(result.topLeft).toEqual({ x: 0.1, y: 0.1 })
			expect(result.bottomRight).toEqual({ x: 0.9, y: 0.9 })
		})

		it('should validate crop data with isCircle flag', () => {
			const cropWithCircle: TLShapeCrop = {
				topLeft: { x: 0, y: 0 },
				bottomRight: { x: 1, y: 1 },
				isCircle: true,
			}

			expect(() => ImageShapeCrop.validate(cropWithCircle)).not.toThrow()
			const result = ImageShapeCrop.validate(cropWithCircle)
			expect(result.isCircle).toBe(true)
		})

		it('should validate crop data without isCircle flag', () => {
			const cropWithoutCircle: TLShapeCrop = {
				topLeft: { x: 0.25, y: 0.25 },
				bottomRight: { x: 0.75, y: 0.75 },
			}

			expect(() => ImageShapeCrop.validate(cropWithoutCircle)).not.toThrow()
			const result = ImageShapeCrop.validate(cropWithoutCircle)
			expect(result.isCircle).toBeUndefined()
		})

		it('should validate crop data with explicit false isCircle', () => {
			const cropWithFalseCircle: TLShapeCrop = {
				topLeft: { x: 0, y: 0.5 },
				bottomRight: { x: 1, y: 1 },
				isCircle: false,
			}

			expect(() => ImageShapeCrop.validate(cropWithFalseCircle)).not.toThrow()
			const result = ImageShapeCrop.validate(cropWithFalseCircle)
			expect(result.isCircle).toBe(false)
		})

		it('should validate edge case coordinate values', () => {
			const edgeCaseCrops = [
				{
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
				},
				{
					topLeft: { x: 0.5, y: 0.5 },
					bottomRight: { x: 0.5, y: 0.5 },
				},
				{
					topLeft: { x: 0.001, y: 0.999 },
					bottomRight: { x: 0.999, y: 0.001 },
				},
			]

			edgeCaseCrops.forEach((crop, _index) => {
				expect(() => ImageShapeCrop.validate(crop)).not.toThrow()
			})
		})

		it('should reject invalid crop data structures', () => {
			const invalidCrops = [
				{}, // Missing required properties
				{ topLeft: { x: 0.1, y: 0.1 } }, // Missing bottomRight
				{ bottomRight: { x: 0.9, y: 0.9 } }, // Missing topLeft
				{
					topLeft: { x: 'invalid', y: 0.1 },
					bottomRight: { x: 0.9, y: 0.9 },
				}, // Invalid coordinate type
				{
					topLeft: { x: 0.1, y: 0.1 },
					bottomRight: { x: 0.9, y: 'invalid' },
				}, // Invalid coordinate type
				{
					topLeft: { x: 0.1 }, // Missing y
					bottomRight: { x: 0.9, y: 0.9 },
				},
				{
					topLeft: { x: 0.1, y: 0.1 },
					bottomRight: { y: 0.9 }, // Missing x
				},
				{
					topLeft: { x: 0.1, y: 0.1 },
					bottomRight: { x: 0.9, y: 0.9 },
					isCircle: 'not-boolean', // Invalid isCircle type
				},
				null,
				undefined,
				'not-an-object',
				123,
				[],
			]

			invalidCrops.forEach((crop) => {
				expect(() => ImageShapeCrop.validate(crop)).toThrow()
			})
		})
	})

	describe('imageShapeMigrations - AddUrlProp migration', () => {
		const { up, down } = getTestMigration(imageShapeVersions.AddUrlProp)

		describe('AddUrlProp up migration', () => {
			it('should add url property with empty string default', () => {
				const oldRecord = {
					id: 'shape:image1',
					typeName: 'shape',
					type: 'image',
					x: 100,
					y: 200,
					rotation: 0,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 1,
					props: {
						w: 400,
						h: 300,
						playing: true,
						assetId: 'asset:image123',
					},
					meta: {},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.w).toBe(400) // Preserve other props
				expect(result.props.playing).toBe(true)
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:image2',
					props: {
						w: 500,
						h: 400,
						playing: false,
						assetId: null,
					},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.w).toBe(500)
				expect(result.props.h).toBe(400)
				expect(result.props.playing).toBe(false)
				expect(result.props.assetId).toBeNull()
			})
		})

		describe('AddUrlProp down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.image/1 does not have a down function')
			})
		})
	})

	describe('imageShapeMigrations - AddCropProp migration', () => {
		const { up, down } = getTestMigration(imageShapeVersions.AddCropProp)

		describe('AddCropProp up migration', () => {
			it('should add crop property with null default', () => {
				const oldRecord = {
					id: 'shape:image1',
					props: {
						w: 300,
						h: 200,
						playing: true,
						url: 'https://example.com/image.jpg',
						assetId: 'asset:image123',
					},
				}

				const result = up(oldRecord)
				expect(result.props.crop).toBeNull()
				expect(result.props.w).toBe(300) // Preserve other props
				expect(result.props.url).toBe('https://example.com/image.jpg')
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:image2',
					props: {
						w: 400,
						h: 300,
						playing: false,
						url: '',
						assetId: null,
					},
				}

				const result = up(oldRecord)
				expect(result.props.crop).toBeNull()
				expect(result.props.w).toBe(400)
				expect(result.props.playing).toBe(false)
			})
		})

		describe('AddCropProp down migration', () => {
			it('should remove crop property', () => {
				const newRecord = {
					id: 'shape:image1',
					props: {
						w: 300,
						h: 200,
						playing: true,
						url: 'https://example.com/image.jpg',
						assetId: 'asset:image123',
						crop: {
							topLeft: { x: 0.1, y: 0.1 },
							bottomRight: { x: 0.9, y: 0.9 },
						},
					},
				}

				const result = down(newRecord)
				expect(result.props.crop).toBeUndefined()
				expect(result.props.w).toBe(300) // Preserve other props
			})
		})
	})

	describe('imageShapeMigrations - MakeUrlsValid migration', () => {
		const { up, down } = getTestMigration(imageShapeVersions.MakeUrlsValid)

		describe('MakeUrlsValid up migration', () => {
			it('should clear invalid URLs', () => {
				const oldRecord = {
					id: 'shape:image1',
					props: {
						w: 300,
						h: 200,
						playing: true,
						url: 'invalid-url-format',
						assetId: 'asset:image123',
						crop: null,
					},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.w).toBe(300) // Preserve other props
			})

			it('should preserve valid URLs', () => {
				const validUrls = [
					'',
					'https://example.com/image.jpg',
					'http://test.com/photo.png',
					'https://subdomain.example.com/path/image.gif',
				]

				validUrls.forEach((url) => {
					const oldRecord = {
						id: 'shape:image1',
						props: {
							w: 300,
							h: 200,
							playing: true,
							url,
							assetId: 'asset:image123',
							crop: null,
						},
					}

					const result = up(oldRecord)
					expect(result.props.url).toBe(url)
				})
			})

			it('should preserve all other properties during migration', () => {
				const oldRecord = {
					id: 'shape:image1',
					props: {
						w: 400,
						h: 300,
						playing: false,
						url: 'not-valid-url',
						assetId: null,
						crop: {
							topLeft: { x: 0.2, y: 0.2 },
							bottomRight: { x: 0.8, y: 0.8 },
						},
					},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.w).toBe(400)
				expect(result.props.playing).toBe(false)
				expect(result.props.crop).toEqual({
					topLeft: { x: 0.2, y: 0.2 },
					bottomRight: { x: 0.8, y: 0.8 },
				})
			})
		})

		describe('MakeUrlsValid down migration', () => {
			it('should be a no-op migration', () => {
				const newRecord = {
					id: 'shape:image1',
					props: {
						w: 300,
						h: 200,
						playing: true,
						url: 'https://example.com/image.jpg',
						assetId: 'asset:image123',
						crop: null,
					},
				}

				const result = down(newRecord)
				expect(result).toEqual(newRecord)
			})
		})
	})

	describe('imageShapeMigrations - AddFlipProps migration', () => {
		const { up, down } = getTestMigration(imageShapeVersions.AddFlipProps)

		describe('AddFlipProps up migration', () => {
			it('should add flipX and flipY properties with false defaults', () => {
				const oldRecord = {
					id: 'shape:image1',
					props: {
						w: 300,
						h: 200,
						playing: true,
						url: 'https://example.com/image.jpg',
						assetId: 'asset:image123',
						crop: null,
					},
				}

				const result = up(oldRecord)
				expect(result.props.flipX).toBe(false)
				expect(result.props.flipY).toBe(false)
				expect(result.props.w).toBe(300) // Preserve other props
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:image2',
					props: {
						w: 400,
						h: 300,
						playing: false,
						url: '',
						assetId: null,
						crop: {
							topLeft: { x: 0, y: 0 },
							bottomRight: { x: 1, y: 1 },
							isCircle: true,
						},
					},
				}

				const result = up(oldRecord)
				expect(result.props.flipX).toBe(false)
				expect(result.props.flipY).toBe(false)
				expect(result.props.w).toBe(400)
				expect(result.props.crop?.isCircle).toBe(true)
			})
		})

		describe('AddFlipProps down migration', () => {
			it('should remove flipX and flipY properties', () => {
				const newRecord = {
					id: 'shape:image1',
					props: {
						w: 300,
						h: 200,
						playing: true,
						url: 'https://example.com/image.jpg',
						assetId: 'asset:image123',
						crop: null,
						flipX: true,
						flipY: false,
					},
				}

				const result = down(newRecord)
				expect(result.props.flipX).toBeUndefined()
				expect(result.props.flipY).toBeUndefined()
				expect(result.props.w).toBe(300) // Preserve other props
			})
		})
	})

	describe('imageShapeMigrations - AddAltText migration', () => {
		const { up, down } = getTestMigration(imageShapeVersions.AddAltText)

		describe('AddAltText up migration', () => {
			it('should add altText property with empty string default', () => {
				const oldRecord = {
					id: 'shape:image1',
					props: {
						w: 300,
						h: 200,
						playing: true,
						url: 'https://example.com/image.jpg',
						assetId: 'asset:image123',
						crop: null,
						flipX: false,
						flipY: true,
					},
				}

				const result = up(oldRecord)
				expect(result.props.altText).toBe('')
				expect(result.props.flipY).toBe(true) // Preserve other props
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:image2',
					props: {
						w: 500,
						h: 400,
						playing: false,
						url: '',
						assetId: null,
						crop: {
							topLeft: { x: 0.25, y: 0.25 },
							bottomRight: { x: 0.75, y: 0.75 },
						},
						flipX: true,
						flipY: false,
					},
				}

				const result = up(oldRecord)
				expect(result.props.altText).toBe('')
				expect(result.props.flipX).toBe(true)
				expect(result.props.crop).toEqual({
					topLeft: { x: 0.25, y: 0.25 },
					bottomRight: { x: 0.75, y: 0.75 },
				})
			})
		})

		describe('AddAltText down migration', () => {
			it('should remove altText property', () => {
				const newRecord = {
					id: 'shape:image1',
					props: {
						w: 300,
						h: 200,
						playing: true,
						url: 'https://example.com/image.jpg',
						assetId: 'asset:image123',
						crop: null,
						flipX: false,
						flipY: false,
						altText: 'Sample image description',
					},
				}

				const result = down(newRecord)
				expect(result.props.altText).toBeUndefined()
				expect(result.props.flipX).toBe(false) // Preserve other props
			})
		})
	})

	describe('integration tests', () => {
		it('should work with complete image shape record validation', () => {
			const completeValidator = T.object({
				id: T.string,
				typeName: T.literal('shape'),
				type: T.literal('image'),
				x: T.number,
				y: T.number,
				rotation: T.number,
				index: T.string,
				parentId: T.string,
				isLocked: T.boolean,
				opacity: T.number,
				props: T.object(imageShapeProps),
				meta: T.jsonValue,
			})

			const validImageShape = {
				id: 'shape:image123',
				typeName: 'shape' as const,
				type: 'image' as const,
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0.8,
				props: {
					w: 400,
					h: 300,
					playing: true,
					url: 'https://example.com/image.jpg',
					assetId: 'asset:image123' as TLAssetId,
					crop: {
						topLeft: { x: 0.1, y: 0.1 },
						bottomRight: { x: 0.9, y: 0.9 },
						isCircle: false,
					},
					flipX: false,
					flipY: true,
					altText: 'Sample image',
				},
				meta: { custom: 'data' },
			}

			expect(() => completeValidator.validate(validImageShape)).not.toThrow()
		})
	})
})
