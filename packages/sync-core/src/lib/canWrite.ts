import type { UnknownRecord } from '@tldraw/store'
import type { TLBeforeWriteHook, TLBeforeWriteHooks } from './TLSyncRoom'

/**
 * An access check for one client write: return `true` to allow it, `false` to reject it. Only
 * `true` allows the write, so a non-boolean result, such as the Promise of an async check, rejects
 * it. It gets the same arguments as a {@link TLBeforeWriteHook}, including `get` to read other records.
 *
 * @public
 */
export type TLCanWriteCheck<Rec extends UnknownRecord, SessionMeta> = (
	args: Parameters<TLBeforeWriteHook<Rec, SessionMeta>>[0]
) => boolean

/**
 * A map from record `typeName` to a {@link TLCanWriteCheck} for that record type.
 *
 * @public
 */
export type TLCanWriteChecks<R extends UnknownRecord, SessionMeta> = {
	[K in R['typeName']]?: TLCanWriteCheck<Extract<R, { typeName: K }>, SessionMeta>
}

/**
 * Turns boolean access checks into {@link TLBeforeWriteHooks}. A check that returns `false` keeps
 * the stored record, so the write is rejected and the client is corrected. A check that throws
 * rejects the write too.
 *
 * Use it for who may write what, and keep `beforeWrite` hooks for changes to the record, such as
 * stamping an author. Combine both with {@link composeBeforeWrite}. Order matters there: a check
 * placed after a stamping hook sees the stamped record.
 *
 * @example
 * ```ts
 * new TLSocketRoom<MyRecord, SessionMeta>({
 * 	beforeWrite: composeBeforeWrite(
 * 		canWrite({ shape: ({ session, next }) => !next || next.meta.ownerId === session.meta.userId }),
 * 		createCommentAuthorizers({ getUserId })
 * 	),
 * })
 * ```
 *
 * @public
 */
export function canWrite<R extends UnknownRecord, SessionMeta>(
	checks: TLCanWriteChecks<R, SessionMeta>
): TLBeforeWriteHooks<R, SessionMeta> {
	type AnyCheck = TLCanWriteCheck<R, SessionMeta>
	const hooks: Record<string, TLBeforeWriteHook<R, SessionMeta>> = {}
	for (const [typeName, check] of Object.entries(checks as Record<string, AnyCheck | undefined>)) {
		if (!check) continue
		hooks[typeName] = (args) => (check(args) === true ? undefined : args.prev)
	}
	return hooks as unknown as TLBeforeWriteHooks<R, SessionMeta>
}

/**
 * The arguments of a {@link TLCanWriteCheck} without `session`. This is what a client has: the
 * editor's `canWrite` option gets these arguments.
 *
 * @public
 */
export type TLCanWriteClientArgs<R extends UnknownRecord> = Parameters<
	TLCanWriteCheck<R, any>
>[0] extends infer Args
	? // Distributes over the create, update and delete cases, so `type` still narrows `prev` and `next`
		Args extends unknown
		? Omit<Args, 'session'>
		: never
	: never

/**
 * Runs the same checks that {@link canWrite} gives the server, on the client, as the editor's
 * `canWrite` option. So one set of rule functions decides what the server stores and what the
 * client offers and writes. The client check is for the UI and for fast feedback: the server
 * check still decides.
 *
 * `getSession` gives the session the client acts as, with the same `meta` that the server gets
 * for this client. The editor runs the check inside reactive caches, so read changing state, such
 * as an atom with the person's role, inside `getSession`.
 *
 * A record type with no check is allowed, as on the server. A check that returns anything other
 * than `true` blocks the write.
 *
 * @example
 * ```ts
 * // rules.ts, imported by the server and by the client
 * export const checks: TLCanWriteChecks<TLRecord, SessionMeta> = {
 * 	shape: ({ session, prev, next }) => (next ?? prev).meta.ownerId === session.meta.userId,
 * }
 *
 * // server
 * new TLSocketRoom({ beforeWrite: canWrite(checks) })
 *
 * // client
 * <Tldraw canWrite={canWriteOnClient(checks, () => ({ sessionId, isReadonly: false, meta }))} />
 * ```
 *
 * @public
 */
export function canWriteOnClient<R extends UnknownRecord, SessionMeta>(
	checks: TLCanWriteChecks<R, SessionMeta>,
	getSession: () => Parameters<TLCanWriteCheck<R, SessionMeta>>[0]['session']
): (write: TLCanWriteClientArgs<R>) => boolean {
	const byType = checks as Record<string, TLCanWriteCheck<R, SessionMeta> | undefined>
	return (write) => {
		const record = (write.next ?? write.prev) as R
		const check = byType[record.typeName]
		if (!check) return true
		return check({ ...write, session: getSession() } as any) === true
	}
}
