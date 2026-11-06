import { Store, UnknownRecord } from '@tldraw/store'
import type {
	TLAuthorizerSession,
	TLRecordAuthorizer,
	TLRecordAuthorizers,
	TLRecordReadAuthorizer,
	TLRecordReadAuthorizers,
} from './TLSyncRoom'

/**
 * The record rules of a room: the same two options that {@link TLSocketRoom} takes. Write them
 * once, and give them to the server (spread them into the room options) and to the client (see
 * {@link registerRecordRules}), so the client offers only the writes that the server accepts.
 *
 * @public
 */
export interface TLRecordRules<R extends UnknownRecord, SessionMeta> {
	authorizeRecord?: TLRecordAuthorizers<R, SessionMeta>
	authorizeRead?: TLRecordReadAuthorizers<R, SessionMeta>
}

/**
 * One record write, as a {@link TLRecordAuthorizer} sees it.
 *
 * @public
 */
export type TLRecordWrite<R extends UnknownRecord> =
	| { type: 'create'; prev: null; next: R }
	| { type: 'update'; prev: R; next: R }
	| { type: 'delete'; prev: R; next: null }

/**
 * Check one write against record rules, the same way the room does: the session must be able to
 * read the record before and after the write, and the type's write authorizer must allow it.
 * Returns the record to store (on create, the authorizer may stamp it), the previous record for an
 * allowed delete, or `null` when the write is denied. A rule that throws denies.
 *
 * Use it for affordances: a probe that updates a record to itself asks "may this session change
 * this record at all". A rule that looks at `next` (for example "must stay inside this frame")
 * passes this probe and can still deny the real write.
 *
 * @example
 * ```ts
 * const locked = !checkRecordWrite(rules, session, get, { type: 'update', prev: shape, next: shape })
 * ```
 *
 * @public
 */
export function checkRecordWrite<R extends UnknownRecord, SessionMeta>(
	rules: TLRecordRules<R, SessionMeta>,
	session: TLAuthorizerSession<SessionMeta>,
	get: (id: string) => UnknownRecord | undefined,
	write: TLRecordWrite<R>
): R | null {
	try {
		const { authorizeRead, authorizeRecord } = rules
		if (authorizeRead) {
			for (const record of [write.prev, write.next]) {
				if (!record) continue
				const canRead = authorizeRead[record.typeName as R['typeName']] as
					| TLRecordReadAuthorizer<R, SessionMeta>
					| undefined
				if (canRead && !canRead({ session, record, get })) return null
			}
		}
		const record = (write.next ?? write.prev)!
		const authorize = authorizeRecord?.[record.typeName as R['typeName']] as
			| TLRecordAuthorizer<R, SessionMeta>
			| undefined
		if (!authorize) return record
		return authorize({ session, get, ...write })
	} catch (e) {
		console.error('[tldraw] a record rule threw, so the write is denied', e)
		return null
	}
}

/**
 * Enforce record rules on a client store: register store side effects that cancel each user write
 * that {@link checkRecordWrite} denies, and stamp records on create. Remote changes and writes with
 * side effects off (snapshot loads, migrations) are not checked.
 *
 * This keeps a client and its server in step, and it enforces the rules when there is no server.
 * It is not a security boundary: the server checks every write again.
 *
 * `getSession` is called for each write, so the rules see the current access after a reconnect.
 * Use `opts.onDeny` to tell the user why a change did not happen.
 *
 * @returns A function that removes the side effects.
 * @public
 */
export function registerRecordRules<R extends UnknownRecord, SessionMeta>(
	store: Store<R, any>,
	rules: TLRecordRules<R, SessionMeta>,
	getSession: () => TLAuthorizerSession<SessionMeta>,
	opts?: {
		/** Called for each write that the rules cancel, for example to explain it in the UI. */
		onDeny?(write: TLRecordWrite<R>): void
	}
): () => void {
	const types = new Set<string>([
		...Object.keys(rules.authorizeRecord ?? {}),
		...Object.keys(rules.authorizeRead ?? {}),
	])
	const get = (id: string) => store.get(id as R['id']) as R | undefined
	const check = (write: TLRecordWrite<R>) => {
		const result = checkRecordWrite(rules, getSession(), get, write)
		if (!result) opts?.onDeny?.(write)
		return result
	}

	const disposes: (() => void)[] = []
	for (const typeName of types) {
		if (store.scopedTypes.presence.has(typeName)) continue
		disposes.push(
			store.sideEffects.register({
				[typeName]: {
					beforeCreate: (next: R, source: 'remote' | 'user') =>
						source === 'user' ? (check({ type: 'create', prev: null, next }) ?? false) : next,
					beforeChange: (prev: R, next: R, source: 'remote' | 'user') =>
						source === 'user' && !check({ type: 'update', prev, next }) ? prev : next,
					beforeDelete: (prev: R, source: 'remote' | 'user') =>
						source === 'user' && !check({ type: 'delete', prev, next: null }) ? false : undefined,
				},
			} as any)
		)
	}
	return () => {
		for (const dispose of disposes) dispose()
	}
}
