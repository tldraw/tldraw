import { describe, expect, it } from 'vitest'
import {
	instancePageStateMigrations,
	InstancePageStateRecordType,
	instancePageStateValidator,
	instancePageStateVersions,
	TLInstancePageState,
	TLInstancePageStateId,
} from './TLPageState'

describe('TLInstancePageState', () => {
	it('should define the instance page state interface correctly', () => {
		const pageState: TLInstancePageState = {
			id: 'instance_page_state:page1' as TLInstancePageStateId,
			typeName: 'instance_page_state',
			pageId: 'page:page1' as any,
			selectedShapeIds: ['shape:rect1' as any, 'shape:circle2' as any],
			hintingShapeIds: ['shape:text3' as any],
			erasingShapeIds: [],
			hoveredShapeId: 'shape:hover' as any,
			editingShapeId: null,
			croppingShapeId: 'shape:crop' as any,
			focusedGroupId: 'shape:group1' as any,
			meta: { custom: 'data' },
		}

		expect(pageState.id).toBe('instance_page_state:page1')
		expect(pageState.typeName).toBe('instance_page_state')
		expect(pageState.pageId).toBe('page:page1')
		expect(pageState.selectedShapeIds).toHaveLength(2)
		expect(pageState.hoveredShapeId).toBe('shape:hover')
		expect(pageState.editingShapeId).toBe(null)
		expect(pageState.croppingShapeId).toBe('shape:crop')
	})
})

describe('instancePageStateValidator', () => {
	it('should validate valid instance page state records', () => {
		const validPageState = {
			typeName: 'instance_page_state',
			id: 'instance_page_state:test' as TLInstancePageStateId,
			pageId: 'page:test' as any,
			selectedShapeIds: ['shape:1' as any],
			hintingShapeIds: [],
			erasingShapeIds: [],
			hoveredShapeId: null,
			editingShapeId: null,
			croppingShapeId: null,
			focusedGroupId: null,
			meta: {},
		}

		expect(() => instancePageStateValidator.validate(validPageState)).not.toThrow()
		const validated = instancePageStateValidator.validate(validPageState)
		expect(validated).toEqual(validPageState)
	})

	it('should validate with complex state', () => {
		const complexPageState = {
			typeName: 'instance_page_state',
			id: 'instance_page_state:complex' as TLInstancePageStateId,
			pageId: 'page:complex' as any,
			selectedShapeIds: ['shape:1' as any, 'shape:2' as any, 'shape:3' as any],
			hintingShapeIds: ['shape:hint1' as any, 'shape:hint2' as any],
			erasingShapeIds: ['shape:erase1' as any],
			hoveredShapeId: 'shape:hover' as any,
			editingShapeId: 'shape:edit' as any,
			croppingShapeId: 'shape:crop' as any,
			focusedGroupId: 'shape:group' as any,
			meta: { session: 'data', user: 'preferences' },
		}

		expect(() => instancePageStateValidator.validate(complexPageState)).not.toThrow()
	})

	it('should reject invalid typeName', () => {
		const invalidPageState = {
			typeName: 'not-instance-page-state',
			id: 'instance_page_state:test' as TLInstancePageStateId,
			pageId: 'page:test' as any,
			selectedShapeIds: [],
			hintingShapeIds: [],
			erasingShapeIds: [],
			hoveredShapeId: null,
			editingShapeId: null,
			croppingShapeId: null,
			focusedGroupId: null,
			meta: {},
		}

		expect(() => instancePageStateValidator.validate(invalidPageState)).toThrow()
	})

	it('should reject invalid id format', () => {
		const invalidPageState = {
			typeName: 'instance_page_state',
			id: 'not-valid-id' as TLInstancePageStateId,
			pageId: 'page:test' as any,
			selectedShapeIds: [],
			hintingShapeIds: [],
			erasingShapeIds: [],
			hoveredShapeId: null,
			editingShapeId: null,
			croppingShapeId: null,
			focusedGroupId: null,
			meta: {},
		}

		expect(() => instancePageStateValidator.validate(invalidPageState)).toThrow()
	})

	it('should reject missing required fields', () => {
		const incompletePageState = {
			typeName: 'instance_page_state',
			id: 'instance_page_state:test' as TLInstancePageStateId,
			pageId: 'page:test' as any,
			// missing required array fields
		}

		expect(() => instancePageStateValidator.validate(incompletePageState)).toThrow()
	})

	it('should validate null values for nullable fields', () => {
		const pageStateWithNulls = {
			typeName: 'instance_page_state',
			id: 'instance_page_state:nulls' as TLInstancePageStateId,
			pageId: 'page:test' as any,
			selectedShapeIds: [],
			hintingShapeIds: [],
			erasingShapeIds: [],
			hoveredShapeId: null,
			editingShapeId: null,
			croppingShapeId: null,
			focusedGroupId: null,
			meta: {},
		}

		expect(() => instancePageStateValidator.validate(pageStateWithNulls)).not.toThrow()
	})
})

describe('instancePageStateVersions', () => {
	it('should have all migration versions defined', () => {
		const expectedVersions = [
			'AddCroppingId',
			'RemoveInstanceIdAndCameraId',
			'AddMeta',
			'RenameProperties',
			'RenamePropertiesAgain',
		]

		expectedVersions.forEach((version) => {
			expect(
				instancePageStateVersions[version as keyof typeof instancePageStateVersions]
			).toBeDefined()
			expect(
				typeof instancePageStateVersions[version as keyof typeof instancePageStateVersions]
			).toBe('string')
		})
	})

	it('should have sequential version numbers', () => {
		expect(instancePageStateVersions.AddCroppingId).toBe('com.tldraw.instance_page_state/1')
		expect(instancePageStateVersions.RemoveInstanceIdAndCameraId).toBe(
			'com.tldraw.instance_page_state/2'
		)
		expect(instancePageStateVersions.AddMeta).toBe('com.tldraw.instance_page_state/3')
		expect(instancePageStateVersions.RenameProperties).toBe('com.tldraw.instance_page_state/4')
		expect(instancePageStateVersions.RenamePropertiesAgain).toBe('com.tldraw.instance_page_state/5')
	})
})

describe('instancePageStateMigrations', () => {
	it('should have correct migration configuration', () => {
		expect(instancePageStateMigrations.sequenceId).toBe('com.tldraw.instance_page_state')
		// expect(instancePageStateMigrations.recordType).toBe('instance_page_state') // Property doesn't exist on MigrationSequence
		expect(Array.isArray(instancePageStateMigrations.sequence)).toBe(true)
		expect(instancePageStateMigrations.sequence).toHaveLength(5)
	})

	it('should migrate AddCroppingId correctly', () => {
		const migration = instancePageStateMigrations.sequence.find(
			(m) => m.id === instancePageStateVersions.AddCroppingId
		)!
		const oldRecord: any = { id: 'instance_page_state:test', typeName: 'instance_page_state' }
		migration.up(oldRecord)

		expect(oldRecord.croppingShapeId).toBe(null)
	})

	it('should migrate RemoveInstanceIdAndCameraId correctly', () => {
		const migration = instancePageStateMigrations.sequence.find(
			(m) => m.id === instancePageStateVersions.RemoveInstanceIdAndCameraId
		)!
		const oldRecord: any = {
			id: 'instance_page_state:test',
			typeName: 'instance_page_state',
			instanceId: 'instance:removed',
			cameraId: 'camera:removed',
			otherProp: 'keep-me',
		}
		migration.up(oldRecord)

		expect(oldRecord.instanceId).toBeUndefined()
		expect(oldRecord.cameraId).toBeUndefined()
		expect(oldRecord.otherProp).toBe('keep-me')
	})

	it('should migrate AddMeta correctly', () => {
		const migration = instancePageStateMigrations.sequence.find(
			(m) => m.id === instancePageStateVersions.AddMeta
		)!
		const oldRecord: any = { id: 'instance_page_state:test', typeName: 'instance_page_state' }
		migration.up(oldRecord)

		expect(oldRecord.meta).toEqual({})
	})

	it('should handle RenameProperties migration (noop)', () => {
		const migration = instancePageStateMigrations.sequence.find(
			(m) => m.id === instancePageStateVersions.RenameProperties
		)!
		const oldRecord: any = {
			id: 'instance_page_state:test',
			typeName: 'instance_page_state',
			selectedIds: ['shape:1'],
		}
		const originalRecord = { ...oldRecord }
		migration.up(oldRecord)

		// Should be a noop
		expect(oldRecord).toEqual(originalRecord)
	})

	it('should migrate RenamePropertiesAgain correctly', () => {
		const migration = instancePageStateMigrations.sequence.find(
			(m) => m.id === instancePageStateVersions.RenamePropertiesAgain
		)!
		const oldRecord: any = {
			id: 'instance_page_state:test',
			typeName: 'instance_page_state',
			selectedIds: ['shape:1', 'shape:2'],
			hintingIds: ['shape:3'],
			erasingIds: ['shape:4'],
			hoveredId: 'shape:5',
			editingId: 'shape:6',
			croppingId: 'shape:7',
			focusLayerId: 'shape:8',
		}
		migration.up(oldRecord)

		expect(oldRecord.selectedShapeIds).toEqual(['shape:1', 'shape:2'])
		expect(oldRecord.hintingShapeIds).toEqual(['shape:3'])
		expect(oldRecord.erasingShapeIds).toEqual(['shape:4'])
		expect(oldRecord.hoveredShapeId).toBe('shape:5')
		expect(oldRecord.editingShapeId).toBe('shape:6')
		expect(oldRecord.croppingShapeId).toBe('shape:7')
		expect(oldRecord.focusedGroupId).toBe('shape:8')

		// Old properties should be removed
		expect(oldRecord.selectedIds).toBeUndefined()
		expect(oldRecord.hintingIds).toBeUndefined()
		expect(oldRecord.erasingIds).toBeUndefined()
		expect(oldRecord.hoveredId).toBeUndefined()
		expect(oldRecord.editingId).toBeUndefined()
		expect(oldRecord.croppingId).toBeUndefined()
		expect(oldRecord.focusLayerId).toBeUndefined()
	})

	it('should handle down migration for RenamePropertiesAgain', () => {
		const migration = instancePageStateMigrations.sequence.find(
			(m) => m.id === instancePageStateVersions.RenamePropertiesAgain
		)!
		expect(migration.down).toBeDefined()

		const record: any = {
			id: 'instance_page_state:test',
			typeName: 'instance_page_state',
			selectedShapeIds: ['shape:1', 'shape:2'],
			hintingShapeIds: ['shape:3'],
			erasingShapeIds: ['shape:4'],
			hoveredShapeId: 'shape:5',
			editingShapeId: 'shape:6',
			croppingShapeId: 'shape:7',
			focusedGroupId: 'shape:8',
		}
		migration.down!(record)

		expect(record.selectedIds).toEqual(['shape:1', 'shape:2'])
		expect(record.hintingIds).toEqual(['shape:3'])
		expect(record.erasingIds).toEqual(['shape:4'])
		expect(record.hoveredId).toBe('shape:5')
		expect(record.editingId).toBe('shape:6')
		expect(record.croppingId).toBe('shape:7')
		expect(record.focusLayerId).toBe('shape:8')

		// New properties should be removed
		expect(record.selectedShapeIds).toBeUndefined()
		expect(record.hintingShapeIds).toBeUndefined()
		expect(record.erasingShapeIds).toBeUndefined()
		expect(record.hoveredShapeId).toBeUndefined()
		expect(record.editingShapeId).toBeUndefined()
		expect(record.croppingShapeId).toBeUndefined()
		expect(record.focusedGroupId).toBeUndefined()
	})

	it('should handle croppingShapeId fallback in RenamePropertiesAgain', () => {
		const migration = instancePageStateMigrations.sequence.find(
			(m) => m.id === instancePageStateVersions.RenamePropertiesAgain
		)!

		// Test with existing croppingShapeId
		const recordWithCroppingShapeId: any = {
			croppingShapeId: 'shape:existing',
			croppingId: 'shape:fallback',
		}
		migration.up(recordWithCroppingShapeId)
		expect(recordWithCroppingShapeId.croppingShapeId).toBe('shape:existing')

		// Test with only croppingId
		const recordWithCroppingId: any = {
			croppingId: 'shape:fallback',
		}
		migration.up(recordWithCroppingId)
		expect(recordWithCroppingId.croppingShapeId).toBe('shape:fallback')

		// Test with neither
		const recordWithNeither: any = {}
		migration.up(recordWithNeither)
		expect(recordWithNeither.croppingShapeId).toBe(null)
	})
})

describe('InstancePageStateRecordType', () => {
	it('should create instance page state records with defaults', () => {
		const pageState = InstancePageStateRecordType.create({
			id: 'instance_page_state:test' as TLInstancePageStateId,
			pageId: 'page:test' as any,
		})

		expect(pageState.id).toBe('instance_page_state:test')
		expect(pageState.typeName).toBe('instance_page_state')
		expect(pageState.pageId).toBe('page:test')
		expect(pageState.editingShapeId).toBe(null)
		expect(pageState.croppingShapeId).toBe(null)
		expect(pageState.selectedShapeIds).toEqual([])
		expect(pageState.hoveredShapeId).toBe(null)
		expect(pageState.erasingShapeIds).toEqual([])
		expect(pageState.hintingShapeIds).toEqual([])
		expect(pageState.focusedGroupId).toBe(null)
		expect(pageState.meta).toEqual({})
	})

	it('should create with custom properties', () => {
		const pageState = InstancePageStateRecordType.create({
			id: 'instance_page_state:custom' as TLInstancePageStateId,
			pageId: 'page:custom' as any,
			selectedShapeIds: ['shape:1' as any, 'shape:2' as any],
			editingShapeId: 'shape:editing' as any,
			hoveredShapeId: 'shape:hovered' as any,
			meta: { custom: 'data' },
		})

		expect(pageState.selectedShapeIds).toHaveLength(2)
		expect(pageState.editingShapeId).toBe('shape:editing')
		expect(pageState.hoveredShapeId).toBe('shape:hovered')
		expect(pageState.meta).toEqual({ custom: 'data' })
	})

	it('should have correct configuration', () => {
		expect(InstancePageStateRecordType.typeName).toBe('instance_page_state')
		expect(InstancePageStateRecordType.scope).toBe('session')
	})

	it('should have correct ephemeral keys configuration', () => {
		// Non-ephemeral keys (persistent)
		expect(InstancePageStateRecordType.ephemeralKeys?.pageId).toBe(false)
		expect(InstancePageStateRecordType.ephemeralKeys?.selectedShapeIds).toBe(false)
		expect(InstancePageStateRecordType.ephemeralKeys?.editingShapeId).toBe(false)
		expect(InstancePageStateRecordType.ephemeralKeys?.croppingShapeId).toBe(false)
		expect(InstancePageStateRecordType.ephemeralKeys?.meta).toBe(false)

		// Ephemeral keys (temporary)
		expect(InstancePageStateRecordType.ephemeralKeys?.hintingShapeIds).toBe(true)
		expect(InstancePageStateRecordType.ephemeralKeys?.erasingShapeIds).toBe(true)
		expect(InstancePageStateRecordType.ephemeralKeys?.hoveredShapeId).toBe(true)
		expect(InstancePageStateRecordType.ephemeralKeys?.focusedGroupId).toBe(true)
	})

	it('should validate created records', () => {
		const pageState = InstancePageStateRecordType.create({
			id: 'instance_page_state:validated' as TLInstancePageStateId,
			pageId: 'page:validated' as any,
		})

		expect(() => instancePageStateValidator.validate(pageState)).not.toThrow()
	})
})

describe('TLInstancePageStateId', () => {
	it('should be a branded type', () => {
		const id: TLInstancePageStateId = 'instance_page_state:test' as TLInstancePageStateId
		expect(typeof id).toBe('string')
		expect(id.startsWith('instance_page_state:')).toBe(true)
	})
})

describe('TLInstancePageState Integration', () => {
	it('should work with typical page state operations', () => {
		// Create initial page state
		const initialPageState = InstancePageStateRecordType.create({
			id: 'instance_page_state:main' as TLInstancePageStateId,
			pageId: 'page:main' as any,
		})

		// Simulate shape selection
		const withSelection: TLInstancePageState = {
			...initialPageState,
			selectedShapeIds: ['shape:rect1' as any, 'shape:circle2' as any],
		}

		// Simulate entering edit mode
		const withEdit: TLInstancePageState = {
			...withSelection,
			editingShapeId: 'shape:rect1' as any,
			selectedShapeIds: ['shape:rect1' as any], // typically only selected shape when editing
		}

		// Simulate hovering
		const withHover: TLInstancePageState = {
			...withEdit,
			hoveredShapeId: 'shape:text3' as any,
		}

		expect(withSelection.selectedShapeIds).toHaveLength(2)
		expect(withEdit.editingShapeId).toBe('shape:rect1')
		expect(withHover.hoveredShapeId).toBe('shape:text3')
		expect(() => instancePageStateValidator.validate(withHover)).not.toThrow()
	})

	it('should handle complex interaction states', () => {
		const pageState = InstancePageStateRecordType.create({
			id: 'instance_page_state:complex' as TLInstancePageStateId,
			pageId: 'page:complex' as any,
			selectedShapeIds: ['shape:1' as any, 'shape:2' as any],
			hintingShapeIds: ['shape:hint1' as any, 'shape:hint2' as any],
			erasingShapeIds: ['shape:erase1' as any],
			hoveredShapeId: 'shape:hover' as any,
			editingShapeId: null,
			croppingShapeId: 'shape:crop' as any,
			focusedGroupId: 'shape:group1' as any,
			meta: {
				interactionMode: 'selection',
				lastAction: 'multiselect',
				shortcuts: { ctrlPressed: false, shiftPressed: true },
			},
		})

		expect(pageState.selectedShapeIds).toHaveLength(2)
		expect(pageState.hintingShapeIds).toHaveLength(2)
		expect(pageState.erasingShapeIds).toHaveLength(1)
		expect(pageState.croppingShapeId).toBe('shape:crop')
		expect(pageState.focusedGroupId).toBe('shape:group1')
		expect(pageState.meta.interactionMode).toBe('selection')
		expect(() => instancePageStateValidator.validate(pageState)).not.toThrow()
	})

	it('should handle state transitions', () => {
		let pageState = InstancePageStateRecordType.create({
			id: 'instance_page_state:transitions' as TLInstancePageStateId,
			pageId: 'page:transitions' as any,
		})

		// Start with no selection
		expect(pageState.selectedShapeIds).toEqual([])
		expect(pageState.editingShapeId).toBe(null)

		// Select a shape
		pageState = {
			...pageState,
			selectedShapeIds: ['shape:rect' as any],
		}

		// Enter edit mode
		pageState = {
			...pageState,
			editingShapeId: 'shape:rect' as any,
		}

		// Exit edit mode
		pageState = {
			...pageState,
			editingShapeId: null,
		}

		// Clear selection
		pageState = {
			...pageState,
			selectedShapeIds: [],
		}

		expect(pageState.selectedShapeIds).toEqual([])
		expect(pageState.editingShapeId).toBe(null)
		expect(() => instancePageStateValidator.validate(pageState)).not.toThrow()
	})
})
