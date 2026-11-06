import { UnknownRecord } from '@tldraw/store'
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
	// this, a push that shares a page and then writes on it would be denied.
	const pending = new WeakMap<object, { added: RelationTupleIndex; removed: Set<string> }>()
	const sourceFor = (view: TLRoomAccessView<R>): TLRelationSource => ({
		getRecord: (id) => view.get(id),
		getSubjects: (object, relation) => {
			const stored = index.getSubjects(object, relation)
			const p = pending.get(view)
			if (!p) return stored
			const slot = `${object}#${relation}`
			const out = stored.filter((s) => !p.removed.has(`${slot}@${s}`))
			for (const s of p.added.getSubjects(object, relation)) if (!out.includes(s)) out.push(s)
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
			// Objects whose relations may have changed. Records at or under them are re-checked.
			const roots = new Set<string>()
			for (const { id, prev, next } of changes) {
				const tuple = parseRelationId(id)
				if (tuple) {
					// a tuple on something that is not a record here (a shape type, an action) can
					// matter to any record
					if (!view.get(tuple.object)) return 'all'
					roots.add(tuple.object)
					continue
				}
				if (prev && next && fieldRelationsChanged(schema, prev, next)) roots.add(id)
				// a deleted record's children (if a client left any) follow it
				if (!prev && !next) roots.add(id)
			}
			if (roots.size === 0) return 'none'
			// a userset subject such as `page:p#editor` makes the tuple's object depend on page:p
			const queue = [...roots]
			while (queue.length) {
				const object = queue.pop()!
				for (const dependent of index.objectsWithUsersetOf(object)) {
					if (roots.has(dependent)) continue
					if (!view.get(dependent)) return 'all'
					roots.add(dependent)
					queue.push(dependent)
				}
			}
			const evaluator = new RelationEvaluator(schema, sourceFor(view), {
				actor: null,
				subjects: [],
				root: '',
				rootRelations: [],
			})
			const memo = new Map<string, boolean>()
			const under = (id: string, depth: number): boolean => {
				const cached = memo.get(id)
				if (cached !== undefined) return cached
				memo.set(id, false)
				let result = roots.has(id)
				if (!result && depth < 48) {
					const up = evaluator.hasParentRelation(id)
						? evaluator.parentOf(id)
						: evaluator.anchorOf(id)
					if (up !== undefined && up !== id) result = under(up, depth + 1)
				}
				memo.set(id, result)
				return result
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

function fieldRelationsChanged(schema: TLRelationSchema, prev: any, next: any) {
	const def = schema.types[next.typeName]
	if (!def) return false
	const env = { root: '', actor: null }
	for (const expr of Object.values(def)) {
		if (typeof expr === 'string' || expr.kind !== 'field') continue
		try {
			if (
				JSON.stringify(expr.read(prev, env) ?? null) !==
				JSON.stringify(expr.read(next, env) ?? null)
			) {
				return true
			}
		} catch {
			return true
		}
	}
	return false
}

const ctxKeys = new WeakMap<object, string>()
function ctxKey(ctx: TLRelationContext) {
	let key = ctxKeys.get(ctx)
	if (!key) ctxKeys.set(ctx, (key = JSON.stringify(ctx)))
	return key
}
