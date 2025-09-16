import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLAssetId } from '../records/TLAsset'
import { TLShapeId } from '../records/TLShape'
import { TLShapeCrop } from './ShapeWithCrop'
import {
	ImageShapeCrop,
	TLImageShape,
	TLImageShapeProps,
	imageShapeMigrations,
	imageShapeProps,
	imageShapeVersions,
} from './TLImageShape'

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

			edgeCaseCrops.forEach((crop, index) => {
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

	describe('TLImageShapeProps interface', () => {
		it('should represent valid image shape properties', () => {
			const validProps: TLImageShapeProps = {
				w: 400,
				h: 300,
				playing: true,
				url: 'https://example.com/image.jpg',
				assetId: 'asset:image123' as TLAssetId,
				crop: null,
				flipX: false,
				flipY: false,
				altText: 'A sample image',
			}

			expect(validProps.w).toBe(400)
			expect(validProps.h).toBe(300)
			expect(validProps.playing).toBe(true)
			expect(validProps.url).toBe('https://example.com/image.jpg')
			expect(validProps.assetId).toBe('asset:image123')
			expect(validProps.crop).toBeNull()
			expect(validProps.flipX).toBe(false)
			expect(validProps.flipY).toBe(false)
			expect(validProps.altText).toBe('A sample image')
		})

		it('should support image with crop data', () => {
			const croppedImageProps: TLImageShapeProps = {
				w: 200,
				h: 150,
				playing: false,
				url: 'https://example.com/photo.png',
				assetId: 'asset:photo456' as TLAssetId,
				crop: {
					topLeft: { x: 0.2, y: 0.2 },
					bottomRight: { x: 0.8, y: 0.8 },
					isCircle: false,
				},
				flipX: true,
				flipY: false,
				altText: 'Cropped photo',
			}

			expect(croppedImageProps.crop).not.toBeNull()
			expect(croppedImageProps.crop?.topLeft).toEqual({ x: 0.2, y: 0.2 })
			expect(croppedImageProps.crop?.bottomRight).toEqual({ x: 0.8, y: 0.8 })
			expect(croppedImageProps.crop?.isCircle).toBe(false)
			expect(croppedImageProps.flipX).toBe(true)
		})

		it('should support circular crop', () => {
			const circularCropProps: TLImageShapeProps = {
				w: 100,
				h: 100,
				playing: true,
				url: '',
				assetId: null,
				crop: {
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
					isCircle: true,
				},
				flipX: false,
				flipY: false,
				altText: 'Circular image',
			}

			expect(circularCropProps.crop?.isCircle).toBe(true)
			expect(circularCropProps.altText).toBe('Circular image')
		})

		it('should support null assetId', () => {
			const propsWithNullAsset: TLImageShapeProps = {
				w: 250,
				h: 200,
				playing: false,
				url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
				assetId: null,
				crop: null,
				flipX: false,
				flipY: true,
				altText: 'Base64 encoded image',
			}

			expect(propsWithNullAsset.assetId).toBeNull()
			expect(propsWithNullAsset.url).toContain('data:image/png')
			expect(propsWithNullAsset.flipY).toBe(true)
		})

		it('should support different URL formats', () => {
			const urlFormats = [
				'',
				'https://example.com/image.jpg',
				'http://example.com/photo.png',
				'https://cdn.example.com/assets/images/photo.gif',
				'https://example.com/image.webp?size=large',
				'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
			]

			urlFormats.forEach((url, index) => {
				const props: TLImageShapeProps = {
					w: 100,
					h: 100,
					playing: true,
					url,
					assetId: null,
					crop: null,
					flipX: false,
					flipY: false,
					altText: `Image ${index}`,
				}

				expect(props.url).toBe(url)
			})
		})

		it('should support different dimensions', () => {
			const dimensionTests = [
				{ w: 1, h: 1 },
				{ w: 50.5, h: 75.25 },
				{ w: 1920, h: 1080 },
				{ w: 4000, h: 3000 },
			]

			dimensionTests.forEach(({ w, h }) => {
				const props: TLImageShapeProps = {
					w,
					h,
					playing: false,
					url: '',
					assetId: null,
					crop: null,
					flipX: false,
					flipY: false,
					altText: '',
				}

				expect(props.w).toBe(w)
				expect(props.h).toBe(h)
			})
		})

		it('should support all flip combinations', () => {
			const flipCombinations = [
				{ flipX: false, flipY: false },
				{ flipX: true, flipY: false },
				{ flipX: false, flipY: true },
				{ flipX: true, flipY: true },
			]

			flipCombinations.forEach(({ flipX, flipY }) => {
				const props: TLImageShapeProps = {
					w: 100,
					h: 100,
					playing: true,
					url: '',
					assetId: null,
					crop: null,
					flipX,
					flipY,
					altText: `Flipped ${flipX ? 'X' : ''}${flipY ? 'Y' : ''}`,
				}

				expect(props.flipX).toBe(flipX)
				expect(props.flipY).toBe(flipY)
			})
		})

		it('should support playing state variations', () => {
			const playingStates = [true, false]

			playingStates.forEach((playing) => {
				const props: TLImageShapeProps = {
					w: 100,
					h: 100,
					playing,
					url: playing ? 'https://example.com/animation.gif' : 'https://example.com/static.jpg',
					assetId: null,
					crop: null,
					flipX: false,
					flipY: false,
					altText: playing ? 'Animated image' : 'Static image',
				}

				expect(props.playing).toBe(playing)
				expect(props.altText).toContain(playing ? 'Animated' : 'Static')
			})
		})

		it('should support various alt text content', () => {
			const altTextVariations = [
				'',
				'Simple description',
				'Image with special chars: !@#$%^&*()',
				'Multi-word descriptive alternative text for accessibility',
				'Unicode text: 🖼️ 🎨 📸',
				'Text with\nnewlines\nand\ttabs',
			]

			altTextVariations.forEach((altText) => {
				const props: TLImageShapeProps = {
					w: 100,
					h: 100,
					playing: false,
					url: '',
					assetId: null,
					crop: null,
					flipX: false,
					flipY: false,
					altText,
				}

				expect(props.altText).toBe(altText)
			})
		})

		it('should support different asset ID formats', () => {
			const assetIds: Array<TLAssetId | null> = [
				null,
				'asset:image1' as TLAssetId,
				'asset:photo_abc123' as TLAssetId,
				'asset:img-preview-456' as TLAssetId,
				'asset:' as TLAssetId, // Edge case: empty suffix
			]

			assetIds.forEach((assetId) => {
				const props: TLImageShapeProps = {
					w: 100,
					h: 100,
					playing: false,
					url: '',
					assetId,
					crop: null,
					flipX: false,
					flipY: false,
					altText: '',
				}

				expect(props.assetId).toBe(assetId)
			})
		})
	})

	describe('TLImageShape type', () => {
		it('should represent complete image shape records', () => {
			const validImageShape: TLImageShape = {
				id: 'shape:image123' as TLShapeId,
				typeName: 'shape',
				type: 'image',
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 400,
					h: 300,
					playing: true,
					url: 'https://example.com/image.jpg',
					assetId: 'asset:image123' as TLAssetId,
					crop: null,
					flipX: false,
					flipY: false,
					altText: 'Test image',
				},
				meta: {},
			}

			expect(validImageShape.type).toBe('image')
			expect(validImageShape.typeName).toBe('shape')
			expect(validImageShape.props.w).toBe(400)
			expect(validImageShape.props.h).toBe(300)
			expect(validImageShape.props.playing).toBe(true)
		})

		it('should support cropped image configurations', () => {
			const croppedImageShape: TLImageShape = {
				id: 'shape:cropped1' as TLShapeId,
				typeName: 'shape',
				type: 'image',
				x: 50,
				y: 75,
				rotation: 1.57,
				index: 'b1' as any,
				parentId: 'page:test' as any,
				isLocked: true,
				opacity: 0.8,
				props: {
					w: 200,
					h: 150,
					playing: false,
					url: 'https://example.com/photo.png',
					assetId: 'asset:photo456' as TLAssetId,
					crop: {
						topLeft: { x: 0.1, y: 0.1 },
						bottomRight: { x: 0.9, y: 0.9 },
						isCircle: false,
					},
					flipX: true,
					flipY: true,
					altText: 'Cropped and flipped image',
				},
				meta: { sourceType: 'upload' },
			}

			expect(croppedImageShape.props.crop).not.toBeNull()
			expect(croppedImageShape.props.crop?.topLeft).toEqual({ x: 0.1, y: 0.1 })
			expect(croppedImageShape.props.flipX).toBe(true)
			expect(croppedImageShape.props.flipY).toBe(true)
		})

		it('should support circular image configurations', () => {
			const circularImageShape: TLImageShape = {
				id: 'shape:circle1' as TLShapeId,
				typeName: 'shape',
				type: 'image',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'c1' as any,
				parentId: 'page:circle' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 120,
					h: 120,
					playing: true,
					url: 'https://example.com/avatar.gif',
					assetId: 'asset:avatar789' as TLAssetId,
					crop: {
						topLeft: { x: 0, y: 0 },
						bottomRight: { x: 1, y: 1 },
						isCircle: true,
					},
					flipX: false,
					flipY: false,
					altText: 'Circular avatar',
				},
				meta: { isAvatar: true },
			}

			expect(circularImageShape.props.crop?.isCircle).toBe(true)
			expect(circularImageShape.props.w).toBe(circularImageShape.props.h) // Square for circle
		})

		it('should support images without assets', () => {
			const imageWithoutAsset: TLImageShape = {
				id: 'shape:dataurl1' as TLShapeId,
				typeName: 'shape',
				type: 'image',
				x: 300,
				y: 400,
				rotation: 0,
				index: 'd1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 0.5,
				props: {
					w: 100,
					h: 100,
					playing: false,
					url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
					assetId: null,
					crop: null,
					flipX: false,
					flipY: false,
					altText: 'Inline data URL image',
				},
				meta: { source: 'dataurl' },
			}

			expect(imageWithoutAsset.props.assetId).toBeNull()
			expect(imageWithoutAsset.props.url).toContain('data:image')
		})
	})

	describe('imageShapeProps validation schema', () => {
		it('should validate all image shape properties', () => {
			const validProps = {
				w: 300,
				h: 200,
				playing: true,
				url: 'https://example.com/image.jpg',
				assetId: 'asset:image123' as TLAssetId,
				crop: null,
				flipX: false,
				flipY: true,
				altText: 'Test image',
			}

			// Validate each property individually
			expect(() => imageShapeProps.w.validate(validProps.w)).not.toThrow()
			expect(() => imageShapeProps.h.validate(validProps.h)).not.toThrow()
			expect(() => imageShapeProps.playing.validate(validProps.playing)).not.toThrow()
			expect(() => imageShapeProps.url.validate(validProps.url)).not.toThrow()
			expect(() => imageShapeProps.assetId.validate(validProps.assetId)).not.toThrow()
			expect(() => imageShapeProps.crop.validate(validProps.crop)).not.toThrow()
			expect(() => imageShapeProps.flipX.validate(validProps.flipX)).not.toThrow()
			expect(() => imageShapeProps.flipY.validate(validProps.flipY)).not.toThrow()
			expect(() => imageShapeProps.altText.validate(validProps.altText)).not.toThrow()
		})

		it('should validate using comprehensive object validator', () => {
			const fullValidator = T.object(imageShapeProps)

			const validPropsObject = {
				w: 400,
				h: 300,
				playing: false,
				url: 'https://test.com/photo.png',
				assetId: 'asset:photo456' as TLAssetId,
				crop: {
					topLeft: { x: 0.2, y: 0.2 },
					bottomRight: { x: 0.8, y: 0.8 },
					isCircle: true,
				},
				flipX: true,
				flipY: false,
				altText: 'Validated image',
			}

			expect(() => fullValidator.validate(validPropsObject)).not.toThrow()
			const result = fullValidator.validate(validPropsObject)
			expect(result).toEqual(validPropsObject)
		})

		it('should validate dimensions as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validDimensions = [0.1, 1, 50, 100, 1000, 0.001]

			validDimensions.forEach((dimension) => {
				expect(() => imageShapeProps.w.validate(dimension)).not.toThrow()
				expect(() => imageShapeProps.h.validate(dimension)).not.toThrow()
			})

			// Invalid dimensions (zero, negative numbers, and non-numbers)
			const invalidDimensions = [0, -1, -0.1, 'not-number', null, undefined, {}, [], true, false]

			invalidDimensions.forEach((dimension) => {
				expect(() => imageShapeProps.w.validate(dimension)).toThrow()
				expect(() => imageShapeProps.h.validate(dimension)).toThrow()
			})
		})

		it('should validate playing as boolean', () => {
			// Valid boolean values
			const validPlaying = [true, false]

			validPlaying.forEach((playing) => {
				expect(() => imageShapeProps.playing.validate(playing)).not.toThrow()
			})

			// Invalid playing values
			const invalidPlaying = [1, 0, 'true', 'false', null, undefined, {}, []]

			invalidPlaying.forEach((playing) => {
				expect(() => imageShapeProps.playing.validate(playing)).toThrow()
			})
		})

		it('should validate URLs using linkUrl validator', () => {
			const validUrls = [
				'',
				'https://example.com/image.jpg',
				'http://test.com/photo.png',
				'https://subdomain.example.com/path/image.gif',
				'https://example.com/image.webp?size=large#anchor',
			]

			validUrls.forEach((url) => {
				expect(() => imageShapeProps.url.validate(url)).not.toThrow()
			})

			// Invalid URLs should be handled by linkUrl validator
			const invalidUrls = ['not-a-url', null, undefined, 123, {}, []]

			invalidUrls.forEach((url) => {
				expect(() => imageShapeProps.url.validate(url)).toThrow()
			})
		})

		it('should validate assetId with nullable assetIdValidator', () => {
			// Valid assetIds (including null)
			const validAssetIds = [null, 'asset:image123' as TLAssetId, 'asset:photo456' as TLAssetId]

			validAssetIds.forEach((assetId) => {
				expect(() => imageShapeProps.assetId.validate(assetId)).not.toThrow()
			})

			// Invalid assetIds
			const invalidAssetIds = ['not-asset-id', 'image123', 123, {}, [], true, false]

			invalidAssetIds.forEach((assetId) => {
				expect(() => imageShapeProps.assetId.validate(assetId)).toThrow()
			})
		})

		it('should validate crop with nullable ImageShapeCrop validator', () => {
			// Valid crop values (including null)
			const validCrops = [
				null,
				{
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
				},
				{
					topLeft: { x: 0.25, y: 0.25 },
					bottomRight: { x: 0.75, y: 0.75 },
					isCircle: true,
				},
			]

			validCrops.forEach((crop) => {
				expect(() => imageShapeProps.crop.validate(crop)).not.toThrow()
			})

			// Invalid crop values
			const invalidCrops = [
				{}, // Missing required properties
				{ topLeft: { x: 0, y: 0 } }, // Missing bottomRight
				'not-crop-object',
				123,
				[],
				true,
			]

			invalidCrops.forEach((crop) => {
				expect(() => imageShapeProps.crop.validate(crop)).toThrow()
			})
		})

		it('should validate flip properties as boolean', () => {
			// Valid boolean values
			const validFlips = [true, false]

			validFlips.forEach((flip) => {
				expect(() => imageShapeProps.flipX.validate(flip)).not.toThrow()
				expect(() => imageShapeProps.flipY.validate(flip)).not.toThrow()
			})

			// Invalid flip values
			const invalidFlips = [1, 0, 'true', 'false', null, undefined, {}, []]

			invalidFlips.forEach((flip) => {
				expect(() => imageShapeProps.flipX.validate(flip)).toThrow()
				expect(() => imageShapeProps.flipY.validate(flip)).toThrow()
			})
		})

		it('should validate altText as string', () => {
			const validAltTexts = [
				'',
				'Simple description',
				'Text with special chars: !@#$%^&*()',
				'Unicode: 🖼️ 📸',
				'Multi\nline\ntext',
			]

			validAltTexts.forEach((altText) => {
				expect(() => imageShapeProps.altText.validate(altText)).not.toThrow()
			})

			const invalidAltTexts = [null, undefined, 123, {}, [], true, false]

			invalidAltTexts.forEach((altText) => {
				expect(() => imageShapeProps.altText.validate(altText)).toThrow()
			})
		})
	})

	describe('imageShapeVersions', () => {
		it('should contain expected migration version IDs', () => {
			expect(imageShapeVersions).toBeDefined()
			expect(typeof imageShapeVersions).toBe('object')
		})

		it('should have all expected migration versions', () => {
			const expectedVersions: Array<keyof typeof imageShapeVersions> = [
				'AddUrlProp',
				'AddCropProp',
				'MakeUrlsValid',
				'AddFlipProps',
				'AddAltText',
			]

			expectedVersions.forEach((version) => {
				expect(imageShapeVersions[version]).toBeDefined()
				expect(typeof imageShapeVersions[version]).toBe('string')
			})
		})

		it('should have properly formatted migration IDs', () => {
			Object.values(imageShapeVersions).forEach((versionId) => {
				expect(versionId).toMatch(/^com\.tldraw\.shape\.image\//)
				expect(versionId).toMatch(/\/\d+$/) // Should end with /number
			})
		})

		it('should contain image in migration IDs', () => {
			Object.values(imageShapeVersions).forEach((versionId) => {
				expect(versionId).toContain('image')
			})
		})

		it('should have unique version IDs', () => {
			const versionIds = Object.values(imageShapeVersions)
			const uniqueIds = new Set(versionIds)
			expect(uniqueIds.size).toBe(versionIds.length)
		})
	})

	describe('imageShapeMigrations', () => {
		it('should be defined and have required structure', () => {
			expect(imageShapeMigrations).toBeDefined()
			expect(imageShapeMigrations.sequence).toBeDefined()
			expect(Array.isArray(imageShapeMigrations.sequence)).toBe(true)
		})

		it('should have migrations for all version IDs', () => {
			const migrationIds = imageShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : null))
				.filter(Boolean)

			const versionIds = Object.values(imageShapeVersions)

			versionIds.forEach((versionId) => {
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should have correct number of migrations in sequence', () => {
			// Should have at least as many migrations as version IDs
			expect(imageShapeMigrations.sequence.length).toBeGreaterThanOrEqual(
				Object.keys(imageShapeVersions).length
			)
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

		it('should be compatible with TLBaseShape structure', () => {
			const imageShape: TLImageShape = {
				id: 'shape:image_test' as TLShapeId,
				typeName: 'shape',
				type: 'image',
				x: 50,
				y: 75,
				rotation: 1.57,
				index: 'b1' as any,
				parentId: 'page:test' as any,
				isLocked: true,
				opacity: 0.5,
				props: {
					w: 200,
					h: 150,
					playing: false,
					url: 'https://example.com/photo.png',
					assetId: 'asset:photo456' as TLAssetId,
					crop: null,
					flipX: true,
					flipY: false,
					altText: 'Test photo',
				},
				meta: { shapeType: 'image' },
			}

			// Should satisfy TLBaseShape structure
			expect(imageShape.typeName).toBe('shape')
			expect(imageShape.type).toBe('image')
			expect(typeof imageShape.id).toBe('string')
			expect(typeof imageShape.x).toBe('number')
			expect(typeof imageShape.y).toBe('number')
			expect(typeof imageShape.rotation).toBe('number')
			expect(imageShape.props).toBeDefined()
			expect(imageShape.meta).toBeDefined()
		})

		test('should handle all migration versions in correct order', () => {
			const expectedOrder: Array<keyof typeof imageShapeVersions> = [
				'AddUrlProp',
				'AddCropProp',
				'MakeUrlsValid',
				'AddFlipProps',
				'AddAltText',
			]

			const migrationIds = imageShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : ''))
				.filter(Boolean)

			expectedOrder.forEach((expectedVersion) => {
				const versionId = imageShapeVersions[expectedVersion]
				expect(migrationIds).toContain(versionId)
			})
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty or malformed props gracefully during validation', () => {
			const fullValidator = T.object(imageShapeProps)

			// Missing required properties should throw
			expect(() => fullValidator.validate({})).toThrow()

			// Partial props should throw for missing required fields
			expect(() =>
				fullValidator.validate({
					w: 100,
					h: 100,
					// Missing other required properties
				})
			).toThrow()

			// Extra unexpected properties should throw
			expect(() =>
				fullValidator.validate({
					w: 100,
					h: 100,
					playing: false,
					url: '',
					assetId: null,
					crop: null,
					flipX: false,
					flipY: false,
					altText: '',
					unexpectedProperty: 'extra', // This should cause validation to fail
				})
			).toThrow()
		})

		it('should handle boundary values for numeric properties', () => {
			// Test extreme but valid values
			const extremeProps = {
				w: 0.0001, // Very small but not zero
				h: 999999, // Very large
				playing: true,
				url: '',
				assetId: null,
				crop: null,
				flipX: false,
				flipY: false,
				altText: '',
			}

			const fullValidator = T.object(imageShapeProps)
			expect(() => fullValidator.validate(extremeProps)).not.toThrow()
		})

		it('should handle zero and negative values validation correctly', () => {
			// Zero should be invalid for w and h (nonZeroNumber)
			expect(() => imageShapeProps.w.validate(0)).toThrow()
			expect(() => imageShapeProps.h.validate(0)).toThrow()

			// Negative values should be invalid for w and h
			expect(() => imageShapeProps.w.validate(-1)).toThrow()
			expect(() => imageShapeProps.h.validate(-1)).toThrow()
		})

		it('should handle complex crop configurations', () => {
			const complexCrops = [
				null, // No cropping
				{
					topLeft: { x: 0, y: 0 },
					bottomRight: { x: 1, y: 1 },
				}, // Full image
				{
					topLeft: { x: 0.5, y: 0.5 },
					bottomRight: { x: 0.5, y: 0.5 },
				}, // Single point crop
				{
					topLeft: { x: 0.1, y: 0.9 },
					bottomRight: { x: 0.9, y: 0.1 },
				}, // Inverted coordinates
				{
					topLeft: { x: 0.25, y: 0.25 },
					bottomRight: { x: 0.75, y: 0.75 },
					isCircle: true,
				}, // Circular crop
			]

			complexCrops.forEach((crop) => {
				expect(() => imageShapeProps.crop.validate(crop)).not.toThrow()
			})
		})

		it('should handle all flip combinations with different properties', () => {
			const configurations = [
				{
					flipX: false,
					flipY: false,
					playing: true,
					assetId: 'asset:image1' as TLAssetId,
				},
				{
					flipX: true,
					flipY: false,
					playing: false,
					assetId: null,
				},
				{
					flipX: false,
					flipY: true,
					playing: true,
					assetId: 'asset:image2' as TLAssetId,
				},
				{
					flipX: true,
					flipY: true,
					playing: false,
					assetId: null,
				},
			]

			configurations.forEach((config) => {
				const props: TLImageShapeProps = {
					w: 100,
					h: 100,
					url: '',
					crop: null,
					altText: 'Test image',
					...config,
				}

				const fullValidator = T.object(imageShapeProps)
				expect(() => fullValidator.validate(props)).not.toThrow()
			})
		})

		it('should handle different URL formats correctly', () => {
			const urlTestCases = [
				{ url: '', shouldPass: true },
				{ url: 'https://example.com/image.jpg', shouldPass: true },
				{ url: 'http://test.com/photo.png', shouldPass: true },
				{ url: 'https://subdomain.example.com/path/image.gif?size=large', shouldPass: true },
			]

			urlTestCases.forEach(({ url, shouldPass }) => {
				if (shouldPass) {
					expect(() => imageShapeProps.url.validate(url)).not.toThrow()
				} else {
					expect(() => imageShapeProps.url.validate(url)).toThrow()
				}
			})
		})

		it('should handle various alt text edge cases', () => {
			const altTextCases = [
				'', // Empty string
				'Simple description',
				'Very long description that goes on and on and on with lots of detail about what is shown in the image including colors, objects, people, and other descriptive elements',
				'Text with special characters: !@#$%^&*()[]{}|\\:";\'<>?,./',
				'Unicode characters: 🖼️ 📸 🎨 ✨ 🌟',
				'Text with\nnewlines\nand\ttabs',
				'Mixed content: normal text, UPPERCASE, lowercase, 123 numbers, symbols!',
			]

			altTextCases.forEach((altText) => {
				const props: TLImageShapeProps = {
					w: 100,
					h: 100,
					playing: false,
					url: '',
					assetId: null,
					crop: null,
					flipX: false,
					flipY: false,
					altText,
				}

				const fullValidator = T.object(imageShapeProps)
				expect(() => fullValidator.validate(props)).not.toThrow()
			})
		})
	})
})
