import { useEffect, useRef } from 'react'
import { atom, Editor, useReactor, useValue } from 'tldraw'
import {
	AgentActionHistoryItem,
	AgentChangeGroupHistoryItem,
	AgentChangeHistoryItems,
	AgentMessageHistoryItem,
	AgentRawHistoryItem,
	ChatHistoryItem,
	StatusThinkingHistoryItem,
	UserMessageHistoryItem,
} from './ChatHistoryItem'

export const $chatHistoryItems = atom<ChatHistoryItem[]>('chatHistoryItems', [])

export function ChatHistory({ editor }: { editor: Editor }) {
	const items = useValue($chatHistoryItems)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const previousScrollDistanceFromBottomRef = useRef(0)

	useEffect(() => {
		const localHistoryItems = localStorage.getItem('chat-history-items')
		if (localHistoryItems) {
			try {
				$chatHistoryItems.set(JSON.parse(localHistoryItems))
			} catch (e) {
				console.error(e)
			}
		}
	}, [])

	useReactor(
		'stash locally',
		() => {
			localStorage.setItem('chat-history-items', JSON.stringify($chatHistoryItems.get()))
		},
		[$chatHistoryItems]
	)

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
						return <AgentChangeHistoryItems key={index} items={[item]} editor={editor} />
					case 'agent-action':
						return <AgentActionHistoryItem key={index} item={item} />
					case 'agent-raw':
						return <AgentRawHistoryItem key={index} item={item} />
					case 'agent-change-group':
						return <AgentChangeHistoryItems key={index} items={item.items} editor={editor} />
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
			nextItem.type === 'agent-change' &&
			nextItem.acceptance === currentItem.acceptance
		) {
			const mergedItem: AgentChangeGroupHistoryItem = {
				type: 'agent-change-group',
				items: [currentItem, nextItem],
				status: nextItem.status,
			}
			newItems[newItems.length - 1] = mergedItem
			continue
		}

		if (currentItem.type === 'agent-change-group' && nextItem.type === 'agent-change') {
			const mergedItem: AgentChangeGroupHistoryItem = {
				type: 'agent-change-group',
				items: [...currentItem.items, nextItem],
				status: nextItem.status,
			}
			newItems[newItems.length - 1] = mergedItem
			continue
		}

		newItems.push(nextItem)
	}

	return newItems
}

export function createOrUpdateHistoryItem(item: ChatHistoryItem) {
	$chatHistoryItems.update((items) => {
		if (items.length === 0) return [item]

		const lastItem = items[items.length - 1]
		if (lastItem.status === 'progress') {
			return [...items.slice(0, -1), item]
		}
		return [...items, item]
	})
}
