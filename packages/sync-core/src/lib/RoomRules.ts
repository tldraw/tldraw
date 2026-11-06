import { TLRuleRecord, TLRules, TLRuleUser, TLRulesDefinition, compileRules } from '@tldraw/rules'
import { UnknownRecord } from '@tldraw/store'
import { isEqual, objectMapEntriesIterable } from '@tldraw/utils'
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

type Get = (id: string) => UnknownRecord | undefined

function compilePresenceRules(definition: TLRulesDefinition) {
	return compileRules({ ...definition, default: { ...definition.default, write: 'true' } })
}

/**
 * What one filtered session holds, and what its read rules looked at to decide it.
 *
 * `reads` and `readers` are a dependency index. A read rule is a pure function of the user, the
 * record, and the records it reads with `get`, `parent`, `page`, or `ancestors`. So when a record
 * changes, the only records whose visibility can change are the record itself and the records
 * whose last evaluation read it. A page's `meta.team` change rechecks that page's shapes, not the
 * whole room. Reads of ids that do not exist are recorded too, so a record that appears later
 * rechecks the rules that looked for it.
 *
 * @internal
 */
export class SessionView {
	/** Ids of the records this session's client holds. */
	readonly ids = new Set<string>()
	/** Ids of the records it holds with at least one field hidden. */
	readonly masked = new Set<string>()
	/** record id → ids its last read evaluation read */
	readonly reads = new Map<string, Set<string>>()
	/** id → records whose last read evaluation read it */
	readonly readers = new Map<string, Set<string>>()

	constructor(public user: TLRuleUser) {}

	setReads(id: string, read: Set<string>) {
		for (const other of this.reads.get(id) ?? []) this.readers.get(other)?.delete(id)
		if (!read.size) {
			this.reads.delete(id)
			return
		}
		this.reads.set(id, read)
		for (const other of read) {
			let set = this.readers.get(other)
			if (!set) this.readers.set(other, (set = new Set()))
			set.add(id)
		}
	}

	forget(id: string) {
		this.setReads(id, new Set())
		this.masked.delete(id)
	}

	clearIndex() {
		this.reads.clear()
		this.readers.clear()
		this.masked.clear()
	}
}

/**
 * The room side of `@tldraw/rules`: write checks inside a push, and per-session read filtering.
 * A broadcast becomes, per filtered session, puts for records it may now see (with hidden fields
 * replaced), removes for records it may no longer see, and nothing for records it never saw.
 *
 * @internal
 */
export class RoomRules<R extends UnknownRecord> {
	rules: TLRules
	/**
	 * The same rules for presence writes, where an op with no rule of its own is allowed:
	 * `default.write` is about the document, and a viewer still has a cursor.
	 */
	presenceRules: TLRules

	constructor(
		definition: TLRulesDefinition,
		private readonly typeNames: () => string[]
	) {
		this.rules = compileRules(definition)
		this.presenceRules = compilePresenceRules(definition)
	}

	setDefinition(definition: TLRulesDefinition) {
		this.rules = compileRules(definition)
		this.presenceRules = compilePresenceRules(definition)
	}

	getDefinition() {
		return this.rules.definition
	}

	/**
	 * Whether this user's read rules can deny or hide anything. Most sessions read everything, and
	 * the analyzer proves it from the user facts alone, so the room skips all per-record work for
	 * them.
	 */
	needsReadFilter(user: TLRuleUser): boolean {
		return this.typeNames().some(
			(t) => this.rules.decide('read', t, user) !== 'allow' || this.rules.mayHideFields(t, user)
		)
	}

	hasFields(typeName: string) {
		return this.rules.hasFieldRules(typeName)
	}

	/**
	 * The record as this session may see it, or null when it may not see it. Records what the
	 * rules read, for the dependency index.
	 */
	show(view: SessionView, record: R, get: Get): R | null {
		const read = new Set<string>()
		const tracked = (id: string) => {
			read.add(id)
			return get(id)
		}
		const rec = record as unknown as TLRuleRecord
		const shown = this.rules.canRead(rec, view.user, tracked)
			? (this.rules.redact(rec, view.user, tracked) as unknown as R)
			: null
		read.delete(record.id)
		view.setReads(record.id, read)
		if (shown && shown !== record) view.masked.add(record.id)
		else view.masked.delete(record.id)
		return shown
	}

	private redact(view: SessionView, record: R, get: Get): R {
		return this.rules.redact(record as unknown as TLRuleRecord, view.user, get) as unknown as R
	}

	/**
	 * How far the visibility effects of a diff reach, from the read rules' dependencies alone.
	 * `unchanged` holds updated records whose own visibility cannot have changed (a drag changes
	 * `x` and `y`, which no read rule reads), so no session needs their read rule run again.
	 * `reach` holds records whose change may change what other records' rules decide, so their
	 * readers in each session's index are rechecked.
	 */
	impact(diff: TLSyncForwardDiff<R>): { unchanged: Set<string>; reach: Set<string> } {
		const unchanged = new Set<string>()
		const reach = new Set<string>(diff.deletes)
		for (const [id, put] of objectMapEntriesIterable(diff.puts)) {
			if (!Array.isArray(put)) {
				reach.add(id)
				continue
			}
			const r = this.rules.changeAffectsVisibility({
				typeName: put[1].typeName,
				prev: put[0],
				next: put[1],
			})
			if (r === 'all') reach.add(id)
			if (r === 'none') unchanged.add(id)
		}
		return { unchanged, reach }
	}

	/**
	 * Narrow a broadcast diff to what one session may see, and update what it holds.
	 *
	 * With `opts.isSource`, the session made this push. It already holds what it pushed, so only
	 * records that it may no longer see, records whose fields it may not read, and records that
	 * appeared or disappeared for it as a side effect go back to it.
	 */
	filterDiff(
		view: SessionView,
		diff: TLSyncForwardDiff<R>,
		get: Get,
		opts: { isSource: boolean; unchanged: Set<string>; reach: Set<string> }
	): TLSyncForwardDiff<R> | null {
		const out: TLSyncForwardDiff<R> = { puts: {}, deletes: [] }
		const handled = new Set<string>()
		// Readers of what changed, collected first: a record that changed only `x` in the same push
		// as the frame it reads must still be checked again, not passed through as unchanged.
		const recheck = new Set<string>()
		for (const id of [...Object.keys(diff.puts), ...diff.deletes]) {
			if (!opts.reach.has(id)) continue
			for (const reader of view.readers.get(id) ?? []) recheck.add(reader)
		}

		for (const [id, put] of objectMapEntriesIterable(diff.puts)) {
			handled.add(id)
			const before = Array.isArray(put) ? put[0] : null
			const after = Array.isArray(put) ? put[1] : put
			const had = opts.isSource || view.ids.has(id)
			const unchanged = opts.unchanged.has(id) && !recheck.has(id)
			// whether hidden fields can be involved, so a patch must be cut to what the session sees
			const fields = unchanged ? view.masked.has(id) : this.hasFields(after.typeName)
			let shown: R | null
			if (unchanged) {
				// nothing the read rules read changed: visibility and which fields hide are as before
				shown = !had ? null : view.masked.has(id) ? this.redact(view, after, get) : after
			} else {
				shown = this.show(view, after, get)
			}
			if (!shown) {
				if (had) {
					view.ids.delete(id)
					out.deletes.push(id)
				}
				continue
			}
			view.ids.add(id)
			if (opts.isSource) {
				// the pusher holds what it wrote; correct it only where it may not read a field
				if (shown !== after) out.puts[id] = shown
				continue
			}
			if (!had) {
				// a client that never had the record needs all of it, not a patch
				out.puts[id] = shown
			} else if (!fields) {
				out.puts[id] = put
			} else if (before && unchanged) {
				// Which fields hide is as before, so the client holds `before` as redacted now, and a
				// change to a hidden field is no change at all for this session.
				const shownBefore = this.redact(view, before, get)
				if (!isEqual(shownBefore, shown)) out.puts[id] = [shownBefore, shown]
			} else {
				// which fields hide may have changed, so what the client holds is not known: send all
				out.puts[id] = shown
			}
		}

		for (const id of diff.deletes) {
			handled.add(id)
			view.forget(id)
			if (view.ids.delete(id) && !opts.isSource) out.deletes.push(id)
		}

		for (const id of recheck) {
			if (handled.has(id)) continue
			const record = get(id) as R | undefined
			if (!record) continue
			const had = view.ids.has(id)
			const shown = this.show(view, record, get)
			if (shown && (!had || this.hasFields(record.typeName))) {
				// with hidden fields, what the client holds may differ from what it may now see
				view.ids.add(id)
				out.puts[id] = shown
			} else if (!shown && had) {
				view.ids.delete(id)
				out.deletes.push(id)
			}
		}

		return out.deletes.length || Object.keys(out.puts).length ? out : null
	}

	/**
	 * Re-evaluate every record for a session, after its user facts or the rules changed: what it
	 * should gain, what it should lose, and the records whose hidden fields may now differ.
	 */
	recompute(view: SessionView, get: Get, records: Iterable<R>): TLSyncForwardDiff<R> {
		const out: TLSyncForwardDiff<R> = { puts: {}, deletes: [] }
		const seen = new Set<string>()
		view.clearIndex()
		for (const record of records) {
			seen.add(record.id)
			const shown = this.show(view, record, get)
			const had = view.ids.has(record.id)
			if (shown && (!had || this.hasFields(record.typeName))) {
				view.ids.add(record.id)
				out.puts[record.id] = shown
			} else if (!shown && had) {
				view.ids.delete(record.id)
				out.deletes.push(record.id)
			}
		}
		for (const id of [...view.ids]) {
			if (!seen.has(id)) {
				view.ids.delete(id)
				out.deletes.push(id)
			}
		}
		return out
	}
}
