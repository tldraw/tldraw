import { DatabaseSync } from 'node:sqlite'
import { DoSql } from '../versionIndexStorage'

// Same shape as Cloudflare's `SqlStorage.exec`, backed by real SQLite.
export function makeTestSql(): DoSql & { db: DatabaseSync } {
	const db = new DatabaseSync(':memory:')
	return {
		db,
		exec(query: string, ...bindings: unknown[]) {
			const statement = db.prepare(query)
			if (/^\s*(select|with)/i.test(query) || /\breturning\b/i.test(query)) {
				return { toArray: () => statement.all(...(bindings as any[])) }
			}
			statement.run(...(bindings as any[]))
			return { toArray: () => [] }
		},
	}
}
