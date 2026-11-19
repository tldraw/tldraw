import { loadChainIndex } from './versionChainRead'
import {
	DoSql,
	getVersionIndexMeta,
	insertVersionIndexRow,
	readNewestVersionTs,
	setVersionIndexMeta,
} from './versionIndexStorage'

function countRows(sql: DoSql) {
	return (sql.exec('SELECT COUNT(*) AS n FROM version_index').toArray()[0] as { n: number }).n
}

/** Indexes versions written before the index existed. Authors and counts are unknown for them. */
export async function backfillVersionIndex(args: {
	sql: DoSql
	chainBucket: R2Bucket
	roomKey: string
	force?: boolean
}): Promise<{ inserted: number }> {
	const { sql } = args
	if (!args.force && getVersionIndexMeta(sql, 'backfilled') === '1') return { inserted: 0 }
	const { entries } = await loadChainIndex(args.chainBucket, args.roomKey)
	const before = countRows(sql)
	for (const entry of entries) {
		for (const ts of entry.timestamps) {
			insertVersionIndexRow(sql, {
				ts,
				documentClock: 0,
				kind: 'edit',
				authors: [],
				added: 0,
				updated: 0,
				removed: 0,
				restoreId: null,
				restoredFrom: null,
				restoredFromName: null,
				name: null,
			})
		}
	}
	setVersionIndexMeta(sql, 'backfilled', '1')
	return { inserted: countRows(sql) - before }
}

/**
 * Repairs rows lost between a chain write and its index insert. Lists the whole chain: a segment's
 * key names only its first delta, so the missing timestamps can sit under an older key.
 */
export async function reconcileVersionIndex(args: {
	sql: DoSql
	chainBucket: R2Bucket
	roomKey: string
	chainHeadTs: string | null
}): Promise<{ inserted: number }> {
	const newest = readNewestVersionTs(args.sql)
	if (args.chainHeadTs === null || (newest !== null && newest >= args.chainHeadTs)) {
		return { inserted: 0 }
	}
	return backfillVersionIndex({ ...args, force: true })
}
