import { describe, expect, it } from 'vitest'
import {
	instancePresenceMigrations,
	instancePresenceValidator,
	instancePresenceVersions,
	TLInstancePresenceID,
} from './TLPresence'

describe('instancePresenceValidator', () => {
	it('should validate valid instance presence records', () => {
		const validPresence = {
			typeName: 'instance_presence',
			id: 'instance_presence:test' as TLInstancePresenceID,
			userId: 'user123',
			userName: 'Test User',
			lastActivityTimestamp: null,
			color: '#007AFF',
			camera: null,
			selectedShapeIds: [],
			currentPageId: 'page:main' as any,
			brush: null,
			scribbles: [],
			screenBounds: null,
			followingUserId: null,
			cursor: null,
			chatMessage: '',
			meta: {},
		}

		expect(() => instancePresenceValidator.validate(validPresence)).not.toThrow()
		const validated = instancePresenceValidator.validate(validPresence)
		expect(validated).toEqual(validPresence)
	})

	it('should validate presence with complete data', () => {
		const complexPresence = {
			typeName: 'instance_presence',
			id: 'instance_presence:complex' as TLInstancePresenceID,
			userId: 'user456',
			userName: 'Complex User',
			lastActivityTimestamp: Date.now(),
			color: '#FF3B30',
			camera: { x: -100, y: 200, z: 0.75 },
			selectedShapeIds: ['shape:1' as any, 'shape:2' as any],
			currentPageId: 'page:design' as any,
			brush: { x: 50, y: 75, w: 150, h: 100 },
			scribbles: [
				{
					id: 'scribble:1',
					points: [{ x: 0, y: 0, z: 0.5 }],
					size: 4,
					color: 'black',
					opacity: 1,
					state: 'starting',
					delay: 0,
					shrink: 0,
					taper: false,
				},
			],
			screenBounds: { x: 0, y: 0, w: 2560, h: 1440 },
			followingUserId: 'leader123',
			cursor: { x: 300, y: 400, type: 'pointer', rotation: 45 },
			chatMessage: 'Working on design!',
			meta: { team: 'design', role: 'designer' },
		}

		expect(() => instancePresenceValidator.validate(complexPresence)).not.toThrow()
	})

	it('should reject invalid typeName', () => {
		const invalidPresence = {
			typeName: 'not-instance-presence',
			id: 'instance_presence:test' as TLInstancePresenceID,
			userId: 'user123',
			userName: 'Test',
			lastActivityTimestamp: null,
			color: '#000000',
			camera: null,
			selectedShapeIds: [],
			currentPageId: 'page:main' as any,
			brush: null,
			scribbles: [],
			screenBounds: null,
			followingUserId: null,
			cursor: null,
			chatMessage: '',
			meta: {},
		}

		expect(() => instancePresenceValidator.validate(invalidPresence)).toThrow()
	})
})

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
