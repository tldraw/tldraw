import { ChatHistoryActionItem, TldrawFairyAgent } from '@tldraw/fairy-shared'
import { AgentIcon } from '@tldraw/fairy-shared/src/icons/AgentIcon'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FairyChatHistoryAction } from './FairyChatHistoryAction'
import { getActionInfo } from './getActionInfo'

export interface FairyChatHistoryGroup {
	items: ChatHistoryActionItem[]
}

export function FairyChatHistoryGroup({
	group,
	agent,
}: {
	group: FairyChatHistoryGroup
	agent: TldrawFairyAgent
}) {
	const { items } = group

	const nonEmptyItems = useMemo(() => {
		return items.filter((item) => {
			const { description } = getActionInfo(item.action, agent)
			return description !== null
		})
	}, [items, agent])

	// For rendering, only show complete actions (but keep incomplete ones in items for timing)
	const completeNonEmptyItems = useMemo(() => {
		return nonEmptyItems.filter((item) => {
			// Always show messages, even if incomplete
			if (item.action._type === 'message') return true
			// Only show other actions if they're complete
			return item.action.complete
		})
	}, [nonEmptyItems])

	const [collapsed, setCollapsed] = useState(true)

	const complete = useMemo(() => {
		return items.every((item) => item.action.complete)
	}, [items])

	const [tick, setTick] = useState(0)

	// Track the last time we got an update from the server
	const lastServerTimeRef = useRef(0)
	const lastUpdateAtRef = useRef(Date.now())

	const currentServerTime = items.reduce((acc, item) => acc + item.action.time, 0)
	if (currentServerTime !== lastServerTimeRef.current) {
		lastServerTimeRef.current = currentServerTime
		lastUpdateAtRef.current = Date.now()
	}

	// Update every second while incomplete to keep the time display fresh
	useEffect(() => {
		if (complete) return

		const interval = setInterval(() => {
			setTick((t) => t + 1)
		}, 1000)

		return () => clearInterval(interval)
	}, [complete])

	// Calculate elapsed time: server time + time since last update
	const timeSinceLastUpdate = complete ? 0 : Date.now() - lastUpdateAtRef.current
	const totalTime = currentServerTime + timeSinceLastUpdate
	const time = Math.floor(totalTime / 1000)

	const summary =
		time === 0
			? 'Worked for less than a second'
			: time === 1
				? 'Worked for 1 second'
				: `Worked for ${time} seconds`

	if (completeNonEmptyItems.length === 0) {
		return null
	}

	// Messages are rendered without group UI
	const isMessage = completeNonEmptyItems[0]?.action._type === 'message'
	if (isMessage) {
		return (
			<div className="fairy-chat-history-group">
				{completeNonEmptyItems.map((item, i) => {
					return <FairyChatHistoryAction item={item} agent={agent} key={'action-' + i} />
				})}
			</div>
		)
	}

	const showContent = !collapsed || !complete

	return (
		<div className="fairy-chat-history-group">
			{/* Show toggle if complete, or just the summary if incomplete */}
			{complete ? (
				<button className="fairy-chat-history-group-toggle" onClick={() => setCollapsed((v) => !v)}>
					<AgentIcon type={showContent ? 'chevron-down' : 'chevron-right'} />
					<span>{summary}</span>
				</button>
			) : (
				<div className="fairy-chat-history-group-summary">
					<span>{summary}</span>
				</div>
			)}
			{showContent && (
				<div className="fairy-chat-history-group-items">
					{completeNonEmptyItems.map((item, i) => {
						return <FairyChatHistoryAction item={item} agent={agent} key={'action-' + i} />
					})}
				</div>
			)}
		</div>
	)
}

/**
 * Merge adjacent actions into groups where possible.
 * Messages are never grouped - they're always rendered individually.
 */
export function getActionHistoryGroups(
	items: ChatHistoryActionItem[],
	agent: TldrawFairyAgent
): FairyChatHistoryGroup[] {
	const groups: FairyChatHistoryGroup[] = []

	for (const item of items) {
		const { description } = getActionInfo(item.action, agent)
		if (description === null) {
			continue
		}

		// Note: We now show incomplete actions so the timer can run in real-time

		// Messages are never grouped - always create a new group for them
		if (item.action._type === 'message') {
			groups.push({
				items: [item],
			})
			continue
		}

		const group = groups[groups.length - 1]
		if (group && canActionBeGrouped({ item, group, agent })) {
			group.items.push(item)
		} else {
			groups.push({
				items: [item],
			})
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
	agent: TldrawFairyAgent
}) {
	if (!item.action.complete) return false
	if (!group) return false

	const prevAction = group.items.at(-1)?.action
	if (!prevAction) return false

	const actionInfo = getActionInfo(item.action, agent)
	const prevActionInfo = getActionInfo(prevAction, agent)

	if (actionInfo.canGroup(prevAction) && prevActionInfo.canGroup(item.action)) {
		return true
	}

	return false
}
