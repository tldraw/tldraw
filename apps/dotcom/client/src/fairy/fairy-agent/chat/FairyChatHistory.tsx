import { ChatHistoryActionItem, ChatHistoryItem, ChatHistoryPromptItem } from '@tldraw/fairy-shared'
import { Fragment, useEffect, useRef } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../agent/FairyAgent'
import { FairyChatHistoryActionGroup } from './FairyChatHistoryActionGroup'
import { FairyChatHistoryPrompt } from './FairyChatHistoryPrompt'

export function FairyChatHistory({ agent }: { agent: FairyAgent }) {
	const historyItems = useValue(agent.$chatHistory)

	// group adjectent like items in chat history
	const groups = groupChatHistoryItems(historyItems)

	const historyRef = useRef<HTMLDivElement>(null)
	const previousScrollDistanceFromBottomRef = useRef(0)
	const isGenerating = useValue('isGenerating', () => agent.isGenerating(), [agent])

	// scrolling
	useEffect(() => {
		if (!historyRef.current) return

		if (historyItems.at(-1)?.type === 'prompt') {
			if (previousScrollDistanceFromBottomRef.current <= 0) {
				historyRef.current.scrollTo(0, historyRef.current.scrollHeight)
				previousScrollDistanceFromBottomRef.current = 0
			}
			return
		}

		if (previousScrollDistanceFromBottomRef.current <= 0) {
			const scrollDistanceFromBottom =
				historyRef.current.scrollHeight -
				historyRef.current.scrollTop -
				historyRef.current.clientHeight

			if (scrollDistanceFromBottom > 0) {
				historyRef.current.scrollTo(0, historyRef.current.scrollHeight)
				previousScrollDistanceFromBottomRef.current = 0
			}
		}
	}, [historyRef, historyItems, isGenerating])

	const handleScroll = () => {
		if (!historyRef.current) return
		const scrollDistanceFromBottom =
			historyRef.current.scrollHeight -
			historyRef.current.scrollTop -
			historyRef.current.clientHeight

		previousScrollDistanceFromBottomRef.current = scrollDistanceFromBottom
	}

	return (
		<>
			<div className="fairy-chat-history" ref={historyRef} onScroll={handleScroll}>
				{groups.map((group, i) => {
					if (!group || group.length === 0) return null
					const groupType = group[0].type

					if (groupType === 'prompt') {
						return (
							// render user prompts individually
							<Fragment key={'history-prompt-group-' + i}>
								{group.map((item, j) => {
									return (
										<FairyChatHistoryPrompt
											key={'history-prompt-' + i + '-' + j}
											item={item as ChatHistoryPromptItem}
										/>
									)
								})}
							</Fragment>
						)
					} else if (groupType === 'action') {
						// render actions as groups (so we can collapse them, handle different types of actions differently, etc)
						return (
							<FairyChatHistoryActionGroup
								key={'history-group-' + i}
								items={group as ChatHistoryActionItem[]}
								agent={agent}
							/>
						)
					} else if (groupType === 'continuation') {
						// dont render continuations for now
						return null
					}

					return null
				})}
			</div>

			{/* {isGenerating && (
				<div className="fairy-chat-loading">
					<SmallSpinner />
				</div>
			)} */}
		</>
	)
}

function groupChatHistoryItems(items: ChatHistoryItem[]): ChatHistoryItem[][] {
	const groups: ChatHistoryItem[][] = []
	let currentGroup: ChatHistoryItem[] = []

	for (const item of items) {
		if (currentGroup.length === 0) {
			currentGroup.push(item)
		} else {
			const lastItem = currentGroup[currentGroup.length - 1]
			if (lastItem.type === item.type) {
				currentGroup.push(item)
			} else {
				groups.push(currentGroup)
				currentGroup = [item]
			}
		}
	}

	if (currentGroup.length > 0) {
		groups.push(currentGroup)
	}

	return groups
}
