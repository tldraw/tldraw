/* eslint-disable @typescript-eslint/no-deprecated */
import { assert } from '@tldraw/utils'
import {
	BaseRecord,
	Migration,
	RecordId,
	createMigrationIds,
	createMigrationSequence,
	createRecordType,
} from '../../'
import { StoreSchema } from '../StoreSchema'

interface TestRecord extends BaseRecord<'test', RecordId<TestRecord>> {
	name: string
	version: number
}

describe('StoreSchema migration caching', () => {
	// Create migration IDs
	const TestVersions = createMigrationIds('com.tldraw.test', {
		AddVersion: 1,
		UpdateVersion: 2,
	})

	// Create a simple schema with migrations
	const createTestSchema = (version: number) => {
		const TestRecordType = createRecordType<TestRecord>('test', {
			scope: 'document',
		})

		const sequence: Migration[] = []

		if (version > 1) {
			sequence.push({
				id: TestVersions.AddVersion,
				scope: 'record',
				up: (record: any) => {
					// Mutate the record in place
					record.version = 2
					// Don't return anything
				},
				down: (record: any) => {
					record.version = 1
					// Don't return anything
				},
			})
		}

		if (version > 2) {
			sequence.push({
				id: TestVersions.UpdateVersion,
				scope: 'record',
				up: (record: any) => {
					record.version = 3
					// Don't return anything
				},
				down: (record: any) => {
					record.version = 2
					// Don't return anything
				},
			})
		}

		const schema = StoreSchema.create(
			{
				test: TestRecordType,
			},
			{
				migrations: [createMigrationSequence({ sequenceId: 'com.tldraw.test', sequence })],
			}
		)

		return schema
	}

	it('should cache migration results and return same array reference', () => {
		const schema = createTestSchema(3)
		const oldSchema = schema.serializeEarliestVersion()

		// First call should create the migrations array
		const migrations1 = schema.getMigrationsSince(oldSchema)
		assert(migrations1.ok)
		expect(migrations1.value).toHaveLength(2)

		// Second call should return the same array reference (cached)
		const migrations2 = schema.getMigrationsSince(oldSchema)
		assert(migrations2.ok)
		expect(migrations2.value).toBe(migrations1.value) // Same array reference

		// Third call should also return the same array reference
		const migrations3 = schema.getMigrationsSince(oldSchema)
		assert(migrations3.ok)
		expect(migrations3.value).toBe(migrations1.value)
	})

	it('should not cache when schema versions are different', () => {
		const schema = createTestSchema(3)
		const oldSchema = schema.serializeEarliestVersion()

		// Call with original schema
		const migrations1 = schema.getMigrationsSince(oldSchema)
		expect(migrations1.ok).toBe(true)
		if (!migrations1.ok) throw new Error('Expected migrations1 to be ok')

		// Create a different schema version by using a schema with version 2
		const schemaV2 = createTestSchema(2)
		const schemaV2Serialized = schemaV2.serializeEarliestVersion()
		const migrations2 = schema.getMigrationsSince(schemaV2Serialized)
		expect(migrations2.ok).toBe(true)
		if (!migrations2.ok) throw new Error('Expected migrations2 to be ok')

		// Should be different arrays (no cache hit)
		expect(migrations2.value).not.toBe(migrations1.value)
	})
})
