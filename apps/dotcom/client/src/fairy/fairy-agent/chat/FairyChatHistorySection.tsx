import {
	ChatHistoryActionItem,
	ChatHistoryContinuationItem,
	ChatHistoryItem,
	ChatHistoryPromptItem,
	SmallSpinner,
	TldrawFairyAgent,
} from '@tldraw/fairy-shared'
import { FairyChatHistoryGroup, getActionHistoryGroups } from './FairyChatHistoryGroup'
import { FairyChatHistoryPrompt } from './FairyChatHistoryPrompt'

export interface FairyChatHistorySection {
	prompt: ChatHistoryPromptItem
	items: (ChatHistoryActionItem | ChatHistoryContinuationItem)[]
}

export function FairyChatHistorySection({
	section,
	agent,
	loading,
}: {
	section: FairyChatHistorySection
	agent: TldrawFairyAgent
	loading: boolean
}) {
	const actions = section.items.filter((item) => item.type === 'action') as ChatHistoryActionItem[]
	const groups = getActionHistoryGroups(actions, agent)
	return (
		<div className="fairy-chat-history-section">
			<FairyChatHistoryPrompt item={section.prompt} />
			<div className="fairy-chat-history-actions">
				{groups.map((group, i) => (
					<FairyChatHistoryGroup key={'group-' + i} group={group} agent={agent} />
				))}
			</div>
			{loading && <SmallSpinner />}
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
