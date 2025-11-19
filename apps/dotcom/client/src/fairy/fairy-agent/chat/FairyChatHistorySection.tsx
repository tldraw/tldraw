import {
	ChatHistoryActionItem,
	ChatHistoryContinuationItem,
	ChatHistoryItem,
	ChatHistoryPromptItem,
} from '@tldraw/fairy-shared'
import { FairyAgent } from '../agent/FairyAgent'
import { FairyChatHistoryGroup, getActionHistoryGroups } from './FairyChatHistoryGroup'

export interface FairyChatHistorySection {
	prompt: ChatHistoryPromptItem | null
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
			<div className="fairy-chat-history-prompt-container fairy-chat-history-prompt-sticky">
				{section.prompt?.message ? (
					<div className="fairy-chat-history-prompt">
						<div className="fairy-chat-history-prompt-content">{section.prompt?.message}</div>
					</div>
				) : (
					<div className="fairy-chat-history-prompt-fairy">
						<div className="fairy-chat-history-prompt-content">Awakened...</div>
					</div>
				)}
			</div>
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
		} else {
			sections.push({ prompt: null, items: [item] })
		}
	}

	return sections
}
