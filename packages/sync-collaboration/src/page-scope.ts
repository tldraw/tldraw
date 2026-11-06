import type { UnknownRecord } from '@tldraw/store'
import type { TLPage } from '@tldraw/tlschema'

/**
 * Where a record lives, for page-scoped write rules.
 *
 * - `page`: the page record the input lives on.
 * - `dangling`: the input points at a parent that does not exist. A rule should refuse: the write
 *   would leave an orphan, or the client is lying about its parent.
 * - `split`: a binding whose two shapes live on different pages. The editor never makes one (a
 *   shape moved to another page is isolated from its bindings first), so a rule should refuse.
 * - `unscoped`: the input is not a page-scoped record (e.g. the document record, an asset). A rule
 *   decides on its own what that means; it is not an error.
 *
 * @public
 */
export type TLOwningPage =
	| { page: TLPage; reason?: undefined }
	| { page: null; reason: 'dangling' | 'split' | 'unscoped' }

/**
 * Resolve the page a record lives on, reading other records through `get`. Built for a sync
 * server's write rule (`authorize` on `TLSocketRoom`), with its `before` or `after` reader, but
 * works against any `(id) => record` reader.
 *
 * - A page is its own owning page.
 * - A shape is walked up `parentId` through frames and groups to its page.
 * - A binding lives on the page both its shapes are on; `split` when they differ.
 * - Anything else is `unscoped`.
 *
 * A walk that reaches a missing record is `dangling`; a rule should refuse rather than allow.
 * Read `prev` through `before` and `next` through `after`, so a shape created under a frame
 * created in the same push resolves, and a shape reparented into a frame deleted in the same push
 * is `dangling`.
 *
 * @example
 * ```ts
 * authorize: perRecord(({ prev, next }, { session, before, after }) => {
 *   if (session.meta.role === 'teacher') return null
 *   // the page's policy is the rule's to guard: only a teacher may change it
 *   if (next?.typeName === 'page' && next.meta.ownerId !== prev?.meta.ownerId) return 'teachers only'
 *   for (const [end, get] of [[prev, before], [next, after]] as const) {
 *     if (!end) continue
 *     const owning = getOwningPage(get, end)
 *     if (!owning.page) return owning.reason === 'unscoped' ? null : 'dangling parent'
 *     if (owning.page.meta.ownerId !== session.meta.userId) return 'not your page'
 *   }
 *   return null
 * })
 * ```
 *
 * @public
 */
export function getOwningPage(
	get: (id: string) => UnknownRecord | undefined,
	record: UnknownRecord
): TLOwningPage {
	if (record.typeName !== 'binding') return walkToPage(get, record)
	const { fromId, toId } = record as UnknownRecord & { fromId: string; toId: string }
	const from = get(fromId)
	const to = get(toId)
	if (!from || !to) return dangling
	const owning = walkToPage(get, from)
	if (!owning.page) return owning
	const other = walkToPage(get, to)
	if (!other.page) return other
	return owning.page.id === other.page.id ? owning : { page: null, reason: 'split' }
}

const dangling: TLOwningPage = { page: null, reason: 'dangling' }

function walkToPage(get: (id: string) => UnknownRecord | undefined, record: UnknownRecord) {
	let current: UnknownRecord | undefined = record
	// Bounded so a tampered parent cycle fails closed instead of looping forever.
	for (let depth = 0; depth < MAX_PARENT_DEPTH; depth++) {
		if (current.typeName === 'page') return { page: current as TLPage }
		if (current.typeName !== 'shape')
			return depth === 0 ? { page: null, reason: 'unscoped' as const } : dangling
		current = get((current as UnknownRecord & { parentId: string }).parentId)
		if (!current) return dangling
	}
	return dangling
}

// Deeper than any real nesting of frames and groups; only a cycle gets near it.
const MAX_PARENT_DEPTH = 1000
