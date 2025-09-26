import type { RecordId, UnknownRecord } from '@tldraw/store'
import { describe, expect, it } from 'vitest'
import { idValidator } from './id-validator'

// Mock record types for testing
interface MockShapeRecord extends UnknownRecord {
	typeName: 'shape'
}

interface MockPageRecord extends UnknownRecord {
	typeName: 'page'
}

type MockShapeId = RecordId<MockShapeRecord>
type MockPageId = RecordId<MockPageRecord>

describe('idValidator', () => {
	it('should validate correct IDs with proper prefix', () => {
		const shapeValidator = idValidator<MockShapeId>('shape')
		const pageValidator = idValidator<MockPageId>('page')

		expect(shapeValidator.validate('shape:abc123')).toBe('shape:abc123')
		expect(shapeValidator.validate('shape:')).toBe('shape:')
		expect(pageValidator.validate('page:main')).toBe('page:main')
	})

	it('should reject IDs with wrong prefix', () => {
		const shapeValidator = idValidator<MockShapeId>('shape')

		expect(() => shapeValidator.validate('page:abc123')).toThrow(
			'shape ID must start with "shape:"'
		)
		expect(() => shapeValidator.validate('asset:xyz789')).toThrow(
			'shape ID must start with "shape:"'
		)
		expect(() => shapeValidator.validate('abc123')).toThrow('shape ID must start with "shape:"')
		expect(() => shapeValidator.validate('')).toThrow('shape ID must start with "shape:"')
	})

	it('should reject non-string values', () => {
		const validator = idValidator<MockShapeId>('shape')

		expect(() => validator.validate(123)).toThrow()
		expect(() => validator.validate(null)).toThrow()
		expect(() => validator.validate(undefined)).toThrow()
		expect(() => validator.validate({})).toThrow()
	})

	it('should be case-sensitive for prefix', () => {
		const validator = idValidator<MockShapeId>('shape')

		expect(() => validator.validate('SHAPE:abc123')).toThrow('shape ID must start with "shape:"')
		expect(() => validator.validate('Shape:abc123')).toThrow('shape ID must start with "shape:"')
	})

	it('should work with isValid method', () => {
		const validator = idValidator<MockShapeId>('shape')

		expect(validator.isValid('shape:abc123')).toBe(true)
		expect(validator.isValid('page:abc123')).toBe(false)
		expect(validator.isValid(123)).toBe(false)
		expect(validator.isValid('SHAPE:abc')).toBe(false)
	})

	it('should work with different prefixes independently', () => {
		const shapeValidator = idValidator<MockShapeId>('shape')
		const pageValidator = idValidator<MockPageId>('page')

		expect(shapeValidator.isValid('shape:abc123')).toBe(true)
		expect(shapeValidator.isValid('page:abc123')).toBe(false)

		expect(pageValidator.isValid('shape:abc123')).toBe(false)
		expect(pageValidator.isValid('page:abc123')).toBe(true)
	})
})
