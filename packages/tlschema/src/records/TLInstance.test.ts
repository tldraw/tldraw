import { describe, expect, it } from 'vitest'
import { StyleProp } from '../styles/StyleProp'
import {
	createInstanceRecordType,
	instanceIdValidator,
	instanceMigrations,
	instanceVersions,
	pluckPreservingValues,
	shouldKeyBePreservedBetweenSessions,
	TLInstance,
	TLINSTANCE_ID,
	TLInstanceId,
} from './TLInstance'

// Mock style prop for testing
const mockColorStyle = {
	type: 'color',
	defaultValue: 'black',
	getDefaultValue: () => 'black',
} as unknown as StyleProp<string>

const mockStylesMap = new Map([['color', mockColorStyle]])
const InstanceRecordType = createInstanceRecordType(mockStylesMap)

describe('TLInstance', () => {
	it('should define the instance interface with all required properties', () => {
		const instance: TLInstance = {
			id: TLINSTANCE_ID,
			typeName: 'instance',
			currentPageId: 'page:page1' as any,
			opacityForNextShape: 0.5,
			stylesForNextShape: { color: 'red' },
			followingUserId: 'user123',
			highlightedUserIds: ['user1', 'user2'],
			brush: { x: 0, y: 0, w: 100, h: 50 },
			cursor: { type: 'default', rotation: 0 },
			scribbles: [],
			isFocusMode: false,
			isDebugMode: true,
			isToolLocked: false,
			exportBackground: true,
			screenBounds: { x: 0, y: 0, w: 1920, h: 1080 },
			insets: [false, false, false, false],
			zoomBrush: null,
			chatMessage: 'Hello',
			isChatting: false,
			isPenMode: false,
			isGridMode: true,
			isFocused: true,
			devicePixelRatio: 2,
			isCoarsePointer: false,
			isHoveringCanvas: true,
			openMenus: ['main', 'tools'],
			isChangingStyle: false,
			isReadonly: false,
			meta: { userId: 'user123' },
			duplicateProps: {
				shapeIds: ['shape:1' as any],
				offset: { x: 10, y: 20 },
			},
		}

		expect(instance.id).toBe(TLINSTANCE_ID)
		expect(instance.typeName).toBe('instance')
		expect(instance.currentPageId).toBe('page:page1')
		expect(instance.opacityForNextShape).toBe(0.5)
		expect(instance.cursor.type).toBe('default')
		expect(instance.isGridMode).toBe(true)
	})
})

describe('shouldKeyBePreservedBetweenSessions', () => {
	it('should define preservation rules for all TLInstance keys', () => {
		// Check that all keys are defined
		expect(shouldKeyBePreservedBetweenSessions.id).toBe(false)
		expect(shouldKeyBePreservedBetweenSessions.typeName).toBe(false)
		expect(shouldKeyBePreservedBetweenSessions.currentPageId).toBe(false)
		expect(shouldKeyBePreservedBetweenSessions.isFocusMode).toBe(true)
		expect(shouldKeyBePreservedBetweenSessions.isDebugMode).toBe(true)
		expect(shouldKeyBePreservedBetweenSessions.exportBackground).toBe(true)
		expect(shouldKeyBePreservedBetweenSessions.isGridMode).toBe(true)
	})

	it('should preserve user preferences', () => {
		const userPreferences = [
			'isFocusMode',
			'isDebugMode',
			'isToolLocked',
			'exportBackground',
			'isGridMode',
			'isReadonly',
		]

		userPreferences.forEach((key) => {
			expect(
				shouldKeyBePreservedBetweenSessions[key as keyof typeof shouldKeyBePreservedBetweenSessions]
			).toBe(true)
		})
	})

	it('should not preserve temporary state', () => {
		const temporaryState = [
			'currentPageId',
			'opacityForNextShape',
			'stylesForNextShape',
			'followingUserId',
			'brush',
			'cursor',
			'scribbles',
			'zoomBrush',
			'chatMessage',
			'isChatting',
			'isPenMode',
			'isHoveringCanvas',
			'openMenus',
			'isChangingStyle',
			'duplicateProps',
		]

		temporaryState.forEach((key) => {
			expect(
				shouldKeyBePreservedBetweenSessions[key as keyof typeof shouldKeyBePreservedBetweenSessions]
			).toBe(false)
		})
	})
})

describe('pluckPreservingValues', () => {
	it('should return null for null input', () => {
		expect(pluckPreservingValues(null)).toBe(null)
	})

	it('should return null for undefined input', () => {
		expect(pluckPreservingValues(undefined)).toBe(null)
	})

	it('should filter properties according to preservation rules', () => {
		const fullInstance: TLInstance = {
			id: TLINSTANCE_ID,
			typeName: 'instance',
			currentPageId: 'page:page1' as any,
			opacityForNextShape: 0.5,
			stylesForNextShape: {},
			followingUserId: null,
			highlightedUserIds: [],
			brush: null,
			cursor: { type: 'default', rotation: 0 },
			scribbles: [],
			isFocusMode: true,
			isDebugMode: false,
			isToolLocked: true,
			exportBackground: true,
			screenBounds: { x: 0, y: 0, w: 1920, h: 1080 },
			insets: [false, false, false, false],
			zoomBrush: null,
			chatMessage: '',
			isChatting: false,
			isPenMode: false,
			isGridMode: true,
			isFocused: true,
			devicePixelRatio: 2,
			isCoarsePointer: false,
			isHoveringCanvas: null,
			openMenus: [],
			isChangingStyle: false,
			isReadonly: false,
			meta: {},
			duplicateProps: null,
		}

		const preserved = pluckPreservingValues(fullInstance)

		// Should preserve user preferences
		expect(preserved?.isFocusMode).toBe(true)
		expect(preserved?.isDebugMode).toBe(false)
		expect(preserved?.isToolLocked).toBe(true)
		expect(preserved?.exportBackground).toBe(true)
		expect(preserved?.isGridMode).toBe(true)
		expect(preserved?.screenBounds).toEqual({ x: 0, y: 0, w: 1920, h: 1080 })
		expect(preserved?.devicePixelRatio).toBe(2)

		// Should not preserve temporary state
		expect(preserved?.currentPageId).toBeUndefined()
		expect(preserved?.opacityForNextShape).toBeUndefined()
		expect(preserved?.brush).toBeUndefined()
		expect(preserved?.cursor).toBeUndefined()
		expect(preserved?.chatMessage).toBeUndefined()
		expect(preserved?.openMenus).toBeUndefined()
	})
})

describe('TLInstanceId', () => {
	it('should be a branded type', () => {
		const id: TLInstanceId = TLINSTANCE_ID
		expect(typeof id).toBe('string')
		expect(id).toBe('instance:instance')
	})
})

describe('instanceIdValidator', () => {
	it('should validate correct instance IDs', () => {
		expect(() => instanceIdValidator.validate('instance:instance')).not.toThrow()
		expect(() => instanceIdValidator.validate('instance:test')).not.toThrow()
	})

	it('should reject invalid instance IDs', () => {
		expect(() => instanceIdValidator.validate('invalid')).toThrow()
		expect(() => instanceIdValidator.validate('page:instance')).toThrow()
		expect(() => instanceIdValidator.validate('')).toThrow()
	})

	it('should validate TLINSTANCE_ID', () => {
		expect(() => instanceIdValidator.validate(TLINSTANCE_ID)).not.toThrow()
	})
})

describe('createInstanceRecordType', () => {
	it('should create a valid record type', () => {
		const recordType = createInstanceRecordType(mockStylesMap)
		expect(recordType.typeName).toBe('instance')
		expect(recordType.scope).toBe('session')
	})

	it('should create instance with defaults', () => {
		const instance = InstanceRecordType.create({
			id: TLINSTANCE_ID,
			currentPageId: 'page:page1' as any,
		})

		expect(instance.id).toBe(TLINSTANCE_ID)
		expect(instance.typeName).toBe('instance')
		expect(instance.currentPageId).toBe('page:page1')
		expect(instance.followingUserId).toBe(null)
		expect(instance.opacityForNextShape).toBe(1)
		expect(instance.stylesForNextShape).toEqual({})
		expect(instance.brush).toBe(null)
		expect(instance.scribbles).toEqual([])
		expect(instance.cursor).toEqual({ type: 'default', rotation: 0 })
		expect(instance.isFocusMode).toBe(false)
		expect(instance.isDebugMode).toBe(false)
		expect(instance.isToolLocked).toBe(false)
		expect(instance.exportBackground).toBe(false)
		expect(instance.screenBounds).toEqual({ x: 0, y: 0, w: 1080, h: 720 })
		expect(instance.insets).toEqual([false, false, false, false])
		expect(instance.zoomBrush).toBe(null)
		expect(instance.isGridMode).toBe(false)
		expect(instance.isPenMode).toBe(false)
		expect(instance.chatMessage).toBe('')
		expect(instance.isChatting).toBe(false)
		expect(instance.highlightedUserIds).toEqual([])
		expect(instance.isFocused).toBe(false)
		expect(instance.devicePixelRatio).toBe(
			typeof window === 'undefined' ? 1 : window.devicePixelRatio
		)
		expect(instance.isCoarsePointer).toBe(false)
		expect(instance.isHoveringCanvas).toBe(null)
		expect(instance.openMenus).toEqual([])
		expect(instance.isChangingStyle).toBe(false)
		expect(instance.isReadonly).toBe(false)
		expect(instance.meta).toEqual({})
		expect(instance.duplicateProps).toBe(null)
	})

	it('should create instance with custom properties', () => {
		const instance = InstanceRecordType.create({
			id: TLINSTANCE_ID,
			currentPageId: 'page:custom' as any,
			isFocusMode: true,
			isGridMode: true,
			opacityForNextShape: 0.75,
			stylesForNextShape: { color: 'red' },
			meta: { custom: 'data' },
		})

		expect(instance.currentPageId).toBe('page:custom')
		expect(instance.isFocusMode).toBe(true)
		expect(instance.isGridMode).toBe(true)
		expect(instance.opacityForNextShape).toBe(0.75)
		expect(instance.stylesForNextShape).toEqual({ color: 'red' })
		expect(instance.meta).toEqual({ custom: 'data' })
	})

	it('should validate created instances', () => {
		const instance = InstanceRecordType.create({
			id: TLINSTANCE_ID,
			currentPageId: 'page:test' as any,
		})

		// Validator is created dynamically, so we test it indirectly
		expect(() => InstanceRecordType.create(instance)).not.toThrow()
	})

	it('should handle complex brush and scribble data', () => {
		const instance = InstanceRecordType.create({
			id: TLINSTANCE_ID,
			currentPageId: 'page:test' as any,
			brush: { x: 100, y: 200, w: 300, h: 150 },
			scribbles: [
				{
					id: 'scribble:1',
					points: [
						{ x: 0, y: 0, z: 0.5 },
						{ x: 10, y: 10, z: 0.5 },
					],
					size: 4,
					color: 'black',
					opacity: 1,
					state: 'starting',
					delay: 0,
					shrink: 0,
					taper: false,
				},
			],
		})

		expect(instance.brush).toEqual({ x: 100, y: 200, w: 300, h: 150 })
		expect(instance.scribbles).toHaveLength(1)
		expect(instance.scribbles[0].id).toBe('scribble:1')
	})

	it('should handle duplicate props', () => {
		const instance = InstanceRecordType.create({
			id: TLINSTANCE_ID,
			currentPageId: 'page:test' as any,
			duplicateProps: {
				shapeIds: ['shape:1' as any, 'shape:2' as any],
				offset: { x: 25, y: 30 },
			},
		})

		expect(instance.duplicateProps?.shapeIds).toEqual(['shape:1', 'shape:2'])
		expect(instance.duplicateProps?.offset).toEqual({ x: 25, y: 30 })
	})
})

describe('instanceVersions', () => {
	it('should have all migration versions defined', () => {
		const expectedVersions = [
			'AddTransparentExportBgs',
			'RemoveDialog',
			'AddToolLockMode',
			'RemoveExtraPropsForNextShape',
			'AddLabelColor',
			'AddFollowingUserId',
			'RemoveAlignJustify',
			'AddZoom',
			'AddVerticalAlign',
			'AddScribbleDelay',
			'RemoveUserId',
			'AddIsPenModeAndIsGridMode',
			'HoistOpacity',
			'AddChat',
			'AddHighlightedUserIds',
			'ReplacePropsForNextShapeWithStylesForNextShape',
			'AddMeta',
			'RemoveCursorColor',
			'AddLonelyProperties',
			'ReadOnlyReadonly',
			'AddHoveringCanvas',
			'AddScribbles',
			'AddInset',
			'AddDuplicateProps',
			'RemoveCanMoveCamera',
		]

		expectedVersions.forEach((version) => {
			expect(instanceVersions[version as keyof typeof instanceVersions]).toBeDefined()
			expect(typeof instanceVersions[version as keyof typeof instanceVersions]).toBe('string')
		})
	})

	it('should have sequential version numbers', () => {
		expect(instanceVersions.AddTransparentExportBgs).toBe('com.tldraw.instance/1')
		expect(instanceVersions.RemoveDialog).toBe('com.tldraw.instance/2')
		expect(instanceVersions.AddToolLockMode).toBe('com.tldraw.instance/3')
		expect(instanceVersions.RemoveCanMoveCamera).toBe('com.tldraw.instance/25')
	})
})

describe('instanceMigrations', () => {
	it('should have correct migration configuration', () => {
		expect(instanceMigrations.sequenceId).toBe('com.tldraw.instance')
		// expect(instanceMigrations.recordType).toBe('instance') // Property doesn't exist on MigrationSequence
		expect(Array.isArray(instanceMigrations.sequence)).toBe(true)
		expect(instanceMigrations.sequence.length).toBe(25)
	})

	it('should migrate AddTransparentExportBgs correctly', () => {
		const migration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.AddTransparentExportBgs
		)!
		const oldRecord: any = { id: TLINSTANCE_ID, typeName: 'instance' }
		const result = migration.up(oldRecord)

		expect((result as any).exportBackground).toBe(true)
	})

	it('should migrate RemoveDialog correctly', () => {
		const migration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.RemoveDialog
		)!
		const oldRecord: any = {
			id: TLINSTANCE_ID,
			typeName: 'instance',
			dialog: 'some-dialog',
			otherProp: 'keep-me',
		}
		const result = migration.up(oldRecord)

		expect((result as any).dialog).toBeUndefined()
		expect((result as any).otherProp).toBe('keep-me')
	})

	it('should migrate AddToolLockMode correctly', () => {
		const migration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.AddToolLockMode
		)!
		const oldRecord: any = { id: TLINSTANCE_ID, typeName: 'instance' }
		const result = migration.up(oldRecord)

		expect((result as any).isToolLocked).toBe(false)
	})

	it('should migrate AddFollowingUserId correctly', () => {
		const migration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.AddFollowingUserId
		)!
		const oldRecord: any = { id: TLINSTANCE_ID, typeName: 'instance' }
		const result = migration.up(oldRecord)

		expect((result as any).followingUserId).toBe(null)
	})

	it('should migrate AddZoom correctly', () => {
		const migration = instanceMigrations.sequence.find((m) => m.id === instanceVersions.AddZoom)!
		const oldRecord: any = { id: TLINSTANCE_ID, typeName: 'instance' }
		const result = migration.up(oldRecord)

		expect((result as any).zoomBrush).toBe(null)
	})

	it('should migrate AddIsPenModeAndIsGridMode correctly', () => {
		const migration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.AddIsPenModeAndIsGridMode
		)!
		const oldRecord: any = { id: TLINSTANCE_ID, typeName: 'instance' }
		const result = migration.up(oldRecord)

		expect((result as any).isPenMode).toBe(false)
		expect((result as any).isGridMode).toBe(false)
	})

	it('should migrate HoistOpacity correctly', () => {
		const migration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.HoistOpacity
		)!
		const oldRecord: any = {
			id: TLINSTANCE_ID,
			typeName: 'instance',
			propsForNextShape: {
				opacity: '0.5',
				color: 'red',
			},
		}
		const result = migration.up(oldRecord)

		expect((result as any).opacityForNextShape).toBe(0.5)
		expect((result as any).propsForNextShape.opacity).toBeUndefined()
		expect((result as any).propsForNextShape.color).toBe('red')
	})

	it('should migrate AddChat correctly', () => {
		const migration = instanceMigrations.sequence.find((m) => m.id === instanceVersions.AddChat)!
		const oldRecord: any = { id: TLINSTANCE_ID, typeName: 'instance' }
		const result = migration.up(oldRecord)

		expect((result as any).chatMessage).toBe('')
		expect((result as any).isChatting).toBe(false)
	})

	it('should migrate AddHighlightedUserIds correctly', () => {
		const migration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.AddHighlightedUserIds
		)!
		const oldRecord: any = { id: TLINSTANCE_ID, typeName: 'instance' }
		const result = migration.up(oldRecord)

		expect((result as any).highlightedUserIds).toEqual([])
	})

	it('should migrate ReplacePropsForNextShapeWithStylesForNextShape correctly', () => {
		const migration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.ReplacePropsForNextShapeWithStylesForNextShape
		)!
		const oldRecord: any = {
			id: TLINSTANCE_ID,
			typeName: 'instance',
			propsForNextShape: { color: 'red' },
		}
		const result = migration.up(oldRecord)

		expect((result as any).propsForNextShape).toBeUndefined()
		expect((result as any).stylesForNextShape).toEqual({})
	})

	it('should migrate AddMeta correctly', () => {
		const migration = instanceMigrations.sequence.find((m) => m.id === instanceVersions.AddMeta)!
		const oldRecord: any = { id: TLINSTANCE_ID, typeName: 'instance' }
		const result = migration.up(oldRecord)

		expect((result as any).meta).toEqual({})
	})

	it('should migrate RemoveCursorColor correctly', () => {
		const migration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.RemoveCursorColor
		)!
		const oldRecord: any = {
			id: TLINSTANCE_ID,
			typeName: 'instance',
			cursor: { type: 'default', rotation: 0, color: 'red' },
		}
		const result = migration.up(oldRecord)

		expect((result as any).cursor.color).toBeUndefined()
		expect((result as any).cursor.type).toBe('default')
		expect((result as any).cursor.rotation).toBe(0)
	})

	it('should migrate AddHoveringCanvas correctly', () => {
		const migration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.AddHoveringCanvas
		)!
		const oldRecord: any = { id: TLINSTANCE_ID, typeName: 'instance' }
		const result = migration.up(oldRecord)

		expect((result as any).isHoveringCanvas).toBe(null)
	})

	it('should migrate AddScribbles correctly', () => {
		const migration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.AddScribbles
		)!
		const oldRecord: any = {
			id: TLINSTANCE_ID,
			typeName: 'instance',
			scribble: { points: [], size: 4 },
		}
		const result = migration.up(oldRecord)

		expect((result as any).scribble).toBeUndefined()
		expect((result as any).scribbles).toEqual([])
	})

	it('should migrate AddInset correctly', () => {
		const migration = instanceMigrations.sequence.find((m) => m.id === instanceVersions.AddInset)!
		const oldRecord: any = { id: TLINSTANCE_ID, typeName: 'instance' }
		const result = migration.up(oldRecord)

		expect((result as any).insets).toEqual([false, false, false, false])
	})

	it('should migrate AddDuplicateProps correctly', () => {
		const migration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.AddDuplicateProps
		)!
		const oldRecord: any = { id: TLINSTANCE_ID, typeName: 'instance' }
		const result = migration.up(oldRecord)

		expect((result as any).duplicateProps).toBe(null)
	})

	it('should migrate RemoveCanMoveCamera correctly', () => {
		const migration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.RemoveCanMoveCamera
		)!
		const oldRecord: any = {
			id: TLINSTANCE_ID,
			typeName: 'instance',
			canMoveCamera: true,
			otherProp: 'keep',
		}
		const result = migration.up(oldRecord)

		expect((result as any).canMoveCamera).toBeUndefined()
		expect((result as any).otherProp).toBe('keep')
	})

	it('should have down migration for AddInset', () => {
		const migration = instanceMigrations.sequence.find((m) => m.id === instanceVersions.AddInset)!
		expect(migration.down).toBeDefined()

		const record: any = {
			id: TLINSTANCE_ID,
			typeName: 'instance',
			insets: [true, false, true, false],
		}
		const result = migration.down!(record)
		expect((result as any).insets).toBeUndefined()
	})

	it('should have down migration for RemoveCanMoveCamera', () => {
		const migration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.RemoveCanMoveCamera
		)!
		expect(migration.down).toBeDefined()

		const record: any = { id: TLINSTANCE_ID, typeName: 'instance' }
		const result = migration.down!(record)
		expect((result as any).canMoveCamera).toBe(true)
	})
})

describe('TLINSTANCE_ID', () => {
	it('should be the correct constant', () => {
		expect(TLINSTANCE_ID).toBe('instance:instance')
	})

	it('should be a valid TLInstanceId', () => {
		expect(() => instanceIdValidator.validate(TLINSTANCE_ID)).not.toThrow()
	})
})

describe('TLInstance Integration', () => {
	it('should work with complete instance lifecycle', () => {
		// Create instance with defaults
		const instance = InstanceRecordType.create({
			id: TLINSTANCE_ID,
			currentPageId: 'page:main' as any,
		})

		// Test preservation filtering
		const preserved = pluckPreservingValues(instance)
		expect(preserved?.isFocusMode).toBe(false)
		expect(preserved?.currentPageId).toBeUndefined()

		// Modify instance state
		const updatedInstance: TLInstance = {
			...instance,
			isFocusMode: true,
			isGridMode: true,
			brush: { x: 0, y: 0, w: 100, h: 100 },
			scribbles: [
				{
					id: 'scribble:1',
					points: [{ x: 0, y: 0, z: 0.5 }],
					size: 2,
					color: 'black',
					opacity: 0.8,
					state: 'starting',
					delay: 0,
					shrink: 0,
					taper: false,
				},
			],
		}

		expect(updatedInstance.isFocusMode).toBe(true)
		expect(updatedInstance.isGridMode).toBe(true)
		expect(updatedInstance.brush).toEqual({ x: 0, y: 0, w: 100, h: 100 })
		expect(updatedInstance.scribbles).toHaveLength(1)
	})

	it('should handle complex styles configuration', () => {
		const mockSizeStyle = {
			type: 'size',
			defaultValue: 'm',
			getDefaultValue: () => 'm',
		} as unknown as StyleProp<unknown>

		const mockOpacityStyle = {
			type: 'opacity',
			defaultValue: 1,
			getDefaultValue: () => 1,
		} as unknown as StyleProp<unknown>

		const complexStylesMap = new Map([
			['color', mockColorStyle as StyleProp<unknown>],
			['size', mockSizeStyle],
			['opacity', mockOpacityStyle],
		])

		const ComplexInstanceRecordType = createInstanceRecordType(complexStylesMap)
		const instance = ComplexInstanceRecordType.create({
			id: TLINSTANCE_ID,
			currentPageId: 'page:test' as any,
			stylesForNextShape: {
				color: 'blue',
				size: 'l',
				opacity: 0.75,
			},
		})

		expect(instance.stylesForNextShape.color).toBe('blue')
		expect(instance.stylesForNextShape.size).toBe('l')
		expect(instance.stylesForNextShape.opacity).toBe(0.75)
	})

	it('should handle edge case values', () => {
		const instance = InstanceRecordType.create({
			id: TLINSTANCE_ID,
			currentPageId: 'page:test' as any,
			opacityForNextShape: 0,
			devicePixelRatio: 0.5,
			screenBounds: { x: -100, y: -200, w: 0, h: 0 },
			highlightedUserIds: [],
			openMenus: [],
			chatMessage: '',
		})

		expect(instance.opacityForNextShape).toBe(0)
		expect(instance.devicePixelRatio).toBe(0.5)
		expect(instance.screenBounds).toEqual({ x: -100, y: -200, w: 0, h: 0 })
		expect(instance.highlightedUserIds).toEqual([])
		expect(instance.openMenus).toEqual([])
		expect(instance.chatMessage).toBe('')
	})
})
