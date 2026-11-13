import { RecordsDiff } from '@tldraw/store'
import {
	TLRecord,
	TLRecordChange,
	TLStore,
	TLStoreAuthorize,
	TLWriteRefusal,
	TLWriteRuleSession,
} from '@tldraw/tlschema'
import { isEqual } from '@tldraw/utils'
import type { Editor } from '../../Editor'
import { EditorManager } from '../EditorManager'

/**
 * Enforces the store's `authorize` rule on this user's changes, the way a sync room enforces it on
 * a push: each operation is judged once its side effects have settled, access first and then the
 * rule, and a refused one is reverted whole before history or listeners see it. Emits `'refused'`
 * with `source: 'local'`, then ends the interaction in progress. Off without the license's permissions feature.
 *
 * @internal
 */
export class WriteRuleManager extends EditorManager {
	constructor(editor: Editor) {
		super(editor)
		const authorize = editor.store.props.authorize
		if (!authorize) return
		this.register(
			editor.store.addCommitCheck((diff) => {
				if (!editor._arePermissionsLicensed()) return null
				const refusal = judgeOperation(editor.store, authorize, diff)
				if (!refusal) return null
				return {
					afterRevert: () => {
						// a throwing host listener must not leave a tool acting on reverted records
						try {
							editor.emit('refused', { ...refusal, source: 'local' })
						} finally {
							editor._endInteractionAfterRefusal()
						}
					},
				}
			})
		)
	}
}

const DEFAULT_LOCAL_SESSION: TLWriteRuleSession<unknown> = {
	sessionId: 'local',
	userId: null,
	meta: undefined,
	access: { document: 'write', objects: 'write' },
	permissions: null,
}

/** Judges one settled operation; exported for tests. */
export function judgeOperation(
	store: TLStore,
	authorize: TLStoreAuthorize<unknown>,
	diff: RecordsDiff<TLRecord>
): TLWriteRefusal | null {
	// the room only ever sees document records
	const isDocument = (record: TLRecord) => store.scopedTypes.document.has(record.typeName)
	const changes: TLRecordChange<TLRecord>[] = []
	for (const next of Object.values(diff.added)) {
		if (isDocument(next)) changes.push({ type: 'create', prev: null, next })
	}
	for (const [prev, next] of Object.values(diff.updated)) {
		if (isDocument(next) && !isEqual(prev, next)) changes.push({ type: 'update', prev, next })
	}
	for (const prev of Object.values(diff.removed)) {
		if (isDocument(prev)) changes.push({ type: 'delete', prev, next: null })
	}
	if (changes.length === 0) return null
	const ids = changes.map((c) => (c.next ?? c.prev).id as string).sort()

	const session = authorize.getSession ? authorize.getSession() : DEFAULT_LOCAL_SESSION
	if (!session) return { reason: 'session not ready', ids }

	const objectTypes = new Set(authorize.objectTypes)
	const denied = changes
		.map((c) => c.next ?? c.prev)
		.filter((r) => session.access[objectTypes.has(r.typeName) ? 'objects' : 'document'] !== 'write')
		.sort((a, b) => (a.id < b.id ? -1 : 1))
	if (denied.length > 0) {
		return {
			reason: objectTypes.has(denied[0].typeName)
				? 'object store is read-only'
				: 'document is read-only',
			ids: denied.map((r) => r.id),
		}
	}

	const read = (id: string) => {
		const record = store.get(id as TLRecord['id'])
		return record && isDocument(record) ? record : undefined
	}
	const before = (id: string): TLRecord | undefined => {
		const key = id as TLRecord['id']
		if (key in diff.added) return undefined
		if (key in diff.updated) return diff.updated[key][0]
		if (key in diff.removed) return diff.removed[key]
		return read(id)
	}
	try {
		return authorize.rule({ session, changes, before, after: read })
	} catch (e) {
		// the room refuses when its rule throws, so the editor must too
		console.error('write rule threw; refusing the change', e)
		return { reason: 'something went wrong', ids }
	}
}
