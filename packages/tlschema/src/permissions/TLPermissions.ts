import { RecordsDiff, UnknownRecord } from '@tldraw/store'
import { JsonValue, hasOwnProperty } from '@tldraw/utils'

/**
 * What one session may do. The server sets it at connect and may change it at any time. The
 * client gets a copy, so the UI and the server read the same value.
 *
 * Abilities are plain names. The SDK rules use `edit` (change the canvas) and `comment` (write
 * comments). Hosts add their own, for example `shapes:edit-any` or `lesson:lock`.
 *
 * @public
 */
export interface TLAccess {
	/** The trusted user id, or null for an anonymous session. */
	readonly userId: string | null
	readonly abilities: readonly string[]
}

/**
 * A named operation. The client puts it on a transaction (see `editor.run(fn, { intent })`). It
 * travels with the push. On the server it is untrusted: a rule may use it to pick a check or to
 * narrow, never to widen. If the server has a mutator with this name, the server runs the mutator
 * and ignores the client's diff.
 *
 * @public
 */
export interface TLIntent {
	readonly name: string
	readonly args?: JsonValue
}

/** @public */
export interface TLRecordReader<R extends UnknownRecord> {
	get(id: string): R | undefined
	/** All records. A full scan: use it for invariants over few records, not on every drag. */
	all(): Iterable<R>
}

/**
 * One record in a transaction. `prev` is null on create, `next` is null on delete.
 *
 * @public
 */
export type TLRecordChange<R extends UnknownRecord> =
	| { readonly op: 'create'; readonly id: string; readonly prev: null; readonly next: R }
	| { readonly op: 'update'; readonly id: string; readonly prev: R; readonly next: R }
	| { readonly op: 'delete'; readonly id: string; readonly prev: R; readonly next: null }

/**
 * A whole transaction, as a rule sees it. The same object shape is built on the client (before
 * the editor commits) and on the server (before the room commits a push).
 *
 * @public
 */
export interface TLTransaction<R extends UnknownRecord> {
	readonly access: TLAccess
	can(ability: string): boolean
	readonly intent: TLIntent | null
	/** Every record that changes, net over the transaction. */
	readonly changes: readonly TLRecordChange<R>[]
	/** The room before the transaction. */
	readonly before: TLRecordReader<R>
	/** The room after the transaction. */
	readonly after: TLRecordReader<R>
}

/**
 * A rule. Return a reason string to deny the whole transaction. Return nothing to pass. Every
 * rule must pass, so rules only narrow.
 *
 * @public
 */
export type TLRule<R extends UnknownRecord> = (tx: TLTransaction<R>) => string | undefined | void

/** @public */
export interface TLReadContext<R extends UnknownRecord> {
	readonly access: TLAccess
	can(ability: string): boolean
	readonly records: TLRecordReader<R>
}

/**
 * The write surface a mutator gets. On the client it writes to the editor's store. On the server
 * it writes to the room's storage, inside the push transaction.
 *
 * @public
 */
export interface TLMutatorContext<R extends UnknownRecord> extends TLRecordReader<R> {
	readonly access: TLAccess
	can(ability: string): boolean
	put(records: R[]): void
	remove(ids: string[]): void
}

/**
 * A named operation that runs on the client (as a prediction) and again on the server (as the
 * truth). The server ignores the client's diff for this push and keeps what its own run wrote.
 * Throw to refuse. The rules still check the result.
 *
 * @public
 */
export type TLMutator<R extends UnknownRecord, Args extends JsonValue = any> = (
	ctx: TLMutatorContext<R>,
	args: Args
) => void

/** @public */
export interface TLPermissionsConfig<R extends UnknownRecord> {
	/** Checked on every transaction. All must pass. */
	rules?: readonly TLRule<R>[]
	/**
	 * Which records a session may see. The server sends a session only what this allows, and
	 * denies writes that touch a record the session cannot see, before or after. Leave it out
	 * to show everything.
	 */
	canRead?(record: R, ctx: TLReadContext<R>): boolean
	/** Named operations that the server runs itself. See {@link TLMutator}. */
	mutators?: Record<string, TLMutator<R>>
}

/** @public */
export type TLVerdict = { readonly ok: true } | { readonly ok: false; readonly reason: string }

/** @public */
export interface TLPermissions<R extends UnknownRecord> {
	readonly rules: readonly TLRule<R>[]
	readonly canRead?: TLPermissionsConfig<R>['canRead']
	readonly mutators: Record<string, TLMutator<R>>
	/** Run every rule on a transaction. The first denial wins. */
	check(tx: TLTransaction<R>): TLVerdict
}

const OK: TLVerdict = { ok: true }

/**
 * Define the permissions for a room. Pass the same object to the server (`TLSocketRoom`) and to
 * the client (`<Tldraw permissions>` or `useSync`), so both make the same decision.
 *
 * @example
 * ```ts
 * const permissions = definePermissions<TLRecord>({
 * 	rules: [
 * 		requireAbility('edit', { except: ['comment', 'comment-thread', 'comment-reaction'] }),
 * 		ownShapesOnly({ unless: 'shapes:edit-any' }),
 * 	],
 * })
 * ```
 *
 * @public
 */
export function definePermissions<R extends UnknownRecord>(
	config: TLPermissionsConfig<R>
): TLPermissions<R> {
	const rules = config.rules ?? []
	return {
		rules,
		canRead: config.canRead,
		mutators: config.mutators ?? {},
		check(tx) {
			// You cannot write what you cannot see, before or after: no blind writes to hidden
			// records, and no moving a record somewhere you cannot see it.
			const canRead = config.canRead
			if (canRead) {
				const before = { access: tx.access, can: tx.can, records: tx.before }
				const after = { access: tx.access, can: tx.can, records: tx.after }
				for (const change of tx.changes) {
					if (
						(change.prev && !canRead(change.prev, before)) ||
						(change.next && !canRead(change.next, after))
					) {
						return { ok: false, reason: 'You cannot change records you cannot see.' }
					}
				}
			}
			for (const rule of rules) {
				const reason = rule(tx)
				if (typeof reason === 'string') return { ok: false, reason }
			}
			return OK
		},
	}
}

/** @public */
export function accessCan(access: TLAccess, ability: string) {
	return access.abilities.includes(ability)
}

/**
 * Build a {@link TLTransaction} from the state after a change and the change itself. The client
 * and the server both use this, so a rule sees the same thing on both sides.
 *
 * @public
 */
export function createTransaction<R extends UnknownRecord>(opts: {
	access: TLAccess
	intent: TLIntent | null
	diff: RecordsDiff<R>
	after: TLRecordReader<R>
}): TLTransaction<R> {
	const { access, intent, diff, after } = opts
	const changes: TLRecordChange<R>[] = []
	const prevById = new Map<string, R | null>()
	for (const [id, next] of Object.entries(diff.added) as [string, R][]) {
		// a record that was removed and then added again in one transaction is an update
		if (hasOwnProperty(diff.removed, id)) continue
		changes.push({ op: 'create', id, prev: null, next })
		prevById.set(id, null)
	}
	for (const [id, [prev, next]] of Object.entries(diff.updated) as [string, [R, R]][]) {
		changes.push({ op: 'update', id, prev, next })
		prevById.set(id, prev)
	}
	for (const [id, prev] of Object.entries(diff.removed) as [string, R][]) {
		if (hasOwnProperty(diff.added, id)) {
			changes.push({ op: 'update', id, prev, next: (diff.added as any)[id] })
		} else {
			changes.push({ op: 'delete', id, prev, next: null })
		}
		prevById.set(id, prev)
	}
	const before: TLRecordReader<R> = {
		get(id) {
			if (prevById.has(id)) return prevById.get(id) ?? undefined
			return after.get(id)
		},
		*all() {
			for (const record of after.all()) {
				if (!prevById.has(record.id)) yield record
			}
			for (const prev of prevById.values()) if (prev) yield prev
		},
	}
	return {
		access,
		can: (ability) => accessCan(access, ability),
		intent,
		changes,
		before,
		after,
	}
}

/** Full access, used when no access is set: everything is allowed, as before permissions. @public */
export const TL_FULL_ACCESS: TLAccess = { userId: null, abilities: ['edit', 'comment'] }
