import { devFreeze, Migration, MigrationId } from '@tldraw/store'
import { mockUniqueId, structuredClone } from '@tldraw/utils'
import { createTLSchema } from '../createTLSchema'

let nextNanoId = 0
mockUniqueId(() => `nanoid_${++nextNanoId}`)

export const testSchema = createTLSchema()

// Records which migrator fns ran, so migrations.test.ts can assert every one is covered by a
// test. This deliberately isn't a vi.fn: vitest clears mock call history before each test, which
// would wipe the record before the coverage check runs.
const calledMigrators = new Set<string>()

/** Whether any test in this run exercised the given migrator. */
export function wasMigratorCalled(id: MigrationId, direction: 'up' | 'down') {
	return calledMigrators.has(`${id}/${direction}`)
}

for (const migration of testSchema.sortedMigrations) {
	for (const direction of ['up', 'down'] as const) {
		const fn = migration[direction]
		if (typeof fn !== 'function') continue
		;(migration as any)[direction] = (...args: any[]) => {
			calledMigrators.add(`${migration.id}/${direction}`)
			return (fn as any)(...args)
		}
	}
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
			if (migration.scope === 'record' || migration.scope === 'store') {
				const result = structuredClone(stuff)
				return migration.up(result) ?? result
			}
			const storage =
				typeof stuff.entries === 'function' ? stuff : new Map(Object.entries(stuff).map(devFreeze))
			migration.up(storage)
			return typeof stuff.entries === 'function' ? storage : Object.fromEntries(storage.entries())
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
