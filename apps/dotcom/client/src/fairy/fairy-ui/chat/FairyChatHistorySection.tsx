import {
	AgentIcon,
	ChatHistoryActionItem,
	ChatHistoryContinuationItem,
	ChatHistoryItem,
	ChatHistoryMemoryTransitionItem,
	ChatHistoryPromptItem,
} from '@tldraw/fairy-shared'
import Markdown from 'react-markdown'
import { useValue } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { FairyChatHistoryGroup, getActionHistoryGroups } from './FairyChatHistoryGroup'

export interface FairyChatHistorySection {
	prompt: ChatHistoryPromptItem | null
	items: (ChatHistoryActionItem | ChatHistoryContinuationItem | ChatHistoryMemoryTransitionItem)[]
}

export function FairyChatHistorySection({
	section,
	agent,
	isFinalSection,
}: {
	section: FairyChatHistorySection
	agent: FairyAgent
	isFinalSection: boolean
}) {
	const isGenerating = useValue('is-generating', () => agent.requests.isGenerating(), [agent])
	const actions = section.items.filter((item) => item.type === 'action') as ChatHistoryActionItem[]
	const groups = getActionHistoryGroups(actions, agent, isFinalSection, isGenerating)

	// Create a map from action to its group
	const actionToGroup = new Map<ChatHistoryActionItem, FairyChatHistoryGroup>()
	for (const group of groups) {
		for (const action of group.items) {
			actionToGroup.set(action, group)
		}
	}

	// Render items in order, grouping actions and rendering memory transitions directly
	const renderedItems: Array<FairyChatHistoryGroup | ChatHistoryMemoryTransitionItem> = []
	const renderedGroups = new Set<FairyChatHistoryGroup>()

	for (const item of section.items) {
		if (item.type === 'memory-transition') {
			renderedItems.push(item)
		} else if (item.type === 'action') {
			const group = actionToGroup.get(item)
			if (group && !renderedGroups.has(group)) {
				renderedItems.push(group)
				renderedGroups.add(group)
			}
		}
	}

	// Use userFacingMessage if available, otherwise fall back to agentFacingMessage
	const displayMessage =
		section.prompt !== null
			? (section.prompt.userFacingMessage ?? section.prompt.agentFacingMessage)
			: null

	return (
		<div className="fairy-chat-history-section">
			{/* We don't display messages with source self */}
			{section.prompt !== null && section.prompt.promptSource !== 'self' ? (
				<div className="fairy-chat-history-prompt-container fairy-chat-history-prompt-sticky">
					{section.prompt.promptSource === 'user' ? (
						<div className="fairy-chat-history-prompt-user">
							<div className="fairy-chat-history-prompt-content">{displayMessage}</div>
						</div>
					) : section.prompt.promptSource === 'other-agent' ? (
						<div className="fairy-chat-history-prompt-other-agent">
							<div className="fairy-chat-history-prompt-content">{displayMessage}</div>
						</div>
					) : null}
				</div>
			) : null}

			{renderedItems.map((item, i) => {
				if ('type' in item && item.type === 'memory-transition') {
					return <FairyChatHistoryMemoryTransition key={`memory-transition-${i}`} item={item} />
				} else if ('items' in item) {
					return (
						<FairyChatHistoryGroup key={`chat-history-group-${i}`} group={item} agent={agent} />
					)
				}
				return null
			})}
		</div>
	)
}

function FairyChatHistoryMemoryTransition({ item }: { item: ChatHistoryMemoryTransitionItem }) {
	if (!item.userFacingMessage) return null
	return (
		<div className="fairy-chat-history-group">
			<div className="fairy-chat-history-item-container">
				<div className="fairy-chat-history-action">
					<div className="fairy-chat-history-action-icon">
						<AgentIcon type="flag" />
					</div>
					<div>
						<Markdown>{item.userFacingMessage}</Markdown>
					</div>
				</div>
			</div>
		</div>
	)
}

export function getAgentHistorySections(items: ChatHistoryItem[]): FairyChatHistorySection[] {
	const sections: FairyChatHistorySection[] = []

	for (const item of items) {
		// Add a new section for each prompt with a user-facing message
		// Skip prompts without user-facing messages entirely
		if (item.type === 'prompt') {
			if (item.userFacingMessage) {
				sections.push({ prompt: item, items: [] })
			}
			// Don't process any further - we skip prompts without userFacingMessage
			continue
		}

		// Include memory transition items in the UI
		// Only add to existing sections - don't create empty sections
		if (sections.length > 0) {
			sections[sections.length - 1].items.push(item)
		}
	}

	return sections
}
