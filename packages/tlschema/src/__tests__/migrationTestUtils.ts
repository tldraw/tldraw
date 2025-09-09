import { Migration, MigrationId } from '@tldraw/store'
import { mockUniqueId, structuredClone } from '@tldraw/utils'
import { vi } from 'vitest'
import { createTLSchema } from '../createTLSchema'

let nextNanoId = 0
mockUniqueId(() => `nanoid_${++nextNanoId}`)

export const testSchema = createTLSchema()

// mock all migrator fns
for (const migration of testSchema.sortedMigrations) {
	;(migration as any).up = vi.fn(migration.up as any)
	if (typeof migration.down === 'function') {
		;(migration as any).down = vi.fn(migration.down as any)
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
