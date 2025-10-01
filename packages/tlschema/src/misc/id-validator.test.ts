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

	it('should work with different prefixes independently', () => {
		const shapeValidator = idValidator<MockShapeId>('shape')
		const pageValidator = idValidator<MockPageId>('page')

		expect(shapeValidator.isValid('shape:abc123')).toBe(true)
		expect(shapeValidator.isValid('page:abc123')).toBe(false)

		expect(pageValidator.isValid('shape:abc123')).toBe(false)
		expect(pageValidator.isValid('page:abc123')).toBe(true)
	})
})
