import { Environment, TLDataPointName } from '../types'

/**
 * The domain an event belongs to. Everything after the shared header — `blob3` onwards, plus every
 * double — is owned by that domain's own writer, so `blob3` means one thing per domain rather than
 * a different thing per call site.
 *
 * See `apps/dotcom/analytics-blob-layout.md` for the full layout.
 */
export type TLAnalyticsDomain = 'room' | 'user' | 'replicator' | 'postgres' | 'queue' | 'screenshot'

/**
 * Which domain each event belongs to, and so which payload layout its `blob3` onwards follows.
 *
 * This is not written to the dataset: an event name already determines its domain, so a column
 * holding it would be a second copy of this table that could disagree with it. It is exported for
 * the query side — a dashboard grouping by domain, or scoping a payload column to the events that
 * share a layout, applies this rather than pasting a list of event names into a `WHERE` clause and
 * letting it go stale the next time a domain gains an event.
 *
 * The `Record<TLDataPointName, …>` is exhaustive on purpose: adding a datapoint name without
 * assigning it a domain is a type error rather than a quiet gap.
 */
export const EVENT_DOMAINS: Record<TLDataPointName, TLAnalyticsDomain> = {
	// Room durable object lifecycle and client connections
	room_start: 'room',
	room_create: 'room',
	room_reopen: 'room',
	room_empty: 'room',
	enter: 'room',
	leave: 'room',
	last_out: 'room',
	rate_limited: 'room',
	send_message: 'room',
	persist_success: 'room',
	fail_persist: 'room',
	failed_persist_to_db: 'room',
	failed_load_from_db: 'room',
	// Room durable object request timings
	on_request_auth: 'room',
	on_request_rate_limit: 'room',
	on_request_group_check: 'room',
	on_request_get_room: 'room',
	on_request_total: 'room',
	get_file_record: 'room',
	get_file_record_error: 'room',
	// Room snapshot loads and persistence
	db_load_total: 'room',
	db_load_total_error: 'room',
	db_load_r2_fetch: 'room',
	db_load_supabase_fetch: 'room',
	db_load_create_from_source: 'room',
	create_from_source_fetch_total: 'room',
	create_from_source_r2_put: 'room',
	create_from_source_r2_fetch: 'room',
	create_from_source_await_persist: 'room',
	room_size_mb: 'room',
	r2_queue_depth: 'room',
	pierre_incremental_write_chars: 'room',
	// Other durable objects
	user_durable_object: 'user',
	replicator: 'replicator',
	// Postgres connection pool
	postgres_client_connect: 'postgres',
	postgres_client_end: 'postgres',
	postgres_client_error: 'postgres',
	// Queue consumer and screenshot surfaces
	queue_message: 'queue',
	mcp_shared_board_screenshot: 'screenshot',
}

// Header positions, as zero-based offsets into the blobs array. Payload blobs sit between blob2 and
// the user slot rather than after it: Analytics Engine's schema is fixed at exactly 20 blobs, so the
// top of the range is a stable anchor, and reserving blob3..blob15 against a current maximum of five
// payload blobs means the header should never have to move. Padding the gap with empty strings is
// free against the 16 KB per-datapoint blob budget.
const USER_SLOT = 15 // blob16
const MAX_PAYLOAD_BLOBS = USER_SLOT - 2 // blob3..blob15

/** The domain-owned half of a datapoint: whatever that domain's writer decides its events carry. */
export interface DataPointPayload {
	/** Domain-owned dimensions, written to `blob3` onwards in the order the domain writer chose. */
	blobs?: string[]
	/** Domain-owned measurements. Positional and never compared across domains. */
	doubles?: number[]
}

export interface DataPoint extends DataPointPayload {
	/**
	 * The durable object this datapoint is _about_, written to `index1`. Not necessarily the object
	 * that emitted it: worker-context writers can derive the id of the object they concern, which
	 * is what makes this one uniform join column across every domain. Omitted entirely when there
	 * is no object-level subject, so that "no index" reads as "not object-scoped" rather than as a
	 * sentinel value.
	 */
	subject?: string
	/**
	 * Written to the header's user slot rather than to a domain-owned position, because
	 * "everything about user X" is a cross-domain question. Domains that already carry a user id in
	 * a payload blob keep writing it there too, so existing panels keep working.
	 */
	userId?: string
}

/**
 * Analytics Engine has no way to name columns, so the header's positions are aliased at query time.
 * Exported so dashboards and scripts consume one mapping instead of hand-writing `blob16 AS user`
 * in every panel.
 */
export const COLUMN_ALIASES = {
	index1: 'subject',
	blob1: 'event',
	blob2: 'env',
	blob16: 'user',
} as const

/**
 * Writes a datapoint to the Analytics Engine dataset bound as MEASURE. This is the only place that
 * knows a blob position; call sites go through their domain's writer and pass named fields.
 *
 * `blob1` (event) and `blob2` (worker name) keep the positions they have always had. They are the
 * `WHERE` clause of essentially every Grafana panel, and with 90-day retention a filter that moved
 * would not error — it would match old rows, silently miss new ones, and report a shrinking window
 * of stale data. The worker name sits in the second slot because the first version of this only
 * wrote the name.
 *
 * Write failures are swallowed: losing a datapoint must never break the request that emitted it.
 */
export function writeDataPoint(
	env: Environment,
	name: TLDataPointName,
	{ subject, userId, blobs, doubles }: DataPoint = {}
) {
	try {
		// A payload wider than its reserved range is a bug in that domain's writer. Truncate rather
		// than overflow into the header: losing a payload dimension is recoverable, mislabelling
		// every row's user is not.
		const columns = [
			name,
			env.WORKER_NAME ?? 'development-tldraw-multiplayer',
			...(blobs ?? []).slice(0, MAX_PAYLOAD_BLOBS),
		]
		while (columns.length < USER_SLOT) columns.push('')
		columns[USER_SLOT] = userId ?? ''

		env.MEASURE?.writeDataPoint({
			blobs: columns,
			doubles,
			indexes: subject === undefined ? undefined : [subject],
		})
	} catch (_e) {
		// noop
	}
}
