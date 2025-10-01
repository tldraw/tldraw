import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import {
	assetMigrations,
	AssetRecordType,
	assetValidator,
	assetVersions,
	TLAssetId,
} from './TLAsset'

describe('TLAsset', () => {
	describe('assetValidator', () => {
		it('should validate different asset types using discriminated union', () => {
			const imageAsset = {
				id: 'asset:test_image',
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

			const videoAsset = {
				id: 'asset:test_video',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
				meta: {},
			}

			const bookmarkAsset = {
				id: 'asset:test_bookmark',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					title: 'Test Site',
					description: 'A test bookmark',
					image: 'https://example.com/image.png',
					favicon: 'https://example.com/favicon.ico',
					src: 'https://example.com',
				},
				meta: {},
			}

			expect(() => assetValidator.validate(imageAsset)).not.toThrow()
			expect(() => assetValidator.validate(videoAsset)).not.toThrow()
			expect(() => assetValidator.validate(bookmarkAsset)).not.toThrow()

			expect(assetValidator.validate(imageAsset).type).toBe('image')
			expect(assetValidator.validate(videoAsset).type).toBe('video')
			expect(assetValidator.validate(bookmarkAsset).type).toBe('bookmark')
		})

		it('should reject invalid asset types', () => {
			const invalidAsset = {
				id: 'asset:invalid',
				typeName: 'asset' as const,
				type: 'invalid_type' as any,
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
				},
				meta: {},
			}

			expect(() => assetValidator.validate(invalidAsset)).toThrow()
		})

		it('should require valid asset structure', () => {
			// Wrong typeName
			const wrongTypeName = {
				id: 'asset:wrong_typename',
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
			expect(() => assetValidator.validate(wrongTypeName)).toThrow()

			// Missing meta
			const noMeta = {
				id: 'asset:no_meta',
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
			}
			expect(() => assetValidator.validate(noMeta)).toThrow()

			// Wrong ID prefix
			const wrongId = {
				id: 'shape:wrong_prefix',
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
			expect(() => assetValidator.validate(wrongId)).toThrow()
		})
	})

	describe('assetMigrations', () => {
		it('should have correct migration structure', () => {
			expect(assetMigrations.sequenceId).toBe('com.tldraw.asset')
			expect(assetMigrations.sequence).toHaveLength(1)
			expect(assetMigrations.sequence[0].id).toBe(assetVersions.AddMeta)
		})
	})

	describe('AddMeta migration', () => {
		const { up } = getTestMigration(assetVersions.AddMeta)

		it('should add empty meta property', () => {
			const assetWithoutMeta = {
				id: 'asset:test',
				typeName: 'asset',
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

			const result = up(assetWithoutMeta)
			expect(result.meta).toEqual({})
			expect(result.props).toEqual(assetWithoutMeta.props)
		})

		it('should overwrite existing meta property', () => {
			const assetWithMeta = {
				id: 'asset:test',
				typeName: 'asset',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
				meta: { existing: 'data' },
			}

			const result = up(assetWithMeta)
			expect(result.meta).toEqual({}) // Migration always sets to empty object
		})

		it('should preserve other properties during migration', () => {
			const assetWithExtraProps = {
				id: 'asset:extra_props',
				typeName: 'asset',
				type: 'image',
				props: {
					w: 200,
					h: 150,
					name: 'extra.png',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'https://example.com/extra.png',
				},
				customProperty: 'should be preserved',
			}

			const result = up(assetWithExtraProps)
			expect(result.meta).toEqual({})
			expect(result.customProperty).toBe('should be preserved')
		})
	})

	describe('AssetRecordType', () => {
		it('should have correct configuration', () => {
			expect(AssetRecordType.typeName).toBe('asset')
			expect(AssetRecordType.scope).toBe('document')
			expect(AssetRecordType.validator).toBe(assetValidator)
		})

		it('should create records with default meta property', () => {
			const assetRecord = AssetRecordType.create({
				id: 'asset:test' as TLAssetId,
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
				},
			})

			expect(assetRecord.meta).toEqual({})
			expect(assetRecord.typeName).toBe('asset')
		})
	})
})
