import { describe, expect, it } from 'vitest'
import {
	instancePresenceMigrations,
	InstancePresenceRecordType,
	instancePresenceValidator,
	instancePresenceVersions,
	TLInstancePresence,
	TLInstancePresenceID,
} from './TLPresence'

describe('TLInstancePresence', () => {
	it('should define the instance presence interface correctly', () => {
		const presence: TLInstancePresence = {
			id: 'instance_presence:user123' as TLInstancePresenceID,
			typeName: 'instance_presence',
			userId: 'user123',
			userName: 'Alice',
			lastActivityTimestamp: Date.now(),
			color: '#FF6B6B',
			camera: { x: 100, y: 150, z: 1.5 },
			selectedShapeIds: ['shape:rect1' as any],
			currentPageId: 'page:main' as any,
			brush: { x: 10, y: 20, w: 100, h: 50 },
			scribbles: [],
			screenBounds: { x: 0, y: 0, w: 1920, h: 1080 },
			followingUserId: 'user456',
			cursor: { x: 200, y: 250, type: 'default', rotation: 0 },
			chatMessage: 'Hello everyone!',
			meta: { session: 'active' },
		}

		expect(presence.id).toBe('instance_presence:user123')
		expect(presence.typeName).toBe('instance_presence')
		expect(presence.userId).toBe('user123')
		expect(presence.userName).toBe('Alice')
		expect(presence.color).toBe('#FF6B6B')
		expect(presence.camera?.z).toBe(1.5)
		expect(presence.cursor?.type).toBe('default')
	})
})

describe('TLInstancePresenceID', () => {
	it('should be a branded type', () => {
		const presenceId: TLInstancePresenceID = 'instance_presence:user123' as TLInstancePresenceID
		expect(typeof presenceId).toBe('string')
		expect(presenceId.startsWith('instance_presence:')).toBe(true)
	})
})

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

	it('should reject invalid id format', () => {
		const invalidPresence = {
			typeName: 'instance_presence',
			id: 'not-valid-id' as TLInstancePresenceID,
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

	it('should reject missing required fields', () => {
		const incompletePresence = {
			typeName: 'instance_presence',
			id: 'instance_presence:test' as TLInstancePresenceID,
			userId: 'user123',
			// missing required fields
		}

		expect(() => instancePresenceValidator.validate(incompletePresence)).toThrow()
	})

	it('should validate nullable fields correctly', () => {
		const presenceWithNulls = {
			typeName: 'instance_presence',
			id: 'instance_presence:nulls' as TLInstancePresenceID,
			userId: 'user789',
			userName: 'Null User',
			lastActivityTimestamp: null,
			color: '#34C759',
			camera: null,
			selectedShapeIds: [],
			currentPageId: 'page:test' as any,
			brush: null,
			scribbles: [],
			screenBounds: null,
			followingUserId: null,
			cursor: null,
			chatMessage: '',
			meta: {},
		}

		expect(() => instancePresenceValidator.validate(presenceWithNulls)).not.toThrow()
	})
})

describe('instancePresenceVersions', () => {
	it('should have all migration versions defined', () => {
		const expectedVersions = [
			'AddScribbleDelay',
			'RemoveInstanceId',
			'AddChatMessage',
			'AddMeta',
			'RenameSelectedShapeIds',
			'NullableCameraCursor',
		]

		expectedVersions.forEach((version) => {
			expect(
				instancePresenceVersions[version as keyof typeof instancePresenceVersions]
			).toBeDefined()
			expect(
				typeof instancePresenceVersions[version as keyof typeof instancePresenceVersions]
			).toBe('string')
		})
	})

	it('should have sequential version numbers', () => {
		expect(instancePresenceVersions.AddScribbleDelay).toBe('com.tldraw.instance_presence/1')
		expect(instancePresenceVersions.RemoveInstanceId).toBe('com.tldraw.instance_presence/2')
		expect(instancePresenceVersions.AddChatMessage).toBe('com.tldraw.instance_presence/3')
		expect(instancePresenceVersions.AddMeta).toBe('com.tldraw.instance_presence/4')
		expect(instancePresenceVersions.RenameSelectedShapeIds).toBe('com.tldraw.instance_presence/5')
		expect(instancePresenceVersions.NullableCameraCursor).toBe('com.tldraw.instance_presence/6')
	})
})

describe('instancePresenceMigrations', () => {
	it('should have correct migration configuration', () => {
		expect(instancePresenceMigrations.sequenceId).toBe('com.tldraw.instance_presence')
		// expect(instancePresenceMigrations.recordType).toBe('instance_presence') // Property doesn't exist on MigrationSequence
		expect(Array.isArray(instancePresenceMigrations.sequence)).toBe(true)
		expect(instancePresenceMigrations.sequence).toHaveLength(6)
	})

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

describe('InstancePresenceRecordType', () => {
	it('should create instance presence records with defaults', () => {
		const presence = InstancePresenceRecordType.create({
			id: 'instance_presence:test' as TLInstancePresenceID,
			userId: 'user123',
			userName: 'Test User',
			currentPageId: 'page:main' as any,
		})

		expect(presence.id).toBe('instance_presence:test')
		expect(presence.typeName).toBe('instance_presence')
		expect(presence.userId).toBe('user123')
		expect(presence.userName).toBe('Test User')
		expect(presence.currentPageId).toBe('page:main')
		expect(presence.lastActivityTimestamp).toBe(null)
		expect(presence.followingUserId).toBe(null)
		expect(presence.color).toBe('#FF0000')
		expect(presence.camera).toBe(null)
		expect(presence.cursor).toBe(null)
		expect(presence.screenBounds).toBe(null)
		expect(presence.selectedShapeIds).toEqual([])
		expect(presence.brush).toBe(null)
		expect(presence.scribbles).toEqual([])
		expect(presence.chatMessage).toBe('')
		expect(presence.meta).toEqual({})
	})

	it('should create with custom properties', () => {
		const presence = InstancePresenceRecordType.create({
			id: 'instance_presence:custom' as TLInstancePresenceID,
			userId: 'user456',
			userName: 'Custom User',
			currentPageId: 'page:custom' as any,
			color: '#00AEEF',
			camera: { x: 100, y: 200, z: 1.25 },
			selectedShapeIds: ['shape:1' as any, 'shape:2' as any],
			cursor: { x: 50, y: 75, type: 'pointer', rotation: 90 },
			chatMessage: 'Custom message',
			meta: { custom: 'data' },
		})

		expect(presence.color).toBe('#00AEEF')
		expect(presence.camera).toEqual({ x: 100, y: 200, z: 1.25 })
		expect(presence.selectedShapeIds).toHaveLength(2)
		expect(presence.cursor?.rotation).toBe(90)
		expect(presence.chatMessage).toBe('Custom message')
		expect(presence.meta).toEqual({ custom: 'data' })
	})

	it('should have correct configuration', () => {
		expect(InstancePresenceRecordType.typeName).toBe('instance_presence')
		expect(InstancePresenceRecordType.scope).toBe('presence')
	})

	it('should validate created records', () => {
		const presence = InstancePresenceRecordType.create({
			id: 'instance_presence:validated' as TLInstancePresenceID,
			userId: 'user789',
			userName: 'Validated User',
			currentPageId: 'page:validated' as any,
		})

		expect(() => instancePresenceValidator.validate(presence)).not.toThrow()
	})
})

describe('TLInstancePresence Integration', () => {
	it('should work with typical collaborative scenarios', () => {
		// Create initial presence
		const initialPresence = InstancePresenceRecordType.create({
			id: 'instance_presence:collab' as TLInstancePresenceID,
			userId: 'designer123',
			userName: 'Alice Designer',
			currentPageId: 'page:wireframes' as any,
			color: '#FF6B6B',
		})

		// User starts selecting shapes
		const withSelection: TLInstancePresence = {
			...initialPresence,
			selectedShapeIds: ['shape:header' as any, 'shape:sidebar' as any],
			lastActivityTimestamp: Date.now(),
		}

		// User starts following another user
		const withFollowing: TLInstancePresence = {
			...withSelection,
			followingUserId: 'lead456',
			camera: { x: -200, y: -100, z: 0.8 },
		}

		// User sends chat message
		const withChat: TLInstancePresence = {
			...withFollowing,
			chatMessage: 'Following the lead designer',
		}

		expect(withSelection.selectedShapeIds).toHaveLength(2)
		expect(withFollowing.followingUserId).toBe('lead456')
		expect(withChat.chatMessage).toBe('Following the lead designer')
		expect(() => instancePresenceValidator.validate(withChat)).not.toThrow()
	})

	it('should handle complex interaction states', () => {
		const presence = InstancePresenceRecordType.create({
			id: 'instance_presence:complex' as TLInstancePresenceID,
			userId: 'power_user',
			userName: 'Power User',
			currentPageId: 'page:dashboard' as any,
			color: '#007AFF',
			camera: { x: 500, y: 300, z: 2.0 }, // Zoomed in
			selectedShapeIds: ['shape:chart1' as any, 'shape:chart2' as any, 'shape:legend' as any],
			brush: { x: 100, y: 150, w: 200, h: 100 }, // Active selection brush
			scribbles: [
				{
					id: 'scribble:annotation',
					points: [
						{ x: 0, y: 0, z: 0.8 },
						{ x: 10, y: 15, z: 0.9 },
						{ x: 25, y: 30, z: 1.0 },
					],
					size: 3,
					color: 'black',
					opacity: 0.7,
					state: 'starting',
					delay: 0,
					shrink: 0,
					taper: false,
				},
			],
			screenBounds: { x: 0, y: 0, w: 3440, h: 1440 }, // Ultrawide monitor
			cursor: { x: 750, y: 450, type: 'cross', rotation: 0 },
			lastActivityTimestamp: Date.now(),
			meta: {
				tool: 'select',
				mode: 'multi-select',
				performance: { fps: 60, latency: 15 },
			},
		})

		expect(presence.selectedShapeIds).toHaveLength(3)
		expect(presence.brush).toBeDefined()
		expect(presence.scribbles).toHaveLength(1)
		expect(presence.camera?.z).toBe(2.0)
		expect(presence.cursor?.type).toBe('cross')
		expect((presence.meta.performance as any)?.fps).toBe(60)
		expect(() => instancePresenceValidator.validate(presence)).not.toThrow()
	})

	it('should handle presence lifecycle', () => {
		let presence = InstancePresenceRecordType.create({
			id: 'instance_presence:lifecycle' as TLInstancePresenceID,
			userId: 'temp_user',
			userName: 'Temporary User',
			currentPageId: 'page:temp' as any,
		})

		// User joins and becomes active
		presence = {
			...presence,
			lastActivityTimestamp: Date.now(),
			camera: { x: 0, y: 0, z: 1 },
			cursor: { x: 100, y: 100, type: 'default', rotation: 0 },
		}

		// User becomes inactive
		presence = {
			...presence,
			lastActivityTimestamp: Date.now() - 300000, // 5 minutes ago
			cursor: null, // Hide cursor when inactive
		}

		// User disconnects (would typically be removed from store)
		expect(presence.lastActivityTimestamp).toBeLessThan(Date.now() - 240000) // More than 4 minutes ago
		expect(presence.cursor).toBe(null)
		expect(() => instancePresenceValidator.validate(presence)).not.toThrow()
	})
})
