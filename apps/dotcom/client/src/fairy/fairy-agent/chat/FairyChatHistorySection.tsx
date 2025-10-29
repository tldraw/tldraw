import {
	ChatHistoryActionItem,
	ChatHistoryContinuationItem,
	ChatHistoryItem,
	ChatHistoryPromptItem,
} from '@tldraw/fairy-shared'
import { FairyAgent } from '../agent/FairyAgent'
import { FairyChatHistoryGroup, getActionHistoryGroups } from './FairyChatHistoryGroup'
import { FairyChatHistoryPrompt } from './FairyChatHistoryPrompt'

export interface FairyChatHistorySection {
	prompt: ChatHistoryPromptItem
	items: (ChatHistoryActionItem | ChatHistoryContinuationItem)[]
}

export function FairyChatHistorySection({
	section,
	agent,
}: {
	section: FairyChatHistorySection
	agent: FairyAgent
}) {
	const actions = section.items.filter((item) => item.type === 'action') as ChatHistoryActionItem[]
	const groups = getActionHistoryGroups(actions, agent)

	return (
		<div className="fairy-chat-history-section">
			<FairyChatHistoryPrompt item={section.prompt} />
			{groups.map((group, i) => {
				return <FairyChatHistoryGroup key={'chat-history-group-' + i} group={group} agent={agent} />
			})}
		</div>
	)
}

export function getAgentHistorySections(items: ChatHistoryItem[]): FairyChatHistorySection[] {
	const sections: FairyChatHistorySection[] = []

	for (const item of items) {
		if (item.type === 'prompt') {
			sections.push({ prompt: item, items: [] })
			continue
		}

		if (sections.length > 0) {
			sections[sections.length - 1].items.push(item)
		}
	}

	return sections
}
