import { DB } from '@tldraw/dotcom-shared'
import { Kysely, sql } from 'kysely'
import { LIBRARY_OBJECT_DELETE_GRACE_MS } from './libraryEffects'
import { MAX_ATTEMPTS } from './outboxDrain'

const libraryObjectGrace = () =>
	sql`(${LIBRARY_OBJECT_DELETE_GRACE_MS / 1000} || ' seconds')::interval`
const libraryObjectGraceStart = () => sql<Date>`now() - ${libraryObjectGrace()}`

/**
 * The next rows to process: not parked, not backing off, and not a library object delete still
 * within its grace period (see LIBRARY_OBJECT_DELETE_GRACE_MS).
 */
export function selectEffectOutboxBatch(db: Kysely<DB>) {
	return db
		.selectFrom('effect_outbox')
		.selectAll()
		.where('attempts', '<', MAX_ATTEMPTS)
		.where((eb) =>
			eb.or([eb('nextRetryAt', 'is', null), eb('nextRetryAt', '<=', sql<Date>`now()`)])
		)
		.where((eb) =>
			eb.not(
				eb.and([
					eb('tableName', '=', 'library_item_object'),
					eb('createdAt', '>', libraryObjectGraceStart()),
				])
			)
		)
		.orderBy('id')
		.limit(50)
		.execute()
}

/**
 * When the earliest library object delete still within its grace period becomes due, in ms since
 * the epoch, or null if there is none.
 */
export async function getNextLibraryObjectDeleteDueAt(db: Kysely<DB>): Promise<number | null> {
	const row = await db
		.selectFrom('effect_outbox')
		.select((eb) => eb.fn.min('createdAt').as('createdAt'))
		.where('tableName', '=', 'library_item_object')
		.where('attempts', '<', MAX_ATTEMPTS)
		.where('createdAt', '>', libraryObjectGraceStart())
		.executeTakeFirst()
	if (!row?.createdAt) return null
	return new Date(row.createdAt).getTime() + LIBRARY_OBJECT_DELETE_GRACE_MS
}

/**
 * How many rows have been processable for 15 minutes or more without the drain taking them: past
 * their backoff, and for a library object delete, past its grace period. A live drain sweeps every
 * 30s and backoff caps at 5 minutes, so it would have deleted, bumped or re-deferred such a row
 * long before then.
 */
export async function countStalledEffectOutboxRows(db: Kysely<DB>): Promise<number> {
	const result = await sql<{ stalled: string }>`
		SELECT count(*) AS stalled
		FROM effect_outbox
		WHERE attempts < ${sql.raw(String(MAX_ATTEMPTS))}
			AND GREATEST(
				CASE WHEN "tableName" = 'library_item_object'
					THEN "createdAt" + ${libraryObjectGrace()}
					ELSE "createdAt"
				END,
				coalesce("nextRetryAt", "createdAt")
			) < now() - interval '15 minutes'
	`.execute(db)
	const stalled = result.rows[0]?.stalled
	return stalled ? parseInt(stalled, 10) : 0
}
