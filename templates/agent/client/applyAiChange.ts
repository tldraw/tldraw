import { defaultApplyChange, TLAiChange } from '@tldraw/ai'
import { Editor } from 'tldraw'
import { createOrUpdateHistoryItem } from './atoms/chatHistoryItems'

export function applyAiChange({ change, editor }: { change: TLAiChange; editor: Editor }) {
	const diff = editor.store.extractingChanges(() => {
		defaultApplyChange({ change, editor })
	})

	createOrUpdateHistoryItem({
		type: 'agent-change',
		diff,
		change,
		status: 'done',
		acceptance: 'pending',
	})
}
