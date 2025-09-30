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
} from './TLInstance'

// Mock style prop for testing
const mockColorStyle = {
	type: 'color',
	defaultValue: 'black',
	getDefaultValue: () => 'black',
} as unknown as StyleProp<string>

const mockStylesMap = new Map([['color', mockColorStyle]])
createInstanceRecordType(mockStylesMap)

describe('shouldKeyBePreservedBetweenSessions', () => {
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
	it('should return null for null or undefined input', () => {
		expect(pluckPreservingValues(null)).toBe(null)
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

		// Should not preserve temporary state
		expect(preserved?.currentPageId).toBeUndefined()
		expect(preserved?.opacityForNextShape).toBeUndefined()
		expect(preserved?.brush).toBeUndefined()
		expect(preserved?.cursor).toBeUndefined()
		expect(preserved?.chatMessage).toBeUndefined()
		expect(preserved?.openMenus).toBeUndefined()
	})
})

describe('instanceIdValidator', () => {
	it('should validate correct instance IDs and reject invalid ones', () => {
		expect(() => instanceIdValidator.validate('instance:instance')).not.toThrow()
		expect(() => instanceIdValidator.validate('instance:test')).not.toThrow()
		expect(() => instanceIdValidator.validate(TLINSTANCE_ID)).not.toThrow()

		expect(() => instanceIdValidator.validate('invalid')).toThrow()
		expect(() => instanceIdValidator.validate('page:instance')).toThrow()
		expect(() => instanceIdValidator.validate('')).toThrow()
	})
})

describe('createInstanceRecordType', () => {
	it('should create a valid record type with correct configuration', () => {
		const recordType = createInstanceRecordType(mockStylesMap)
		expect(recordType.typeName).toBe('instance')
		expect(recordType.scope).toBe('session')
	})
})

describe('instanceMigrations', () => {
	it('should have correct migration configuration', () => {
		expect(instanceMigrations.sequenceId).toBe('com.tldraw.instance')
		expect(Array.isArray(instanceMigrations.sequence)).toBe(true)
		expect(instanceMigrations.sequence.length).toBe(25)
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

	it('should have bidirectional migrations where applicable', () => {
		const addInsetMigration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.AddInset
		)!
		expect(addInsetMigration.down).toBeDefined()

		const removeCameraMigration = instanceMigrations.sequence.find(
			(m) => m.id === instanceVersions.RemoveCanMoveCamera
		)!
		expect(removeCameraMigration.down).toBeDefined()
	})
})
