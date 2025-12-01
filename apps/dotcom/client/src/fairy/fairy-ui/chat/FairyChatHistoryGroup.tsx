import { AgentIcon, ChatHistoryActionItem } from '@tldraw/fairy-shared'
import { useMemo, useState } from 'react'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { FairyChatHistoryAction } from './FairyChatHistoryAction'

export interface FairyChatHistoryGroup {
	items: ChatHistoryActionItem[]
	isFinalGroup: boolean
}

export function FairyChatHistoryGroup({
	group,
	agent,
}: {
	group: FairyChatHistoryGroup
	agent: FairyAgent
}) {
	const { items } = group

	const nonEmptyItems = useMemo(() => {
		return items.filter((item) => {
			const { description } = agent.actions.getActionInfo(item.action)
			return description !== null
		})
	}, [items, agent])

	const [collapsed, setCollapsed] = useState(true)

	const complete = useMemo(() => {
		return items.every((item) => item.action.complete)
	}, [items])

	const summary = useMemo(() => {
		const time = Math.floor(items.reduce((acc, item) => acc + item.action.time, 0) / 1000)
		if (time === 0) return 'Worked for less than a second'
		if (time === 1) return 'Worked for 1 second'
		return `Worked for ${time} seconds`
	}, [items])

	if (nonEmptyItems.length === 0) {
		return null
	}

	// If there's only one item, render it directly without grouping UI
	if (nonEmptyItems.length < 2) {
		return (
			<div className="fairy-chat-history-group">
				{nonEmptyItems.map((item, i) => {
					return (
						<FairyChatHistoryItem group={group} item={item} agent={agent} key={'action-' + i} />
					)
				})}
			</div>
		)
	}

	const showContent = !collapsed || !complete

	return (
		<div className="fairy-chat-history-group">
			{complete && (
				<button className="fairy-chat-history-group-toggle" onClick={() => setCollapsed((v) => !v)}>
					<div className="fairy-chat-history-action-icon">
						<AgentIcon type={showContent ? 'chevron-down' : 'chevron-right'} />
					</div>
					{summary}
				</button>
			)}
			{showContent && (
				<div className="fairy-chat-history-group-items">
					{nonEmptyItems.map((item, i) => {
						return (
							<FairyChatHistoryAction group={group} item={item} agent={agent} key={'action-' + i} />
						)
					})}
				</div>
			)}
		</div>
	)
}

function FairyChatHistoryItem({
	item,
	group,
	agent,
}: {
	item: ChatHistoryActionItem
	group: FairyChatHistoryGroup
	agent: FairyAgent
}) {
	const { action } = item
	const { description, summary } = agent.actions.getActionInfo(action)
	const collapsible = summary !== null
	const [collapsed, setCollapsed] = useState(collapsible)

	if (!description) return null

	return (
		<div className="fairy-chat-history-item-container">
			{action.complete && collapsible && (
				<button className="fairy-chat-history-group-toggle" onClick={() => setCollapsed((v) => !v)}>
					<div className="fairy-chat-history-action-icon">
						<AgentIcon type={collapsed ? 'chevron-right' : 'chevron-down'} />
					</div>
					{summary}
				</button>
			)}

			{(!collapsed || !action.complete) && (
				<FairyChatHistoryAction group={group} item={item} agent={agent} />
			)}
		</div>
	)
}

/**
 * Merge adjacent actions into groups where possible.
 */
export function getActionHistoryGroups(
	items: ChatHistoryActionItem[],
	agent: FairyAgent,
	isFinalSection: boolean,
	isGenerating: boolean
): FairyChatHistoryGroup[] {
	const groups: FairyChatHistoryGroup[] = []

	for (const item of items) {
		const { description } = agent.actions.getActionInfo(item.action)
		if (description === null) {
			continue
		}

		const group = groups[groups.length - 1]

		if (group && canActionBeGrouped({ item, group, agent })) {
			group.items.push(item)
		} else {
			groups.push({
				items: [item],
				isFinalGroup: false,
			})
		}
	}

	// Manually pop out the final action of the final group during generations
	if (isFinalSection && isGenerating) {
		const finalGroup = groups[groups.length - 1]
		if (finalGroup) {
			finalGroup.isFinalGroup = true
		}
	}

	return groups
}

/**
 * Check if an action can be merged with a group.
 */
export function canActionBeGrouped({
	item,
	group,
	agent,
}: {
	item: ChatHistoryActionItem
	group: FairyChatHistoryGroup
	agent: FairyAgent
}) {
	if (!item.action.complete) return false

	const groupAcceptance = group.items[0]?.acceptance
	if (groupAcceptance !== item.acceptance) return false

	const prevAction = group.items.at(-1)?.action
	if (!prevAction) return false

	const actionInfo = agent.actions.getActionInfo(item.action)
	const prevActionInfo = agent.actions.getActionInfo(prevAction)

	if (actionInfo.canGroup(prevAction) && prevActionInfo.canGroup(item.action)) {
		return true
	}

	return false
}
