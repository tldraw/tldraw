import { TLRuleRecord, TLRules, TLRuleUser, TLRulesDefinition, compileRules } from '@tldraw/rules'
import { UnknownRecord } from '@tldraw/store'
import { objectMapEntriesIterable } from '@tldraw/utils'
import type { TLSyncForwardDiff } from './TLSyncStorage'

/**
 * What the room tells a client about access: the rule set and the user facts the rules read. The
 * client compiles the same definition, so it answers "may I?" exactly as the server will.
 *
 * @public
 */
export interface TLRoomAccess {
	rules: TLRulesDefinition
	user: TLRuleUser
}

/** Thrown inside a push transaction to roll back the whole push when `pushes` is `'atomic'`. */
export class RulesDeniedPush extends Error {}

/**
 * The room side of `@tldraw/rules`: write checks inside a push, and per-session read filtering.
 * Read filtering keeps, for each session, the set of record ids that session holds. A broadcast
 * becomes, per session, puts for records it may now see, removes for records it may no longer
 * see, and nothing for records it never saw.
 *
 * @internal
 */
export class RoomRules<R extends UnknownRecord> {
	rules: TLRules

	constructor(
		definition: TLRulesDefinition,
		private readonly typeNames: () => string[]
	) {
		this.rules = compileRules(definition)
	}

	setDefinition(definition: TLRulesDefinition) {
		this.rules = compileRules(definition)
	}

	getDefinition() {
		return this.rules.definition
	}

	/**
	 * Whether this user's read rules can deny anything. Most sessions read everything, and the
	 * analyzer proves it from the user facts alone, so the room skips all per-record work for them.
	 */
	needsReadFilter(user: TLRuleUser): boolean {
		return this.typeNames().some((t) => this.rules.decide('read', t, user) !== 'allow')
	}

	canRead(record: R, user: TLRuleUser, get: (id: string) => UnknownRecord | undefined) {
		return this.rules.canRead(record as unknown as TLRuleRecord, user, get)
	}

	/**
	 * How far the visibility effects of a diff reach, from the read rules' dependencies alone.
	 * `unchanged` holds updated records whose own visibility cannot have changed (a drag changes
	 * `x` and `y`, which no read rule reads), so no session needs their read rule run again.
	 */
	impact(diff: TLSyncForwardDiff<R>): { all: boolean; unchanged: Set<string> } {
		const unchanged = new Set<string>()
		let all = false
		for (const [id, put] of objectMapEntriesIterable(diff.puts)) {
			const change = Array.isArray(put)
				? { typeName: put[1].typeName, prev: put[0], next: put[1] }
				: { typeName: put.typeName, created: true as const }
			const r = this.rules.changeAffectsVisibility(change)
			if (r === 'all') all = true
			if (r === 'none') unchanged.add(id)
		}
		if (diff.deletes.length) {
			if (this.rules.changeAffectsVisibility({ typeName: '*', deleted: true }) === 'all') all = true
		}
		return { all, unchanged }
	}

	/**
	 * Narrow a broadcast diff to what one session may see, and update the ids it holds.
	 *
	 * With `opts.isSource`, the session made this push. It already holds what it pushed, so only
	 * records that it may no longer see (and, on `recomputeAll`, records that appeared or
	 * disappeared for it as a side effect) go back to it.
	 */
	filterDiff(
		visible: Set<string>,
		user: TLRuleUser,
		diff: TLSyncForwardDiff<R>,
		get: (id: string) => UnknownRecord | undefined,
		opts: {
			isSource: boolean
			recomputeAll: boolean
			unchanged: Set<string>
			allRecords(): Iterable<R>
		}
	): TLSyncForwardDiff<R> | null {
		const out: TLSyncForwardDiff<R> = { puts: {}, deletes: [] }
		let changed = false
		const handled = new Set<string>()
		for (const [id, put] of objectMapEntriesIterable(diff.puts)) {
			handled.add(id)
			const after = Array.isArray(put) ? put[1] : put
			const had = opts.isSource || visible.has(id)
			const can = opts.unchanged.has(id) ? had : this.canRead(after, user, get)
			if (can) {
				visible.add(id)
				if (opts.isSource) continue
				// a client that never had the record needs all of it, not a patch
				out.puts[id] = had ? put : after
				changed = true
			} else if (had) {
				visible.delete(id)
				out.deletes.push(id)
				changed = true
			}
		}
		for (const id of diff.deletes) {
			handled.add(id)
			if (visible.delete(id) && !opts.isSource) {
				out.deletes.push(id)
				changed = true
			}
		}
		if (opts.recomputeAll) {
			const delta = this.recompute(visible, user, get, opts.allRecords(), handled)
			Object.assign(out.puts, delta.puts)
			out.deletes.push(...delta.deletes)
			changed ||= delta.deletes.length > 0 || Object.keys(delta.puts).length > 0
		}
		return changed ? out : null
	}

	/** Re-evaluate every record for a session: what it should gain and what it should lose. */
	recompute(
		visible: Set<string>,
		user: TLRuleUser,
		get: (id: string) => UnknownRecord | undefined,
		records: Iterable<R>,
		skip: Set<string> = new Set()
	): TLSyncForwardDiff<R> {
		const out: TLSyncForwardDiff<R> = { puts: {}, deletes: [] }
		const seen = new Set<string>()
		for (const record of records) {
			seen.add(record.id)
			if (skip.has(record.id)) continue
			const can = this.canRead(record, user, get)
			const had = visible.has(record.id)
			if (can && !had) {
				visible.add(record.id)
				out.puts[record.id] = record
			} else if (!can && had) {
				visible.delete(record.id)
				out.deletes.push(record.id)
			}
		}
		for (const id of [...visible]) {
			if (!seen.has(id) && !skip.has(id)) {
				visible.delete(id)
				out.deletes.push(id)
			}
		}
		return out
	}
}
