import { useEffect, useMemo, useRef } from 'react'
import { DefaultSpinner, Editor, isRecordsDiffEmpty, useValue } from 'tldraw'
import { AgentHistoryGroup } from '../../../shared/types/AgentHistoryGroup'
import { AgentHistoryItem } from '../../../shared/types/AgentHistoryItem'
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

	const groups = getAgentHistoryGroups(items)

	const shouldShowSpinner = useMemo(
		() => isGenerating && groups.at(-1)?.type === 'prompt',
		[isGenerating, groups]
	)

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

function getAgentHistoryGroups(items: AgentHistoryItem[]): AgentHistoryGroup[] {
	const groups: AgentHistoryGroup[] = []

	for (const item of items) {
		if (item.type === 'prompt') {
			groups.push({ type: 'prompt', item })
			continue
		}

		const showDiff = !isRecordsDiffEmpty(item.diff)

		const lastGroup = groups[groups.length - 1]
		const lastGroupAcceptance = lastGroup.type === 'event' && lastGroup?.items[0]?.acceptance
		if (
			!lastGroup ||
			lastGroup.type !== 'event' ||
			lastGroup.showDiff !== showDiff ||
			lastGroupAcceptance !== item.acceptance
		) {
			groups.push({ type: 'event', items: [item], showDiff })
		} else {
			lastGroup.items.push(item)
		}
	}

	return groups
}
