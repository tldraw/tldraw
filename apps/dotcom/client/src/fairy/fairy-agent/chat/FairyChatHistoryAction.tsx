import { AgentIcon, ChatHistoryActionItem } from '@tldraw/fairy-shared'
import { useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import { useValue } from 'tldraw'
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
	const contentRef = useRef<HTMLDivElement>(null)

	// Keep it scrolled down
	useEffect(() => {
		if (contentRef.current) {
			contentRef.current.scrollTo(0, contentRef.current.scrollHeight)
		}
	}, [contentRef, item.action])

	// if (action._type === 'update-shared-todo-list') return null
	const info = agent.getActionInfo(action)

	const displayText =
		info.description || info.summary || formatActionName(action._type || 'unknown')

	const agentIsGenerating = useValue('agent-is-generating', () => agent.isGenerating(), [agent])
	const actionIsStreaming = !action.complete && agentIsGenerating

	return (
		<div
			className={
				'fairy-chat-history-action' +
				(actionIsStreaming ? ' fairy-chat-history-action-streaming' : '')
			}
		>
			{info.icon && (
				<div className="fairy-chat-history-action-icon">
					<AgentIcon type={info.icon} />
				</div>
			)}
			<div
				ref={contentRef}
				className={actionIsStreaming ? 'fairy-chat-history-action-streaming-content' : ''}
			>
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
