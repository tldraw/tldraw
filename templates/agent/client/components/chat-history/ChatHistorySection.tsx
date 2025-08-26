import { Editor } from 'tldraw'
import {
	IChatHistoryActionItem,
	IChatHistoryItem,
	IChatHistoryPromptItem,
} from '../../../shared/types/ChatHistoryItem'
import { TLAgent } from '../../ai/useTldrawAgent'
import { SmallSpinner } from '../icons/SmallSpinner'
import { ChatHistoryGroup, getActionHistoryGroups } from './ChatHistoryGroup'
import { ChatHistoryPrompt } from './ChatHistoryPrompt'

export interface IChatHistorySection {
	prompt: IChatHistoryPromptItem
	events: IChatHistoryActionItem[]
	isFinalSection: boolean
}

export function ChatHistorySection({
	section,
	agent,
	editor,
	isGenerating,
}: {
	section: IChatHistorySection
	agent: TLAgent
	editor: Editor
	isGenerating: boolean
}) {
	const groups = getActionHistoryGroups(section.events, agent)
	return (
		<div className="chat-history-section">
			<ChatHistoryPrompt item={section.prompt} editor={editor} />
			{groups.map((group, i) => {
				return (
					<ChatHistoryGroup
						key={'chat-history-group-' + i}
						group={group}
						editor={editor}
						agent={agent}
					/>
				)
			})}
			{section.isFinalSection && isGenerating && <SmallSpinner />}
		</div>
	)
}

export function getAgentHistorySections(items: IChatHistoryItem[]): IChatHistorySection[] {
	const sections: IChatHistorySection[] = []

	for (const item of items) {
		if (item.type === 'prompt') {
			sections.push({ prompt: item, events: [], isFinalSection: false })
			continue
		}

		sections[sections.length - 1].events.push(item)
	}

	if (sections.length > 0) {
		sections[sections.length - 1].isFinalSection = true
	}

	return sections
}
