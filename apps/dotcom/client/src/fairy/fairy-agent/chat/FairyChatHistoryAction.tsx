import { AgentIcon, ChatHistoryActionItem, TldrawFairyAgent } from '@tldraw/fairy-shared'
import { getActionInfo } from './getActionInfo'

export function FairyChatHistoryAction({
	item,
	agent,
}: {
	item: ChatHistoryActionItem
	agent: TldrawFairyAgent
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
	agent: TldrawFairyAgent
}) {
	const { action } = item
	const info = getActionInfo(action, agent)
	const content = info.description

	if (!content) return null

	return (
		<div className="fairy-chat-history-action">
			<div className="fairy-chat-history-action-content fairy-chat-history-action-message">
				{content}
			</div>
		</div>
	)
}

function FairyChatHistoryActionDisplay({
	item,
	agent,
}: {
	item: ChatHistoryActionItem
	agent: TldrawFairyAgent
}) {
	const { action } = item
	if (action._type === 'update-todo-list') return null
	const info = getActionInfo(action, agent)

	const displayText =
		info.summary || info.description || formatActionName(action._type || 'unknown')

	return (
		<div className="fairy-chat-history-action">
			{info.icon && (
				<div className="fairy-chat-history-action-icon">
					<AgentIcon type={info.icon} />
				</div>
			)}
			<p>{displayText}</p>
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
