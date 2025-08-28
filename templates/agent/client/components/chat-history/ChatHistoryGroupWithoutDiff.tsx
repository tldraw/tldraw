import { useMemo, useState } from 'react'
import Markdown from 'react-markdown'
import { AgentAction } from '../../../shared/types/AgentAction'
import { IChatHistoryActionItem } from '../../../shared/types/ChatHistoryItem'
import { Streaming } from '../../../shared/types/Streaming'
import { TLAgent } from '../../ai/useTldrawAgent'
import { AgentIcon } from '../icons/AgentIcon'
import { ChevronDownIcon } from '../icons/ChevronDownIcon'
import { ChevronRightIcon } from '../icons/ChevronRightIcon'
import { IChatHistoryGroup } from './ChatHistoryGroup'
import { getActionInfo } from './getActionInfo'

export function ChatHistoryGroupWithoutDiff({
	group,
	agent,
}: {
	group: IChatHistoryGroup
	agent: TLAgent
}) {
	const { items } = group

	const nonEmptyItems = useMemo(() => {
		return items.filter((item) => {
			const { description } = getActionInfo(item.action, agent)
			return description !== null
		})
	}, [items, agent])

	const [collapsed, setCollapsed] = useState(true)

	const complete = useMemo(() => {
		return items.every((item) => item.action.complete)
	}, [items])

	if (nonEmptyItems.length === 0) {
		return null
	}

	if (nonEmptyItems.length < 2) {
		return (
			<div className="chat-history-group">
				{nonEmptyItems.map((item, i) => {
					return <ChatHistoryItem item={item} agent={agent} key={'action-' + i} />
				})}
			</div>
		)
	}

	const showContent = !collapsed || !complete

	return (
		<div className="chat-history-group">
			{complete && (
				<button onClick={() => setCollapsed((v) => !v)}>
					<span>{showContent ? <ChevronDownIcon /> : <ChevronRightIcon />}</span>
					Thought for a while
				</button>
			)}
			{showContent && (
				<div className="agent-actions-container">
					{nonEmptyItems.map((item, i) => {
						return <ChatHistoryItemExpanded event={item.action} agent={agent} key={'action-' + i} />
					})}
				</div>
			)}
		</div>
	)
}

function ChatHistoryItem({ item, agent }: { item: IChatHistoryActionItem; agent: TLAgent }) {
	const { action: event } = item
	const { description, summary } = getActionInfo(event, agent)
	const collapsible = summary !== null
	const [collapsed, setCollapsed] = useState(collapsible)

	if (!description) return null

	return (
		<div className="agent-actions-container">
			{event.complete && collapsible && (
				<button onClick={() => setCollapsed((v) => !v)}>
					<span>{collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}</span>
					{summary}
				</button>
			)}

			{(!collapsed || !event.complete) && <ChatHistoryItemExpanded event={event} agent={agent} />}
		</div>
	)
}

function ChatHistoryItemExpanded({
	event,
	agent,
}: {
	event: Streaming<AgentAction>
	agent: TLAgent
}) {
	const { icon, description } = getActionInfo(event, agent)

	return (
		<div className={`agent-action agent-action-type-${event._type}`}>
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
