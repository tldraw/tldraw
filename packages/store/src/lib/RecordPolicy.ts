import { UnknownRecord } from './BaseRecord'

/**
 * Who makes a request. The host creates one actor per user (or per session, token, or agent) from
 * its own auth, and gives the same actor to the editor and to the sync server.
 *
 * `id` is `null` for an anonymous actor. A rule that compares owners must treat `null` as "owns
 * nothing": {@link isOwnedBy} does this.
 *
 * `can(action)` answers for the actor's coarse grants, such as `'document:write'` or
 * `'comments:write'`. The host decides the names and how roles expand to them.
 *
 * @public
 */
export interface PolicyActor {
	readonly id: string | null
	can(action: string): boolean
}

/**
 * Makes a {@link PolicyActor} from an id and a list of actions.
 *
 * @example
 * ```ts
 * const viewer = createPolicyActor({ id: 'ann', actions: [] })
 * const editor = createPolicyActor({ id: 'bob', actions: ['document:write', 'comments:write'] })
 * ```
 *
 * @public
 */
export function createPolicyActor(opts: {
	id: string | null
	actions: Iterable<string>
}): PolicyActor {
	const actions = new Set(opts.actions)
	return { id: opts.id, can: (action) => actions.has(action) }
}

/**
 * True when `ownerId` is the actor's id. An anonymous actor (`id: null`) and a missing owner never
 * match, so `undefined === undefined` cannot pass an owner check.
 *
 * @public
 */
export function isOwnedBy(actor: PolicyActor, ownerId: unknown): boolean {
	return actor.id !== null && typeof ownerId === 'string' && ownerId === actor.id
}

/**
 * One request to a policy. `create`, `update`, and `delete` are writes. `read` decides if a
 * session receives a record. `action` is a named operation that the record type defines, such as
 * `resolve` on a comment thread.
 *
 * @public
 */
export type PolicyRequest<R extends UnknownRecord = UnknownRecord> =
	| { readonly verb: 'create'; readonly next: R }
	| { readonly verb: 'update'; readonly prev: R; readonly next: R }
	| { readonly verb: 'delete'; readonly prev: R }
	| { readonly verb: 'read'; readonly record: R }
	| { readonly verb: 'action'; readonly action: string; readonly record: R }

/**
 * What every rule gets.
 *
 * - `get` reads other records. During a write it sees the end state of the whole transaction, on
 *   the client and on the server.
 * - `authorize` asks the policy of another record, for example "may this actor update the shape
 *   that this binding points to?".
 * - `base` gives the answer of the layer below this one (see {@link RecordPolicy}). A rule that
 *   only narrows returns `ctx.base() && …`. A rule that widens returns `ctx.base() || …`.
 *
 * @public
 */
export interface PolicyContext {
	readonly actor: PolicyActor
	can(action: string): boolean
	get(id: string): UnknownRecord | undefined
	authorize(request: PolicyRequest): boolean
	base(): boolean
}

/**
 * The access rules of one record type. Each rule is optional and returns `true` to allow.
 *
 * Policies are layered. From the bottom:
 *
 * 1. the schema default (in tldraw: every write needs `document:write`, reads are open);
 * 2. the record type's own policy (for example the comment policy);
 * 3. for shapes and bindings, the policy of the shape or binding type (`ShapeUtil.policy`);
 * 4. the host's policy for that type (`createTLSchema({ policies })`).
 *
 * The top layer that defines a rule decides. It can call `ctx.base()` to use the layer below.
 * A rule that throws, or returns anything except `true`, denies (fail closed).
 *
 * The same policy runs in the editor, before a change is applied, and on the sync server, before
 * a push is committed. Rules must be pure and synchronous.
 *
 * @public
 */
export interface RecordPolicy<R extends UnknownRecord = UnknownRecord> {
	read?(ctx: PolicyContext & { readonly record: R }): boolean
	create?(ctx: PolicyContext & { readonly next: R }): boolean
	update?(ctx: PolicyContext & { readonly prev: R; readonly next: R }): boolean
	delete?(ctx: PolicyContext & { readonly prev: R }): boolean
	/** Named operations of this type, checked with `{ verb: 'action', action, record }`. */
	readonly actions?: {
		readonly [action: string]: (ctx: PolicyContext & { readonly record: R }) => boolean
	}
}

type Verb = 'read' | 'create' | 'update' | 'delete'

/** @internal */
export type PolicyRule = (ctx: any) => boolean

/** @internal */
export function getPolicyRule(
	policy: RecordPolicy<any> | undefined,
	request: PolicyRequest
): PolicyRule | undefined {
	if (!policy) return undefined
	if (request.verb === 'action') return policy.actions?.[request.action]
	return policy[request.verb as Verb]
}

/** The record a request is about. On update, the stored record decides the type. */
/** @internal */
export function getPolicySubject(request: PolicyRequest): UnknownRecord {
	switch (request.verb) {
		case 'create':
			return request.next
		case 'update':
		case 'delete':
			return request.prev
		default:
			return request.record
	}
}

/**
 * Runs `rule` with `ctx` and returns `true` only for a result of exactly `true`. A rule that
 * throws, or returns a Promise or a truthy value, denies.
 *
 * @internal
 */
export function runPolicyRule(rule: PolicyRule, ctx: object): boolean {
	try {
		return rule(ctx) === true
	} catch {
		return false
	}
}

/**
 * Puts `upper` on top of `lower`. Each rule of `upper` replaces the rule of `lower` with the same
 * name, and gets `lower`'s answer through `ctx.base()`. Rules that `upper` does not define come
 * from `lower`.
 *
 * Use it to build a policy from parts, for example the default shape policy plus the classroom
 * rules.
 *
 * @public
 */
export function layerPolicies<R extends UnknownRecord>(
	lower: RecordPolicy<R> | undefined,
	upper: RecordPolicy<R> | undefined
): RecordPolicy<R> {
	if (!lower) return upper ?? {}
	if (!upper) return lower
	const layered: any = {}
	for (const verb of ['read', 'create', 'update', 'delete'] as const) {
		const u = upper[verb] as PolicyRule | undefined
		const l = lower[verb] as PolicyRule | undefined
		layered[verb] = layerRule(l, u)
	}
	const actionNames = new Set([
		...Object.keys(lower.actions ?? {}),
		...Object.keys(upper.actions ?? {}),
	])
	if (actionNames.size) {
		layered.actions = {}
		for (const name of actionNames) {
			layered.actions[name] = layerRule(lower.actions?.[name], upper.actions?.[name])
		}
	}
	return layered
}

function layerRule(lower: PolicyRule | undefined, upper: PolicyRule | undefined) {
	if (!upper) return lower
	if (!lower) return upper
	return (ctx: PolicyContext) =>
		upper({ ...ctx, base: () => runPolicyRule(lower, ctx) } satisfies PolicyContext)
}

/**
 * Picks a policy by a field of the record, for record types that hold several kinds, such as
 * shapes (`type`) and bindings (`type`). The kind's policy is layered on top of `base`.
 *
 * @internal
 */
export function createKindPolicy<R extends UnknownRecord>(
	base: RecordPolicy<R> | undefined,
	kinds: Record<string, RecordPolicy<any> | undefined>,
	kindOf: (record: R) => string
): RecordPolicy<R> | undefined {
	const layered = new Map<string, RecordPolicy<R>>()
	for (const [kind, policy] of Object.entries(kinds)) {
		if (policy) layered.set(kind, layerPolicies(base, policy))
	}
	if (layered.size === 0) return base
	const pick = (record: R) => layered.get(kindOf(record)) ?? base
	const dispatch = (verb: Verb) => (ctx: any) => {
		const subject: R = verb === 'create' ? ctx.next : verb === 'read' ? ctx.record : ctx.prev
		const rule = pick(subject)?.[verb] as PolicyRule | undefined
		return rule ? rule(ctx) : ctx.base()
	}
	const actionNames = new Set<string>(Object.keys(base?.actions ?? {}))
	for (const p of layered.values()) for (const n of Object.keys(p.actions ?? {})) actionNames.add(n)
	const actions: Record<string, PolicyRule> = {}
	for (const name of actionNames) {
		actions[name] = (ctx: any) => {
			const rule = pick(ctx.record)?.actions?.[name]
			return rule ? rule(ctx) : ctx.base()
		}
	}
	return {
		read: dispatch('read'),
		create: dispatch('create'),
		update: dispatch('update'),
		delete: dispatch('delete'),
		actions,
	}
}
