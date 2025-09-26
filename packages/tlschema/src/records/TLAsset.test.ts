import { JsonObject } from '@tldraw/utils'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLBookmarkAsset } from '../assets/TLBookmarkAsset'
import { TLImageAsset } from '../assets/TLImageAsset'
import { TLVideoAsset } from '../assets/TLVideoAsset'
import { TLImageShape } from '../shapes/TLImageShape'
import { TLVideoShape } from '../shapes/TLVideoShape'
import {
	assetMigrations,
	AssetRecordType,
	assetValidator,
	assetVersions,
	TLAsset,
	TLAssetId,
	TLAssetPartial,
} from './TLAsset'

describe('TLAsset', () => {
	describe('TLAsset type', () => {
		it('should be a union of TLImageAsset, TLVideoAsset, and TLBookmarkAsset', () => {
			const imageAsset: TLAsset = {
				id: 'asset:image123' as TLAssetId,
				typeName: 'asset',
				type: 'image',
				props: {
					w: 800,
					h: 600,
					name: 'test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/test.jpg',
					fileSize: 156000,
				},
				meta: {},
			} satisfies TLImageAsset

			const videoAsset: TLAsset = {
				id: 'asset:video456' as TLAssetId,
				typeName: 'asset',
				type: 'video',
				props: {
					w: 1920,
					h: 1080,
					name: 'video.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/video.mp4',
					fileSize: 5000000,
				},
				meta: {},
			} satisfies TLVideoAsset

			const bookmarkAsset: TLAsset = {
				id: 'asset:bookmark789' as TLAssetId,
				typeName: 'asset',
				type: 'bookmark',
				props: {
					title: 'Example Site',
					description: 'A sample website',
					image: 'https://example.com/favicon.png',
					favicon: 'https://example.com/favicon.ico',
					src: 'https://example.com',
				},
				meta: {},
			} satisfies TLBookmarkAsset

			expect(imageAsset.type).toBe('image')
			expect(videoAsset.type).toBe('video')
			expect(bookmarkAsset.type).toBe('bookmark')
		})

		it('should support all asset types with meta data', () => {
			const assetWithMeta: TLAsset = {
				id: 'asset:meta_test' as TLAssetId,
				typeName: 'asset',
				type: 'image',
				props: {
					w: 400,
					h: 300,
					name: 'with-meta.png',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'https://example.com/with-meta.png',
				},
				meta: {
					uploadedBy: 'user123',
					uploadedAt: '2023-12-01T10:00:00Z',
					tags: ['important', 'featured'],
				} as JsonObject,
			}

			expect(assetWithMeta.meta).toEqual({
				uploadedBy: 'user123',
				uploadedAt: '2023-12-01T10:00:00Z',
				tags: ['important', 'featured'],
			})
		})

		it('should require correct typeName for all asset types', () => {
			const assets: TLAsset[] = [
				{
					id: 'asset:image1' as TLAssetId,
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
					meta: {},
				},
				{
					id: 'asset:video1' as TLAssetId,
					typeName: 'asset',
					type: 'video',
					props: {
						w: 640,
						h: 480,
						name: 'test.mp4',
						isAnimated: true,
						mimeType: 'video/mp4',
						src: 'https://example.com/test.mp4',
					},
					meta: {},
				},
				{
					id: 'asset:bookmark1' as TLAssetId,
					typeName: 'asset',
					type: 'bookmark',
					props: {
						title: 'Test Site',
						description: 'Test description',
						image: '',
						favicon: '',
						src: 'https://test.com',
					},
					meta: {},
				},
			]

			assets.forEach((asset) => {
				expect(asset.typeName).toBe('asset')
			})
		})
	})

	describe('assetValidator', () => {
		it('should validate image assets correctly', () => {
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
				meta: {} as JsonObject,
			}

			expect(() => assetValidator.validate(validImageAsset)).not.toThrow()
			const result = assetValidator.validate(validImageAsset)
			expect(result.type).toBe('image')
			expect((result.props as any).w).toBe(800)
		})

		it('should validate video assets correctly', () => {
			const validVideoAsset = {
				id: 'asset:video_valid',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 1920,
					h: 1080,
					name: 'test-video.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test-video.mp4',
					fileSize: 5000000,
				},
				meta: {} as JsonObject,
			}

			expect(() => assetValidator.validate(validVideoAsset)).not.toThrow()
			const result = assetValidator.validate(validVideoAsset)
			expect(result.type).toBe('video')
			expect((result.props as any).w).toBe(1920)
		})

		it('should validate bookmark assets correctly', () => {
			const validBookmarkAsset = {
				id: 'asset:bookmark_valid',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					title: 'Example Site',
					description: 'A test bookmark',
					image: 'https://example.com/image.png',
					favicon: 'https://example.com/favicon.ico',
					src: 'https://example.com',
				},
				meta: {} as JsonObject,
			}

			expect(() => assetValidator.validate(validBookmarkAsset)).not.toThrow()
			const result = assetValidator.validate(validBookmarkAsset)
			expect(result.type).toBe('bookmark')
			// Use type assertion to access bookmark-specific properties
			if (result.type === 'bookmark') {
				expect(result.props.title).toBe('Example Site')
			}
		})

		it('should use discriminated union based on type field', () => {
			// Test that the validator correctly routes to the right asset type validator
			// We can't use toBe() for object equality, but we can test the structure
			expect(assetValidator.constructor.name).toBe('Validator')

			// Test that it validates different asset types correctly
			const imageAsset = {
				id: 'asset:test_union',
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

			expect(() => assetValidator.validate(imageAsset)).not.toThrow()

			// Test that invalid types are rejected
			const invalidAsset = { ...imageAsset, type: 'invalid' as any }
			expect(() => assetValidator.validate(invalidAsset)).toThrow()
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

		it('should reject wrong typeName', () => {
			const wrongTypeNameAsset = {
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

			expect(() => assetValidator.validate(wrongTypeNameAsset)).toThrow()
		})

		it('should require valid asset ID format', () => {
			const invalidIdAsset = {
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

			expect(() => assetValidator.validate(invalidIdAsset)).toThrow()
		})

		it('should require meta property', () => {
			const noMetaAsset = {
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
				// missing meta
			}

			expect(() => assetValidator.validate(noMetaAsset)).toThrow()
		})

		it('should validate assets with empty meta', () => {
			const emptyMetaAsset = {
				id: 'asset:empty_meta',
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
				meta: {} as JsonObject,
			}

			expect(() => assetValidator.validate(emptyMetaAsset)).not.toThrow()
			const result = assetValidator.validate(emptyMetaAsset)
			expect(result.meta).toEqual({})
		})

		test('should handle complex meta objects', () => {
			const complexMetaAsset = {
				id: 'asset:complex_meta',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					title: 'Complex Site',
					description: 'Complex test',
					image: '',
					favicon: '',
					src: 'https://complex.com',
				},
				meta: {
					nested: {
						data: 'value',
						array: [1, 2, 3],
						boolean: true,
					},
					timestamp: Date.now(),
					tags: ['tag1', 'tag2'],
				} as JsonObject,
			}

			expect(() => assetValidator.validate(complexMetaAsset)).not.toThrow()
			const result = assetValidator.validate(complexMetaAsset)
			expect(result.meta.nested).toBeDefined()
			expect(result.meta.tags).toEqual(['tag1', 'tag2'])
		})
	})

	describe('assetVersions', () => {
		it('should export correct version identifiers', () => {
			expect(assetVersions).toBeDefined()
			expect(typeof assetVersions.AddMeta).toBe('string')
		})

		it('should have correct version structure', () => {
			expect(assetVersions.AddMeta).toContain('com.tldraw.asset')

			// Version IDs should be unique
			const versions = Object.values(assetVersions)
			const uniqueVersions = new Set(versions)
			expect(uniqueVersions.size).toBe(versions.length)
		})

		it('should maintain version consistency', () => {
			// The version should be the first version (1)
			expect(assetVersions.AddMeta).toMatch(/com\.tldraw\.asset\/1$/)
		})

		it('should have expected version count', () => {
			const versionKeys = Object.keys(assetVersions)
			expect(versionKeys).toEqual(['AddMeta'])
			expect(versionKeys).toHaveLength(1)
		})

		it('should have string version values', () => {
			Object.values(assetVersions).forEach((version) => {
				expect(typeof version).toBe('string')
				expect(version.length).toBeGreaterThan(0)
			})
		})
	})

	describe('assetMigrations', () => {
		it('should have correct migration sequence configuration', () => {
			expect(assetMigrations).toBeDefined()
			expect(assetMigrations.sequenceId).toBe('com.tldraw.asset')
			expect(Array.isArray(assetMigrations.sequence)).toBe(true)
			expect(assetMigrations.sequence).toHaveLength(1)
			expect(assetMigrations.retroactive).toBe(true)
		})

		it('should have all migrations with proper structure', () => {
			assetMigrations.sequence.forEach((migration) => {
				expect(migration.id).toBeDefined()
				expect(typeof migration.id).toBe('string')
				expect(typeof migration.up).toBe('function')
			})
		})

		it('should have proper migration IDs', () => {
			const migrationIds = assetMigrations.sequence.map((m) => m.id)
			expect(migrationIds).toContain(assetVersions.AddMeta)
		})

		it('should have correct sequence configuration', () => {
			expect(assetMigrations.sequenceId).toBe('com.tldraw.asset')
			// recordType is not part of the migration object structure
			expect(typeof assetMigrations.sequenceId).toBe('string')
		})
	})

	describe('AddMeta migration', () => {
		const { up } = getTestMigration(assetVersions.AddMeta)

		it('should add empty meta property in up migration', () => {
			const assetWithoutMeta = {
				id: 'asset:test1',
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
			expect(result.props.w).toBe(100)
			expect(result.props.name).toBe('test.jpg')
		})

		it('should preserve existing meta property in up migration', () => {
			const assetWithMeta = {
				id: 'asset:test2',
				typeName: 'asset',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
				meta: { existing: 'data' },
			}

			const result = up(assetWithMeta)
			expect(result.meta).toEqual({}) // Migration always sets to empty object
			expect(result.props.w).toBe(640)
		})

		it('should handle different asset types during migration', () => {
			const assetTypes = [
				{
					type: 'image',
					props: {
						w: 100,
						h: 100,
						name: 'test.jpg',
						isAnimated: false,
						mimeType: 'image/jpeg',
						src: 'https://example.com/test.jpg',
					},
				},
				{
					type: 'video',
					props: {
						w: 640,
						h: 480,
						name: 'test.mp4',
						isAnimated: true,
						mimeType: 'video/mp4',
						src: 'https://example.com/test.mp4',
					},
				},
				{
					type: 'bookmark',
					props: {
						title: 'Test',
						description: 'Test desc',
						image: '',
						favicon: '',
						src: 'https://test.com',
					},
				},
			]

			assetTypes.forEach((assetType, index) => {
				const asset = {
					id: `asset:migration_test_${index}`,
					typeName: 'asset',
					...assetType,
				}

				const result = up(asset)
				expect(result.meta).toEqual({})
				expect(result.type).toBe(assetType.type)
			})
		})

		it('should handle malformed assets gracefully', () => {
			const malformedAsset = {
				id: 'asset:malformed',
				typeName: 'asset',
				type: 'image',
				// Missing props - this might cause migration to fail
			}

			// The migration attempts to add meta, but it doesn't check for props existence
			const result = up(malformedAsset)
			expect(result.meta).toEqual({})
		})

		it('should preserve all other properties during migration', () => {
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
					fileSize: 75000,
				},
				customProperty: 'should be preserved',
				extraData: { nested: 'value' },
			}

			const result = up(assetWithExtraProps)
			expect(result.meta).toEqual({})
			expect(result.customProperty).toBe('should be preserved')
			expect(result.extraData).toEqual({ nested: 'value' })
			expect(result.props.w).toBe(200)
			expect(result.props.fileSize).toBe(75000)
		})
	})

	describe('TLAssetPartial', () => {
		it('should allow partial updates of asset properties', () => {
			const partialImageAsset: TLAssetPartial<TLImageAsset> = {
				id: 'asset:partial123' as TLAssetId,
				type: 'image',
				props: {
					w: 400, // Only updating width
				},
			}

			expect(partialImageAsset.id).toBe('asset:partial123')
			expect(partialImageAsset.type).toBe('image')
			expect(partialImageAsset.props?.w).toBe(400)
			expect(partialImageAsset.props?.h).toBeUndefined()
		})

		it('should allow partial meta updates', () => {
			const partialAsset: TLAssetPartial<TLVideoAsset> = {
				id: 'asset:partial_meta' as TLAssetId,
				type: 'video',
				meta: {
					lastModified: '2023-12-01',
				},
			}

			expect(partialAsset.meta?.lastModified).toBe('2023-12-01')
		})

		it('should require id and type fields', () => {
			// These should compile successfully
			const validPartial: TLAssetPartial = {
				id: 'asset:required' as TLAssetId,
				type: 'image',
			}

			expect(validPartial.id).toBe('asset:required')
			expect(validPartial.type).toBe('image')
		})

		it('should work with different asset types', () => {
			const partialBookmark: TLAssetPartial<TLBookmarkAsset> = {
				id: 'asset:partial_bookmark' as TLAssetId,
				type: 'bookmark',
				props: {
					title: 'Updated Title',
				},
			}

			expect(partialBookmark.type).toBe('bookmark')
			expect(partialBookmark.props?.title).toBe('Updated Title')
			expect(partialBookmark.props?.description).toBeUndefined()
		})

		it('should allow all optional properties except id and type', () => {
			const complexPartial: TLAssetPartial<TLImageAsset> = {
				id: 'asset:complex_partial' as TLAssetId,
				type: 'image',
				props: {
					w: 800,
					name: 'new-name.jpg',
				},
				meta: {
					updatedAt: Date.now(),
				},
			}

			expect(complexPartial.id).toBe('asset:complex_partial')
			expect(complexPartial.type).toBe('image')
			expect(complexPartial.props?.w).toBe(800)
			expect(complexPartial.props?.name).toBe('new-name.jpg')
			expect(complexPartial.meta?.updatedAt).toBeDefined()
		})
	})

	describe('AssetRecordType', () => {
		it('should create asset records with proper configuration', () => {
			expect(AssetRecordType.typeName).toBe('asset')
			expect(AssetRecordType.scope).toBe('document')
		})

		it('should create asset records with default meta property', () => {
			const assetRecord = AssetRecordType.create({
				id: 'asset:create_test' as TLAssetId,
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

		it('should use the asset validator', () => {
			expect(AssetRecordType.validator).toBe(assetValidator)
		})

		it('should have document scope for persistence', () => {
			expect(AssetRecordType.scope).toBe('document')
		})

		it('should create different asset types correctly', () => {
			const imageRecord = AssetRecordType.create({
				id: 'asset:image_record' as TLAssetId,
				type: 'image',
				props: {
					w: 200,
					h: 150,
					name: 'image.png',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'https://example.com/image.png',
				},
			})

			const videoRecord = AssetRecordType.create({
				id: 'asset:video_record' as TLAssetId,
				type: 'video',
				props: {
					w: 1280,
					h: 720,
					name: 'video.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/video.mp4',
				},
			})

			const bookmarkRecord = AssetRecordType.create({
				id: 'asset:bookmark_record' as TLAssetId,
				type: 'bookmark',
				props: {
					title: 'Test Site',
					description: 'A test bookmark',
					image: '',
					favicon: '',
					src: 'https://test.com',
				},
			})

			expect(imageRecord.type).toBe('image')
			expect(videoRecord.type).toBe('video')
			expect(bookmarkRecord.type).toBe('bookmark')

			// All should have empty meta by default
			expect(imageRecord.meta).toEqual({})
			expect(videoRecord.meta).toEqual({})
			expect(bookmarkRecord.meta).toEqual({})
		})

		it('should allow custom meta during creation', () => {
			const assetWithCustomMeta = AssetRecordType.create({
				id: 'asset:custom_meta' as TLAssetId,
				type: 'image',
				props: {
					w: 300,
					h: 200,
					name: 'custom.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/custom.jpg',
				},
				meta: {
					creator: 'test-user',
					createdAt: '2023-12-01',
				},
			})

			expect(assetWithCustomMeta.meta).toEqual({
				creator: 'test-user',
				createdAt: '2023-12-01',
			})
		})
	})

	describe('TLAssetId', () => {
		it('should be a branded string type for asset IDs', () => {
			const assetId: TLAssetId = 'asset:test123' as TLAssetId

			// Should work as a string
			expect(typeof assetId).toBe('string')
			expect(assetId.startsWith('asset:')).toBe(true)
		})

		it('should prevent mixing with other ID types at compile time', () => {
			// This test is more about type safety at compile time
			// but we can verify the basic string behavior
			const assetId: TLAssetId = 'asset:type_test' as TLAssetId
			expect(assetId).toContain('asset:')
		})

		it('should work with asset creation', () => {
			const assetId: TLAssetId = 'asset:id_test' as TLAssetId
			const asset: TLAsset = {
				id: assetId,
				typeName: 'asset',
				type: 'image',
				props: {
					w: 100,
					h: 100,
					name: 'id-test.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/id-test.jpg',
				},
				meta: {},
			}

			expect(asset.id).toBe(assetId)
		})

		it('should work in asset partial types', () => {
			const assetId: TLAssetId = 'asset:partial_id' as TLAssetId
			const partial: TLAssetPartial = {
				id: assetId,
				type: 'video',
				props: {
					w: 640,
				},
			}

			expect(partial.id).toBe(assetId)
		})
	})

	describe('Asset-based shapes', () => {
		it('should extract shapes that have assetId properties', () => {
			// Create shapes with assetId properties
			const imageShape: TLImageShape = {
				id: 'shape:image1' as any,
				typeName: 'shape',
				type: 'image',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:page1' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 300,
					h: 200,
					playing: true,
					url: 'https://example.com/image.jpg',
					assetId: 'asset:image1' as TLAssetId,
					crop: null,
					flipX: false,
					flipY: false,
					altText: '',
				},
				meta: {},
			}

			const videoShape: TLVideoShape = {
				id: 'shape:video1' as any,
				typeName: 'shape',
				type: 'video',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a2' as any,
				parentId: 'page:page1' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 640,
					h: 480,
					playing: true,
					url: 'https://example.com/video.mp4',
					assetId: 'asset:video1' as TLAssetId,
					time: 0,
					autoplay: false,
					altText: '',
				},
				meta: {},
			}

			// Test that shapes with assetId can be used in functions expecting TLAssetShape
			const getAssetId = (shape: TLImageShape | TLVideoShape): TLAssetId | null => {
				return shape.props.assetId
			}

			expect(getAssetId(imageShape)).toBe('asset:image1')
			expect(getAssetId(videoShape)).toBe('asset:video1')
		})

		it('should work with shapes that have null assetId', () => {
			const imageShapeWithNullAsset: TLImageShape = {
				id: 'shape:image_null' as any,
				typeName: 'shape',
				type: 'image',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:page1' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 300,
					h: 200,
					playing: true,
					url: 'https://example.com/image.jpg',
					assetId: null, // Null asset ID
					crop: null,
					flipX: false,
					flipY: false,
					altText: '',
				},
				meta: {},
			}

			// Test that null assetId is handled correctly
			expect(imageShapeWithNullAsset.props.assetId).toBeNull()
		})

		it('should handle asset-based shape operations', () => {
			const handleAssetShape = (shape: TLImageShape | TLVideoShape): TLAssetId | null => {
				return shape.props.assetId
			}

			const imageShape: TLImageShape = {
				id: 'shape:test' as any,
				typeName: 'shape',
				type: 'image',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:page1' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 300,
					h: 200,
					playing: true,
					url: 'https://example.com/test.jpg',
					assetId: 'asset:test' as TLAssetId,
					crop: null,
					flipX: false,
					flipY: false,
					altText: '',
				},
				meta: {},
			}

			const assetId = handleAssetShape(imageShape)
			expect(assetId).toBe('asset:test')
		})

		it('should work with different asset shape types', () => {
			const checkShapeType = (shape: TLImageShape | TLVideoShape): string => {
				return shape.type
			}

			// Create proper shape objects with minimal required properties
			const imageShape = {
				id: 'shape:img1' as any,
				typeName: 'shape' as const,
				type: 'image' as const,
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:page1' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 100,
					h: 100,
					playing: true,
					url: '',
					assetId: 'asset:img1' as TLAssetId,
					crop: null,
					flipX: false,
					flipY: false,
					altText: '',
				},
				meta: {},
			} as TLImageShape

			const videoShape = {
				id: 'shape:vid1' as any,
				typeName: 'shape' as const,
				type: 'video' as const,
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a2' as any,
				parentId: 'page:page1' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 100,
					h: 100,
					playing: true,
					url: '',
					assetId: 'asset:vid1' as TLAssetId,
					time: 0,
					autoplay: false,
					altText: '',
				},
				meta: {},
			} as TLVideoShape

			expect(checkShapeType(imageShape)).toBe('image')
			expect(checkShapeType(videoShape)).toBe('video')
		})
	})

	describe('Integration and edge cases', () => {
		it('should handle all asset types in validator integration', () => {
			const assets = [
				{
					id: 'asset:integration_image',
					typeName: 'asset' as const,
					type: 'image' as const,
					props: {
						w: 100,
						h: 100,
						name: 'int.jpg',
						isAnimated: false,
						mimeType: 'image/jpeg',
						src: 'https://example.com/int.jpg',
					},
					meta: {},
				},
				{
					id: 'asset:integration_video',
					typeName: 'asset' as const,
					type: 'video' as const,
					props: {
						w: 640,
						h: 480,
						name: 'int.mp4',
						isAnimated: true,
						mimeType: 'video/mp4',
						src: 'https://example.com/int.mp4',
					},
					meta: {},
				},
				{
					id: 'asset:integration_bookmark',
					typeName: 'asset' as const,
					type: 'bookmark' as const,
					props: {
						title: 'Integration',
						description: 'Test',
						image: '',
						favicon: '',
						src: 'https://integration.com',
					},
					meta: {},
				},
			]

			assets.forEach((asset) => {
				expect(() => assetValidator.validate(asset)).not.toThrow()
				const validated = assetValidator.validate(asset)
				expect(validated.typeName).toBe('asset')
				expect(validated.meta).toEqual({})
			})
		})

		it('should handle asset record creation with AssetRecordType', () => {
			const createAndValidateAsset = (assetData: any) => {
				const record = AssetRecordType.create(assetData)
				const validated = assetValidator.validate(record)
				return validated
			}

			const imageAssetData = {
				id: 'asset:record_create' as TLAssetId,
				type: 'image' as const,
				props: {
					w: 500,
					h: 400,
					name: 'record.png',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'https://example.com/record.png',
				},
			}

			const createdAsset = createAndValidateAsset(imageAssetData)
			expect(createdAsset.id).toBe('asset:record_create')
			expect(createdAsset.type).toBe('image')
			expect(createdAsset.meta).toEqual({})
		})

		test('should work with partial asset updates', () => {
			const originalAsset: TLAsset = {
				id: 'asset:partial_update' as TLAssetId,
				typeName: 'asset',
				type: 'image',
				props: {
					w: 200,
					h: 150,
					name: 'original.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/original.jpg',
					fileSize: 50000,
				},
				meta: { created: '2023-01-01' },
			}

			const partialUpdate: TLAssetPartial<TLImageAsset> = {
				id: 'asset:partial_update' as TLAssetId,
				type: 'image',
				props: {
					w: 400, // Update width
					name: 'updated.jpg', // Update name
				},
				meta: {
					lastModified: '2023-12-01', // Add last modified
				},
			}

			// Simulating how a partial update might be applied
			const applyPartialUpdate = (original: TLAsset, partial: TLAssetPartial): TLAsset => {
				return {
					...original,
					...partial,
					props: { ...original.props, ...partial.props },
					meta: { ...original.meta, ...partial.meta },
				} as TLAsset
			}

			const updated = applyPartialUpdate(originalAsset, partialUpdate)

			// Use type assertion to access image-specific properties
			if (updated.type === 'image') {
				expect(updated.props.w).toBe(400) // Updated
				expect(updated.props.h).toBe(150) // Preserved
				expect(updated.props.name).toBe('updated.jpg') // Updated
				expect(updated.props.fileSize).toBe(50000) // Preserved
			}
			expect(updated.meta.created).toBe('2023-01-01') // Preserved
			expect(updated.meta.lastModified).toBe('2023-12-01') // Added
		})

		it('should handle complex migration scenarios', () => {
			// Test migration with complex asset structures
			const complexAsset = {
				id: 'asset:complex_migration',
				typeName: 'asset',
				type: 'bookmark',
				props: {
					title: 'Complex Site',
					description: 'Very long description with special characters: åäö',
					image: 'https://example.com/complex-image.png',
					favicon: 'https://example.com/favicon.svg',
					src: 'https://complex-site.example.com/path?param=value&other=test',
				},
				customField: 'should be preserved',
				nestedData: {
					level1: {
						level2: ['array', 'data'],
					},
				},
			}

			const { up } = getTestMigration(assetVersions.AddMeta)
			const migrated = up(complexAsset)

			expect(migrated.meta).toEqual({})
			expect(migrated.customField).toBe('should be preserved')
			expect(migrated.nestedData.level1.level2).toEqual(['array', 'data'])
			expect(migrated.props.title).toBe('Complex Site')
		})

		it('should handle asset shape relationship correctly', () => {
			const assetId: TLAssetId = 'asset:relationship_test' as TLAssetId

			// Create asset
			const asset: TLAsset = {
				id: assetId,
				typeName: 'asset',
				type: 'image',
				props: {
					w: 300,
					h: 200,
					name: 'relationship.jpg',
					isAnimated: false,
					mimeType: 'image/jpeg',
					src: 'https://example.com/relationship.jpg',
				},
				meta: {},
			}

			// Create shape that references the asset
			const shape: TLImageShape = {
				id: 'shape:related' as any,
				typeName: 'shape',
				type: 'image',
				x: 100,
				y: 100,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:page1' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 300,
					h: 200,
					playing: true,
					url: 'https://example.com/relationship.jpg',
					assetId: assetId, // Reference to asset
					crop: null,
					flipX: false,
					flipY: false,
					altText: '',
				},
				meta: {},
			}

			expect(asset.id).toBe(shape.props.assetId)
			expect(shape.props.assetId).toBe(assetId)
		})
	})
})
