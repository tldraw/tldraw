import { Atom, Computed, atom, computed } from '@tldraw/state'
import { Store, UnknownRecord } from '@tldraw/store'
import {
	RelationEvaluator,
	TLRelationContext,
	TLRelationSource,
	authorizeRelationWrite,
	canReadRelationRecord,
	ceilingsAllow,
} from './evaluate'
import { RELATION_TYPE_NAME, RelationTupleIndex } from './roomAccess'
import { TLRelationSchema, TLRelationWriteOp } from './schema'

/**
 * The client half of relation-based access. It evaluates the same schema as the server, against
 * the records in the local store and the context the server sent.
 *
 * All checks are reactive: they read the store and the context through signals, so UI that calls
 * them updates when a grant, a parent, or the context changes.
 *
 * {@link TLRelationsClient.install} adds a write guard to the store, so local edits that the
 * server would deny never happen, and stamps new records the same way the server does.
 *
 * @public
 */
export class TLRelationsClient<R extends UnknownRecord> {
	/** The context from the server, or `null` before the first connect. */
	readonly context: Atom<TLRelationContext | null>
	private readonly index: Computed<RelationTupleIndex>

	constructor(
		readonly store: Store<R>,
		readonly schema: TLRelationSchema,
		initialContext: TLRelationContext | null = null
	) {
		this.context = atom('relations context', initialContext)
		const hasRelations = RELATION_TYPE_NAME in store.schema.types
		const query = hasRelations ? store.query.records(RELATION_TYPE_NAME as any) : null
		this.index = computed('relations index', () => {
			const index = new RelationTupleIndex()
			if (query) for (const r of query.get()) index.put(r as any)
			return index
		})
	}

	/** Set the context, usually from the sync client's `onAccessChange`. */
	setContext(context: unknown) {
		this.context.set((context as TLRelationContext | null) ?? null)
	}

	private source(): TLRelationSource {
		const index = this.index.get()
		return {
			getRecord: (id) => this.store.get(id as any),
			getSubjects: (object, relation) => index.getSubjects(object, relation),
		}
	}

	/**
	 * Does the session have `relation` on `object`? Use it for actions and affordances, for example
	 * `can('use', 'action:ai-generate')` or `can('comment', pageId)`. Returns `false` before the
	 * first connect. Ceilings from capability tokens apply.
	 */
	can(relation: string, object: string): boolean {
		const ctx = this.context.get()
		if (!ctx) return false
		const evaluator = new RelationEvaluator(this.schema, this.source(), ctx)
		return (
			evaluator.check(object, relation) && ceilingsAllow(evaluator, ctx, relation, object, false)
		)
	}

	/** Same as the server's read check. Useful for records the session already holds. */
	canRead(record: R): boolean {
		const ctx = this.context.get()
		if (!ctx) return false
		return canReadRelationRecord(this.schema, this.source(), ctx, record)
	}

	/**
	 * Would the server accept this write? Before the first connect this returns `true`: the server
	 * is the authority and checks every write anyway.
	 */
	canWrite(op: TLRelationWriteOp): boolean {
		return this.authorize(op).ok
	}

	/** Can the session create a record like this one (for example a shape of a type, on a page)? */
	canCreate(record: R): boolean {
		return this.canWrite({ type: 'create', prev: null, next: record })
	}

	/** Can the session change this record? With no `next`, any change at all. */
	canUpdate(prev: R, next: R = prev): boolean {
		return this.canWrite({ type: 'update', prev, next })
	}

	canDelete(record: R): boolean {
		return this.canWrite({ type: 'delete', prev: record, next: null })
	}

	private authorize(op: TLRelationWriteOp) {
		const ctx = this.context.get()
		if (!ctx) return { ok: true as const, record: op.next ?? op.prev }
		return authorizeRelationWrite(this.schema, this.source(), ctx, op)
	}

	/**
	 * Guard local writes and stamp new records. Writes from the server are never guarded. Returns a
	 * function that removes the guard.
	 *
	 * - update: a denied change is dropped (the record keeps its old value)
	 * - delete: a denied delete is dropped
	 * - create: new records are stamped (owner, author). A denied create is removed again in the
	 *   same operation, so it never reaches the server. `beforeCreate` handlers can't veto, which is
	 *   why this takes two steps.
	 */
	install(): () => void {
		const se = this.store.sideEffects
		const disposers: Array<() => void> = []
		const deniedCreates = new Set<string>()
		let removing = false
		for (const type of Object.keys(this.schema.types)) {
			if (!(type in this.store.schema.types)) continue
			if ((this.store.schema.types as any)[type].scope !== 'document') continue
			disposers.push(
				se.registerBeforeCreateHandler(type as any, (record: R, source) => {
					if (source !== 'user') return record
					const result = this.authorize({ type: 'create', prev: null, next: record })
					if (result.ok) return result.record as R
					deniedCreates.add(record.id)
					return record
				}),
				se.registerAfterCreateHandler(type as any, (record: R) => {
					if (!deniedCreates.delete(record.id)) return
					removing = true
					try {
						this.store.remove([record.id])
					} finally {
						removing = false
					}
				}),
				se.registerBeforeChangeHandler(type as any, (prev: R, next: R, source) => {
					if (source !== 'user') return next
					return this.authorize({ type: 'update', prev, next }).ok ? next : prev
				}),
				se.registerBeforeDeleteHandler(type as any, (record: R, source) => {
					if (source !== 'user' || removing) return
					if (!this.authorize({ type: 'delete', prev: record, next: null }).ok) return false
					return
				})
			)
		}
		return () => disposers.forEach((d) => d())
	}
}
