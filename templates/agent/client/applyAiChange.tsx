import { defaultApplyChange, TLAiStreamingChange } from '@tldraw/ai'
import { Editor } from 'tldraw'
import { createOrUpdateHistoryItem } from './ChatHistory'

export function applyAiChange({ change, editor }: { change: TLAiStreamingChange; editor: Editor }) {
	const diff = editor.store.extractingChanges(() => {
		defaultApplyChange({ change, editor })
	})

	createOrUpdateHistoryItem({
		type: 'agent-change',
		diff,
		change,
		status: change.complete ? 'done' : 'progress',
		acceptance: 'pending',
	})
}
