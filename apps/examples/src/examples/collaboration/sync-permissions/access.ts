import {
	TLBeforeReadHooks,
	TLBeforeWriteHook,
	TLBeforeWriteHooks,
	TLCanReadChecks,
	TLCanWriteChecks,
	TLSocketRoomOptions,
	canRead,
	canWrite,
	canWriteOnClient,
	composeBeforeRead,
	composeBeforeWrite,
} from '@tldraw/sync'
import {
	TLCanWriteArgs,
	TLRecord,
	TLRecordWrite,
	TLShape,
	TLStore,
	UnknownRecord,
	atom,
	isEqual,
} from 'tldraw'

// The app's access layer. The SDK gives primitives (`canWrite`, `canWriteOnClient`, `canRead`,
// `beforeWrite`, `beforeRead`, session options); the policy lives here, in app code. Each write
// rule is one plain function, and `writeChecks` turns the rules into one set of checks for both
// sides: on the server, where they are the real check, and in each client, where they stop a
// write before it is sent and hide what the person cannot do.

/** What the server knows about a session, from the app's auth at connect time. */
export interface Meta {
	userId: string
	role: string
	team?: string
	section?: string
	clearance?: number
	agent?: { frameId: string; shapeTypes: string[] }
}

type WriteArgs<R extends UnknownRecord> = Parameters<TLBeforeWriteHook<R, Meta>>[0]
export type Session = WriteArgs<TLRecord>['session']
export type Get = (id: string) => UnknownRecord | undefined

/** A write rule: `true` to allow, or the reason for the denial. */
export type Rule<R extends UnknownRecord> = (args: WriteArgs<R>) => true | string

export type Rules = {
	[K in TLRecord['typeName']]?: Rule<Extract<TLRecord, { typeName: K }>>
}

export interface Policy {
	/** Who may write what. Runs on the server (canWrite) and in each client (the editor's canWrite option). */
	write?: Rules
	/** Server-only changes to the written record, such as stamping an owner. Run before `write`. */
	stamp?: TLBeforeWriteHooks<TLRecord, Meta>[]
	/** Server-only hooks that run after `write`, on allowed writes only, such as an audit log. */
	after?: TLBeforeWriteHooks<TLRecord, Meta>[]
	/** Who may see what (canRead). */
	read?: TLCanReadChecks<TLRecord, Meta>
	/** Changed copies, such as a masked field (beforeRead). Run after `read`. */
	mask?: TLBeforeReadHooks<TLRecord, Meta>
	writeRejection?: 'record' | 'push'
	objectTypes?: string[]
}

// The write log. Not an SDK feature: the server tells a client only that a write was rejected,
// not why, so the app keeps its own record of reasons.
export interface LogEntry {
	id: number
	key: string
	side: 'client' | 'server'
	allowed: boolean
	userId: string
	op: string
	recordId: string
	reason: string
	count: number
}

export const writeLog = atom<LogEntry[]>('write log', [])

/** When false, clients send every write, so the server's rejection and the revert are visible. */
export const clientChecksOn = atom('client checks', true)

let nextLogId = 1

export function log(entry: Omit<LogEntry, 'id' | 'key' | 'count'>) {
	const key = Object.values(entry).join('|')
	// When the editor blocks a write, it rolls back the whole operation, and every signal changed in
	// it, this log included. So write the log after the operation.
	queueMicrotask(() =>
		writeLog.update((list) => {
			// A drag sends one write per frame: count repeats instead of flooding the log.
			if (list[0]?.key === key) return [{ ...list[0], count: list[0].count + 1 }, ...list.slice(1)]
			return [{ ...entry, id: nextLogId++, key, count: 1 }, ...list].slice(0, 40)
		})
	)
}

function logDenial(side: LogEntry['side'], args: WriteArgs<TLRecord>, reason: string) {
	log({
		side,
		allowed: false,
		userId: args.session.meta.userId,
		op: args.type,
		recordId: (args.next ?? args.prev).id,
		reason,
	})
}

function evaluate(rule: Rule<any>, args: WriteArgs<any>): true | string {
	try {
		return rule(args)
	} catch (e) {
		return `the rule threw: ${(e as Error).message}`
	}
}

/**
 * The policy's write rules as `canWrite` checks. The server and the client use this one function,
 * so they run the same rules. `onDenied` gets the rule's reason, for the log.
 */
function writeChecks(
	policy: Policy,
	onDenied?: (args: WriteArgs<TLRecord>, reason: string) => void
): TLCanWriteChecks<TLRecord, Meta> {
	const checks: Record<string, (args: WriteArgs<any>) => boolean> = {}
	for (const [typeName, rule] of Object.entries(policy.write ?? {})) {
		checks[typeName] = (args) => {
			const result = evaluate(rule as Rule<any>, args)
			if (result !== true) onDenied?.(args, result)
			return result === true
		}
	}
	return checks as TLCanWriteChecks<TLRecord, Meta>
}

/** The room options for a policy, built from the public primitives only. */
export function serverOptions(policy: Policy): Partial<TLSocketRoomOptions<TLRecord, Meta>> {
	return {
		beforeWrite: composeBeforeWrite(
			...(policy.stamp ?? []),
			canWrite(writeChecks(policy, (args, reason) => logDenial('server', args, reason))),
			...(policy.after ?? [])
		),
		beforeRead: composeBeforeRead(canRead(policy.read ?? {}), policy.mask ?? {}),
		writeRejection: policy.writeRejection,
		objectTypes: policy.objectTypes,
	}
}

/**
 * The same write rules, for a client: the editor's `canWrite` option. The editor asks before it
 * stores a local write, with the real new values, and rolls back the whole operation when a rule
 * says no. The UI asks the same question, so a tool or action that the rules refuse is hidden or
 * disabled.
 */
export function clientCanWrite(policy: Policy, getSession: () => Session) {
	const check = canWriteOnClient(writeChecks(policy), getSession)
	return (args: TLCanWriteArgs) => {
		const record = args.next ?? args.prev
		// With this option the editor no longer blocks writes in readonly mode by itself. The server
		// ignores a readonly session's document writes, so block them here too.
		if (getSession().isReadonly && !policy.objectTypes?.includes(record.typeName)) return false
		if (!clientChecksOn.get()) return true
		return check(args)
	}
}

/**
 * Log why the client refused a write. The editor's `canWrite` option also answers questions from
 * the UI, which are not writes, so the log runs the same checks from store side effects, which see
 * only writes. Register it before the editor is made, so it runs before the editor blocks the
 * write. It never blocks a write itself.
 */
export function installClientLog(store: TLStore, policy: Policy, getSession: () => Session) {
	const check = canWriteOnClient(
		writeChecks(policy, (args, reason) => logDenial('client', args, reason)),
		getSession
	)
	const get = (id: string) => store.get(id as TLRecord['id'])
	const logged = (write: TLRecordWrite) => {
		if (clientChecksOn.get()) check({ ...write, get } as TLCanWriteArgs)
	}
	const cleanups = Object.keys(policy.write ?? {}).map((typeName) =>
		store.sideEffects.register({
			[typeName]: {
				beforeCreate: (next: TLRecord, source: 'user' | 'remote') => {
					if (source === 'user') logged({ type: 'create', prev: null, next })
					return next
				},
				beforeChange: (prev: TLRecord, next: TLRecord, source: 'user' | 'remote') => {
					if (source === 'user' && !isEqual(prev, next)) logged({ type: 'update', prev, next })
					return next
				},
				beforeDelete: (prev: TLRecord, source: 'user' | 'remote') => {
					if (source === 'user') logged({ type: 'delete', prev, next: null })
				},
			},
		})
	)
	return () => cleanups.forEach((fn) => fn())
}

// Helpers for rules that depend on a record's parents.

export function isShape(record: UnknownRecord | undefined): record is TLShape {
	return record?.typeName === 'shape'
}

/** The shape's parents, nearest first. */
export function ancestors(get: Get, shape: TLShape): TLShape[] {
	const result: TLShape[] = []
	let parent = get(shape.parentId)
	while (isShape(parent)) {
		result.push(parent)
		parent = get(parent.parentId)
	}
	return result
}

export function pageOf(get: Get, shape: TLShape): string {
	const top = ancestors(get, shape).pop() ?? shape
	return top.parentId
}

/** The nearest value of `meta[key]` on the shape or one of its parents. */
export function inherited(get: Get, shape: TLShape, key: string): unknown {
	for (const s of [shape, ...ancestors(get, shape)]) {
		if (s.meta[key] !== undefined) return s.meta[key]
	}
	return undefined
}

/** Run a rule against both sides of a write: the record as stored and as it would be. */
export function bothSides<R extends UnknownRecord>(
	args: WriteArgs<R>,
	rule: (record: R) => true | string
): true | string {
	for (const record of [args.prev, args.next]) {
		if (!record) continue
		const result = rule(record)
		if (result !== true) return result
	}
	return true
}
