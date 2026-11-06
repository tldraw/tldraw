import {
	TLBeforeReadHooks,
	TLBeforeWriteHook,
	TLBeforeWriteHooks,
	TLCanReadChecks,
	TLCanWriteChecks,
	TLSocketRoomOptions,
	canRead,
	canWrite,
	composeBeforeRead,
	composeBeforeWrite,
} from '@tldraw/sync'
import { Editor, TLRecord, TLShape, UnknownRecord, atom } from 'tldraw'

// The app's access layer. The SDK gives primitives (`canWrite`, `canRead`, `beforeWrite`,
// `beforeRead`, session options); the policy lives here, in app code. One set of write rules runs
// in two places: on the server, where it is the real check, and in each client, where it stops a
// write before it is sent, so the user is not shown an edit that the server then takes back.

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
	/** Who may write what. Runs on the server (canWrite) and in each client (store side effects). */
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
	// Server hooks run inside the room's storage transaction. When `writeRejection: 'push'` rejects
	// a push, that transaction rolls back every signal changed in it, this log included. So write
	// the log after the transaction.
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

/** The room options for a policy, built from the public primitives only. */
export function serverOptions(policy: Policy): Partial<TLSocketRoomOptions<TLRecord, Meta>> {
	const checks: Record<string, (args: WriteArgs<any>) => boolean> = {}
	for (const [typeName, rule] of Object.entries(policy.write ?? {})) {
		checks[typeName] = (args) => {
			const result = evaluate(rule as Rule<any>, args)
			if (result !== true) logDenial('server', args, result)
			return result === true
		}
	}
	return {
		beforeWrite: composeBeforeWrite(
			...(policy.stamp ?? []),
			canWrite(checks as TLCanWriteChecks<TLRecord, Meta>),
			...(policy.after ?? [])
		),
		beforeRead: composeBeforeRead(canRead(policy.read ?? {}), policy.mask ?? {}),
		writeRejection: policy.writeRejection,
		objectTypes: policy.objectTypes,
	}
}

/**
 * Run the same write rules in a client, before a write reaches the server. The store ignores
 * these vetoes for remote changes, so the client never blocks what the server already accepted.
 */
export function installClientGate(editor: Editor, rules: Rules, getSession: () => Session) {
	const get = (id: string) => editor.store.get(id as TLRecord['id'])
	const check = (args: Omit<WriteArgs<TLRecord>, 'session' | 'get'>) => {
		if (!clientChecksOn.get()) return true
		const session = getSession()
		const full = { ...args, session, get } as WriteArgs<TLRecord>
		const result = evaluate(rules[args.next?.typeName ?? args.prev!.typeName] as Rule<any>, full)
		if (result === true) return true
		logDenial('client', full, result)
		return false
	}
	const cleanups = Object.keys(rules).map((typeName) =>
		editor.sideEffects.register({
			[typeName]: {
				beforeCreate: (next: TLRecord, source: 'user' | 'remote') =>
					source !== 'user' || check({ type: 'create', prev: null, next }) ? next : false,
				beforeChange: (prev: TLRecord, next: TLRecord, source: 'user' | 'remote') =>
					source !== 'user' || check({ type: 'update', prev, next }) ? next : prev,
				beforeDelete: (prev: TLRecord, source: 'user' | 'remote') =>
					source !== 'user' || check({ type: 'delete', prev, next: null }) ? undefined : false,
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
