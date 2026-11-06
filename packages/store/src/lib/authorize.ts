import type { RecordId, UnknownRecord } from './BaseRecord'

/**
 * An action on one record. The sync server asks `create`, `update`, and `delete` for each client
 * write, and `read` for each record it sends to a session. The editor asks the same actions before
 * and after each local change.
 *
 * @public
 */
export type AuthorizeRecordAction = 'read' | 'create' | 'update' | 'delete'

/**
 * An action that the host or a plugin names, such as `comments:moderate` or `tool:draw`. The name
 * must contain a colon, so it can never be one of the {@link AuthorizeRecordAction}s.
 *
 * @public
 */
export type AuthorizeCustomAction = `${string}:${string}`

/**
 * What the caller asks about: an action, and the record it applies to.
 *
 * - `record` is the record as it is now. On `create` it is the new record.
 * - `next` is the record after an update. It is `undefined` in a pre-check: the editor asks "may I
 *   change this record at all?" before it knows the change, for example to show handles or to
 *   let a user select the shape. A rule that reads `next` must allow for that.
 *
 * @public
 */
export type AuthorizeRequest<R extends UnknownRecord> =
	| { action: 'read'; record: R; next?: undefined }
	| { action: 'create'; record: R; next?: undefined }
	| { action: 'update'; record: R; next: R | undefined }
	| { action: 'delete'; record: R; next?: undefined }
	| { action: AuthorizeCustomAction; record?: R; next?: undefined }

/**
 * Reads another record, as the side that runs the check holds it. On the server this is the stored
 * record, including earlier writes in the same push. On the client this is the editor's store.
 *
 * @public
 */
export interface AuthorizeGet {
	<Id extends RecordId<UnknownRecord>>(id: Id): Id['__type__'] | undefined
	(id: string): UnknownRecord | undefined
}

/**
 * The argument to an {@link Authorize} function.
 *
 * @public
 */
export type AuthorizeContext<R extends UnknownRecord, Actor> = AuthorizeRequest<R> & {
	/** Who acts. On the server, the session's `meta`. On the client, the editor's actor. */
	actor: Actor
	/** Reads another record. See {@link AuthorizeGet}. */
	get: AuthorizeGet
	/**
	 * Asks the same function about another action, for the same actor. A write rule can delegate to
	 * a named action, so that the UI and the write path ask one question: for example, an update
	 * that flips `revealed` on a card can return `can('cards:reveal', record)`.
	 */
	can(action: AuthorizeRecordAction | AuthorizeCustomAction, record?: R): boolean
}

/**
 * A denial with a reason that the UI can show.
 *
 * @public
 */
export interface AuthorizeDenial {
	deny: string
}

/**
 * What an {@link Authorize} function returns:
 *
 * - `true` allows.
 * - `false` or `{ deny: reason }` denies.
 * - `undefined` abstains. A record action that no rule denies is allowed, because the session's
 *   access (`isReadonly`, `objectAccess`) is the base gate and rules only narrow it. A custom
 *   action that no rule allows is denied.
 * - `{ record }` allows, and replaces the record: on `create` and `update` the stored record (for
 *   example, stamp an author), on `read` the copy that the session receives (for example, hide a
 *   card's face). It must keep the `id` and `typeName`. It is ignored on `delete` and on custom
 *   actions.
 *
 * @public
 */
export type AuthorizeResult<R extends UnknownRecord> =
	| boolean
	| undefined
	| void
	| AuthorizeDenial
	| { record: R }

/**
 * One function that decides every permission question about a room's records: reads, writes,
 * UI pre-checks, and custom actions. The same function runs on the sync server and in the editor.
 *
 * It must be synchronous, fast, and free of I/O, because the server calls it for each record of
 * each push and for each record that it sends to each session. A throw denies (fail closed).
 *
 * @example
 * ```ts
 * const authorize: Authorize<TLRecord, { userId: string; role: 'teacher' | 'student' }> = (ctx) => {
 * 	if (ctx.actor.role === 'teacher') return true
 * 	if (ctx.record?.typeName !== 'shape') return undefined
 * 	if (ctx.action === 'create') return { record: { ...ctx.record, meta: { ownerId: ctx.actor.userId } } }
 * 	if (ctx.action === 'update' || ctx.action === 'delete') {
 * 		return ctx.record.meta.ownerId === ctx.actor.userId || { deny: 'This is not your shape' }
 * 	}
 * }
 * ```
 *
 * @public
 */
export type Authorize<R extends UnknownRecord, Actor> = (
	ctx: AuthorizeContext<R, Actor>
) => AuthorizeResult<R>

/**
 * The normalized answer of {@link runAuthorize}.
 *
 * @public
 */
export type AuthorizeDecision<R extends UnknownRecord> =
	| { allowed: true; record?: R }
	| { allowed: false; reason?: string }

// `can()` re-enters the function. A rule that asks itself in a cycle must not hang the server.
const MAX_DEPTH = 8

function isCustomAction(action: string): action is AuthorizeCustomAction {
	return action.includes(':')
}

/**
 * Runs an {@link Authorize} function for one request, and normalizes the result. The sync server
 * and the editor both call this, so the defaults are the same on both sides:
 *
 * - a record action with no record denies;
 * - with no `authorize`, a record action is allowed and a custom action is denied;
 * - a throw denies, and is passed to `onError`;
 * - an abstain allows a record action, and denies a custom action;
 * - a replacement record with a different `id` or `typeName` denies.
 *
 * @public
 */
export function runAuthorize<R extends UnknownRecord, Actor>(
	authorize: Authorize<R, Actor> | null,
	request: AuthorizeRequest<R>,
	env: { actor: Actor; get: AuthorizeGet; onError?(error: unknown): void },
	depth = 0
): AuthorizeDecision<R> {
	// A record action is always about a record: without one there is nothing to allow.
	if (!isCustomAction(request.action) && !request.record) return { allowed: false }
	if (!authorize) return { allowed: !isCustomAction(request.action) }
	if (depth > MAX_DEPTH) {
		env.onError?.(new Error(`authorize: can() nested more than ${MAX_DEPTH} levels`))
		return { allowed: false }
	}
	const can = (action: AuthorizeRecordAction | AuthorizeCustomAction, record?: R) => {
		const nested = { action, record, next: undefined } as AuthorizeRequest<R>
		return runAuthorize(authorize, nested, env, depth + 1).allowed
	}
	let result: AuthorizeResult<R>
	try {
		result = authorize({ ...request, actor: env.actor, get: env.get, can } as AuthorizeContext<
			R,
			Actor
		>)
	} catch (error) {
		env.onError?.(error)
		return { allowed: false }
	}
	if (result === true) return { allowed: true }
	if (result === false) return { allowed: false }
	if (result === undefined || result === null) {
		return isCustomAction(request.action) ? { allowed: false } : { allowed: true }
	}
	if (typeof result !== 'object') return { allowed: false }
	if ('deny' in result) return { allowed: false, reason: result.deny }
	if ('record' in result) {
		const target = request.action === 'update' ? (request.next ?? request.record) : request.record
		if (request.action === 'delete' || isCustomAction(request.action) || !target) {
			return { allowed: true }
		}
		const record = result.record
		if (!record || record.id !== target.id || record.typeName !== target.typeName) {
			env.onError?.(new Error('authorize: a replacement record must keep its id and typeName'))
			return { allowed: false }
		}
		return { allowed: true, record }
	}
	return { allowed: false }
}

/**
 * Combines several {@link Authorize} functions into one, so that a package (comments, a plugin)
 * and the host can each add rules without one central file.
 *
 * The functions run in order. A denial wins at once. A replacement record is passed on: later
 * functions see it as `record` (on `create` and `read`) or as `next` (on `update`). The result
 * allows if any function allows, and abstains if all abstain.
 *
 * @public
 */
export function combineAuthorize<R extends UnknownRecord, Actor>(
	...fns: Authorize<R, Actor>[]
): Authorize<R, Actor> {
	if (fns.length === 1) return fns[0]
	return (ctx) => {
		let current = ctx
		let allowed = false
		let replaced = false
		for (const fn of fns) {
			const result = fn(current)
			if (result === undefined || result === null) continue
			if (result === true) {
				allowed = true
				continue
			}
			if (result === false || typeof result !== 'object' || 'deny' in result) return result
			if ('record' in result) {
				allowed = true
				replaced = true
				current =
					current.action === 'update'
						? { ...current, next: result.record }
						: ({ ...current, record: result.record } as typeof current)
			}
		}
		if (replaced) {
			return { record: (current.action === 'update' ? current.next : current.record) as R }
		}
		return allowed ? true : undefined
	}
}
