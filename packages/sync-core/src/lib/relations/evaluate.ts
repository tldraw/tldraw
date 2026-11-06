import {
	TLRelationEnv,
	TLRelationExpr,
	TLRelationFieldExpr,
	TLRelationSchema,
	TLRelationWriteOp,
	objectType,
} from './schema'

/**
 * A limit on what a session may do, whatever its relations say. Capability tokens carry these.
 * Every ceiling in a context must allow a check.
 *
 * @public
 */
export interface TLRelationCeiling {
	/** Only these relations (for example `read`, `create`, `update`) may pass. */
	readonly relations?: readonly string[]
	/** Writes only to these objects and their descendants (by the schema's parent relation). */
	readonly within?: readonly string[]
}

/**
 * Who a session is, as far as the relation engine is concerned. It is plain JSON: the server
 * resolves it at connect and sends it to the client, so that both evaluate the same thing.
 *
 * @public
 */
export interface TLRelationContext {
	/** The subject that writes are stamped with (`user:ann`), or `null` for anonymous sessions. */
	readonly actor: string | null
	/**
	 * Every subject the session matches: its user, its groups as usersets (`team:design#member`),
	 * and any link or agent subjects from capability tokens.
	 */
	readonly subjects: readonly string[]
	/** The room's root object, for example `file:abc`. */
	readonly root: string
	/**
	 * The relations the session has on the root object. The server computes these from tuples that
	 * live outside the room (files, folders, teams), so the room never needs those tuples.
	 */
	readonly rootRelations: readonly string[]
	/** Limits from capability tokens. All must allow a check. */
	readonly ceilings?: readonly TLRelationCeiling[]
}

/**
 * Where the evaluator reads records and stored tuples from. The server reads the room's storage,
 * the client reads the editor's store, and the connect-time resolver reads a tuple store.
 *
 * @public
 */
export interface TLRelationSource {
	/** A record in the room, or `undefined` if the object is not a record here. */
	getRecord(id: string): any | undefined
	/** The subjects of stored tuples `object#relation@subject`. */
	getSubjects(object: string, relation: string): readonly string[]
}

const MAX_DEPTH = 48

/**
 * Evaluates relation checks against one source and one context. Results are memoized for the life
 * of the evaluator, so create one per batch of checks (one push, one broadcast) and drop it after.
 *
 * @public
 */
export class RelationEvaluator {
	private readonly memo = new Map<string, boolean>()
	private readonly subjects: ReadonlySet<string>
	private readonly env: TLRelationEnv

	constructor(
		readonly schema: TLRelationSchema,
		readonly source: TLRelationSource,
		readonly ctx: TLRelationContext,
		op?: TLRelationWriteOp
	) {
		this.subjects = new Set(ctx.subjects)
		this.env = { root: ctx.root, actor: ctx.actor, op }
	}

	/** Does the session have `relation` on `object`? Ceilings are not applied here. */
	private cuts = 0

	check(object: string, relation: string): boolean {
		return this.checkAt(object, relation, 0, new Set())
	}

	/**
	 * The object references in a traversable relation, for example the parent of a record. Reads
	 * stored tuples and record fields.
	 */
	listSubjects(object: string, relation: string): string[] {
		const expr = this.schema.types[objectType(object)]?.[relation]
		if (expr === undefined) return []
		return this.listTupleSubjects(object, relation, expr)
	}

	private readField(object: string, expr: TLRelationFieldExpr): readonly string[] {
		const record = this.source.getRecord(object)
		let value: string | readonly string[] | null | undefined
		try {
			value = expr.read(record, this.env)
		} catch {
			// a field reader that throws on a malformed record grants nothing (fail closed)
			return []
		}
		if (value == null) return []
		return typeof value === 'string' ? [value] : value
	}

	private checkAt(object: string, relation: string, depth: number, path: Set<string>): boolean {
		if (object === this.ctx.root) return this.ctx.rootRelations.includes(relation)
		const key = object + '#' + relation
		const cached = this.memo.get(key)
		if (cached !== undefined) return cached
		// cycles (a parent loop in corrupt data, or a userset that refers to itself) deny
		if (depth > MAX_DEPTH || path.has(key)) {
			this.cuts++
			return false
		}
		const expr = this.schema.types[objectType(object)]?.[relation]
		if (expr === undefined) return false
		path.add(key)
		const cutsBefore = this.cuts
		const result = this.evalExpr(object, relation, expr, depth, path)
		path.delete(key)
		// A result that leaned on a cycle being cut short is only true for this path. Caching it
		// would let a `butNot` elsewhere read a false "not restricted".
		if (this.cuts === cutsBefore) this.memo.set(key, result)
		return result
	}

	private evalExpr(
		object: string,
		relation: string,
		expr: TLRelationExpr,
		depth: number,
		path: Set<string>
	): boolean {
		if (typeof expr === 'string') return this.checkAt(object, expr, depth + 1, path)
		switch (expr.kind) {
			case 'direct':
				return this.matchesAny(this.source.getSubjects(object, relation), depth, path)
			case 'field':
				return this.matchesAny(this.readField(object, expr), depth, path)
			case 'from': {
				const viaExpr = this.schema.types[objectType(object)]?.[expr.via]
				if (viaExpr === undefined) return false
				for (const target of this.listTupleSubjects(object, expr.via, viaExpr)) {
					// a traversal goes to objects, not usersets
					if (target.includes('#') || target === '*') continue
					if (this.checkAt(target, expr.relation, depth + 1, path)) return true
				}
				return false
			}
			case 'anyOf':
				return expr.exprs.some((e) => this.evalExpr(object, relation, e, depth, path))
			case 'allOf':
				return expr.exprs.every((e) => this.evalExpr(object, relation, e, depth, path))
			case 'butNot':
				return (
					this.evalExpr(object, relation, expr.base, depth, path) &&
					!this.evalExpr(object, relation, expr.subtract, depth, path)
				)
			case 'when': {
				const record = this.source.getRecord(object)
				if (record === undefined) return false
				try {
					return expr.test(record, this.env)
				} catch {
					return false
				}
			}
			case 'anyone':
				return true
			case 'nobody':
				return false
		}
	}

	private listTupleSubjects(object: string, relation: string, expr: TLRelationExpr): string[] {
		const out: string[] = []
		const visit = (e: TLRelationExpr) => {
			if (typeof e === 'string') return
			if (e.kind === 'direct') out.push(...this.source.getSubjects(object, relation))
			else if (e.kind === 'field') out.push(...this.readField(object, e))
			else if (e.kind === 'anyOf') e.exprs.forEach(visit)
		}
		visit(expr)
		return out
	}

	private matchesAny(candidates: readonly string[], depth: number, path: Set<string>): boolean {
		for (const s of candidates) {
			if (s === '*' || this.subjects.has(s)) return true
			const hash = s.indexOf('#')
			if (hash !== -1) {
				// a userset such as `page:abc#editor`: the session matches if it has that relation
				if (this.checkAt(s.slice(0, hash), s.slice(hash + 1), depth + 1, path)) return true
			}
		}
		return false
	}

	/** The parent chain of an object, nearest first, by the schema's parent relation. */
	ancestors(object: string): string[] {
		const out: string[] = []
		const seen = new Set<string>([object])
		let current = object
		while (out.length < MAX_DEPTH) {
			const parent = this.parentOf(current)
			if (!parent || seen.has(parent)) break
			out.push(parent)
			seen.add(parent)
			current = parent
		}
		return out
	}

	hasParentRelation(object: string): boolean {
		return this.schema.types[objectType(object)]?.[this.schema.parentRelation] !== undefined
	}

	/** The object a record without a parent hangs off: the value of its first field relation. */
	anchorOf(object: string): string | undefined {
		const def = this.schema.types[objectType(object)]
		if (!def) return undefined
		for (const expr of Object.values(def)) {
			if (typeof expr !== 'string' && expr.kind === 'field') return this.readField(object, expr)[0]
		}
		return undefined
	}

	parentOf(object: string): string | undefined {
		const expr = this.schema.types[objectType(object)]?.[this.schema.parentRelation]
		if (expr === undefined) return undefined
		return this.listTupleSubjects(object, this.schema.parentRelation, expr)[0]
	}
}

/**
 * A source that sees `record` in place of the stored version with the same id. Used to evaluate a
 * check against the record a write would produce.
 */
export function overlaySource(source: TLRelationSource, record: { id: string }): TLRelationSource {
	return {
		getRecord: (id) => (id === record.id ? record : source.getRecord(id)),
		getSubjects: (object, relation) => source.getSubjects(object, relation),
	}
}

function fieldName(def: Readonly<Record<string, TLRelationExpr>>, expr: TLRelationExpr) {
	return Object.keys(def).find((k) => def[k] === expr)!
}

export function ceilingsAllow(
	evaluator: RelationEvaluator,
	ctx: TLRelationContext,
	relation: string,
	object: string,
	isWrite: boolean
): boolean {
	if (!ctx.ceilings) return true
	for (const ceiling of ctx.ceilings) {
		if (ceiling.relations && !ceiling.relations.includes(relation)) return false
		if (ceiling.within) {
			const ok = isWrite
				? isInside(evaluator, object, ceiling.within)
				: withinAllowsRead(evaluator, ctx, object, ceiling.within, 0)
			if (!ok) return false
		}
	}
	return true
}

function isInside(evaluator: RelationEvaluator, object: string, within: readonly string[]) {
	// a record linked by another field (a binding to its source shape) is inside if that is
	let target = object
	for (let i = 0; i < 8 && !evaluator.hasParentRelation(target); i++) {
		const anchor = evaluator.anchorOf(target)
		if (anchor === undefined || anchor === target) break
		target = anchor
	}
	const chain = [object, target, ...evaluator.ancestors(target)]
	return within.some((w) => chain.includes(w))
}

/**
 * Reads under a `within` caveat. A session may read inside the subtrees, and the path down to them
 * (so the client can show them), and anything outside the tree (the document, users). It may not
 * read siblings off that path: other shapes on the page, or other pages. A record linked to the
 * tree by a field other than its parent (a relation tuple, a binding, a presence) follows the
 * record it links to.
 */
function withinAllowsRead(
	evaluator: RelationEvaluator,
	ctx: TLRelationContext,
	object: string,
	within: readonly string[],
	depth: number
): boolean {
	if (depth > 8) return false
	if (!evaluator.hasParentRelation(object)) {
		const anchor = evaluator.anchorOf(object)
		return anchor === undefined || anchor === object
			? true
			: withinAllowsRead(evaluator, ctx, anchor, within, depth + 1)
	}
	const chain = [object, ...evaluator.ancestors(object)]
	if (within.some((w) => chain.includes(w))) return true
	const path = new Set<string>()
	for (const w of within) for (const a of [w, ...evaluator.ancestors(w)]) path.add(a)
	if (path.has(object)) return true
	const branch = chain.find((c) => path.has(c))
	if (branch === undefined) return true
	if (branch !== ctx.root) return false
	// it branches off at the root: hide it if it is the same kind of thing as the path (another
	// page), keep it if it is not (the document)
	const top = chain[chain.indexOf(branch) - 1]
	const pathTops = [...path].filter((p) => evaluator.parentOf(p) === ctx.root)
	return !pathTops.some((p) => objectType(p) === objectType(top))
}

/**
 * The result of {@link authorizeRelationWrite}.
 *
 * @public
 */
export type TLRelationWriteResult<R> = { ok: true; record: R } | { ok: false; reason: string }

/**
 * May this session read this record? Applies the schema's `read` relation and the session's
 * ceilings. The caller decides about parents (see the room adapter, which hides orphans).
 *
 * @public
 */
export function canReadRelationRecord(
	schema: TLRelationSchema,
	source: TLRelationSource,
	ctx: TLRelationContext,
	record: { id: string }
): boolean {
	const evaluator = new RelationEvaluator(schema, overlaySource(source, record), ctx)
	return (
		evaluator.check(record.id, 'read') && ceilingsAllow(evaluator, ctx, 'read', record.id, false)
	)
}

/**
 * The write check, shared by the client guard and the server room.
 *
 * - **create**: stamp fields that have `stamp`, then check `create` on the stamped record.
 * - **update**: check `read` and `update` on the stored record, and `update` again on the new
 *   record, so a record cannot be moved somewhere the session may not write. Locked fields must not
 *   change.
 * - **delete**: check `read` and `delete` on the stored record.
 *
 * Ceilings from capability tokens apply to every write.
 *
 * @public
 */
export function authorizeRelationWrite<R extends { id: string; typeName: string }>(
	schema: TLRelationSchema,
	source: TLRelationSource,
	ctx: TLRelationContext,
	op: TLRelationWriteOp
): TLRelationWriteResult<R> {
	const typeName: string = (op.next ?? op.prev).typeName
	const def = schema.types[typeName]
	if (!def) return { ok: false, reason: `type '${typeName}' is not in the relation schema` }

	switch (op.type) {
		case 'create': {
			let record = op.next as R
			const asSent = new RelationEvaluator(schema, overlaySource(source, record), ctx, op)
			for (const expr of Object.values(def)) {
				if (typeof expr === 'string' || expr.kind !== 'field' || !expr.stamp) continue
				// someone who may change the field anyway may also keep the value it has, so undoing
				// a manager's delete of Ann's shape gives it back to Ann
				if (
					typeof expr.lock === 'string' &&
					asSent.listSubjects(record.id, fieldName(def, expr)).length > 0 &&
					asSent.check(record.id, expr.lock) &&
					ceilingsAllow(asSent, ctx, expr.lock, record.id, true)
				) {
					continue
				}
				const stamped = expr.stamp(record, ctx.actor)
				if (!stamped) return { ok: false, reason: 'stamp rejected the actor' }
				record = stamped
			}
			const stampedOp = { type: 'create', prev: null, next: record } as const
			const evaluator = new RelationEvaluator(schema, overlaySource(source, record), ctx, stampedOp)
			if (!evaluator.check(record.id, 'create')) return { ok: false, reason: 'no create' }
			if (!ceilingsAllow(evaluator, ctx, 'create', record.id, true)) {
				return { ok: false, reason: 'ceiling' }
			}
			return { ok: true, record }
		}
		case 'update': {
			const before = new RelationEvaluator(schema, overlaySource(source, op.prev), ctx, op)
			if (!before.check(op.prev.id, 'read')) return { ok: false, reason: 'no read' }
			if (!before.check(op.prev.id, 'update')) return { ok: false, reason: 'no update' }
			if (!ceilingsAllow(before, ctx, 'update', op.prev.id, true)) {
				return { ok: false, reason: 'ceiling' }
			}
			const after = new RelationEvaluator(schema, overlaySource(source, op.next), ctx, op)
			if (!after.check(op.next.id, 'update')) return { ok: false, reason: 'no update after' }
			if (!ceilingsAllow(after, ctx, 'update', op.next.id, true)) {
				return { ok: false, reason: 'ceiling after' }
			}
			for (const [name, expr] of Object.entries(def)) {
				if (typeof expr === 'string' || expr.kind !== 'field' || !expr.lock) continue
				const a = before.listSubjects(op.prev.id, name)
				const b = after.listSubjects(op.next.id, name)
				if (a.length === b.length && a.every((v, i) => v === b[i])) continue
				if (
					expr.lock === true ||
					!before.check(op.prev.id, expr.lock) ||
					!ceilingsAllow(before, ctx, expr.lock, op.prev.id, true)
				) {
					return { ok: false, reason: `field relation '${name}' is locked` }
				}
			}
			return { ok: true, record: op.next as R }
		}
		case 'delete': {
			const evaluator = new RelationEvaluator(schema, overlaySource(source, op.prev), ctx, op)
			if (!evaluator.check(op.prev.id, 'read')) return { ok: false, reason: 'no read' }
			if (!evaluator.check(op.prev.id, 'delete')) return { ok: false, reason: 'no delete' }
			if (!ceilingsAllow(evaluator, ctx, 'delete', op.prev.id, true)) {
				return { ok: false, reason: 'ceiling' }
			}
			return { ok: true, record: op.prev as R }
		}
	}
}
