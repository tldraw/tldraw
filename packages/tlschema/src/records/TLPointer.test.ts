import { describe, expect, it } from 'vitest'
import { pointerMigrations, pointerVersions, TLPOINTER_ID } from './TLPointer'

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
