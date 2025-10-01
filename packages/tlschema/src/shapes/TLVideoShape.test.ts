import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLAssetId } from '../records/TLAsset'
import { videoShapeMigrations, videoShapeProps, videoShapeVersions } from './TLVideoShape'

describe('TLVideoShape', () => {
	describe('videoShapeProps validation', () => {
		it('should validate dimensions as nonZeroNumber', () => {
			expect(() => videoShapeProps.w.validate(1)).not.toThrow()
			expect(() => videoShapeProps.h.validate(100)).not.toThrow()
			expect(() => videoShapeProps.w.validate(0)).toThrow()
			expect(() => videoShapeProps.h.validate(-1)).toThrow()
		})

		it('should validate time as number including negatives', () => {
			expect(() => videoShapeProps.time.validate(0)).not.toThrow()
			expect(() => videoShapeProps.time.validate(-5)).not.toThrow()
			expect(() => videoShapeProps.time.validate(30.5)).not.toThrow()
			expect(() => videoShapeProps.time.validate('not-number')).toThrow()
		})

		it('should validate boolean properties', () => {
			expect(() => videoShapeProps.playing.validate(true)).not.toThrow()
			expect(() => videoShapeProps.autoplay.validate(false)).not.toThrow()
			expect(() => videoShapeProps.playing.validate('true')).toThrow()
		})

		it('should validate URLs and assetIds', () => {
			expect(() => videoShapeProps.url.validate('')).not.toThrow()
			expect(() => videoShapeProps.url.validate('https://example.com/video.mp4')).not.toThrow()
			expect(() => videoShapeProps.assetId.validate(null)).not.toThrow()
			expect(() => videoShapeProps.assetId.validate('asset:video123' as TLAssetId)).not.toThrow()
			expect(() => videoShapeProps.altText.validate('Alt text')).not.toThrow()
		})

		it('should validate complete props object', () => {
			const validator = T.object(videoShapeProps)
			const validProps = {
				w: 640,
				h: 480,
				time: 0,
				playing: false,
				autoplay: true,
				url: 'https://example.com/video.mp4',
				assetId: 'asset:video123' as TLAssetId,
				altText: 'Test video',
			}
			expect(() => validator.validate(validProps)).not.toThrow()
		})
	})

	describe('videoShapeVersions', () => {
		it('should have expected migration versions', () => {
			expect(videoShapeVersions.AddUrlProp).toBeDefined()
			expect(videoShapeVersions.MakeUrlsValid).toBeDefined()
			expect(videoShapeVersions.AddAltText).toBeDefined()
			expect(videoShapeVersions.AddAutoplay).toBeDefined()
		})
	})

	describe('videoShapeMigrations', () => {
		it('should add url property in AddUrlProp migration', () => {
			const { up } = getTestMigration(videoShapeVersions.AddUrlProp)
			const oldRecord = {
				props: { w: 640, h: 480, time: 30, playing: true, assetId: 'asset:video123' },
			}
			const result = up(oldRecord)
			expect(result.props.url).toBe('')
			expect(result.props.w).toBe(640)
		})

		it('should clear invalid URLs in MakeUrlsValid migration', () => {
			const { up } = getTestMigration(videoShapeVersions.MakeUrlsValid)
			const oldRecord = {
				props: { url: 'invalid-url', w: 400, h: 300 },
			}
			const result = up(oldRecord)
			expect(result.props.url).toBe('')
		})

		it('should add altText in AddAltText migration', () => {
			const { up, down } = getTestMigration(videoShapeVersions.AddAltText)
			const oldRecord = { props: { w: 800, h: 600 } }
			const result = up(oldRecord)
			expect(result.props.altText).toBe('')

			// Test down migration removes altText
			const newRecord = { props: { w: 640, h: 480, altText: 'Test' } }
			const downResult = down(newRecord)
			expect(downResult.props.altText).toBeUndefined()
		})

		it('should add autoplay in AddAutoplay migration', () => {
			const { up, down } = getTestMigration(videoShapeVersions.AddAutoplay)
			const oldRecord = { props: { w: 480, h: 270 } }
			const result = up(oldRecord)
			expect(result.props.autoplay).toBe(true)

			// Test down migration removes autoplay
			const newRecord = { props: { w: 800, h: 450, autoplay: false } }
			const downResult = down(newRecord)
			expect(downResult.props.autoplay).toBeUndefined()
		})

		it('should have migrations for all versions', () => {
			expect(videoShapeMigrations.sequence).toBeDefined()
			expect(Array.isArray(videoShapeMigrations.sequence)).toBe(true)
			expect(videoShapeMigrations.sequence.length).toBeGreaterThanOrEqual(4)
		})
	})
})
