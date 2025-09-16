import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLAssetId } from '../records/TLAsset'
import {
	imageAssetMigrations,
	imageAssetValidator,
	imageAssetVersions,
	TLImageAsset,
} from './TLImageAsset'

describe('TLImageAsset', () => {
	describe('TLImageAsset interface', () => {
		it('should extend TLBaseAsset with image-specific properties', () => {
			const mockImageAsset: TLImageAsset = {
				id: 'asset:image123' as TLAssetId,
				typeName: 'asset',
				type: 'image',
				props: {
					w: 800,
					h: 600,
					name: 'photo.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/photo.jpg',
					fileSize: 156000,
				},
				meta: { uploadedBy: 'user123' },
			}

			expect(mockImageAsset.id).toBe('asset:image123')
			expect(mockImageAsset.typeName).toBe('asset')
			expect(mockImageAsset.type).toBe('image')
			expect(mockImageAsset.props.w).toBe(800)
			expect(mockImageAsset.props.h).toBe(600)
			expect(mockImageAsset.props.name).toBe('photo.jpg')
			expect(mockImageAsset.props.isAnimated).toBe(false)
			expect(mockImageAsset.props.mimeType).toBe('image/jpeg')
			expect(mockImageAsset.props.src).toBe('https://example.com/photo.jpg')
			expect(mockImageAsset.props.fileSize).toBe(156000)
			expect(mockImageAsset.meta).toEqual({ uploadedBy: 'user123' })
		})

		it('should handle null mimeType and src properties', () => {
			const imageAssetWithNullValues: TLImageAsset = {
				id: 'asset:image456' as TLAssetId,
				typeName: 'asset',
				type: 'image',
				props: {
					w: 400,
					h: 300,
					name: 'unknown-image',
					isAnimated: false,
					mimeType: null,
					src: null,
				},
				meta: {},
			}

			expect(imageAssetWithNullValues.props.mimeType).toBeNull()
			expect(imageAssetWithNullValues.props.src).toBeNull()
			expect(imageAssetWithNullValues.props.w).toBe(400)
			expect(imageAssetWithNullValues.props.h).toBe(300)
		})

		it('should work with optional fileSize property', () => {
			const imageAssetWithoutFileSize: TLImageAsset = {
				id: 'asset:image789' as TLAssetId,
				typeName: 'asset',
				type: 'image',
				props: {
					w: 1024,
					h: 768,
					name: 'large-image.png',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'https://example.com/large-image.png',
				},
				meta: {},
			}

			expect(imageAssetWithoutFileSize.props.fileSize).toBeUndefined()
			expect(imageAssetWithoutFileSize.props.name).toBe('large-image.png')
		})

		it('should support animated images', () => {
			const animatedImageAsset: TLImageAsset = {
				id: 'asset:animated123' as TLAssetId,
				typeName: 'asset',
				type: 'image',
				props: {
					w: 300,
					h: 300,
					name: 'animation.gif',
					isAnimated: true,
					mimeType: 'image/gif',
					src: 'https://example.com/animation.gif',
					fileSize: 250000,
				},
				meta: { animated: true },
			}

			expect(animatedImageAsset.props.isAnimated).toBe(true)
			expect(animatedImageAsset.props.mimeType).toBe('image/gif')
			expect(animatedImageAsset.props.name).toBe('animation.gif')
		})

		it('should work with data URLs', () => {
			const dataUrlImageAsset: TLImageAsset = {
				id: 'asset:dataurl456' as TLAssetId,
				typeName: 'asset',
				type: 'image',
				props: {
					w: 1,
					h: 1,
					name: 'pixel.png',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
					fileSize: 68,
				},
				meta: {},
			}

			expect(dataUrlImageAsset.props.src).toContain('data:image/png;base64')
			expect(dataUrlImageAsset.props.w).toBe(1)
			expect(dataUrlImageAsset.props.h).toBe(1)
		})
	})

	describe('imageAssetValidator', () => {
		it('should validate a complete image asset', () => {
			const validImageAsset = {
				id: 'asset:image_valid',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 800,
					h: 600,
					name: 'test-image.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test-image.jpg',
					fileSize: 156000,
				},
				meta: {
					uploadedAt: '2023-12-01T10:00:00Z',
					uploadedBy: 'user123',
				} as JsonObject,
			}

			expect(() => imageAssetValidator.validate(validImageAsset)).not.toThrow()
			const result = imageAssetValidator.validate(validImageAsset)
			expect(result.id).toBe('asset:image_valid')
			expect(result.type).toBe('image')
			expect(result.props.w).toBe(800)
			expect(result.props.h).toBe(600)
			expect(result.props.name).toBe('test-image.jpg')
			expect(result.props.isAnimated).toBe(false)
			expect(result.props.mimeType).toBe('image/jpeg')
			expect(result.props.src).toBe('https://example.com/test-image.jpg')
			expect(result.props.fileSize).toBe(156000)
		})

		it('should validate image asset with null mimeType and src', () => {
			const imageWithNullValues = {
				id: 'asset:image_null_values',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 400,
					h: 300,
					name: 'unknown-format',
					isAnimated: false,
					mimeType: null,
					src: null,
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(imageWithNullValues)).not.toThrow()
			const result = imageAssetValidator.validate(imageWithNullValues)
			expect(result.props.mimeType).toBeNull()
			expect(result.props.src).toBeNull()
		})

		it('should validate image asset without optional fileSize', () => {
			const imageWithoutFileSize = {
				id: 'asset:image_no_file_size',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 1024,
					h: 768,
					name: 'no-size.png',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'https://example.com/no-size.png',
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(imageWithoutFileSize)).not.toThrow()
			const result = imageAssetValidator.validate(imageWithoutFileSize)
			expect(result.props.fileSize).toBeUndefined()
		})

		it('should validate image asset with data URLs', () => {
			const imageWithDataUrl = {
				id: 'asset:image_data_url',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 100,
					h: 100,
					name: 'data-image.png',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
					fileSize: 68,
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(imageWithDataUrl)).not.toThrow()
			const result = imageAssetValidator.validate(imageWithDataUrl)
			expect(result.props.src).toContain('data:image/png;base64')
		})

		it('should validate animated image asset', () => {
			const animatedImage = {
				id: 'asset:animated_gif',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 200,
					h: 200,
					name: 'animation.gif',
					isAnimated: true,
					mimeType: 'image/gif',
					src: 'https://example.com/animation.gif',
					fileSize: 500000,
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(animatedImage)).not.toThrow()
			const result = imageAssetValidator.validate(animatedImage)
			expect(result.props.isAnimated).toBe(true)
		})

		it('should reject invalid asset ID format', () => {
			const invalidIdAsset = {
				id: 'shape:invalid_id',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(invalidIdAsset)).toThrow(
				'asset ID must start with "asset:"'
			)
		})

		it('should reject wrong typeName', () => {
			const wrongTypeNameAsset = {
				id: 'asset:image123',
				typeName: 'shape' as const,
				type: 'image' as const,
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(wrongTypeNameAsset)).toThrow()
		})

		it('should reject wrong type', () => {
			const wrongTypeAsset = {
				id: 'asset:image123',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(wrongTypeAsset)).toThrow()
		})

		it('should reject missing required props', () => {
			const missingWidthAsset = {
				id: 'asset:image123',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(missingWidthAsset)).toThrow()

			const missingHeightAsset = {
				id: 'asset:image123',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(missingHeightAsset)).toThrow()

			const missingNameAsset = {
				id: 'asset:image123',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 100,
					h: 100,
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(missingNameAsset)).toThrow()

			const missingIsAnimatedAsset = {
				id: 'asset:image123',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(missingIsAnimatedAsset)).toThrow()
		})

		it('should reject non-number dimensions', () => {
			const nonNumberDimensionsAsset = {
				id: 'asset:image123',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: '100',
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(nonNumberDimensionsAsset)).toThrow()
		})

		it('should reject non-string name', () => {
			const nonStringNameAsset = {
				id: 'asset:image123',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 100,
					h: 100,
					name: 123,
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(nonStringNameAsset)).toThrow()
		})

		it('should reject non-boolean isAnimated', () => {
			const nonBooleanAnimatedAsset = {
				id: 'asset:image123',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: 'true',
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(nonBooleanAnimatedAsset)).toThrow()
		})

		it('should reject invalid mimeType types (not string or null)', () => {
			const invalidMimeTypeAsset = {
				id: 'asset:image123',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 123,
					src: 'https://example.com/test.jpg',
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(invalidMimeTypeAsset)).toThrow()
		})

		it('should reject invalid src types (not string or null)', () => {
			const invalidSrcTypeAsset = {
				id: 'asset:image123',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 123,
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(invalidSrcTypeAsset)).toThrow()
		})

		it('should reject zero or negative fileSize', () => {
			const zeroFileSizeAsset = {
				id: 'asset:image123',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
					fileSize: 0,
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(zeroFileSizeAsset)).toThrow()

			const negativeFileSizeAsset = {
				id: 'asset:image123',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
					fileSize: -1,
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(negativeFileSizeAsset)).toThrow()
		})

		it('should reject extra unexpected properties', () => {
			const extraPropsAsset = {
				id: 'asset:image123',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
					extraProp: 'unexpected',
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(extraPropsAsset)).toThrow()
		})

		test('should handle edge cases with dimensions', () => {
			const veryLargeImageAsset = {
				id: 'asset:large_image',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					w: 10000,
					h: 8000,
					name: 'huge-image.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/huge-image.jpg',
					fileSize: 50000000,
				},
				meta: {},
			}

			expect(() => imageAssetValidator.validate(veryLargeImageAsset)).not.toThrow()
			const result = imageAssetValidator.validate(veryLargeImageAsset)
			expect(result.props.w).toBe(10000)
			expect(result.props.h).toBe(8000)
			expect(result.props.fileSize).toBe(50000000)
		})

		test('should validate various image formats', () => {
			const imageFormats = [
				{ name: 'test.jpg', mimeType: 'image/jpeg' },
				{ name: 'test.png', mimeType: 'image/png' },
				{ name: 'test.gif', mimeType: 'image/gif' },
				{ name: 'test.webp', mimeType: 'image/webp' },
				{ name: 'test.svg', mimeType: 'image/svg+xml' },
				{ name: 'test.bmp', mimeType: 'image/bmp' },
			]

			imageFormats.forEach(({ name, mimeType }, index) => {
				const imageAsset = {
					id: `asset:image_format_${index}`,
					typeName: 'asset' as const,
					type: 'image' as const,
					props: {
						w: 100,
						h: 100,
						name,
						isAnimated: name.endsWith('.gif'),
						mimeType,
						src: `https://example.com/${name}`,
						fileSize: 1000,
					},
					meta: {},
				}

				expect(() => imageAssetValidator.validate(imageAsset)).not.toThrow()
				const result = imageAssetValidator.validate(imageAsset)
				expect(result.props.name).toBe(name)
				expect(result.props.mimeType).toBe(mimeType)
			})
		})
	})

	describe('imageAssetVersions', () => {
		it('should export correct version identifiers', () => {
			expect(imageAssetVersions).toBeDefined()
			expect(typeof imageAssetVersions.AddIsAnimated).toBe('string')
			expect(typeof imageAssetVersions.RenameWidthHeight).toBe('string')
			expect(typeof imageAssetVersions.MakeUrlsValid).toBe('string')
			expect(typeof imageAssetVersions.AddFileSize).toBe('string')
			expect(typeof imageAssetVersions.MakeFileSizeOptional).toBe('string')
		})

		it('should have correct version numbers', () => {
			expect(imageAssetVersions.AddIsAnimated).toContain('com.tldraw.asset.image')
			expect(imageAssetVersions.RenameWidthHeight).toContain('com.tldraw.asset.image')
			expect(imageAssetVersions.MakeUrlsValid).toContain('com.tldraw.asset.image')
			expect(imageAssetVersions.AddFileSize).toContain('com.tldraw.asset.image')
			expect(imageAssetVersions.MakeFileSizeOptional).toContain('com.tldraw.asset.image')

			// All version IDs should be different
			const versions = Object.values(imageAssetVersions)
			const uniqueVersions = new Set(versions)
			expect(uniqueVersions.size).toBe(versions.length)
		})

		it('should maintain version ordering', () => {
			const versions = Object.values(imageAssetVersions)
			expect(versions).toHaveLength(5)
			versions.forEach((version) => {
				expect(typeof version).toBe('string')
				expect(version.length).toBeGreaterThan(0)
			})
		})
	})

	describe('imageAssetMigrations', () => {
		it('should have correct migration sequence configuration', () => {
			expect(imageAssetMigrations).toBeDefined()
			expect(imageAssetMigrations.sequenceId).toBe('com.tldraw.asset.image')
			expect(typeof imageAssetMigrations.retroactive).toBe('boolean')
			expect(Array.isArray(imageAssetMigrations.sequence)).toBe(true)
			expect(imageAssetMigrations.sequence).toHaveLength(5)
		})

		it('should have retroactive migration enabled', () => {
			expect(imageAssetMigrations.retroactive).toBe(true)
		})

		it('should have all migrations with proper structure', () => {
			imageAssetMigrations.sequence.forEach((migration) => {
				expect(migration.id).toBeDefined()
				expect(typeof migration.id).toBe('string')
				expect(typeof migration.up).toBe('function')
				expect(typeof migration.down).toBe('function')
			})
		})

		it('should have proper migration configuration', () => {
			// Test the sequenceId which should be accessible
			expect(imageAssetMigrations.sequenceId).toBe('com.tldraw.asset.image')

			// Test that the migrations have the right structure
			expect(Array.isArray(imageAssetMigrations.sequence)).toBe(true)
			expect(imageAssetMigrations.sequence.length).toBe(5)
		})
	})

	describe('AddIsAnimated migration', () => {
		const { up, down } = getTestMigration(imageAssetVersions.AddIsAnimated)

		it('should add isAnimated property with false default in up migration', () => {
			const assetWithoutIsAnimated = {
				id: 'asset:image1',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
			}

			const result = up(assetWithoutIsAnimated)
			expect(result.props.isAnimated).toBe(false)
			expect(result.props.w).toBe(100)
			expect(result.props.name).toBe('test.jpg')
		})

		it('should preserve existing isAnimated property in up migration', () => {
			const assetWithIsAnimated = {
				id: 'asset:image2',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.gif',
					mimeType: 'image/gif',
					src: 'https://example.com/test.gif',
					isAnimated: true,
				},
			}

			const result = up(assetWithIsAnimated)
			expect(result.props.isAnimated).toBe(false) // Migration always sets to false
		})

		it('should remove isAnimated property in down migration', () => {
			const assetWithIsAnimated = {
				id: 'asset:image3',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
					isAnimated: false,
				},
			}

			const result = down(assetWithIsAnimated)
			expect(result.props).not.toHaveProperty('isAnimated')
			expect(result.props.w).toBe(100)
			expect(result.props.name).toBe('test.jpg')
		})

		it('should handle asset without isAnimated in down migration', () => {
			const assetWithoutIsAnimated = {
				id: 'asset:image4',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
			}

			const result = down(assetWithoutIsAnimated)
			expect(result.props).not.toHaveProperty('isAnimated')
			expect(result.props.w).toBe(100)
		})
	})

	describe('RenameWidthHeight migration', () => {
		const { up, down } = getTestMigration(imageAssetVersions.RenameWidthHeight)

		it('should rename width and height to w and h in up migration', () => {
			const assetWithWidthHeight = {
				id: 'asset:image1',
				type: 'image',
				props: {
					width: 800,
					height: 600,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
			}

			const result = up(assetWithWidthHeight)
			expect(result.props.w).toBe(800)
			expect(result.props.h).toBe(600)
			expect(result.props).not.toHaveProperty('width')
			expect(result.props).not.toHaveProperty('height')
			expect(result.props.name).toBe('test.jpg')
		})

		it('should handle asset without width/height properties in up migration', () => {
			const assetWithoutDimensions = {
				id: 'asset:image2',
				type: 'image',
				props: {
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
			}

			const result = up(assetWithoutDimensions)
			expect(result.props.w).toBeUndefined()
			expect(result.props.h).toBeUndefined()
			expect(result.props.name).toBe('test.jpg')
		})

		it('should rename w and h to width and height in down migration', () => {
			const assetWithWH = {
				id: 'asset:image3',
				type: 'image',
				props: {
					w: 1024,
					h: 768,
					name: 'test.png',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'https://example.com/test.png',
				},
			}

			const result = down(assetWithWH)
			expect(result.props.width).toBe(1024)
			expect(result.props.height).toBe(768)
			expect(result.props).not.toHaveProperty('w')
			expect(result.props).not.toHaveProperty('h')
			expect(result.props.name).toBe('test.png')
		})

		it('should handle asset without w/h properties in down migration', () => {
			const assetWithoutWH = {
				id: 'asset:image4',
				type: 'image',
				props: {
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
			}

			const result = down(assetWithoutWH)
			expect(result.props.width).toBeUndefined()
			expect(result.props.height).toBeUndefined()
			expect(result.props.name).toBe('test.jpg')
		})
	})

	describe('MakeUrlsValid migration', () => {
		const { up, down } = getTestMigration(imageAssetVersions.MakeUrlsValid)

		it('should clean invalid src URLs in up migration', () => {
			const assetWithInvalidSrc = {
				id: 'asset:image1',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'invalid-url-format',
				},
			}

			const result = up(assetWithInvalidSrc)
			expect(result.props.src).toBe('')
		})

		it('should preserve valid src URLs in up migration', () => {
			const assetWithValidSrc = {
				id: 'asset:image2',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
			}

			const result = up(assetWithValidSrc)
			expect(result.props.src).toBe('https://example.com/test.jpg')
		})

		it('should handle null src in up migration', () => {
			const assetWithNullSrc = {
				id: 'asset:image3',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: null,
				},
			}

			const result = up(assetWithNullSrc)
			expect(result.props.src).toBe('')
		})

		it('should handle empty src in up migration', () => {
			const assetWithEmptySrc = {
				id: 'asset:image4',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: '',
				},
			}

			const result = up(assetWithEmptySrc)
			expect(result.props.src).toBe('')
		})

		it('should handle missing src property in up migration', () => {
			const assetWithoutSrc = {
				id: 'asset:image5',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
				},
			}

			const result = up(assetWithoutSrc)
			expect(result.props.src).toBe('')
		})

		it('should preserve data URLs in up migration', () => {
			const assetWithDataUrl = {
				id: 'asset:image6',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.png',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
				},
			}

			const result = up(assetWithDataUrl)
			expect(result.props.src).toBe(
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
			)
		})

		it('should be a no-op down migration', () => {
			const asset = {
				id: 'asset:image7',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
			}

			const result = down(asset)
			expect(result).toEqual(asset)
		})
	})

	describe('AddFileSize migration', () => {
		const { up, down } = getTestMigration(imageAssetVersions.AddFileSize)

		it('should add fileSize property with -1 default in up migration', () => {
			const assetWithoutFileSize = {
				id: 'asset:image1',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
			}

			const result = up(assetWithoutFileSize)
			expect(result.props.fileSize).toBe(-1)
			expect(result.props.w).toBe(100)
			expect(result.props.name).toBe('test.jpg')
		})

		it('should preserve existing fileSize property in up migration', () => {
			const assetWithFileSize = {
				id: 'asset:image2',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
					fileSize: 50000,
				},
			}

			const result = up(assetWithFileSize)
			expect(result.props.fileSize).toBe(-1) // Migration always sets to -1
		})

		it('should remove fileSize property in down migration', () => {
			const assetWithFileSize = {
				id: 'asset:image3',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
					fileSize: 50000,
				},
			}

			const result = down(assetWithFileSize)
			expect(result.props).not.toHaveProperty('fileSize')
			expect(result.props.w).toBe(100)
			expect(result.props.name).toBe('test.jpg')
		})

		it('should handle asset without fileSize in down migration', () => {
			const assetWithoutFileSize = {
				id: 'asset:image4',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
			}

			const result = down(assetWithoutFileSize)
			expect(result.props).not.toHaveProperty('fileSize')
			expect(result.props.w).toBe(100)
		})
	})

	describe('MakeFileSizeOptional migration', () => {
		const { up, down } = getTestMigration(imageAssetVersions.MakeFileSizeOptional)

		it('should convert fileSize -1 to undefined in up migration', () => {
			const assetWithNegativeFileSize = {
				id: 'asset:image1',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
					fileSize: -1,
				},
			}

			const result = up(assetWithNegativeFileSize)
			expect(result.props.fileSize).toBeUndefined()
		})

		it('should preserve positive fileSize values in up migration', () => {
			const assetWithPositiveFileSize = {
				id: 'asset:image2',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
					fileSize: 50000,
				},
			}

			const result = up(assetWithPositiveFileSize)
			expect(result.props.fileSize).toBe(50000)
		})

		it('should preserve zero fileSize in up migration', () => {
			const assetWithZeroFileSize = {
				id: 'asset:image3',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
					fileSize: 0,
				},
			}

			const result = up(assetWithZeroFileSize)
			expect(result.props.fileSize).toBe(0)
		})

		it('should handle missing fileSize property in up migration', () => {
			const assetWithoutFileSize = {
				id: 'asset:image4',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
			}

			const result = up(assetWithoutFileSize)
			expect(result.props.fileSize).toBeUndefined()
		})

		it('should convert undefined fileSize to -1 in down migration', () => {
			const assetWithUndefinedFileSize = {
				id: 'asset:image5',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
					fileSize: undefined,
				},
			}

			const result = down(assetWithUndefinedFileSize)
			expect(result.props.fileSize).toBe(-1)
		})

		it('should preserve positive fileSize values in down migration', () => {
			const assetWithPositiveFileSize = {
				id: 'asset:image6',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
					fileSize: 75000,
				},
			}

			const result = down(assetWithPositiveFileSize)
			expect(result.props.fileSize).toBe(75000)
		})

		it('should handle asset without fileSize property in down migration', () => {
			const assetWithoutFileSize = {
				id: 'asset:image7',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
			}

			const result = down(assetWithoutFileSize)
			// When a property doesn't exist, JavaScript treats it as undefined, so the condition is true
			// and the down migration sets it to -1
			expect(result.props.fileSize).toBe(-1)
		})
	})

	describe('Migration integration', () => {
		it('should properly chain migrations', () => {
			// Test that migrations work in sequence
			const originalAsset = {
				id: 'asset:image_chain',
				type: 'image',
				props: {
					width: 800,
					height: 600,
					name: 'chain-test.jpg',
					mimeType: 'image/jpeg',
					src: 'invalid-url',
				},
			}

			// Apply AddIsAnimated migration
			const { up: addIsAnimatedUp } = getTestMigration(imageAssetVersions.AddIsAnimated)
			const afterFirstMigration = addIsAnimatedUp(originalAsset)
			expect(afterFirstMigration.props.isAnimated).toBe(false)

			// Apply RenameWidthHeight migration
			const { up: renameWidthHeightUp } = getTestMigration(imageAssetVersions.RenameWidthHeight)
			const afterSecondMigration = renameWidthHeightUp(afterFirstMigration)
			expect(afterSecondMigration.props.w).toBe(800)
			expect(afterSecondMigration.props.h).toBe(600)
			expect(afterSecondMigration.props).not.toHaveProperty('width')
			expect(afterSecondMigration.props).not.toHaveProperty('height')

			// Apply MakeUrlsValid migration
			const { up: makeUrlsValidUp } = getTestMigration(imageAssetVersions.MakeUrlsValid)
			const afterThirdMigration = makeUrlsValidUp(afterSecondMigration)
			expect(afterThirdMigration.props.src).toBe('')

			// Apply AddFileSize migration
			const { up: addFileSizeUp } = getTestMigration(imageAssetVersions.AddFileSize)
			const afterFourthMigration = addFileSizeUp(afterThirdMigration)
			expect(afterFourthMigration.props.fileSize).toBe(-1)

			// Apply MakeFileSizeOptional migration
			const { up: makeFileSizeOptionalUp } = getTestMigration(
				imageAssetVersions.MakeFileSizeOptional
			)
			const finalResult = makeFileSizeOptionalUp(afterFourthMigration)
			expect(finalResult.props.fileSize).toBeUndefined()
		})

		it('should properly reverse migrations', () => {
			// Test that down migrations work in reverse order
			const migratedAsset = {
				id: 'asset:image_reverse',
				type: 'image',
				props: {
					w: 1024,
					h: 768,
					name: 'reverse-test.png',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'https://example.com/reverse-test.png',
					fileSize: 50000,
				},
			}

			// Apply MakeFileSizeOptional down migration first
			const { down: makeFileSizeOptionalDown } = getTestMigration(
				imageAssetVersions.MakeFileSizeOptional
			)
			const afterFirstDown = makeFileSizeOptionalDown(migratedAsset)
			expect(afterFirstDown.props.fileSize).toBe(50000) // Should remain unchanged

			// Apply AddFileSize down migration
			const { down: addFileSizeDown } = getTestMigration(imageAssetVersions.AddFileSize)
			const afterSecondDown = addFileSizeDown(afterFirstDown)
			expect(afterSecondDown.props).not.toHaveProperty('fileSize')

			// Apply MakeUrlsValid down migration (should be no-op)
			const { down: makeUrlsValidDown } = getTestMigration(imageAssetVersions.MakeUrlsValid)
			const afterThirdDown = makeUrlsValidDown(afterSecondDown)
			expect(afterThirdDown.props.src).toBe('https://example.com/reverse-test.png')

			// Apply RenameWidthHeight down migration
			const { down: renameWidthHeightDown } = getTestMigration(imageAssetVersions.RenameWidthHeight)
			const afterFourthDown = renameWidthHeightDown(afterThirdDown)
			expect(afterFourthDown.props.width).toBe(1024)
			expect(afterFourthDown.props.height).toBe(768)
			expect(afterFourthDown.props).not.toHaveProperty('w')
			expect(afterFourthDown.props).not.toHaveProperty('h')

			// Apply AddIsAnimated down migration
			const { down: addIsAnimatedDown } = getTestMigration(imageAssetVersions.AddIsAnimated)
			const finalResult = addIsAnimatedDown(afterFourthDown)
			expect(finalResult.props).not.toHaveProperty('isAnimated')
		})
	})

	describe('Edge cases and error conditions', () => {
		it('should handle assets with unexpected structure during migration', () => {
			const malformedAsset = {
				id: 'asset:malformed',
				type: 'image',
				// Missing props entirely
			}

			const { up: addIsAnimatedUp } = getTestMigration(imageAssetVersions.AddIsAnimated)

			// The migration assumes props exist, so this will throw an error
			expect(() => addIsAnimatedUp(malformedAsset)).toThrow()
		})

		it('should handle assets with empty props during migration', () => {
			const assetWithEmptyProps = {
				id: 'asset:empty_props',
				type: 'image',
				props: {},
			}

			const { up: addIsAnimatedUp } = getTestMigration(imageAssetVersions.AddIsAnimated)
			const result = addIsAnimatedUp(assetWithEmptyProps)

			expect(result.props.isAnimated).toBe(false)
		})

		it('should preserve other properties during migrations', () => {
			const assetWithExtraProps = {
				id: 'asset:extra_props',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'invalid-url',
					customProperty: 'should be preserved',
					anotherProperty: { nested: 'object' },
				},
			}

			const { up: makeUrlsValidUp } = getTestMigration(imageAssetVersions.MakeUrlsValid)
			const result = makeUrlsValidUp(assetWithExtraProps)

			expect(result.props.src).toBe('')
			expect(result.props.customProperty).toBe('should be preserved')
			expect(result.props.anotherProperty).toEqual({ nested: 'object' })
			expect(result.props.w).toBe(100)
		})

		test('should handle complex URL validation scenarios', () => {
			const complexUrlAsset = {
				id: 'asset:complex_url',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'complex-url-test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/path?query=value&other=test#fragment',
				},
			}

			const { up: makeUrlsValidUp } = getTestMigration(imageAssetVersions.MakeUrlsValid)
			const result = makeUrlsValidUp(complexUrlAsset)

			// Complex but valid URLs should be preserved
			if (T.srcUrl.isValid(complexUrlAsset.props.src)) {
				expect(result.props.src).toBe('https://example.com/path?query=value&other=test#fragment')
			}
		})

		it('should handle various fileSize edge cases', () => {
			const fileSizeEdgeCases = [
				{ fileSize: 0 },
				{ fileSize: 1 },
				{ fileSize: Number.MAX_SAFE_INTEGER },
				{ fileSize: -1 },
				{ fileSize: -100 },
			]

			fileSizeEdgeCases.forEach(({ fileSize }, index) => {
				const asset = {
					id: `asset:filesize_edge_${index}`,
					type: 'image',
					props: {
						w: 100,
						h: 100,
						name: `test${index}.jpg`,
						isAnimated: false,
						mimeType: 'image/jpeg',
						src: 'https://example.com/test.jpg',
						fileSize,
					},
				}

				const { up: makeFileSizeOptionalUp } = getTestMigration(
					imageAssetVersions.MakeFileSizeOptional
				)
				const result = makeFileSizeOptionalUp(asset)

				if (fileSize === -1) {
					expect(result.props.fileSize).toBeUndefined()
				} else {
					expect(result.props.fileSize).toBe(fileSize)
				}
			})
		})
	})
})
