import type { UnknownRecord } from '@tldraw/store'
import type { TLBeforeWriteHook, TLBeforeWriteHooks } from './TLSyncRoom'

/**
 * An access check for one client write: return `true` to allow it, `false` to reject it. It gets
 * the same arguments as a {@link TLBeforeWriteHook}, including `get` to read other records.
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
		hooks[typeName] = (args) => (check(args) ? undefined : args.prev)
	}
	return hooks as unknown as TLBeforeWriteHooks<R, SessionMeta>
}
