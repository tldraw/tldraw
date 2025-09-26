import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLAssetId } from '../records/TLAsset'
import { TLShapeId } from '../records/TLShape'
import {
	TLBookmarkShape,
	TLBookmarkShapeProps,
	bookmarkShapeMigrations,
	bookmarkShapeProps,
	bookmarkShapeVersions,
} from './TLBookmarkShape'

describe('TLBookmarkShape', () => {
	describe('TLBookmarkShapeProps interface', () => {
		it('should represent valid bookmark shape properties', () => {
			const validProps: TLBookmarkShapeProps = {
				w: 300,
				h: 320,
				assetId: 'asset:bookmark123' as TLAssetId,
				url: 'https://www.example.com',
			}

			expect(validProps.w).toBe(300)
			expect(validProps.h).toBe(320)
			expect(validProps.assetId).toBe('asset:bookmark123')
			expect(validProps.url).toBe('https://www.example.com')
		})

		it('should support null assetId', () => {
			const propsWithNullAsset: TLBookmarkShapeProps = {
				w: 250,
				h: 280,
				assetId: null,
				url: 'https://www.test.com',
			}

			expect(propsWithNullAsset.assetId).toBeNull()
			expect(propsWithNullAsset.url).toBe('https://www.test.com')
		})

		it('should support different URL formats', () => {
			const urlFormats = [
				'https://www.example.com',
				'http://example.com',
				'https://subdomain.example.com/path',
				'https://example.com/path/to/page?param=value#anchor',
				'https://example.com:8080/api/v1/resource',
			]

			urlFormats.forEach((url) => {
				const props: TLBookmarkShapeProps = {
					w: 300,
					h: 320,
					assetId: null,
					url,
				}

				expect(props.url).toBe(url)
			})
		})

		it('should support various dimensions', () => {
			const dimensionTests = [
				{ w: 1, h: 1 }, // Minimum positive
				{ w: 100, h: 200 },
				{ w: 500.5, h: 300.75 }, // Decimal values
				{ w: 1000, h: 800 }, // Large values
			]

			dimensionTests.forEach(({ w, h }) => {
				const props: TLBookmarkShapeProps = {
					w,
					h,
					assetId: null,
					url: 'https://example.com',
				}

				expect(props.w).toBe(w)
				expect(props.h).toBe(h)
			})
		})

		it('should support different asset ID formats', () => {
			const assetIds: Array<TLAssetId | null> = [
				null,
				'asset:bookmark1' as TLAssetId,
				'asset:img_abc123' as TLAssetId,
				'asset:video-preview-456' as TLAssetId,
				'asset:' as TLAssetId, // Edge case: empty suffix
			]

			assetIds.forEach((assetId) => {
				const props: TLBookmarkShapeProps = {
					w: 300,
					h: 320,
					assetId,
					url: 'https://example.com',
				}

				expect(props.assetId).toBe(assetId)
			})
		})
	})

	describe('TLBookmarkShape type', () => {
		it('should represent complete bookmark shape records', () => {
			const validBookmarkShape: TLBookmarkShape = {
				id: 'shape:bookmark123' as TLShapeId,
				typeName: 'shape',
				type: 'bookmark',
				x: 100,
				y: 200,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 300,
					h: 320,
					assetId: 'asset:bookmark123' as TLAssetId,
					url: 'https://www.example.com',
				},
				meta: {},
			}

			expect(validBookmarkShape.type).toBe('bookmark')
			expect(validBookmarkShape.typeName).toBe('shape')
			expect(validBookmarkShape.props.w).toBe(300)
			expect(validBookmarkShape.props.h).toBe(320)
			expect(validBookmarkShape.props.url).toBe('https://www.example.com')
		})

		it('should support different bookmark configurations', () => {
			const configurations = [
				{
					w: 250,
					h: 200,
					assetId: null,
					url: 'https://github.com/tldraw/tldraw',
				},
				{
					w: 400,
					h: 500,
					assetId: 'asset:preview456' as TLAssetId,
					url: 'https://docs.tldraw.dev',
				},
				{
					w: 320,
					h: 240,
					assetId: 'asset:thumbnail789' as TLAssetId,
					url: 'https://www.figma.com/blog',
				},
			]

			configurations.forEach((config, index) => {
				const shape: TLBookmarkShape = {
					id: `shape:bookmark${index}` as TLShapeId,
					typeName: 'shape',
					type: 'bookmark',
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
				expect(shape.props.assetId).toBe(config.assetId)
				expect(shape.props.url).toBe(config.url)
			})
		})

		it('should support custom meta properties', () => {
			const bookmarkShape: TLBookmarkShape = {
				id: 'shape:bookmark_meta' as TLShapeId,
				typeName: 'shape',
				type: 'bookmark',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					w: 300,
					h: 320,
					assetId: null,
					url: 'https://example.com',
				},
				meta: {
					title: 'Example Bookmark',
					description: 'A sample bookmark for testing',
					tags: ['web', 'example'],
					createdAt: '2024-01-01T00:00:00Z',
				},
			}

			expect(bookmarkShape.meta.title).toBe('Example Bookmark')
			expect(bookmarkShape.meta.tags).toEqual(['web', 'example'])
		})
	})

	describe('bookmarkShapeProps validation schema', () => {
		it('should validate all bookmark shape properties', () => {
			const validProps = {
				w: 300,
				h: 320,
				assetId: 'asset:bookmark123' as TLAssetId,
				url: 'https://www.example.com',
			}

			// Validate each property individually
			expect(() => bookmarkShapeProps.w.validate(validProps.w)).not.toThrow()
			expect(() => bookmarkShapeProps.h.validate(validProps.h)).not.toThrow()
			expect(() => bookmarkShapeProps.assetId.validate(validProps.assetId)).not.toThrow()
			expect(() => bookmarkShapeProps.url.validate(validProps.url)).not.toThrow()
		})

		it('should validate using comprehensive object validator', () => {
			const fullValidator = T.object(bookmarkShapeProps)

			const validPropsObject = {
				w: 400,
				h: 500,
				assetId: null,
				url: 'https://docs.example.com/guide',
			}

			expect(() => fullValidator.validate(validPropsObject)).not.toThrow()
			const result = fullValidator.validate(validPropsObject)
			expect(result).toEqual(validPropsObject)
		})

		it('should validate width as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validWidths = [0.1, 0.5, 1, 10, 100, 1000.5, 9999.99]

			validWidths.forEach((w) => {
				expect(() => bookmarkShapeProps.w.validate(w)).not.toThrow()
			})

			// Invalid widths (zero, negative numbers, and non-numbers)
			const invalidWidths = [0, -1, -10, -0.1, 'not-number', null, undefined, {}, [], true, false]

			invalidWidths.forEach((w) => {
				expect(() => bookmarkShapeProps.w.validate(w)).toThrow()
			})
		})

		it('should validate height as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validHeights = [0.1, 0.5, 1, 10, 100, 1000.5, 9999.99]

			validHeights.forEach((h) => {
				expect(() => bookmarkShapeProps.h.validate(h)).not.toThrow()
			})

			// Invalid heights (zero, negative numbers, and non-numbers)
			const invalidHeights = [0, -1, -10, -0.1, 'not-number', null, undefined, {}, [], true, false]

			invalidHeights.forEach((h) => {
				expect(() => bookmarkShapeProps.h.validate(h)).toThrow()
			})
		})

		it('should validate assetId as nullable asset ID', () => {
			// Valid asset IDs
			const validAssetIds = [
				null,
				'asset:bookmark123',
				'asset:img456',
				'asset:video-789',
				'asset:',
				'asset:very-long-asset-id-with-many-characters',
			]

			validAssetIds.forEach((assetId) => {
				expect(() => bookmarkShapeProps.assetId.validate(assetId)).not.toThrow()
			})

			// Invalid asset IDs
			const invalidAssetIds = [
				'shape:notasset',
				'page:notasset',
				'bookmark123', // Missing asset: prefix
				'Asset:bookmark123', // Wrong case
				'asset', // Missing colon
				123,
				true,
				{},
				[],
				undefined, // undefined is not valid (use null instead)
			]

			invalidAssetIds.forEach((assetId) => {
				expect(() => bookmarkShapeProps.assetId.validate(assetId)).toThrow()
			})
		})

		it('should validate url as linkUrl', () => {
			// Valid URLs
			const validUrls = [
				'', // Empty string is actually valid for T.linkUrl
				'https://www.example.com',
				'http://example.com',
				'https://subdomain.example.com',
				'https://example.com/path',
				'https://example.com/path/to/page',
				'https://example.com/path?query=value',
				'https://example.com/path#anchor',
				'https://example.com:8080/api',
				'https://192.168.1.1:3000',
				'https://localhost:3000',
			]

			validUrls.forEach((url) => {
				expect(() => bookmarkShapeProps.url.validate(url)).not.toThrow()
			})

			// Invalid URLs
			const invalidUrls = [
				'not-a-url',
				'javascript:alert("xss")', // Invalid protocol
				'file:///local/file', // Invalid protocol for web
				'ftp://example.com', // Invalid protocol
				'example.com', // Missing protocol
				'www.example.com', // Missing protocol
				'https://', // Incomplete URL
				'https://. .com', // Invalid characters
				123,
				null,
				undefined,
				{},
				[],
				true,
			]

			invalidUrls.forEach((url) => {
				expect(() => bookmarkShapeProps.url.validate(url)).toThrow()
			})
		})

		it('should use correct validator types', () => {
			// Verify that the props schema uses the expected validators
			expect(bookmarkShapeProps.w).toBe(T.nonZeroNumber)
			expect(bookmarkShapeProps.h).toBe(T.nonZeroNumber)
			expect(bookmarkShapeProps.url).toBe(T.linkUrl)
		})
	})

	describe('bookmarkShapeVersions', () => {
		it('should contain expected migration version IDs', () => {
			expect(bookmarkShapeVersions).toBeDefined()
			expect(typeof bookmarkShapeVersions).toBe('object')
		})

		it('should have all expected migration versions', () => {
			const expectedVersions: Array<keyof typeof bookmarkShapeVersions> = [
				'NullAssetId',
				'MakeUrlsValid',
			]

			expectedVersions.forEach((version) => {
				expect(bookmarkShapeVersions[version]).toBeDefined()
				expect(typeof bookmarkShapeVersions[version]).toBe('string')
			})
		})

		it('should have properly formatted migration IDs', () => {
			Object.values(bookmarkShapeVersions).forEach((versionId) => {
				expect(versionId).toMatch(/^com\.tldraw\.shape\.bookmark\//)
				expect(versionId).toMatch(/\/\d+$/) // Should end with /number
			})
		})

		it('should contain bookmark in migration IDs', () => {
			Object.values(bookmarkShapeVersions).forEach((versionId) => {
				expect(versionId).toContain('bookmark')
			})
		})

		it('should have unique version IDs', () => {
			const versionIds = Object.values(bookmarkShapeVersions)
			const uniqueIds = new Set(versionIds)
			expect(uniqueIds.size).toBe(versionIds.length)
		})
	})

	describe('bookmarkShapeMigrations', () => {
		it('should be defined and have required structure', () => {
			expect(bookmarkShapeMigrations).toBeDefined()
			expect(bookmarkShapeMigrations.sequence).toBeDefined()
			expect(Array.isArray(bookmarkShapeMigrations.sequence)).toBe(true)
		})

		it('should have migrations for all version IDs', () => {
			const migrationIds = bookmarkShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : null))
				.filter(Boolean)

			const versionIds = Object.values(bookmarkShapeVersions)

			versionIds.forEach((versionId) => {
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should have correct number of migrations in sequence', () => {
			// Should have at least as many migrations as version IDs
			expect(bookmarkShapeMigrations.sequence.length).toBeGreaterThanOrEqual(
				Object.keys(bookmarkShapeVersions).length
			)
		})
	})

	describe('bookmarkShapeMigrations - NullAssetId migration', () => {
		const { up, down } = getTestMigration(bookmarkShapeVersions.NullAssetId)

		describe('NullAssetId up migration', () => {
			it('should add assetId property as null when undefined', () => {
				const oldRecord = {
					id: 'shape:bookmark1',
					typeName: 'shape',
					type: 'bookmark',
					x: 100,
					y: 200,
					rotation: 0,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 1,
					props: {
						w: 300,
						h: 320,
						url: 'https://www.example.com',
						// assetId is undefined/missing
					},
					meta: {},
				}

				const result = up(oldRecord)
				expect(result.props.assetId).toBeNull()
				expect(result.props.w).toBe(300)
				expect(result.props.h).toBe(320)
				expect(result.props.url).toBe('https://www.example.com')
			})

			it('should preserve existing assetId when it exists', () => {
				const oldRecord = {
					id: 'shape:bookmark2',
					typeName: 'shape',
					type: 'bookmark',
					props: {
						w: 250,
						h: 280,
						url: 'https://test.example.com',
						assetId: 'asset:existing123',
					},
				}

				const result = up(oldRecord)
				expect(result.props.assetId).toBe('asset:existing123')
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:bookmark3',
					typeName: 'shape',
					type: 'bookmark',
					x: 50,
					y: 75,
					rotation: 0.5,
					index: 'b1',
					parentId: 'page:test',
					isLocked: true,
					opacity: 0.8,
					props: {
						w: 400,
						h: 500,
						url: 'https://complex.example.com/path?query=value',
					},
					meta: { custom: 'data' },
				}

				const result = up(oldRecord)
				expect(result.props.assetId).toBeNull()
				expect(result.props.w).toBe(400)
				expect(result.props.h).toBe(500)
				expect(result.props.url).toBe('https://complex.example.com/path?query=value')
				expect(result.meta).toEqual({ custom: 'data' })
				expect(result.x).toBe(50)
				expect(result.y).toBe(75)
				expect(result.rotation).toBe(0.5)
			})

			test('should handle edge case where assetId is explicitly undefined', () => {
				const recordWithUndefinedAssetId = {
					id: 'shape:bookmark4',
					props: {
						w: 300,
						h: 320,
						url: 'https://edge-case.example.com',
						assetId: undefined,
					},
				}

				const result = up(recordWithUndefinedAssetId)
				expect(result.props.assetId).toBeNull()
			})
		})

		describe('NullAssetId down migration', () => {
			it('should be retired (no down migration)', () => {
				// Based on the source code, the down migration is 'retired'
				// The getTestMigration utility should throw when trying to access down migration
				expect(() => {
					// This should throw since the migration is retired
					down({})
				}).toThrow('Migration com.tldraw.shape.bookmark/1 does not have a down function')
			})
		})
	})

	describe('bookmarkShapeMigrations - MakeUrlsValid migration', () => {
		const { up, down } = getTestMigration(bookmarkShapeVersions.MakeUrlsValid)

		describe('MakeUrlsValid up migration', () => {
			it('should set invalid URLs to empty string', () => {
				const invalidUrls = [
					'not-a-url',
					'javascript:alert("xss")',
					'file:///local/file',
					'ftp://example.com',
					'example.com',
					'www.example.com',
					'',
				]

				invalidUrls.forEach((invalidUrl) => {
					const oldRecord = {
						id: 'shape:bookmark1',
						props: {
							w: 300,
							h: 320,
							assetId: null,
							url: invalidUrl,
						},
					}

					const result = up(oldRecord)
					expect(result.props.url).toBe('')
					expect(result.props.w).toBe(300) // Preserve other props
					expect(result.props.h).toBe(320)
					expect(result.props.assetId).toBeNull()
				})
			})

			it('should preserve valid URLs', () => {
				const validUrls = [
					'https://www.example.com',
					'http://example.com',
					'https://subdomain.example.com/path',
					'https://example.com/path?query=value#anchor',
					'https://localhost:3000',
				]

				validUrls.forEach((validUrl) => {
					const oldRecord = {
						id: 'shape:bookmark1',
						props: {
							w: 300,
							h: 320,
							assetId: 'asset:test123',
							url: validUrl,
						},
					}

					const result = up(oldRecord)
					expect(result.props.url).toBe(validUrl)
					expect(result.props.w).toBe(300)
					expect(result.props.h).toBe(320)
					expect(result.props.assetId).toBe('asset:test123')
				})
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:bookmark2',
					typeName: 'shape',
					type: 'bookmark',
					x: 100,
					y: 200,
					rotation: 1.5,
					index: 'c1',
					parentId: 'shape:frame1',
					isLocked: false,
					opacity: 0.9,
					props: {
						w: 350,
						h: 400,
						assetId: 'asset:preview789',
						url: 'invalid-url-format',
					},
					meta: { bookmarkType: 'article' },
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('') // Invalid URL becomes empty
				expect(result.props.w).toBe(350)
				expect(result.props.h).toBe(400)
				expect(result.props.assetId).toBe('asset:preview789')
				expect(result.meta).toEqual({ bookmarkType: 'article' })
				expect(result.x).toBe(100)
				expect(result.opacity).toBe(0.9)
			})
		})

		describe('MakeUrlsValid down migration', () => {
			it('should be a noop (no-operation)', () => {
				const newRecord = {
					id: 'shape:bookmark1',
					props: {
						w: 300,
						h: 320,
						assetId: null,
						url: 'https://example.com',
					},
				}

				// The down migration should not modify the record
				const result = down(newRecord)
				expect(result).toEqual(newRecord)
			})

			it('should preserve all properties unchanged', () => {
				const newRecord = {
					id: 'shape:bookmark2',
					typeName: 'shape',
					type: 'bookmark',
					x: 50,
					y: 75,
					props: {
						w: 400,
						h: 500,
						assetId: 'asset:test456',
						url: '', // Empty URL from migration
					},
					meta: { restored: true },
				}

				const result = down(newRecord)
				expect(result).toEqual(newRecord)
				expect(result.props.url).toBe('')
				expect(result.meta).toEqual({ restored: true })
			})
		})
	})

	describe('integration tests', () => {
		it('should work with complete bookmark shape record validation', () => {
			const completeValidator = T.object({
				id: T.string,
				typeName: T.literal('shape'),
				type: T.literal('bookmark'),
				x: T.number,
				y: T.number,
				rotation: T.number,
				index: T.string,
				parentId: T.string,
				isLocked: T.boolean,
				opacity: T.number,
				props: T.object(bookmarkShapeProps),
				meta: T.jsonValue,
			})

			const validBookmarkShape = {
				id: 'shape:bookmark123',
				typeName: 'shape' as const,
				type: 'bookmark' as const,
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0.8,
				props: {
					w: 300,
					h: 320,
					assetId: 'asset:preview456' as TLAssetId,
					url: 'https://www.tldraw.dev',
				},
				meta: { category: 'documentation' },
			}

			expect(() => completeValidator.validate(validBookmarkShape)).not.toThrow()
		})

		it('should be compatible with TLBaseShape structure', () => {
			const bookmarkShape: TLBookmarkShape = {
				id: 'shape:bookmark_integration' as TLShapeId,
				typeName: 'shape',
				type: 'bookmark',
				x: 25,
				y: 50,
				rotation: Math.PI / 4,
				index: 'b1' as any,
				parentId: 'page:integration' as any,
				isLocked: true,
				opacity: 0.7,
				props: {
					w: 280,
					h: 360,
					assetId: null,
					url: 'https://github.com/tldraw/tldraw',
				},
				meta: { bookmarkSource: 'github' },
			}

			// Should satisfy TLBaseShape structure
			expect(bookmarkShape.typeName).toBe('shape')
			expect(bookmarkShape.type).toBe('bookmark')
			expect(typeof bookmarkShape.id).toBe('string')
			expect(typeof bookmarkShape.x).toBe('number')
			expect(typeof bookmarkShape.y).toBe('number')
			expect(typeof bookmarkShape.rotation).toBe('number')
			expect(bookmarkShape.props).toBeDefined()
			expect(bookmarkShape.meta).toBeDefined()
		})

		test('should handle all migration versions in correct order', () => {
			const expectedOrder: Array<keyof typeof bookmarkShapeVersions> = [
				'NullAssetId',
				'MakeUrlsValid',
			]

			const migrationIds = bookmarkShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : ''))
				.filter(Boolean)

			expectedOrder.forEach((expectedVersion) => {
				const versionId = bookmarkShapeVersions[expectedVersion]
				expect(migrationIds).toContain(versionId)
			})
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty or malformed props gracefully during validation', () => {
			const fullValidator = T.object(bookmarkShapeProps)

			// Missing required properties should throw
			expect(() => fullValidator.validate({})).toThrow()

			// Partial props should throw for missing required fields
			expect(() =>
				fullValidator.validate({
					w: 300,
					h: 320,
					// Missing url and assetId
				})
			).toThrow()

			// Extra unexpected properties should throw
			expect(() =>
				fullValidator.validate({
					w: 300,
					h: 320,
					assetId: null,
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
				assetId: null,
				url: 'https://example.com',
			}

			const fullValidator = T.object(bookmarkShapeProps)
			expect(() => fullValidator.validate(extremeProps)).not.toThrow()
		})

		it('should handle zero dimension validation correctly', () => {
			// Zero should be invalid for width and height (nonZeroNumber)
			expect(() => bookmarkShapeProps.w.validate(0)).toThrow()
			expect(() => bookmarkShapeProps.h.validate(0)).toThrow()

			// Negative numbers should also be invalid
			expect(() => bookmarkShapeProps.w.validate(-1)).toThrow()
			expect(() => bookmarkShapeProps.h.validate(-10.5)).toThrow()
		})

		it('should handle various URL edge cases', () => {
			const edgeCaseUrls = [
				'https://example.com', // Basic valid URL
				'https://127.0.0.1:8080/api/v1', // IP address with port
				'https://very-long-subdomain.example.com/very/long/path/to/resource?with=many&query=parameters#and-anchor',
			]

			edgeCaseUrls.forEach((url) => {
				expect(() => bookmarkShapeProps.url.validate(url)).not.toThrow()
			})
		})

		it('should handle asset ID validation edge cases', () => {
			// Valid edge cases
			const validEdgeCases = [
				null, // Explicitly null
				'asset:' as TLAssetId, // Empty suffix
				'asset:a' as TLAssetId, // Single character
				'asset:123-abc_def.xyz' as TLAssetId, // Complex characters
			]

			validEdgeCases.forEach((assetId) => {
				expect(() => bookmarkShapeProps.assetId.validate(assetId)).not.toThrow()
			})

			// Invalid edge cases
			const invalidEdgeCases = [
				'asset', // Missing colon
				':asset123', // Colon in wrong position
				'Asset:test', // Wrong case
				'ASSET:TEST', // All caps
			]

			invalidEdgeCases.forEach((assetId) => {
				expect(() => bookmarkShapeProps.assetId.validate(assetId)).toThrow()
			})
		})

		it('should handle type coercion attempts gracefully', () => {
			// Numeric strings should not be coerced
			expect(() => bookmarkShapeProps.w.validate('300')).toThrow()
			expect(() => bookmarkShapeProps.h.validate('320')).toThrow()

			// Boolean values should not be accepted for numbers
			expect(() => bookmarkShapeProps.w.validate(true)).toThrow()
			expect(() => bookmarkShapeProps.h.validate(false)).toThrow()

			// Objects/arrays should not be accepted
			expect(() => bookmarkShapeProps.url.validate({})).toThrow()
			expect(() => bookmarkShapeProps.url.validate([])).toThrow()
		})

		test('should maintain consistent validation behavior across all props', () => {
			const validProps = {
				w: 300,
				h: 320,
				assetId: 'asset:test123' as TLAssetId,
				url: 'https://example.com',
			}

			// All individual validations should pass
			Object.entries(validProps).forEach(([key, value]) => {
				const validator = bookmarkShapeProps[key as keyof typeof bookmarkShapeProps]
				expect(() => validator.validate(value)).not.toThrow()
			})

			// Full object validation should also pass
			const fullValidator = T.object(bookmarkShapeProps)
			expect(() => fullValidator.validate(validProps)).not.toThrow()
		})
	})
})
