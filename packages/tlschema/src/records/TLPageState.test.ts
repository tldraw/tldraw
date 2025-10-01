import { describe, expect, it } from 'vitest'
import {
	instancePageStateMigrations,
	InstancePageStateRecordType,
	instancePageStateValidator,
	instancePageStateVersions,
	TLInstancePageStateId,
} from './TLPageState'

describe('instancePageStateValidator', () => {
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
})

describe('instancePageStateMigrations', () => {
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
})
