import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { videoAssetMigrations, videoAssetValidator, videoAssetVersions } from './TLVideoAsset'

describe('TLVideoAsset', () => {
	describe('videoAssetValidator', () => {
		it('should validate valid video assets', () => {
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
					fileSize: 10485760,
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(validVideoAsset)).not.toThrow()
		})

		it('should validate video asset with null values', () => {
			const videoWithNullValues = {
				id: 'asset:video_null_values',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 640,
					h: 480,
					name: 'unknown-format',
					isAnimated: true,
					mimeType: null,
					src: null,
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(videoWithNullValues)).not.toThrow()
		})

		it('should reject invalid data', () => {
			// Missing required property
			const missingWidthAsset = {
				id: 'asset:video123',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(missingWidthAsset)).toThrow()

			// Wrong type
			const wrongTypeAsset = {
				id: 'asset:video123',
				typeName: 'asset' as const,
				type: 'image' as const,
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

			expect(() => videoAssetValidator.validate(wrongTypeAsset)).toThrow()
		})
	})

	describe('videoAssetMigrations', () => {
		it('should have correct configuration', () => {
			expect(videoAssetMigrations.sequenceId).toBe('com.tldraw.asset.video')
			expect(videoAssetMigrations.sequence).toHaveLength(5)
			videoAssetMigrations.sequence.forEach((migration) => {
				expect(migration.id).toBeDefined()
				expect(typeof migration.up).toBe('function')
				expect(typeof migration.down).toBe('function')
			})
		})
	})

	describe('migrations', () => {
		it('should handle AddIsAnimated migration', () => {
			const { up, down } = getTestMigration(videoAssetVersions.AddIsAnimated)

			const assetWithoutIsAnimated = {
				id: 'asset:video1',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
			}

			const upResult = up(assetWithoutIsAnimated)
			expect(upResult.props.isAnimated).toBe(false)

			const downResult = down(upResult)
			expect(downResult.props).not.toHaveProperty('isAnimated')
		})

		it('should handle RenameWidthHeight migration', () => {
			const { up, down } = getTestMigration(videoAssetVersions.RenameWidthHeight)

			const assetWithWidthHeight = {
				id: 'asset:video1',
				type: 'video',
				props: {
					width: 1920,
					height: 1080,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
			}

			const upResult = up(assetWithWidthHeight)
			expect(upResult.props.w).toBe(1920)
			expect(upResult.props.h).toBe(1080)
			expect(upResult.props).not.toHaveProperty('width')
			expect(upResult.props).not.toHaveProperty('height')

			const downResult = down(upResult)
			expect(downResult.props.width).toBe(1920)
			expect(downResult.props.height).toBe(1080)
			expect(downResult.props).not.toHaveProperty('w')
			expect(downResult.props).not.toHaveProperty('h')
		})

		it('should handle MakeUrlsValid migration', () => {
			const { up } = getTestMigration(videoAssetVersions.MakeUrlsValid)

			const assetWithInvalidSrc = {
				id: 'asset:video1',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'invalid-url-format',
				},
			}

			const result = up(assetWithInvalidSrc)
			expect(result.props.src).toBe('')
		})

		it('should handle MakeFileSizeOptional migration', () => {
			const { up, down } = getTestMigration(videoAssetVersions.MakeFileSizeOptional)

			const assetWithNegativeFileSize = {
				id: 'asset:video1',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
					fileSize: -1,
				},
			}

			const upResult = up(assetWithNegativeFileSize)
			expect(upResult.props.fileSize).toBeUndefined()

			const downResult = down({
				...assetWithNegativeFileSize,
				props: { ...assetWithNegativeFileSize.props, fileSize: undefined },
			})
			expect(downResult.props.fileSize).toBe(-1)
		})
	})
})
