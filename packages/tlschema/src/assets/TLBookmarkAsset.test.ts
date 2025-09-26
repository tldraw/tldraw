import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { bookmarkAssetValidator, bookmarkAssetVersions } from './TLBookmarkAsset'

describe('TLBookmarkAsset', () => {
	describe('bookmarkAssetValidator', () => {
		it('should validate a complete bookmark asset', () => {
			const validBookmarkAsset = {
				id: 'asset:bookmark_valid',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					title: 'Valid Bookmark',
					description: 'This is a valid bookmark asset',
					image: 'https://example.com/image.jpg',
					favicon: 'https://example.com/favicon.ico',
					src: 'https://example.com',
				},
				meta: {
					dateAdded: '2023-12-01T10:00:00Z',
					addedBy: 'user456',
				},
			}

			expect(() => bookmarkAssetValidator.validate(validBookmarkAsset)).not.toThrow()
			const result = bookmarkAssetValidator.validate(validBookmarkAsset)
			expect(result.id).toBe('asset:bookmark_valid')
			expect(result.type).toBe('bookmark')
			expect(result.props.title).toBe('Valid Bookmark')
			expect(result.props.src).toBe('https://example.com')
		})

		it('should validate bookmark asset with null src', () => {
			const bookmarkWithNullSrc = {
				id: 'asset:bookmark_null_src',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					title: 'Bookmark Without Source',
					description: 'Failed to load source URL',
					image: '',
					favicon: '',
					src: null,
				},
				meta: {},
			}

			expect(() => bookmarkAssetValidator.validate(bookmarkWithNullSrc)).not.toThrow()
			const result = bookmarkAssetValidator.validate(bookmarkWithNullSrc)
			expect(result.props.src).toBeNull()
		})

		it('should reject invalid asset ID format', () => {
			const invalidIdAsset = {
				id: 'shape:invalid_id',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					title: 'Test',
					description: 'Test',
					image: '',
					favicon: '',
					src: 'https://example.com',
				},
				meta: {},
			}

			expect(() => bookmarkAssetValidator.validate(invalidIdAsset)).toThrow(
				'asset ID must start with "asset:"'
			)
		})

		it('should reject missing required props', () => {
			const missingTitleAsset = {
				id: 'asset:bookmark123',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					description: 'Test description',
					image: '',
					favicon: '',
					src: 'https://example.com',
				},
				meta: {},
			}

			expect(() => bookmarkAssetValidator.validate(missingTitleAsset)).toThrow()
		})

		it('should reject invalid src URL types (not string or null)', () => {
			const invalidSrcTypeAsset = {
				id: 'asset:bookmark123',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					title: 'Test',
					description: 'Test',
					image: '',
					favicon: '',
					src: 123,
				},
				meta: {},
			}

			expect(() => bookmarkAssetValidator.validate(invalidSrcTypeAsset)).toThrow()
		})
	})

	describe('MakeUrlsValid migration', () => {
		const { up, down } = getTestMigration(bookmarkAssetVersions.MakeUrlsValid)

		it('should clean invalid src URLs and preserve valid ones', () => {
			const assetWithInvalidSrc = {
				id: 'asset:bookmark1',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: 'invalid-url-format',
				},
			}

			const result = up(assetWithInvalidSrc)
			expect(result.props.src).toBe('')

			// Test valid URL is preserved
			const assetWithValidSrc = {
				...assetWithInvalidSrc,
				props: { ...assetWithInvalidSrc.props, src: 'https://example.com' },
			}
			const validResult = up(assetWithValidSrc)
			expect(validResult.props.src).toBe('https://example.com')
		})

		it('should be a no-op down migration', () => {
			const asset = {
				id: 'asset:bookmark1',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: 'https://example.com',
				},
			}

			const result = down(asset)
			expect(result).toEqual(asset)
		})
	})

	describe('AddFavicon migration', () => {
		const { up, down } = getTestMigration(bookmarkAssetVersions.AddFavicon)

		it('should add favicon property and clean invalid URLs', () => {
			// Test adding favicon property to asset without one
			const assetWithoutFavicon = {
				id: 'asset:bookmark1',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: 'https://example.com',
				},
			}

			const result = up(assetWithoutFavicon)
			expect(result.props.favicon).toBe('')

			// Test cleaning invalid favicon URL
			const assetWithInvalidFavicon = {
				...assetWithoutFavicon,
				props: { ...assetWithoutFavicon.props, favicon: 'invalid-url' },
			}
			const cleanResult = up(assetWithInvalidFavicon)
			expect(cleanResult.props.favicon).toBe('')
		})

		it('should remove favicon property in down migration', () => {
			const assetWithFavicon = {
				id: 'asset:bookmark1',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: 'https://example.com',
					favicon: 'https://example.com/favicon.ico',
				},
			}

			const result = down(assetWithFavicon)
			expect(result.props).not.toHaveProperty('favicon')
			expect(result.props.title).toBe('Test Bookmark')
		})
	})
})
