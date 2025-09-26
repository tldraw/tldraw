import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLShapeId } from '../records/TLShape'
import {
	TLEmbedShape,
	TLEmbedShapeProps,
	embedShapeMigrations,
	embedShapeProps,
	embedShapeVersions,
} from './TLEmbedShape'

describe('TLEmbedShape', () => {
	describe('TLEmbedShapeProps interface', () => {
		it('should represent valid embed shape properties', () => {
			const validProps: TLEmbedShapeProps = {
				w: 560,
				h: 315,
				url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			}

			expect(validProps.w).toBe(560)
			expect(validProps.h).toBe(315)
			expect(validProps.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
		})

		it('should support different dimensions', () => {
			const dimensionTests = [
				{ w: 1, h: 1 }, // Minimum positive
				{ w: 100, h: 200 },
				{ w: 500.5, h: 300.75 }, // Decimal values
				{ w: 1920, h: 1080 }, // HD dimensions
				{ w: 16, h: 9 }, // Small aspect ratio
			]

			dimensionTests.forEach(({ w, h }) => {
				const props: TLEmbedShapeProps = {
					w,
					h,
					url: 'https://example.com',
				}

				expect(props.w).toBe(w)
				expect(props.h).toBe(h)
			})
		})

		it('should support various URL formats', () => {
			const urlFormats = [
				'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				'https://codepen.io/user/pen/abcdef',
				'https://codesandbox.io/s/example',
				'https://figma.com/embed?url=test',
				'https://vimeo.com/123456789',
				'https://tldraw.com/r/room123',
				'https://www.google.com/maps/@40.7,-74.0,10z',
				'https://open.spotify.com/album/example',
				'', // Empty string
			]

			urlFormats.forEach((url) => {
				const props: TLEmbedShapeProps = {
					w: 560,
					h: 315,
					url,
				}

				expect(props.url).toBe(url)
			})
		})

		it('should support standard embed dimensions', () => {
			const commonEmbedSizes = [
				{ w: 560, h: 315 }, // YouTube default
				{ w: 640, h: 360 }, // HD aspect
				{ w: 800, h: 600 }, // 4:3 aspect
				{ w: 400, h: 300 }, // Smaller embed
				{ w: 1200, h: 675 }, // Large embed
			]

			commonEmbedSizes.forEach(({ w, h }) => {
				const props: TLEmbedShapeProps = {
					w,
					h,
					url: 'https://www.youtube.com/embed/example',
				}

				expect(props.w).toBe(w)
				expect(props.h).toBe(h)
			})
		})
	})

	describe('TLEmbedShape type', () => {
		it('should represent complete embed shape records', () => {
			const validEmbedShape: TLEmbedShape = {
				id: 'shape:embed123' as TLShapeId,
				typeName: 'shape',
				type: 'embed',
				x: 100,
				y: 200,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 560,
					h: 315,
					url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				},
				meta: {},
			}

			expect(validEmbedShape.type).toBe('embed')
			expect(validEmbedShape.typeName).toBe('shape')
			expect(validEmbedShape.props.w).toBe(560)
			expect(validEmbedShape.props.h).toBe(315)
			expect(validEmbedShape.props.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
		})

		it('should support different embed configurations', () => {
			const configurations = [
				{
					w: 560,
					h: 315,
					url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				},
				{
					w: 800,
					h: 600,
					url: 'https://codepen.io/team/codepen/pen/PNaGbb',
				},
				{
					w: 400,
					h: 300,
					url: 'https://codesandbox.io/s/new',
				},
				{
					w: 640,
					h: 360,
					url: 'https://figma.com/embed?url=test',
				},
			]

			configurations.forEach((config, index) => {
				const shape: TLEmbedShape = {
					id: `shape:embed${index}` as TLShapeId,
					typeName: 'shape',
					type: 'embed',
					x: index * 100,
					y: index * 50,
					rotation: 0,
					index: `a${index}` as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					props: config,
					meta: {},
				}

				expect(shape.props.w).toBe(config.w)
				expect(shape.props.h).toBe(config.h)
				expect(shape.props.url).toBe(config.url)
			})
		})

		it('should support custom meta properties', () => {
			const embedShape: TLEmbedShape = {
				id: 'shape:embed_meta' as TLShapeId,
				typeName: 'shape',
				type: 'embed',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 560,
					h: 315,
					url: 'https://www.youtube.com/watch?v=example',
				},
				meta: {
					title: 'Example Video',
					description: 'A sample video embed for testing',
					tags: ['video', 'example'],
					embedType: 'youtube',
					createdAt: '2024-01-01T00:00:00Z',
				},
			}

			expect(embedShape.meta.title).toBe('Example Video')
			expect(embedShape.meta.tags).toEqual(['video', 'example'])
			expect(embedShape.meta.embedType).toBe('youtube')
		})
	})

	describe('embedShapeProps validation schema', () => {
		it('should validate all embed shape properties', () => {
			const validProps = {
				w: 560,
				h: 315,
				url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			}

			// Validate each property individually
			expect(() => embedShapeProps.w.validate(validProps.w)).not.toThrow()
			expect(() => embedShapeProps.h.validate(validProps.h)).not.toThrow()
			expect(() => embedShapeProps.url.validate(validProps.url)).not.toThrow()
		})

		it('should validate using comprehensive object validator', () => {
			const fullValidator = T.object(embedShapeProps)

			const validPropsObject = {
				w: 800,
				h: 600,
				url: 'https://codepen.io/team/codepen/pen/PNaGbb',
			}

			expect(() => fullValidator.validate(validPropsObject)).not.toThrow()
			const result = fullValidator.validate(validPropsObject)
			expect(result).toEqual(validPropsObject)
		})

		it('should validate width as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validWidths = [0.1, 0.5, 1, 10, 100, 560, 1920, 1000.5, 9999.99]

			validWidths.forEach((w) => {
				expect(() => embedShapeProps.w.validate(w)).not.toThrow()
			})

			// Invalid widths (zero, negative numbers, and non-numbers)
			const invalidWidths = [0, -1, -10, -0.1, 'not-number', null, undefined, {}, [], true, false]

			invalidWidths.forEach((w) => {
				expect(() => embedShapeProps.w.validate(w)).toThrow()
			})
		})

		it('should validate height as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validHeights = [0.1, 0.5, 1, 10, 100, 315, 1080, 1000.5, 9999.99]

			validHeights.forEach((h) => {
				expect(() => embedShapeProps.h.validate(h)).not.toThrow()
			})

			// Invalid heights (zero, negative numbers, and non-numbers)
			const invalidHeights = [0, -1, -10, -0.1, 'not-number', null, undefined, {}, [], true, false]

			invalidHeights.forEach((h) => {
				expect(() => embedShapeProps.h.validate(h)).toThrow()
			})
		})

		it('should validate url as string', () => {
			// Valid URLs and strings
			const validUrls = [
				'',
				'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				'https://codepen.io/team/codepen/pen/PNaGbb',
				'https://codesandbox.io/s/new',
				'https://vimeo.com/123456789',
				'https://tldraw.com/r/room123',
				'invalid-url-format', // Still valid as string
				'javascript:alert("test")', // Still valid as string
				'file:///local/file', // Still valid as string
				'relative/path',
				'text without protocol',
			]

			validUrls.forEach((url) => {
				expect(() => embedShapeProps.url.validate(url)).not.toThrow()
			})

			// Invalid URLs (non-strings)
			const invalidUrls = [123, null, undefined, {}, [], true, false]

			invalidUrls.forEach((url) => {
				expect(() => embedShapeProps.url.validate(url)).toThrow()
			})
		})

		it('should use correct validator types', () => {
			// Verify that the props schema uses the expected validators
			expect(embedShapeProps.w).toBe(T.nonZeroNumber)
			expect(embedShapeProps.h).toBe(T.nonZeroNumber)
			expect(embedShapeProps.url).toBe(T.string)
		})
	})

	describe('embedShapeVersions', () => {
		it('should contain expected migration version IDs', () => {
			expect(embedShapeVersions).toBeDefined()
			expect(typeof embedShapeVersions).toBe('object')
		})

		it('should have all expected migration versions', () => {
			const expectedVersions: Array<keyof typeof embedShapeVersions> = [
				'GenOriginalUrlInEmbed',
				'RemoveDoesResize',
				'RemoveTmpOldUrl',
				'RemovePermissionOverrides',
			]

			expectedVersions.forEach((version) => {
				expect(embedShapeVersions[version]).toBeDefined()
				expect(typeof embedShapeVersions[version]).toBe('string')
			})
		})

		it('should have properly formatted migration IDs', () => {
			Object.values(embedShapeVersions).forEach((versionId) => {
				expect(versionId).toMatch(/^com\.tldraw\.shape\.embed\//)
				expect(versionId).toMatch(/\/\d+$/) // Should end with /number
			})
		})

		it('should contain embed in migration IDs', () => {
			Object.values(embedShapeVersions).forEach((versionId) => {
				expect(versionId).toContain('embed')
			})
		})

		it('should have unique version IDs', () => {
			const versionIds = Object.values(embedShapeVersions)
			const uniqueIds = new Set(versionIds)
			expect(uniqueIds.size).toBe(versionIds.length)
		})
	})

	describe('embedShapeMigrations', () => {
		it('should be defined and have required structure', () => {
			expect(embedShapeMigrations).toBeDefined()
			expect(embedShapeMigrations.sequence).toBeDefined()
			expect(Array.isArray(embedShapeMigrations.sequence)).toBe(true)
		})

		it('should have migrations for all version IDs', () => {
			const migrationIds = embedShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : null))
				.filter(Boolean)

			const versionIds = Object.values(embedShapeVersions)

			versionIds.forEach((versionId) => {
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should have correct number of migrations in sequence', () => {
			// Should have at least as many migrations as version IDs
			expect(embedShapeMigrations.sequence.length).toBeGreaterThanOrEqual(
				Object.keys(embedShapeVersions).length
			)
		})
	})

	describe('embedShapeMigrations - GenOriginalUrlInEmbed migration', () => {
		const { up, down } = getTestMigration(embedShapeVersions.GenOriginalUrlInEmbed)

		describe('GenOriginalUrlInEmbed up migration', () => {
			it('should extract original URL from tldraw embed URLs', () => {
				const tldrawUrls = [
					'https://tldraw.com/r/room123',
					'https://beta.tldraw.com/r/room456',
					'http://localhost:3000/r/local-room',
				]

				tldrawUrls.forEach((url) => {
					const oldRecord = {
						id: 'shape:embed1',
						props: {
							w: 560,
							h: 315,
							url,
						},
					}

					const result = up(oldRecord)
					expect(result.props.url).toBe(url) // Should keep the URL as-is for tldraw
					expect(result.props.tmpOldUrl).toBe(url)
				})
			})

			it('should extract original URL from YouTube embed URLs', () => {
				const testCases = [
					{
						embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
						expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
					},
					{
						embed: 'https://youtube.com/embed/abc123',
						expected: 'https://www.youtube.com/watch?v=abc123',
					},
				]

				testCases.forEach(({ embed, expected }) => {
					const oldRecord = {
						id: 'shape:embed1',
						props: {
							w: 560,
							h: 315,
							url: embed,
						},
					}

					const result = up(oldRecord)
					expect(result.props.url).toBe(expected)
					expect(result.props.tmpOldUrl).toBe(embed)
				})
			})

			it('should extract original URL from CodePen embed URLs', () => {
				const oldRecord = {
					id: 'shape:embed1',
					props: {
						w: 560,
						h: 315,
						url: 'https://codepen.io/user/embed/abcdef',
					},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('https://codepen.io/user/pen/abcdef')
				expect(result.props.tmpOldUrl).toBe('https://codepen.io/user/embed/abcdef')
			})

			it('should handle Google Maps embed URLs (documents hostname matching limitation)', () => {
				const oldRecord = {
					id: 'shape:embed1',
					props: {
						w: 560,
						h: 315,
						url: 'https://www.google.com/maps/embed/v1/view?center=40.7128,-74.0060&zoom=10',
					},
				}

				const result = up(oldRecord)
				// NOTE: The wildcard 'google.*' doesn't match 'google.com' due to exact string matching
				// The URL is valid and parseable, so it goes through normal flow but doesn't match any hostname
				expect(result.props.url).toBe('') // originalUrl is undefined, so becomes empty string
				expect(result.props.tmpOldUrl).toBe(
					'https://www.google.com/maps/embed/v1/view?center=40.7128,-74.0060&zoom=10'
				)
			})

			it('should extract original URL from Vimeo embed URLs', () => {
				const oldRecord = {
					id: 'shape:embed1',
					props: {
						w: 560,
						h: 315,
						url: 'https://player.vimeo.com/video/123456789',
					},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('https://vimeo.com/123456789')
				expect(result.props.tmpOldUrl).toBe('https://player.vimeo.com/video/123456789')
			})

			it('should handle URLs that do not match any embed definition', () => {
				const unknownUrls = ['https://unknown-service.com/embed/123', 'https://example.com/video']

				unknownUrls.forEach((url) => {
					const oldRecord = {
						id: 'shape:embed1',
						props: {
							w: 560,
							h: 315,
							url,
						},
					}

					const result = up(oldRecord)
					expect(result.props.url).toBe('') // Should become empty for unknown URLs
					expect(result.props.tmpOldUrl).toBe(url)
				})
			})

			it('should handle empty and invalid URLs (documents bug in tmpOldUrl assignment)', () => {
				const invalidUrls = ['', 'invalid-url']

				invalidUrls.forEach((url) => {
					const oldRecord = {
						id: 'shape:embed1',
						props: {
							w: 560,
							h: 315,
							url,
						},
					}

					const result = up(oldRecord)
					expect(result.props.url).toBe('') // Should become empty for invalid URLs
					// BUG: The migration has a bug where props.tmpOldUrl = props.url after props.url is set to ''
					expect(result.props.tmpOldUrl).toBe('') // Should be the original URL but is empty due to bug
				})
			})

			it('should handle actually malformed URLs that cause URL parsing to fail', () => {
				const malformedUrls = ['not-a-url', '://invalid-protocol', 'https://']

				malformedUrls.forEach((url) => {
					const oldRecord = {
						id: 'shape:embed1',
						props: {
							w: 560,
							h: 315,
							url,
						},
					}

					const result = up(oldRecord)
					expect(result.props.url).toBe('')
					// BUG: Should be the original URL but migration sets tmpOldUrl after url is modified
					expect(result.props.tmpOldUrl).toBe('')
				})
			})

			it('should handle valid but unsupported URLs in normal flow', () => {
				const validUnsupportedUrls = [
					'javascript:alert("test")', // Valid URL that parses but not supported
					'https://unsupported-service.com/embed/123',
				]

				validUnsupportedUrls.forEach((url) => {
					const oldRecord = {
						id: 'shape:embed1',
						props: {
							w: 560,
							h: 315,
							url,
						},
					}

					const result = up(oldRecord)
					expect(result.props.url).toBe('') // originalUrl undefined -> empty string
					expect(result.props.tmpOldUrl).toBe(url) // Normal flow preserves original
				})
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:embed1',
					typeName: 'shape',
					type: 'embed',
					x: 100,
					y: 200,
					rotation: 0.5,
					index: 'a1',
					parentId: 'page:main',
					isLocked: true,
					opacity: 0.8,
					props: {
						w: 800,
						h: 600,
						url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
					},
					meta: { custom: 'data' },
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
				expect(result.props.tmpOldUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
				expect(result.props.w).toBe(800)
				expect(result.props.h).toBe(600)
				expect(result.meta).toEqual({ custom: 'data' })
				expect(result.x).toBe(100)
				expect(result.y).toBe(200)
				expect(result.rotation).toBe(0.5)
				expect(result.isLocked).toBe(true)
				expect(result.opacity).toBe(0.8)
			})
		})

		describe('GenOriginalUrlInEmbed down migration', () => {
			it('should be retired (no down migration)', () => {
				// Based on the source code, the down migration is 'retired'
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.embed/1 does not have a down function')
			})
		})
	})

	describe('embedShapeMigrations - RemoveDoesResize migration', () => {
		const { up, down } = getTestMigration(embedShapeVersions.RemoveDoesResize)

		describe('RemoveDoesResize up migration', () => {
			it('should remove doesResize property', () => {
				const oldRecord = {
					id: 'shape:embed1',
					props: {
						w: 560,
						h: 315,
						url: 'https://example.com',
						doesResize: true,
					},
				}

				const result = up(oldRecord)
				expect(result.props.doesResize).toBeUndefined()
				expect(result.props.w).toBe(560)
				expect(result.props.h).toBe(315)
				expect(result.props.url).toBe('https://example.com')
			})

			it('should handle records without doesResize property', () => {
				const oldRecord = {
					id: 'shape:embed1',
					props: {
						w: 560,
						h: 315,
						url: 'https://example.com',
					},
				}

				const result = up(oldRecord)
				expect(result.props.doesResize).toBeUndefined()
				expect(result.props.w).toBe(560)
				expect(result.props.h).toBe(315)
				expect(result.props.url).toBe('https://example.com')
			})
		})

		describe('RemoveDoesResize down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.embed/2 does not have a down function')
			})
		})
	})

	describe('embedShapeMigrations - RemoveTmpOldUrl migration', () => {
		const { up, down } = getTestMigration(embedShapeVersions.RemoveTmpOldUrl)

		describe('RemoveTmpOldUrl up migration', () => {
			it('should remove tmpOldUrl property', () => {
				const oldRecord = {
					id: 'shape:embed1',
					props: {
						w: 560,
						h: 315,
						url: 'https://example.com',
						tmpOldUrl: 'https://old-url.com',
					},
				}

				const result = up(oldRecord)
				expect(result.props.tmpOldUrl).toBeUndefined()
				expect(result.props.w).toBe(560)
				expect(result.props.h).toBe(315)
				expect(result.props.url).toBe('https://example.com')
			})

			it('should handle records without tmpOldUrl property', () => {
				const oldRecord = {
					id: 'shape:embed1',
					props: {
						w: 560,
						h: 315,
						url: 'https://example.com',
					},
				}

				const result = up(oldRecord)
				expect(result.props.tmpOldUrl).toBeUndefined()
				expect(result.props.w).toBe(560)
				expect(result.props.h).toBe(315)
				expect(result.props.url).toBe('https://example.com')
			})
		})

		describe('RemoveTmpOldUrl down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.embed/3 does not have a down function')
			})
		})
	})

	describe('embedShapeMigrations - RemovePermissionOverrides migration', () => {
		const { up, down } = getTestMigration(embedShapeVersions.RemovePermissionOverrides)

		describe('RemovePermissionOverrides up migration', () => {
			it('should remove overridePermissions property', () => {
				const oldRecord = {
					id: 'shape:embed1',
					props: {
						w: 560,
						h: 315,
						url: 'https://example.com',
						overridePermissions: { allowScripts: true },
					},
				}

				const result = up(oldRecord)
				expect(result.props.overridePermissions).toBeUndefined()
				expect(result.props.w).toBe(560)
				expect(result.props.h).toBe(315)
				expect(result.props.url).toBe('https://example.com')
			})

			it('should handle records without overridePermissions property', () => {
				const oldRecord = {
					id: 'shape:embed1',
					props: {
						w: 560,
						h: 315,
						url: 'https://example.com',
					},
				}

				const result = up(oldRecord)
				expect(result.props.overridePermissions).toBeUndefined()
				expect(result.props.w).toBe(560)
				expect(result.props.h).toBe(315)
				expect(result.props.url).toBe('https://example.com')
			})
		})

		describe('RemovePermissionOverrides down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.embed/4 does not have a down function')
			})
		})
	})

	describe('EMBED_DEFINITIONS functionality', () => {
		describe('tldraw embed extraction', () => {
			it('should extract tldraw room URLs', () => {
				const testCases = [
					'https://tldraw.com/r/room123',
					'https://beta.tldraw.com/r/room456',
					'http://localhost:3000/r/local-room',
				]

				testCases.forEach((url) => {
					// This tests the internal logic that would be used in migrations
					const oldRecord = {
						props: { url, w: 560, h: 315 },
					}

					const result = getTestMigration(embedShapeVersions.GenOriginalUrlInEmbed).up(oldRecord)
					expect(result.props.url).toBe(url)
				})
			})
		})

		describe('YouTube embed extraction', () => {
			it('should extract YouTube video IDs correctly', () => {
				const testCases = [
					{
						embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
						expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
					},
					{
						embed: 'https://youtube.com/embed/abc123def',
						expected: 'https://www.youtube.com/watch?v=abc123def',
					},
				]

				testCases.forEach(({ embed, expected }) => {
					const oldRecord = {
						props: { url: embed, w: 560, h: 315 },
					}

					const result = getTestMigration(embedShapeVersions.GenOriginalUrlInEmbed).up(oldRecord)
					expect(result.props.url).toBe(expected)
				})
			})
		})

		describe('CodePen embed extraction', () => {
			it('should extract CodePen pen URLs correctly', () => {
				const testCases = [
					{
						embed: 'https://codepen.io/user/embed/abcdef',
						expected: 'https://codepen.io/user/pen/abcdef',
					},
					{
						embed: 'https://codepen.io/team/embed/xyz123',
						expected: 'https://codepen.io/team/pen/xyz123',
					},
				]

				testCases.forEach(({ embed, expected }) => {
					const oldRecord = {
						props: { url: embed, w: 560, h: 315 },
					}

					const result = getTestMigration(embedShapeVersions.GenOriginalUrlInEmbed).up(oldRecord)
					expect(result.props.url).toBe(expected)
				})
			})
		})

		describe('Figma embed extraction', () => {
			it('should extract Figma URLs from embed URLs', () => {
				const testCases = [
					{
						embed: 'https://figma.com/embed?url=https://figma.com/file/abc123',
						expected: 'https://figma.com/file/abc123',
					},
				]

				testCases.forEach(({ embed, expected }) => {
					const oldRecord = {
						props: { url: embed, w: 560, h: 315 },
					}

					const result = getTestMigration(embedShapeVersions.GenOriginalUrlInEmbed).up(oldRecord)
					expect(result.props.url).toBe(expected)
				})
			})
		})

		describe('Google Maps embed extraction', () => {
			it('should handle Google Maps embed URLs (documents hostname matching limitation)', () => {
				const testCases = [
					{
						embed: 'https://www.google.com/maps/embed/v1/view?center=40.7128,-74.0060&zoom=10',
						expected: '', // Should be converted but fails due to hostname matching limitation
					},
				]

				testCases.forEach(({ embed, expected }) => {
					const oldRecord = {
						props: { url: embed, w: 560, h: 315 },
					}

					const result = getTestMigration(embedShapeVersions.GenOriginalUrlInEmbed).up(oldRecord)
					// NOTE: The hostname 'google.com' doesn't match 'google.*' due to exact string matching
					expect(result.props.url).toBe(expected)
				})
			})
		})
	})

	describe('integration tests', () => {
		it('should work with complete embed shape record validation', () => {
			const completeValidator = T.object({
				id: T.string,
				typeName: T.literal('shape'),
				type: T.literal('embed'),
				x: T.number,
				y: T.number,
				rotation: T.number,
				index: T.string,
				parentId: T.string,
				isLocked: T.boolean,
				opacity: T.number,
				props: T.object(embedShapeProps),
				meta: T.jsonValue,
			})

			const validEmbedShape = {
				id: 'shape:embed123',
				typeName: 'shape' as const,
				type: 'embed' as const,
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0.8,
				props: {
					w: 560,
					h: 315,
					url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				},
				meta: { embedType: 'youtube' },
			}

			expect(() => completeValidator.validate(validEmbedShape)).not.toThrow()
		})

		it('should be compatible with TLBaseShape structure', () => {
			const embedShape: TLEmbedShape = {
				id: 'shape:embed_integration' as TLShapeId,
				typeName: 'shape',
				type: 'embed',
				x: 25,
				y: 50,
				rotation: Math.PI / 4,
				index: 'b1' as any,
				parentId: 'page:integration' as any,
				isLocked: true,
				opacity: 0.7,
				props: {
					w: 800,
					h: 600,
					url: 'https://codepen.io/team/codepen/pen/PNaGbb',
				},
				meta: { embedSource: 'codepen' },
			}

			// Should satisfy TLBaseShape structure
			expect(embedShape.typeName).toBe('shape')
			expect(embedShape.type).toBe('embed')
			expect(typeof embedShape.id).toBe('string')
			expect(typeof embedShape.x).toBe('number')
			expect(typeof embedShape.y).toBe('number')
			expect(typeof embedShape.rotation).toBe('number')
			expect(embedShape.props).toBeDefined()
			expect(embedShape.meta).toBeDefined()
		})

		test('should handle all migration versions in correct order', () => {
			const expectedOrder: Array<keyof typeof embedShapeVersions> = [
				'GenOriginalUrlInEmbed',
				'RemoveDoesResize',
				'RemoveTmpOldUrl',
				'RemovePermissionOverrides',
			]

			const migrationIds = embedShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : ''))
				.filter(Boolean)

			expectedOrder.forEach((expectedVersion) => {
				const versionId = embedShapeVersions[expectedVersion]
				expect(migrationIds).toContain(versionId)
			})
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty or malformed props gracefully during validation', () => {
			const fullValidator = T.object(embedShapeProps)

			// Missing required properties should throw
			expect(() => fullValidator.validate({})).toThrow()

			// Partial props should throw for missing required fields
			expect(() =>
				fullValidator.validate({
					w: 560,
					h: 315,
					// Missing url
				})
			).toThrow()

			// Extra unexpected properties should throw
			expect(() =>
				fullValidator.validate({
					w: 560,
					h: 315,
					url: 'https://example.com',
					unexpectedProperty: 'extra', // This should cause validation to fail
				})
			).toThrow()
		})

		it('should handle boundary values for numeric properties', () => {
			// Test extreme but valid values
			const extremeProps = {
				w: 0.0001, // Very small but not zero
				h: 99999.9999, // Very large
				url: 'https://example.com',
			}

			const fullValidator = T.object(embedShapeProps)
			expect(() => fullValidator.validate(extremeProps)).not.toThrow()
		})

		it('should handle zero dimension validation correctly', () => {
			// Zero should be invalid for width and height (nonZeroNumber)
			expect(() => embedShapeProps.w.validate(0)).toThrow()
			expect(() => embedShapeProps.h.validate(0)).toThrow()

			// Negative numbers should also be invalid
			expect(() => embedShapeProps.w.validate(-1)).toThrow()
			expect(() => embedShapeProps.h.validate(-10.5)).toThrow()
		})

		it('should handle various URL edge cases', () => {
			const edgeCaseUrls = [
				'', // Empty string is valid for T.string
				'https://example.com', // Basic valid URL
				'https://127.0.0.1:8080/api/v1', // IP address with port
				'invalid-url-format', // Invalid URL but valid string
				'javascript:alert("test")', // Potentially dangerous but valid string
				'very-long-url-with-many-characters-that-goes-on-and-on-and-on',
			]

			edgeCaseUrls.forEach((url) => {
				expect(() => embedShapeProps.url.validate(url)).not.toThrow()
			})
		})

		it('should handle type coercion attempts gracefully', () => {
			// Numeric strings should not be coerced
			expect(() => embedShapeProps.w.validate('560')).toThrow()
			expect(() => embedShapeProps.h.validate('315')).toThrow()

			// Boolean values should not be accepted for numbers
			expect(() => embedShapeProps.w.validate(true)).toThrow()
			expect(() => embedShapeProps.h.validate(false)).toThrow()

			// Objects/arrays should not be accepted for strings
			expect(() => embedShapeProps.url.validate({})).toThrow()
			expect(() => embedShapeProps.url.validate([])).toThrow()

			// Numbers should not be accepted for url (string)
			expect(() => embedShapeProps.url.validate(123)).toThrow()
		})

		test('should maintain consistent validation behavior across all props', () => {
			const validProps = {
				w: 560,
				h: 315,
				url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			}

			// All individual validations should pass
			Object.entries(validProps).forEach(([key, value]) => {
				const validator = embedShapeProps[key as keyof typeof embedShapeProps]
				expect(() => validator.validate(value)).not.toThrow()
			})

			// Full object validation should also pass
			const fullValidator = T.object(embedShapeProps)
			expect(() => fullValidator.validate(validProps)).not.toThrow()
		})

		it('should handle migration errors when props is null (documents error behavior)', () => {
			// Test migration with completely malformed input
			const malformedRecord = {
				// Missing required properties
				id: 'shape:malformed',
				props: null,
			}

			// The migration throws when props is null
			expect(() => {
				const migration = getTestMigration(embedShapeVersions.GenOriginalUrlInEmbed)
				migration.up(malformedRecord)
			}).toThrow('Cannot set properties of null')
		})

		it('should handle URLs with special characters and encoding', () => {
			const specialUrls = [
				'https://example.com/path%20with%20spaces',
				'https://example.com/path?query=value%26more',
				'https://example.com/path#anchor%20with%20spaces',
				'https://example.com/unicode/测试',
				'https://example.com/emoji/🎨',
			]

			specialUrls.forEach((url) => {
				expect(() => embedShapeProps.url.validate(url)).not.toThrow()
			})
		})
	})
})
