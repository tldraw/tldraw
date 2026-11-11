import type { UnknownRecord } from '@tldraw/store'
import type { TLPermissionGrant } from './TLStore'

/**
 * One write to a record, as a write rule sees it: the record before and after. On a patch, `next`
 * is the fully applied result.
 *
 * @public
 */
export type TLRecordChange<R extends UnknownRecord = UnknownRecord> =
	| { type: 'create'; prev: null; next: R }
	| { type: 'update'; prev: R; next: R }
	| { type: 'delete'; prev: R; next: null }

/**
 * A session's write access: `document` for the document, `objects` for a sync room's object store
 * (see `objectTypes` on the room). Independent of each other.
 *
 * @public
 */
export interface TLSessionAccess {
	document: 'read' | 'write'
	objects: 'read' | 'write'
}

/**
 * Who is making a change, as a write rule sees it. `sessionId` carries no authority; use it for
 * logging.
 *
 * @public
 */
export interface TLWriteRuleSession<Meta = unknown> {
	sessionId: string
	/** The authenticated user, or `null` for anonymous. */
	userId: string | null
	meta: Meta
	access: TLSessionAccess
	/**
	 * Named permissions your server granted this session. Sent to the client, unlike `meta`, so a
	 * rule that reads them gives the same answer on both sides. `null` when the app doesn't use
	 * named permissions; `[]` when it granted none. `isPermitted` and `getMissingPermission` treat `null`
	 * as nothing granted, so a session that was never given a list can't pass a rule that asks.
	 */
	permissions: readonly TLPermissionGrant[] | null
}

/**
 * What a write rule judges: every change in one unit of work (a push on a sync server, a store
 * transaction in the editor), who made it, and two readers. `before(id)` is any record as it was
 * before the changes; `after(id)` is any record with all of them applied.
 *
 * @public
 */
export interface TLWriteRuleArgs<R extends UnknownRecord = UnknownRecord, Meta = unknown> {
	session: TLWriteRuleSession<Meta>
	changes: TLRecordChange<R>[]
	before(id: string): R | undefined
	after(id: string): R | undefined
}

/**
 * Why a write rule refused: a short reason and, when the rule knows, the ids of the records that
 * caused it.
 *
 * @public
 */
export interface TLWriteRefusal {
	reason: string
	ids?: string[]
}

/**
 * A write rule: return `null` to allow all of the changes, or a refusal to refuse all of them.
 * The same rule can run on a sync server and in the editor when it depends only on its arguments
 * and on code both sides share; one that reads a database or server-only data runs on the server
 * only. Keep it synchronous and fast.
 *
 * @public
 */
export type TLWriteRule<R extends UnknownRecord = UnknownRecord, Meta = unknown> = (
	args: TLWriteRuleArgs<R, Meta>
) => TLWriteRefusal | null
