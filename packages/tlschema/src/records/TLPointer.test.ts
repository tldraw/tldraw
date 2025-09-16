import { describe, expect, it } from 'vitest'
import {
	pointerMigrations,
	PointerRecordType,
	pointerValidator,
	pointerVersions,
	TLPointer,
	TLPOINTER_ID,
	TLPointerId,
} from './TLPointer'

describe('TLPointer', () => {
	it('should define the pointer interface correctly', () => {
		const pointer: TLPointer = {
			id: TLPOINTER_ID,
			typeName: 'pointer',
			x: 150,
			y: 200,
			lastActivityTimestamp: Date.now(),
			meta: { session: 'data' },
		}

		expect(pointer.id).toBe(TLPOINTER_ID)
		expect(pointer.typeName).toBe('pointer')
		expect(pointer.x).toBe(150)
		expect(pointer.y).toBe(200)
		expect(typeof pointer.lastActivityTimestamp).toBe('number')
		expect(pointer.meta).toEqual({ session: 'data' })
	})
})

describe('TLPointerId', () => {
	it('should be a branded type', () => {
		const pointerId: TLPointerId = TLPOINTER_ID
		expect(typeof pointerId).toBe('string')
		expect(pointerId.startsWith('pointer:')).toBe(true)
	})
})

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
		const validated = pointerValidator.validate(validPointer)
		expect(validated).toEqual(validPointer)
	})

	it('should validate pointers with negative coordinates', () => {
		const pointerWithNegative = {
			typeName: 'pointer',
			id: TLPOINTER_ID,
			x: -150,
			y: -75,
			lastActivityTimestamp: 123456789,
			meta: {},
		}

		expect(() => pointerValidator.validate(pointerWithNegative)).not.toThrow()
	})

	it('should validate pointers with complex meta', () => {
		const pointerWithMeta = {
			typeName: 'pointer',
			id: TLPOINTER_ID,
			x: 0,
			y: 0,
			lastActivityTimestamp: 0,
			meta: {
				userId: 'user123',
				device: { type: 'mouse', pressure: 0.5 },
				session: { id: 'sess456', startTime: Date.now() },
			},
		}

		expect(() => pointerValidator.validate(pointerWithMeta)).not.toThrow()
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

	it('should reject pointers with invalid id format', () => {
		const invalidPointer = {
			typeName: 'pointer',
			id: 'not-pointer-id' as TLPointerId,
			x: 0,
			y: 0,
			lastActivityTimestamp: 0,
			meta: {},
		}

		expect(() => pointerValidator.validate(invalidPointer)).toThrow()
	})

	it('should reject pointers with non-number coordinates', () => {
		const invalidPointer = {
			typeName: 'pointer',
			id: TLPOINTER_ID,
			x: 'not-a-number',
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

	it('should handle edge case coordinate values', () => {
		const extremePointer = {
			typeName: 'pointer',
			id: TLPOINTER_ID,
			x: Infinity,
			y: -Infinity,
			lastActivityTimestamp: 0,
			meta: {},
		}

		expect(() => pointerValidator.validate(extremePointer)).toThrow()
	})
})

describe('pointerVersions', () => {
	it('should have correct version structure', () => {
		expect(pointerVersions).toHaveProperty('AddMeta')
		expect(pointerVersions.AddMeta).toBe('com.tldraw.pointer/1')
	})

	it('should be consistent with migration sequence', () => {
		expect(typeof pointerVersions.AddMeta).toBe('string')
		expect(pointerVersions.AddMeta).toMatch(/^com\.tldraw\.pointer\/\d+$/)
	})
})

describe('pointerMigrations', () => {
	it('should have correct migration configuration', () => {
		expect(pointerMigrations.sequenceId).toBe('com.tldraw.pointer')
		// expect(pointerMigrations.recordType).toBe('pointer') // Property doesn't exist on MigrationSequence
		expect(Array.isArray(pointerMigrations.sequence)).toBe(true)
		expect(pointerMigrations.sequence).toHaveLength(1)
	})

	it('should include AddMeta migration', () => {
		const addMetaMigration = pointerMigrations.sequence.find(
			(m) => m.id === pointerVersions.AddMeta
		)
		expect(addMetaMigration).toBeDefined()
		expect(typeof addMetaMigration?.up).toBe('function')
	})

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
	})

	it('should preserve existing properties during AddMeta migration', () => {
		const addMetaMigration = pointerMigrations.sequence.find(
			(m) => m.id === pointerVersions.AddMeta
		)!

		const oldRecord: any = {
			typeName: 'pointer',
			id: TLPOINTER_ID,
			x: -50,
			y: 75,
			lastActivityTimestamp: 987654,
			customProp: 'should-remain',
		}

		addMetaMigration.up(oldRecord)
		expect(oldRecord.meta).toEqual({})
		expect(oldRecord.x).toBe(-50)
		expect(oldRecord.y).toBe(75)
		expect(oldRecord.lastActivityTimestamp).toBe(987654)
		expect(oldRecord.customProp).toBe('should-remain')
	})
})

describe('PointerRecordType', () => {
	it('should create pointer records with defaults', () => {
		const pointer = PointerRecordType.create({
			id: TLPOINTER_ID,
		})

		expect(pointer.id).toBe(TLPOINTER_ID)
		expect(pointer.typeName).toBe('pointer')
		expect(pointer.x).toBe(0)
		expect(pointer.y).toBe(0)
		expect(pointer.lastActivityTimestamp).toBe(0)
		expect(pointer.meta).toEqual({})
	})

	it('should create pointer records with custom properties', () => {
		const pointer = PointerRecordType.create({
			id: TLPOINTER_ID,
			x: 250,
			y: 300,
			lastActivityTimestamp: Date.now(),
			meta: { userId: 'user456', device: 'touchpad' },
		})

		expect(pointer.x).toBe(250)
		expect(pointer.y).toBe(300)
		expect(pointer.lastActivityTimestamp).toBeGreaterThan(0)
		expect(pointer.meta).toEqual({ userId: 'user456', device: 'touchpad' })
	})

	it('should have correct configuration', () => {
		expect(PointerRecordType.typeName).toBe('pointer')
		expect(PointerRecordType.scope).toBe('session')
	})

	it('should validate created records', () => {
		const pointer = PointerRecordType.create({
			id: TLPOINTER_ID,
			x: 75,
			y: 125,
			lastActivityTimestamp: Date.now(),
		})

		expect(() => pointerValidator.validate(pointer)).not.toThrow()
	})

	it('should handle zero values', () => {
		const pointer = PointerRecordType.create({
			id: TLPOINTER_ID,
			x: 0,
			y: 0,
			lastActivityTimestamp: 0,
		})

		expect(pointer.x).toBe(0)
		expect(pointer.y).toBe(0)
		expect(pointer.lastActivityTimestamp).toBe(0)
		expect(() => pointerValidator.validate(pointer)).not.toThrow()
	})

	it('should handle negative coordinates', () => {
		const pointer = PointerRecordType.create({
			id: TLPOINTER_ID,
			x: -100,
			y: -200,
		})

		expect(pointer.x).toBe(-100)
		expect(pointer.y).toBe(-200)
		expect(() => pointerValidator.validate(pointer)).not.toThrow()
	})
})

describe('TLPOINTER_ID', () => {
	it('should be the correct constant', () => {
		expect(TLPOINTER_ID).toBe('pointer:pointer')
	})

	it('should be consistent with createId', () => {
		const createdId = PointerRecordType.createId('pointer')
		expect(TLPOINTER_ID).toBe(createdId)
	})

	it('should work with pointer creation', () => {
		const pointer = PointerRecordType.create({
			id: TLPOINTER_ID,
			x: 50,
			y: 100,
		})

		expect(pointer.id).toBe(TLPOINTER_ID)
	})
})

describe('TLPointer Integration', () => {
	it('should work with typical pointer tracking', () => {
		// Create initial pointer
		const initialPointer = PointerRecordType.create({
			id: TLPOINTER_ID,
		})

		// Simulate pointer movement
		const movedPointer: TLPointer = {
			...initialPointer,
			x: 150,
			y: 200,
			lastActivityTimestamp: Date.now(),
		}

		// Update activity timestamp
		const updatedPointer: TLPointer = {
			...movedPointer,
			lastActivityTimestamp: Date.now() + 1000,
			meta: { lastUpdateBy: 'mouse' },
		}

		expect(movedPointer.x).toBe(150)
		expect(movedPointer.y).toBe(200)
		expect(updatedPointer.lastActivityTimestamp).toBeGreaterThan(movedPointer.lastActivityTimestamp)
		expect(() => pointerValidator.validate(updatedPointer)).not.toThrow()
	})

	it('should handle pointer activity scenarios', () => {
		const pointer = PointerRecordType.create({
			id: TLPOINTER_ID,
			x: 0,
			y: 0,
			lastActivityTimestamp: Date.now() - 5000, // 5 seconds ago
			meta: {
				device: { type: 'mouse', buttons: 0 },
				session: { active: true, userId: 'user123' },
				activity: {
					lastMove: Date.now() - 1000,
					lastClick: Date.now() - 3000,
					moveCount: 25,
				},
			},
		})

		expect((pointer.meta.device as any).type).toBe('mouse')
		expect((pointer.meta.session as any).active).toBe(true)
		expect((pointer.meta.activity as any).moveCount).toBe(25)
		expect(() => pointerValidator.validate(pointer)).not.toThrow()
	})

	it('should support cursor position tracking', () => {
		let pointer = PointerRecordType.create({
			id: TLPOINTER_ID,
		})

		// Simulate a series of pointer movements
		const movements = [
			{ x: 10, y: 10 },
			{ x: 25, y: 30 },
			{ x: 50, y: 45 },
			{ x: 100, y: 80 },
		]

		movements.forEach((movement, index) => {
			pointer = {
				...pointer,
				x: movement.x,
				y: movement.y,
				lastActivityTimestamp: Date.now() + index * 100,
			}
		})

		expect(pointer.x).toBe(100)
		expect(pointer.y).toBe(80)
		expect(() => pointerValidator.validate(pointer)).not.toThrow()
	})

	it('should handle inactivity detection', () => {
		const oldTimestamp = Date.now() - 60000 // 1 minute ago
		const pointer = PointerRecordType.create({
			id: TLPOINTER_ID,
			x: 500,
			y: 300,
			lastActivityTimestamp: oldTimestamp,
			meta: { inactive: true, reason: 'timeout' },
		})

		const timeSinceActivity = Date.now() - pointer.lastActivityTimestamp
		expect(timeSinceActivity).toBeGreaterThan(50000) // More than 50 seconds
		expect((pointer.meta as any).inactive).toBe(true)
		expect(() => pointerValidator.validate(pointer)).not.toThrow()
	})
})
