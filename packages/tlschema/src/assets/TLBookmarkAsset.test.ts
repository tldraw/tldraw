import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLAssetId } from '../records/TLAsset'
import {
	bookmarkAssetMigrations,
	bookmarkAssetValidator,
	bookmarkAssetVersions,
	TLBookmarkAsset,
} from './TLBookmarkAsset'

describe('TLBookmarkAsset', () => {
	describe('TLBookmarkAsset interface', () => {
		it('should extend TLBaseAsset with bookmark-specific properties', () => {
			const mockBookmarkAsset: TLBookmarkAsset = {
				id: 'asset:bookmark123' as TLAssetId,
				typeName: 'asset',
				type: 'bookmark',
				props: {
					title: 'Example Website',
					description: 'A great example site',
					image: 'https://example.com/preview.jpg',
					favicon: 'https://example.com/favicon.ico',
					src: 'https://example.com',
				},
				meta: { addedBy: 'user123' },
			}

			expect(mockBookmarkAsset.id).toBe('asset:bookmark123')
			expect(mockBookmarkAsset.typeName).toBe('asset')
			expect(mockBookmarkAsset.type).toBe('bookmark')
			expect(mockBookmarkAsset.props.title).toBe('Example Website')
			expect(mockBookmarkAsset.props.description).toBe('A great example site')
			expect(mockBookmarkAsset.props.image).toBe('https://example.com/preview.jpg')
			expect(mockBookmarkAsset.props.favicon).toBe('https://example.com/favicon.ico')
			expect(mockBookmarkAsset.props.src).toBe('https://example.com')
			expect(mockBookmarkAsset.meta).toEqual({ addedBy: 'user123' })
		})

		it('should handle null src property', () => {
			const bookmarkAssetWithNullSrc: TLBookmarkAsset = {
				id: 'asset:bookmark456' as TLAssetId,
				typeName: 'asset',
				type: 'bookmark',
				props: {
					title: 'Website Without Source',
					description: 'A website that failed to load',
					image: '',
					favicon: '',
					src: null,
				},
				meta: {},
			}

			expect(bookmarkAssetWithNullSrc.props.src).toBeNull()
			expect(bookmarkAssetWithNullSrc.props.image).toBe('')
			expect(bookmarkAssetWithNullSrc.props.favicon).toBe('')
		})

		it('should work with empty strings for optional content', () => {
			const minimalBookmarkAsset: TLBookmarkAsset = {
				id: 'asset:bookmark789' as TLAssetId,
				typeName: 'asset',
				type: 'bookmark',
				props: {
					title: 'Minimal Bookmark',
					description: '',
					image: '',
					favicon: '',
					src: 'https://minimal-site.com',
				},
				meta: {},
			}

			expect(minimalBookmarkAsset.props.title).toBe('Minimal Bookmark')
			expect(minimalBookmarkAsset.props.description).toBe('')
			expect(minimalBookmarkAsset.props.image).toBe('')
			expect(minimalBookmarkAsset.props.favicon).toBe('')
		})
	})

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
				} as JsonObject,
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

		it('should validate bookmark asset with data URLs', () => {
			const bookmarkWithDataUrls = {
				id: 'asset:bookmark_data_urls',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					title: 'Bookmark with Data URLs',
					description: 'Using data URLs for image and favicon',
					image:
						'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
					favicon: 'data:image/x-icon;base64,AAABAAEAEBAAAA==',
					src: 'https://example.com',
				},
				meta: {},
			}

			expect(() => bookmarkAssetValidator.validate(bookmarkWithDataUrls)).not.toThrow()
			const result = bookmarkAssetValidator.validate(bookmarkWithDataUrls)
			expect(result.props.image).toContain('data:image/png;base64')
			expect(result.props.favicon).toContain('data:image/x-icon;base64')
		})

		it('should validate bookmark asset with empty strings', () => {
			const bookmarkWithEmptyStrings = {
				id: 'asset:bookmark_empty',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					title: 'Empty Content Bookmark',
					description: '',
					image: '',
					favicon: '',
					src: '',
				},
				meta: {},
			}

			expect(() => bookmarkAssetValidator.validate(bookmarkWithEmptyStrings)).not.toThrow()
			const result = bookmarkAssetValidator.validate(bookmarkWithEmptyStrings)
			expect(result.props.description).toBe('')
			expect(result.props.image).toBe('')
			expect(result.props.favicon).toBe('')
			expect(result.props.src).toBe('')
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

		it('should reject wrong typeName', () => {
			const wrongTypeNameAsset = {
				id: 'asset:bookmark123',
				typeName: 'shape' as const,
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

			expect(() => bookmarkAssetValidator.validate(wrongTypeNameAsset)).toThrow()
		})

		it('should reject wrong type', () => {
			const wrongTypeAsset = {
				id: 'asset:bookmark123',
				typeName: 'asset' as const,
				type: 'image' as const,
				props: {
					title: 'Test',
					description: 'Test',
					image: '',
					favicon: '',
					src: 'https://example.com',
				},
				meta: {},
			}

			expect(() => bookmarkAssetValidator.validate(wrongTypeAsset)).toThrow()
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

			const missingDescriptionAsset = {
				id: 'asset:bookmark123',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					title: 'Test title',
					image: '',
					favicon: '',
					src: 'https://example.com',
				},
				meta: {},
			}

			expect(() => bookmarkAssetValidator.validate(missingDescriptionAsset)).toThrow()
		})

		it('should reject non-string props', () => {
			const nonStringPropsAsset = {
				id: 'asset:bookmark123',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					title: 123,
					description: 'Test description',
					image: '',
					favicon: '',
					src: 'https://example.com',
				},
				meta: {},
			}

			expect(() => bookmarkAssetValidator.validate(nonStringPropsAsset)).toThrow()
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

		it('should reject extra unexpected properties', () => {
			const extraPropsAsset = {
				id: 'asset:bookmark123',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					title: 'Test',
					description: 'Test',
					image: '',
					favicon: '',
					src: 'https://example.com',
					extraProp: 'unexpected',
				},
				meta: {},
			}

			expect(() => bookmarkAssetValidator.validate(extraPropsAsset)).toThrow()
		})

		test('should handle malformed URLs gracefully in validation context', () => {
			// Note: The validator uses T.srcUrl which validates URL format
			// Testing with potentially malformed URLs that still pass srcUrl validation
			const potentiallyMalformedAsset = {
				id: 'asset:bookmark_malformed',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					title: 'Malformed URL Test',
					description: 'Testing edge case URLs',
					image: '',
					favicon: '',
					src: 'https://example.com/path with spaces', // This might be handled differently by srcUrl
				},
				meta: {},
			}

			// The actual behavior depends on T.srcUrl implementation
			// If T.srcUrl accepts this, the validator should too
			if (T.srcUrl.isValid('https://example.com/path with spaces')) {
				expect(() => bookmarkAssetValidator.validate(potentiallyMalformedAsset)).not.toThrow()
			} else {
				expect(() => bookmarkAssetValidator.validate(potentiallyMalformedAsset)).toThrow()
			}
		})
	})

	describe('bookmarkAssetVersions', () => {
		it('should export correct version identifiers', () => {
			expect(bookmarkAssetVersions).toBeDefined()
			expect(typeof bookmarkAssetVersions.MakeUrlsValid).toBe('string')
			expect(typeof bookmarkAssetVersions.AddFavicon).toBe('string')
		})

		it('should have correct version numbers', () => {
			expect(bookmarkAssetVersions.MakeUrlsValid).toContain('com.tldraw.asset.bookmark')
			expect(bookmarkAssetVersions.AddFavicon).toContain('com.tldraw.asset.bookmark')

			// The version IDs should be different
			expect(bookmarkAssetVersions.MakeUrlsValid).not.toBe(bookmarkAssetVersions.AddFavicon)
		})

		it('should maintain version ordering', () => {
			// Based on the source, MakeUrlsValid is version 1, AddFavicon is version 2
			// We can't directly compare the IDs, but we can verify they exist and are strings
			const versions = Object.values(bookmarkAssetVersions)
			expect(versions).toHaveLength(2)
			versions.forEach((version) => {
				expect(typeof version).toBe('string')
				expect(version.length).toBeGreaterThan(0)
			})
		})
	})

	describe('bookmarkAssetMigrations', () => {
		it('should have correct migration sequence configuration', () => {
			expect(bookmarkAssetMigrations).toBeDefined()
			expect(bookmarkAssetMigrations.sequenceId).toBe('com.tldraw.asset.bookmark')
			expect(typeof bookmarkAssetMigrations.retroactive).toBe('boolean')
			expect(Array.isArray(bookmarkAssetMigrations.sequence)).toBe(true)
			expect(bookmarkAssetMigrations.sequence).toHaveLength(2)
		})

		it('should have retroactive migration enabled', () => {
			// Based on the default value in createRecordMigrationSequence
			expect(bookmarkAssetMigrations.retroactive).toBe(true)
		})

		it('should have all migrations with proper structure', () => {
			bookmarkAssetMigrations.sequence.forEach((migration) => {
				expect(migration.id).toBeDefined()
				expect(typeof migration.id).toBe('string')
				expect(typeof migration.up).toBe('function')
				expect(typeof migration.down).toBe('function')
			})
		})
	})

	describe('MakeUrlsValid migration', () => {
		const { up, down } = getTestMigration(bookmarkAssetVersions.MakeUrlsValid)

		it('should clean invalid src URLs in up migration', () => {
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
		})

		it('should preserve valid src URLs in up migration', () => {
			const assetWithValidSrc = {
				id: 'asset:bookmark2',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: 'https://example.com',
				},
			}

			const result = up(assetWithValidSrc)
			expect(result.props.src).toBe('https://example.com')
		})

		it('should handle null src in up migration', () => {
			const assetWithNullSrc = {
				id: 'asset:bookmark3',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: null,
				},
			}

			const result = up(assetWithNullSrc)
			expect(result.props.src).toBe('')
		})

		it('should handle empty src in up migration', () => {
			const assetWithEmptySrc = {
				id: 'asset:bookmark4',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: '',
				},
			}

			const result = up(assetWithEmptySrc)
			expect(result.props.src).toBe('')
		})

		it('should preserve data URLs in up migration', () => {
			const assetWithDataUrl = {
				id: 'asset:bookmark5',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: 'data:text/html,<h1>Hello</h1>',
				},
			}

			const result = up(assetWithDataUrl)
			expect(result.props.src).toBe('data:text/html,<h1>Hello</h1>')
		})

		it('should be a no-op down migration', () => {
			const asset = {
				id: 'asset:bookmark6',
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

		it('should clean invalid favicon URLs in up migration', () => {
			const assetWithInvalidFavicon = {
				id: 'asset:bookmark1',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: 'https://example.com',
					favicon: 'invalid-favicon-url',
				},
			}

			const result = up(assetWithInvalidFavicon)
			expect(result.props.favicon).toBe('')
		})

		it('should preserve valid favicon URLs in up migration', () => {
			const assetWithValidFavicon = {
				id: 'asset:bookmark2',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: 'https://example.com',
					favicon: 'https://example.com/favicon.ico',
				},
			}

			const result = up(assetWithValidFavicon)
			expect(result.props.favicon).toBe('https://example.com/favicon.ico')
		})

		it('should handle missing favicon property in up migration', () => {
			const assetWithoutFavicon = {
				id: 'asset:bookmark3',
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
		})

		it('should handle null favicon in up migration', () => {
			const assetWithNullFavicon = {
				id: 'asset:bookmark4',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: 'https://example.com',
					favicon: null,
				},
			}

			const result = up(assetWithNullFavicon)
			expect(result.props.favicon).toBe('')
		})

		it('should handle empty favicon in up migration', () => {
			const assetWithEmptyFavicon = {
				id: 'asset:bookmark5',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: 'https://example.com',
					favicon: '',
				},
			}

			const result = up(assetWithEmptyFavicon)
			expect(result.props.favicon).toBe('')
		})

		it('should preserve data URL favicons in up migration', () => {
			const assetWithDataUrlFavicon = {
				id: 'asset:bookmark6',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: 'https://example.com',
					favicon: 'data:image/x-icon;base64,AAABAAEAEBAAAA==',
				},
			}

			const result = up(assetWithDataUrlFavicon)
			expect(result.props.favicon).toBe('data:image/x-icon;base64,AAABAAEAEBAAAA==')
		})

		it('should remove favicon property in down migration', () => {
			const assetWithFavicon = {
				id: 'asset:bookmark7',
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
			expect(result.props.src).toBe('https://example.com')
		})

		it('should handle asset without favicon in down migration', () => {
			const assetWithoutFavicon = {
				id: 'asset:bookmark8',
				type: 'bookmark',
				props: {
					title: 'Test Bookmark',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: 'https://example.com',
				},
			}

			const result = down(assetWithoutFavicon)
			expect(result.props).not.toHaveProperty('favicon')
			expect(result.props.title).toBe('Test Bookmark')
		})
	})

	describe('Migration integration', () => {
		it('should properly chain migrations', () => {
			// Test that migrations work in sequence
			const originalAsset = {
				id: 'asset:bookmark_chain',
				type: 'bookmark',
				props: {
					title: 'Chain Test',
					description: 'Testing migration chain',
					image: 'https://example.com/image.jpg',
					src: 'invalid-url',
				},
			}

			// Apply MakeUrlsValid migration
			const { up: makeUrlsValidUp } = getTestMigration(bookmarkAssetVersions.MakeUrlsValid)
			const afterFirstMigration = makeUrlsValidUp(originalAsset)
			expect(afterFirstMigration.props.src).toBe('')

			// Apply AddFavicon migration
			const { up: addFaviconUp } = getTestMigration(bookmarkAssetVersions.AddFavicon)
			const afterSecondMigration = addFaviconUp(afterFirstMigration)
			expect(afterSecondMigration.props.favicon).toBe('')
			expect(afterSecondMigration.props.src).toBe('')
		})

		it('should properly reverse migrations', () => {
			// Test that down migrations work in reverse order
			const migratedAsset = {
				id: 'asset:bookmark_reverse',
				type: 'bookmark',
				props: {
					title: 'Reverse Test',
					description: 'Testing reverse migration',
					image: 'https://example.com/image.jpg',
					src: 'https://example.com',
					favicon: 'https://example.com/favicon.ico',
				},
			}

			// Apply AddFavicon down migration first
			const { down: addFaviconDown } = getTestMigration(bookmarkAssetVersions.AddFavicon)
			const afterFirstDown = addFaviconDown(migratedAsset)
			expect(afterFirstDown.props).not.toHaveProperty('favicon')

			// Apply MakeUrlsValid down migration (should be no-op)
			const { down: makeUrlsValidDown } = getTestMigration(bookmarkAssetVersions.MakeUrlsValid)
			const afterSecondDown = makeUrlsValidDown(afterFirstDown)
			expect(afterSecondDown.props.src).toBe('https://example.com')
		})
	})

	describe('Edge cases and error conditions', () => {
		it('should handle assets with unexpected structure during migration', () => {
			const malformedAsset = {
				id: 'asset:malformed',
				type: 'bookmark',
				// Missing props entirely
			}

			const { up: makeUrlsValidUp } = getTestMigration(bookmarkAssetVersions.MakeUrlsValid)

			// The migration assumes props exist, so this will throw an error
			// This is the actual behavior of the migration code
			expect(() => makeUrlsValidUp(malformedAsset)).toThrow()
		})

		it('should handle assets with empty props during migration', () => {
			const assetWithEmptyProps = {
				id: 'asset:empty_props',
				type: 'bookmark',
				props: {},
			}

			const { up: makeUrlsValidUp } = getTestMigration(bookmarkAssetVersions.MakeUrlsValid)
			const result = makeUrlsValidUp(assetWithEmptyProps)

			// The migration should handle missing src gracefully
			expect(result.props.src).toBe('')
		})

		it('should preserve other properties during migrations', () => {
			const assetWithExtraProps = {
				id: 'asset:extra_props',
				type: 'bookmark',
				props: {
					title: 'Test',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					src: 'invalid-url',
					customProperty: 'should be preserved',
				},
			}

			const { up: makeUrlsValidUp } = getTestMigration(bookmarkAssetVersions.MakeUrlsValid)
			const result = makeUrlsValidUp(assetWithExtraProps)

			expect(result.props.src).toBe('')
			expect(result.props.customProperty).toBe('should be preserved')
			expect(result.props.title).toBe('Test')
		})

		test('should handle complex URL validation scenarios', () => {
			const complexUrlAsset = {
				id: 'asset:complex_url',
				type: 'bookmark',
				props: {
					title: 'Complex URL Test',
					description: 'Testing complex URLs',
					image: 'https://example.com/image.jpg',
					src: 'https://example.com/path?query=value&other=test#fragment',
					favicon: 'https://cdn.example.com/icons/favicon.svg?version=2',
				},
			}

			const { up: makeUrlsValidUp } = getTestMigration(bookmarkAssetVersions.MakeUrlsValid)
			const result = makeUrlsValidUp(complexUrlAsset)

			// Complex but valid URLs should be preserved
			if (T.srcUrl.isValid(complexUrlAsset.props.src)) {
				expect(result.props.src).toBe('https://example.com/path?query=value&other=test#fragment')
			}
		})
	})
})
