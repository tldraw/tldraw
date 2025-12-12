import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { assetMigrations, AssetRecordType, assetVersions, TLAssetId } from './TLAsset'

describe('TLAsset', () => {
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
