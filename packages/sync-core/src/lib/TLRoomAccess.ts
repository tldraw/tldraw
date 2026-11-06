import { UnknownRecord } from '@tldraw/store'

/**
 * Read access to the room's records during one batch of access checks (one push, one broadcast,
 * one connect). Writes earlier in the same push are visible.
 *
 * @public
 */
export interface TLRoomAccessView<R extends UnknownRecord> {
	get(id: string): R | undefined
}

/**
 * One client write, as the access layer sees it. Records are at the server's schema version.
 *
 * @public
 */
export type TLRoomAccessWrite<R extends UnknownRecord> =
	| { type: 'create'; prev: null; next: R }
	| { type: 'update'; prev: R; next: R }
	| { type: 'delete'; prev: R; next: null }

/**
 * Per-session read and write access for a room. When a room has one:
 *
 * - **Reads**: the room sends each session only the records that `canRead` allows, for both the
 *   document and presence. When a change makes records visible or hidden, the room sends puts and
 *   removes to each affected session.
 * - **Writes**: every client write goes through `authorizeWrite`. A push is all or nothing: if one
 *   write is denied, the room discards the whole push, so a client never ends up with half an
 *   operation (an arrow without its binding, children without their frame).
 * - **Context**: each session has an access context (`access` in `handleSocketConnect`). The room
 *   sends `toClient(context)` to the client at connect and when `updateSessionAccess` changes it, so
 *   the client can run the same checks.
 *
 * The `isReadonly` and `objectAccess` session flags are ignored when a room has access.
 *
 * Calls are synchronous and run on the push path: they must do no I/O.
 *
 * @public
 */
export interface TLRoomAccess<R extends UnknownRecord, Ctx = any> {
	canRead(ctx: Ctx, record: R, view: TLRoomAccessView<R>): boolean
	/** Return the record to store (a create may be stamped), or `null` to deny. */
	authorizeWrite(ctx: Ctx, write: TLRoomAccessWrite<R>, view: TLRoomAccessView<R>): R | null
	/**
	 * Which other records a batch of committed changes can make readable or unreadable (a new
	 * grant, a shape moved into a hidden frame). The room re-checks those records for every session.
	 *
	 * - `'none'`: only the changed records themselves.
	 * - `'all'`: every record.
	 * - a function: the records it returns `true` for.
	 *
	 * For a delete, `prev` and `next` are both `null`: the record is already gone.
	 */
	readRecheck(
		changes: ReadonlyArray<{ id: string; prev: R | null; next: R | null }>,
		view: TLRoomAccessView<R>
	): 'none' | 'all' | ((record: R) => boolean)
	/**
	 * Called with every committed change, and once at start (and after a storage reset) with
	 * `reset: true` and every record. Keep indexes here.
	 */
	didChange(change: { reset: boolean; puts: readonly R[]; deletes: readonly string[] }): void
	/**
	 * Whether a session that can read these records may stay connected. Checked at connect and
	 * after every access change; `false` closes the session with `FORBIDDEN`. Without this, a
	 * session that lost all access would keep an empty document that its editor tries to repair.
	 */
	canConnect(ctx: Ctx, visible: ReadonlySet<string>, view: TLRoomAccessView<R>): boolean
	/** The JSON the client gets so that it can evaluate the same rules. */
	toClient(ctx: Ctx): unknown
}

/**
 * Thrown inside a push transaction when the access layer denies a write, so the storage rolls the
 * whole push back.
 *
 * @internal
 */
export class TLRoomAccessDenied extends Error {
	override name = 'TLRoomAccessDenied'
}
