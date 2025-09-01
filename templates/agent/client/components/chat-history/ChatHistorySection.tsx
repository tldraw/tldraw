import {
	IChatHistoryActionItem,
	IChatHistoryItem,
	IChatHistoryPromptItem,
} from '../../../shared/types/ChatHistoryItem'
import { TldrawAgent } from '../../agent/TldrawAgent'
import { SmallSpinner } from '../icons/SmallSpinner'
import { ChatHistoryGroup, getActionHistoryGroups } from './ChatHistoryGroup'
import { ChatHistoryPrompt } from './ChatHistoryPrompt'

export interface IChatHistorySection {
	prompt: IChatHistoryPromptItem
	actions: IChatHistoryActionItem[]
	isFinalSection: boolean
}

export function ChatHistorySection({
	section,
	agent,
	isGenerating,
}: {
	section: IChatHistorySection
	agent: TldrawAgent
	isGenerating: boolean
}) {
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

export function getAgentHistorySections(items: IChatHistoryItem[]): IChatHistorySection[] {
	const sections: IChatHistorySection[] = []

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
