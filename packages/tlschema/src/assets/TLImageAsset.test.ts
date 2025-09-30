import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { imageAssetVersions } from './TLImageAsset'

describe('TLImageAsset', () => {
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
		const { up, down: _down } = getTestMigration(imageAssetVersions.MakeUrlsValid)

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
