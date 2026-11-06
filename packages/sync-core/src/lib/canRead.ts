import type { UnknownRecord } from '@tldraw/store'
import type { TLBeforeReadHook, TLBeforeReadHooks } from './TLSyncRoom'

/**
 * A visibility check for one record and one session: return `true` to send the record, `false` to
 * hide it. Any result other than `true` hides it. It gets the same arguments as a
 * {@link TLBeforeReadHook}, including `get` to read other records. The check runs again only when
 * its own record changes, so a check that reads other records with `get` (e.g. "hidden when its
 * frame is private") does not update when only those records change.
 *
 * @public
 */
export type TLCanReadCheck<Rec extends UnknownRecord, SessionMeta> = (
	args: Parameters<TLBeforeReadHook<Rec, SessionMeta>>[0]
) => boolean

/**
 * A map from record `typeName` to a {@link TLCanReadCheck} for that record type.
 *
 * @public
 */
export type TLCanReadChecks<R extends UnknownRecord, SessionMeta> = {
	[K in R['typeName']]?: TLCanReadCheck<Extract<R, { typeName: K }>, SessionMeta>
}

/**
 * Turns boolean visibility checks into {@link TLBeforeReadHooks}. A check that returns `false`
 * sends nothing for the record, and removes it from a client that holds it. A check that throws
 * hides the record too.
 *
 * Use it for who may see what, and keep `beforeRead` hooks for changed copies, such as a masked
 * field. Combine both with {@link composeBeforeRead}. Put the checks first: a hidden record then
 * never reaches the masking hook.
 *
 * @example
 * ```ts
 * new TLSocketRoom<MyRecord, SessionMeta>({
 * 	beforeRead: composeBeforeRead(
 * 		canRead({ shape: ({ session, record }) => !record.meta.private || record.meta.ownerId === session.meta.userId }),
 * 		{ shape: ({ record }) => ({ ...record, meta: { ...record.meta, notes: '' } }) }
 * 	),
 * })
 * ```
 *
 * @public
 */
export function canRead<R extends UnknownRecord, SessionMeta>(
	checks: TLCanReadChecks<R, SessionMeta>
): TLBeforeReadHooks<R, SessionMeta> {
	type AnyCheck = TLCanReadCheck<R, SessionMeta>
	const hooks: Record<string, TLBeforeReadHook<R, SessionMeta>> = {}
	for (const [typeName, check] of Object.entries(checks as Record<string, AnyCheck | undefined>)) {
		if (!check) continue
		// Fail closed: a truthy non-boolean (a string, a Promise from an async check) must not show a
		// hidden record.
		hooks[typeName] = (args) => (check(args) === true ? undefined : null)
	}
	return hooks as unknown as TLBeforeReadHooks<R, SessionMeta>
}
