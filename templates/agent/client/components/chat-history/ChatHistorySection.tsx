import { SmallSpinner } from '../../../shared/icons/SmallSpinner'
import {
	ChatHistoryActionItem,
	ChatHistoryContinuationItem,
	ChatHistoryItem,
	ChatHistoryPromptItem,
} from '../../../shared/types/ChatHistoryItem'
import { TldrawAgent } from '../../agent/TldrawAgent'
import { ChatHistoryGroup, getActionHistoryGroups } from './ChatHistoryGroup'
import { ChatHistoryPrompt } from './ChatHistoryPrompt'

export interface ChatHistorySection {
	prompt: ChatHistoryPromptItem
	items: (ChatHistoryActionItem | ChatHistoryContinuationItem)[]
}

export function ChatHistorySection({
	section,
	agent,
	loading,
}: {
	section: ChatHistorySection
	agent: TldrawAgent
	loading: boolean
}) {
	const actions = section.items.filter((item) => item.type === 'action')
	const groups = getActionHistoryGroups(actions, agent)
	return (
		<div className="chat-history-section">
			<ChatHistoryPrompt item={section.prompt} editor={agent.editor} />
			{groups.map((group, i) => {
				return <ChatHistoryGroup key={'chat-history-group-' + i} group={group} agent={agent} />
			})}
			{loading && <SmallSpinner />}
		</div>
	)
}

export function getAgentHistorySections(items: ChatHistoryItem[]): ChatHistorySection[] {
	const sections: ChatHistorySection[] = []

	for (const item of items) {
		if (item.type === 'prompt') {
			// Filter out 'self' prompts from the UI
			if (item.promptSource === 'self') continue
			sections.push({ prompt: item, items: [] })
			continue
		}

		// Only add to the last section if one exists
		if (sections.length > 0) {
			sections[sections.length - 1].items.push(item)
		}
	}

	return sections
}
