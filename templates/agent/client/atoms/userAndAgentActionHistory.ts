import { Editor, RecordsDiff, TLRecord, atom } from 'tldraw'

export const $userAndAgentActionHistory = atom<RecordsDiff<TLRecord>[]>('raw store changes', [])

export function getUserAndAgentActionHistory(editor: Editor) {
	const cleanUp = editor.store.listen(
		(change) => {
			$userAndAgentActionHistory.update((prev) => [...prev, change.changes])
		},
		{ scope: 'document', source: 'user' } // unfortunately agent AND user changes both get marked as source: 'user', so we need to capture all of them and filter out the agent's actions later
	)

	return cleanUp
}
