import { Editor, EditorAtom, RecordsDiff, TLRecord } from 'tldraw'

export const $documentChanges = new EditorAtom<RecordsDiff<TLRecord>[]>('documentChanges', () => [])

export function recordDocumentChanges(editor: Editor) {
	const cleanUp = editor.store.listen(
		(change) => {
			$documentChanges.update(editor, (prev) => [...prev, change.changes])
		},
		// Agent AND user changes both get marked as source: 'user', so we need to capture all of them and filter out the agent's actions later
		{ scope: 'document', source: 'user' }
	)

	return cleanUp
}
