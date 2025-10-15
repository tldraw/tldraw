import {
	ChatHistoryActionItem,
	ChatHistoryContinuationItem,
	ChatHistoryItem,
	ChatHistoryPromptItem,
} from '@tldraw/dotcom-shared'
import { FairyChatHistoryAction } from './FairyChatHistoryAction'
import { FairyChatHistoryPrompt } from './FairyChatHistoryPrompt'

export interface FairyChatHistorySection {
	prompt: ChatHistoryPromptItem
	items: (ChatHistoryActionItem | ChatHistoryContinuationItem)[]
}

export function FairyChatHistorySection({ section }: { section: FairyChatHistorySection }) {
	const actions = section.items.filter((item) => item.type === 'action') as ChatHistoryActionItem[]
	return (
		<div className="fairy-chat-history-section">
			<FairyChatHistoryPrompt item={section.prompt} />
			<div className="fairy-chat-history-actions">
				{actions.map((item, i) => (
					<FairyChatHistoryAction key={'action-' + i} item={item} />
				))}
			</div>
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
