import { deepCopy, exhaustiveSwitchError } from '@tldraw/utils'
import { UnknownRecord } from './BaseRecord'
import { SerializedStore } from './Store'
/**
 * 'store'-scoped migrations are applied to the entire store at once.
 * This allows them to perform changes where the relationships
 * between records are important, or where records need to be
 * created or deleted.
 */
export type StoreScopedMigration = {
	id: string
	scope: 'store'
	predecessorId: string
	description: string
	up: (store: SerializedStore<UnknownRecord>) => void
}
/**
 * 'record'-scoped migrations are applied to each record individually.
 * They cannot create or delete records, and they cannot depend on data
 * from other records.
 *
 * These support 'down' migrations, which are used on the server to
 * allow the server to service older clients if possible.
 *
 * .e.g if the server has migrations
 *
 *   [{id: 'a', scope: 'record', ...}, {id: 'b', scope: 'store', ...}, {id: 'c', scope: 'record', ...}]
 *
 * Then the server can service clients with versions 'b' and 'c', but not 'a' since it came before the most recent
 * 'store'-scoped migration, and 'store'-scoped migrations cannot currently be undone in any reasonable fashion in our server.
 */
export type RecordScopedMigration = {
	id: string
	scope: 'record'
	predecessorId: string
	description: string
	typeName: string
	up: (record: UnknownRecord) => void
	down: (store: UnknownRecord) => void
}
export type NewMigration = StoreScopedMigration | RecordScopedMigration

export const ROOT_MIGRATION_ID = '__migration_root__'

/**
 * This function takes an unsorted array of migrations and sorts them in topological order.
 * @param migrations
 * @param predecessorOverrides
 * @internal
 */
export function sortMigrations(
	migrations: NewMigration[],
	predecessorOverrides: Record<string, string>
) {
	prohibitDuplicateMigrations(migrations)

	// do a topological sort of the migrations
	const sortedMigrations: NewMigration[] = []
	const visitedIds = new Set<string>()

	function visit(id: string) {
		if (id === ROOT_MIGRATION_ID || visitedIds.has(id)) {
			return
		}

		visitedIds.add(id)

		const migration = migrations.find((m) => m.id === id)
		if (!migration) {
			throw new Error(`Migration ${id} not found`)
		}

		visit(predecessorOverrides[id] ?? migration.predecessorId)

		sortedMigrations.push(migration)
	}

	for (const migration of migrations) {
		visit(migration.id)
	}

	const byPredecessorId = groupBy(migrations, 'predecessorId')

	// warn if there are conflicting predecessorIds
	for (const [predecessorId, siblings] of byPredecessorId.entries()) {
		if (siblings.length <= 1) continue
		let errorMessage = ''
		errorMessage += `Multiple migrations have the same predecessorId: ${predecessorId}\n`
		errorMessage += '\n'
		siblings.forEach((s) => (errorMessage += `  ${s.id}: ${s.description}\n`))
		errorMessage += '\n'
		errorMessage += `This is a problem because we cannot guarantee that the migrations will be applied in a conflict-free way or in the right order.\n`
		errorMessage += `If the migrations are indeed compatible, you can use \`predecessorOverrides\` to provide an unambiguous ordering.\n`
		errorMessage += `If the migrations are not compatible, you should replace them with a single migration that combines them in a harmonious way.\n`
		throw new Error(errorMessage)
	}
}

function prohibitDuplicateMigrations(migrations: NewMigration[]) {
	const ids = new Set<string>()
	for (const migration of migrations) {
		if (ids.has(migration.id)) {
			throw new Error(`Duplicate migration id: ${migration.id}`)
		}
		ids.add(migration.id)
	}
}

function groupBy<T>(items: T[], key: keyof T) {
	const result = new Map<string, T[]>()
	for (const item of items) {
		const value = item[key]
		const group = result.get(value as any) ?? []
		group.push(item)
		result.set(value as any, group)
	}
	return result
}

function warnConflictingPredecessorIds(predecessorId: string, ids: string[]) {
	console.warn(`Multiple migrations have the same predecessorId: ${predecessorId}`)
	console.warn(` ${JSON.stringify(ids)}`)
	console.warn(
		`This is potentially a problem because we cannot guarantee that the migrations will be applied in a conflict-free way.`
	)
	console.warn(
		`If the migrations are indeed compatible, you can use \`predecessorOverrides\` to provide an unambiguous ordering.`
	)
	console.warn(
		`If the migrations are not compatible, you should replace them with a single migration that combines them in a harmonious way.`
	)
}

export function migrate(
	store: SerializedStore<UnknownRecord>,
	migrations: NewMigration[],
	fromVersionId: string
): SerializedStore<UnknownRecord> {
	const versionIndex = migrations.findIndex((m) => m.id === fromVersionId)
	if (versionIndex === -1) {
		throw new Error(`Version ${fromVersionId} not found`)
	}
	if (versionIndex === migrations.length - 1) {
		return store
	}
	const migrationsToApply = migrations.slice(versionIndex + 1)

	const result = deepCopy(store)
	for (const migration of migrationsToApply) {
		switch (migration.scope) {
			case 'store':
				migration.up(result)
				break
			case 'record':
				for (const record of Object.values(result)) {
					if (!migration.typeName || record.typeName === migration.typeName) {
						migration.up(record)
					}
				}
				break
			default:
				exhaustiveSwitchError(migration)
		}
	}
	return result
}
