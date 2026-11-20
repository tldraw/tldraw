import { RecordsDiff } from '@tldraw/store'
import {
	bindAuthorizeCan,
	TLAuthorize,
	TLRecord,
	TLRecordChange,
	TLRecordGetter,
	TLStore,
	TLWriteRefusal,
} from '@tldraw/tlschema'
import { isEqual } from '@tldraw/utils'
import type { Editor } from '../../Editor'
import { EditorManager } from '../EditorManager'

/**
 * Runs the store's `authorize.write` on each of this user's operations, as a sync room runs it on
 * each push. The store judges an operation once its side effects have settled, and reverts a
 * refused one before history or listeners see it. Then the editor emits `'refused'`. The room's
 * refusals, from `collaboration.refusals`, go out on the same event.
 *
 * @internal
 */
export class AuthorizeManager extends EditorManager {
	constructor(editor: Editor) {
		super(editor)
		const refusals = editor.store.props.collaboration?.refusals
		if (refusals) {
			this.register(
				refusals.subscribe((refusal) => editor.emit('refused', { ...refusal, source: 'server' }))
			)
		}
		const authorize = editor.store.props.authorize
		if (!authorize?.write) return
		this.register(
			editor.store.addCommitCheck((diff) => {
				const refusal = judgeWrite(editor.store, authorize, diff, getAuthorizeUserId(editor))
				if (!refusal) return null
				return { afterRevert: () => editor.emit('refused', { ...refusal, source: 'local' }) }
			})
		)
	}
}

/**
 * The user id the authorize hooks get. Once the room has said which user it judges this session
 * as, the editor uses that one, so that both sides judge the same user (a guest is `null` in the
 * room but has a local id in the editor). Before that, it is the editor user's id.
 *
 * @internal
 */
export function getAuthorizeUserId(editor: Editor): string | null {
	const fromRoom = editor.store.props.collaboration?.userId?.get()
	return fromRoom === undefined ? editor.user.getExternalId() : fromRoom
}

/**
 * Judges one settled operation with the write hook. Only document records count, because those
 * are the only records the room sees.
 *
 * @internal
 */
export function judgeWrite(
	store: TLStore,
	authorize: TLAuthorize,
	diff: RecordsDiff<TLRecord>,
	userId: string | null
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
	const write = authorize.write
	if (!write || changes.length === 0) return null

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
			userId,
			can: bindAuthorizeCan(authorize.can, { userId }),
			before,
			after,
		})
	} catch (e) {
		// the room refuses when its hook throws, so the editor must too
		console.error('authorize.write threw; refusing the change', e)
		return { reason: 'error' }
	}
}
