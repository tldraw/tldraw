import { useEffect, useRef } from 'react'
import { atom } from 'tldraw'
import {
	AgentActionHistoryItem,
	AgentMessageHistoryItem,
	ChatHistoryItem,
	UserMessageHistoryItem,
} from './ChatHistoryItem'

export const $chatHistoryItems = atom<ChatHistoryItem[]>('chatHistoryItems', [])

export function ChatHistory({ items }: { items: ChatHistoryItem[] }) {
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

	return (
		<div className="chat-history" ref={scrollContainerRef} onScroll={handleScroll}>
			{items.map((item, index) => {
				switch (item.type) {
					case 'user-message':
						return <UserMessageHistoryItem key={index} item={item} />
					case 'agent-message':
						return <AgentMessageHistoryItem key={index} item={item} />
					// case 'agent-change':
					// 	return <AgentChangeHistoryItem key={index} item={item} />
					case 'agent-action':
						return <AgentActionHistoryItem key={index} item={item} />
				}
			})}
		</div>
	)
}
