import { AgentIcon, ChatHistoryActionItem } from '@tldraw/fairy-shared'
import Markdown from 'react-markdown'
import { FairyAgent } from '../agent/FairyAgent'

export function FairyChatHistoryAction({
	item,
	agent,
}: {
	item: ChatHistoryActionItem
	agent: FairyAgent
}) {
	const { action } = item

	if (action._type === 'message') {
		return <FairyChatHistoryMessageDisplay item={item} agent={agent} />
	}

	return <FairyChatHistoryActionDisplay item={item} agent={agent} />
}

function FairyChatHistoryMessageDisplay({
	item,
	agent,
}: {
	item: ChatHistoryActionItem
	agent: FairyAgent
}) {
	const { action } = item
	const info = agent.getActionInfo(action)
	const content = info.description

	if (!content) return null

	return (
		<div className="fairy-chat-history-action">
			<div className="fairy-chat-history-action-content fairy-chat-history-action-message">
				<Markdown>{content}</Markdown>
			</div>
		</div>
	)
}

function FairyChatHistoryActionDisplay({
	item,
	agent,
}: {
	item: ChatHistoryActionItem
	agent: FairyAgent
}) {
	const { action } = item
	// if (action._type === 'update-shared-todo-list') return null
	const info = agent.getActionInfo(action)

	const displayText =
		info.description || info.summary || formatActionName(action._type || 'unknown')

	return (
		<div className="fairy-chat-history-action">
			{info.icon && (
				<div className="fairy-chat-history-action-icon">
					<AgentIcon type={info.icon} />
				</div>
			)}
			<div>
				<Markdown>{displayText}</Markdown>
			</div>
		</div>
	)
}

function formatActionName(type: string): string {
	const sentence = type
		.replace(/([A-Z])/g, ' $1')
		.trim()
		.toLowerCase()
	return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}
