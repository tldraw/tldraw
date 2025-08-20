import { useCallback, useMemo, useState } from 'react'
import Markdown from 'react-markdown'
import { Editor, reverseRecordsDiff, squashRecordDiffs } from 'tldraw'
import { AgentEvent } from '../../../shared/types/AgentEvent'
import { AgentEventHistoryGroup } from '../../../shared/types/AgentHistoryGroup'
import { AgentEventHistoryItem } from '../../../shared/types/AgentHistoryItem'
import { Streaming } from '../../../shared/types/Streaming'
import { TLAgent } from '../../ai/useTldrawAgent'
import { $agentHistoryItems } from '../../atoms/agentHistoryItems'
import { AgentIcon, AgentIconType } from '../icons/AgentIcon'
import { ChevronDownIcon } from '../icons/ChevronDownIcon'
import { ChevronRightIcon } from '../icons/ChevronRightIcon'
import { TldrawDiffViewer } from './TldrawDiffViewer'

// The model returns changes individually, but we group them together in this component for UX reasons, namely so the user can see all changes done at once together, and so they can accept or reject them all at once
export function EventHistoryGroup({
	group,
	editor,
	agent,
}: {
	group: AgentEventHistoryGroup
	editor: Editor
	agent: TLAgent
}) {
	if (group.showDiff) {
		return <EventHistoryGroupWithDiff group={group} editor={editor} agent={agent} />
	}

	return <EventHistoryGroupWithoutDiff group={group} agent={agent} />
}

function EventHistoryGroupWithoutDiff({
	group,
	agent,
}: {
	group: AgentEventHistoryGroup
	agent: TLAgent
}) {
	const { items } = group

	const nonEmptyItems = useMemo(() => {
		return items.filter((item) => {
			const eventUtil = agent.getEventUtil(item.event._type)
			const description = eventUtil.getDescription(item.event)
			return description !== null
		})
	}, [items, agent])

	const [collapsed, setCollapsed] = useState(true)

	const complete = useMemo(() => {
		return items.every((item) => item.status === 'done')
	}, [items])

	if (nonEmptyItems.length < 2) {
		return (
			<div className="agent-action-group-content">
				{nonEmptyItems.map((item, i) => {
					return <EventHistoryGroupItem item={item} agent={agent} key={'event-' + i} />
				})}
			</div>
		)
	}

	const showContent = !collapsed || !complete

	return (
		<div className="agent-action-group">
			{complete && (
				<button className="agent-action-collapse-button" onClick={() => setCollapsed((v) => !v)}>
					<span>{showContent ? <ChevronDownIcon /> : <ChevronRightIcon />}</span>
					Thought for a while
				</button>
			)}
			{showContent && (
				<div className="agent-action-group-content">
					{items.map((item, i) => {
						return (
							<EventHistoryGroupItemContent event={item.event} agent={agent} key={'event-' + i} />
						)
					})}
				</div>
			)}
		</div>
	)
}

function EventHistoryGroupItem({ item, agent }: { item: AgentEventHistoryItem; agent: TLAgent }) {
	const { event } = item
	const eventUtil = agent.getEventUtil(event._type)
	const description = eventUtil.getDescription(event)
	const summary = eventUtil.getSummary(event)
	const collapsible = summary !== null
	const [collapsed, setCollapsed] = useState(collapsible)

	if (!description) return null

	return (
		<div className="agent-action-group-item">
			{event.complete && collapsible && (
				<button className="agent-action-collapse-button" onClick={() => setCollapsed((v) => !v)}>
					<span>{collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}</span>
					{summary}
				</button>
			)}

			{(!collapsed || !event.complete) && (
				<EventHistoryGroupItemContent event={event} agent={agent} />
			)}
		</div>
	)
}

function EventHistoryGroupItemContent({
	event,
	agent,
}: {
	event: Streaming<AgentEvent>
	agent: TLAgent
}) {
	const eventUtil = agent.getEventUtil(event._type)
	const icon = eventUtil.getIcon(event)
	const description = eventUtil.getDescription(event)

	return (
		<div className={`agent-action-message agent-action-type-${event._type}`}>
			{icon && (
				<span>
					<AgentIcon type={icon} />
				</span>
			)}
			<span className="agent-action-message-description">
				<Markdown>{description}</Markdown>
			</span>
		</div>
	)
}

function EventHistoryGroupWithDiff({
	group,
	editor,
	agent,
}: {
	group: AgentEventHistoryGroup
	editor: Editor
	agent: TLAgent
}) {
	const { items } = group

	const groupDiff = useMemo(() => {
		return squashRecordDiffs(items.map((item) => item.diff))
	}, [items])

	// Because we accept and reject changes as groups, when the changes represented by this group are accepted (or rejected), we need to go through each item in the group and update its acceptance status individually
	const handleAccept = useCallback(() => {
		$agentHistoryItems.update((currentChatHistoryItems) => {
			const newItems = [...currentChatHistoryItems]
			for (const item of items) {
				const index = newItems.findIndex((v) => v === item)
				if (index !== -1) {
					// If the item was previously rejected, we need to re-apply the original diff
					if (item.acceptance === 'rejected') {
						editor.store.applyDiff(item.diff)
					}
					newItems[index] = { ...item, acceptance: 'accepted', status: 'done' }
				}
			}
			return newItems
		})
	}, [items, editor])

	const handleReject = useCallback(() => {
		$agentHistoryItems.update((currentChatHistoryItems) => {
			const newItems = [...currentChatHistoryItems]
			for (const item of items) {
				const index = newItems.findIndex((v) => v === item)
				if (index !== -1) {
					newItems[index] = { ...item, acceptance: 'rejected', status: 'done' }
				}
				// Only apply reverse diff if the item wasn't already rejected
				if (item.acceptance !== 'rejected') {
					const reverseDiff = reverseRecordsDiff(item.diff)
					editor.store.applyDiff(reverseDiff)
				}
			}
			return newItems
		})
	}, [items, editor])

	const acceptance = useMemo<AgentEventHistoryItem['acceptance']>(() => {
		if (items.length === 0) return 'pending'
		const acceptance = items[0].acceptance
		for (let i = 1; i < items.length; i++) {
			if (items[i].acceptance !== acceptance) {
				return 'pending'
			}
		}
		return acceptance
	}, [items])

	const steps = useMemo(() => {
		return items.map((item) => {
			const { event } = item
			const eventUtil = agent.getEventUtil(event._type)
			return {
				icon: eventUtil.getIcon(event),
				description: eventUtil.getDescription(event),
			}
		})
	}, [items, agent])

	return (
		<div className="agent-change-message">
			<div className="agent-change-message-actions">
				<button onClick={handleReject} disabled={acceptance === 'rejected'}>
					{acceptance === 'rejected' ? 'Rejected' : 'Reject'}
				</button>
				<button onClick={handleAccept} disabled={acceptance === 'accepted'}>
					{acceptance === 'accepted' ? 'Accepted' : 'Accept'}
				</button>
			</div>
			<DiffSteps steps={steps} />
			<TldrawDiffViewer diff={groupDiff} />
		</div>
	)
}

interface DiffStep {
	icon: AgentIconType | null
	description: string | null
}

function DiffSteps({ steps }: { steps: DiffStep[] }) {
	let previousDescription = ''
	return (
		<div className="agent-change-message-intent">
			{steps.map((step, i) => {
				if (!step.description) return null

				if (step.description === previousDescription) return null
				previousDescription = step.description
				return (
					<div className="agent-change-message-intent-item" key={'intent-' + i}>
						{step.icon && (
							<span className="agent-change-message-intent-item-icon">
								<AgentIcon type={step.icon} />
							</span>
						)}
						{step.description}
					</div>
				)
			})}
		</div>
	)
}
