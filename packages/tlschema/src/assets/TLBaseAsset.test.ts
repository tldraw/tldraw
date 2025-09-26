import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { assetIdValidator, createAssetValidator } from './TLBaseAsset'

describe('TLBaseAsset', () => {
	describe('assetIdValidator', () => {
		it('should validate correct asset IDs', () => {
			expect(() => assetIdValidator.validate('asset:abc123')).not.toThrow()
			expect(assetIdValidator.validate('asset:abc123')).toBe('asset:abc123')
		})

		it('should reject IDs without asset prefix', () => {
			expect(() => assetIdValidator.validate('shape:abc123')).toThrow(
				'asset ID must start with "asset:"'
			)
			expect(() => assetIdValidator.validate('abc123')).toThrow('asset ID must start with "asset:"')
		})
	})

	describe('createAssetValidator', () => {
		it('should create a validator for asset records', () => {
			const propsValidator = T.object({
				name: T.string,
				value: T.number,
			})

			const validator = createAssetValidator('test', propsValidator)

			const validAsset = {
				id: 'asset:test123',
				typeName: 'asset' as const,
				type: 'test' as const,
				props: {
					name: 'Test Asset',
					value: 42,
				},
				meta: {},
			}

			expect(() => validator.validate(validAsset)).not.toThrow()
			const result = validator.validate(validAsset)
			expect(result.props.name).toBe('Test Asset')
			expect(result.props.value).toBe(42)
		})

		it('should enforce asset ID format', () => {
			const propsValidator = T.object({ name: T.string })
			const validator = createAssetValidator('test', propsValidator)

			expect(() =>
				validator.validate({
					id: 'shape:test123',
					typeName: 'asset',
					type: 'test',
					props: { name: 'Test' },
					meta: {},
				})
			).toThrow('asset ID must start with "asset:"')
		})

		it('should validate props according to provided validator', () => {
			const propsValidator = T.object({
				requiredField: T.string,
				numberField: T.number,
			})

			const validator = createAssetValidator('test', propsValidator)

			// Missing required field should fail
			expect(() =>
				validator.validate({
					id: 'asset:test123',
					typeName: 'asset' as const,
					type: 'test' as const,
					props: {
						numberField: 42,
					},
					meta: {},
				})
			).toThrow()

			// Wrong type should fail
			expect(() =>
				validator.validate({
					id: 'asset:test123',
					typeName: 'asset' as const,
					type: 'test' as const,
					props: {
						requiredField: 'valid',
						numberField: 'not-a-number',
					},
					meta: {},
				})
			).toThrow()
		})
	})
})
