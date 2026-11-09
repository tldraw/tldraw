import { RecordsDiff, UnknownRecord } from '@tldraw/store'
import { isEqual } from '@tldraw/utils'
import type { TLSyncRefusal } from './protocol'
import type { TLRecordChange, TLSyncAuthorizer, TLSyncAuthorizerSession } from './TLSyncRoom'

/**
 * Runs the room's `authorize` rule on the client, so a write the room would refuse is undone
 * locally instead of sent. Pass the same rule and the same `meta` the room uses for this session.
 *
 * The client judges exactly what its next push will carry, against the world that push lands on.
 * That is the unit the room judges, so a client that is up to date never sends a push the room
 * refuses, whatever the rule reads.
 *
 * @public
 */
export interface TLSyncClientAuthorize<R extends UnknownRecord, SessionMeta = any> {
	/** The room's `authorize` rule. */
	rule: TLSyncAuthorizer<R, SessionMeta>
	/** The `meta` the room holds for this session, e.g. the signed-in user. */
	meta: SessionMeta
	/**
	 * What a refusal undoes: the whole store transaction that caused it (`'transaction'`, the
	 * default), or only the records the rule names (`'record'`), keeping the rest of it.
	 */
	unit?: 'transaction' | 'record'
	/** Called after a refused write was undone locally. */
	onRefused?(refusal: TLSyncRefusal): void
}

/**
 * Judges `diff` the way the room judges a push carrying it. `get` reads the world after the diff;
 * the world before it is `get` with the diff undone.
 */
export function authorizeRecordsDiff<R extends UnknownRecord, SessionMeta>(
	rule: TLSyncAuthorizer<R, SessionMeta>,
	session: TLSyncAuthorizerSession<SessionMeta>,
	diff: RecordsDiff<R>,
	get: (id: string) => R | undefined
): TLSyncRefusal | null {
	const changes: TLRecordChange<R>[] = []
	for (const next of Object.values<R>(diff.added)) {
		changes.push({ type: 'create', prev: null, next })
	}
	for (const [prev, next] of Object.values<[R, R]>(diff.updated)) {
		if (!isEqual(prev, next)) changes.push({ type: 'update', prev, next })
	}
	for (const prev of Object.values<R>(diff.removed)) {
		changes.push({ type: 'delete', prev, next: null })
	}
	if (changes.length === 0) return null

	const before = (id: string): R | undefined => {
		if (id in diff.added) return undefined
		if (id in diff.updated) return (diff.updated as any)[id][0]
		if (id in diff.removed) return (diff.removed as any)[id]
		return get(id)
	}
	try {
		return rule({ session, changes, before, after: get })
	} catch {
		// the room refuses when its rule throws, so the client must too
		return { reason: 'something went wrong' }
	}
}

/** The part of `diff` touching `ids`, or everything else when `keep` is false. */
export function pickRecordsDiff<R extends UnknownRecord>(
	diff: RecordsDiff<R>,
	ids: ReadonlySet<string>,
	keep: boolean
): RecordsDiff<R> {
	const pick = <T>(entries: Record<string, T>) => {
		const out: Record<string, T> = {}
		for (const id in entries) if (ids.has(id) === keep) out[id] = entries[id]
		return out as any
	}
	return { added: pick(diff.added), updated: pick(diff.updated), removed: pick(diff.removed) }
}
