import { ChatHistoryActionItem } from '@tldraw/fairy-shared'

export function FairyChatHistoryAction({ item }: { item: ChatHistoryActionItem }) {
	const { action } = item

	if (action._type === 'message') {
		return <FairyChatHistoryMessage item={item} />
	}

	return <FairyChatHistoryActionPill item={item} />
}

function FairyChatHistoryMessage({ item }: { item: ChatHistoryActionItem }) {
	const { action } = item
	const content = action._type === 'message' ? action.text || '' : ''

	if (!content) return null

	return (
		<div className="fairy-chat-history-action">
			<div className="fairy-chat-history-action-content">{content}</div>
		</div>
	)
}

function FairyChatHistoryActionPill({ item }: { item: ChatHistoryActionItem }) {
	const { action } = item

	const actionName = formatActionName(action._type || 'unknown')

	return (
		<div className="fairy-chat-history-action-pill-container">
			<div className="fairy-chat-history-action-pill">{actionName}</div>
		</div>
	)
}

// TODO we use getActionInfo to format all of this.

function formatActionName(type: string): string {
	const sentence = type
		.replace(/([A-Z])/g, ' $1')
		.trim()
		.toLowerCase()
	return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}
