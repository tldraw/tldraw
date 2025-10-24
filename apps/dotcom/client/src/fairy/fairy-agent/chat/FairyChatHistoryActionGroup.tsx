import { AgentIcon, ChatHistoryActionItem } from '@tldraw/fairy-shared'
import { useState } from 'react'
import Markdown from 'react-markdown'
import { FairyAgent } from '../agent/FairyAgent'
import { FairyChatHistoryAction } from './FairyChatHistoryAction'

export interface FairyChatHistoryActionGroup {
	items: ChatHistoryActionItem[]
}

export function FairyChatHistoryActionGroup({
	items,
	agent,
}: {
	items: ChatHistoryActionItem[]
	agent: FairyAgent
}) {
	// Track collapsed state for each action segment
	const [collapsedSegments, setCollapsedSegments] = useState<Record<number, boolean>>({})

	// Split items into segments by message actions
	// Normal actions get grouped in dropdowns, messages render on their own
	type Segment =
		| { type: 'actions'; items: ChatHistoryActionItem[] }
		| { type: 'message'; item: ChatHistoryActionItem }

	const segments: Segment[] = []
	let currentActionSegment: ChatHistoryActionItem[] = []

	for (const item of items) {
		if (item.action._type === 'message') {
			// Flush any accumulated actions
			if (currentActionSegment.length > 0) {
				segments.push({ type: 'actions', items: currentActionSegment })
				currentActionSegment = []
			}
			// Add the message as its own segment
			segments.push({ type: 'message', item })
		} else {
			// Accumulate non-message actions
			currentActionSegment.push(item)
		}
	}

	// Flush any remaining actions
	if (currentActionSegment.length > 0) {
		segments.push({ type: 'actions', items: currentActionSegment })
	}

	return (
		<div className="fairy-chat-history-group">
			{segments.map((segment, segmentIdx) => {
				if (segment.type === 'message') {
					// Render message without group UI
					return (
						<FairyChatHistoryAction
							item={segment.item}
							agent={agent}
							key={`segment-${segmentIdx}-message`}
						/>
					)
				} else {
					// Render actions group with dropdown
					const segmentItems = segment.items
					const segmentComplete = segmentItems.every((item) => item.action.complete)
					const segmentTime = segmentItems.reduce((acc, item) => acc + item.action.time, 0)
					const segmentTimeSeconds = Math.floor(segmentTime / 1000)
					const verb = segmentComplete ? 'Worked' : 'Working'
					const segmentSummary =
						segmentTimeSeconds === 0
							? `${verb} for less than a second`
							: segmentTimeSeconds === 1
								? `${verb} for 1 second`
								: `${verb} for ${segmentTimeSeconds} seconds`

					// Each segment has its own collapsed state (defaults to true = collapsed)
					const isCollapsed = collapsedSegments[segmentIdx] ?? true
					const toggleCollapsed = () => {
						setCollapsedSegments((prev) => ({
							...prev,
							[segmentIdx]: !isCollapsed,
						}))
					}

					return (
						<div
							className="fairy-chat-history-group-toggle-and-items"
							key={`segment-${segmentIdx}-actions`}
						>
							<button className="fairy-chat-history-group-toggle" onClick={toggleCollapsed}>
								<AgentIcon type={isCollapsed ? 'chevron-right' : 'chevron-down'} />
								<Markdown>{segmentSummary}</Markdown>
							</button>
							{!isCollapsed && (
								<div className="fairy-chat-history-group-items">
									{segmentItems.map((item, i) => {
										return <FairyChatHistoryAction item={item} agent={agent} key={'action-' + i} />
									})}
								</div>
							)}
						</div>
					)
				}
			})}
		</div>
	)
}
