import { RecordsDiff } from '@tldraw/store'
import {
	TLAuthorizeWrite,
	TLRecord,
	TLRecordChange,
	TLRecordGetter,
	TLSession,
	TLStore,
	TLWriteRefusal,
} from '@tldraw/tlschema'
import { isEqual } from '@tldraw/utils'
import type { Editor } from '../../Editor'
import { EditorManager } from '../EditorManager'

/**
 * Runs the store's `authorize.write` on each of this user's operations, as a sync room runs it on
 * each push. The store judges an operation once its side effects have settled, and reverts a
 * refused one before history or listeners see it. Then the editor emits `'refused'`.
 *
 * @internal
 */
export class AuthorizeManager extends EditorManager {
	constructor(editor: Editor) {
		super(editor)
		const write = editor.store.props.authorize?.write
		if (!write) return
		this.register(
			editor.store.addCommitCheck((diff) => {
				const refusal = judgeWrite(editor.store, write, diff)
				if (!refusal) return null
				return { afterRevert: () => editor.emit('refused', refusal) }
			})
		)
	}
}

/**
 * Judges one settled operation with the write hook. Only document records count, because those
 * are the only records the room sees.
 *
 * @internal
 */
export function judgeWrite(
	store: TLStore,
	write: TLAuthorizeWrite,
	diff: RecordsDiff<TLRecord>
): TLWriteRefusal | null {
	const isDocument = (record: TLRecord) => store.scopedTypes.document.has(record.typeName)
	const changes: TLRecordChange[] = []
	for (const next of Object.values(diff.added)) {
		if (isDocument(next)) changes.push({ type: 'create', id: next.id, prev: null, next })
	}
	for (const [prev, next] of Object.values(diff.updated)) {
		if (isDocument(next) && !isEqual(prev, next)) {
			changes.push({ type: 'update', id: next.id, prev, next })
		}
	}
	for (const prev of Object.values(diff.removed)) {
		if (isDocument(prev)) changes.push({ type: 'delete', id: prev.id, prev, next: null })
	}
	if (changes.length === 0) return null

	const readDocument = (id: TLRecord['id']) => {
		const record = store.get(id)
		return record && isDocument(record) ? record : undefined
	}
	const after = { get: readDocument } as TLRecordGetter
	const before = {
		get: (id: TLRecord['id']) => {
			if (id in diff.added) return undefined
			if (id in diff.updated) return diff.updated[id][0]
			if (id in diff.removed) return diff.removed[id]
			return readDocument(id)
		},
	} as TLRecordGetter

	try {
		return write(changes, {
			session: getStoreSession(store),
			before,
			after,
		})
	} catch (e) {
		// the room refuses when its hook throws, so the editor must too
		console.error('authorize.write threw; refusing the change', e)
		return { reason: 'error' }
	}
}

/**
 * The session the editor passes to the authorize hooks. The app gives the meta to the store, the
 * same meta the room gets for this client.
 *
 * @internal
 */
export function getStoreSession(store: TLStore): TLSession {
	return { sessionId: store.id, meta: store.props.sessionMeta }
}
