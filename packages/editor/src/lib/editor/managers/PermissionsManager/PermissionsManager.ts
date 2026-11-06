import { atom, computed, react, transaction } from '@tldraw/state'
import { RecordsDiff } from '@tldraw/store'
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
import { JsonValue, getOwnProperty } from '@tldraw/utils'
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
		let verdict: TLVerdict = OK
		const editor = this.editor
		this.history._withRollback(() => {
			transaction((rollback) => {
				const diff = editor.store.extractingChanges(() => this.history.batch(fn))
				const documentDiff = editor.store.filterChangesByScope(diff, 'document')
				if (documentDiff) verdict = this.checkChanges(documentDiff, intent)
				rollback()
			})
			return false
		})
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
				// A throwing mutator is a denial, as on the server. The inner transaction undoes its
				// partial writes; catching here keeps the throw from crashing the editor.
				try {
					transaction(() => mutator(ctx, args))
				} catch (e) {
					error = e
				}
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
	 * Run `fn` as one checked transaction. A denied run is rolled back as a whole, including the
	 * undo history it recorded.
	 *
	 * @internal
	 */
	runChecked(fn: () => void, intent: TLIntent | null) {
		let denial: TLVerdict | null = null
		const editor = this.editor
		this.history._withRollback(() => {
			transaction((rollback) => {
				const diff = editor.store.extractingChanges(fn)
				const documentDiff = editor.store.filterChangesByScope(diff, 'document')
				if (!documentDiff) return
				const verdict = this.checkChanges(documentDiff, intent)
				if (!verdict.ok) {
					denial = verdict
					rollback()
				}
			})
			return !denial
		})
		if (denial) {
			this.reportDenial({ reason: (denial as { reason: string }).reason, intent, source: 'local' })
		}
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
