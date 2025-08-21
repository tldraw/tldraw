import { useEffect, useRef } from 'react'
import { DefaultSpinner, Editor, isRecordsDiffEmpty, useValue } from 'tldraw'
import { AgentEventHistoryGroup, AgentHistoryGroup } from '../../../shared/types/AgentHistoryGroup'
import {
	AgentEventHistoryItem,
	AgentHistoryItem,
	AgentPromptHistoryItem,
} from '../../../shared/types/AgentHistoryItem'
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
	const sections = getAgentHistorySections(items)
	const spinnerRef = useRef<HTMLDivElement>(null)
	const historyRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!historyRef.current) return
		if (items.at(-1)?.type === 'prompt') {
			historyRef.current.scrollTo(0, historyRef.current.scrollHeight)
		}
	}, [historyRef, items])

	const handleScroll = () => {
		if (!historyRef.current) return
		console.log('handleScroll')
		const scrollDistanceFromBottom =
			historyRef.current.scrollHeight -
			historyRef.current.scrollTop -
			historyRef.current.clientHeight

		if (scrollDistanceFromBottom < 100) {
			spinnerRef.current?.scrollIntoView()
		}
	}

	return (
		<div className="chat-history" ref={historyRef} onScroll={handleScroll}>
			{sections.map((section, index) => {
				const promptGroup = { type: 'prompt', item: section.prompt } as const
				const eventGroups = getEventHistoryGroups(section.events, agent)
				return (
					<div key={'history-section-' + index} className="chat-history-section">
						<PromptHistoryGroup group={promptGroup} />
						{eventGroups.map((group, index) => {
							return (
								<EventHistoryGroup
									key={'history-group-' + index}
									group={group}
									editor={editor}
									agent={agent}
								/>
							)
						})}
						{index === sections.length - 1 && isGenerating && <DefaultSpinner />}
					</div>
				)
			})}
		</div>
	)
}
interface AgentHistorySection {
	prompt: AgentPromptHistoryItem
	events: AgentEventHistoryItem[]
}

function getAgentHistorySections(items: AgentHistoryItem[]): AgentHistorySection[] {
	const sections: AgentHistorySection[] = []

	for (const item of items) {
		if (item.type === 'prompt') {
			sections.push({ prompt: item, events: [] })
			continue
		}

		sections[sections.length - 1].events.push(item)
	}

	return sections
}

function getEventHistoryGroups(
	items: AgentEventHistoryItem[],
	agent: TLAgent
): AgentEventHistoryGroup[] {
	const groups: AgentEventHistoryGroup[] = []

	for (const item of items) {
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
