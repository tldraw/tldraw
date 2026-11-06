import { UnknownRecord } from '@tldraw/store'
import { createRelationId } from '@tldraw/tlschema'
import { TLRoomAccess, TLRoomAccessView } from '../TLRoomAccess'
import {
	RelationEvaluator,
	TLRelationContext,
	TLRelationSource,
	authorizeRelationWrite,
	canReadRelationRecord,
} from './evaluate'
import { TLRelationSchema } from './schema'

/**
 * An index of `relation` records: `object#relation` to subjects. The server keeps one per room, and
 * the client derives one from its store.
 *
 * @public
 */
export class RelationTupleIndex {
	private readonly bySlot = new Map<string, Set<string>>()
	private readonly byId = new Map<string, { slot: string; subject: string }>()

	clear() {
		this.bySlot.clear()
		this.byId.clear()
	}

	put(record: { id: string; object: string; relation: string; subject: string }) {
		this.remove(record.id)
		const slot = `${record.object}#${record.relation}`
		let set = this.bySlot.get(slot)
		if (!set) this.bySlot.set(slot, (set = new Set()))
		set.add(record.subject)
		this.byId.set(record.id, { slot, subject: record.subject })
	}

	remove(id: string) {
		const entry = this.byId.get(id)
		if (!entry) return
		this.byId.delete(id)
		const set = this.bySlot.get(entry.slot)
		set?.delete(entry.subject)
		if (set?.size === 0) this.bySlot.delete(entry.slot)
	}

	/** Objects named by a userset subject in any tuple: `page:p` for `page:p#editor`. */
	usersetObjects(): string[] {
		const out = new Set<string>()
		for (const { subject } of this.byId.values()) {
			const hash = subject.indexOf('#')
			if (hash !== -1) out.add(subject.slice(0, hash))
		}
		return [...out]
	}

	/** Objects that have a tuple whose subject is a userset of `object`, such as `page:p#editor`. */
	objectsWithUsersetOf(object: string): string[] {
		const out = new Set<string>()
		const prefix = object + '#'
		for (const { slot, subject } of this.byId.values()) {
			if (subject.startsWith(prefix)) out.add(slot.slice(0, slot.lastIndexOf('#')))
		}
		return [...out]
	}

	getSubjects(object: string, relation: string): readonly string[] {
		const set = this.bySlot.get(`${object}#${relation}`)
		return set ? [...set] : EMPTY
	}
}
const EMPTY: readonly string[] = []

/** The typeName of stored tuples. */
export const RELATION_TYPE_NAME = 'relation'

/**
 * Read check with one structural rule on top of the schema: a record whose parent is a record the
 * session cannot read is hidden too, so a client never holds an orphan.
 */
export function canReadWithParents(
	schema: TLRelationSchema,
	source: TLRelationSource,
	ctx: TLRelationContext,
	record: { id: string },
	memo: Map<string, boolean>
): boolean {
	const cached = memo.get(record.id)
	if (cached !== undefined) return cached
	memo.set(record.id, false) // a parent loop denies
	let result = canReadRelationRecord(schema, source, ctx, record)
	if (result) {
		const parentId = new RelationEvaluator(schema, source, ctx).parentOf(record.id)
		const parent = parentId !== undefined ? source.getRecord(parentId) : undefined
		if (parent) result = canReadWithParents(schema, source, ctx, parent, memo)
	}
	memo.set(record.id, result)
	return result
}

/**
 * A {@link TLRoomAccess} that evaluates a relation schema. Create one per room.
 *
 * @example
 * ```ts
 * const room = new TLSocketRoom({
 * 	schema,
 * 	access: createRelationRoomAccess(defaultRelationSchema),
 * })
 * const access = await resolveRelationContext({ schema: defaultRelationSchema, store, root: 'file:abc', actor: 'user:ann' })
 * room.handleSocketConnect({ sessionId, socket, access })
 * ```
 *
 * @public
 */
export function createRelationRoomAccess<R extends UnknownRecord>(
	schema: TLRelationSchema
): TLRoomAccess<R, TLRelationContext> {
	const index = new RelationTupleIndex()
	// one memo per view: a view lives for one batch, so the memo can never be stale
	const memos = new WeakMap<object, Map<string, Map<string, boolean>>>()
	// Tuples written earlier in the same push, which the index does not have until commit. Without
	// this, a push that shares a page and then writes on it would be denied. A write is staged when
	// it passes this layer, but the host's authorizer can still veto it, so an entry counts only
	// while the transaction holds (or lacks) its record.
	const pending = new WeakMap<object, { added: RelationTupleIndex; removed: Set<string> }>()
	const sourceFor = (view: TLRoomAccessView<R>): TLRelationSource => ({
		getRecord: (id) => view.get(id),
		getSubjects: (object, relation) => {
			const stored = index.getSubjects(object, relation)
			const p = pending.get(view)
			if (!p) return stored
			const slot = `${object}#${relation}`
			const inTxn = (s: string) => view.get(createRelationId(object, relation, s)) !== undefined
			const out = stored.filter((s) => !p.removed.has(`${slot}@${s}`) || inTxn(s))
			for (const s of p.added.getSubjects(object, relation)) {
				if (!out.includes(s) && inTxn(s)) out.push(s)
			}
			return out
		},
	})
	const stage = (view: object, write: { prev: any; next: any }) => {
		let p = pending.get(view)
		if (!p) pending.set(view, (p = { added: new RelationTupleIndex(), removed: new Set() }))
		if (write.prev?.typeName === RELATION_TYPE_NAME) {
			p.added.remove(write.prev.id)
			p.removed.add(`${write.prev.object}#${write.prev.relation}@${write.prev.subject}`)
		}
		if (write.next?.typeName === RELATION_TYPE_NAME) {
			p.removed.delete(`${write.next.object}#${write.next.relation}@${write.next.subject}`)
			p.added.put(write.next)
		}
	}
	// memoize per view and per context: two sessions in one batch must not share results
	const memoFor = (view: object, ctx: TLRelationContext) => {
		let byCtx = memos.get(view)
		if (!byCtx) memos.set(view, (byCtx = new Map()))
		const key = ctxKey(ctx)
		let memo = byCtx.get(key)
		if (!memo) byCtx.set(key, (memo = new Map()))
		return memo
	}

	return {
		canRead(ctx, record, view) {
			return canReadWithParents(schema, sourceFor(view), ctx, record, memoFor(view, ctx))
		},
		authorizeWrite(ctx, write, view) {
			const source = sourceFor(view)
			if (write.prev && !canReadWithParents(schema, source, ctx, write.prev, new Map())) return null
			// a tuple's id must name the tuple, so the id alone says what a delete changed
			const tuple = write.next?.typeName === RELATION_TYPE_NAME ? (write.next as any) : null
			if (tuple) {
				const parsed = parseRelationId(tuple.id)
				if (
					!parsed ||
					parsed.object !== tuple.object ||
					parsed.relation !== tuple.relation ||
					parsed.subject !== tuple.subject
				) {
					return null
				}
			}
			const result = authorizeRelationWrite<R & { id: string; typeName: string }>(
				schema,
				source,
				ctx,
				write as any
			)
			if (!result.ok) return null
			if (
				write.prev?.typeName === RELATION_TYPE_NAME ||
				write.next?.typeName === RELATION_TYPE_NAME
			) {
				stage(view, { prev: write.prev, next: write.next && result.record })
			}
			return result.record
		},
		readRecheck(changes, view) {
			const evaluator = new RelationEvaluator(schema, sourceFor(view), {
				actor: null,
				subjects: [],
				root: '',
				rootRelations: [],
			})
			// Objects whose relations may have changed. Records at or under them are re-checked.
			const roots = new Set<string>()
			const addWithAncestors = (id: string) => {
				for (const a of [id, ...evaluator.ancestors(id)]) if (view.get(a)) roots.add(a)
			}
			for (const { id, prev, next } of changes) {
				const tuple = parseRelationId(id)
				if (tuple) {
					// a tuple on something that is not a record here (a shape type, an action) can
					// matter to any record
					if (!view.get(tuple.object)) return 'all'
					roots.add(tuple.object)
					continue
				}
				if (prev && next) {
					const moved = changedFieldValues(schema, prev, next)
					if (moved === 'unknown') return 'all'
					if (moved.length) {
						roots.add(id)
						// A `within` caveat reads the path down to its subtree: if the subtree moved, the old
						// and new paths (and their siblings) change visibility too.
						for (const v of moved) addWithAncestors(v)
					}
				}
				// a deleted record's children (if a client left any) follow it
				if (!prev && !next) roots.add(id)
			}
			if (roots.size === 0) return 'none'

			let memo = new Map<string, boolean>()
			const under = (id: string, depth: number): boolean => {
				const cached = memo.get(id)
				if (cached !== undefined) return cached
				memo.set(id, false)
				let result = roots.has(id)
				if (!result && depth < 48) {
					// a binding is under a root if its source or its target is
					const up = evaluator.hasParentRelation(id)
						? [evaluator.parentOf(id)]
						: evaluator.anchorsOf(id)
					result = up.some((u) => u !== undefined && u !== id && under(u, depth + 1))
				}
				memo.set(id, result)
				return result
			}
			// A userset subject such as `page:p#editor` or `shape:s#edit` makes the tuple's object
			// depend on that record, and so on anything above it. Add those objects until none is new.
			for (let changed = true; changed; ) {
				changed = false
				for (const object of index.usersetObjects()) {
					if (!under(object, 0)) continue
					for (const dependent of index.objectsWithUsersetOf(object)) {
						if (roots.has(dependent)) continue
						if (!view.get(dependent)) return 'all'
						roots.add(dependent)
						changed = true
					}
				}
				if (changed) memo = new Map()
			}
			return (record) => under(record.id, 0)
		},
		didChange({ reset, puts, deletes }) {
			if (reset) index.clear()
			for (const id of deletes) index.remove(id)
			for (const r of puts) {
				if (r.typeName === RELATION_TYPE_NAME) index.put(r as any)
			}
		},
		canConnect(ctx, visible, view) {
			// tldraw needs a page to show: one it can read, or one it may create in an empty room
			for (const id of visible) if (id.startsWith('page:')) return true
			return new RelationEvaluator(schema, sourceFor(view), ctx).check('page:', 'create')
		},
		toClient(ctx) {
			return ctx
		},
	}
}

/** The parts of a relation record id (see `createRelationId`), or null for another id. */
function parseRelationId(id: string) {
	if (!id.startsWith(RELATION_TYPE_NAME + ':')) return null
	const rest = id.slice(RELATION_TYPE_NAME.length + 1)
	const hash = rest.indexOf('#')
	const at = rest.indexOf('@', hash)
	if (hash === -1 || at === -1) return null
	return {
		object: decodeURIComponent(rest.slice(0, hash)),
		relation: decodeURIComponent(rest.slice(hash + 1, at)),
		subject: decodeURIComponent(rest.slice(at + 1)),
	}
}

/** The old and new values of the field relations that differ, or 'unknown' if one cannot be read. */
function changedFieldValues(schema: TLRelationSchema, prev: any, next: any): string[] | 'unknown' {
	const def = schema.types[next.typeName]
	if (!def) return []
	const env = { root: '', actor: null }
	const out: string[] = []
	for (const expr of Object.values(def)) {
		if (typeof expr === 'string' || expr.kind !== 'field') continue
		try {
			const a = toList(expr.read(prev, env))
			const b = toList(expr.read(next, env))
			if (JSON.stringify(a) !== JSON.stringify(b)) out.push(...a, ...b)
		} catch {
			return 'unknown'
		}
	}
	return out
}

function toList(value: unknown): string[] {
	if (value == null) return []
	return (Array.isArray(value) ? value : [value]).filter((v): v is string => typeof v === 'string')
}

const ctxKeys = new WeakMap<object, string>()
function ctxKey(ctx: TLRelationContext) {
	let key = ctxKeys.get(ctx)
	if (!key) ctxKeys.set(ctx, (key = JSON.stringify(ctx)))
	return key
}
