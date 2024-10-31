import { assert } from '@tldraw/utils'
import type { TlaFile } from '@tldraw/zero-schema'
import postgres from 'postgres'
const POSTGRES_CONNECTION_STRING = 'postgresql://user:password@127.0.0.1:6543/postgres'

export function createSql() {
	return postgres(POSTGRES_CONNECTION_STRING)
}

export async function listenForFileChanges(
	sql: ReturnType<typeof postgres>,
	fileId: string,
	cb: (file: TlaFile | null, type: 'update' | 'delete' | 'create') => void
): Promise<{ file: TlaFile | null; unsubscribe(): void }> {
	let didLoadInitial = false

	const { unsubscribe } = await sql.subscribe('*:file=' + fileId, (row, info) => {
		if (!row) {
			assert(info.command === 'delete', 'expected delete command')
			if (!didLoadInitial) return // no callbacks until initial load
			cb(null, 'delete')
		} else if (info.command === 'insert') {
			if (!didLoadInitial) return // no callbacks until initial load
			cb(row as TlaFile, 'create')
		} else {
			assert(info.command === 'update', 'expected update command')
			if (!didLoadInitial) return // no callbacks until initial load
			cb(row as TlaFile, 'update')
		}
	})
	const res = await sql`select * from file where id = ${fileId}`
	didLoadInitial = true

	return {
		file: (res[0] as TlaFile) ?? null,
		unsubscribe,
	}
}

