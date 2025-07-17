import { useEffect, useRef } from 'react'
import { atom, Editor } from 'tldraw'
import {
	AgentActionHistoryItem,
	AgentChangeHistoryItem,
	AgentMessageHistoryItem,
	AgentRawHistoryItem,
	ChatHistoryItem,
	StatusThinkingHistoryItem,
	UserMessageHistoryItem,
} from './ChatHistoryItem'

export const $chatHistoryItems = atom<ChatHistoryItem[]>('chatHistoryItems', [])

export function ChatHistory({ editor, items }: { editor: Editor; items: ChatHistoryItem[] }) {
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

	const mergedItems = getChatHistoryWithMergedAdjacentItems({ items })

	return (
		<div className="chat-history" ref={scrollContainerRef} onScroll={handleScroll}>
			{mergedItems.map((item, index) => {
				switch (item.type) {
					case 'user-message':
						return <UserMessageHistoryItem key={index} item={item} />
					case 'status-thinking':
						return <StatusThinkingHistoryItem key={index} item={item} />
					case 'agent-message':
						return <AgentMessageHistoryItem key={index} item={item} />
					case 'agent-change':
						return <AgentChangeHistoryItem key={index} item={item} editor={editor} id={index} />
					case 'agent-action':
						return <AgentActionHistoryItem key={index} item={item} />
					case 'agent-raw':
						return <AgentRawHistoryItem key={index} item={item} />
				}
			})}
		</div>
	)
}

function getChatHistoryWithMergedAdjacentItems({
	items,
}: {
	items: ChatHistoryItem[]
}): ChatHistoryItem[] {
	const newItems: ChatHistoryItem[] = []
	for (let i = 0; i < items.length; i++) {
		const currentItem = newItems[newItems.length - 1]
		const nextItem = items[i]
		if (!currentItem) {
			newItems.push(nextItem)
			continue
		}

		// Merge together pending diffs
		if (
			currentItem.type === 'agent-change' &&
			currentItem.acceptance === 'pending' &&
			nextItem?.type === 'agent-change' &&
			nextItem.acceptance === 'pending'
		) {
			const mergedItem = {
				...nextItem,
				changes: [...currentItem.changes, ...nextItem.changes],
			}
			newItems[newItems.length - 1] = mergedItem
			continue
		}

		newItems.push(nextItem)
	}

	return newItems
}
