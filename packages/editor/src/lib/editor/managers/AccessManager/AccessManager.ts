import { atom, computed } from '@tldraw/state'
import { RecordsDiff } from '@tldraw/store'
import {
	AccessChange,
	AccessDecision,
	AccessEntry,
	AccessModel,
	AccessView,
	SessionAccess,
	TLRecord,
	overlayAccessView,
} from '@tldraw/tlschema'
import { objectMapValues } from '@tldraw/utils'
import type { Editor } from '../../Editor'
import { EditorManager } from '../EditorManager'

/**
 * The editor's side of the access model. The same {@link @tldraw/tlschema#AccessModel} runs here
 * and in the sync server: the server enforces it, and the editor mirrors it so the UI never offers
 * an edit the server would reject.
 *
 * - {@link AccessManager.can} answers "may I do this verb here?", reactively.
 * - One write guard on the store checks every local operation as a whole, and rolls back an
 *   operation that has any denied record. It is the one chokepoint: a tool, action, or API call
 *   that forgets to ask `can()` still cannot make a write the model denies.
 * - Locks and readonly derive from the model (see `Editor.isShapeOrAncestorLocked` and
 *   `Editor.getIsReadonly`).
 *
 * With no model (the store has no `access` prop), everything is allowed and nothing changes.
 *
 * @public
 */
export class AccessManager extends EditorManager {
	private readonly localSession = atom<SessionAccess | null>('AccessManager.localSession', null)
	private readonly lastDenial = atom<AccessDecision | null>('AccessManager.lastDenial', null)

	constructor(editor: Editor) {
		super(editor)
		const model = this.getModel()
		if (!model) return
		const { store } = editor
		store.setWriteGuard((diff) => this.guard(diff))
		this.register(() => store.setWriteGuard(null))
		// Stamp the owner the way the server will, so a create is not rewritten on the round trip.
		this.register(
			editor.sideEffects.register({
				shape: {
					beforeCreate: (record, source) => this.stamp(null, record, source),
					beforeChange: (prev, next, source) => this.stamp(prev, next, source),
				},
			})
		)
	}

	/** The access model, from the store's `access` prop. */
	getModel(): AccessModel<TLRecord> | null {
		return (this.editor.store.props.access?.model as AccessModel<TLRecord>) ?? null
	}

	/** The current session's access: from the sync server, or set locally with {@link AccessManager.setSession}. */
	@computed getSession(): SessionAccess | null {
		return this.localSession.get() ?? this.editor.store.props.access?.session.get() ?? null
	}

	/** Set the session's access without a server, for local apps and tests. The server's value wins when it is null. */
	setSession(session: SessionAccess | null) {
		this.localSession.set(session)
	}

	/** The last local operation the guard rolled back, and why. */
	getLastDenial(): AccessDecision | null {
		return this.lastDenial.get()
	}

	@computed private getEntriesIndex(): Map<string, AccessEntry[]> {
		const model = this.getModel()
		const index = new Map<string, AccessEntry[]>()
		if (!model?.entryType) return index
		for (const record of this.editor.store.query.records(model.entryType as any).get()) {
			const entry = model.entryOf(record)
			if (!entry) continue
			const list = index.get(entry.resource) ?? []
			list.push(entry)
			index.set(entry.resource, list)
		}
		return index
	}

	/** The model's view of the editor's store. */
	readonly view: AccessView<TLRecord> = {
		get: (id) => this.editor.store.get(id as TLRecord['id']),
		entriesAt: (resource) => this.getEntriesIndex().get(resource) ?? [],
	}

	/**
	 * May the current session do `verb` on a record (default: the whole room)? True when there is
	 * no model or no session yet. Reactive.
	 */
	can(verb: string, id: string | { id: string } = this.getModel()?.root ?? ''): boolean {
		return this.explain(verb, id)?.allowed ?? true
	}

	/** Like {@link AccessManager.can}, with the entry that decided and a reason. Null when there is no model. */
	explain(
		verb: string,
		id: string | { id: string } = this.getModel()?.root ?? ''
	): AccessDecision | null {
		const model = this.getModel()
		const session = this.getSession()
		if (!model || !session) return null
		return model.explain(session, verb, typeof id === 'string' ? id : id.id, this.view)
	}

	/** Check a change set the way the server will. Returns the first denial, or null. */
	check(diff: RecordsDiff<TLRecord>): AccessDecision | null {
		const model = this.getModel()
		const session = this.getSession()
		if (!model || !session) return null
		const changes: AccessChange<TLRecord>[] = []
		const after = new Map<string, TLRecord | null>()
		for (const record of objectMapValues(diff.added)) {
			if (!this.isSynced(record)) continue
			changes.push({ prev: null, next: record })
			after.set(record.id, record)
		}
		for (const [from, to] of objectMapValues(diff.updated)) {
			if (!this.isSynced(to)) continue
			changes.push({ prev: from, next: to })
			after.set(to.id, to)
		}
		for (const record of objectMapValues(diff.removed)) {
			if (!this.isSynced(record)) continue
			changes.push({ prev: record, next: null })
			after.set(record.id, null)
		}
		if (!changes.length) return null
		// the store already holds the new records; rebuild the "before" view from the diff
		const beforeChanges = new Map<string, TLRecord | null>()
		for (const { prev, next } of changes) beforeChanges.set((prev ?? next)!.id, prev)
		const before = overlayAccessView(model, this.view, beforeChanges)
		return model.checkChanges(session, changes, before, this.view)
	}

	private isSynced(record: TLRecord) {
		return this.editor.store.scopedTypes.document.has(record.typeName)
	}

	private guard(diff: RecordsDiff<TLRecord>): boolean {
		const denial = this.check(diff)
		// the guard runs inside the transaction it is about to roll back, so record the denial after
		if (denial) queueMicrotask(() => this.lastDenial.set(denial))
		return !denial
	}

	/**
	 * Can the session create anything on this page: on the page itself, or under it through an
	 * in-room entry (a frame it may draw in)? The editor shows its tools only when this is true.
	 */
	canCreateOnPage(pageId: string): boolean {
		const model = this.getModel()
		const session = this.getSession()
		if (!model || !session) return true
		if (model.can(session, 'create', pageId, this.view)) return true
		for (const entries of this.getEntriesIndex().values()) {
			for (const entry of entries) {
				if (entry.effect !== 'allow' || !model.expand(entry.verbs).has('create')) continue
				if (model.can(session, 'create', entry.resource, this.view)) return true
			}
		}
		return false
	}

	private stamp<T extends TLRecord>(prev: T | null, next: T, source: 'user' | 'remote'): T {
		const model = this.getModel()
		const session = this.getSession()
		if (source !== 'user' || !model || !session) return next
		return model.stamp(session, prev, next) as T
	}
}
