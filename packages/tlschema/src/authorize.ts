import { UnknownRecord } from '@tldraw/store'
import { TLPage } from './records/TLPage'
import { TLRecord } from './records/TLRecord'
import { TLShape } from './records/TLShape'

/**
 * Who is making a change. The app sets `meta` when the session connects, for example
 * `{ userId }`. The room passes the meta it got for the session. The editor passes the
 * `sessionMeta` the app gave the store.
 *
 * @public
 */
export interface TLSession<Meta = unknown> {
	sessionId: string
	meta: Meta
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
 * The context a write hook gets with the changes.
 *
 * @public
 */
export interface TLWriteContext<R extends UnknownRecord = TLRecord, Meta = any> {
	session: TLSession<Meta>
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
export type TLAuthorizeWrite<R extends UnknownRecord = TLRecord, Meta = any> = (
	changes: TLRecordChange<R>[],
	ctx: TLWriteContext<R, Meta>
) => TLWriteRefusal | null

/**
 * The read hook. The room runs it before it sends a presence record to a session. Return `true`
 * to send the record to that session. Document records are not filtered: every session in a
 * file gets all of them.
 *
 * @public
 */
export type TLAuthorizeRead<R extends UnknownRecord = TLRecord, Meta = any> = (
	record: R,
	session: TLSession<Meta>
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
}

/**
 * The name of a permission in {@link TLPermissionDataMap}.
 *
 * @public
 */
export type TLPermission = keyof TLPermissionDataMap & string

/**
 * The permission check. The editor calls it for the permissions its UI and actions check, with
 * the editor's session, so one `authorize` object works in the room and in the editor. The app
 * finds the user in `session.meta`.
 *
 * @public
 */
export type TLAuthorizeCan<Meta = any> = <P extends TLPermission>(
	session: TLSession<Meta>,
	permission: P,
	data?: TLPermissionDataMap[P]
) => boolean

/**
 * The authorize hooks. The app passes the same object to the room and to the client. Each one
 * uses the hooks that apply to it: the room uses `write` and `read`, and the editor uses `write`
 * and `can`. Each hook gets the session, so the hooks don't need to know which side runs them. With no hooks, everything is allowed, as before.
 *
 * @public
 */
export interface TLAuthorize<R extends UnknownRecord = TLRecord, Meta = any> {
	write?: TLAuthorizeWrite<R, Meta>
	read?: TLAuthorizeRead<R, Meta>
	can?: TLAuthorizeCan<Meta>
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
export function composeAuthorize<R extends UnknownRecord = TLRecord, Meta = any>(
	...list: TLAuthorize<R, Meta>[]
): TLAuthorize<R, Meta> {
	const writes = list.flatMap((a) => (a.write ? [a.write] : []))
	const reads = list.flatMap((a) => (a.read ? [a.read] : []))
	const cans = list.flatMap((a) => (a.can ? [a.can] : []))
	const result: TLAuthorize<R, Meta> = {}
	if (writes.length) {
		result.write = (changes, ctx) => {
			for (const write of writes) {
				const refusal = write(changes, ctx)
				if (refusal) return refusal
			}
			return null
		}
	}
	if (reads.length) result.read = (record, session) => reads.every((read) => read(record, session))
	if (cans.length)
		result.can = (session, permission, data) => cans.every((can) => can(session, permission, data))
	return result
}
