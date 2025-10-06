import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { bookmarkShapeProps, bookmarkShapeVersions } from './TLBookmarkShape'

describe('TLBookmarkShape', () => {
	describe('bookmarkShapeProps validation', () => {
		it('should validate width as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			expect(() => bookmarkShapeProps.w.validate(0.1)).not.toThrow()
			expect(() => bookmarkShapeProps.w.validate(100)).not.toThrow()

			// Invalid: zero and negative
			expect(() => bookmarkShapeProps.w.validate(0)).toThrow()
			expect(() => bookmarkShapeProps.w.validate(-1)).toThrow()
		})

		it('should validate height as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			expect(() => bookmarkShapeProps.h.validate(0.1)).not.toThrow()
			expect(() => bookmarkShapeProps.h.validate(100)).not.toThrow()

			// Invalid: zero and negative
			expect(() => bookmarkShapeProps.h.validate(0)).toThrow()
			expect(() => bookmarkShapeProps.h.validate(-1)).toThrow()
		})

		it('should validate assetId as nullable asset ID', () => {
			// Valid asset IDs
			expect(() => bookmarkShapeProps.assetId.validate(null)).not.toThrow()
			expect(() => bookmarkShapeProps.assetId.validate('asset:bookmark123')).not.toThrow()

			// Invalid asset IDs
			expect(() => bookmarkShapeProps.assetId.validate('shape:notasset')).toThrow()
			expect(() => bookmarkShapeProps.assetId.validate('bookmark123')).toThrow()
			expect(() => bookmarkShapeProps.assetId.validate(undefined)).toThrow()
		})

		it('should validate url as linkUrl', () => {
			// Valid URLs
			expect(() => bookmarkShapeProps.url.validate('')).not.toThrow()
			expect(() => bookmarkShapeProps.url.validate('https://example.com')).not.toThrow()

			// Invalid URLs
			expect(() => bookmarkShapeProps.url.validate('not-a-url')).toThrow()
			expect(() => bookmarkShapeProps.url.validate('javascript:alert("xss")')).toThrow()
		})
	})

	describe('NullAssetId migration', () => {
		const { up, down } = getTestMigration(bookmarkShapeVersions.NullAssetId)

		it('should add assetId as null when undefined', () => {
			const oldRecord = {
				props: {
					w: 300,
					h: 320,
					url: 'https://example.com',
					// assetId undefined
				},
			}

			const result = up(oldRecord)
			expect(result.props.assetId).toBeNull()
		})

		it('should preserve existing assetId when present', () => {
			const oldRecord = {
				props: {
					w: 300,
					h: 320,
					url: 'https://example.com',
					assetId: 'asset:existing123',
				},
			}

			const result = up(oldRecord)
			expect(result.props.assetId).toBe('asset:existing123')
		})

		it('should throw on retired down migration', () => {
			expect(() => down({})).toThrow()
		})
	})

	describe('MakeUrlsValid migration', () => {
		const { up, down } = getTestMigration(bookmarkShapeVersions.MakeUrlsValid)

		it('should set invalid URLs to empty string', () => {
			const oldRecord = {
				props: {
					w: 300,
					h: 320,
					assetId: null,
					url: 'not-a-valid-url',
				},
			}

			const result = up(oldRecord)
			expect(result.props.url).toBe('')
		})

		it('should preserve valid URLs', () => {
			const oldRecord = {
				props: {
					w: 300,
					h: 320,
					assetId: null,
					url: 'https://example.com',
				},
			}

			const result = up(oldRecord)
			expect(result.props.url).toBe('https://example.com')
		})

		it('should be noop for down migration', () => {
			const newRecord = { props: { url: 'https://example.com' } }
			const result = down(newRecord)
			expect(result).toEqual(newRecord)
		})
	})
})
