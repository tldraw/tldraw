import { useEffect, useMemo, useRef } from 'react'
import { DefaultSpinner, Editor, isRecordsDiffEmpty, useValue } from 'tldraw'
import { AgentHistoryGroup } from '../../../shared/types/AgentHistoryGroup'
import { AgentEventHistoryItem, AgentHistoryItem } from '../../../shared/types/AgentHistoryItem'
import { TLAgent } from '../../ai/useTldrawAgent'
import { $agentHistoryItems } from '../../atoms/agentHistoryItems'
import { EventHistoryGroup } from './EventHistoryGroup'
import { PromptHistoryGroup } from './PromptHistoryGroup'

export function AgentHistory({
	editor,
	agent,
	isGenerating,
}: {
	editor: Editor
	agent: TLAgent
	isGenerating: boolean
}) {
	const items = useValue($agentHistoryItems)
	const groups = getAgentHistoryGroups(items, agent)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const previousScrollDistanceFromBottomRef = useRef(0)

	useEffect(() => {
		if (!scrollContainerRef.current) return
		const scrollDistanceFromBottom = previousScrollDistanceFromBottomRef.current
		if (scrollDistanceFromBottom < 5) {
			scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
			previousScrollDistanceFromBottomRef.current = 0
		}
	}, [items])

	const handleScroll = () => {
		if (!scrollContainerRef.current) return
		const scrollDistanceFromBottom =
			scrollContainerRef.current.scrollHeight -
			scrollContainerRef.current.scrollTop -
			scrollContainerRef.current.clientHeight
		previousScrollDistanceFromBottomRef.current = scrollDistanceFromBottom
	}

	const shouldShowSpinner = useMemo(() => isGenerating, [isGenerating])

	return (
		<div className="chat-history" ref={scrollContainerRef} onScroll={handleScroll}>
			{groups.map((group, index) => {
				switch (group.type) {
					case 'prompt':
						return <PromptHistoryGroup key={index} group={group} />
					case 'event':
						return <EventHistoryGroup key={index} group={group} editor={editor} agent={agent} />
				}
			})}
			{shouldShowSpinner && <DefaultSpinner />}
		</div>
	)
}

function getAgentHistoryGroups(items: AgentHistoryItem[], agent: TLAgent): AgentHistoryGroup[] {
	const groups: AgentHistoryGroup[] = []

	for (const item of items) {
		if (item.type === 'prompt') {
			groups.push({ type: 'prompt', item })
			continue
		}

		const eventUtil = agent.getEventUtil(item.event._type)
		const description = eventUtil.getDescription(item.event)
		if (description === null) {
			continue
		}

		const group = groups[groups.length - 1]
		if (group && group.type === 'event' && canActionBeGrouped({ item, group, agent })) {
			group.items.push(item)
		} else {
			groups.push({
				type: 'event',
				items: [item],
				showDiff: !isRecordsDiffEmpty(item.diff) && item.event.complete,
			})
		}
	}

	return groups
}

function canActionBeGrouped({
	item,
	group,
	agent,
}: {
	item: AgentEventHistoryItem
	group: AgentHistoryGroup
	agent: TLAgent
}) {
	if (item.status === 'progress') return false
	if (!group) return false
	if (group.type !== 'event') return false

	const showDiff = !isRecordsDiffEmpty(item.diff)
	if (showDiff !== group.showDiff) return false

	const groupAcceptance = group.items[0]?.acceptance
	if (groupAcceptance !== item.acceptance) return false

	const prevEvent = group.items.at(-1)?.event
	const prevEventUtil = prevEvent ? agent.getEventUtil(prevEvent._type) : null
	const eventUtil = agent.getEventUtil(item.event._type)
	if (
		prevEvent &&
		prevEventUtil &&
		eventUtil.canGroup(item.event, prevEvent) &&
		prevEventUtil.canGroup(prevEvent, item.event)
	) {
		return true
	}

	return false
}
