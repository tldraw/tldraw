import { useEffect, useRef } from 'react'
import { DefaultSpinner, Editor, isRecordsDiffEmpty, useValue } from 'tldraw'
import { AgentActionHistoryGroup, AgentHistoryGroup } from '../../../shared/types/AgentHistoryGroup'
import {
	AgentActionHistoryItem,
	AgentHistoryItem,
	AgentPromptHistoryItem,
} from '../../../shared/types/AgentHistoryItem'
import { TLAgent } from '../../ai/useTldrawAgent'
import { $agentHistoryItems } from '../../atoms/agentHistoryItems'
import { ActionHistoryGroup } from './ActionHistoryGroup'
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
				const eventGroups = getActionHistoryGroups(section.events, agent)
				return (
					<div key={'history-section-' + index} className="chat-history-section">
						<PromptHistoryGroup group={promptGroup} />
						{eventGroups.map((group, index) => {
							return (
								<ActionHistoryGroup
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
	events: AgentActionHistoryItem[]
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

function getActionHistoryGroups(
	items: AgentActionHistoryItem[],
	agent: TLAgent
): AgentActionHistoryGroup[] {
	const groups: AgentActionHistoryGroup[] = []

	for (const item of items) {
		const actionUtil = agent.getActionUtil(item.action._type)
		const description = actionUtil.getDescription(item.action)
		if (description === null) {
			continue
		}

		const group = groups[groups.length - 1]
		if (group && group.type === 'action' && canActionBeGrouped({ item, group, agent })) {
			group.items.push(item)
		} else {
			groups.push({
				type: 'action',
				items: [item],
				showDiff: !isRecordsDiffEmpty(item.diff) && item.action.complete,
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
	item: AgentActionHistoryItem
	group: AgentHistoryGroup
	agent: TLAgent
}) {
	if (item.status === 'progress') return false
	if (!group) return false
	if (group.type !== 'action') return false

	const showDiff = !isRecordsDiffEmpty(item.diff)
	if (showDiff !== group.showDiff) return false

	const groupAcceptance = group.items[0]?.acceptance
	if (groupAcceptance !== item.acceptance) return false

	const prevEvent = group.items.at(-1)?.action
	const prevActionUtil = prevEvent ? agent.getActionUtil(prevEvent._type) : null
	const actionUtil = agent.getActionUtil(item.action._type)
	if (
		prevEvent &&
		prevActionUtil &&
		actionUtil.canGroup(item.action, prevEvent) &&
		prevActionUtil.canGroup(prevEvent, item.action)
	) {
		return true
	}

	return false
}
