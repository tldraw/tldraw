import { RecordsDiff, UnknownRecord } from '@tldraw/store'
import { isEqual } from '@tldraw/utils'
import type { TLSyncRefusal } from './protocol'
import type {
	TLRecordChange,
	TLSyncAuthorizer,
	TLSyncAuthorizerSession,
	TLSyncTransform,
} from './TLSyncRoom'

/**
 * Runs the room's `authorize` rule on the client, so a write the room would refuse is undone
 * locally instead of sent. The client judges exactly what its next push will carry, against the
 * world that push lands on: the unit the room judges.
 *
 * The local session has the room's `access` and the `meta` given here, but no `sessionId`.
 *
 * @public
 */
export interface TLSyncClientAuthorizeOptions<R extends UnknownRecord, SessionMeta = any> {
	/** The room's `authorize` rule. */
	rule: TLSyncAuthorizer<R, SessionMeta>
	/** The room's `transform`, if it has one; otherwise rules reading stamped fields disagree. */
	transform?: TLSyncTransform<R, SessionMeta>
	/** The `meta` the room holds for this session, e.g. the signed-in user. */
	meta: SessionMeta
	/**
	 * What a refusal undoes: the whole store transaction that caused it (`'transaction'`, the
	 * default), or only the records the rule names (`'record'`), keeping the rest of it.
	 */
	undo?: 'transaction' | 'record'
	/** Called after a write was refused and undone locally, before anything was sent. */
	onRefusedLocally?(refusal: TLSyncRefusal): void
}

/**
 * Judges `diff` the way the room judges a push carrying it. `get` reads the world after the diff;
 * the world before it is `get` with the diff undone.
 */
export function authorizeRecordsDiff<R extends UnknownRecord, SessionMeta>(
	opts: Pick<TLSyncClientAuthorizeOptions<R, SessionMeta>, 'rule' | 'transform'>,
	session: TLSyncAuthorizerSession<SessionMeta>,
	diff: RecordsDiff<R>,
	get: (id: string) => R | undefined
): TLSyncRefusal | null {
	const before = (id: string): R | undefined => {
		if (id in diff.added) return undefined
		if (id in diff.updated) return (diff.updated as any)[id][0]
		if (id in diff.removed) return (diff.removed as any)[id]
		return get(id)
	}
	const stamped = new Map<string, R>()
	const after = (id: string) => stamped.get(id) ?? get(id)
	const changes: TLRecordChange<R>[] = []
	try {
		for (const record of Object.values<R>(diff.added)) {
			const next = opts.transform?.({ session, record, prev: null, before, after }) ?? record
			stamped.set(next.id, next)
			changes.push({ type: 'create', prev: null, next })
		}
		for (const [prev, next] of Object.values<[R, R]>(diff.updated)) {
			if (!isEqual(prev, next)) changes.push({ type: 'update', prev, next })
		}
		for (const prev of Object.values<R>(diff.removed)) {
			changes.push({ type: 'delete', prev, next: null })
		}
		if (changes.length === 0) return null
		return opts.rule({ session, changes, before, after })
	} catch {
		// the room refuses when its rule or transform throws, so the client must too
		return { reason: 'something went wrong' }
	}
}

/** Splits `diff` into the records in `ids` and the rest. */
export function partitionRecordsDiff<R extends UnknownRecord>(
	diff: RecordsDiff<R>,
	ids: ReadonlySet<string>
): [RecordsDiff<R>, RecordsDiff<R>] {
	const picked = { added: {}, updated: {}, removed: {} } as any
	const rest = { added: {}, updated: {}, removed: {} } as any
	for (const key of ['added', 'updated', 'removed'] as const) {
		for (const id in diff[key])
			((ids.has(id) ? picked : rest)[key] as any)[id] = (diff[key] as any)[id]
	}
	return [picked, rest]
}
