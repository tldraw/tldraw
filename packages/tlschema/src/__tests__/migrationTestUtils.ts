import { Migration, MigrationId, Store, UnknownRecord } from '@tldraw/store'
import { structuredClone } from '@tldraw/utils'
import { createTLSchema } from '../createTLSchema'

let nextNanoId = 0
jest.mock('nanoid', () => {
	const nanoid = () => {
		nextNanoId++
		return `nanoid_${nextNanoId}`
	}
	return {
		nanoid,
		default: nanoid,
	}
})

export const testSchema = createTLSchema()

// mock all migrator fns
for (const migration of testSchema.sortedMigrations) {
	;(migration as any).up = jest.fn(migration.up as any)
	if (typeof migration.down === 'function') {
		;(migration as any).down = jest.fn(migration.down as any)
	}
}

function getEmptySnapshot() {
	const store = new Store({
		schema: testSchema,
		props: null as any,
	})
	store.ensureStoreIsUsable()
	return store.getSnapshot()
}

export function snapshotUp(migrationId: MigrationId, ...records: UnknownRecord[]) {
	const migration = testSchema.sortedMigrations.find((m) => m.id === migrationId) as Migration
	if (!migration) {
		throw new Error(`Migration ${migrationId} not found`)
	}
	const snapshot = getEmptySnapshot()
	for (const record of records) {
		snapshot.store[record.id as any] = structuredClone(record as any)
	}

	const result = migration.up(snapshot.store as any)
	return result ?? snapshot.store
}

export function getTestMigration(migrationId: MigrationId) {
	const migration = testSchema.sortedMigrations.find((m) => m.id === migrationId) as Migration
	if (!migration) {
		throw new Error(`Migration ${migrationId} not found`)
	}
	return {
		id: migrationId,
		up: (stuff: any) => {
			nextNanoId = 0
			const result = structuredClone(stuff)
			return migration.up(result) ?? result
		},
		down: (stuff: any) => {
			nextNanoId = 0
			if (typeof migration.down !== 'function') {
				throw new Error(`Migration ${migrationId} does not have a down function`)
			}
			const result = structuredClone(stuff)
			return migration.down(result) ?? result
		},
	}
}
