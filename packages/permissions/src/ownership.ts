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
 *   if (isPermitted(session.permissions, 'classroom:manage')) return null
 *   // the page's policy is the rule's to guard: only a teacher may change it
 *   if (next?.typeName === 'page' && next.meta.ownerId !== prev?.meta.ownerId) return 'teachers only'
 *   for (const [end, get] of [[prev, before], [next, after]] as const) {
 *     if (!end) continue
 *     const owning = getOwningPage(get, end)
 *     if (!owning.page) return owning.reason === 'unscoped' ? null : 'dangling parent'
 *     if (owning.page.meta.ownerId !== session.userId) return 'not your page'
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
	const owning = getOwningAncestor<TLPage>(get, record, isPage)
	if (owning.owner) return { page: owning.owner }
	// every walk that doesn't dangle ends at a page, so 'none' only means a broken chain
	return { page: null, reason: owning.reason === 'none' ? 'dangling' : owning.reason }
}

const isPage = (record: UnknownRecord) => record.typeName === 'page'

/**
 * The ancestor a record belongs to, for rules scoped to something other than a page (a frame
 * someone is assigned, a known multi-shape object).
 *
 * - `owner`: the nearest record, the input included, that `isOwner` accepts.
 * - `none`: the walk reached a page without meeting one. The record is outside every owner.
 * - `dangling`: a missing parent, a parent that is not a shape or page, or a cycle. A rule should
 *   refuse.
 * - `split`: a binding whose two shapes resolve differently (two owners, or one inside and one
 *   outside). Whether that is allowed is the rule's call.
 * - `unscoped`: the input is not a shape, page or binding, and `isOwner` doesn't accept it.
 *
 * @public
 */
export type TLOwningAncestor<T extends UnknownRecord = UnknownRecord> =
	| { owner: T; reason?: undefined }
	| { owner: null; reason: 'none' | 'dangling' | 'split' | 'unscoped' }

/**
 * Walk a record up its `parentId` chain to the nearest ancestor `isOwner` accepts. A binding
 * belongs to the owner both its shapes share.
 *
 * Membership follows parent links, not geometry: a shape that pokes out of its frame still belongs
 * to it, and a shape drawn over a frame without being its child does not.
 *
 * @example
 * ```ts
 * // the frame Alice is assigned, through nested groups
 * const owning = getOwningAncestor(after, next, (r) => r.id === aliceFrameId)
 * if (owning.reason === 'dangling') return { reason: 'dangling parent' }
 * if (!owning.owner) return { reason: 'outside your frame' }
 * ```
 *
 * @public
 */
export function getOwningAncestor<T extends UnknownRecord = UnknownRecord>(
	get: (id: string) => UnknownRecord | undefined,
	record: UnknownRecord,
	isOwner: (record: UnknownRecord) => boolean
): TLOwningAncestor<T> {
	if (record.typeName !== 'binding' || isOwner(record)) return walk<T>(get, record, isOwner)
	const { fromId, toId } = record as UnknownRecord & { fromId: string; toId: string }
	const from = get(fromId)
	const to = get(toId)
	if (from?.typeName !== 'shape' || to?.typeName !== 'shape') return dangling
	const a = walk<T>(get, from, isOwner)
	if (!a.owner && a.reason !== 'none') return a
	const b = walk<T>(get, to, isOwner)
	if (!b.owner && b.reason !== 'none') return b
	return a.owner?.id === b.owner?.id ? a : split
}

const dangling = { owner: null, reason: 'dangling' } as const
const split = { owner: null, reason: 'split' } as const

function walk<T extends UnknownRecord>(
	get: (id: string) => UnknownRecord | undefined,
	record: UnknownRecord,
	isOwner: (record: UnknownRecord) => boolean
): TLOwningAncestor<T> {
	let current: UnknownRecord | undefined = record
	// Bounded so a tampered parent cycle fails closed instead of looping forever.
	for (let depth = 0; depth < MAX_PARENT_DEPTH; depth++) {
		if (isOwner(current)) return { owner: current as T }
		if (current.typeName === 'page') return { owner: null, reason: 'none' }
		if (current.typeName !== 'shape') {
			return depth === 0 ? { owner: null, reason: 'unscoped' } : dangling
		}
		current = get((current as UnknownRecord & { parentId: string }).parentId)
		if (!current) return dangling
	}
	return dangling
}

// Deeper than any real nesting of frames and groups; only a cycle gets near it.
const MAX_PARENT_DEPTH = 1000
