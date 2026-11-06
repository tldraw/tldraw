import { atom, computed, react, transact, transaction } from '@tldraw/state'
import { RecordsDiff, reverseRecordsDiff, StoreTransaction } from '@tldraw/store'
import {
	accessCan,
	createTransaction,
	TL_FULL_ACCESS,
	TLAccess,
	TLIntent,
	TLMutatorContext,
	TLPermissionDenial,
	TLPermissions,
	TLRecord,
	TLVerdict,
} from '@tldraw/tlschema'
import { JsonValue, getOwnProperty, isEqual } from '@tldraw/utils'
import type { Editor } from '../../Editor'
import { EditorManager } from '../EditorManager'
import type { HistoryManager } from '../HistoryManager/HistoryManager'

const OK: TLVerdict = { ok: true }

/**
 * The client side of the room's permissions. It reads the same {@link @tldraw/tlschema#TLPermissions}
 * object the server checks pushes with, and the access the server gave this session.
 *
 * - `can(ability)` answers UI questions ("show the lock button?").
 * - Every `editor.run` is checked as one transaction before it commits. A denied run is rolled
 *   back as a whole, and the editor emits `permission-denied`.
 * - `wouldAllow(fn)` asks the same question without changing anything, by running `fn` and
 *   rolling it back.
 * - `mutate(name, args)` runs a named mutator locally, and the server runs it again.
 *
 * With no permissions (no sync, or a room with none), everything is allowed, as before.
 *
 * @public
 */
export class PermissionsManager extends EditorManager {
	private readonly _localAccess = atom<TLAccess | null>('PermissionsManager.localAccess', null)
	private readonly _lastDenial = atom<TLPermissionDenial | null>(
		'PermissionsManager.lastDenial',
		null
	)

	constructor(
		editor: Editor,
		private readonly _permissions: TLPermissions<TLRecord> | null,
		private readonly history: HistoryManager<TLRecord>
	) {
		super(editor)
		this.registerStamps()
		// the sync client reports server denials through the store; re-emit them on the editor
		const lastServerDenial = editor.store.props.collaboration?.lastDenial
		if (lastServerDenial) {
			let previous = lastServerDenial.get()
			this.register(
				react('PermissionsManager.serverDenials', () => {
					const denial = lastServerDenial.get()
					if (!denial || denial === previous) return
					previous = denial
					this.reportDenial(denial)
				})
			)
		}
	}

	/** The room's permissions, or null when there are none. */
	getPermissions(): TLPermissions<TLRecord> | null {
		return this._permissions ?? this.editor.store.props.collaboration?.permissions ?? null
	}

	/**
	 * What this session may do: the server's access when synced, else the access set with
	 * {@link PermissionsManager.setAccess}, else full access.
	 */
	@computed getAccess(): TLAccess {
		return (
			this._localAccess.get() ??
			this.editor.store.props.collaboration?.access?.get() ??
			TL_FULL_ACCESS
		)
	}

	/**
	 * Set the access for an editor with no server, for example in tests, demos, or a local-only
	 * app with its own roles. A synced editor gets its access from the server.
	 */
	setAccess(access: TLAccess | null) {
		this._localAccess.set(access)
	}

	/** Does this session have `ability`? */
	can(ability: string): boolean {
		return accessCan(this.getAccess(), ability)
	}

	/** The last denied change, local or from the server. */
	getLastDenial(): TLPermissionDenial | null {
		return this._lastDenial.get()
	}

	/** @internal */
	isActive() {
		const permissions = this.getPermissions()
		return !!permissions && (permissions.rules.length > 0 || !!permissions.canRead)
	}

	/** Check a document change against the rules, as the server would. */
	checkChanges(diff: RecordsDiff<TLRecord>, intent: TLIntent | null = null): TLVerdict {
		const permissions = this.getPermissions()
		if (!permissions) return OK
		const store = this.editor.store
		return permissions.check(
			createTransaction<TLRecord>({
				access: this.getAccess(),
				intent,
				diff,
				after: {
					get: (id) => store.get(id as any) as TLRecord | undefined,
					all: () => store.allRecords(),
				},
			})
		)
	}

	/**
	 * Would `fn` be allowed? Runs it, checks the result, and rolls everything back. Use it for
	 * menus and buttons ("can I delete these shapes?"), not on every pointer move.
	 */
	wouldAllow(fn: () => void, intent: TLIntent | null = null): TLVerdict {
		const editor = this.editor
		let verdict: TLVerdict = OK
		const checkpoint = this.history._checkpoint()
		const previousScope = this._scope
		// a dry run: the runs inside it join it, and nothing is reported
		this._scope = { transaction: null, touched: new Set(), dryRun: true }
		try {
			transaction((rollback) => {
				const diff = editor.store.extractingChanges(() => this.history.batch(fn))
				const documentDiff = documentChanges(editor, diff, this._scope!.touched)
				if (documentDiff) verdict = this.checkChanges(documentDiff, intent)
				rollback()
			})
		} finally {
			this._scope = previousScope
			checkpoint.rollback()
		}
		return verdict
	}

	/**
	 * Run the named mutator locally as a prediction. The push carries the intent, and the server
	 * runs the same mutator and keeps its own result. A mutator that throws is denied: nothing
	 * changes, and the editor emits `permission-denied` with the error's message.
	 */
	mutate(name: string, args?: JsonValue) {
		const mutator = getOwnProperty(this.getPermissions()?.mutators ?? {}, name)
		if (!mutator) throw new Error(`No mutator named "${name}"`)
		const store = this.editor.store
		const access = this.getAccess()
		const ctx: TLMutatorContext<TLRecord> = {
			access,
			can: (ability) => accessCan(access, ability),
			get: (id) => store.get(id as any) as TLRecord | undefined,
			all: () => store.allRecords(),
			put: (records) => store.put(records),
			remove: (ids) => store.remove(ids as any),
		}
		const intent = { name, args }
		let error: unknown = null
		this.editor.run(
			() => {
				// A throwing mutator is a denial, as on the server: undo its partial writes and their
				// history, and keep the throw from crashing the editor.
				const checkpoint = this.history._checkpoint()
				const diff = store.extractingChanges(() => {
					try {
						mutator(ctx, args)
					} catch (e) {
						error = e
					}
				})
				if (!error) return checkpoint.release()
				this.revert(store.filterChangesByScope(diff, 'document'))
				checkpoint.rollback()
			},
			{ intent }
		)
		if (error) {
			this.reportDenial({
				reason: error instanceof Error ? error.message : String(error),
				intent,
				source: 'local',
			})
		}
	}

	/** @internal */
	reportDenial(denial: TLPermissionDenial) {
		this._lastDenial.set(denial)
		this.editor.emit('permission-denied', denial)
	}

	/**
	 * The checked run in progress. Runs inside it that share its store transaction join it;
	 * a run that starts its own transaction (one with its own intent) is checked on its own, as
	 * the server will check its push on its own.
	 */
	private _scope: {
		transaction: StoreTransaction | null
		/** document ids changed by runs checked on their own inside this one */
		touched: Set<string>
		dryRun: boolean
	} | null = null

	/**
	 * Run `fn` as one checked transaction. A denied run's document changes are reverted, and the
	 * undo history drops what the run recorded. Session state (selection, tool state, camera) is
	 * left alone: rolling it back would leave tools half-transitioned.
	 *
	 * @internal
	 */
	runChecked(fn: () => void, transaction: StoreTransaction | null) {
		const parent = this._scope
		if (parent && (parent.transaction === transaction || parent.dryRun)) return fn()
		// one reactive transaction around the run and its revert, so store listeners (and the
		// sync client) never see a denied change on its own
		transact(() => this._runChecked(fn, transaction, parent))
	}

	private _runChecked(
		fn: () => void,
		transaction: StoreTransaction | null,
		parent: PermissionsManager['_scope']
	) {
		const editor = this.editor
		const scope = { transaction, touched: new Set<string>(), dryRun: false }
		const checkpoint = this.history._checkpoint()
		let diff: RecordsDiff<TLRecord>
		this._scope = scope
		try {
			diff = editor.store.extractingChanges(fn)
		} catch (e) {
			checkpoint.release()
			throw e
		} finally {
			this._scope = parent
		}
		const documentDiff = documentChanges(editor, diff, scope.touched)
		const verdict = documentDiff ? this.checkChanges(documentDiff, transaction?.intent ?? null) : OK
		if (verdict.ok) {
			checkpoint.release()
		} else {
			this.revert(documentDiff)
			checkpoint.rollback()
		}
		if (parent) {
			for (const changes of [diff.added, diff.updated, diff.removed]) {
				for (const id in changes) parent.touched.add(id)
			}
		}
		if (!verdict.ok) {
			this.reportDenial({
				reason: verdict.reason,
				intent: transaction?.intent ?? null,
				source: 'local',
			})
		}
	}

	/**
	 * Put the document back as it was before `diff`. It is a user change, so it cancels the
	 * denied change before the sync client sends it. History is ignored: the checkpoint drops
	 * the run's undo steps.
	 */
	private revert(diff: RecordsDiff<TLRecord> | null) {
		if (!diff) return
		this.history.batch(() => this.editor.store.applyDiff(reverseRecordsDiff(diff)), {
			history: 'ignore',
		})
	}

	private registerStamps() {
		const editor = this.editor
		for (const typeName of Object.keys(editor.store.schema.types)) {
			this.register(
				editor.sideEffects.registerBeforeCreateHandler(
					typeName as TLRecord['typeName'],
					(record, source) => {
						if (source !== 'user') return record
						const stamps = this.getPermissions()?.stamps
						if (!stamps?.length) return record
						const access = this.getAccess()
						let next = record
						for (const stamp of stamps) next = stamp(next, access)
						return next
					}
				)
			)
		}
	}
}

/**
 * The document part of `diff`, without records that runs checked on their own already covered,
 * and without updates that change nothing (a denied inner run leaves an update back to where it
 * started).
 */
function documentChanges(
	editor: Editor,
	diff: RecordsDiff<TLRecord>,
	skip: ReadonlySet<string>
): RecordsDiff<TLRecord> | null {
	const document = editor.store.filterChangesByScope(diff, 'document')
	if (!document) return null
	let empty = true
	for (const changes of [document.added, document.updated, document.removed] as Record<
		string,
		unknown
	>[]) {
		for (const id in changes) {
			const change = changes[id]
			if (skip.has(id) || (Array.isArray(change) && isEqual(change[0], change[1]))) {
				delete changes[id]
			} else {
				empty = false
			}
		}
	}
	return empty ? null : document
}
