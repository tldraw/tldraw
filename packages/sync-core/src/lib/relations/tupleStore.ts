import { RelationEvaluator, TLRelationCeiling, TLRelationContext } from './evaluate'
import { TLRelationExpr, TLRelationSchema, objectType } from './schema'

/**
 * One relation tuple: `object#relation@subject`.
 *
 * @public
 */
export interface TLRelationTuple {
	readonly object: string
	readonly relation: string
	readonly subject: string
}

/**
 * A server-side store for tuples about objects outside the room: files, folders, teams, links.
 * The room never reads it directly. {@link resolveRelationContext} reads it at connect, and the host
 * calls it again when {@link TLTupleStore.onChange} fires, then pushes the new context with
 * `room.updateSessionAccess`.
 *
 * Reads are async so the store can be a database. Each read names an object or a subject.
 *
 * @public
 */
export interface TLTupleStore {
	read(
		filter: { object: string; relation?: string } | { subject: string }
	): Promise<readonly TLRelationTuple[]>
	write(tuple: TLRelationTuple): Promise<void>
	delete(tuple: TLRelationTuple): Promise<void>
	onChange(
		listener: (change: { tuple: TLRelationTuple; op: 'write' | 'delete' }) => void
	): () => void
}

const tupleKey = (t: TLRelationTuple) => `${t.object}#${t.relation}@${t.subject}`

/**
 * A {@link TLTupleStore} in memory. For tests, demos, and single-process servers.
 *
 * @public
 */
export class InMemoryTupleStore implements TLTupleStore {
	private readonly tuples = new Map<string, TLRelationTuple>()
	private readonly listeners = new Set<
		(change: { tuple: TLRelationTuple; op: 'write' | 'delete' }) => void
	>()

	constructor(initial: readonly TLRelationTuple[] = []) {
		for (const t of initial) this.tuples.set(tupleKey(t), t)
	}

	async read(filter: { object: string; relation?: string } | { subject: string }) {
		return this.readSync(filter)
	}

	readSync(filter: { object: string; relation?: string } | { subject: string }) {
		const out: TLRelationTuple[] = []
		for (const t of this.tuples.values()) {
			if ('subject' in filter) {
				if (t.subject === filter.subject) out.push(t)
			} else if (
				t.object === filter.object &&
				(!filter.relation || t.relation === filter.relation)
			) {
				out.push(t)
			}
		}
		return out
	}

	all(): TLRelationTuple[] {
		return [...this.tuples.values()]
	}

	async write(tuple: TLRelationTuple) {
		const key = tupleKey(tuple)
		if (this.tuples.has(key)) return
		this.tuples.set(key, { object: tuple.object, relation: tuple.relation, subject: tuple.subject })
		this.emit({ tuple, op: 'write' })
	}

	async delete(tuple: TLRelationTuple) {
		if (!this.tuples.delete(tupleKey(tuple))) return
		this.emit({ tuple, op: 'delete' })
	}

	onChange(listener: (change: { tuple: TLRelationTuple; op: 'write' | 'delete' }) => void) {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}

	private emit(change: { tuple: TLRelationTuple; op: 'write' | 'delete' }) {
		for (const l of [...this.listeners]) l(change)
	}
}

/** The relations of a type that `from()` traverses: the ones worth loading at connect. */
function traversedRelations(schema: TLRelationSchema, type: string): Set<string> {
	const out = new Set<string>()
	const visit = (e: TLRelationExpr) => {
		if (typeof e === 'string') return
		if (e.kind === 'from') out.add(e.via)
		else if (e.kind === 'anyOf' || e.kind === 'allOf') e.exprs.forEach(visit)
		else if (e.kind === 'butNot') {
			visit(e.base)
			visit(e.subtract)
		}
	}
	for (const expr of Object.values(schema.types[type] ?? {})) visit(expr)
	return out
}

const MAX_LOAD = 1000

/**
 * Options for {@link resolveRelationContext}.
 *
 * @public
 */
export interface ResolveRelationContextOptions {
	schema: TLRelationSchema
	store: TLTupleStore
	/** The room's root object, for example `file:abc`. */
	root: string
	/** The signed-in user (`user:ann`), or `null` for an anonymous visitor. */
	actor: string | null
	/** Extra subjects, for example `link:k1` from a share link token. */
	extraSubjects?: readonly string[]
	/** Limits from capability tokens. */
	ceilings?: readonly TLRelationCeiling[]
}

/**
 * Work out a session's {@link TLRelationContext} from the tuple store. It is async because the store
 * is. It loads only what the check needs, then evaluates synchronously:
 *
 * 1. Subjects: the actor, then every userset the actor is a direct member of, transitively (Ann is
 *    in `team:design#member`, which is in `team:all#member`).
 * 2. The root and its ancestors, following only the relations that the schema traverses.
 * 3. Every relation of the root's type, evaluated against what was loaded.
 *
 * @public
 */
export async function resolveRelationContext(
	opts: ResolveRelationContextOptions
): Promise<TLRelationContext> {
	const { schema, store, root, actor } = opts

	const subjects = new Set<string>()
	const queue = [...(actor ? [actor] : []), ...(opts.extraSubjects ?? [])]
	while (queue.length && subjects.size < MAX_LOAD) {
		const s = queue.shift()!
		if (subjects.has(s)) continue
		subjects.add(s)
		for (const t of await store.read({ subject: s })) {
			queue.push(`${t.object}#${t.relation}`)
		}
	}

	const tuples = new Map<string, string[]>()
	const loaded = new Set<string>()
	const objects = [root]
	while (objects.length && loaded.size < MAX_LOAD) {
		const object = objects.shift()!
		if (loaded.has(object)) continue
		loaded.add(object)
		const follow = traversedRelations(schema, objectType(object))
		for (const t of await store.read({ object })) {
			const key = `${t.object}#${t.relation}`
			let list = tuples.get(key)
			if (!list) tuples.set(key, (list = []))
			list.push(t.subject)
			if (follow.has(t.relation) && !t.subject.includes('#') && t.subject !== '*') {
				objects.push(t.subject)
			}
		}
	}

	// evaluate with no boundary: the root is just another object in the loaded tuples
	const evaluator = new RelationEvaluator(
		schema,
		{ getRecord: () => undefined, getSubjects: (o, r) => tuples.get(`${o}#${r}`) ?? [] },
		{ actor, subjects: [...subjects], root: '', rootRelations: [] }
	)
	const rootRelations = Object.keys(schema.types[objectType(root)] ?? {}).filter((r) =>
		evaluator.check(root, r)
	)

	return {
		actor,
		subjects: [...subjects],
		root,
		rootRelations,
		...(opts.ceilings?.length ? { ceilings: opts.ceilings } : {}),
	}
}
