import { useState } from 'react'
import Markdown from 'react-markdown'
import { AgentIcon } from '../../../shared/icons/AgentIcon'
import { ChevronDownIcon } from '../../../shared/icons/ChevronDownIcon'
import { ChevronRightIcon } from '../../../shared/icons/ChevronRightIcon'
import { AgentAction } from '../../../shared/types/AgentAction'
import { ChatHistoryActionItem } from '../../../shared/types/ChatHistoryItem'
import { Streaming } from '../../../shared/types/Streaming'
import { useAgent } from '../../agent/TldrawAgentAppProvider'
import { ChatHistoryGroup } from './ChatHistoryGroup'
import { getActionInfo } from './getActionInfo'

export function ChatHistoryGroupWithoutDiff({ group }: { group: ChatHistoryGroup }) {
	// Items without a description were already dropped when the group was built
	const { items } = group
	const [collapsed, setCollapsed] = useState(true)

	const complete = items.every((item) => item.action.complete)
	const summary = getThinkingSummary(items)

	if (items.length === 0) return null

	if (items.length === 1) {
		return (
			<div className="chat-history-group">
				<ChatHistoryItem item={items[0]} />
			</div>
		)
	}

	const showContent = !collapsed || !complete

	return (
		<div className="chat-history-group">
			{complete && (
				<button onClick={() => setCollapsed((v) => !v)}>
					<span>{showContent ? <ChevronDownIcon /> : <ChevronRightIcon />}</span>
					{summary}
				</button>
			)}
			{showContent && (
				<div className="agent-actions-container">
					{items.map((item, i) => (
						<ChatHistoryItemExpanded action={item.action} key={'action-' + i} />
					))}
				</div>
			)}
		</div>
	)
}

function getThinkingSummary(items: ChatHistoryActionItem[]) {
	const time = Math.floor(items.reduce((acc, item) => acc + item.action.time, 0) / 1000)
	if (time === 0) return 'Thought for less than a second'
	if (time === 1) return 'Thought for 1 second'
	return `Thought for ${time} seconds`
}

function ChatHistoryItem({ item }: { item: ChatHistoryActionItem }) {
	const agent = useAgent()
	const { action } = item
	const { description, summary } = getActionInfo(action, agent)
	const collapsible = summary !== null
	const [collapsed, setCollapsed] = useState(collapsible)

	if (!description) return null

	return (
		<div className="agent-actions-container">
			{action.complete && collapsible && (
				<button onClick={() => setCollapsed((v) => !v)}>
					<span>{collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}</span>
					{summary}
				</button>
			)}

			{(!collapsed || !action.complete) && <ChatHistoryItemExpanded action={action} />}
		</div>
	)
}

function ChatHistoryItemExpanded({ action }: { action: Streaming<AgentAction> }) {
	const agent = useAgent()
	const { icon, description } = getActionInfo(action, agent)

	return (
		<div className={`agent-action agent-action-type-${action._type}`}>
			{icon && (
				<span>
					<AgentIcon type={icon} />
				</span>
			)}
			<span className="agent-action-description">
				<Markdown>{description}</Markdown>
			</span>
		</div>
	)
}
