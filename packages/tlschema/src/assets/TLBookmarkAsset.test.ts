import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { bookmarkAssetVersions } from './TLBookmarkAsset'

describe('TLBookmarkAsset', () => {
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
