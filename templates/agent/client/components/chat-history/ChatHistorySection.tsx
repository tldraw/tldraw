import { useValue } from 'tldraw'
import {
	ChatHistoryActionItem,
	ChatHistoryItem,
	ChatHistoryPromptItem,
} from '../../../shared/types/ChatHistoryItem'
import { TldrawAgent } from '../../agent/TldrawAgent'
import { SmallSpinner } from '../icons/SmallSpinner'
import { ChatHistoryGroup, getActionHistoryGroups } from './ChatHistoryGroup'
import { ChatHistoryPrompt } from './ChatHistoryPrompt'

export interface ChatHistorySection {
	prompt: ChatHistoryPromptItem
	actions: ChatHistoryActionItem[]
	isFinalSection: boolean
}

export function ChatHistorySection({
	section,
	agent,
}: {
	section: ChatHistorySection
	agent: TldrawAgent
}) {
	const isGenerating = useValue('isGenerating', () => agent.isGenerating(), [agent])
	const groups = getActionHistoryGroups(section.actions, agent)
	return (
		<div className="chat-history-section">
			<ChatHistoryPrompt item={section.prompt} editor={agent.editor} />
			{groups.map((group, i) => {
				return <ChatHistoryGroup key={'chat-history-group-' + i} group={group} agent={agent} />
			})}
			{section.isFinalSection && isGenerating && <SmallSpinner />}
		</div>
	)
}

export function getAgentHistorySections(items: ChatHistoryItem[]): ChatHistorySection[] {
	const sections: ChatHistorySection[] = []

	for (const item of items) {
		if (item.type === 'prompt') {
			sections.push({ prompt: item, actions: [], isFinalSection: false })
			continue
		}

		sections[sections.length - 1].actions.push(item)
	}

	if (sections.length > 0) {
		sections[sections.length - 1].isFinalSection = true
	}

	return sections
}
