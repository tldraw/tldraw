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
	const sourceFor = (view: TLRoomAccessView<R>): TLRelationSource => ({
		getRecord: (id) => view.get(id),
		getSubjects: (object, relation) => index.getSubjects(object, relation),
	})
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
			const result = authorizeRelationWrite<R & { id: string; typeName: string }>(
				schema,
				source,
				ctx,
				write as any
			)
			return result.ok ? result.record : null
		},
		affectsReadAccess({ id, prev, next }) {
			// a grant changes what others can read; deleting any other record can only hide it
			// (clients delete children with their parent)
			if (id.startsWith(RELATION_TYPE_NAME + ':')) return true
			if (!prev || !next) return false
			const record = next
			const def = schema.types[record.typeName]
			// a type with no parent relation has no descendants to re-check
			if (!def || !(schema.parentRelation in def)) return false
			for (const expr of Object.values(def)) {
				if (typeof expr === 'string' || expr.kind !== 'field') continue
				const env = { root: '', actor: null }
				const a = JSON.stringify(expr.read(prev, env) ?? null)
				const b = JSON.stringify(expr.read(next, env) ?? null)
				if (a !== b) return true
			}
			return false
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

const ctxKeys = new WeakMap<object, string>()
function ctxKey(ctx: TLRelationContext) {
	let key = ctxKeys.get(ctx)
	if (!key) ctxKeys.set(ctx, (key = JSON.stringify(ctx)))
	return key
}
