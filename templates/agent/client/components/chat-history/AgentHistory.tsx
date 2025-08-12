import { useEffect, useRef } from 'react'
import { DefaultSpinner, Editor, useReactor, useValue } from 'tldraw'
import { TLAgent } from '../../ai/useAgent'
import { $chatHistoryItems } from '../../atoms/chatHistoryItems'
import { AgentHistoryItem, GroupHistoryItem } from './AgentHistoryItem'
import { DiffHistoryItem } from './DiffHistoryItem'
import { EventHistoryItem } from './EventHistoryItem'
import { PromptHistoryItem } from './PromptHistoryItem'

export function ChatHistory({ editor, agent }: { editor: Editor; agent: TLAgent }) {
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
	const shouldShowSpinner = mergedItems.at(-1)?.type === 'prompt'

	return (
		<div className="chat-history" ref={scrollContainerRef} onScroll={handleScroll}>
			{mergedItems.map((item, index) => {
				switch (item.type) {
					case 'prompt':
						return <PromptHistoryItem key={index} item={item} />
					case 'change':
						return <DiffHistoryItem key={index} items={[item]} editor={editor} agent={agent} />
					case 'group':
						return <DiffHistoryItem key={index} items={item.items} editor={editor} agent={agent} />
					case 'event':
						return <EventHistoryItem key={index} item={item} agent={agent} />
				}
			})}
			{shouldShowSpinner && <DefaultSpinner />}
		</div>
	)
}

function getChatHistoryWithMergedAdjacentItems({
	items,
}: {
	items: AgentHistoryItem[]
}): AgentHistoryItem[] {
	const newItems: AgentHistoryItem[] = []
	for (let i = 0; i < items.length; i++) {
		const currentItem = newItems[newItems.length - 1]
		const nextItem = items[i]
		if (!currentItem) {
			newItems.push(nextItem)
			continue
		}

		// Merge together diffs with the same acceptance status
		if (
			currentItem.type === 'change' &&
			nextItem.type === 'change' &&
			nextItem.acceptance === currentItem.acceptance
		) {
			const mergedItem: GroupHistoryItem = {
				type: 'group',
				items: [currentItem, nextItem],
				status: 'progress',
			}
			newItems[newItems.length - 1] = mergedItem
			continue
		}

		if (currentItem.type === 'group' && nextItem.type === 'change') {
			const mergedItem: GroupHistoryItem = {
				type: 'group',
				items: [...currentItem.items, nextItem],
				status: 'progress',
			}
			newItems[newItems.length - 1] = mergedItem
			continue
		}

		newItems.push(nextItem)
	}

	return newItems
}
