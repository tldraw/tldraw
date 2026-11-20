import { UnknownRecord } from '@tldraw/store'
import { TLComment, TLCommentThread } from './records/TLComment'
import { TLPage } from './records/TLPage'
import { TLRecord } from './records/TLRecord'
import { TLShape } from './records/TLShape'

/**
 * What every authorize hook gets about who makes the change or reads the record. The room gets
 * `userId` from the app when the session connects. The editor uses `editor.user.getExternalId()`.
 * It is `null` when the room has no user for the session, for example a guest. Any other data a
 * hook needs, such as roles, the app looks up by `userId`.
 *
 * @public
 */
export interface TLAuthorizeContext {
	userId: string | null
}

/**
 * Reads the store as it was before a set of changes (`ctx.before`) or as it would be after them
 * (`ctx.after`), for example to find a shape's parent frame or page. Reads are synchronous.
 *
 * @public
 */
export interface TLRecordGetter<R extends UnknownRecord = TLRecord> {
	get<Id extends R['id']>(id: Id): Extract<R, { id: Id }> | undefined
}

/**
 * One record change. `prev` is the record before the change, and `next` is the record after it.
 *
 * @public
 */
export type TLRecordChange<R extends UnknownRecord = TLRecord> =
	| { type: 'create'; id: R['id']; prev: null; next: R }
	| { type: 'update'; id: R['id']; prev: R; next: R }
	| { type: 'delete'; id: R['id']; prev: R; next: null }

/**
 * What a write hook returns to refuse changes. The client gets the reason. It is an object, so
 * fields such as record ids can be added later without a breaking change.
 *
 * @public
 */
export interface TLWriteRefusal {
	reason: string
}

/**
 * The context the read hook gets. `can` is the `authorize.can` hook for the same user, so the
 * read and write hooks use the same permission rules as the editor's UI. With no `can` hook, it
 * allows everything, as `editor.can` does.
 *
 * @public
 */
export interface TLReadContext extends TLAuthorizeContext {
	can: TLCan
}

/**
 * `authorize.can` bound to one user. The read and write hooks get it as `ctx.can`.
 *
 * @public
 */
export type TLCan = <P extends TLPermission>(
	permission: P,
	data?: TLPermissionDataMap[P]
) => boolean

/**
 * The context a write hook gets with the changes. To check a permission for a record, pass
 * `ctx.can` the record from `before` or `after`.
 *
 * @public
 */
export interface TLWriteContext<R extends UnknownRecord = TLRecord> extends TLReadContext {
	before: TLRecordGetter<R>
	after: TLRecordGetter<R>
}

/**
 * The write hook. The room runs it on each client push, and the editor runs it on each operation
 * once its side effects have settled. It sees only document records. It must be synchronous and
 * pure, so that the client and the room give the same answer. Return `null` to allow, or a
 * {@link TLWriteRefusal} to refuse all the changes.
 *
 * @public
 */
export type TLAuthorizeWrite<R extends UnknownRecord = TLRecord> = (
	changes: TLRecordChange<R>[],
	ctx: TLWriteContext<R>
) => TLWriteRefusal | null

/**
 * The read hook. The room runs it before it sends a presence record to a session. Return `true`
 * to send the record to that session. Document records are not filtered: every session in a
 * file gets all of them.
 *
 * @public
 */
export type TLAuthorizeRead<R extends UnknownRecord = TLRecord> = (
	record: R,
	ctx: TLReadContext
) => boolean

/**
 * Maps each permission name to the type of the data that a permission check gets with it.
 * Packages and apps add their own names with module augmentation:
 *
 * ```ts
 * declare module '@tldraw/tlschema' {
 * 	interface TLPermissionDataMap {
 * 		'workspace:edit': { workspace: Workspace }
 * 	}
 * }
 * ```
 *
 * The data is an object, so fields such as `page` can be added later without a breaking change.
 *
 * @public
 */
export interface TLPermissionDataMap {
	'tl:shape:create': undefined
	'tl:shape:edit': { shape: TLShape }
	'tl:shape:delete': { shape: TLShape }
	'tl:page:create': undefined
	'tl:page:edit': { page: TLPage }
	'tl:page:delete': { page: TLPage }
	/** Take part in comments: post, react, resolve and reopen threads, and move pins. */
	'tl:comment:create': undefined
	'tl:comment:edit': { comment: TLComment }
	'tl:comment:delete': { comment: TLComment }
	'tl:comment-thread:delete': { thread: TLCommentThread }
}

/**
 * The name of a permission in {@link TLPermissionDataMap}.
 *
 * @public
 */
export type TLPermission = keyof TLPermissionDataMap & string

/**
 * The permission check. The editor calls it for the permissions its UI and actions check, with
 * the current user's id in `ctx`. The write and read hooks get it as `ctx.can`, so the rules live
 * in one place. Its own `ctx` has no `can`, so it cannot call itself or the other hooks.
 *
 * @public
 */
export type TLAuthorizeCan = <P extends TLPermission>(
	permission: P,
	data: TLPermissionDataMap[P] | undefined,
	ctx: TLAuthorizeContext
) => boolean

/**
 * The authorize hooks. The app passes the same object to the room and to the client. Each one
 * uses the hooks that apply to it: the room uses `write` and `read`, and the editor uses `write`
 * and `can`. Both give `can` to `write` and `read` as `ctx.can`. Each hook gets the user's id in `ctx`, so the same code runs on both sides. With no
 * hooks, everything is allowed, as before.
 *
 * The editor judges each operation, but the room judges each push, and one push can hold many
 * operations (for example all the edits made offline). So when the two sides disagree, for
 * example because app data on the client is stale, the room refuses the whole push.
 *
 * @public
 */
export interface TLAuthorize<R extends UnknownRecord = TLRecord> {
	write?: TLAuthorizeWrite<R>
	read?: TLAuthorizeRead<R>
	can?: TLAuthorizeCan
}

/**
 * Combine several authorize objects into one, for example the app's permissions and the comment
 * rules. `write` runs each hook in order and returns the first refusal. `read` and `can` allow
 * only when every hook allows. A hook that no object has stays unset.
 *
 * @example
 * ```ts
 * new TLSocketRoom({ authorize: composeAuthorize(permissionsAuthorize, commentAuthorize) })
 * ```
 *
 * @public
 */
export function composeAuthorize<R extends UnknownRecord = TLRecord>(
	...list: TLAuthorize<R>[]
): TLAuthorize<R> {
	const writes = list.flatMap((a) => (a.write ? [a.write] : []))
	const reads = list.flatMap((a) => (a.read ? [a.read] : []))
	const cans = list.flatMap((a) => (a.can ? [a.can] : []))
	const result: TLAuthorize<R> = {}
	if (writes.length) {
		result.write = (changes, ctx) => {
			for (const write of writes) {
				const refusal = write(changes, ctx)
				if (refusal) return refusal
			}
			return null
		}
	}
	if (reads.length) result.read = (record, ctx) => reads.every((read) => read(record, ctx))
	if (cans.length)
		result.can = (permission, data, ctx) => cans.every((can) => can(permission, data, ctx))
	return result
}

/**
 * Binds `authorize.can` to one user, for `editor.can` and for `ctx.can` in the write and read
 * hooks. They must agree, or the UI offers actions that the hooks refuse.
 *
 * @internal
 */
export function bindAuthorizeCan(can: TLAuthorizeCan | undefined, ctx: TLAuthorizeContext): TLCan {
	return can ? (permission, data) => can(permission, data, ctx) : () => true
}
