import { UnknownRecord } from '@tldraw/store'
import {
	TLReadContext,
	TLRecordChange,
	TLRecordReader,
	TLRule,
	TLTransaction,
} from './TLPermissions'

/*
 * Rules for the default tldraw records. They read records by shape (typeName, parentId, meta), so
 * they work on any record union that includes the default types.
 */

type AnyRecord = UnknownRecord & Record<string, any>

/** The comment record types. They are gated by `comment`, not `edit`. @public */
export const COMMENT_RECORD_TYPES: readonly string[] = [
	'comment',
	'comment-thread',
	'comment-reaction',
]

/**
 * Deny the transaction if it changes a record of a listed type and the session lacks `ability`.
 * With no `types`, every type except `except` is in scope.
 *
 * `requireAbility('edit', { except: COMMENT_RECORD_TYPES })` is the old `isReadonly` gate.
 * `requireAbility('comment', { types: COMMENT_RECORD_TYPES })` is the old `objectAccess` gate.
 *
 * @public
 */
export function requireAbility<R extends UnknownRecord>(
	ability: string,
	opts: { types?: readonly string[]; except?: readonly string[] } = {}
): TLRule<R> {
	const types = opts.types ? new Set(opts.types) : null
	const except = new Set(opts.except ?? [])
	return (tx) => {
		if (tx.can(ability)) return undefined
		for (const change of tx.changes) {
			const typeName = recordOf(change).typeName
			if (except.has(typeName)) continue
			if (types && !types.has(typeName)) continue
			return `You need "${ability}" access to change ${typeName} records.`
		}
		return undefined
	}
}

/** The record a change is about: `next` if it exists, else `prev`. @public */
export function recordOf<R extends UnknownRecord>(change: TLRecordChange<R>): R {
	return (change.next ?? change.prev) as R
}

/**
 * The rules that replace `isReadonly` and `objectAccess`: `edit` to change anything except
 * comments, `comment` to change comments. A room with no permissions uses these.
 *
 * @public
 */
export function defaultAbilityRules<R extends UnknownRecord>(): TLRule<R>[] {
	return [
		requireAbility('edit', { except: COMMENT_RECORD_TYPES }),
		requireAbility('comment', { types: COMMENT_RECORD_TYPES }),
	]
}

/**
 * The page a record belongs to, by walking `parentId` up from a shape. Bindings follow their
 * `fromId` shape. Comment records use their `pageId`. Returns null for records with no page
 * (the document, assets, users).
 *
 * @public
 */
export function pageIdOf<R extends UnknownRecord>(
	records: TLRecordReader<R>,
	record: R | undefined
): string | null {
	let current = record as AnyRecord | undefined
	for (let i = 0; current && i < 1000; i++) {
		switch (current.typeName) {
			case 'page':
				return current.id
			case 'shape':
				if (String(current.parentId).startsWith('page:')) return current.parentId
				current = records.get(current.parentId) as AnyRecord | undefined
				continue
			case 'binding':
				current = records.get(current.fromId) as AnyRecord | undefined
				continue
			case 'comment':
			case 'comment-thread':
			case 'comment-reaction':
			case 'instance_page_state':
				return current.pageId
			case 'instance_presence':
				return current.currentPageId
			default:
				return null
		}
	}
	return null
}

/** Ids of a shape's ancestors, nearest first (shapes and the page). @public */
export function ancestorIdsOf<R extends UnknownRecord>(
	records: TLRecordReader<R>,
	record: R | undefined
): string[] {
	const ids: string[] = []
	let parentId = (record as AnyRecord | undefined)?.parentId as string | undefined
	for (let i = 0; parentId && i < 1000; i++) {
		ids.push(parentId)
		parentId = (records.get(parentId) as AnyRecord | undefined)?.parentId
	}
	return ids
}

/** The owner stamped on a record, from `meta.ownerId`. @public */
export function ownerOf(record: UnknownRecord | null | undefined): string | null {
	const owner = (record as AnyRecord | null | undefined)?.meta?.ownerId
	return typeof owner === 'string' ? owner : null
}

/**
 * Shapes belong to their creator. A session may create a shape only with its own user id in
 * `meta.ownerId`, and may change or delete only shapes it owns. The owner never changes.
 * Bindings follow the shape they start from (`fromId`). Sessions with the `unless` ability skip
 * the rule. Anonymous sessions own nothing.
 *
 * The client stamps `meta.ownerId` on create (see `editor.permissions`). The server verifies it.
 * Because the whole transaction is checked, grouping your shape with someone else's shape fails
 * as one unit: the group is not created either.
 *
 * @public
 */
export function ownShapesOnly<R extends UnknownRecord>(opts: { unless?: string } = {}): TLRule<R> {
	return (tx) => {
		if (opts.unless && tx.can(opts.unless)) return undefined
		const userId = tx.access.userId
		for (const change of tx.changes) {
			const record = recordOf(change) as AnyRecord
			if (record.typeName === 'shape') {
				const reason = checkOwnedChange(change, userId)
				if (reason) return reason
			} else if (record.typeName === 'binding') {
				for (const binding of [change.prev, change.next] as (AnyRecord | null)[]) {
					if (!binding) continue
					const from = tx.after.get(binding.fromId) ?? tx.before.get(binding.fromId)
					if (!userId || ownerOf(from) !== userId) {
						return 'You can only connect arrows that you own.'
					}
				}
			}
		}
		return undefined
	}
}

function checkOwnedChange(change: TLRecordChange<UnknownRecord>, userId: string | null) {
	if (!userId) return 'Sign in to edit shapes.'
	switch (change.op) {
		case 'create':
			if (ownerOf(change.next) !== userId) return 'New shapes must be owned by you.'
			return
		case 'update':
			if (ownerOf(change.prev) !== userId) return 'You can only change your own shapes.'
			if (ownerOf(change.next) !== userId) return 'You cannot give a shape away.'
			return
		case 'delete':
			if (ownerOf(change.prev) !== userId) return 'You can only delete your own shapes.'
			return
	}
}

/**
 * Limit writes to the subtree of one shape (for example a frame). Every changed shape must be
 * inside `rootId` before and after the change, so a shape cannot be moved in or out. Bindings
 * follow their shapes. Other record types are denied. Applies only to sessions that `appliesTo`.
 *
 * @public
 */
export function confineToShape<R extends UnknownRecord>(opts: {
	appliesTo(tx: TLTransaction<R>): boolean
	rootId(tx: TLTransaction<R>): string | null
	reason?: string
}): TLRule<R> {
	return (tx) => {
		if (!opts.appliesTo(tx)) return undefined
		const rootId = opts.rootId(tx)
		const reason = opts.reason ?? 'You can only change shapes inside your area.'
		if (!rootId) return reason
		const inside = (records: TLRecordReader<R>, record: R | null) => {
			if (!record) return true
			const r = record as AnyRecord
			if (r.typeName === 'binding') {
				const from = records.get(r.fromId) ?? tx.after.get(r.fromId) ?? tx.before.get(r.fromId)
				const to = records.get(r.toId) ?? tx.after.get(r.toId) ?? tx.before.get(r.toId)
				return (
					!!from &&
					!!to &&
					ancestorIdsOf(records, from).includes(rootId) &&
					ancestorIdsOf(records, to).includes(rootId)
				)
			}
			if (r.typeName !== 'shape') return false
			return ancestorIdsOf(records, record).includes(rootId)
		}
		for (const change of tx.changes) {
			if (!inside(tx.before, change.prev) || !inside(tx.after, change.next)) return reason
		}
		return undefined
	}
}

/**
 * Write control per page. `canEditPage` decides for each page that the transaction touches, before
 * or after (so a shape cannot be moved onto a page you cannot edit). Records with no page pass.
 *
 * @public
 */
export function pageWriteAccess<R extends UnknownRecord>(opts: {
	canEditPage(page: R, tx: TLTransaction<R>): boolean
}): TLRule<R> {
	return (tx) => {
		const checked = new Set<string>()
		for (const change of tx.changes) {
			const pageIds = [
				pageIdOf(tx.before, change.prev ?? undefined),
				pageIdOf(tx.after, change.next ?? undefined),
			]
			for (const pageId of pageIds) {
				if (!pageId || checked.has(pageId)) continue
				checked.add(pageId)
				const page = tx.before.get(pageId) ?? tx.after.get(pageId)
				// a page created in this transaction is checked as itself
				if (page && !opts.canEditPage(page, tx)) {
					return `You cannot edit the page "${(page as AnyRecord).name ?? pageId}".`
				}
			}
		}
		return undefined
	}
}

/**
 * Read control per page, for `canRead`. A record on a page the session cannot see is hidden: the
 * page itself, its shapes and bindings, comments on it, and the cursors of people on it.
 *
 * @public
 */
export function pageReadAccess<R extends UnknownRecord>(opts: {
	canSeePage(page: R, ctx: TLReadContext<R>): boolean
}): (record: R, ctx: TLReadContext<R>) => boolean {
	return (record, ctx) => {
		const pageId = pageIdOf(ctx.records, record)
		if (!pageId) return true
		const page = ctx.records.get(pageId)
		if (!page) return true
		return opts.canSeePage(page, ctx)
	}
}

/**
 * Give record types to one intent. Records of these types change only in transactions named
 * `intent`, such transactions change only these types, and the session needs `ability`. Use it
 * for plugin records whose writes must go through one code path (and, with a server mutator,
 * through server code).
 *
 * @public
 */
export function intentOwnsTypes<R extends UnknownRecord>(
	intent: string,
	opts: { types: readonly string[]; ability?: string }
): TLRule<R> {
	const types = new Set(opts.types)
	return (tx) => {
		const named = tx.intent?.name === intent
		for (const change of tx.changes) {
			const owned = types.has(recordOf(change).typeName)
			if (owned && !named)
				return `Only "${intent}" can change ${recordOf(change).typeName} records.`
			if (!owned && named) return `"${intent}" cannot change ${recordOf(change).typeName} records.`
		}
		if (named && opts.ability && !tx.can(opts.ability)) {
			return `You need "${opts.ability}" access for "${intent}".`
		}
		return undefined
	}
}
