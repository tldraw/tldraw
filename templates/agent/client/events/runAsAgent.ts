import { Editor } from 'tldraw'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { createOrUpdateHistoryItem } from '../atoms/chatHistoryItems'
import { Streaming } from '../types/Streaming'

export function runAsAgent(editor: Editor, event: Streaming<IAgentEvent>, action: () => void) {
	createOrUpdateHistoryItem({
		type: 'agent-change',
		diff: editor.store.extractingChanges(action),
		event,
		status: event.complete ? 'done' : 'progress',
		acceptance: 'pending',
	})
}
