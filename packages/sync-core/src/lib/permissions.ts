import { PermissionDenial, PermissionMiddleware, RecordAccess, UnknownRecord } from '@tldraw/store'
import { TLObjectStoreAccess } from './protocol'

/**
 * The actor that a room's `PermissionChain` sees: the session as the room knows it. `meta` is
 * what the host passed at connect. On the client, build the same shape from what the server sent
 * (`isReadonly`, `objectAccess`) and the host's own `meta`, so one chain runs on both sides.
 *
 * @public
 */
export interface TLSyncActor<SessionMeta> {
	readonly sessionId: string
	readonly isReadonly: boolean
	readonly objectAccess: TLObjectStoreAccess
	readonly meta: SessionMeta
}

/**
 * A per-record rule for one record type, in the shape of the earlier `authorizeRecord` option.
 * Return the record to allow (on create, the returned record is stored, so it can stamp fields),
 * or `null` to deny. Use {@link recordAuthorizers} to run a map of them as one chain layer.
 *
 * @public
 */
export type TLRecordAuthorizer<Rec extends UnknownRecord, SessionMeta> = (
	args: {
		session: TLSyncActor<SessionMeta>
		/** Reads the stored record, before this batch. Set when the rule runs in a chain. */
		get?(id: string): UnknownRecord | undefined
	} & (
		| { type: 'create'; prev: null; next: Rec }
		| { type: 'update'; prev: Rec; next: Rec }
		| { type: 'delete'; prev: Rec; next: null }
	)
) => Rec | null

/**
 * A map from record `typeName` to a {@link TLRecordAuthorizer}.
 *
 * @public
 */
export type TLRecordAuthorizers<R extends UnknownRecord, SessionMeta> = {
	[K in R['typeName']]?: TLRecordAuthorizer<Extract<R, { typeName: K }>, SessionMeta>
}

/**
 * Runs a map of per-type {@link TLRecordAuthorizers} as one layer of a permission chain. Writes of
 * other types, reads, and actions pass through. This is how per-record rules from a package, such as
 * the comment rules in `@tldraw/sync-collaboration`, join a chain.
 *
 * @public
 */
export function recordAuthorizers<R extends UnknownRecord, SessionMeta>(
	authorizers: TLRecordAuthorizers<R, SessionMeta>
): PermissionMiddleware<R, TLSyncActor<SessionMeta>> {
	const byType = authorizers as Record<string, TLRecordAuthorizer<R, SessionMeta> | undefined>
	return (batch, next) => {
		if (batch.kind !== 'write') return next()
		const passed: RecordAccess<R>[] = []
		const denied: PermissionDenial<R>[] = []
		let changed = false
		for (const access of batch.items) {
			if (access.type === 'read' || access.type === 'action') {
				passed.push(access)
				continue
			}
			const typeName = (access.type === 'delete' ? access.prev : access.next).typeName
			const authorize = Object.prototype.hasOwnProperty.call(byType, typeName)
				? byType[typeName]
				: undefined
			if (!authorize) {
				passed.push(access)
				continue
			}
			const result = authorize({ ...access, session: batch.actor, get: batch.get } as Parameters<
				TLRecordAuthorizer<R, SessionMeta>
			>[0])
			if (!result) {
				denied.push({ access, reason: `${typeName} rule` })
			} else if (access.type === 'create' && result !== access.next) {
				changed = true
				passed.push({ ...access, next: result })
			} else {
				passed.push(access)
			}
		}
		if (!changed && denied.length === 0) return next()
		const result = next(passed)
		return { allowed: result.allowed, denied: [...denied, ...result.denied] }
	}
}
