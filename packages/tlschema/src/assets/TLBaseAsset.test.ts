import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { TLAssetId } from '../records/TLAsset'
import { assetIdValidator, createAssetValidator, TLBaseAsset } from './TLBaseAsset'

describe('TLBaseAsset', () => {
	describe('TLBaseAsset interface', () => {
		it('should extend BaseRecord with asset-specific properties', () => {
			// Test that TLBaseAsset has the expected structure
			const mockAsset: TLBaseAsset<'test', { name: string }> = {
				id: 'asset:test123' as TLAssetId,
				typeName: 'asset',
				type: 'test',
				props: { name: 'Test Asset' },
				meta: { custom: 'metadata' },
			}

			expect(mockAsset.id).toBe('asset:test123')
			expect(mockAsset.typeName).toBe('asset')
			expect(mockAsset.type).toBe('test')
			expect(mockAsset.props).toEqual({ name: 'Test Asset' })
			expect(mockAsset.meta).toEqual({ custom: 'metadata' })
		})

		it('should work with different asset types and props', () => {
			interface CustomAssetProps {
				url: string
				title: string
				description?: string
			}

			const customAsset: TLBaseAsset<'custom', CustomAssetProps> = {
				id: 'asset:custom456' as TLAssetId,
				typeName: 'asset',
				type: 'custom',
				props: {
					url: 'https://example.com',
					title: 'My Custom Asset',
					description: 'A test asset',
				},
				meta: {},
			}

			expect(customAsset.type).toBe('custom')
			expect(customAsset.props.url).toBe('https://example.com')
			expect(customAsset.props.title).toBe('My Custom Asset')
			expect(customAsset.props.description).toBe('A test asset')
		})

		it('should support empty meta object', () => {
			const assetWithEmptyMeta: TLBaseAsset<'simple', Record<string, never>> = {
				id: 'asset:simple789' as TLAssetId,
				typeName: 'asset',
				type: 'simple',
				props: {},
				meta: {},
			}

			expect(assetWithEmptyMeta.meta).toEqual({})
		})
	})

	describe('assetIdValidator', () => {
		it('should validate correct asset IDs', () => {
			const validIds = [
				'asset:abc123',
				'asset:image_456',
				'asset:video-789',
				'asset:bookmark_xyz',
				'asset:1',
				'asset:custom-id-with-dashes',
				'asset:id_with_underscores',
			]

			validIds.forEach((id) => {
				expect(() => assetIdValidator.validate(id)).not.toThrow()
				expect(assetIdValidator.validate(id)).toBe(id)
			})
		})

		it('should reject IDs without asset prefix', () => {
			const invalidIds = [
				'shape:abc123',
				'page:main',
				'binding:arrow1',
				'abc123',
				'asset',
				':abc123',
				'',
			]

			invalidIds.forEach((id) => {
				expect(() => assetIdValidator.validate(id)).toThrow('asset ID must start with "asset:"')
			})
		})

		it('should reject non-string values', () => {
			const nonStringValues = [123, null, undefined, {}, [], true, false]

			nonStringValues.forEach((value) => {
				expect(() => assetIdValidator.validate(value)).toThrow()
			})
		})

		it('should check isValid method', () => {
			expect(assetIdValidator.isValid('asset:valid123')).toBe(true)
			expect(assetIdValidator.isValid('shape:invalid')).toBe(false)
			expect(assetIdValidator.isValid('asset')).toBe(false)
			expect(assetIdValidator.isValid('')).toBe(false)
			expect(assetIdValidator.isValid(null)).toBe(false)
		})
	})

	describe('createAssetValidator', () => {
		it('should create a validator for a simple asset type', () => {
			const simplePropsValidator = T.object({
				name: T.string,
				value: T.number,
			})

			const validator = createAssetValidator('simple', simplePropsValidator)

			const validAsset = {
				id: 'asset:simple123',
				typeName: 'asset' as const,
				type: 'simple' as const,
				props: {
					name: 'Test Asset',
					value: 42,
				},
				meta: {},
			}

			expect(() => validator.validate(validAsset)).not.toThrow()
			const result = validator.validate(validAsset)
			expect(result.id).toBe('asset:simple123')
			expect(result.type).toBe('simple')
			expect(result.props.name).toBe('Test Asset')
			expect(result.props.value).toBe(42)
		})

		it('should create a validator for complex asset type with optional properties', () => {
			interface _ComplexProps extends JsonObject {
				url: string
				title: string
				description?: string
				tags: string[]
				metadata: {
					size: number
					format: string
				}
			}

			const complexPropsValidator: T.ObjectValidator<_ComplexProps> = T.object({
				url: T.string,
				title: T.string,
				description: T.string.optional(),
				tags: T.arrayOf(T.string),
				metadata: T.object({
					size: T.number,
					format: T.string,
				}),
			})

			const validator = createAssetValidator('complex', complexPropsValidator)

			const validComplexAsset = {
				id: 'asset:complex456',
				typeName: 'asset' as const,
				type: 'complex' as const,
				props: {
					url: 'https://example.com/resource',
					title: 'Complex Asset',
					description: 'A complex asset with metadata',
					tags: ['test', 'complex'],
					metadata: {
						size: 1024,
						format: 'json',
					},
				},
				meta: {
					creator: 'test-user',
					created: '2023-01-01',
				},
			}

			expect(() => validator.validate(validComplexAsset)).not.toThrow()
			const result = validator.validate(validComplexAsset)
			expect(result.props.tags).toEqual(['test', 'complex'])
			expect(result.props.metadata.size).toBe(1024)
		})

		it('should validate required base properties', () => {
			const propsValidator = T.object({
				name: T.string,
			})

			const validator = createAssetValidator('test', propsValidator)

			// Missing id
			expect(() =>
				validator.validate({
					typeName: 'asset',
					type: 'test',
					props: { name: 'Test' },
					meta: {},
				})
			).toThrow()

			// Wrong typeName
			expect(() =>
				validator.validate({
					id: 'asset:test123',
					typeName: 'shape',
					type: 'test',
					props: { name: 'Test' },
					meta: {},
				})
			).toThrow()

			// Wrong type
			expect(() =>
				validator.validate({
					id: 'asset:test123',
					typeName: 'asset',
					type: 'different',
					props: { name: 'Test' },
					meta: {},
				})
			).toThrow()

			// Missing props
			expect(() =>
				validator.validate({
					id: 'asset:test123',
					typeName: 'asset',
					type: 'test',
					meta: {},
				})
			).toThrow()

			// Missing meta
			expect(() =>
				validator.validate({
					id: 'asset:test123',
					typeName: 'asset',
					type: 'test',
					props: { name: 'Test' },
				})
			).toThrow()
		})

		it('should validate asset ID format', () => {
			const propsValidator = T.object({
				name: T.string,
			})

			const validator = createAssetValidator('test', propsValidator)

			// Invalid asset ID (wrong prefix)
			expect(() =>
				validator.validate({
					id: 'shape:test123',
					typeName: 'asset',
					type: 'test',
					props: { name: 'Test' },
					meta: {},
				})
			).toThrow('asset ID must start with "asset:"')

			// Invalid asset ID (no prefix)
			expect(() =>
				validator.validate({
					id: 'test123',
					typeName: 'asset',
					type: 'test',
					props: { name: 'Test' },
					meta: {},
				})
			).toThrow('asset ID must start with "asset:"')
		})

		it('should validate props according to provided validator', () => {
			const strictPropsValidator = T.object({
				requiredField: T.string,
				numberField: T.number,
			})

			const validator = createAssetValidator('strict', strictPropsValidator)

			const baseAsset = {
				id: 'asset:strict123',
				typeName: 'asset' as const,
				type: 'strict' as const,
				meta: {},
			}

			// Missing required field
			expect(() =>
				validator.validate({
					...baseAsset,
					props: {
						numberField: 42,
					},
				})
			).toThrow()

			// Wrong type for field
			expect(() =>
				validator.validate({
					...baseAsset,
					props: {
						requiredField: 'valid',
						numberField: 'not-a-number',
					},
				})
			).toThrow()

			// Extra unexpected field should be rejected
			expect(() =>
				validator.validate({
					...baseAsset,
					props: {
						requiredField: 'valid',
						numberField: 42,
						unexpectedField: 'extra',
					},
				})
			).toThrow()
		})

		it('should validate meta as JsonObject', () => {
			const propsValidator = T.object({
				name: T.string,
			})

			const validator = createAssetValidator('test', propsValidator)

			const baseAsset = {
				id: 'asset:test123',
				typeName: 'asset' as const,
				type: 'test' as const,
				props: { name: 'Test' },
			}

			// Valid JsonObject meta
			expect(() =>
				validator.validate({
					...baseAsset,
					meta: {
						string: 'value',
						number: 42,
						boolean: true,
						array: [1, 2, 3],
						nested: { key: 'value' },
					},
				})
			).not.toThrow()

			// Invalid meta (function)
			expect(() =>
				validator.validate({
					...baseAsset,
					meta: {
						invalidFunction: () => {},
					},
				})
			).toThrow()

			// Invalid meta (undefined)
			expect(() =>
				validator.validate({
					...baseAsset,
					meta: {
						undefinedValue: undefined,
					},
				})
			).toThrow()
		})

		test('should handle edge cases', () => {
			const propsValidator = T.object({
				data: T.any,
			})

			const validator = createAssetValidator('edge', propsValidator)

			// Empty asset type name (should still work)
			const emptyTypeValidator = createAssetValidator('', propsValidator)
			expect(() =>
				emptyTypeValidator.validate({
					id: 'asset:empty123',
					typeName: 'asset',
					type: '',
					props: { data: 'anything' },
					meta: {},
				})
			).not.toThrow()

			// Asset with null in meta (should pass - null is valid JSON)
			expect(() =>
				validator.validate({
					id: 'asset:edge123',
					typeName: 'asset',
					type: 'edge',
					props: { data: 'test' },
					meta: { nullValue: null },
				})
			).not.toThrow()
		})

		it('should preserve type information', () => {
			interface _TypedProps extends JsonObject {
				specificField: string
			}

			const typedPropsValidator: T.ObjectValidator<_TypedProps> = T.object({
				specificField: T.string,
			})

			const validator = createAssetValidator('typed', typedPropsValidator)

			const validAsset = {
				id: 'asset:typed123' as TLAssetId,
				typeName: 'asset' as const,
				type: 'typed' as const,
				props: {
					specificField: 'typed-value',
				},
				meta: {},
			}

			const result = validator.validate(validAsset)

			// TypeScript should preserve the specific type
			expect(result.type).toBe('typed')
			expect(result.props.specificField).toBe('typed-value')
		})

		test('should work with real-world asset example', () => {
			// Simulate a bookmark asset
			interface _BookmarkProps extends JsonObject {
				src: string
				title: string
				description?: string
				favicon?: string
			}

			const bookmarkPropsValidator: T.ObjectValidator<_BookmarkProps> = T.object({
				src: T.string,
				title: T.string,
				description: T.string.optional(),
				favicon: T.string.optional(),
			})

			const bookmarkValidator = createAssetValidator('bookmark', bookmarkPropsValidator)

			const bookmarkAsset = {
				id: 'asset:bookmark_example',
				typeName: 'asset' as const,
				type: 'bookmark' as const,
				props: {
					src: 'https://example.com',
					title: 'Example Website',
					description: 'A sample website for testing',
					favicon: 'https://example.com/favicon.ico',
				},
				meta: {
					addedBy: 'user123',
					dateAdded: '2023-12-01T10:00:00Z',
				},
			}

			expect(() => bookmarkValidator.validate(bookmarkAsset)).not.toThrow()
			const result = bookmarkValidator.validate(bookmarkAsset)
			expect(result.props.src).toBe('https://example.com')
			expect(result.props.title).toBe('Example Website')
			expect(result.meta.addedBy).toBe('user123')
		})
	})
})
