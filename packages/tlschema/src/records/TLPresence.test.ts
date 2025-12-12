import { describe, expect, it } from 'vitest'
import { instancePresenceMigrations, instancePresenceVersions } from './TLPresence'

describe('instancePresenceMigrations', () => {
	it('should migrate AddScribbleDelay correctly', () => {
		const migration = instancePresenceMigrations.sequence.find(
			(m) => m.id === instancePresenceVersions.AddScribbleDelay
		)!

		const oldRecordWithScribble: any = {
			scribble: { points: [], size: 4, color: 'black' },
		}
		migration.up(oldRecordWithScribble)
		expect(oldRecordWithScribble.scribble.delay).toBe(0)

		const oldRecordWithoutScribble: any = {
			scribble: null,
		}
		migration.up(oldRecordWithoutScribble)
		expect(oldRecordWithoutScribble.scribble).toBe(null)
	})

	it('should migrate RemoveInstanceId correctly', () => {
		const migration = instancePresenceMigrations.sequence.find(
			(m) => m.id === instancePresenceVersions.RemoveInstanceId
		)!
		const oldRecord: any = {
			instanceId: 'instance:removed',
			otherProp: 'keep-me',
		}
		migration.up(oldRecord)

		expect(oldRecord.instanceId).toBeUndefined()
		expect(oldRecord.otherProp).toBe('keep-me')
	})

	it('should migrate AddChatMessage correctly', () => {
		const migration = instancePresenceMigrations.sequence.find(
			(m) => m.id === instancePresenceVersions.AddChatMessage
		)!
		const oldRecord: any = { id: 'instance_presence:test' }
		migration.up(oldRecord)

		expect(oldRecord.chatMessage).toBe('')
	})

	it('should migrate AddMeta correctly', () => {
		const migration = instancePresenceMigrations.sequence.find(
			(m) => m.id === instancePresenceVersions.AddMeta
		)!
		const oldRecord: any = { id: 'instance_presence:test' }
		migration.up(oldRecord)

		expect(oldRecord.meta).toEqual({})
	})

	it('should handle RenameSelectedShapeIds migration (noop)', () => {
		const migration = instancePresenceMigrations.sequence.find(
			(m) => m.id === instancePresenceVersions.RenameSelectedShapeIds
		)!
		const oldRecord: any = { selectedShapeIds: ['shape:1'] }
		const originalRecord = { ...oldRecord }
		migration.up(oldRecord)

		// Should be a noop
		expect(oldRecord).toEqual(originalRecord)
	})

	it('should handle NullableCameraCursor migration up (noop)', () => {
		const migration = instancePresenceMigrations.sequence.find(
			(m) => m.id === instancePresenceVersions.NullableCameraCursor
		)!
		const record: any = { camera: null, cursor: null }
		const originalRecord = { ...record }
		migration.up(record)

		// Should be a noop
		expect(record).toEqual(originalRecord)
	})

	it('should handle NullableCameraCursor migration down', () => {
		const migration = instancePresenceMigrations.sequence.find(
			(m) => m.id === instancePresenceVersions.NullableCameraCursor
		)!
		expect(migration.down).toBeDefined()

		const record: any = {
			camera: null,
			lastActivityTimestamp: null,
			cursor: null,
			screenBounds: null,
		}
		migration.down!(record)

		expect(record.camera).toEqual({ x: 0, y: 0, z: 1 })
		expect(record.lastActivityTimestamp).toBe(0)
		expect(record.cursor).toEqual({ type: 'default', x: 0, y: 0, rotation: 0 })
		expect(record.screenBounds).toEqual({ x: 0, y: 0, w: 1, h: 1 })
	})
})
