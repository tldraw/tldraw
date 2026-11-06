import { UnknownRecord } from '@tldraw/store'
import { isEqual } from '@tldraw/utils'

/**
 * Who runs a command. The host sets it per session on the server; the server sends it to the
 * client at connect and on every change, so client and server run commands with the same actor.
 *
 * `permissions` are plain strings that commands name in {@link TLCommand.requires}. `'*'` gives
 * every permission. `'edit'` is the default permission for the free-form edit lane (raw record
 * diffs); see {@link TLEditPolicy}.
 *
 * @public
 */
export interface TLCommandActor {
	readonly userId: string | null
	readonly permissions: readonly string[]
}

/** @public */
export function actorCan(actor: TLCommandActor, permission: string | undefined): boolean {
	if (permission === undefined) return true
	return actor.permissions.includes('*') || actor.permissions.includes(permission)
}

/**
 * The actor for a session whose host gave none: all permissions, or none when read-only. This
 * matches how rooms behave without commands.
 *
 * @public
 */
export function defaultActor(isReadonly: boolean): TLCommandActor {
	return { userId: null, permissions: isReadonly ? [] : ['*'] }
}

/** The actor for server-initiated pushes. @internal */
export const SERVER_ACTOR: TLCommandActor = { userId: null, permissions: ['*'] }

/**
 * A command call on the wire. `args` must be JSON.
 *
 * @public
 */
export interface TLCommandCall {
	name: string
	args: unknown
}

/**
 * What a command sees while it runs. Reads see the command's own earlier writes. Writes are
 * buffered and applied only when the command returns, so a denied command writes nothing.
 *
 * A command must be deterministic for the same state, actor, and args: the client runs it
 * optimistically, the server runs it again, and the client runs it again on each rebase. Pass new
 * ids and other random values in `args`.
 *
 * @public
 */
export interface TLCommandContext<R extends UnknownRecord> {
	readonly actor: TLCommandActor
	get<T extends R = R>(id: T['id'] | string): T | undefined
	getAll<T extends R = R>(typeName: T['typeName']): T[]
	put(record: R): void
	update<T extends R>(id: T['id'], partial: Partial<Omit<T, 'id' | 'typeName'>>): T
	delete(id: R['id'] | string): void
	can(permission: string): boolean
	/** Stop the command. Nothing it wrote is applied. */
	deny(reason: string): never
}

/**
 * A named user action. The client sends `{ name, args }`, not the records it changes. The server
 * authorizes and runs the command as one unit.
 *
 * @public
 */
export interface TLCommand<R extends UnknownRecord = UnknownRecord, Args = any> {
	readonly name: string
	/** Validates the args. The server never trusts the client's args. */
	readonly args: { validate(value: unknown): Args }
	/** A permission the actor must have. Leave it out to let `run` decide alone. */
	readonly requires?: string
	run(ctx: TLCommandContext<R>, args: Args): void
}

/** @public */
export interface TLEditPolicyContext<R extends UnknownRecord> {
	readonly actor: TLCommandActor
	readonly op: 'create' | 'update' | 'delete'
	readonly prev: R | null
	readonly next: R | null
	get(id: string): R | undefined
}

/**
 * The rule for the free-form edit lane: record diffs that the editor makes for drags, resizes,
 * text edits, custom shapes, and anything else that has no named command.
 *
 * The same object runs on the client (to block the change before it applies) and on the server
 * (to discard the push). The server checks every record in a push first, and discards the whole
 * push if any record is denied, so a push never half-applies.
 *
 * @public
 */
export interface TLEditPolicy<R extends UnknownRecord> {
	/** The permission for the edit lane. Defaults to `'edit'`. */
	readonly requires?: string
	/** Record types that only commands may write. Raw writes of these types are always denied. */
	readonly commandOnlyTypes?: readonly string[]
	/**
	 * Record types that need no edit permission, such as tldraw's `user` records, which every
	 * editor writes on mount, read-only or not. `authorize` still runs for them.
	 */
	readonly openTypes?: readonly string[]
	authorize?(ctx: TLEditPolicyContext<R>): boolean
	/**
	 * Change a record that the actor creates through the edit lane, for example to stamp the
	 * owner. Runs on the client before the record is stored, and on the server again, where the
	 * server's result wins.
	 */
	stamp?(actor: TLCommandActor, record: R): R
}

/**
 * The commands and edit policy for a room. Share one instance between client and server.
 *
 * @public
 */
export interface TLCommandSet<R extends UnknownRecord = UnknownRecord> {
	readonly commands: ReadonlyMap<string, TLCommand<R>>
	readonly edit: TLEditPolicy<R>
}

/** @public */
export function defineCommand<R extends UnknownRecord, Args>(
	command: TLCommand<R, Args>
): TLCommand<R, Args> {
	return command
}

/** @public */
export function defineCommandSet<R extends UnknownRecord>(opts: {
	commands?: readonly TLCommand<R, any>[]
	edit?: TLEditPolicy<R>
}): TLCommandSet<R> {
	const commands = new Map<string, TLCommand<R>>()
	for (const command of opts.commands ?? []) {
		if (commands.has(command.name)) throw new Error(`Duplicate command: ${command.name}`)
		commands.set(command.name, command)
	}
	return { commands, edit: opts.edit ?? {} }
}

/** Thrown by {@link TLCommandContext.deny}. @public */
export class TLCommandDenied extends Error {
	constructor(readonly reason: string) {
		super(reason)
		this.name = 'TLCommandDenied'
	}
}

/** What a command run wrote, as final records. @public */
export interface TLCommandWrites<R extends UnknownRecord> {
	puts: R[]
	deletes: string[]
}

/** @public */
export type TLCommandResult<R extends UnknownRecord> =
	| { ok: true; writes: TLCommandWrites<R> }
	| { ok: false; reason: string }

/** The read side a command runs against: the client store or the server transaction. @public */
export interface TLCommandReader<R extends UnknownRecord> {
	get(id: string): R | undefined
	values(): Iterable<R>
}

/**
 * Run one command call against a reader. Returns the buffered writes, or the reason it was
 * denied. Never writes to the reader. The client and the server both use this function.
 *
 * @public
 */
export function runCommand<R extends UnknownRecord>(
	set: TLCommandSet<R>,
	reader: TLCommandReader<R>,
	actor: TLCommandActor,
	call: TLCommandCall
): TLCommandResult<R> {
	const command = set.commands.get(call.name)
	if (!command) return { ok: false, reason: `unknown command: ${call.name}` }
	if (!actorCan(actor, command.requires)) {
		return { ok: false, reason: `missing permission: ${command.requires}` }
	}
	let args: unknown
	try {
		args = command.args.validate(call.args)
	} catch (e) {
		return { ok: false, reason: `invalid args: ${(e as Error).message}` }
	}

	const puts = new Map<string, R>()
	const deletes = new Set<string>()
	const get = (id: string): R | undefined => {
		if (deletes.has(id)) return undefined
		return puts.get(id) ?? reader.get(id)
	}
	const ctx: TLCommandContext<R> = {
		actor,
		get: get as TLCommandContext<R>['get'],
		getAll: ((typeName: string) => {
			const out = new Map<string, R>()
			for (const record of reader.values()) {
				if (record.typeName === typeName && !deletes.has(record.id)) out.set(record.id, record)
			}
			for (const record of puts.values()) {
				if (record.typeName === typeName) out.set(record.id, record)
			}
			return [...out.values()]
		}) as TLCommandContext<R>['getAll'],
		put(record) {
			deletes.delete(record.id)
			puts.set(record.id, record)
		},
		update(id, partial) {
			const prev = get(id)
			if (!prev) throw new TLCommandDenied(`not found: ${id}`)
			const next = { ...prev, ...partial } as R
			puts.set(id, next)
			return next as any
		},
		delete(id) {
			puts.delete(id)
			deletes.add(id)
		},
		can: (permission) => actorCan(actor, permission),
		deny(reason) {
			throw new TLCommandDenied(reason)
		},
	}

	try {
		command.run(ctx, args)
	} catch (e) {
		if (e instanceof TLCommandDenied) return { ok: false, reason: e.reason }
		throw e
	}

	const finalPuts: R[] = []
	for (const [id, record] of puts) {
		const prev = reader.get(id)
		if (prev && isEqual(prev, record)) continue
		finalPuts.push(record)
	}
	return {
		ok: true,
		writes: { puts: finalPuts, deletes: [...deletes].filter((id) => reader.get(id) !== undefined) },
	}
}

/**
 * Check one record change against the edit lane. The client and the server both use this
 * function.
 *
 * @public
 */
export function canEditRecord<R extends UnknownRecord>(
	set: TLCommandSet<R>,
	actor: TLCommandActor,
	ctx: Omit<TLEditPolicyContext<R>, 'actor'>
): boolean {
	const { edit } = set
	// the stored type decides the rule; a patch cannot pick its own branch by changing typeName
	const typeName = (ctx.prev ?? ctx.next)!.typeName
	if (ctx.prev && ctx.next && ctx.prev.typeName !== ctx.next.typeName) return false
	if (edit.commandOnlyTypes?.includes(typeName)) return false
	if (!edit.openTypes?.includes(typeName) && !actorCan(actor, edit.requires ?? 'edit')) return false
	return edit.authorize ? edit.authorize({ ...ctx, actor }) : true
}
