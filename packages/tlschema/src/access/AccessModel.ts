import { UnknownRecord } from '@tldraw/store'
import { getOwnProperty } from '@tldraw/utils'

/**
 * Who acts. `id: null` is an anonymous visitor: it matches only `anyone` entries, and never owns
 * a record.
 *
 * @public
 */
export interface AccessActor {
	readonly id: string | null
	readonly groups?: readonly string[]
}

/**
 * Who an {@link AccessEntry} is for. A `relation` subject is evaluated against the record being
 * checked (not against the level the entry sits on), so `{ type: 'relation', relation: 'owner' }`
 * on a page means "the owner of each record under this page".
 *
 * @public
 */
export type AccessSubject =
	| { readonly type: 'anyone' }
	| { readonly type: 'user'; readonly id: string }
	| { readonly type: 'group'; readonly id: string }
	| { readonly type: 'relation'; readonly relation: string }

/**
 * What an entry does for the verbs it lists, at the level it sits on:
 *
 * - `allow`: the verbs are allowed here and below, until a nearer level decides.
 * - `deny`: the verbs are denied here and below, until a nearer level decides. Beats `allow` on the
 *   same level.
 * - `block`: stops inheritance. The verbs are denied here unless an `allow` on the same level, or a
 *   nearer level, decides. Loses to `allow` on the same level, so "private page for the team" is
 *   one `block` for anyone plus one `allow` for the team.
 *
 * @public
 */
export type AccessEffect = 'allow' | 'deny' | 'block'

/**
 * One access rule: at `resource`, for `subject`, `effect` the listed `verbs`. A verb list can name
 * roles; they expand to their verbs.
 *
 * @public
 */
export interface AccessEntry {
	readonly resource: string
	readonly subject: AccessSubject
	readonly effect: AccessEffect
	readonly verbs: readonly string[]
}

/**
 * What a session brings to the model: the actor, the entries the host resolved for it (for
 * example its role on the room root, from the host's own database), and an optional ceiling. The
 * ceiling caps every answer, so no in-room entry can lift it (a read-only token stays read-only).
 *
 * @public
 */
export interface SessionAccess {
	readonly actor: AccessActor
	readonly entries?: readonly AccessEntry[]
	readonly limit?: readonly string[] | null
}

/**
 * The model's window on the records: the record by id, and the in-room entries on a resource.
 * The client implements it on its store, the server on the room's records. A push is checked
 * against two views: the records before it, and the records after it.
 *
 * @public
 */
export interface AccessView<R extends UnknownRecord = UnknownRecord> {
	get(id: string): R | undefined
	entriesAt(resource: string): readonly AccessEntry[]
}

/**
 * A view the server keeps for the whole room. Its indexes let a change recompute only the records
 * it can affect: the subtree below it, and the records that `alsoRead` it.
 *
 * @public
 */
export interface IndexedAccessView<R extends UnknownRecord = UnknownRecord> extends AccessView<R> {
	set(record: R): void
	delete(id: string): void
	ids(): Iterable<string>
	/** Records whose parent is `id`, including ones left behind when `id` was deleted. */
	childrenOf(id: string): Iterable<string>
	/** Records that name `id` in `alsoRead` or `references`. */
	readersOf(id: string): Iterable<string>
}

/** @public */
export type AccessOp = 'create' | 'update' | 'delete'

/**
 * How one record type takes part in the model.
 *
 * @public
 */
export interface AccessTypeRule<R extends UnknownRecord = UnknownRecord> {
	/** The record's parent in the resource tree. `null` only for the root. */
	parent(record: R): string | null
	/** Other records that must be readable for this one to be readable (a binding's target). */
	alsoRead?(record: R): readonly string[]
	/** The verb each write needs. Defaults to the op name: `create`, `update`, `delete`. */
	verbs?: Partial<Record<AccessOp, string>>
	/**
	 * Where the record keeps its trusted owner. The server stamps it on create and keeps it on
	 * update, so a client cannot claim or drop ownership.
	 */
	owner?: {
		get(record: R): string | null | undefined
		set(record: R, ownerId: string | null): R
	}
	/**
	 * Remove references to records the reader may not read, before the record is sent to them.
	 * A presence record names the shapes its user has selected; without this, a hidden shape's id
	 * would reach everyone on the page. Return the record itself when nothing changes.
	 */
	redact?(record: R, canRead: (id: string) => boolean): R
	/** The records `redact` looks at. When one of them changes, the server sends this record again. */
	references?(record: R): readonly string[]
}

/**
 * A relation: does `actor` stand in this relation to `record`? Runs on the client and the server,
 * so it must be pure and synchronous. Fail closed on missing data.
 *
 * @public
 */
export type AccessRelation<R extends UnknownRecord = UnknownRecord> = (
	actor: AccessActor,
	record: R | undefined,
	view: AccessView<R>
) => boolean

/** @public */
export interface AccessModelConfig<R extends UnknownRecord = UnknownRecord> {
	/** The id of the root resource (in tldraw, the document record). */
	root: string
	/** Named sets of verbs. A role can include other roles. */
	roles?: Record<string, readonly string[]>
	/** Every record type that clients may read or write. A type that is not listed is closed. */
	types: Record<string, AccessTypeRule<any>>
	/** Relations beyond the built-in `owner`. */
	relations?: Record<string, AccessRelation<R>>
	/** Entries that are part of the model itself, not data (for example "owners edit their own comments"). */
	entries?: readonly AccessEntry[]
	/**
	 * The record type that stores in-room entries. Its records must have the fields of an
	 * {@link AccessEntry}. Writing one needs `manageVerb` on its resource.
	 */
	entryType?: string
	/** The verb needed to write in-room entries on a resource. Defaults to `manage`. */
	manageVerb?: string
}

/**
 * The answer to one check, with the entry that decided it, so a UI can say why.
 *
 * @public
 */
export interface AccessDecision {
	readonly allowed: boolean
	readonly verb: string
	/** The record the check was about. */
	readonly id: string
	/** The level that decided, or `null` when nothing matched (closed by default) or a ceiling decided. */
	readonly at: string | null
	readonly entry: AccessEntry | null
	readonly reason: string
}

/** One record write: `prev` null for a create, `next` null for a delete. @public */
export interface AccessChange<R extends UnknownRecord = UnknownRecord> {
	readonly prev: R | null
	readonly next: R | null
}

const DEFAULT_VERBS: Record<AccessOp, string> = {
	create: 'create',
	update: 'update',
	delete: 'delete',
}

/**
 * The access model: one object, built from a declarative config, that the editor and the sync
 * server both run. Every answer comes from the same walk:
 *
 * 1. Start at the record. At each level, collect the entries whose subject matches the actor and
 *    whose verbs cover the verb.
 * 2. On that level: any `deny` denies; else any `allow` allows; else any `block` denies.
 * 3. No match: go to the parent. Past the root: denied (closed by default).
 * 4. Every verb also needs `read` on the record, and `read` needs `read` on every ancestor, so what
 *    a session can see is always a whole subtree.
 * 5. The session's ceiling (`limit`) caps the result.
 *
 * @public
 */
export class AccessModel<R extends UnknownRecord = UnknownRecord> {
	readonly root: string
	readonly manageVerb: string
	readonly entryType: string | null
	private readonly roles: Record<string, readonly string[]>
	private readonly types: Record<string, AccessTypeRule<any>>
	private readonly relations: Record<string, AccessRelation<R>>
	private readonly staticEntries: Map<string, AccessEntry[]>
	private readonly expandCache = new WeakMap<readonly string[], ReadonlySet<string>>()

	constructor(config: AccessModelConfig<R>) {
		this.root = config.root
		this.roles = config.roles ?? {}
		this.types = config.types
		this.relations = config.relations ?? {}
		this.manageVerb = config.manageVerb ?? 'manage'
		this.entryType = config.entryType ?? null
		this.staticEntries = new Map()
		for (const entry of config.entries ?? []) {
			const list = this.staticEntries.get(entry.resource) ?? []
			list.push(entry)
			this.staticEntries.set(entry.resource, list)
		}
		for (const role of Object.keys(this.roles)) this.expand([role]) // throws on unknown names early
	}

	/** The rule for a record type, or undefined when the type is closed. */
	getTypeRule(typeName: string): AccessTypeRule<any> | undefined {
		return getOwnProperty(this.types, typeName)
	}

	/** Expand verbs and role names to the set of verbs they give. */
	expand(names: readonly string[]): ReadonlySet<string> {
		const cached = this.expandCache.get(names)
		if (cached) return cached
		const out = new Set<string>()
		const visit = (name: string, path: string[]) => {
			const role = getOwnProperty(this.roles, name)
			if (!role) {
				out.add(name)
				return
			}
			if (path.includes(name)) throw new Error(`Access role cycle: ${[...path, name].join(' -> ')}`)
			for (const inner of role) visit(inner, [...path, name])
		}
		for (const name of names) visit(name, [])
		this.expandCache.set(names, out)
		return out
	}

	parentOf(id: string, view: AccessView<R>): string | null | undefined {
		if (id === this.root) return null
		const record = view.get(id)
		if (!record) return undefined
		const rule = this.getTypeRule(record.typeName)
		if (!rule) return undefined
		return rule.parent(record)
	}

	/** The entry a record holds, when it is an in-room entry record. */
	entryOf(record: R | null | undefined): (AccessEntry & R) | null {
		return record && this.entryType !== null && record.typeName === this.entryType
			? (record as AccessEntry & R)
			: null
	}

	/**
	 * True when the model has its own relations. A relation may look at any record, so the server
	 * cannot tell which records a change affects, and checks them all.
	 */
	hasCustomRelations(): boolean {
		return Object.keys(this.relations).length > 0
	}

	ownerOf(record: R): string | null {
		return this.getTypeRule(record.typeName)?.owner?.get(record) ?? null
	}

	private subjectMatches(
		subject: AccessSubject,
		session: SessionAccess,
		leaf: R | undefined,
		view: AccessView<R>
	): boolean {
		const { actor } = session
		switch (subject.type) {
			case 'anyone':
				return true
			case 'user':
				return actor.id !== null && actor.id === subject.id
			case 'group':
				return !!actor.groups?.includes(subject.id)
			case 'relation': {
				if (subject.relation === 'owner') {
					// fail closed: an anonymous actor or an unowned record is never "the owner"
					return actor.id !== null && !!leaf && this.ownerOf(leaf) === actor.id
				}
				const relation = getOwnProperty(this.relations, subject.relation)
				return relation ? relation(actor, leaf, view) : false
			}
		}
	}

	private hostEntries = new WeakMap<readonly AccessEntry[], Map<string, AccessEntry[]>>()

	private entriesAt(resource: string, session: SessionAccess, view: AccessView<R>) {
		const inRoom = view.entriesAt(resource)
		const fromModel = this.staticEntries.get(resource)
		let byResource = session.entries && this.hostEntries.get(session.entries)
		if (session.entries && !byResource) {
			byResource = new Map()
			for (const e of session.entries) {
				const list = byResource.get(e.resource)
				if (list) list.push(e)
				else byResource.set(e.resource, [e])
			}
			this.hostEntries.set(session.entries, byResource)
		}
		const fromHost = byResource?.get(resource)
		if (!fromModel && !fromHost?.length) return inRoom
		return [...inRoom, ...(fromModel ?? []), ...(fromHost ?? [])]
	}

	/**
	 * The walk alone: no `read` requirement and no ceiling. Use {@link AccessModel.can} or
	 * {@link AccessModel.explain} for real checks.
	 */
	decide(session: SessionAccess, verb: string, id: string, view: AccessView<R>): AccessDecision {
		const leaf = view.get(id)
		let cur: string | null | undefined = id
		const seen = new Set<string>()
		while (cur) {
			if (seen.has(cur)) return deny(verb, id, cur, null, 'the resource tree has a cycle')
			seen.add(cur)
			let allow: AccessEntry | null = null
			let block: AccessEntry | null = null
			for (const entry of this.entriesAt(cur, session, view)) {
				if (!this.expand(entry.verbs).has(verb)) continue
				if (!this.subjectMatches(entry.subject, session, leaf, view)) continue
				if (entry.effect === 'deny') return deny(verb, id, cur, entry, `denied at ${cur}`)
				if (entry.effect === 'allow') allow ??= entry
				else block ??= entry
			}
			if (allow)
				return { allowed: true, verb, id, at: cur, entry: allow, reason: `allowed at ${cur}` }
			if (block) return deny(verb, id, cur, block, `inheritance blocked at ${cur}`)
			const parent = this.parentOf(cur, view)
			if (parent === undefined) {
				return deny(verb, id, cur, null, `${cur} is missing or its type is not in the access model`)
			}
			cur = parent
		}
		return deny(verb, id, null, null, `no entry gives ${verb}`)
	}

	/** Like {@link AccessModel.can}, with the deciding entry and a reason. */
	explain(session: SessionAccess, verb: string, id: string, view: AccessView<R>): AccessDecision {
		if (session.limit && !this.expand(session.limit).has(verb)) {
			return deny(verb, id, null, null, `${verb} is above this session's ceiling`)
		}
		if (verb !== 'read') {
			const read = this.explainRead(session, id, view)
			if (!read.allowed) return { ...read, verb }
		}
		return verb === 'read'
			? this.explainRead(session, id, view)
			: this.decide(session, verb, id, view)
	}

	/** May the session do `verb` on the record (or resource) `id`? */
	can(session: SessionAccess, verb: string, id: string, view: AccessView<R>): boolean {
		return this.explain(session, verb, id, view).allowed
	}

	/**
	 * May the session see this record? Needs `read` on the record and every ancestor, and on any
	 * `alsoRead` records. An in-room entry is visible to its own subject and to managers, never to
	 * anyone else, so a session always holds the entries it needs to run the model locally. A
	 * relation entry is visible to everyone who may read its resource.
	 */
	explainRead(session: SessionAccess, id: string, view: AccessView<R>): AccessDecision {
		if (session.limit && !this.expand(session.limit).has('read')) {
			return deny('read', id, null, null, `read is above this session's ceiling`)
		}
		return this.readDecision(session, id, view, new Set())
	}

	// `reader` below must give the same answers: change both together
	private readDecision(
		session: SessionAccess,
		id: string,
		view: AccessView<R>,
		path: Set<string>
	): AccessDecision {
		if (path.has(id)) return deny('read', id, null, null, 'the read rule has a cycle')
		const record = view.get(id)
		if (!record && id !== this.root) return deny('read', id, null, null, `${id} is missing`)
		const entry = this.entryOf(record)
		if (entry) {
			// a relation entry is judged on each record below it (an owner entry on a page applies
			// to every shape on it), so all readers of its resource need it to run the model locally
			if (
				entry.subject.type === 'relation' ||
				this.subjectMatches(entry.subject, session, view.get(entry.resource), view)
			) {
				return this.explainRead(session, entry.resource, view)
			}
			return this.explain(session, this.manageVerb, entry.resource, view)
		}
		const decision = this.decide(session, 'read', id, view)
		if (!decision.allowed) return decision
		const parent = this.parentOf(id, view)
		if (parent === undefined) {
			return deny('read', id, id, null, `${record!.typeName} is not in the access model`)
		}
		path.add(id)
		try {
			const others = [parent, ...(this.getTypeRule(record!.typeName)?.alsoRead?.(record!) ?? [])]
			for (const other of others) {
				if (!other) continue
				const up = this.readDecision(session, other, view, path)
				if (!up.allowed) return { ...up, id }
			}
		} finally {
			path.delete(id)
		}
		return decision
	}

	canRead(session: SessionAccess, id: string, view: AccessView<R>): boolean {
		return this.explainRead(session, id, view).allowed
	}

	/**
	 * `canRead` for many records of one view that does not change meanwhile. Each ancestor is
	 * decided once, so a whole room costs one walk per record, not one per ancestor. It must give
	 * the same answers as `explainRead`.
	 */
	reader(session: SessionAccess, view: AccessView<R>): (id: string) => boolean {
		const memo = new Map<string, boolean>()
		const ceiling = !session.limit || this.expand(session.limit).has('read')
		const read = (id: string): boolean => {
			const known = memo.get(id)
			if (known !== undefined) return known
			memo.set(id, false) // a cycle reads as closed
			const record = view.get(id)
			let ok = ceiling && !!(record || id === this.root)
			if (ok && this.entryOf(record)) ok = this.canRead(session, id, view)
			else if (ok) {
				ok = this.decide(session, 'read', id, view).allowed
				const parent = ok ? this.parentOf(id, view) : null
				if (parent === undefined) ok = false
				else if (parent) ok = read(parent)
				const alsoRead = record && this.getTypeRule(record.typeName)?.alsoRead
				if (ok && alsoRead) ok = alsoRead(record).every(read)
			}
			memo.set(id, ok)
			return ok
		}
		return read
	}

	/**
	 * Check one record write. `before` is the view before the write (or the whole push), and `after`
	 * the view after it, so a move is checked at both its old and its new place.
	 */
	checkChange(
		session: SessionAccess,
		change: AccessChange<R>,
		before: AccessView<R>,
		after: AccessView<R>
	): AccessDecision {
		const { prev, next } = change
		const record = (next ?? prev)!
		const rule = this.getTypeRule(record.typeName)
		if (!rule) {
			return deny('write', record.id, null, null, `${record.typeName} is not in the access model`)
		}
		const verbs = { ...DEFAULT_VERBS, ...rule.verbs }
		if (prev && next && rule.owner && rule.owner.get(prev) !== rule.owner.get(next)) {
			return deny(verbs.update, record.id, null, null, 'the owner of a record cannot change')
		}
		if (this.entryOf(record)) {
			// An entry write is judged by the entries as they were before the push, so it cannot
			// grant the right to write itself. Records come from `after` first, so an entry may sit
			// on a resource created in the same push, and from `before` for a deleted entry.
			const records = after
			const entries = before
			const view: AccessView<R> = {
				get: (id) => records.get(id) ?? entries.get(id),
				entriesAt: (resource) => entries.entriesAt(resource),
			}
			before = view
			after = view
		}
		let decision: AccessDecision
		if (!prev) {
			decision = this.explain(session, verbs.create, next!.id, after)
		} else if (!next) {
			decision = this.explain(session, verbs.delete, prev.id, before)
			// a record that needs another goes with it: deleting your shape takes the binding of
			// someone else's arrow to it. The other record's own delete is checked on its own.
			const gone = !decision.allowed && rule.alsoRead?.(prev).find((id) => !after.get(id))
			if (gone && before.get(gone) && this.canRead(session, prev.id, before)) {
				decision = {
					allowed: true,
					verb: verbs.delete,
					id: prev.id,
					at: gone,
					entry: null,
					reason: `${gone} is deleted`,
				}
			}
		} else {
			decision = this.explain(session, verbs.update, prev.id, before)
			if (decision.allowed) decision = this.explain(session, verbs.update, next.id, after)
		}
		if (!decision.allowed) return decision
		// An entry write needs `manage` where the entry sits (checked above through `verbs`), and
		// an `allow` may not give more than the writer has there: no escalation.
		for (const [entry, view] of [
			[this.entryOf(prev), before],
			[this.entryOf(next), after],
		] as const) {
			if (!entry || entry.effect !== 'allow') continue
			for (const verb of this.expand(entry.verbs)) {
				if (!this.can(session, verb, entry.resource, view)) {
					return deny(
						verb,
						record.id,
						entry.resource,
						null,
						`cannot give ${verb}: you do not have it`
					)
				}
			}
		}
		return decision
	}

	/** Check many writes. Returns the first denial, or null when every write is allowed. */
	checkChanges(
		session: SessionAccess,
		changes: Iterable<AccessChange<R>>,
		before: AccessView<R>,
		after: AccessView<R>
	): AccessDecision | null {
		for (const change of changes) {
			const decision = this.checkChange(session, change, before, after)
			if (!decision.allowed) return decision
		}
		return null
	}

	/**
	 * The record to store for a write: the owner is the session's actor on create, and stays the
	 * previous owner on update, whatever the client sent.
	 */
	stamp(session: SessionAccess, prev: R | null, next: R): R {
		const owner = this.getTypeRule(next.typeName)?.owner
		if (!owner) return next
		const want = prev ? (owner.get(prev) ?? null) : session.actor.id
		return (owner.get(next) ?? null) === want ? next : owner.set(next, want)
	}

	/** The record as this session may see it: references to records it may not read removed. */
	redact(session: SessionAccess, record: R, view: AccessView<R>): R {
		const redact = this.getTypeRule(record.typeName)?.redact
		return redact ? redact(record, (id) => this.canRead(session, id, view)) : record
	}
}

function deny(
	verb: string,
	id: string,
	at: string | null,
	entry: AccessEntry | null,
	reason: string
): AccessDecision {
	return { allowed: false, verb, id, at, entry, reason }
}

/**
 * Build an {@link AccessView} over a plain list or map of records. Used by the server, tests, and
 * anything without a store.
 *
 * @public
 */
export function createAccessView<R extends UnknownRecord>(
	model: AccessModel<R>,
	records: Iterable<R> | Map<string, R>
): IndexedAccessView<R> {
	const byId = new Map<string, R>()
	const entries = new Map<string, Map<string, AccessEntry>>()
	const children = new Map<string, Set<string>>()
	const readers = new Map<string, Set<string>>()
	const add = (map: Map<string, Set<string>>, key: string, id: string) => {
		let set = map.get(key)
		if (!set) map.set(key, (set = new Set()))
		set.add(id)
	}
	const links = (record: R) => {
		const rule = model.getTypeRule(record.typeName)
		return {
			parent: rule?.parent(record) ?? null,
			alsoRead: [...(rule?.alsoRead?.(record) ?? []), ...(rule?.references?.(record) ?? [])],
		}
	}
	const index = (record: R) => {
		const { parent, alsoRead } = links(record)
		if (parent) add(children, parent, record.id)
		for (const other of alsoRead) add(readers, other, record.id)
		const entry = model.entryOf(record)
		if (!entry) return
		let list = entries.get(entry.resource)
		if (!list) entries.set(entry.resource, (list = new Map()))
		list.set(record.id, entry)
	}
	const unindex = (record: R) => {
		const { parent, alsoRead } = links(record)
		if (parent) children.get(parent)?.delete(record.id)
		for (const other of alsoRead) readers.get(other)?.delete(record.id)
		const entry = model.entryOf(record)
		if (entry) entries.get(entry.resource)?.delete(record.id)
	}
	for (const record of records instanceof Map ? records.values() : records) {
		byId.set(record.id, record)
		index(record)
	}
	const cache = new Map<string, AccessEntry[]>()
	return {
		get: (id) => byId.get(id),
		ids: () => byId.keys(),
		childrenOf: (id) => children.get(id) ?? [],
		readersOf: (id) => readers.get(id) ?? [],
		entriesAt(resource) {
			let list = cache.get(resource)
			if (!list) cache.set(resource, (list = [...(entries.get(resource)?.values() ?? [])]))
			return list
		},
		set(record) {
			const prev = byId.get(record.id)
			if (prev) unindex(prev)
			byId.set(record.id, record)
			index(record)
			cache.clear()
		},
		delete(id) {
			const prev = byId.get(id)
			if (!prev) return
			unindex(prev)
			byId.delete(id)
			cache.clear()
		},
	}
}

/**
 * A view of `base` with some records changed: what a push would leave behind.
 *
 * @public
 */
export function overlayAccessView<R extends UnknownRecord>(
	model: AccessModel<R>,
	base: AccessView<R>,
	changes: ReadonlyMap<string, R | null>
): AccessView<R> {
	const added = new Map<string, AccessEntry[]>()
	const changed = new Set<string>()
	for (const [id, next] of changes) {
		if (model.entryOf(base.get(id))) changed.add(id)
		const entry = model.entryOf(next)
		if (entry) {
			changed.add(id)
			const list = added.get(entry.resource) ?? []
			list.push(entry)
			added.set(entry.resource, list)
		}
	}
	return {
		get: (id) => (changes.has(id) ? (changes.get(id) ?? undefined) : base.get(id)),
		entriesAt(resource) {
			const fromBase = base.entriesAt(resource)
			const extra = added.get(resource)
			if (!changed.size) return fromBase
			// in-room entries are records, so they carry their id
			const kept = fromBase.filter((e) => !changed.has((e as Partial<UnknownRecord>).id ?? ''))
			return extra ? [...kept, ...extra] : kept
		},
	}
}
