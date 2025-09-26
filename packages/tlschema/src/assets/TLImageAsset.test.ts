import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { imageAssetValidator, imageAssetVersions } from './TLImageAsset'

describe('TLImageAsset', () => {
	describe('imageAssetValidator', () => {
		it('should validate a valid image asset', () => {
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
				meta: {},
			}

			expect(() => imageAssetValidator.validate(validImageAsset)).not.toThrow()
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

			expect(() => imageAssetValidator.validate(invalidIdAsset)).toThrow()
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
		})
	})

	describe('AddIsAnimated migration', () => {
		const { up, down } = getTestMigration(imageAssetVersions.AddIsAnimated)

		it('should add isAnimated property in up migration', () => {
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
	})
})
