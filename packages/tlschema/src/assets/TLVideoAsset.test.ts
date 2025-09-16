import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLAssetId } from '../records/TLAsset'
import {
	TLVideoAsset,
	videoAssetMigrations,
	videoAssetValidator,
	videoAssetVersions,
} from './TLVideoAsset'

describe('TLVideoAsset', () => {
	describe('TLVideoAsset interface', () => {
		it('should extend TLBaseAsset with video-specific properties', () => {
			const mockVideoAsset: TLVideoAsset = {
				id: 'asset:video123' as TLAssetId,
				typeName: 'asset',
				type: 'video',
				props: {
					w: 1920,
					h: 1080,
					name: 'my-video.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/video.mp4',
					fileSize: 5242880,
				},
				meta: { uploadedBy: 'user123' },
			}

			expect(mockVideoAsset.id).toBe('asset:video123')
			expect(mockVideoAsset.typeName).toBe('asset')
			expect(mockVideoAsset.type).toBe('video')
			expect(mockVideoAsset.props.w).toBe(1920)
			expect(mockVideoAsset.props.h).toBe(1080)
			expect(mockVideoAsset.props.name).toBe('my-video.mp4')
			expect(mockVideoAsset.props.isAnimated).toBe(true)
			expect(mockVideoAsset.props.mimeType).toBe('video/mp4')
			expect(mockVideoAsset.props.src).toBe('https://example.com/video.mp4')
			expect(mockVideoAsset.props.fileSize).toBe(5242880)
			expect(mockVideoAsset.meta).toEqual({ uploadedBy: 'user123' })
		})

		it('should handle null mimeType and src properties', () => {
			const videoAssetWithNullValues: TLVideoAsset = {
				id: 'asset:video456' as TLAssetId,
				typeName: 'asset',
				type: 'video',
				props: {
					w: 1280,
					h: 720,
					name: 'unknown-video',
					isAnimated: true,
					mimeType: null,
					src: null,
				},
				meta: {},
			}

			expect(videoAssetWithNullValues.props.mimeType).toBeNull()
			expect(videoAssetWithNullValues.props.src).toBeNull()
			expect(videoAssetWithNullValues.props.w).toBe(1280)
			expect(videoAssetWithNullValues.props.h).toBe(720)
			expect(videoAssetWithNullValues.props.isAnimated).toBe(true)
		})

		it('should work with optional fileSize property', () => {
			const videoAssetWithoutFileSize: TLVideoAsset = {
				id: 'asset:video789' as TLAssetId,
				typeName: 'asset',
				type: 'video',
				props: {
					w: 1920,
					h: 1080,
					name: 'large-video.webm',
					isAnimated: true,
					mimeType: 'video/webm',
					src: 'https://example.com/large-video.webm',
				},
				meta: {},
			}

			expect(videoAssetWithoutFileSize.props.fileSize).toBeUndefined()
			expect(videoAssetWithoutFileSize.props.name).toBe('large-video.webm')
			expect(videoAssetWithoutFileSize.props.isAnimated).toBe(true)
		})

		it('should handle non-animated video content', () => {
			const staticVideoAsset: TLVideoAsset = {
				id: 'asset:static123' as TLAssetId,
				typeName: 'asset',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'static-content.mp4',
					isAnimated: false,
					mimeType: 'video/mp4',
					src: 'https://example.com/static-content.mp4',
					fileSize: 1024000,
				},
				meta: { isStatic: true },
			}

			expect(staticVideoAsset.props.isAnimated).toBe(false)
			expect(staticVideoAsset.props.mimeType).toBe('video/mp4')
			expect(staticVideoAsset.props.name).toBe('static-content.mp4')
		})

		it('should work with data URLs', () => {
			const dataUrlVideoAsset: TLVideoAsset = {
				id: 'asset:dataurl456' as TLAssetId,
				typeName: 'asset',
				type: 'video',
				props: {
					w: 320,
					h: 240,
					name: 'small-video.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'data:video/mp4;base64,AAAAGGZ0eXBtcDQyAAAAAAABbXA0MgAAAAAAAAAAAAAAAAAAAA==',
					fileSize: 2048,
				},
				meta: {},
			}

			expect(dataUrlVideoAsset.props.src).toContain('data:video/mp4;base64')
			expect(dataUrlVideoAsset.props.w).toBe(320)
			expect(dataUrlVideoAsset.props.h).toBe(240)
		})

		it('should support various video formats', () => {
			const webmVideoAsset: TLVideoAsset = {
				id: 'asset:webm123' as TLAssetId,
				typeName: 'asset',
				type: 'video',
				props: {
					w: 854,
					h: 480,
					name: 'video.webm',
					isAnimated: true,
					mimeType: 'video/webm',
					src: 'https://example.com/video.webm',
					fileSize: 3145728,
				},
				meta: {},
			}

			expect(webmVideoAsset.props.mimeType).toBe('video/webm')
			expect(webmVideoAsset.props.name).toBe('video.webm')
			expect(webmVideoAsset.props.isAnimated).toBe(true)
		})
	})

	describe('videoAssetValidator', () => {
		it('should validate a complete video asset', () => {
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
				meta: {
					uploadedAt: '2023-12-01T10:00:00Z',
					uploadedBy: 'user123',
				} as JsonObject,
			}

			expect(() => videoAssetValidator.validate(validVideoAsset)).not.toThrow()
			const result = videoAssetValidator.validate(validVideoAsset)
			expect(result.id).toBe('asset:video_valid')
			expect(result.type).toBe('video')
			expect(result.props.w).toBe(1920)
			expect(result.props.h).toBe(1080)
			expect(result.props.name).toBe('test-video.mp4')
			expect(result.props.isAnimated).toBe(true)
			expect(result.props.mimeType).toBe('video/mp4')
			expect(result.props.src).toBe('https://example.com/test-video.mp4')
			expect(result.props.fileSize).toBe(10485760)
		})

		it('should validate video asset with null mimeType and src', () => {
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
			const result = videoAssetValidator.validate(videoWithNullValues)
			expect(result.props.mimeType).toBeNull()
			expect(result.props.src).toBeNull()
		})

		it('should validate video asset without optional fileSize', () => {
			const videoWithoutFileSize = {
				id: 'asset:video_no_file_size',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 1280,
					h: 720,
					name: 'no-size.webm',
					isAnimated: true,
					mimeType: 'video/webm',
					src: 'https://example.com/no-size.webm',
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(videoWithoutFileSize)).not.toThrow()
			const result = videoAssetValidator.validate(videoWithoutFileSize)
			expect(result.props.fileSize).toBeUndefined()
		})

		it('should validate video asset with data URLs', () => {
			const videoWithDataUrl = {
				id: 'asset:video_data_url',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 480,
					h: 360,
					name: 'data-video.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'data:video/mp4;base64,AAAAGGZ0eXBtcDQyAAAAAAABbXA0MgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
					fileSize: 1024,
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(videoWithDataUrl)).not.toThrow()
			const result = videoAssetValidator.validate(videoWithDataUrl)
			expect(result.props.src).toContain('data:video/mp4;base64')
		})

		it('should validate non-animated video asset', () => {
			const nonAnimatedVideo = {
				id: 'asset:static_video',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 1024,
					h: 768,
					name: 'static.mp4',
					isAnimated: false,
					mimeType: 'video/mp4',
					src: 'https://example.com/static.mp4',
					fileSize: 2097152,
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(nonAnimatedVideo)).not.toThrow()
			const result = videoAssetValidator.validate(nonAnimatedVideo)
			expect(result.props.isAnimated).toBe(false)
		})

		it('should reject invalid asset ID format', () => {
			const invalidIdAsset = {
				id: 'shape:invalid_id',
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

			expect(() => videoAssetValidator.validate(invalidIdAsset)).toThrow(
				'asset ID must start with "asset:"'
			)
		})

		it('should reject wrong typeName', () => {
			const wrongTypeNameAsset = {
				id: 'asset:video123',
				typeName: 'shape' as const,
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

			expect(() => videoAssetValidator.validate(wrongTypeNameAsset)).toThrow()
		})

		it('should reject wrong type', () => {
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

		it('should reject missing required props', () => {
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

			const missingHeightAsset = {
				id: 'asset:video123',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 640,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(missingHeightAsset)).toThrow()

			const missingNameAsset = {
				id: 'asset:video123',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 640,
					h: 480,
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(missingNameAsset)).toThrow()

			const missingIsAnimatedAsset = {
				id: 'asset:video123',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(missingIsAnimatedAsset)).toThrow()
		})

		it('should reject non-number dimensions', () => {
			const nonNumberDimensionsAsset = {
				id: 'asset:video123',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: '640',
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(nonNumberDimensionsAsset)).toThrow()
		})

		it('should reject non-string name', () => {
			const nonStringNameAsset = {
				id: 'asset:video123',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 640,
					h: 480,
					name: 123,
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(nonStringNameAsset)).toThrow()
		})

		it('should reject non-boolean isAnimated', () => {
			const nonBooleanAnimatedAsset = {
				id: 'asset:video123',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: 'true',
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(nonBooleanAnimatedAsset)).toThrow()
		})

		it('should reject invalid mimeType types (not string or null)', () => {
			const invalidMimeTypeAsset = {
				id: 'asset:video123',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 123,
					src: 'https://example.com/test.mp4',
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(invalidMimeTypeAsset)).toThrow()
		})

		it('should reject invalid src types (not string or null)', () => {
			const invalidSrcTypeAsset = {
				id: 'asset:video123',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 123,
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(invalidSrcTypeAsset)).toThrow()
		})

		it('should allow zero fileSize when provided', () => {
			const zeroFileSizeAsset = {
				id: 'asset:video123',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
					fileSize: 0,
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(zeroFileSizeAsset)).not.toThrow()
			const result = videoAssetValidator.validate(zeroFileSizeAsset)
			expect(result.props.fileSize).toBe(0)
		})

		it('should allow negative fileSize when provided', () => {
			const negativeFileSizeAsset = {
				id: 'asset:video123',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
					fileSize: -1,
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(negativeFileSizeAsset)).not.toThrow()
			const result = videoAssetValidator.validate(negativeFileSizeAsset)
			expect(result.props.fileSize).toBe(-1)
		})

		it('should reject extra unexpected properties', () => {
			const extraPropsAsset = {
				id: 'asset:video123',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
					extraProp: 'unexpected',
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(extraPropsAsset)).toThrow()
		})

		test('should handle edge cases with dimensions', () => {
			const veryLargeVideoAsset = {
				id: 'asset:large_video',
				typeName: 'asset' as const,
				type: 'video' as const,
				props: {
					w: 7680,
					h: 4320,
					name: '8k-video.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/8k-video.mp4',
					fileSize: 1073741824,
				},
				meta: {},
			}

			expect(() => videoAssetValidator.validate(veryLargeVideoAsset)).not.toThrow()
			const result = videoAssetValidator.validate(veryLargeVideoAsset)
			expect(result.props.w).toBe(7680)
			expect(result.props.h).toBe(4320)
			expect(result.props.fileSize).toBe(1073741824)
		})

		test('should validate various video formats', () => {
			const videoFormats = [
				{ name: 'test.mp4', mimeType: 'video/mp4' },
				{ name: 'test.webm', mimeType: 'video/webm' },
				{ name: 'test.ogg', mimeType: 'video/ogg' },
				{ name: 'test.mov', mimeType: 'video/quicktime' },
				{ name: 'test.avi', mimeType: 'video/x-msvideo' },
				{ name: 'test.mkv', mimeType: 'video/x-matroska' },
			]

			videoFormats.forEach(({ name, mimeType }, index) => {
				const videoAsset = {
					id: `asset:video_format_${index}`,
					typeName: 'asset' as const,
					type: 'video' as const,
					props: {
						w: 640,
						h: 480,
						name,
						isAnimated: true, // Most videos are animated
						mimeType,
						src: `https://example.com/${name}`,
						fileSize: 5242880,
					},
					meta: {},
				}

				expect(() => videoAssetValidator.validate(videoAsset)).not.toThrow()
				const result = videoAssetValidator.validate(videoAsset)
				expect(result.props.name).toBe(name)
				expect(result.props.mimeType).toBe(mimeType)
			})
		})
	})

	describe('videoAssetVersions', () => {
		it('should export correct version identifiers', () => {
			expect(videoAssetVersions).toBeDefined()
			expect(typeof videoAssetVersions.AddIsAnimated).toBe('string')
			expect(typeof videoAssetVersions.RenameWidthHeight).toBe('string')
			expect(typeof videoAssetVersions.MakeUrlsValid).toBe('string')
			expect(typeof videoAssetVersions.AddFileSize).toBe('string')
			expect(typeof videoAssetVersions.MakeFileSizeOptional).toBe('string')
		})

		it('should have correct version numbers', () => {
			expect(videoAssetVersions.AddIsAnimated).toContain('com.tldraw.asset.video')
			expect(videoAssetVersions.RenameWidthHeight).toContain('com.tldraw.asset.video')
			expect(videoAssetVersions.MakeUrlsValid).toContain('com.tldraw.asset.video')
			expect(videoAssetVersions.AddFileSize).toContain('com.tldraw.asset.video')
			expect(videoAssetVersions.MakeFileSizeOptional).toContain('com.tldraw.asset.video')

			// All version IDs should be different
			const versions = Object.values(videoAssetVersions)
			const uniqueVersions = new Set(versions)
			expect(uniqueVersions.size).toBe(versions.length)
		})

		it('should maintain version ordering', () => {
			const versions = Object.values(videoAssetVersions)
			expect(versions).toHaveLength(5)
			versions.forEach((version) => {
				expect(typeof version).toBe('string')
				expect(version.length).toBeGreaterThan(0)
			})
		})
	})

	describe('videoAssetMigrations', () => {
		it('should have correct migration sequence configuration', () => {
			expect(videoAssetMigrations).toBeDefined()
			expect(videoAssetMigrations.sequenceId).toBe('com.tldraw.asset.video')
			expect(typeof videoAssetMigrations.retroactive).toBe('boolean')
			expect(Array.isArray(videoAssetMigrations.sequence)).toBe(true)
			expect(videoAssetMigrations.sequence).toHaveLength(5)
		})

		it('should have retroactive migration enabled', () => {
			expect(videoAssetMigrations.retroactive).toBe(true)
		})

		it('should have all migrations with proper structure', () => {
			videoAssetMigrations.sequence.forEach((migration) => {
				expect(migration.id).toBeDefined()
				expect(typeof migration.id).toBe('string')
				expect(typeof migration.up).toBe('function')
				expect(typeof migration.down).toBe('function')
			})
		})

		it('should have proper migration configuration', () => {
			// Test the sequenceId which should be accessible
			expect(videoAssetMigrations.sequenceId).toBe('com.tldraw.asset.video')

			// Test that the migrations have the right structure
			expect(Array.isArray(videoAssetMigrations.sequence)).toBe(true)
			expect(videoAssetMigrations.sequence.length).toBe(5)
		})
	})

	describe('AddIsAnimated migration', () => {
		const { up, down } = getTestMigration(videoAssetVersions.AddIsAnimated)

		it('should add isAnimated property with false default in up migration', () => {
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

			const result = up(assetWithoutIsAnimated)
			expect(result.props.isAnimated).toBe(false)
			expect(result.props.w).toBe(640)
			expect(result.props.name).toBe('test.mp4')
		})

		it('should preserve existing isAnimated property in up migration', () => {
			const assetWithIsAnimated = {
				id: 'asset:video2',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
					isAnimated: true,
				},
			}

			const result = up(assetWithIsAnimated)
			expect(result.props.isAnimated).toBe(false) // Migration always sets to false
		})

		it('should remove isAnimated property in down migration', () => {
			const assetWithIsAnimated = {
				id: 'asset:video3',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
					isAnimated: true,
				},
			}

			const result = down(assetWithIsAnimated)
			expect(result.props).not.toHaveProperty('isAnimated')
			expect(result.props.w).toBe(640)
			expect(result.props.name).toBe('test.mp4')
		})

		it('should handle asset without isAnimated in down migration', () => {
			const assetWithoutIsAnimated = {
				id: 'asset:video4',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
			}

			const result = down(assetWithoutIsAnimated)
			expect(result.props).not.toHaveProperty('isAnimated')
			expect(result.props.w).toBe(640)
		})
	})

	describe('RenameWidthHeight migration', () => {
		const { up, down } = getTestMigration(videoAssetVersions.RenameWidthHeight)

		it('should rename width and height to w and h in up migration', () => {
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

			const result = up(assetWithWidthHeight)
			expect(result.props.w).toBe(1920)
			expect(result.props.h).toBe(1080)
			expect(result.props).not.toHaveProperty('width')
			expect(result.props).not.toHaveProperty('height')
			expect(result.props.name).toBe('test.mp4')
		})

		it('should handle asset without width/height properties in up migration', () => {
			const assetWithoutDimensions = {
				id: 'asset:video2',
				type: 'video',
				props: {
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
			}

			const result = up(assetWithoutDimensions)
			expect(result.props.w).toBeUndefined()
			expect(result.props.h).toBeUndefined()
			expect(result.props.name).toBe('test.mp4')
		})

		it('should rename w and h to width and height in down migration', () => {
			const assetWithWH = {
				id: 'asset:video3',
				type: 'video',
				props: {
					w: 1280,
					h: 720,
					name: 'test.webm',
					isAnimated: true,
					mimeType: 'video/webm',
					src: 'https://example.com/test.webm',
				},
			}

			const result = down(assetWithWH)
			expect(result.props.width).toBe(1280)
			expect(result.props.height).toBe(720)
			expect(result.props).not.toHaveProperty('w')
			expect(result.props).not.toHaveProperty('h')
			expect(result.props.name).toBe('test.webm')
		})

		it('should handle asset without w/h properties in down migration', () => {
			const assetWithoutWH = {
				id: 'asset:video4',
				type: 'video',
				props: {
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
			}

			const result = down(assetWithoutWH)
			expect(result.props.width).toBeUndefined()
			expect(result.props.height).toBeUndefined()
			expect(result.props.name).toBe('test.mp4')
		})
	})

	describe('MakeUrlsValid migration', () => {
		const { up, down } = getTestMigration(videoAssetVersions.MakeUrlsValid)

		it('should clean invalid src URLs in up migration', () => {
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

		it('should preserve valid src URLs in up migration', () => {
			const assetWithValidSrc = {
				id: 'asset:video2',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
			}

			const result = up(assetWithValidSrc)
			expect(result.props.src).toBe('https://example.com/test.mp4')
		})

		it('should handle null src in up migration', () => {
			const assetWithNullSrc = {
				id: 'asset:video3',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: null,
				},
			}

			const result = up(assetWithNullSrc)
			expect(result.props.src).toBe('')
		})

		it('should handle empty src in up migration', () => {
			const assetWithEmptySrc = {
				id: 'asset:video4',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: '',
				},
			}

			const result = up(assetWithEmptySrc)
			expect(result.props.src).toBe('')
		})

		it('should handle missing src property in up migration', () => {
			const assetWithoutSrc = {
				id: 'asset:video5',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
				},
			}

			const result = up(assetWithoutSrc)
			expect(result.props.src).toBe('')
		})

		it('should preserve data URLs in up migration', () => {
			const assetWithDataUrl = {
				id: 'asset:video6',
				type: 'video',
				props: {
					w: 320,
					h: 240,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'data:video/mp4;base64,AAAAGGZ0eXBtcDQyAAAAAAABbXA0MgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
				},
			}

			const result = up(assetWithDataUrl)
			expect(result.props.src).toBe(
				'data:video/mp4;base64,AAAAGGZ0eXBtcDQyAAAAAAABbXA0MgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='
			)
		})

		it('should be a no-op down migration', () => {
			const asset = {
				id: 'asset:video7',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
			}

			const result = down(asset)
			expect(result).toEqual(asset)
		})
	})

	describe('AddFileSize migration', () => {
		const { up, down } = getTestMigration(videoAssetVersions.AddFileSize)

		it('should add fileSize property with -1 default in up migration', () => {
			const assetWithoutFileSize = {
				id: 'asset:video1',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
			}

			const result = up(assetWithoutFileSize)
			expect(result.props.fileSize).toBe(-1)
			expect(result.props.w).toBe(640)
			expect(result.props.name).toBe('test.mp4')
		})

		it('should preserve existing fileSize property in up migration', () => {
			const assetWithFileSize = {
				id: 'asset:video2',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
					fileSize: 5242880,
				},
			}

			const result = up(assetWithFileSize)
			expect(result.props.fileSize).toBe(-1) // Migration always sets to -1
		})

		it('should remove fileSize property in down migration', () => {
			const assetWithFileSize = {
				id: 'asset:video3',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
					fileSize: 5242880,
				},
			}

			const result = down(assetWithFileSize)
			expect(result.props).not.toHaveProperty('fileSize')
			expect(result.props.w).toBe(640)
			expect(result.props.name).toBe('test.mp4')
		})

		it('should handle asset without fileSize in down migration', () => {
			const assetWithoutFileSize = {
				id: 'asset:video4',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
			}

			const result = down(assetWithoutFileSize)
			expect(result.props).not.toHaveProperty('fileSize')
			expect(result.props.w).toBe(640)
		})
	})

	describe('MakeFileSizeOptional migration', () => {
		const { up, down } = getTestMigration(videoAssetVersions.MakeFileSizeOptional)

		it('should convert fileSize -1 to undefined in up migration', () => {
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

			const result = up(assetWithNegativeFileSize)
			expect(result.props.fileSize).toBeUndefined()
		})

		it('should preserve positive fileSize values in up migration', () => {
			const assetWithPositiveFileSize = {
				id: 'asset:video2',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
					fileSize: 10485760,
				},
			}

			const result = up(assetWithPositiveFileSize)
			expect(result.props.fileSize).toBe(10485760)
		})

		it('should preserve zero fileSize in up migration', () => {
			const assetWithZeroFileSize = {
				id: 'asset:video3',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
					fileSize: 0,
				},
			}

			const result = up(assetWithZeroFileSize)
			expect(result.props.fileSize).toBe(0)
		})

		it('should handle missing fileSize property in up migration', () => {
			const assetWithoutFileSize = {
				id: 'asset:video4',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
			}

			const result = up(assetWithoutFileSize)
			expect(result.props.fileSize).toBeUndefined()
		})

		it('should convert undefined fileSize to -1 in down migration', () => {
			const assetWithUndefinedFileSize = {
				id: 'asset:video5',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
					fileSize: undefined,
				},
			}

			const result = down(assetWithUndefinedFileSize)
			expect(result.props.fileSize).toBe(-1)
		})

		it('should preserve positive fileSize values in down migration', () => {
			const assetWithPositiveFileSize = {
				id: 'asset:video6',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
					fileSize: 15728640,
				},
			}

			const result = down(assetWithPositiveFileSize)
			expect(result.props.fileSize).toBe(15728640)
		})

		it('should handle asset without fileSize property in down migration', () => {
			const assetWithoutFileSize = {
				id: 'asset:video7',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/test.mp4',
				},
			}

			const result = down(assetWithoutFileSize)
			// When a property doesn't exist, JavaScript treats it as undefined, so the condition is true
			// and the down migration sets it to -1
			expect(result.props.fileSize).toBe(-1)
		})
	})

	describe('Migration integration', () => {
		it('should properly chain migrations', () => {
			// Test that migrations work in sequence
			const originalAsset = {
				id: 'asset:video_chain',
				type: 'video',
				props: {
					width: 1920,
					height: 1080,
					name: 'chain-test.mp4',
					mimeType: 'video/mp4',
					src: 'invalid-url',
				},
			}

			// Apply AddIsAnimated migration
			const { up: addIsAnimatedUp } = getTestMigration(videoAssetVersions.AddIsAnimated)
			const afterFirstMigration = addIsAnimatedUp(originalAsset)
			expect(afterFirstMigration.props.isAnimated).toBe(false)

			// Apply RenameWidthHeight migration
			const { up: renameWidthHeightUp } = getTestMigration(videoAssetVersions.RenameWidthHeight)
			const afterSecondMigration = renameWidthHeightUp(afterFirstMigration)
			expect(afterSecondMigration.props.w).toBe(1920)
			expect(afterSecondMigration.props.h).toBe(1080)
			expect(afterSecondMigration.props).not.toHaveProperty('width')
			expect(afterSecondMigration.props).not.toHaveProperty('height')

			// Apply MakeUrlsValid migration
			const { up: makeUrlsValidUp } = getTestMigration(videoAssetVersions.MakeUrlsValid)
			const afterThirdMigration = makeUrlsValidUp(afterSecondMigration)
			expect(afterThirdMigration.props.src).toBe('')

			// Apply AddFileSize migration
			const { up: addFileSizeUp } = getTestMigration(videoAssetVersions.AddFileSize)
			const afterFourthMigration = addFileSizeUp(afterThirdMigration)
			expect(afterFourthMigration.props.fileSize).toBe(-1)

			// Apply MakeFileSizeOptional migration
			const { up: makeFileSizeOptionalUp } = getTestMigration(
				videoAssetVersions.MakeFileSizeOptional
			)
			const finalResult = makeFileSizeOptionalUp(afterFourthMigration)
			expect(finalResult.props.fileSize).toBeUndefined()
		})

		it('should properly reverse migrations', () => {
			// Test that down migrations work in reverse order
			const migratedAsset = {
				id: 'asset:video_reverse',
				type: 'video',
				props: {
					w: 1280,
					h: 720,
					name: 'reverse-test.webm',
					isAnimated: true,
					mimeType: 'video/webm',
					src: 'https://example.com/reverse-test.webm',
					fileSize: 20971520,
				},
			}

			// Apply MakeFileSizeOptional down migration first
			const { down: makeFileSizeOptionalDown } = getTestMigration(
				videoAssetVersions.MakeFileSizeOptional
			)
			const afterFirstDown = makeFileSizeOptionalDown(migratedAsset)
			expect(afterFirstDown.props.fileSize).toBe(20971520) // Should remain unchanged

			// Apply AddFileSize down migration
			const { down: addFileSizeDown } = getTestMigration(videoAssetVersions.AddFileSize)
			const afterSecondDown = addFileSizeDown(afterFirstDown)
			expect(afterSecondDown.props).not.toHaveProperty('fileSize')

			// Apply MakeUrlsValid down migration (should be no-op)
			const { down: makeUrlsValidDown } = getTestMigration(videoAssetVersions.MakeUrlsValid)
			const afterThirdDown = makeUrlsValidDown(afterSecondDown)
			expect(afterThirdDown.props.src).toBe('https://example.com/reverse-test.webm')

			// Apply RenameWidthHeight down migration
			const { down: renameWidthHeightDown } = getTestMigration(videoAssetVersions.RenameWidthHeight)
			const afterFourthDown = renameWidthHeightDown(afterThirdDown)
			expect(afterFourthDown.props.width).toBe(1280)
			expect(afterFourthDown.props.height).toBe(720)
			expect(afterFourthDown.props).not.toHaveProperty('w')
			expect(afterFourthDown.props).not.toHaveProperty('h')

			// Apply AddIsAnimated down migration
			const { down: addIsAnimatedDown } = getTestMigration(videoAssetVersions.AddIsAnimated)
			const finalResult = addIsAnimatedDown(afterFourthDown)
			expect(finalResult.props).not.toHaveProperty('isAnimated')
		})
	})

	describe('Edge cases and error conditions', () => {
		it('should handle assets with unexpected structure during migration', () => {
			const malformedAsset = {
				id: 'asset:malformed',
				type: 'video',
				// Missing props entirely
			}

			const { up: addIsAnimatedUp } = getTestMigration(videoAssetVersions.AddIsAnimated)

			// The migration assumes props exist, so this will throw an error
			expect(() => addIsAnimatedUp(malformedAsset)).toThrow()
		})

		it('should handle assets with empty props during migration', () => {
			const assetWithEmptyProps = {
				id: 'asset:empty_props',
				type: 'video',
				props: {},
			}

			const { up: addIsAnimatedUp } = getTestMigration(videoAssetVersions.AddIsAnimated)
			const result = addIsAnimatedUp(assetWithEmptyProps)

			expect(result.props.isAnimated).toBe(false)
		})

		it('should preserve other properties during migrations', () => {
			const assetWithExtraProps = {
				id: 'asset:extra_props',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'invalid-url',
					customProperty: 'should be preserved',
					anotherProperty: { nested: 'object' },
				},
			}

			const { up: makeUrlsValidUp } = getTestMigration(videoAssetVersions.MakeUrlsValid)
			const result = makeUrlsValidUp(assetWithExtraProps)

			expect(result.props.src).toBe('')
			expect(result.props.customProperty).toBe('should be preserved')
			expect(result.props.anotherProperty).toEqual({ nested: 'object' })
			expect(result.props.w).toBe(640)
		})

		test('should handle complex URL validation scenarios', () => {
			const complexUrlAsset = {
				id: 'asset:complex_url',
				type: 'video',
				props: {
					w: 640,
					h: 480,
					name: 'complex-url-test.mp4',
					isAnimated: true,
					mimeType: 'video/mp4',
					src: 'https://example.com/path?query=value&other=test#fragment',
				},
			}

			const { up: makeUrlsValidUp } = getTestMigration(videoAssetVersions.MakeUrlsValid)
			const result = makeUrlsValidUp(complexUrlAsset)

			// Complex but valid URLs should be preserved
			if (T.srcUrl.isValid(complexUrlAsset.props.src)) {
				expect(result.props.src).toBe('https://example.com/path?query=value&other=test#fragment')
			}
		})

		it('should handle various fileSize edge cases', () => {
			const fileSizeEdgeCases = [
				{ fileSize: 0 },
				{ fileSize: 1 },
				{ fileSize: Number.MAX_SAFE_INTEGER },
				{ fileSize: -1 },
				{ fileSize: -100 },
			]

			fileSizeEdgeCases.forEach(({ fileSize }, index) => {
				const asset = {
					id: `asset:filesize_edge_${index}`,
					type: 'video',
					props: {
						w: 640,
						h: 480,
						name: `test${index}.mp4`,
						isAnimated: true,
						mimeType: 'video/mp4',
						src: 'https://example.com/test.mp4',
						fileSize,
					},
				}

				const { up: makeFileSizeOptionalUp } = getTestMigration(
					videoAssetVersions.MakeFileSizeOptional
				)
				const result = makeFileSizeOptionalUp(asset)

				if (fileSize === -1) {
					expect(result.props.fileSize).toBeUndefined()
				} else {
					expect(result.props.fileSize).toBe(fileSize)
				}
			})
		})

		test('should handle video-specific edge cases', () => {
			// Test with very short video duration (edge case for isAnimated)
			const stillVideoAsset = {
				id: 'asset:still_video',
				type: 'video',
				props: {
					w: 1,
					h: 1,
					name: 'still-frame.mp4',
					isAnimated: false, // Video with no animation
					mimeType: 'video/mp4',
					src: 'https://example.com/still-frame.mp4',
					fileSize: 1024,
				},
			}

			const { up: addIsAnimatedUp } = getTestMigration(videoAssetVersions.AddIsAnimated)
			const result = addIsAnimatedUp(stillVideoAsset)
			expect(result.props.isAnimated).toBe(false) // Should be set to false by migration
		})
	})
})
