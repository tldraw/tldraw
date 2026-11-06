import { UnknownRecord } from './BaseRecord'

/**
 * One access that a permission chain decides on: a write of one record (`create`, `update`,
 * `delete`), a read of one record, or a named action.
 *
 * @public
 */
export type RecordAccess<R extends UnknownRecord> =
	| { readonly type: 'create'; readonly prev: null; readonly next: R }
	| { readonly type: 'update'; readonly prev: R; readonly next: R }
	| { readonly type: 'delete'; readonly prev: R; readonly next: null }
	| { readonly type: 'read'; readonly record: R }
	| { readonly type: 'action'; readonly name: string; readonly record?: R }

/**
 * The kind of a {@link PermissionBatch}. Each batch holds one kind of access only.
 *
 * @public
 */
export type PermissionBatchKind = 'write' | 'read' | 'action'

/**
 * What a permission middleware gets: the actor, all accesses of one batch, and a way to read
 * other records.
 *
 * A write batch is one client operation on the client (one `store.atomic` call) and one push on
 * the server. A read batch is the set of records that one session is about to receive.
 *
 * @public
 */
export interface PermissionBatch<R extends UnknownRecord, Actor> {
	readonly kind: PermissionBatchKind
	readonly actor: Actor
	readonly items: readonly RecordAccess<R>[]
	/** The stored record, before this batch. */
	get(id: string): R | undefined
	/**
	 * The record as this batch proposes it: the `next` of a write in the batch, `undefined` for a
	 * delete in the batch, or else the stored record. Lets a rule check a record against a parent
	 * that the same batch creates or moves. It shows the batch as it came in, not after the
	 * decisions of other layers.
	 */
	getAfter(id: string): R | undefined
}

/**
 * A record access that the chain denied, and why.
 *
 * @public
 */
export interface PermissionDenial<R extends UnknownRecord> {
	readonly access: RecordAccess<R>
	readonly reason: string
}

/**
 * The decision of a chain on a batch. `allowed` holds the accesses to apply, maybe changed (for
 * example a stamped `next`, or a redacted `record`). Every access of the input batch is in
 * `allowed` or in `denied`.
 *
 * @public
 */
export interface PermissionResult<R extends UnknownRecord> {
	readonly allowed: readonly RecordAccess<R>[]
	readonly denied: readonly PermissionDenial<R>[]
}

/**
 * Runs the rest of the chain. With no argument it passes the batch as it is. Pass a smaller list
 * to drop accesses (they are denied with the reason `'denied'`), or changed accesses to change
 * what the next layers see.
 *
 * @public
 */
export type PermissionNext<R extends UnknownRecord> = (
	items?: readonly RecordAccess<R>[]
) => PermissionResult<R>

/**
 * One layer of a {@link PermissionChain}. A layer can:
 *
 * - pass: `return next()`
 * - deny all: `return denyAll(batch, 'reason')`
 * - deny some, or change some, then pass: `return next(changedItems)`
 * - look at what the rest of the chain decided, and change it: `const result = next(); ...`
 *
 * The same layer runs on the client (to stop a write before it is sent, and to tell the UI) and
 * on the server (to enforce). It must be synchronous and must not do I/O.
 *
 * @public
 */
export type PermissionMiddleware<R extends UnknownRecord, Actor> = (
	batch: PermissionBatch<R, Actor>,
	next: PermissionNext<R>
) => PermissionResult<R>

/**
 * The key that identifies an access in a batch. Two accesses in one batch never share a key.
 *
 * @public
 */
export function getRecordAccessKey(access: RecordAccess<UnknownRecord>): string {
	switch (access.type) {
		case 'create':
		case 'update':
			return access.next.id
		case 'delete':
			return access.prev.id
		case 'read':
			return access.record.id
		case 'action':
			return access.record ? `${access.name}:${access.record.id}` : access.name
	}
}

/**
 * A result that denies every access of the batch.
 *
 * @public
 */
export function denyAll<R extends UnknownRecord>(
	batch: Pick<PermissionBatch<R, unknown>, 'items'>,
	reason: string
): PermissionResult<R> {
	return { allowed: [], denied: batch.items.map((access) => ({ access, reason })) }
}

function kindOf(access: RecordAccess<UnknownRecord>): PermissionBatchKind {
	return access.type === 'read' ? 'read' : access.type === 'action' ? 'action' : 'write'
}

/**
 * An ordered list of {@link PermissionMiddleware} layers. The first layer added runs first, and
 * the end of the chain allows what reaches it. A chain with no layers allows everything.
 *
 * One chain serves reads, writes and actions on the client and on the server. The host gives the
 * actor: on the server it comes from the session, on the client from props.
 *
 * @example
 * ```ts
 * const permissions = new PermissionChain<TLRecord, { userId: string; role: 'teacher' | 'student' }>()
 * 	.use(atomic())
 * 	.use(
 * 		allow((access, { actor }) => {
 * 			if (access.type === 'read' || actor.role === 'teacher') return
 * 			const shape = access.prev ?? access.next
 * 			if (shape.typeName === 'shape' && shape.meta.ownerId !== actor.userId) return 'not your shape'
 * 		})
 * 	)
 * ```
 *
 * @public
 */
export class PermissionChain<R extends UnknownRecord, Actor> {
	private readonly layers: PermissionMiddleware<R, Actor>[] = []

	constructor(...layers: (PermissionMiddleware<R, Actor> | PermissionChain<R, Actor>)[]) {
		this.use(...layers)
	}

	/** Add layers at the end. A chain added as a layer runs its own layers in place. */
	use(...layers: (PermissionMiddleware<R, Actor> | PermissionChain<R, Actor>)[]): this {
		for (const layer of layers) {
			if (layer instanceof PermissionChain) this.layers.push(...layer.layers)
			else this.layers.push(layer)
		}
		return this
	}

	/**
	 * Run the chain on one batch. It fails closed: if a layer throws, every access is denied with the
	 * reason `'error'`, and `onError` is called. A layer that changes an access's id or typeName is a
	 * bug too: `onError` is called, and the access is denied. Accesses that a layer dropped are denied with the reason `'denied'`. An
	 * allowed access whose kind, type, id or typeName was changed by a layer is denied with the
	 * reason `'invalid change'`.
	 */
	run(opts: {
		kind: PermissionBatchKind
		actor: Actor
		items: readonly RecordAccess<R>[]
		get(id: string): R | undefined
		onError?(error: unknown): void
	}): PermissionResult<R> {
		const { kind, actor, items, get } = opts
		if (items.length === 0) return { allowed: [], denied: [] }
		if (this.layers.length === 0) return { allowed: items, denied: [] }

		let proposed: Map<string, R | null> | null = null
		const getAfter = (id: string) => {
			if (kind !== 'write') return get(id)
			if (!proposed) {
				proposed = new Map()
				for (const access of items) {
					if (access.type === 'create' || access.type === 'update') {
						proposed.set(access.next.id, access.next)
					} else if (access.type === 'delete') proposed.set(access.prev.id, null)
				}
			}
			const after = proposed.get(id)
			return after === null ? undefined : (after ?? get(id))
		}
		const makeBatch = (batchItems: readonly RecordAccess<R>[]): PermissionBatch<R, Actor> => ({
			kind,
			actor,
			items: batchItems,
			get,
			getAfter,
		})

		const dispatch = (
			index: number,
			batchItems: readonly RecordAccess<R>[]
		): PermissionResult<R> => {
			if (index === this.layers.length) return { allowed: batchItems, denied: [] }
			const batch = makeBatch(batchItems)
			return this.layers[index](batch, (nextItems = batchItems) => dispatch(index + 1, nextItems))
		}

		let result: PermissionResult<R>
		try {
			result = dispatch(0, items)
		} catch (error) {
			opts.onError?.(error)
			return denyAll({ items }, 'error')
		}

		// Normalize: the result must account for each input access exactly once.
		const inputs = new Map<string, RecordAccess<R>>()
		for (const access of items) inputs.set(getRecordAccessKey(access), access)
		const allowed: RecordAccess<R>[] = []
		const denied: PermissionDenial<R>[] = []
		const seen = new Set<string>()
		for (const denial of result.denied) {
			const key = getRecordAccessKey(denial.access)
			const input = inputs.get(key)
			if (!input || seen.has(key)) continue
			seen.add(key)
			denied.push({ access: input, reason: denial.reason })
		}
		for (const access of result.allowed) {
			const key = getRecordAccessKey(access)
			const input = inputs.get(key)
			if (!input || seen.has(key)) {
				if (!input)
					opts.onError?.(new Error(`a layer allowed an access that is not in the batch: ${key}`))
				continue
			}
			seen.add(key)
			if (!isSameTarget(input, access) || kindOf(access) !== kind) {
				opts.onError?.(new Error(`a layer changed the type, id or typeName of ${key}`))
				denied.push({ access: input, reason: 'invalid change' })
			} else {
				allowed.push(access)
			}
		}
		for (const [key, access] of inputs) {
			if (!seen.has(key)) denied.push({ access, reason: 'denied' })
		}
		return { allowed, denied }
	}

	/**
	 * Whether the actor may do a named action, for example a menu action or a server endpoint such
	 * as "rename file". With no layer that handles actions, the answer is `true`.
	 */
	can(opts: {
		actor: Actor
		action: string
		record?: R
		get?(id: string): R | undefined
	}): boolean {
		const { actor, action, record, get = () => undefined } = opts
		return (
			this.run({
				kind: 'action',
				actor,
				items: [{ type: 'action', name: action, record }],
				get,
			}).denied.length === 0
		)
	}
}

function isSameTarget<R extends UnknownRecord>(a: RecordAccess<R>, b: RecordAccess<R>) {
	if (a.type !== b.type) return false
	const recordOf = (access: RecordAccess<R>) =>
		access.type === 'read'
			? access.record
			: access.type === 'action'
				? access.record
				: (access.next ?? access.prev)
	const ra = recordOf(a)
	const rb = recordOf(b)
	if (!ra || !rb) return ra === rb
	if (a.type === 'update' && b.type === 'update' && a.prev !== b.prev) return false
	return ra.id === rb.id && ra.typeName === rb.typeName
}

/**
 * The record that an access is about: `next` for a create or update, `prev` for a delete, the
 * record for a read, and the target (if any) for an action.
 *
 * @public
 */
export function getAccessRecord<R extends UnknownRecord>(access: RecordAccess<R>): R | undefined {
	switch (access.type) {
		case 'create':
		case 'update':
			return access.next
		case 'delete':
			return access.prev
		case 'read':
			return access.record
		case 'action':
			return access.record
	}
}

/**
 * A layer that checks each access on its own. The test returns `false` or a reason string to deny
 * the access, and `true` or nothing to pass it to the next layer. This is the per-record check of
 * a hook API (`canRead`, `canWrite`) as one layer.
 *
 * @public
 */
export function allow<R extends UnknownRecord, Actor>(
	test: (access: RecordAccess<R>, batch: PermissionBatch<R, Actor>) => boolean | string | void
): PermissionMiddleware<R, Actor> {
	return (batch, next) => {
		const passed: RecordAccess<R>[] = []
		const denied: PermissionDenial<R>[] = []
		for (const access of batch.items) {
			const verdict = test(access, batch)
			if (verdict === undefined || verdict === true) passed.push(access)
			else denied.push({ access, reason: typeof verdict === 'string' ? verdict : 'denied' })
		}
		if (denied.length === 0) return next()
		const result = next(passed)
		return { allowed: result.allowed, denied: [...denied, ...result.denied] }
	}
}

/**
 * A layer that changes each access on its own before the next layers see it: stamp a field on
 * write, or redact a field on read. Return a changed access, or nothing to keep it. This is the
 * record-changing part of a hook API (`beforeWrite`, `beforeRead`) as one layer.
 *
 * @public
 */
export function rewrite<R extends UnknownRecord, Actor>(
	fn: (access: RecordAccess<R>, batch: PermissionBatch<R, Actor>) => RecordAccess<R> | void
): PermissionMiddleware<R, Actor> {
	return (batch, next) => {
		let changed = false
		const items = batch.items.map((access) => {
			const result = fn(access, batch)
			if (!result || result === access) return access
			changed = true
			return result
		})
		return changed ? next(items) : next()
	}
}

/**
 * A layer that makes write batches all or nothing: if a later layer denies any write, it denies
 * all writes of the batch. Put it first. On the server this stops a push from being applied in
 * part (for example an arrow without its binding). Reads and actions pass through.
 *
 * @public
 */
export function atomic<R extends UnknownRecord, Actor>(): PermissionMiddleware<R, Actor> {
	return (batch, next) => {
		const result = next()
		if (batch.kind !== 'write' || result.denied.length === 0) return result
		const reason = `atomic: ${result.denied[0].reason}`
		return {
			allowed: [],
			denied: batch.items.map((access) => {
				const own = result.denied.find(
					(d) => getRecordAccessKey(d.access) === getRecordAccessKey(access)
				)
				return { access, reason: own?.reason ?? reason }
			}),
		}
	}
}
