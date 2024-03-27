import { Migration, MigrationId, Store, UnknownRecord } from '@tldraw/store'
import { IndexKey, structuredClone } from '@tldraw/utils'
import { createTLSchema } from '../createTLSchema'
import { TLPageId } from '../records/TLPage'
import { TLDefaultShape, TLShape, createShapeId } from '../records/TLShape'

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
			const result = structuredClone(stuff)
			return migration.up(result) ?? result
		},
		down: (stuff: any) => {
			if (typeof migration.down !== 'function') {
				throw new Error(`Migration ${migrationId} does not have a down function`)
			}
			const result = structuredClone(stuff)
			return migration.down(result) ?? result
		},
	}
}

const emptyShape = {
	id: createShapeId('test'),
	typeName: 'shape',
	type: 'oops',
	props: {},
	x: 0,
	y: 0,
	rotation: 0,
	index: 'a2' as IndexKey,
	isLocked: false,
	meta: {},
	opacity: 1,
	parentId: 'page:whatever' as TLPageId,
} satisfies TLShape

export function getTestShapePropsMigration(shapeType: TLDefaultShape['type'], version: number) {
	const migration = getTestMigration(`com.tldraw.shape.${shapeType}/${version}`)
	return {
		up: (props: any) => {
			const shape = structuredClone({ ...emptyShape, props, type: shapeType })
			return (migration.up(shape) ?? shape).props
		},
		down: (props: any) => {
			if (typeof migration.down !== 'function') {
				throw new Error(`Migration ${version} does not have a down function`)
			}
			const shape = structuredClone({ ...emptyShape, props, type: shapeType })
			return (migration.down(shape) ?? shape).props
		},
	}
}
