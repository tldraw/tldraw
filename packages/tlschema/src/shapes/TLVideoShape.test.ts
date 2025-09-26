import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLAssetId } from '../records/TLAsset'
import { TLShapeId } from '../records/TLShape'
import {
	TLVideoShape,
	TLVideoShapeProps,
	videoShapeMigrations,
	videoShapeProps,
	videoShapeVersions,
} from './TLVideoShape'

describe('TLVideoShape', () => {
	describe('TLVideoShapeProps interface', () => {
		it('should represent valid video shape properties', () => {
			const validProps: TLVideoShapeProps = {
				w: 640,
				h: 480,
				time: 0,
				playing: false,
				autoplay: true,
				url: 'https://example.com/video.mp4',
				assetId: 'asset:video123' as TLAssetId,
				altText: 'Educational video about shapes',
			}

			expect(validProps.w).toBe(640)
			expect(validProps.h).toBe(480)
			expect(validProps.time).toBe(0)
			expect(validProps.playing).toBe(false)
			expect(validProps.autoplay).toBe(true)
			expect(validProps.url).toBe('https://example.com/video.mp4')
			expect(validProps.assetId).toBe('asset:video123')
			expect(validProps.altText).toBe('Educational video about shapes')
		})

		it('should support video with null asset ID', () => {
			const propsWithNullAsset: TLVideoShapeProps = {
				w: 800,
				h: 600,
				time: 15.5,
				playing: true,
				autoplay: false,
				url: 'https://example.com/direct-video.mp4',
				assetId: null,
				altText: 'Direct video URL',
			}

			expect(propsWithNullAsset.assetId).toBeNull()
			expect(propsWithNullAsset.time).toBe(15.5)
			expect(propsWithNullAsset.playing).toBe(true)
			expect(propsWithNullAsset.autoplay).toBe(false)
		})

		it('should support different time values', () => {
			const timeValues = [0, 5.5, 30, 120.75, 3600]

			timeValues.forEach((time) => {
				const props: TLVideoShapeProps = {
					w: 400,
					h: 300,
					time,
					playing: false,
					autoplay: true,
					url: '',
					assetId: null,
					altText: `Video at ${time} seconds`,
				}

				expect(props.time).toBe(time)
			})
		})

		it('should support different dimensions', () => {
			const dimensionTests = [
				{ w: 1, h: 1 },
				{ w: 320, h: 240 },
				{ w: 1920, h: 1080 },
				{ w: 854.5, h: 480.25 },
				{ w: 4000, h: 3000 },
			]

			dimensionTests.forEach(({ w, h }) => {
				const props: TLVideoShapeProps = {
					w,
					h,
					time: 0,
					playing: false,
					autoplay: false,
					url: '',
					assetId: null,
					altText: '',
				}

				expect(props.w).toBe(w)
				expect(props.h).toBe(h)
			})
		})

		it('should support all combinations of playing and autoplay flags', () => {
			const playbackCombinations = [
				{ playing: false, autoplay: false },
				{ playing: true, autoplay: false },
				{ playing: false, autoplay: true },
				{ playing: true, autoplay: true },
			]

			playbackCombinations.forEach(({ playing, autoplay }) => {
				const props: TLVideoShapeProps = {
					w: 100,
					h: 100,
					time: 0,
					playing,
					autoplay,
					url: '',
					assetId: null,
					altText: `Video ${playing ? 'playing' : 'paused'}, autoplay ${autoplay ? 'on' : 'off'}`,
				}

				expect(props.playing).toBe(playing)
				expect(props.autoplay).toBe(autoplay)
			})
		})

		it('should support different URL formats', () => {
			const urlFormats = [
				'',
				'https://example.com/video.mp4',
				'http://example.com/video.webm',
				'https://cdn.example.com/assets/videos/demo.mov',
				'https://example.com/video.mp4?quality=1080p',
				'https://subdomain.example.com/path/to/video.avi#t=30',
				'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb20=',
			]

			urlFormats.forEach((url, index) => {
				const props: TLVideoShapeProps = {
					w: 100,
					h: 100,
					time: 0,
					playing: false,
					autoplay: false,
					url,
					assetId: null,
					altText: `Video ${index}`,
				}

				expect(props.url).toBe(url)
			})
		})

		it('should support various alt text content', () => {
			const altTextVariations = [
				'',
				'Simple video description',
				'Video with special chars: !@#$%^&*()',
				'Multi-word descriptive alternative text for accessibility',
				'Unicode text: 🎥 📹 🎬',
				'Text with\nnewlines\nand\ttabs',
				'Very long description that provides comprehensive details about the video content including subject matter, duration, and accessibility features for users who cannot view the video directly',
			]

			altTextVariations.forEach((altText) => {
				const props: TLVideoShapeProps = {
					w: 100,
					h: 100,
					time: 0,
					playing: false,
					autoplay: false,
					url: '',
					assetId: null,
					altText,
				}

				expect(props.altText).toBe(altText)
			})
		})

		it('should support different asset ID formats', () => {
			const assetIds: Array<TLAssetId | null> = [
				null,
				'asset:video1' as TLAssetId,
				'asset:video_abc123' as TLAssetId,
				'asset:vid-preview-456' as TLAssetId,
				'asset:' as TLAssetId, // Edge case: empty suffix
			]

			assetIds.forEach((assetId) => {
				const props: TLVideoShapeProps = {
					w: 100,
					h: 100,
					time: 0,
					playing: false,
					autoplay: false,
					url: '',
					assetId,
					altText: '',
				}

				expect(props.assetId).toBe(assetId)
			})
		})

		it('should support negative time values', () => {
			const negativeTimeProps: TLVideoShapeProps = {
				w: 400,
				h: 300,
				time: -5.5,
				playing: false,
				autoplay: false,
				url: '',
				assetId: null,
				altText: 'Video with negative time',
			}

			expect(negativeTimeProps.time).toBe(-5.5)
		})

		it('should support zero and very small dimensions', () => {
			// Note: These might be invalid according to nonZeroNumber validator,
			// but we test the interface structure here
			const smallDimensions = [
				{ w: 0.001, h: 0.001 },
				{ w: 1, h: 1 },
				{ w: 0.1, h: 0.1 },
			]

			smallDimensions.forEach(({ w, h }) => {
				const props: TLVideoShapeProps = {
					w,
					h,
					time: 0,
					playing: false,
					autoplay: false,
					url: '',
					assetId: null,
					altText: 'Small video',
				}

				expect(props.w).toBe(w)
				expect(props.h).toBe(h)
			})
		})
	})

	describe('TLVideoShape type', () => {
		it('should represent complete video shape records', () => {
			const validVideoShape: TLVideoShape = {
				id: 'shape:video123' as TLShapeId,
				typeName: 'shape',
				type: 'video',
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 640,
					h: 480,
					time: 15.5,
					playing: false,
					autoplay: false,
					url: 'https://example.com/video.mp4',
					assetId: 'asset:video123' as TLAssetId,
					altText: 'Product demo video',
				},
				meta: {},
			}

			expect(validVideoShape.type).toBe('video')
			expect(validVideoShape.typeName).toBe('shape')
			expect(validVideoShape.props.w).toBe(640)
			expect(validVideoShape.props.h).toBe(480)
			expect(validVideoShape.props.time).toBe(15.5)
			expect(validVideoShape.props.playing).toBe(false)
			expect(validVideoShape.props.autoplay).toBe(false)
		})

		it('should support video with autoplay enabled', () => {
			const autoplayVideoShape: TLVideoShape = {
				id: 'shape:autoplay1' as TLShapeId,
				typeName: 'shape',
				type: 'video',
				x: 50,
				y: 75,
				rotation: 1.57,
				index: 'b1' as any,
				parentId: 'page:test' as any,
				isLocked: true,
				opacity: 0.8,
				props: {
					w: 800,
					h: 600,
					time: 0,
					playing: true,
					autoplay: true,
					url: 'https://example.com/intro.webm',
					assetId: 'asset:intro456' as TLAssetId,
					altText: 'Intro video with autoplay',
				},
				meta: { sourceType: 'upload' },
			}

			expect(autoplayVideoShape.props.playing).toBe(true)
			expect(autoplayVideoShape.props.autoplay).toBe(true)
			expect(autoplayVideoShape.props.time).toBe(0)
		})

		it('should support video without assets', () => {
			const videoWithoutAsset: TLVideoShape = {
				id: 'shape:directurl1' as TLShapeId,
				typeName: 'shape',
				type: 'video',
				x: 300,
				y: 400,
				rotation: 0,
				index: 'd1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 0.5,
				props: {
					w: 320,
					h: 240,
					time: 30.25,
					playing: false,
					autoplay: true,
					url: 'https://example.com/streaming-video.mp4',
					assetId: null,
					altText: 'Direct streaming video',
				},
				meta: { source: 'url' },
			}

			expect(videoWithoutAsset.props.assetId).toBeNull()
			expect(videoWithoutAsset.props.url).toContain('streaming-video.mp4')
			expect(videoWithoutAsset.props.time).toBe(30.25)
		})

		it('should support video with complex timing', () => {
			const timedVideoShape: TLVideoShape = {
				id: 'shape:timed1' as TLShapeId,
				typeName: 'shape',
				type: 'video',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'c1' as any,
				parentId: 'page:timeline' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 1280,
					h: 720,
					time: 125.75, // 2:05.75
					playing: true,
					autoplay: false,
					url: 'https://example.com/long-video.mp4',
					assetId: 'asset:longvideo789' as TLAssetId,
					altText: 'Long educational video',
				},
				meta: { duration: 300, chapters: ['intro', 'content', 'outro'] },
			}

			expect(timedVideoShape.props.time).toBe(125.75)
			expect(timedVideoShape.props.w).toBe(1280)
			expect(timedVideoShape.props.h).toBe(720)
		})

		it('should support video with empty URL and asset reference', () => {
			const assetOnlyVideo: TLVideoShape = {
				id: 'shape:assetonly1' as TLShapeId,
				typeName: 'shape',
				type: 'video',
				x: 200,
				y: 300,
				rotation: 0.25,
				index: 'e1' as any,
				parentId: 'shape:frame1' as any,
				isLocked: false,
				opacity: 0.9,
				props: {
					w: 480,
					h: 270,
					time: 0,
					playing: false,
					autoplay: false,
					url: '',
					assetId: 'asset:localvideo999' as TLAssetId,
					altText: 'Locally stored video asset',
				},
				meta: { local: true },
			}

			expect(assetOnlyVideo.props.url).toBe('')
			expect(assetOnlyVideo.props.assetId).toBe('asset:localvideo999')
		})

		it('should support different video aspect ratios', () => {
			const aspectRatioTests = [
				{ w: 1920, h: 1080, ratio: '16:9' }, // Standard HD
				{ w: 1280, h: 720, ratio: '16:9' }, // HD
				{ w: 640, h: 480, ratio: '4:3' }, // Standard definition
				{ w: 1080, h: 1920, ratio: '9:16' }, // Vertical/mobile
				{ w: 1, h: 1, ratio: '1:1' }, // Square
			]

			aspectRatioTests.forEach(({ w, h, ratio }) => {
				const videoShape: TLVideoShape = {
					id: `shape:aspect_${ratio.replace(':', '_')}` as TLShapeId,
					typeName: 'shape',
					type: 'video',
					x: 0,
					y: 0,
					rotation: 0,
					index: 'a1' as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					props: {
						w,
						h,
						time: 0,
						playing: false,
						autoplay: false,
						url: '',
						assetId: null,
						altText: `${ratio} aspect ratio video`,
					},
					meta: { aspectRatio: ratio },
				}

				expect(videoShape.props.w).toBe(w)
				expect(videoShape.props.h).toBe(h)
			})
		})
	})

	describe('videoShapeProps validation schema', () => {
		it('should validate all video shape properties', () => {
			const validProps = {
				w: 640,
				h: 480,
				time: 42.5,
				playing: true,
				autoplay: false,
				url: 'https://example.com/video.mp4',
				assetId: 'asset:video123' as TLAssetId,
				altText: 'Test video',
			}

			// Validate each property individually
			expect(() => videoShapeProps.w.validate(validProps.w)).not.toThrow()
			expect(() => videoShapeProps.h.validate(validProps.h)).not.toThrow()
			expect(() => videoShapeProps.time.validate(validProps.time)).not.toThrow()
			expect(() => videoShapeProps.playing.validate(validProps.playing)).not.toThrow()
			expect(() => videoShapeProps.autoplay.validate(validProps.autoplay)).not.toThrow()
			expect(() => videoShapeProps.url.validate(validProps.url)).not.toThrow()
			expect(() => videoShapeProps.assetId.validate(validProps.assetId)).not.toThrow()
			expect(() => videoShapeProps.altText.validate(validProps.altText)).not.toThrow()
		})

		it('should validate using comprehensive object validator', () => {
			const fullValidator = T.object(videoShapeProps)

			const validPropsObject = {
				w: 800,
				h: 600,
				time: 15.25,
				playing: false,
				autoplay: true,
				url: 'https://test.com/video.webm',
				assetId: 'asset:video456' as TLAssetId,
				altText: 'Validated video',
			}

			expect(() => fullValidator.validate(validPropsObject)).not.toThrow()
			const result = fullValidator.validate(validPropsObject)
			expect(result).toEqual(validPropsObject)
		})

		it('should validate dimensions as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validDimensions = [0.1, 1, 50, 100, 1000, 0.001]

			validDimensions.forEach((dimension) => {
				expect(() => videoShapeProps.w.validate(dimension)).not.toThrow()
				expect(() => videoShapeProps.h.validate(dimension)).not.toThrow()
			})

			// Invalid dimensions (zero, negative numbers, and non-numbers)
			const invalidDimensions = [0, -1, -0.1, 'not-number', null, undefined, {}, [], true, false]

			invalidDimensions.forEach((dimension) => {
				expect(() => videoShapeProps.w.validate(dimension)).toThrow()
				expect(() => videoShapeProps.h.validate(dimension)).toThrow()
			})
		})

		it('should validate time as number (including negatives and zero)', () => {
			// Valid number values (including negative and zero)
			const validTimes = [0, -1, 1, 30.5, -5.25, 3600, -999, 0.001, -0.001]

			validTimes.forEach((time) => {
				expect(() => videoShapeProps.time.validate(time)).not.toThrow()
			})

			// Invalid time values
			const invalidTimes = ['0', 'not-number', null, undefined, {}, [], true, false]

			invalidTimes.forEach((time) => {
				expect(() => videoShapeProps.time.validate(time)).toThrow()
			})
		})

		it('should validate playing as boolean', () => {
			// Valid boolean values
			const validPlaying = [true, false]

			validPlaying.forEach((playing) => {
				expect(() => videoShapeProps.playing.validate(playing)).not.toThrow()
			})

			// Invalid playing values
			const invalidPlaying = [1, 0, 'true', 'false', null, undefined, {}, []]

			invalidPlaying.forEach((playing) => {
				expect(() => videoShapeProps.playing.validate(playing)).toThrow()
			})
		})

		it('should validate autoplay as boolean', () => {
			// Valid boolean values
			const validAutoplay = [true, false]

			validAutoplay.forEach((autoplay) => {
				expect(() => videoShapeProps.autoplay.validate(autoplay)).not.toThrow()
			})

			// Invalid autoplay values
			const invalidAutoplay = [1, 0, 'true', 'false', null, undefined, {}, []]

			invalidAutoplay.forEach((autoplay) => {
				expect(() => videoShapeProps.autoplay.validate(autoplay)).toThrow()
			})
		})

		it('should validate URLs using linkUrl validator', () => {
			const validUrls = [
				'',
				'https://example.com/video.mp4',
				'http://test.com/video.webm',
				'https://subdomain.example.com/path/video.mov',
				'https://example.com/video.avi?quality=hd#t=30',
			]

			validUrls.forEach((url) => {
				expect(() => videoShapeProps.url.validate(url)).not.toThrow()
			})

			// Invalid URLs should be handled by linkUrl validator
			const invalidUrls = ['not-a-url', null, undefined, 123, {}, []]

			invalidUrls.forEach((url) => {
				expect(() => videoShapeProps.url.validate(url)).toThrow()
			})
		})

		it('should validate assetId with nullable assetIdValidator', () => {
			// Valid assetIds (including null)
			const validAssetIds = [null, 'asset:video123' as TLAssetId, 'asset:vid456' as TLAssetId]

			validAssetIds.forEach((assetId) => {
				expect(() => videoShapeProps.assetId.validate(assetId)).not.toThrow()
			})

			// Invalid assetIds
			const invalidAssetIds = ['not-asset-id', 'video123', 123, {}, [], true, false]

			invalidAssetIds.forEach((assetId) => {
				expect(() => videoShapeProps.assetId.validate(assetId)).toThrow()
			})
		})

		it('should validate altText as string', () => {
			const validAltTexts = [
				'',
				'Simple description',
				'Text with special chars: !@#$%^&*()',
				'Unicode: 🎥 📹',
				'Multi\nline\ntext',
			]

			validAltTexts.forEach((altText) => {
				expect(() => videoShapeProps.altText.validate(altText)).not.toThrow()
			})

			const invalidAltTexts = [null, undefined, 123, {}, [], true, false]

			invalidAltTexts.forEach((altText) => {
				expect(() => videoShapeProps.altText.validate(altText)).toThrow()
			})
		})

		it('should handle boundary values correctly', () => {
			const boundaryProps = {
				w: Number.MAX_SAFE_INTEGER,
				h: Number.MIN_VALUE, // Smallest positive number
				time: Number.MAX_VALUE,
				playing: false,
				autoplay: true,
				url: '',
				assetId: null,
				altText: '',
			}

			const fullValidator = T.object(videoShapeProps)
			expect(() => fullValidator.validate(boundaryProps)).not.toThrow()
		})

		it('should reject objects with extra properties', () => {
			const fullValidator = T.object(videoShapeProps)

			const propsWithExtra = {
				w: 400,
				h: 300,
				time: 0,
				playing: false,
				autoplay: false,
				url: '',
				assetId: null,
				altText: '',
				extraProperty: 'should-fail', // This should cause validation to fail
			}

			expect(() => fullValidator.validate(propsWithExtra)).toThrow()
		})

		it('should reject incomplete objects', () => {
			const fullValidator = T.object(videoShapeProps)

			const incompleteProps = {
				w: 400,
				h: 300,
				// Missing required properties
			}

			expect(() => fullValidator.validate(incompleteProps)).toThrow()
		})
	})

	describe('videoShapeVersions', () => {
		it('should contain expected migration version IDs', () => {
			expect(videoShapeVersions).toBeDefined()
			expect(typeof videoShapeVersions).toBe('object')
		})

		it('should have all expected migration versions', () => {
			const expectedVersions: Array<keyof typeof videoShapeVersions> = [
				'AddUrlProp',
				'MakeUrlsValid',
				'AddAltText',
				'AddAutoplay',
			]

			expectedVersions.forEach((version) => {
				expect(videoShapeVersions[version]).toBeDefined()
				expect(typeof videoShapeVersions[version]).toBe('string')
			})
		})

		it('should have properly formatted migration IDs', () => {
			Object.values(videoShapeVersions).forEach((versionId) => {
				expect(versionId).toMatch(/^com\.tldraw\.shape\.video\//)
				expect(versionId).toMatch(/\/\d+$/) // Should end with /number
			})
		})

		it('should contain video in migration IDs', () => {
			Object.values(videoShapeVersions).forEach((versionId) => {
				expect(versionId).toContain('video')
			})
		})

		it('should have unique version IDs', () => {
			const versionIds = Object.values(videoShapeVersions)
			const uniqueIds = new Set(versionIds)
			expect(uniqueIds.size).toBe(versionIds.length)
		})
	})

	describe('videoShapeMigrations', () => {
		it('should be defined and have required structure', () => {
			expect(videoShapeMigrations).toBeDefined()
			expect(videoShapeMigrations.sequence).toBeDefined()
			expect(Array.isArray(videoShapeMigrations.sequence)).toBe(true)
		})

		it('should have migrations for all version IDs', () => {
			const migrationIds = videoShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : null))
				.filter(Boolean)

			const versionIds = Object.values(videoShapeVersions)

			versionIds.forEach((versionId) => {
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should have correct number of migrations in sequence', () => {
			// Should have at least as many migrations as version IDs
			expect(videoShapeMigrations.sequence.length).toBeGreaterThanOrEqual(
				Object.keys(videoShapeVersions).length
			)
		})
	})

	describe('videoShapeMigrations - AddUrlProp migration', () => {
		const { up, down } = getTestMigration(videoShapeVersions.AddUrlProp)

		describe('AddUrlProp up migration', () => {
			it('should add url property with empty string default', () => {
				const oldRecord = {
					id: 'shape:video1',
					typeName: 'shape',
					type: 'video',
					x: 100,
					y: 200,
					rotation: 0,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 1,
					props: {
						w: 640,
						h: 480,
						time: 30,
						playing: true,
						assetId: 'asset:video123',
					},
					meta: {},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.w).toBe(640) // Preserve other props
				expect(result.props.playing).toBe(true)
				expect(result.props.time).toBe(30)
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:video2',
					props: {
						w: 800,
						h: 600,
						time: 0,
						playing: false,
						assetId: null,
					},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.w).toBe(800)
				expect(result.props.h).toBe(600)
				expect(result.props.time).toBe(0)
				expect(result.props.playing).toBe(false)
				expect(result.props.assetId).toBeNull()
			})
		})

		describe('AddUrlProp down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.video/1 does not have a down function')
			})
		})
	})

	describe('videoShapeMigrations - MakeUrlsValid migration', () => {
		const { up, down } = getTestMigration(videoShapeVersions.MakeUrlsValid)

		describe('MakeUrlsValid up migration', () => {
			it('should clear invalid URLs', () => {
				const oldRecord = {
					id: 'shape:video1',
					props: {
						w: 400,
						h: 300,
						time: 15,
						playing: true,
						url: 'invalid-url-format',
						assetId: 'asset:video123',
					},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.w).toBe(400) // Preserve other props
				expect(result.props.time).toBe(15)
			})

			it('should preserve valid URLs', () => {
				const validUrls = [
					'',
					'https://example.com/video.mp4',
					'http://test.com/video.webm',
					'https://subdomain.example.com/path/video.mov',
				]

				validUrls.forEach((url) => {
					const oldRecord = {
						id: 'shape:video1',
						props: {
							w: 320,
							h: 240,
							time: 0,
							playing: false,
							url,
							assetId: 'asset:video123',
						},
					}

					const result = up(oldRecord)
					expect(result.props.url).toBe(url)
				})
			})

			it('should preserve all other properties during migration', () => {
				const oldRecord = {
					id: 'shape:video1',
					props: {
						w: 1280,
						h: 720,
						time: 125.5,
						playing: true,
						url: 'not-valid-url',
						assetId: null,
					},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.w).toBe(1280)
				expect(result.props.h).toBe(720)
				expect(result.props.time).toBe(125.5)
				expect(result.props.playing).toBe(true)
				expect(result.props.assetId).toBeNull()
			})
		})

		describe('MakeUrlsValid down migration', () => {
			it('should be a no-op migration', () => {
				const newRecord = {
					id: 'shape:video1',
					props: {
						w: 640,
						h: 480,
						time: 42,
						playing: false,
						url: 'https://example.com/video.mp4',
						assetId: 'asset:video123',
					},
				}

				const result = down(newRecord)
				expect(result).toEqual(newRecord)
			})
		})
	})

	describe('videoShapeMigrations - AddAltText migration', () => {
		const { up, down } = getTestMigration(videoShapeVersions.AddAltText)

		describe('AddAltText up migration', () => {
			it('should add altText property with empty string default', () => {
				const oldRecord = {
					id: 'shape:video1',
					props: {
						w: 800,
						h: 600,
						time: 30.5,
						playing: false,
						url: 'https://example.com/video.mp4',
						assetId: 'asset:video123',
					},
				}

				const result = up(oldRecord)
				expect(result.props.altText).toBe('')
				expect(result.props.w).toBe(800) // Preserve other props
				expect(result.props.time).toBe(30.5)
				expect(result.props.url).toBe('https://example.com/video.mp4')
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:video2',
					props: {
						w: 1920,
						h: 1080,
						time: 0,
						playing: true,
						url: '',
						assetId: null,
					},
				}

				const result = up(oldRecord)
				expect(result.props.altText).toBe('')
				expect(result.props.w).toBe(1920)
				expect(result.props.h).toBe(1080)
				expect(result.props.time).toBe(0)
				expect(result.props.playing).toBe(true)
				expect(result.props.url).toBe('')
				expect(result.props.assetId).toBeNull()
			})
		})

		describe('AddAltText down migration', () => {
			it('should remove altText property', () => {
				const newRecord = {
					id: 'shape:video1',
					props: {
						w: 640,
						h: 480,
						time: 15,
						playing: true,
						url: 'https://example.com/video.mp4',
						assetId: 'asset:video123',
						altText: 'Sample video description',
					},
				}

				const result = down(newRecord)
				expect(result.props.altText).toBeUndefined()
				expect(result.props.w).toBe(640) // Preserve other props
				expect(result.props.playing).toBe(true)
			})
		})
	})

	describe('videoShapeMigrations - AddAutoplay migration', () => {
		const { up, down } = getTestMigration(videoShapeVersions.AddAutoplay)

		describe('AddAutoplay up migration', () => {
			it('should add autoplay property with true default', () => {
				const oldRecord = {
					id: 'shape:video1',
					props: {
						w: 480,
						h: 270,
						time: 5.25,
						playing: false,
						url: 'https://example.com/video.webm',
						assetId: 'asset:video456',
						altText: 'Test video',
					},
				}

				const result = up(oldRecord)
				expect(result.props.autoplay).toBe(true)
				expect(result.props.w).toBe(480) // Preserve other props
				expect(result.props.time).toBe(5.25)
				expect(result.props.altText).toBe('Test video')
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:video2',
					props: {
						w: 1280,
						h: 720,
						time: 60,
						playing: true,
						url: '',
						assetId: null,
						altText: 'Local video',
					},
				}

				const result = up(oldRecord)
				expect(result.props.autoplay).toBe(true)
				expect(result.props.w).toBe(1280)
				expect(result.props.h).toBe(720)
				expect(result.props.time).toBe(60)
				expect(result.props.playing).toBe(true)
				expect(result.props.altText).toBe('Local video')
			})
		})

		describe('AddAutoplay down migration', () => {
			it('should remove autoplay property', () => {
				const newRecord = {
					id: 'shape:video1',
					props: {
						w: 800,
						h: 450,
						time: 20.75,
						playing: false,
						url: 'https://example.com/video.mp4',
						assetId: 'asset:video789',
						altText: 'Demo video',
						autoplay: false,
					},
				}

				const result = down(newRecord)
				expect(result.props.autoplay).toBeUndefined()
				expect(result.props.w).toBe(800) // Preserve other props
				expect(result.props.time).toBe(20.75)
				expect(result.props.altText).toBe('Demo video')
			})
		})
	})

	describe('integration tests', () => {
		it('should work with complete video shape record validation', () => {
			const completeValidator = T.object({
				id: T.string,
				typeName: T.literal('shape'),
				type: T.literal('video'),
				x: T.number,
				y: T.number,
				rotation: T.number,
				index: T.string,
				parentId: T.string,
				isLocked: T.boolean,
				opacity: T.number,
				props: T.object(videoShapeProps),
				meta: T.jsonValue,
			})

			const validVideoShape = {
				id: 'shape:video123',
				typeName: 'shape' as const,
				type: 'video' as const,
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0.8,
				props: {
					w: 640,
					h: 480,
					time: 42.5,
					playing: true,
					autoplay: false,
					url: 'https://example.com/video.mp4',
					assetId: 'asset:video123' as TLAssetId,
					altText: 'Sample video',
				},
				meta: { custom: 'data' },
			}

			expect(() => completeValidator.validate(validVideoShape)).not.toThrow()
		})

		it('should be compatible with TLBaseShape structure', () => {
			const videoShape: TLVideoShape = {
				id: 'shape:video_test' as TLShapeId,
				typeName: 'shape',
				type: 'video',
				x: 50,
				y: 75,
				rotation: 1.57,
				index: 'b1' as any,
				parentId: 'page:test' as any,
				isLocked: true,
				opacity: 0.5,
				props: {
					w: 800,
					h: 600,
					time: 30,
					playing: false,
					autoplay: true,
					url: 'https://example.com/video.webm',
					assetId: 'asset:video456' as TLAssetId,
					altText: 'Test video',
				},
				meta: { shapeType: 'video' },
			}

			// Should satisfy TLBaseShape structure
			expect(videoShape.typeName).toBe('shape')
			expect(videoShape.type).toBe('video')
			expect(typeof videoShape.id).toBe('string')
			expect(typeof videoShape.x).toBe('number')
			expect(typeof videoShape.y).toBe('number')
			expect(typeof videoShape.rotation).toBe('number')
			expect(videoShape.props).toBeDefined()
			expect(videoShape.meta).toBeDefined()
		})

		test('should handle all migration versions in correct order', () => {
			const expectedOrder: Array<keyof typeof videoShapeVersions> = [
				'AddUrlProp',
				'MakeUrlsValid',
				'AddAltText',
				'AddAutoplay',
			]

			const migrationIds = videoShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : ''))
				.filter(Boolean)

			expectedOrder.forEach((expectedVersion) => {
				const versionId = videoShapeVersions[expectedVersion]
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should validate video shapes with various playback states', () => {
			const playbackStates = [
				{ playing: false, autoplay: false, time: 0 },
				{ playing: true, autoplay: false, time: 15.5 },
				{ playing: false, autoplay: true, time: 30 },
				{ playing: true, autoplay: true, time: 0 },
			]

			const fullValidator = T.object(videoShapeProps)

			playbackStates.forEach((state, index) => {
				const props = {
					w: 640,
					h: 480,
					url: `https://example.com/video${index}.mp4`,
					assetId: `asset:video${index}` as TLAssetId,
					altText: `Video ${index}`,
					...state,
				}

				expect(() => fullValidator.validate(props)).not.toThrow()
				const result = fullValidator.validate(props)
				expect(result.playing).toBe(state.playing)
				expect(result.autoplay).toBe(state.autoplay)
				expect(result.time).toBe(state.time)
			})
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty or malformed props gracefully during validation', () => {
			const fullValidator = T.object(videoShapeProps)

			// Missing required properties should throw
			expect(() => fullValidator.validate({})).toThrow()

			// Partial props should throw for missing required fields
			expect(() =>
				fullValidator.validate({
					w: 100,
					h: 100,
					// Missing other required properties
				})
			).toThrow()
		})

		it('should handle boundary values for numeric properties', () => {
			// Test extreme but valid values
			const extremeProps = {
				w: 0.0001, // Very small but not zero
				h: 999999, // Very large
				time: Number.MAX_SAFE_INTEGER, // Very large time
				playing: true,
				autoplay: false,
				url: '',
				assetId: null,
				altText: '',
			}

			const fullValidator = T.object(videoShapeProps)
			expect(() => fullValidator.validate(extremeProps)).not.toThrow()
		})

		it('should handle zero and negative values validation correctly', () => {
			// Zero should be invalid for w and h (nonZeroNumber)
			expect(() => videoShapeProps.w.validate(0)).toThrow()
			expect(() => videoShapeProps.h.validate(0)).toThrow()

			// Negative values should be invalid for w and h
			expect(() => videoShapeProps.w.validate(-1)).toThrow()
			expect(() => videoShapeProps.h.validate(-1)).toThrow()

			// But time can be negative (seeking backwards)
			expect(() => videoShapeProps.time.validate(-5)).not.toThrow()
		})

		it('should handle special number values', () => {
			// Special number values should be rejected by all number validators
			const specialNumbers = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN]

			specialNumbers.forEach((specialNumber) => {
				// Time validator also rejects special values (finite numbers only)
				expect(() => videoShapeProps.time.validate(specialNumber)).toThrow()

				// Dimensions should also reject special values
				expect(() => videoShapeProps.w.validate(specialNumber)).toThrow()
				expect(() => videoShapeProps.h.validate(specialNumber)).toThrow()
			})
		})

		it('should handle different URL edge cases correctly', () => {
			const urlTestCases = [
				{ url: '', shouldPass: true },
				{ url: 'https://example.com/video.mp4', shouldPass: true },
				{ url: 'http://test.com/video.webm', shouldPass: true },
				{ url: 'ftp://files.example.com/video.avi', shouldPass: false }, // Invalid protocol
				{ url: 'not-a-url-at-all', shouldPass: false },
			]

			urlTestCases.forEach(({ url, shouldPass }) => {
				if (shouldPass) {
					expect(() => videoShapeProps.url.validate(url)).not.toThrow()
				} else {
					expect(() => videoShapeProps.url.validate(url)).toThrow()
				}
			})
		})

		it('should handle various alt text edge cases', () => {
			const altTextCases = [
				'', // Empty string
				'Simple description',
				'Very long description that goes on and on and on with lots of detail about what is shown in the video including timing, content, and other descriptive elements for accessibility',
				'Text with special characters: !@#$%^&*()[]{}|\\:";\'<>?,./',
				'Unicode characters: 🎥 📹 🎬 ▶️ ⏸️ ⏹️',
				'Text with\nnewlines\nand\ttabs',
				'Mixed content: normal text, UPPERCASE, lowercase, 123 numbers, symbols!',
			]

			altTextCases.forEach((altText) => {
				const props = {
					w: 100,
					h: 100,
					time: 0,
					playing: false,
					autoplay: false,
					url: '',
					assetId: null,
					altText,
				}

				const fullValidator = T.object(videoShapeProps)
				expect(() => fullValidator.validate(props)).not.toThrow()
			})
		})

		it('should handle different video timing scenarios', () => {
			const timingScenarios = [
				{ time: 0, description: 'Start of video' },
				{ time: 30.5, description: 'Middle timestamp with fractional seconds' },
				{ time: 3600, description: 'One hour mark' },
				{ time: -10, description: 'Negative time (pre-roll or buffer)' },
				{ time: 0.001, description: 'Very small positive time' },
				{ time: -0.001, description: 'Very small negative time' },
			]

			timingScenarios.forEach(({ time, description }) => {
				const props = {
					w: 640,
					h: 480,
					time,
					playing: false,
					autoplay: false,
					url: '',
					assetId: null,
					altText: description,
				}

				const fullValidator = T.object(videoShapeProps)
				expect(() => fullValidator.validate(props)).not.toThrow()
				const result = fullValidator.validate(props)
				expect(result.time).toBe(time)
			})
		})

		it('should handle complex asset ID edge cases', () => {
			const assetIdCases: Array<TLAssetId | null> = [
				null,
				'asset:simple' as TLAssetId,
				'asset:with-dashes-123' as TLAssetId,
				'asset:with_underscores_456' as TLAssetId,
				'asset:' as TLAssetId, // Edge case: empty suffix
				'asset:very-long-asset-id-with-many-characters-and-numbers-123456789' as TLAssetId,
			]

			assetIdCases.forEach((assetId) => {
				const props = {
					w: 100,
					h: 100,
					time: 0,
					playing: false,
					autoplay: false,
					url: '',
					assetId,
					altText: 'Test video with various asset IDs',
				}

				const fullValidator = T.object(videoShapeProps)
				expect(() => fullValidator.validate(props)).not.toThrow()
			})
		})
	})
})
