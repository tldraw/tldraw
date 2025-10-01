import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { embedShapeProps, embedShapeVersions } from './TLEmbedShape'

describe('TLEmbedShape', () => {
	describe('embedShapeProps validation schema', () => {
		it('should validate width as nonZeroNumber', () => {
			const validWidths = [0.1, 0.5, 1, 10, 100, 560, 1920, 1000.5, 9999.99]

			validWidths.forEach((w) => {
				expect(() => embedShapeProps.w.validate(w)).not.toThrow()
			})

			const invalidWidths = [0, -1, -10, -0.1, 'not-number', null, undefined, {}, [], true, false]

			invalidWidths.forEach((w) => {
				expect(() => embedShapeProps.w.validate(w)).toThrow()
			})
		})

		it('should validate height as nonZeroNumber', () => {
			const validHeights = [0.1, 0.5, 1, 10, 100, 315, 1080, 1000.5, 9999.99]

			validHeights.forEach((h) => {
				expect(() => embedShapeProps.h.validate(h)).not.toThrow()
			})

			const invalidHeights = [0, -1, -10, -0.1, 'not-number', null, undefined, {}, [], true, false]

			invalidHeights.forEach((h) => {
				expect(() => embedShapeProps.h.validate(h)).toThrow()
			})
		})

		it('should validate url as string', () => {
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

			const invalidUrls = [123, null, undefined, {}, [], true, false]

			invalidUrls.forEach((url) => {
				expect(() => embedShapeProps.url.validate(url)).toThrow()
			})
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
		})

		describe('GenOriginalUrlInEmbed down migration', () => {
			it('should be retired (no down migration)', () => {
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

	describe('edge cases and error handling', () => {
		it('should handle zero dimension validation correctly', () => {
			// Zero should be invalid for width and height (nonZeroNumber)
			expect(() => embedShapeProps.w.validate(0)).toThrow()
			expect(() => embedShapeProps.h.validate(0)).toThrow()

			// Negative numbers should also be invalid
			expect(() => embedShapeProps.w.validate(-1)).toThrow()
			expect(() => embedShapeProps.h.validate(-10.5)).toThrow()
		})

		it('should handle migration errors when props is null', () => {
			const malformedRecord = {
				id: 'shape:malformed',
				props: null,
			}

			expect(() => {
				const migration = getTestMigration(embedShapeVersions.GenOriginalUrlInEmbed)
				migration.up(malformedRecord)
			}).toThrow('Cannot set properties of null')
		})
	})
})
