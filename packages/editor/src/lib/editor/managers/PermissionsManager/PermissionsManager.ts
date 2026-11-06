import { atom, Atom } from '@tldraw/state'
import {
	Authorize,
	AuthorizeCustomAction,
	AuthorizeDecision,
	AuthorizeRecordAction,
	AuthorizeRequest,
	runAuthorize,
	StoreWriteGateChange,
} from '@tldraw/store'
import { TLRecord, TLShape } from '@tldraw/tlschema'
import type { Editor } from '../../Editor'
import { EditorManager } from '../EditorManager'

/**
 * The editor's permission rules: the same {@link @tldraw/store#Authorize} function that the sync
 * server runs, and the actor that it checks for. On the client the actor is not a security
 * boundary. The server must run the same function.
 *
 * @public
 */
export interface TLEditorPermissions<Actor = any> {
	authorize: Authorize<TLRecord, Actor>
	actor: Actor
}

/**
 * The last write that `authorize` denied, and why. `source` is `'editor'` when the editor
 * reverted it at once, and `'server'` when the sync room denied it and the client rolled it back.
 *
 * @public
 */
export interface TLPermissionDenial {
	action: AuthorizeRecordAction
	recordId: TLRecord['id']
	reason: string | null
	source: 'editor' | 'server'
	time: number
}

/**
 * Asks the editor's `authorize` function, and stops local writes that it denies.
 *
 * - `can()` and `check()` answer UI questions. A shape that the actor cannot update behaves as
 *   locked: it cannot be selected, moved, or deleted.
 * - After each top-level user operation, the store asks `authorize` about every document record
 *   that the operation changed. If one is denied, the whole operation is reverted, with its side
 *   effects. A replacement record (a stamp) is applied at once. Remote changes and snapshot loads
 *   are not checked.
 *
 * With no `authorize`, every record action is allowed, and every custom action is denied.
 *
 * @public
 */
export class PermissionsManager extends EditorManager {
	private readonly _authorize: Authorize<TLRecord, unknown> | null
	private readonly _actor: Atom<unknown>
	private readonly _lastDenial = atom<TLPermissionDenial | null>('lastDenial', null)
	// Hit tests ask this for every candidate shape on every pointer move, so it is cached per
	// shape and recomputed only when the shape, a record the rule reads, or the actor changes.
	private readonly _lockedCache = this.editor.store.createComputedCache<boolean, TLShape>(
		'permissions locked',
		(shape) => !this.can('update', shape)
	)

	constructor(editor: Editor, permissions?: TLEditorPermissions) {
		super(editor)
		this._authorize = permissions?.authorize ?? null
		this._actor = atom('permissions actor', permissions?.actor ?? null)
	}

	/**
	 * Starts checking local writes. The editor calls this at the end of its constructor, because
	 * the writes that set up the editor's own state are not the actor's.
	 *
	 * @internal
	 */
	startWriteGate() {
		if (!this._authorize) return
		this.editor.store.setWriteGate((changes) => this.checkOperation(changes))
		this.register(() => this.editor.store.setWriteGate(null))
	}

	/** Whether the editor has an `authorize` function. */
	isEnabled() {
		return this._authorize !== null
	}

	/** The actor that the rules check for. */
	getActor<Actor = unknown>(): Actor {
		return this._actor.get() as Actor
	}

	/**
	 * Replaces the actor, for example when the server reports a new role. Every `can()` answer
	 * updates reactively.
	 */
	setActor(actor: unknown) {
		this._actor.set(actor)
	}

	/**
	 * Asks a question and returns the full answer, with a reason when denied. Reactive: it reads
	 * the actor and every record that the rule reads.
	 */
	check(
		action: AuthorizeRecordAction | AuthorizeCustomAction,
		record?: TLRecord,
		next?: TLRecord
	): AuthorizeDecision<TLRecord> {
		const request = { action, record, next } as AuthorizeRequest<TLRecord>
		return runAuthorize(this._authorize, request, {
			actor: this._actor.get(),
			get: (id: string) => this.editor.store.get(id as TLRecord['id']),
			onError: (error) =>
				this.editor.annotateError(error, { origin: 'permissions.authorize', willCrashApp: false }),
		})
	}

	/**
	 * Asks whether the actor may do `action`. Without `next`, `update` is a pre-check: "may I
	 * change this record at all?".
	 *
	 * @example
	 * ```ts
	 * editor.permissions.can('update', shape) // show handles?
	 * editor.permissions.can('tool:draw') // show the draw tool?
	 * ```
	 */
	can(
		action: AuthorizeRecordAction | AuthorizeCustomAction,
		record?: TLRecord,
		next?: TLRecord
	): boolean {
		return this.check(action, record, next).allowed
	}

	/**
	 * Whether the actor may not change this shape at all (`update` with no `next`). The editor
	 * treats such a shape as locked: it cannot be selected, moved, or deleted. Always false when
	 * the editor has no `authorize`.
	 */
	isShapeLocked(shape: TLShape): boolean {
		if (!this._authorize) return false
		return this._lockedCache.get(shape.id) ?? false
	}

	/** The last write that `authorize` denied, here or on the server, for a toast or a status line. */
	getLastDenial() {
		return this._lastDenial.get()
	}

	/**
	 * Records a write that the sync server denied, so that the UI shows it as it shows a local
	 * denial. `useSync` calls this for each denial that the room sends back.
	 */
	reportServerDenial(denial: { action: AuthorizeRecordAction; recordId: string; reason?: string }) {
		this._lastDenial.set({
			action: denial.action,
			recordId: denial.recordId as TLRecord['id'],
			reason: denial.reason ?? null,
			source: 'server',
			time: Date.now(),
		})
	}

	private checkOperation(changes: readonly StoreWriteGateChange<TLRecord>[]): boolean | TLRecord[] {
		const authorize = this._authorize!
		const store = this.editor.store
		const env = {
			actor: this._actor.__unsafe__getWithoutCapture(),
			get: (id: string) => store.unsafeGetWithoutCapture(id as TLRecord['id']),
			onError: (error: unknown) =>
				this.editor.annotateError(error, { origin: 'permissions.authorize', willCrashApp: false }),
		}
		const replacements: TLRecord[] = []
		for (const { before, after } of changes) {
			const request: AuthorizeRequest<TLRecord> = !before
				? { action: 'create', record: after! }
				: !after
					? { action: 'delete', record: before }
					: { action: 'update', record: before, next: after }
			const decision = runAuthorize(authorize, request, env)
			if (!decision.allowed) {
				this._lastDenial.set({
					action: request.action as AuthorizeRecordAction,
					recordId: request.record.id,
					reason: decision.reason ?? null,
					source: 'editor',
					time: Date.now(),
				})
				return false
			}
			// Apply a stamp locally too, so that the new record is the actor's at once and does not
			// look locked until the server's copy arrives.
			if (decision.record && decision.record !== after) replacements.push(decision.record)
		}
		return replacements.length ? replacements : true
	}
}
