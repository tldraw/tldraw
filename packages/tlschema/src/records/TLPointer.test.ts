import { describe, expect, it } from 'vitest'
import { pointerMigrations, pointerValidator, pointerVersions, TLPOINTER_ID } from './TLPointer'

describe('pointerValidator', () => {
	it('should validate valid pointer records', () => {
		const validPointer = {
			typeName: 'pointer',
			id: TLPOINTER_ID,
			x: 100,
			y: 200,
			lastActivityTimestamp: Date.now(),
			meta: {},
		}

		expect(() => pointerValidator.validate(validPointer)).not.toThrow()
	})

	it('should reject pointers with invalid typeName', () => {
		const invalidPointer = {
			typeName: 'not-pointer',
			id: TLPOINTER_ID,
			x: 0,
			y: 0,
			lastActivityTimestamp: 0,
			meta: {},
		}

		expect(() => pointerValidator.validate(invalidPointer)).toThrow()
	})

	it('should reject pointers with missing required fields', () => {
		const incompletePointer = {
			typeName: 'pointer',
			id: TLPOINTER_ID,
			x: 0,
			// missing y, lastActivityTimestamp, meta
		}

		expect(() => pointerValidator.validate(incompletePointer)).toThrow()
	})
})

describe('pointerMigrations', () => {
	it('should apply AddMeta migration correctly', () => {
		const addMetaMigration = pointerMigrations.sequence.find(
			(m) => m.id === pointerVersions.AddMeta
		)!

		const oldRecord: any = {
			typeName: 'pointer',
			id: TLPOINTER_ID,
			x: 100,
			y: 200,
			lastActivityTimestamp: 123456,
		}

		addMetaMigration.up(oldRecord)
		expect(oldRecord.meta).toEqual({})
		expect(oldRecord.x).toBe(100)
		expect(oldRecord.y).toBe(200)
		expect(oldRecord.lastActivityTimestamp).toBe(123456)
	})
})
