import { Environment, TLDataPointName } from '../types'

/**
 * The domain a datapoint belongs to. Everything after the shared header — `blob3` onwards, plus
 * every double — is owned by that domain's own writer, so `blob3` means one thing per domain
 * rather than a different thing per call site. This column is what scopes a query to the set of
 * events that share a payload layout.
 *
 * See `apps/dotcom/analytics-blob-layout.md` for the full layout.
 */
export type TLAnalyticsDomain = 'room' | 'user' | 'replicator' | 'postgres' | 'queue' | 'screenshot'

// Header positions, as zero-based offsets into the blobs array. Payload blobs sit between blob2 and
// the domain slot rather than after it: Analytics Engine's schema is fixed at exactly 20 blobs, so
// the top of the range is a stable anchor, and reserving blob3..blob15 against a current maximum of
// five payload blobs means the header should never have to move. Padding the gap with empty strings
// is free against the 16 KB per-datapoint blob budget.
const DOMAIN_SLOT = 15 // blob16
const USER_SLOT = 16 // blob17
const MAX_PAYLOAD_BLOBS = DOMAIN_SLOT - 2 // blob3..blob15

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
 * Exported so dashboards and scripts can consume one mapping instead of hand-writing
 * `blob16 AS domain` in every panel.
 */
export const COLUMN_ALIASES = {
	index1: 'subject',
	blob1: 'event',
	blob2: 'env',
	blob16: 'domain',
	blob17: 'user',
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
	domain: TLAnalyticsDomain,
	name: TLDataPointName,
	{ subject, userId, blobs, doubles }: DataPoint = {}
) {
	try {
		// A payload wider than its reserved range is a bug in that domain's writer. Truncate rather
		// than overflow into the header: losing a payload dimension is recoverable, mislabelling
		// every row's domain is not.
		const columns = [
			name,
			env.WORKER_NAME ?? 'development-tldraw-multiplayer',
			...(blobs ?? []).slice(0, MAX_PAYLOAD_BLOBS),
		]
		while (columns.length < DOMAIN_SLOT) columns.push('')
		columns[DOMAIN_SLOT] = domain
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
